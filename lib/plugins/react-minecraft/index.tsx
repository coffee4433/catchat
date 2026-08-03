'use client'

import React from 'react'
import { Box } from 'lucide-react'
import type { CatChatPlugin } from '../plugin-types'
import { MinecraftMainView } from '@/components/react-minecraft/main-view'

export const reactMinecraftPlugin: CatChatPlugin = {
  metadata: {
    id: 'react-minecraft',
    name: 'React Minecraft',
    description:
      'Clon de Minecraft construido con React Three Fiber y Three.js. Se juega desde CatChat.',
    version: '1.0.0',
    author: 'coffee4433',
    icon: 'Box',
    category: 'utility',
  },
  railOrder: 15,
  railTabs: [
    {
      id: 'react-minecraft',
      label: 'React Minecraft',
      icon: <Box className="size-5" />,
      component: MinecraftMainView,
    },
  ],
}
