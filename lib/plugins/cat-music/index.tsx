'use client'

import React from 'react'
import { Radio } from 'lucide-react'
import type { CatChatPlugin } from '../plugin-types'
import { CatMusicRootProvider } from './cat-music-provider-wrapper'
import { CatMusicMainView } from '@/components/cat-music/main-view'

export const catMusicPlugin: CatChatPlugin = {
  metadata: {
    id: 'cat-music',
    name: 'CatMusic',
    description: 'Reproductor de música tipo Spotify impulsado por la API de YouTube, con playlists, favoritos e historial.',
    version: '1.0.0',
    author: 'CatChat Core Team',
    icon: 'Radio',
    category: 'media',
  },
  railOrder: 0,
  rootProvider: CatMusicRootProvider,
  railTabs: [
    {
      id: 'cat-music',
      label: 'CatMusic',
      icon: <Radio className="size-5" />,
      component: CatMusicMainView,
    },
  ],
}
