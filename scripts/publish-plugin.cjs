const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const rootDir = path.resolve(__dirname, '..')
const pluginId = process.env.PLUGIN_ID || 'cat-music'
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || ''

console.log(`📦 Packaging plugin [${pluginId}] for GitHub Release...`)

const pluginDir = path.join(rootDir, 'lib', 'plugins', pluginId)
if (!fs.existsSync(pluginDir)) {
  console.error(`✕ Plugin directory not found: ${pluginDir}`)
  process.exit(1)
}

const pluginPackage = {
  id: pluginId,
  name: 'CatMusic',
  version: '1.0.0',
  author: 'coffee4433',
  description:
    'Reproductor infinito de música sin anuncios basado en YouTube Music con listas de reproducción y descargas MP3.',
  category: 'media',
  releasedAt: new Date().toISOString(),
  githubUrl: `https://github.com/coffee4433/catchat/releases/tag/plugin-${pluginId}`,
}

const distDir = path.join(rootDir, 'dist', 'plugins')
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

const outFile = path.join(distDir, `plugin-${pluginId}.json`)
fs.writeFileSync(outFile, JSON.stringify(pluginPackage, null, 2), 'utf8')

console.log(`✓ Plugin packaged to: ${outFile}`)

if (token) {
  console.log(`🚀 Uploading plugin release artifact to GitHub [tag: plugin-${pluginId}]...`)
  try {
    // Create or edit github release tag using gh CLI if available
    execSync(`gh release create plugin-${pluginId} "${outFile}" --title "Plugin: ${pluginPackage.name}" --notes "Plugin release package for ${pluginPackage.name}" --overwrite`, {
      cwd: rootDir,
      stdio: 'inherit',
    })
    console.log(`✓ Plugin release published to GitHub!`)
  } catch (err) {
    console.log(`⚠ gh CLI step: ${err.message}`)
  }
} else {
  console.log(`ℹ No GH_TOKEN provided. Local plugin package created successfully.`)
}
