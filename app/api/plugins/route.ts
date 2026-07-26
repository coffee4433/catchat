import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const plugins: any[] = []
  const foundIds = new Set<string>()

  // 1. Fetch published plugins from GitHub Releases API
  try {
    const res = await fetch('https://api.github.com/repos/coffee4433/catchat/releases', {
      headers: {
        'User-Agent': 'CatChat-PluginHub/1.0',
        Accept: 'application/vnd.github.v3+json',
      },
      cache: 'no-store',
    })

    if (res.ok) {
      const releases = await res.json()
      if (Array.isArray(releases)) {
        for (const r of releases) {
          if (r.tag_name && r.tag_name.startsWith('plugin-')) {
            const parts = r.tag_name.split('-')
            const pluginId = parts.slice(1, -1).join('-') || parts[1] || r.tag_name.replace('plugin-', '')
            const pluginVersion = parts.pop() || r.tag_name

            if (!foundIds.has(pluginId)) {
              foundIds.add(pluginId)

              let manifest: any = {}
              try {
                const manifestPath = path.join(process.cwd(), 'plugins', pluginId, 'manifest.json')
                if (fs.existsSync(manifestPath)) {
                  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
                }
              } catch {}

              plugins.push({
                id: pluginId,
                name: manifest.name || r.name || pluginId,
                version: pluginVersion.startsWith('v') ? pluginVersion : `v${pluginVersion}`,
                description: manifest.description || r.body || 'Plugin de CatChat',
                category: manifest.category || 'media',
                author: manifest.author || r.author?.login || 'coffee4433',
                icon: manifest.icon || `/plugins/${pluginId}/icon.png`,
                githubUrl: r.html_url || `https://github.com/coffee4433/catchat/releases/tag/${r.tag_name}`,
                verified: true,
              })
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Remote GitHub plugins fetch error:', err)
  }

  // 2. If no published GitHub releases exist, fallback to local plugins/ directory (local dev only)
  if (plugins.length === 0) {
    try {
      const pluginsDir = path.join(process.cwd(), 'plugins')
      if (fs.existsSync(pluginsDir)) {
        const entries = fs.readdirSync(pluginsDir, { withFileTypes: true })
        for (const ent of entries) {
          if (ent.isDirectory()) {
            const manifestPath = path.join(pluginsDir, ent.name, 'manifest.json')
            if (fs.existsSync(manifestPath)) {
              const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
              plugins.push({
                ...manifest,
                verified: true,
              })
            }
          }
        }
      }
    } catch (err) {
      console.error('Local plugins read error:', err)
    }
  }

  return NextResponse.json({ plugins })
}
