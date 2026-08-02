'use client'

import React from 'react'
import { Crosshair } from 'lucide-react'
import type { CatChatPlugin } from '../plugin-types'
import { TPSControlsRootProvider } from './tps-controls-provider'
import { TPSControlsMainView } from '@/components/tps-controls/main-view'

export const tpsControlsPlugin: CatChatPlugin = {
  metadata: {
    id: 'tps-controls',
    name: 'TPS Controls',
    description:
      'Controles de shooter en tercera persona con físicas Rapier, animaciones y sistema de disparo.',
    version: '1.0.1',
    author: 'CatChat Core Team',
    icon: 'Crosshair',
    category: 'chat',
  },
  railOrder: 20,
  rootProvider: TPSControlsRootProvider,
  railTabs: [
    {
      id: 'tps-controls',
      label: 'TPS Controls',
      icon: <Crosshair className="size-5" />,
      component: TPSControlsMainView,
    },
  ],
}
