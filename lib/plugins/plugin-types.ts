import type { ReactNode } from 'react'

export type PluginSlot = 'rail-tab' | 'settings-section' | 'app-view' | 'chat-action'

export type PluginCategory = 'media' | 'productivity' | 'utility' | 'theme' | 'chat'

export type PluginMetadata = {
  id: string
  name: string
  description: string
  version: string
  author: string
  icon: string // Lucide icon name or emoji
  category: PluginCategory
  settingsComponent?: React.ComponentType
}

export type PluginViewProps = {
  user: any
  onOpenSettings?: () => void
}

export type PluginRailTab = {
  id: string
  label: string
  icon: ReactNode
  component: React.ComponentType<PluginViewProps>
}

export type CatChatPlugin = {
  metadata: PluginMetadata
  /** Lower values appear first in the sidebar rail (after CatChat). */
  railOrder?: number
  railTabs?: PluginRailTab[]
  rootProvider?: React.ComponentType<{ children: ReactNode; user: any }>
  onEnable?: () => void
  onDisable?: () => void
}
