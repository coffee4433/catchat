'use client'

import React from 'react'
import type { CatChatPlugin } from '../plugin-types'
import { SurvivorShooterRootProvider } from './survivor-shooter-provider'
import { SurvivorShooterMainView } from '@/components/survivor-shooter/main-view'
import { Crosshair } from 'lucide-react'

export const survivorShooterPlugin: CatChatPlugin = {
  metadata: {
    id: 'survivor-shooter',
    name: 'Survivor Shooter',
    description: 'Third-person shooter game built with Three.js',
    version: '1.0.0',
    author: 'CatChat',
    icon: 'Crosshair',
    category: 'media',
  },
  railOrder: 20,
  rootProvider: SurvivorShooterRootProvider,
  railTabs: [
    {
      id: 'survivor-shooter',
      label: 'Survivor Shooter',
      icon: <Crosshair className="size-5" />,
      component: SurvivorShooterMainView,
    },
  ],
}
