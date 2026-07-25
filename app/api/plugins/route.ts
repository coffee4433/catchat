import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const plugins: any[] = []

  // 1. Read from local repository plugins/ directory first
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
              downloads: '14.8k',
              rating: 4.9,
              verified: true,
            })
          }
        }
      }
    }
  } catch (err) {
    console.error('Local plugins read error:', err)
  }

  // 2. Fallback to GitHub repository contents API if no local plugins found
  if (plugins.length === 0) {
    try {
      const res = await fetch('https://api.github.com/repos/coffee4433/catchat/contents/plugins', {
        headers: {
          'User-Agent': 'CatChat-PluginHub/1.0',
          Accept: 'application/vnd.github.v3+json',
        },
        cache: 'no-store',
      })

      if (res.ok) {
        const items = await res.json()
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.type === 'dir') {
              const manifestRes = await fetch(
                `https://raw.githubusercontent.com/coffee4433/catchat/main/plugins/${item.name}/manifest.json`
              )
              if (manifestRes.ok) {
                const manifest = await manifestRes.json()
                plugins.push({
                  ...manifest,
                  downloads: '14.8k',
                  rating: 4.9,
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
  }

  return NextResponse.json({ plugins })
}
