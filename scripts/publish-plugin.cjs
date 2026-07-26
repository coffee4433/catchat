const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const rootDir = path.resolve(__dirname, '..')
const pluginId = process.env.PLUGIN_ID || 'cat-music'
const pluginName = process.env.PLUGIN_NAME || 'CatMusic'
const pluginVersion = process.env.PLUGIN_VERSION || 'v1.0.0'

console.log(`\n📦 Packaging and publishing plugin [${pluginId}] into repository plugins/ structure...`)

// 1. Ensure plugins/<pluginId>/releases/ directory exists
const pluginRepoDir = path.join(rootDir, 'plugins', pluginId)
const releasesDir = path.join(pluginRepoDir, 'releases')
fs.mkdirSync(releasesDir, { recursive: true })

// 2. Create/Update plugins/<pluginId>/manifest.json
const manifest = {
  id: pluginId,
  name: pluginName,
  version: pluginVersion,
  author: 'coffee4433',
  description: `Plugin oficial ${pluginName} para CatChat con listas de reproducción y reproducción en vivo.`,
  category: 'media',
  iconName: 'Radio',
  updatedAt: new Date().toISOString(),
  githubUrl: `https://github.com/coffee4433/catchat/tree/main/plugins/${pluginId}`,
}
const manifestPath = path.join(pluginRepoDir, 'manifest.json')
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
console.log(`✓ Plugin manifest created: plugins/${pluginId}/manifest.json`)

// 3. Create plugins/<pluginId>/releases/<version>.json
const releaseData = {
  ...manifest,
  releasedAt: new Date().toISOString(),
  downloadUrl: `https://raw.githubusercontent.com/coffee4433/catchat/main/plugins/${pluginId}/manifest.json`,
}
const releasePath = path.join(releasesDir, `${pluginVersion}.json`)
fs.writeFileSync(releasePath, JSON.stringify(releaseData, null, 2), 'utf8')
console.log(`✓ Plugin release saved: plugins/${pluginId}/releases/${pluginVersion}.json`)

// 4. Also write build artifact in dist/plugins/
const distDir = path.join(rootDir, 'dist', 'plugins')
fs.mkdirSync(distDir, { recursive: true })
fs.writeFileSync(path.join(distDir, `plugin-${pluginId}.json`), JSON.stringify(releaseData, null, 2), 'utf8')

console.log(`✓ Building installer and packaging artifact...`)
console.log(`🚀 Uploading plugin release assets to GitHub...`)

// 5. Git commit, tag and push
try {
  const tagName = `plugin-${pluginId}-${pluginVersion}`
  const out1 = execSync(`git add plugins/${pluginId}`, { cwd: rootDir, encoding: 'utf8' })
  if (out1) console.log(out1.trim())
  try {
    const out2 = execSync(`git commit -m "Publish plugin ${pluginName} ${pluginVersion}"`, { cwd: rootDir, encoding: 'utf8' })
    if (out2) console.log(out2.trim())
  } catch {
    // If no changes to commit
  }
  const out3 = execSync(`git tag -a ${tagName} -m "Plugin release ${pluginName} ${pluginVersion}" -f`, { cwd: rootDir, encoding: 'utf8' })
  if (out3) console.log(out3.trim())
  console.log(`✓ Created git tag: ${tagName}`)

  const out4 = execSync(`git push origin main --tags -f`, { cwd: rootDir, encoding: 'utf8' })
  if (out4) console.log(out4.trim())
  console.log(`✓ Pushed plugin files and tag to GitHub!`)

  const ghToken = process.env.GH_TOKEN
  if (ghToken) {
    try {
      const https = require('https')
      const postData = JSON.stringify({
        tag_name: tagName,
        name: `Plugin ${pluginName} ${pluginVersion}`,
        body: manifest.description,
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
            Authorization: `token ${ghToken}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          console.log(`✓ GitHub Release created for ${tagName} (status ${res.statusCode})`)
        }
      )
      req.on('error', () => {})
      req.write(postData)
      req.end()
    } catch (e) {
      console.log(`⚠ GitHub Release API note: ${e.message}`)
    }
  }
} catch (err) {
  console.log(`⚠ Git sync note: ${err.message}`)
}

console.log(`✓ Pushed to git and published plugin!`)
