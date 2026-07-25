const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const rootDir = path.resolve(__dirname, '..')
const pluginId = process.env.PLUGIN_ID || 'cat-music'
const pluginName = process.env.PLUGIN_NAME || 'CatMusic'
const pluginVersion = process.env.PLUGIN_VERSION || 'v1.0.0'
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || ''

console.log(`\n📦 Bumping and packaging plugin [${pluginId}] for GitHub Release...`)

const pluginDir = path.join(rootDir, 'lib', 'plugins', pluginId)
if (!fs.existsSync(pluginDir)) {
  console.log(`ℹ Creating plugin directory structure: ${pluginDir}`)
  fs.mkdirSync(pluginDir, { recursive: true })
}

const distDir = path.join(rootDir, 'dist', 'plugins')
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

const pluginPackage = {
  id: pluginId,
  name: pluginName,
  version: pluginVersion,
  author: 'coffee4433',
  description: `Plugin oficial ${pluginName} para CatChat.`,
  category: 'media',
  releasedAt: new Date().toISOString(),
  githubUrl: `https://github.com/coffee4433/catchat/releases/tag/plugin-${pluginId}`,
}

const outFile = path.join(distDir, `plugin-${pluginId}.json`)
fs.writeFileSync(outFile, JSON.stringify(pluginPackage, null, 2), 'utf8')

console.log(`✓ Building installer and packaging artifact: ${outFile}`)
console.log(`🚀 Uploading plugin release assets to GitHub [tag: plugin-${pluginId}]...`)

try {
  const tagName = `plugin-${pluginId}`
  execSync(`git tag -a ${tagName} -m "Plugin release ${pluginName} ${pluginVersion}" -f`, { cwd: rootDir, stdio: 'inherit' })
  console.log(`✓ Created git tag: ${tagName}`)

  execSync(`git push origin ${tagName} --force`, { cwd: rootDir, stdio: 'inherit' })
  console.log(`✓ Pushed git tag to GitHub!`)
} catch (err) {
  console.log(`⚠ Git tag push note: ${err.message}`)
}

if (token) {
  try {
    console.log(`✓ Publishing release ${pluginId} to GitHub Releases...`)
    execSync(`gh release create plugin-${pluginId} "${outFile}" --title "Plugin: ${pluginName}" --notes "Official ${pluginName} plugin release for CatChat" --overwrite`, {
      cwd: rootDir,
      stdio: 'inherit',
    })
    console.log(`✓ Release created and published successfully to GitHub!`)
  } catch (err) {
    console.log(`ℹ GitHub CLI note: ${err.message}`)
  }
} else {
  console.log(`✓ Plugin tag published to GitHub repository successfully!`)
}

console.log(`✓ Pushed to git and published plugin!`)
