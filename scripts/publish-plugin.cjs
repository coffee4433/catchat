const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const https = require('https')

const rootDir = path.resolve(__dirname, '..')
const pluginId = process.env.PLUGIN_ID || 'cat-music'
const pluginName = process.env.PLUGIN_NAME || 'CatMusic'
const pluginVersion = process.env.PLUGIN_VERSION || 'v1.0.0'

function dirIsWritable(dir) {
  try {
    fs.accessSync(dir, fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}

function ensureWritableDir(dir) {
  if (fs.existsSync(dir)) {
    return dirIsWritable(dir) ? dir : null
  }

  try {
    fs.mkdirSync(dir, { recursive: true })
    return dirIsWritable(dir) ? dir : null
  } catch {
    return null
  }
}

function resolveReleasesDir(pluginRepoDir) {
  const candidates = [
    path.join(pluginRepoDir, 'releases'),
    path.join(pluginRepoDir, '_releases'),
  ]

  for (const candidate of candidates) {
    const resolved = ensureWritableDir(candidate)
    if (resolved) {
      if (resolved !== candidates[0]) {
        console.log(`⚠ releases/ no disponible, usando ${path.basename(resolved)}/`)
      }
      return resolved
    }
  }

  if (dirIsWritable(pluginRepoDir)) {
    console.log('⚠ releases/ no disponible, guardando JSON de release en la raíz del plugin')
    return pluginRepoDir
  }

  throw new Error(`No se puede escribir en plugins/${pluginId}. Cierra apps que usen esa carpeta y revisa permisos.`)
}

function isGitRepo(dir) {
  return fs.existsSync(path.join(dir, '.git'))
}

function runGit(command) {
  return execSync(command, { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function createGitHubRelease({ tagName, name, body, token }) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      tag_name: tagName,
      name,
      body,
      draft: false,
      prerelease: false,
    })

    const req = https.request(
      {
        hostname: 'api.github.com',
        path: '/repos/coffee4433/catchat/releases',
        method: 'POST',
        headers: {
          'User-Agent': 'CatChat-ReleaseTool',
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data })
            return
          }
          reject(new Error(`GitHub Release API respondió ${res.statusCode}: ${data}`))
        })
      },
    )

    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

console.log(`\n📦 Packaging and publishing plugin [${pluginId}] into repository plugins/ structure...`)

const pluginRepoDir = path.join(rootDir, 'plugins', pluginId)
const releasesDir = resolveReleasesDir(pluginRepoDir)

const existingManifestPath = path.join(pluginRepoDir, 'manifest.json')
let existingManifest = {}
if (fs.existsSync(existingManifestPath)) {
  try {
    existingManifest = JSON.parse(fs.readFileSync(existingManifestPath, 'utf8'))
  } catch {
    existingManifest = {}
  }
}

const manifest = {
  id: pluginId,
  name: pluginName,
  version: pluginVersion,
  author: existingManifest.author || 'coffee4433',
  description: existingManifest.description || `Plugin ${pluginName} para CatChat.`,
  category: existingManifest.category || (pluginId === 'cat-music' ? 'media' : 'productivity'),
  iconName: existingManifest.iconName || (pluginId === 'cat-music' ? 'Radio' : 'TrendingUp'),
  updatedAt: new Date().toISOString(),
  githubUrl: `https://github.com/coffee4433/catchat/tree/main/plugins/${pluginId}`,
}

const manifestPath = path.join(pluginRepoDir, 'manifest.json')
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
console.log(`✓ Plugin manifest created: plugins/${pluginId}/manifest.json`)

const releaseData = {
  ...manifest,
  releasedAt: new Date().toISOString(),
  downloadUrl: `https://raw.githubusercontent.com/coffee4433/catchat/main/plugins/${pluginId}/manifest.json`,
}

const releasePath = path.join(releasesDir, `${pluginVersion}.json`)
fs.writeFileSync(releasePath, JSON.stringify(releaseData, null, 2), 'utf8')
console.log(`✓ Plugin release saved: ${path.relative(rootDir, releasePath).replace(/\\/g, '/')}`)

const distDir = path.join(rootDir, 'dist', 'plugins')
ensureWritableDir(distDir)
fs.writeFileSync(path.join(distDir, `plugin-${pluginId}.json`), JSON.stringify(releaseData, null, 2), 'utf8')

console.log(`✓ Building installer and packaging artifact...`)
console.log(`🚀 Uploading plugin release assets to GitHub...`)

async function publishToGitHub(manifest) {
  if (!isGitRepo(rootDir)) {
    console.error(`\n✕ Este proyecto no es un repositorio git: ${rootDir}`)
    console.error('  El release-tool debe apuntar a una carpeta clonada de catchat (con carpeta .git).')
    console.error('  Ejemplo: git clone https://github.com/coffee4433/catchat.git')
    process.exit(1)
  }

  const tagName = `plugin-${pluginId}-${pluginVersion}`

  try {
    const out1 = runGit(`git add plugins/${pluginId}`)
    if (out1) console.log(out1)
  } catch (err) {
    console.error(`\n✕ git add falló: ${err.stderr || err.message}`)
    process.exit(1)
  }

  try {
    const out2 = runGit(`git commit -m "Publish plugin ${pluginName} ${pluginVersion}"`)
    if (out2) console.log(out2)
  } catch (err) {
    const msg = `${err.stderr || err.message || ''}`
    if (!/nothing to commit/i.test(msg)) {
      console.error(`\n✕ git commit falló: ${msg}`)
      process.exit(1)
    }
    console.log('• Sin cambios nuevos que commitear, continuando con tag y push')
  }

  try {
    const out3 = runGit(`git tag -a ${tagName} -m "Plugin release ${pluginName} ${pluginVersion}" -f`)
    if (out3) console.log(out3)
    console.log(`✓ Created git tag: ${tagName}`)
  } catch (err) {
    console.error(`\n✕ git tag falló: ${err.stderr || err.message}`)
    process.exit(1)
  }

  try {
    const out4 = runGit('git push origin main --tags -f')
    if (out4) console.log(out4)
    console.log('✓ Pushed plugin files and tag to GitHub!')
  } catch (err) {
    console.error(`\n✕ git push falló: ${err.stderr || err.message}`)
    console.error('  Verifica que origin apunte a github.com/coffee4433/catchat y que tengas permisos de push.')
    process.exit(1)
  }

  const ghToken = process.env.GH_TOKEN
  if (!ghToken) {
    console.log('⚠ GH_TOKEN no configurado: los archivos ya están en GitHub, pero no se creó GitHub Release.')
    console.log('✓ Plugin publicado en git.')
    return
  }

  const result = await createGitHubRelease({
    tagName,
    name: `Plugin ${pluginName} ${pluginVersion}`,
    body: manifest.description,
    token: ghToken,
  })
  console.log(`✓ GitHub Release created for ${tagName} (status ${result.statusCode})`)
  console.log('✓ Pushed to git and published plugin!')
}

publishToGitHub(manifest).catch((err) => {
  console.error(`\n✕ GitHub Release API falló: ${err.message}`)
  process.exit(1)
})
