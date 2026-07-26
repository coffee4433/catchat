const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const os = require('os')

const CONFIG_PATH = path.join(os.homedir(), '.catchat-release-config.json')

function loadConfig() {
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    if (!cfg.ghToken) cfg.ghToken = ''
    if (!cfg.deepseekKey) cfg.deepseekKey = ''
    return cfg
  }
  catch { return { projectPath: '', ghToken: '', deepseekKey: '' } }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2))
}

function findPackageJson(dir) {
  const p = path.join(dir, 'package.json')
  return fs.existsSync(p) ? p : null
}

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    resizable: true,
    frame: false,
    transparent: true,
    roundedCorners: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.loadFile(path.join(__dirname, 'index.html'))
  mainWindow.on('closed', () => { mainWindow = null })
}

// ---------------------------------------------------------------------------
// Step detection (done in main so the UI receives structured events)
// ---------------------------------------------------------------------------
const STEP_ORDER = ['prepare', 'build', 'upload', 'publish', 'git']

function detectSteps(chunk) {
  const lower = chunk.toLowerCase()
  const events = []

  if (lower.includes('bumping') || lower.includes('version') && lower.includes('package.json')) {
    events.push({ step: 'prepare', state: 'active' })
  }
  if (lower.includes('building') || lower.includes('electron-builder') || lower.includes('packaging')) {
    events.push({ step: 'prepare', state: 'done' })
    events.push({ step: 'build', state: 'active' })
  }
  if (lower.includes('building block map')) {
    events.push({ step: 'build', state: 'done' })
  }
  if (lower.includes('uploading')) {
    events.push({ step: 'prepare', state: 'done' })
    events.push({ step: 'build', state: 'done' })
    events.push({ step: 'upload', state: 'active' })
  }
  if (lower.includes('published:')) {
    events.push({ step: 'upload', state: 'done' })
    events.push({ step: 'publish', state: 'active' })
  }
  if (lower.includes('release created') || lower.includes('release published')) {
    events.push({ step: 'publish', state: 'done' })
  }
  if (lower.includes('pushing') || lower.includes('git commit') || lower.includes('committing')) {
    events.push({ step: 'publish', state: 'done' })
    events.push({ step: 'git', state: 'active' })
  }
  if (lower.includes('pushed to git') || lower.includes('pushed') || lower.includes('skipping git')) {
    events.push({ step: 'publish', state: 'done' })
    events.push({ step: 'git', state: 'done' })
  }

  return events
}

ipcMain.handle('get:version', () => {
  const cfg = loadConfig()
  if (!cfg.projectPath) return null
  const pkgPath = findPackageJson(cfg.projectPath)
  if (!pkgPath) return null
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version
})

ipcMain.handle('select:project', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select CatChat project folder',
    properties: ['openDirectory'],
  })
  if (result.canceled || !result.filePaths.length) return null
  const dir = result.filePaths[0]
  const pkgPath = findPackageJson(dir)
  if (!pkgPath) return { error: 'No package.json found in selected folder' }
  const cfg = { ...loadConfig(), projectPath: dir }
  saveConfig(cfg)
  const version = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version
  return { path: dir, version }
})

ipcMain.handle('save:token', async (_event, token) => {
  const cfg = { ...loadConfig(), ghToken: token }
  saveConfig(cfg)
  return true
})

ipcMain.handle('save:deepseek-key', async (_event, key) => {
  const cfg = { ...loadConfig(), deepseekKey: key }
  saveConfig(cfg)
  return true
})

ipcMain.handle('get:config', () => {
  const cfg = loadConfig()
  return {
    projectPath: cfg.projectPath || '',
    hasToken: !!cfg.ghToken,
    hasDeepseekKey: !!cfg.deepseekKey,
  }
})

ipcMain.handle('get:git-commits', async () => {
  const cfg = loadConfig()
  if (!cfg.projectPath) return []
  const { exec } = require('child_process')

  return new Promise((resolve) => {
    // Find the hash of the latest release commit ("Release vX.Y.Z")
    exec('git log --grep="Release v" -n 1 --format="%H"', { cwd: cfg.projectPath }, (errRel, stdoutRel) => {
      const lastReleaseHash = !errRel && stdoutRel ? stdoutRel.trim() : null
      const logCmd = lastReleaseHash ? `git log ${lastReleaseHash}..HEAD --oneline` : 'git log -n 10 --oneline'

      exec(logCmd, { cwd: cfg.projectPath }, (errLog, stdoutLog) => {
        let commits = []
        if (!errLog && stdoutLog) {
          commits = stdoutLog
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0 && !/\bRelease v\d/i.test(l))
        }

        if (commits.length === 0) {
          exec('git status --short', { cwd: cfg.projectPath }, (errStatus, stdoutStatus) => {
            if (!errStatus && stdoutStatus) {
              const modifiedFiles = stdoutStatus
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean)
                .slice(0, 10)
              if (modifiedFiles.length > 0) {
                return resolve(['Cambios locales en desarrollo:\n' + modifiedFiles.join('\n')])
              }
            }
            exec('git log -n 5 --oneline', { cwd: cfg.projectPath }, (_, fallbackLog) => {
              const fallbackCommits = (fallbackLog || '')
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean)
                .filter((l) => !/\bRelease v\d/i.test(l))
              resolve(fallbackCommits)
            })
          })
        } else {
          resolve(commits)
        }
      })
    })
  })
})

async function callDeepSeekApi(apiKey, messages) {
  const https = require('https')
  const modelsToTry = ['deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek-chat']
  let lastError = null

  for (const model of modelsToTry) {
    try {
      const payload = JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      })

      const reply = await new Promise((resolve, reject) => {
        const req = https.request('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(payload),
          },
        }, (res) => {
          let data = ''
          res.on('data', (chunk) => { data += chunk })
          res.on('end', () => {
            try {
              if (res.statusCode !== 200) {
                const errJson = JSON.parse(data)
                const errMsg = errJson.error?.message || `API Error HTTP ${res.statusCode}`
                return reject(new Error(errMsg))
              }
              const parsed = JSON.parse(data)
              const reply = parsed.choices?.[0]?.message?.content || ''
              resolve(reply.trim())
            } catch {
              reject(new Error('Error al procesar respuesta de DeepSeek API'))
            }
          })
        })

        req.on('error', (err) => reject(new Error('Error de conexión a DeepSeek: ' + err.message)))
        req.write(payload)
        req.end()
      })

      return reply
    } catch (err) {
      lastError = err
      if (err.message && err.message.includes('supported API model names')) {
        continue
      }
      throw err
    }
  }

  throw lastError || new Error('No se pudo conectar con los modelos de DeepSeek.')
}

ipcMain.handle('generate:ai-notes', async (_event, userPrompt) => {
  const cfg = loadConfig()
  const apiKey = cfg.deepseekKey || process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('No hay API Key de DeepSeek configurada. Agrégala en la barra lateral.')

  const messages = [
    {
      role: 'system',
      content: `Eres un asistente experto en software y notas de lanzamiento (Release Notes). Tu misión es transformar la información de cambios provista por el usuario en un documento Markdown profesional, estructurado, detallado y visualmente impresionante para la aplicación CatChat.

Instrucciones de formato rico:
1. Usa títulos de sección claros con emojis:
   - ## ✨ Novedades Destacadas
   - ## 🐛 Correcciones y Ajustes
   - ## ⚡ Rendimiento y Optimización
   - ## 🎨 UI & Experiencia de Usuario
2. Puedes incluir cajas destacadas (Callouts / Alertas) formateadas así:
   - > [!NOTE] Resumen ejecutivo de la versión.
   - > [!TIP] Consejos o trucos sobre cómo usar la nueva función.
   - > [!IMPORTANT] Avisos relevantes o cambios clave.
3. Utiliza etiquetas o badges al inicio de las viñetas cuando corresponda:
   - [NUEVO], [MEJORA], [FIX], [DISEÑO], [IMPORTANTE]
4. Para cada cambio, escribe una viñeta (- ) detallada destacando conceptos clave en **negrita** o fragmentos de código en \`código\`.
5. Responde ÚNICAMENTE con el documento Markdown final listo para publicar.`
    },
    {
      role: 'user',
      content: `Lista de cambios / commits para este release:\n${userPrompt}`
    }
  ]

  return callDeepSeekApi(apiKey, messages)
})

ipcMain.handle('chat:ai-notes', async (_event, chatMessages) => {
  const cfg = loadConfig()
  const apiKey = cfg.deepseekKey || process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('No hay API Key de DeepSeek configurada. Agrégala en la barra lateral.')

  const systemMessage = {
    role: 'system',
    content: `Eres un asistente de IA conversacional experto en diseño visual y notas de lanzamiento (Release Notes) para CatChat.

Tu objetivo es redactar Release Notes y adaptarlas AL GUSTO DEL USUARIO en cuanto a ESTILOS VISUALES, colores, temas y estética.

Instrucciones de temas y estilos personalizados:
Si el usuario pide un estilo visual específico (ej: cyberpunk, neón, esmeralda, sunset, morado, dorado, elegante, etc.), incluye un tag de tema al inicio de la primera línea del Markdown:
- Para Cyberpunk / Neón: <!-- theme: {"preset": "cyberpunk"} -->
- Para Esmeralda / Naturaleza / Verde: <!-- theme: {"preset": "emerald"} -->
- Para Sunset / Atardecer / Naranja-Morado: <!-- theme: {"preset": "sunset"} -->
- Para Midnight / Oscuro Morado Elegante: <!-- theme: {"preset": "midnight"} -->
- Para Discord Clásico: <!-- theme: {"preset": "discord"} -->

También puedes crear gradientes y colores personalizados en el tag:
<!-- theme: {"headerGradient": "from-fuchsia-600/35 via-pink-500/20 to-cyan-500/15", "btnBg": "bg-gradient-to-r from-fuchsia-600 to-pink-600"} -->

CRITICAL RULE: Redacta ÚNICAMENTE las novedades y cambios de la versión ACTUAL según los datos provistos. NO incluyas ni acumules cambios históricos de versiones pasadas.

Estructura del contenido:
- ## ✨ Novedades Destacadas
- ## 🐛 Correcciones y Ajustes
- ## ⚡ Rendimiento y Optimización
- ## 🎨 UI & Experiencia de Usuario
- Cajas destacadas: > [!NOTE] o > [!TIP] o > [!IMPORTANT] o > [!WARNING]
- Badges al inicio de viñetas: [NUEVO], [MEJORA], [FIX], [DISEÑO]
- Texto destacado en **negrita** o \`código\`.

Responde siempre con el documento Markdown final exclusivo de esta versión.`
  }

  const messages = [systemMessage, ...(chatMessages || [])]
  return callDeepSeekApi(apiKey, messages)
})

ipcMain.handle('edit:release-notes-component', async (_event, customCode) => {
  const cfg = loadConfig()
  if (!cfg.projectPath) throw new Error('No hay proyecto seleccionado')
  const targetFile = path.join(cfg.projectPath, 'components', 'release-notes-modal.tsx')
  const fs = require('fs')
  fs.writeFileSync(targetFile, customCode, 'utf8')
  return true
})

ipcMain.handle('release', async (_event, version, notes, showModal) => {
  const cfg = loadConfig()
  if (!cfg.projectPath) throw new Error('No project selected')

  const releaseScript = path.join(cfg.projectPath, 'scripts', 'release.cjs')

  return new Promise((resolve, reject) => {
    const child = spawn('node', [releaseScript], {
      cwd: cfg.projectPath,
      env: {
        ...process.env,
        RELEASE_VERSION: version,
        RELEASE_NOTES: notes || '',
        SHOW_RELEASE_MODAL: showModal ? 'true' : 'false',
        GH_TOKEN: cfg.ghToken || process.env.GH_TOKEN || '',
      },
      shell: true,
    })

    const handleChunk = (d) => {
      const text = d.toString()
      mainWindow?.webContents.send('release:output', text)
      for (const ev of detectSteps(text)) {
        mainWindow?.webContents.send('release:step', ev)
      }
    }

    // First step starts immediately
    mainWindow?.webContents.send('release:step', { step: 'prepare', state: 'active' })

    child.stdout.on('data', handleChunk)
    child.stderr.on('data', handleChunk)

    child.on('close', (code) => {
      const success = code === 0
      if (success) {
        for (const step of STEP_ORDER) {
          mainWindow?.webContents.send('release:step', { step, state: 'done' })
        }
      }
      mainWindow?.webContents.send('release:output', success ? '\n✓ Release completed successfully\n' : '\n✕ Release failed (exit code ' + code + ')\n')
      mainWindow?.webContents.send('release:done', success)
      resolve({ success })
    })

    child.on('error', (err) => {
      mainWindow?.webContents.send('release:output', '\n✕ Error: ' + err.message + '\n')
      mainWindow?.webContents.send('release:done', false)
      reject(err)
    })
  })
})

async function fetchGitHubApi(endpoint, options = {}) {
  const cfg = loadConfig()
  const token = cfg.ghToken || process.env.GH_TOKEN || ''
  const url = `https://api.github.com/repos/coffee4433/catchat${endpoint}`
  
  const headers = {
    'User-Agent': 'CatChat-Release-Studio',
    'Accept': 'application/vnd.github.v3+json',
    ...(options.headers || {}),
  }
  if (token) {
    headers['Authorization'] = `token ${token}`
  }

  const res = await fetch(url, { ...options, headers })
  if (!res.ok && res.status !== 404) {
    const errText = await res.text().catch(() => '')
    throw new Error(`GitHub API error (${res.status}): ${errText || res.statusText}`)
  }
  if (res.status === 204 || res.status === 404) return null
  return res.json()
}

ipcMain.handle('get:github-releases', async () => {
  try {
    const releases = await fetchGitHubApi('/releases')
    if (!Array.isArray(releases)) return []
    return releases.map((r) => ({
      id: r.id,
      tagName: r.tag_name,
      name: r.name || r.tag_name,
      body: r.body || '',
      draft: r.draft,
      prerelease: r.prerelease,
      createdAt: r.created_at,
      publishedAt: r.published_at,
      htmlUrl: r.html_url,
      author: r.author ? { login: r.author.login, avatarUrl: r.author.avatar_url } : null,
      assets: (r.assets || []).map((a) => ({
        id: a.id,
        name: a.name,
        size: a.size,
        downloadCount: a.download_count,
        browserDownloadUrl: a.browser_download_url,
      })),
    }))
  } catch (e) {
    console.error('Failed to fetch GitHub releases:', e)
    return []
  }
})

ipcMain.handle('delete:github-release', async (_event, { releaseId, tagName }) => {
  const errors = []
  if (releaseId) {
    try {
      await fetchGitHubApi(`/releases/${releaseId}`, { method: 'DELETE' })
    } catch (e) {
      errors.push(e.message)
    }
  }
  if (tagName) {
    try {
      await fetchGitHubApi(`/git/refs/tags/${tagName}`, { method: 'DELETE' })
    } catch {
      // Ignore tag deletion error if tag missing
    }
  }
  if (errors.length > 0) {
    throw new Error(errors.join(', '))
  }
  return { success: true }
})

ipcMain.handle('delete:plugin', async (_event, pluginId) => {
  const cfg = loadConfig()
  let deletedLocal = false
  let deletedRelease = false

  if (cfg.projectPath && pluginId) {
    const dirsToDelete = [
      path.join(cfg.projectPath, 'plugins', pluginId),
      path.join(cfg.projectPath, 'lib', 'plugins', pluginId),
    ]
    for (const pluginDir of dirsToDelete) {
      if (fs.existsSync(pluginDir)) {
        try {
          fs.rmSync(pluginDir, { recursive: true, force: true })
          deletedLocal = true
        } catch (e) {
          console.error(`Failed to delete local plugin directory ${pluginDir}:`, e)
        }
      }
    }
  }

  try {
    const ghReleases = await fetchGitHubApi('/releases')
    if (Array.isArray(ghReleases)) {
      for (const r of ghReleases) {
        if (r.tag_name && (r.tag_name === `plugin-${pluginId}` || r.tag_name.startsWith(`plugin-${pluginId}-`))) {
          try {
            await fetchGitHubApi(`/releases/${r.id}`, { method: 'DELETE' })
            await fetchGitHubApi(`/git/refs/tags/${r.tag_name}`, { method: 'DELETE' }).catch(() => {})
            deletedRelease = true
          } catch (e) {
            console.error(`Failed to delete GitHub release ${r.id}:`, e)
          }
        }
      }
    }
  } catch {}

  return { success: true, deletedLocal, deletedRelease }
})

ipcMain.handle('get:plugins', async (_event, customDir) => {
  const cfg = loadConfig()
  const baseDir = customDir || (cfg.projectPath ? path.join(cfg.projectPath, 'lib', 'plugins') : null)
  const localPluginsMap = new Map()

  if (baseDir && fs.existsSync(baseDir)) {
    try {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true })
      for (const ent of entries) {
        if (ent.isDirectory()) {
          const pluginId = ent.name
          const manifestPath = path.join(baseDir, pluginId, 'manifest.json')
          let manifest = {}
          if (fs.existsSync(manifestPath)) {
            try {
              manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
            } catch {}
          }
          localPluginsMap.set(pluginId, {
            id: pluginId,
            name: manifest.name || (pluginId === 'cat-music' ? 'CatMusic' : pluginId.charAt(0).toUpperCase() + pluginId.slice(1)),
            version: manifest.version || '1.0.0',
            description: manifest.description || 'Plugin oficial de CatChat',
            icon: manifest.icon || '/plugins/' + pluginId + '/icon.png',
            author: manifest.author || 'CatChat',
            path: path.join(baseDir, pluginId),
            isLocal: true,
          })
        }
      }
    } catch {}
  }

  try {
    const ghReleases = await fetchGitHubApi('/releases')
    if (Array.isArray(ghReleases)) {
      for (const r of ghReleases) {
        if (r.tag_name && r.tag_name.startsWith('plugin-')) {
          const parts = r.tag_name.split('-')
          const pluginId = parts.slice(1, -1).join('-') || parts[1] || r.tag_name.replace('plugin-', '')
          const pluginVersion = r.tag_name.split('-').pop() || r.tag_name
          const existing = localPluginsMap.get(pluginId)
          if (existing) {
            existing.releaseId = r.id
            existing.releaseTag = r.tag_name
            existing.isPublished = true
            existing.publishedAt = r.published_at
          } else {
            localPluginsMap.set(pluginId, {
              id: pluginId,
              name: r.name || pluginId,
              version: pluginVersion,
              description: r.body || 'Plugin de CatChat',
              icon: '/plugins/' + pluginId + '/icon.png',
              author: r.author?.login || 'CatChat',
              path: '',
              isLocal: false,
              isPublished: true,
              releaseId: r.id,
              releaseTag: r.tag_name,
              publishedAt: r.published_at,
            })
          }
        }
      }
    }
  } catch {}

  return Array.from(localPluginsMap.values())
})

ipcMain.handle('select:plugins-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Plugins Directory',
    properties: ['openDirectory'],
  })
  if (result.canceled || !result.filePaths.length) return null
  return result.filePaths[0]
})

ipcMain.handle('publish:plugin', async (_event, pluginData) => {
  const cfg = loadConfig()
  if (!cfg.projectPath) throw new Error('No project selected')

  const pluginId = typeof pluginData === 'object' ? pluginData.id : pluginData
  const pluginName = typeof pluginData === 'object' ? pluginData.name : 'CatMusic'
  const pluginVersion = typeof pluginData === 'object' ? pluginData.version : 'v1.0.0'

  const publishScript = path.join(cfg.projectPath, 'scripts', 'publish-plugin.cjs')

  return new Promise((resolve, reject) => {
    mainWindow?.webContents.send('release:step', { step: 'prepare', state: 'active' })

    const child = spawn('node', [publishScript], {
      cwd: cfg.projectPath,
      env: {
        ...process.env,
        PLUGIN_ID: pluginId || 'cat-music',
        PLUGIN_NAME: pluginName || 'CatMusic',
        PLUGIN_VERSION: pluginVersion || 'v1.0.0',
        GH_TOKEN: cfg.ghToken || process.env.GH_TOKEN || '',
      },
      shell: true,
    })

    const handleChunk = (d) => {
      const text = d.toString()
      mainWindow?.webContents.send('release:output', text)
      for (const ev of detectSteps(text)) {
        mainWindow?.webContents.send('release:step', ev)
      }
    }

    child.stdout.on('data', handleChunk)
    child.stderr.on('data', handleChunk)

    child.on('close', (code) => {
      const success = code === 0
      if (success) {
        for (const step of STEP_ORDER) {
          mainWindow?.webContents.send('release:step', { step, state: 'done' })
        }
      }
      mainWindow?.webContents.send('release:output', success ? '\n✓ Plugin release completed successfully\n' : '\n✕ Plugin release failed (exit code ' + code + ')\n')
      mainWindow?.webContents.send('release:done', success)
      resolve({ success })
    })

    child.on('error', (err) => {
      mainWindow?.webContents.send('release:output', '\n✕ Error: ' + err.message + '\n')
      mainWindow?.webContents.send('release:done', false)
      reject(err)
    })
  })
})

app.on('ready', createWindow)
app.on('window-all-closed', () => app.quit())