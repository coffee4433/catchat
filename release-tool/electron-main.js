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
  return new Promise((resolve) => {
    const { exec } = require('child_process')
    exec('git log -n 15 --oneline', { cwd: cfg.projectPath }, (err, stdout) => {
      if (err || !stdout) return resolve([])
      const commits = stdout.split('\n').map((l) => l.trim()).filter(Boolean)
      resolve(commits)
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
    content: `Eres un asistente de IA conversacional especializado en crear y pulir Release Notes (Notas de lanzamiento) en Markdown para CatChat.

Instrucciones:
1. Ayuda al usuario a redactar, refinar y personalizar las Release Notes en un Markdown visualmente impresionante a través de la conversación.
2. Formato rico recomendado:
   - ## ✨ Novedades Destacadas
   - ## 🐛 Correcciones y Ajustes
   - ## ⚡ Rendimiento y Optimización
   - ## 🎨 UI & Experiencia de Usuario
   - Cajas destacadas: > [!NOTE] o > [!TIP] o > [!IMPORTANT]
   - Badges al inicio de viñetas: [NUEVO], [MEJORA], [FIX], [DISEÑO]
3. Usa viñetas (- ) con explicaciones claras, destacando puntos clave en **negrita** o \`código\`.
4. Ofrece siempre el resultado final en Markdown formateado y listo para aplicar con el botón.`
  }

  const messages = [systemMessage, ...(chatMessages || [])]
  return callDeepSeekApi(apiKey, messages)
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

app.on('ready', createWindow)
app.on('window-all-closed', () => app.quit())