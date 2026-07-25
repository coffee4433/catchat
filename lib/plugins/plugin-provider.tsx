'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { CatChatPlugin, PluginRailTab } from './plugin-types'
import { getRegisteredPlugins } from './plugin-registry'

type PluginContextType = {
  registeredPlugins: CatChatPlugin[]
  installedPluginIds: string[]
  enabledPluginIds: string[]
  installingPluginId: string | null
  installProgressMap: Record<string, number>
  isPluginInstalled: (id: string) => boolean
  isPluginEnabled: (id: string) => boolean
  installPlugin: (id: string) => Promise<void>
  uninstallPlugin: (id: string) => void
  enablePlugin: (id: string) => void
  disablePlugin: (id: string) => void
  togglePlugin: (id: string) => void
  getActiveRailTabs: () => PluginRailTab[]
}

const PluginContext = createContext<PluginContextType | null>(null)

const STORAGE_KEY_ENABLED = 'cz-enabled-plugins'
const STORAGE_KEY_INSTALLED = 'cz-installed-plugins'

export function PluginProvider({ children, user }: { children: React.ReactNode; user?: any }) {
  // Installed plugins (default empty array - plugins must be installed from Plugin Hub)
  const [installedPluginIds, setInstalledPluginIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_INSTALLED)
        if (saved) return JSON.parse(saved)
      } catch {
        // Fallback
      }
    }
    return []
  })

  // Enabled plugins (default empty array)
  const [enabledPluginIds, setEnabledPluginIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_ENABLED)
        if (saved) return JSON.parse(saved)
      } catch {
        // Fallback
      }
    }
    return []
  })

  const [installingPluginId, setInstallingPluginId] = useState<string | null>(null)
  const [installProgressMap, setInstallProgressMap] = useState<Record<string, number>>({})

  // Persist installed and enabled plugins
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_INSTALLED, JSON.stringify(installedPluginIds))
    }
  }, [installedPluginIds])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ENABLED, JSON.stringify(enabledPluginIds))
    }
  }, [enabledPluginIds])

  const registered = getRegisteredPlugins()

  const isPluginInstalled = (id: string) => installedPluginIds.includes(id)
  const isPluginEnabled = (id: string) => isPluginInstalled(id) && enabledPluginIds.includes(id)

  const installPlugin = async (id: string) => {
    if (installingPluginId === id || isPluginInstalled(id)) return
    setInstallingPluginId(id)
    setInstallProgressMap((prev) => ({ ...prev, [id]: 10 }))

    // Simulate animated download & extraction from GitHub plugin registry
    for (let progress = 20; progress <= 100; progress += 20) {
      await new Promise((r) => setTimeout(r, 250))
      setInstallProgressMap((prev) => ({ ...prev, [id]: progress }))
    }

    setInstalledPluginIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setEnabledPluginIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setInstallingPluginId(null)

    const plugin = registered.find((p) => p.metadata.id === id)
    plugin?.onEnable?.()
  }

  const uninstallPlugin = (id: string) => {
    disablePlugin(id)
    setInstalledPluginIds((prev) => prev.filter((pId) => pId !== id))
  }

  const enablePlugin = (id: string) => {
    if (isPluginInstalled(id) && !enabledPluginIds.includes(id)) {
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
        installedPluginIds,
        enabledPluginIds,
        installingPluginId,
        installProgressMap,
        isPluginInstalled,
        isPluginEnabled,
        installPlugin,
        uninstallPlugin,
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
