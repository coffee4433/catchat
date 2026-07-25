'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { CatChatPlugin, PluginRailTab } from './plugin-types'
import { getRegisteredPlugins } from './plugin-registry'

type PluginContextType = {
  registeredPlugins: CatChatPlugin[]
  enabledPluginIds: string[]
  isPluginEnabled: (id: string) => boolean
  enablePlugin: (id: string) => void
  disablePlugin: (id: string) => void
  togglePlugin: (id: string) => void
  getActiveRailTabs: () => PluginRailTab[]
}

const PluginContext = createContext<PluginContextType | null>(null)

const STORAGE_KEY = 'cz-enabled-plugins'

export function PluginProvider({ children, user }: { children: React.ReactNode; user?: any }) {
  const [enabledPluginIds, setEnabledPluginIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          return JSON.parse(saved)
        }
      } catch {
        // Fallback
      }
    }
    // Default plugins enabled on first launch
    return ['cat-music']
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledPluginIds))
    }
  }, [enabledPluginIds])

  const registered = getRegisteredPlugins()

  const isPluginEnabled = (id: string) => enabledPluginIds.includes(id)

  const enablePlugin = (id: string) => {
    if (!enabledPluginIds.includes(id)) {
      const next = [...enabledPluginIds, id]
      setEnabledPluginIds(next)
      const plugin = registered.find((p) => p.metadata.id === id)
      plugin?.onEnable?.()
    }
  }

  const disablePlugin = (id: string) => {
    if (enabledPluginIds.includes(id)) {
      const next = enabledPluginIds.filter((pId) => pId !== id)
      setEnabledPluginIds(next)
      const plugin = registered.find((p) => p.metadata.id === id)
      plugin?.onDisable?.()
    }
  }

  const togglePlugin = (id: string) => {
    if (isPluginEnabled(id)) {
      disablePlugin(id)
    } else {
      enablePlugin(id)
    }
  }

  const getActiveRailTabs = (): PluginRailTab[] => {
    const tabs: PluginRailTab[] = []
    registered.forEach((plugin) => {
      if (isPluginEnabled(plugin.metadata.id) && plugin.railTabs) {
        tabs.push(...plugin.railTabs)
      }
    })
    return tabs
  }

  // Nest root providers of all enabled plugins
  let wrappedContent = <>{children}</>

  registered.forEach((plugin) => {
    if (isPluginEnabled(plugin.metadata.id) && plugin.rootProvider) {
      const Provider = plugin.rootProvider
      wrappedContent = <Provider user={user}>{wrappedContent}</Provider>
    }
  })

  return (
    <PluginContext.Provider
      value={{
        registeredPlugins: registered,
        enabledPluginIds,
        isPluginEnabled,
        enablePlugin,
        disablePlugin,
        togglePlugin,
        getActiveRailTabs,
      }}
    >
      {wrappedContent}
    </PluginContext.Provider>
  )
}

export function usePlugins() {
  const ctx = useContext(PluginContext)
  if (!ctx) {
    throw new Error('usePlugins must be used within a PluginProvider')
  }
  return ctx
}
