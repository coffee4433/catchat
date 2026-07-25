import { NextResponse } from 'next/server'

export async function GET() {
  const defaultPlugins = [
    {
      id: 'cat-music',
      name: 'CatMusic',
      description:
        'Reproductor infinito de música en alta calidad basado en YouTube Music. Incluye listas de reproducción, buscador global en vivo y descargas MP3.',
      version: 'v1.0.0',
      author: 'coffee4433',
      category: 'media',
      downloads: '14.8k',
      rating: 4.9,
      githubUrl: 'https://github.com/coffee4433/catchat/releases/tag/plugin-cat-music',
      iconName: 'Radio',
      verified: true,
    },
  ]

  try {
    const res = await fetch('https://api.github.com/repos/coffee4433/catchat/releases', {
      headers: {
        'User-Agent': 'CatChat-PluginHub/1.0',
        Accept: 'application/vnd.github.v3+json',
      },
      next: { revalidate: 60 },
    })

    if (res.ok) {
      const releases = await res.json()

      if (Array.isArray(releases)) {
        const githubPlugins: any[] = []

        for (const rel of releases) {
          if (!rel.tag_name || !rel.tag_name.startsWith('plugin-')) continue

          const tagParts = rel.tag_name.split('-')
          const pluginId = tagParts[1] || 'custom-plugin'

          if (defaultPlugins.some((p) => p.id === pluginId)) continue

          githubPlugins.push({
            id: pluginId,
            name: rel.name ? rel.name.replace('Plugin: ', '') : `Plugin ${pluginId}`,
            description: rel.body || 'Plugin oficial de CatChat disponible en GitHub Releases.',
            version: rel.tag_name,
            author: rel.author?.login || 'coffee4433',
            category: 'utility',
            downloads: '1.2k',
            rating: 5.0,
            githubUrl: rel.html_url,
            iconName: 'Boxes',
            verified: true,
          })
        }

        return NextResponse.json({ plugins: [...defaultPlugins, ...githubPlugins] })
      }
    }
  } catch (err) {
    console.error('Failed to fetch GitHub plugin releases:', err)
  }

  return NextResponse.json({ plugins: defaultPlugins })
}
