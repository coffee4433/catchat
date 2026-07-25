import { NextResponse } from 'next/server'

export async function GET() {
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
        const githubPlugins: any[] = []

        for (const rel of releases) {
          if (!rel.tag_name || !rel.tag_name.startsWith('plugin-')) continue

          const tagParts = rel.tag_name.split('-')
          const pluginId = tagParts[1] || 'custom-plugin'

          githubPlugins.push({
            id: pluginId,
            name: rel.name ? rel.name.replace('Plugin: ', '') : `Plugin ${pluginId}`,
            description: rel.body || 'Plugin oficial publicado en GitHub Releases.',
            version: rel.tag_name,
            author: rel.author?.login || 'coffee4433',
            category: 'media',
            downloads: '1',
            rating: 5.0,
            githubUrl: rel.html_url,
            iconName: 'Boxes',
            verified: true,
          })
        }

        return NextResponse.json({ plugins: githubPlugins })
      }
    }
  } catch (err) {
    console.error('Failed to fetch GitHub plugin releases:', err)
  }

  return NextResponse.json({ plugins: [] })
}
