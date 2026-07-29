'use client'

import React from 'react'
import { TrendingUp } from 'lucide-react'
import type { CatChatPlugin } from '../plugin-types'
import { PolimarketRootProvider } from './polimarket-provider'
import { PolimarketMainView } from '@/components/polimarket/main-view'

export const polimarketPlugin: CatChatPlugin = {
  metadata: {
    id: 'polimarket',
    name: 'Polimarket',
    description:
      'Monitor de apuestas nuevas en Polymarket para deportes y esports, con alertas en tiempo real.',
    version: '1.0.0',
    author: 'coffee4433',
    icon: 'TrendingUp',
    category: 'productivity',
  },
  railOrder: 10,
  rootProvider: PolimarketRootProvider,
  railTabs: [
    {
      id: 'polimarket',
      label: 'Polimarket',
      icon: <TrendingUp className="size-5" />,
      component: PolimarketMainView,
    },
  ],
}
