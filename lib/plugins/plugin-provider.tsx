'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { CatChatPlugin, PluginRailTab } from './plugin-types'
import { getRegisteredPlugins, registerPlugin, unregisterPlugin } from './plugin-registry'

type PluginUpdateInfo = {
  available: boolean
  newVersion: string
  name: string
  releaseNotes?: string
}

type PluginContextType = {
  registeredPlugins: CatChatPlugin[]
  installedPluginIds: string[]
  enabledPluginIds: string[]
  installingPluginId: string | null
  installProgressMap: Record<string, number>
  pluginUpdates: Record<string, PluginUpdateInfo>
  isPluginInstalled: (id: string) => boolean
  isPluginEnabled: (id: string) => boolean
  hasPluginUpdate: (id: string) => boolean
  getPluginUpdateInfo: (id: string) => PluginUpdateInfo | null
  installPlugin: (id: string, isUpdate?: boolean) => Promise<void>
  updatePlugin: (id: string) => Promise<void>
  dismissPluginUpdate: (id: string) => void
  uninstallPlugin: (id: string) => void
  enablePlugin: (id: string) => void
  disablePlugin: (id: string) => void
  togglePlugin: (id: string) => void
  getActiveRailTabs: () => PluginRailTab[]
}

const PluginContext = createContext<PluginContextType | null>(null)

const STORAGE_KEY_ENABLED = 'cz-enabled-plugins'
const STORAGE_KEY_INSTALLED = 'cz-installed-plugins'

export function isElectronEnv(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(
    (window as any).electronAPI ||
      (window as any).ipcRenderer ||
      (window as any).releaseTool ||
      navigator.userAgent.toLowerCase().includes('electron')
  )
}

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
  const [pluginUpdates, setPluginUpdates] = useState<Record<string, PluginUpdateInfo>>({})

  // Fetch live published plugins from GitHub Releases API to detect available updates
  useEffect(() => {
    fetch('/api/plugins')
      .then((res) => res.json())
      .then((data) => {
        if (data?.plugins && Array.isArray(data.plugins)) {
          const updatesMap: Record<string, PluginUpdateInfo> = {}
          for (const p of data.plugins) {
            const installedVer = localStorage.getItem(`cz-plugin-ver-${p.id}`) || '1.0.0'
            const remoteVer = (p.version || '1.0.0').replace(/^v/, '')
            const cleanInstalledVer = installedVer.replace(/^v/, '')
            if (installedPluginIds.includes(p.id) && remoteVer !== cleanInstalledVer) {
              updatesMap[p.id] = {
                available: true,
                newVersion: p.version.startsWith('v') ? p.version : `v${p.version}`,
                name: p.name || p.id,
                releaseNotes: p.description,
              }
            }
          }
          setPluginUpdates(updatesMap)
        }
      })
      .catch(() => {})
  }, [installedPluginIds])

  // Persist installed and enabled plugins
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_INSTALLED, JSON.stringify(installedPluginIds))
    }
    if (installedPluginIds.includes('cat-music')) {
      import('./cat-music')
        .then((m) => {
          if (m?.catMusicPlugin) registerPlugin(m.catMusicPlugin)
        })
        .catch(() => {})
    } else {
      unregisterPlugin('cat-music')
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
  const hasPluginUpdate = (id: string) => Boolean(pluginUpdates[id]?.available)
  const getPluginUpdateInfo = (id: string) => pluginUpdates[id] || null

  const installPlugin = async (id: string, isUpdate = false) => {
    if (!isElectronEnv()) return
    if (installingPluginId === id || (isPluginInstalled(id) && !isUpdate)) return
    setInstallingPluginId(id)
    setInstallProgressMap((prev) => ({ ...prev, [id]: 10 }))

    // Simulate animated download & extraction from GitHub plugin registry
    for (let progress = 20; progress <= 100; progress += 20) {
      await new Promise((r) => setTimeout(r, 250))
      setInstallProgressMap((prev) => ({ ...prev, [id]: progress }))
    }

    setInstalledPluginIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setEnabledPluginIds((prev) => (prev.includes(id) ? prev : [...prev, id]))

    if (pluginUpdates[id]?.newVersion) {
      localStorage.setItem(`cz-plugin-ver-${id}`, pluginUpdates[id].newVersion)
    }

    setPluginUpdates((prev) => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })

    setInstallingPluginId(null)

    const plugin = registered.find((p) => p.metadata.id === id)
    plugin?.onEnable?.()
  }

  const updatePlugin = async (id: string) => {
    return installPlugin(id, true)
  }

  const dismissPluginUpdate = (id: string) => {
    setPluginUpdates((prev) => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
  }

  const uninstallPlugin = (id: string) => {
    disablePlugin(id)
    unregisterPlugin(id)
    setInstalledPluginIds((prev) => prev.filter((pId) => pId !== id))

    // Purge all persistent data associated with this plugin completely
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`cz-plugin-data-${id}`)
        localStorage.removeItem(`cz-plugin-ver-${id}`)
        if (id === 'cat-music') {
          localStorage.removeItem('cz-catmusic-store')
          localStorage.removeItem('cz-catmusic-playlists')
          localStorage.removeItem('cz-catmusic-favorites')
          localStorage.removeItem('cz-catmusic-history')
        }
      } catch {
        // Ignore storage purge errors
      }
    }
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

  // Nest root providers of ALL registered plugins STABLY so React component tree never unmounts
  let wrappedContent = <>{children}</>

  registered.forEach((plugin) => {
    if (plugin.rootProvider) {
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
        pluginUpdates,
        isPluginInstalled,
        isPluginEnabled,
        hasPluginUpdate,
        getPluginUpdateInfo,
        installPlugin,
        updatePlugin,
        dismissPluginUpdate,
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
