'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { CatChatPlugin, PluginRailTab } from './plugin-types'
import { catMusicPlugin } from './cat-music'
import { polimarketPlugin } from './polimarket'
import { tpsControlsPlugin } from './tps-controls'
import { reactMinecraftPlugin } from './react-minecraft'
import { getRegisteredPlugins, registerPlugin, unregisterPlugin } from './plugin-registry'
import { getPluginInstaller } from './plugin-installer-client'

type PluginUpdateInfo = {
  available: boolean
  newVersion: string
  name: string
  releaseNotes?: string
  downloadUrl?: string
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
  refreshPluginUpdates: () => Promise<void>
  uninstallPlugin: (id: string) => void
  enablePlugin: (id: string) => void
  disablePlugin: (id: string) => void
  togglePlugin: (id: string) => void
  getActiveRailTabs: () => PluginRailTab[]
}

const PluginContext = createContext<PluginContextType | null>(null)

const STORAGE_KEY_ENABLED = 'cz-enabled-plugins'
const STORAGE_KEY_INSTALLED = 'cz-installed-plugins'
const PLUGIN_UPDATE_POLL_MS = 30_000

const BUNDLED_PLUGINS: Record<string, CatChatPlugin> = {
  'cat-music': catMusicPlugin,
  polimarket: polimarketPlugin,
  'tps-controls': tpsControlsPlugin,
  'react-minecraft': reactMinecraftPlugin,
}

const BUNDLED_PLUGIN_IDS = Object.keys(BUNDLED_PLUGINS)

const STABLE_ROOT_PROVIDERS = [
  { id: 'cat-music' as const, Provider: catMusicPlugin.rootProvider! },
  { id: 'polimarket' as const, Provider: polimarketPlugin.rootProvider! },
  { id: 'tps-controls' as const, Provider: tpsControlsPlugin.rootProvider! },
]

function loadPluginIdList(key: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem(key)
    if (!saved) return []
    const parsed = JSON.parse(saved) as string[]
    return Array.isArray(parsed) ? parsed.filter((id) => id !== 'survivor-shooter' && id !== 'tps-shooter' && id !== 'fortnite-builder') : []
  } catch {
    return []
  }
}

function mergePluginLists(...lists: string[][]): string[] {
  return [...new Set(lists.flat())]
}

export function isElectronEnv(): boolean {
  if (typeof window === 'undefined') return false
  if (process.env.NODE_ENV === 'development') return true
  return Boolean(
    (window as any).electronAPI ||
      (window as any).ipcRenderer ||
      (window as any).releaseTool ||
      navigator.userAgent.toLowerCase().includes('electron')
  )
}

export function PluginProvider({ children, user }: { children: React.ReactNode; user?: any }) {
  // Derive user-scoped storage keys so each account has independent plugin state
  const userId = user?.id || ''
  const storageKeyInstalled = userId ? `cz-installed-plugins-${userId}` : STORAGE_KEY_INSTALLED
  const storageKeyEnabled = userId ? `cz-enabled-plugins-${userId}` : STORAGE_KEY_ENABLED
  const pluginVerKey = (pluginId: string) => userId ? `cz-plugin-ver-${pluginId}-${userId}` : `cz-plugin-ver-${pluginId}`

  // Installed plugins (default empty array - plugins must be installed from Plugin Hub)
  const [installedPluginIds, setInstalledPluginIds] = useState<string[]>([])
  const [enabledPluginIds, setEnabledPluginIds] = useState<string[]>([])
  const [storageReady, setStorageReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const userInstalled = loadPluginIdList(storageKeyInstalled)
    const userEnabled = loadPluginIdList(storageKeyEnabled)
    const legacyInstalled = userId ? loadPluginIdList(STORAGE_KEY_INSTALLED) : []
    const legacyEnabled = userId ? loadPluginIdList(STORAGE_KEY_ENABLED) : []

    const mergedInstalled = mergePluginLists(userInstalled, legacyInstalled)
    const mergedEnabled = mergePluginLists(userEnabled, legacyEnabled)

    setInstalledPluginIds(mergedInstalled)
    setEnabledPluginIds(mergedEnabled)

    try {
      localStorage.setItem(storageKeyInstalled, JSON.stringify(mergedInstalled))
      localStorage.setItem(storageKeyEnabled, JSON.stringify(mergedEnabled))
      if (userId && legacyInstalled.length > 0) {
        localStorage.removeItem(STORAGE_KEY_INSTALLED)
        localStorage.removeItem(STORAGE_KEY_ENABLED)
      }
      localStorage.removeItem('cz-plugin-ver-survivor-shooter')
      localStorage.removeItem('cz-plugin-data-survivor-shooter')
      localStorage.removeItem('cz-plugin-ver-tps-shooter')
      localStorage.removeItem('cz-plugin-data-tps-shooter')
      localStorage.removeItem('cz-plugin-ver-fortnite-builder')
      localStorage.removeItem('cz-plugin-data-fortnite-builder')
      if (userId) {
        localStorage.removeItem(`cz-plugin-ver-survivor-shooter-${userId}`)
        localStorage.removeItem(`cz-plugin-data-survivor-shooter-${userId}`)
        localStorage.removeItem(`cz-plugin-ver-tps-shooter-${userId}`)
        localStorage.removeItem(`cz-plugin-data-tps-shooter-${userId}`)
        localStorage.removeItem(`cz-plugin-ver-fortnite-builder-${userId}`)
        localStorage.removeItem(`cz-plugin-data-fortnite-builder-${userId}`)
      }
    } catch {
      // Ignore storage write errors
    }

    setStorageReady(true)
  }, [storageKeyInstalled, storageKeyEnabled, userId])

  const [installingPluginId, setInstallingPluginId] = useState<string | null>(null)
  const [installProgressMap, setInstallProgressMap] = useState<Record<string, number>>({})
  const [pluginUpdates, setPluginUpdates] = useState<Record<string, PluginUpdateInfo>>({})
  const [liveVersionMap, setLiveVersionMap] = useState<Record<string, string>>({})
  const [liveDownloadMap, setLiveDownloadMap] = useState<Record<string, string>>({})

  const refreshPluginUpdates = useCallback(async () => {
    try {
      const res = await fetch(`/api/plugins?_=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()
      if (data?.plugins && Array.isArray(data.plugins)) {
        const updatesMap: Record<string, PluginUpdateInfo> = {}
        const vMap: Record<string, string> = {}
        const dMap: Record<string, string> = {}
        for (const p of data.plugins) {
          const formattedRemote = p.version ? (p.version.startsWith('v') ? p.version : `v${p.version}`) : 'v1.0.0'
          vMap[p.id] = formattedRemote
          if (p.downloadUrl) dMap[p.id] = p.downloadUrl
          const installedVer = (localStorage.getItem(pluginVerKey(p.id)) || '1.0.0').replace(/^v/, '')
          const remoteVer = (p.version || '1.0.0').replace(/^v/, '')
          if (installedPluginIds.includes(p.id) && remoteVer !== installedVer) {
            updatesMap[p.id] = {
              available: true,
              newVersion: formattedRemote,
              name: p.name || p.id,
              releaseNotes: p.description,
              downloadUrl: p.downloadUrl,
            }
          }
        }
        setLiveVersionMap(vMap)
        setLiveDownloadMap(dMap)
        setPluginUpdates(updatesMap)
      }
    } catch {
      // Ignore network errors; next poll will retry
    }
  }, [installedPluginIds, pluginVerKey])

  // Poll GitHub Releases API to detect plugin updates in near real-time
  useEffect(() => {
    refreshPluginUpdates()
    const id = setInterval(refreshPluginUpdates, PLUGIN_UPDATE_POLL_MS)
    return () => clearInterval(id)
  }, [refreshPluginUpdates])

  useEffect(() => {
    const onFocus = () => refreshPluginUpdates()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshPluginUpdates])

  // Ensure bundled plugins stay registered (survives uninstall/reinstall cycles)
  useEffect(() => {
    for (const plugin of Object.values(BUNDLED_PLUGINS)) {
      registerPlugin(plugin)
    }
  }, [])

  // Persist installed and enabled plugins (user-scoped) — only after hydration
  useEffect(() => {
    if (!storageReady || typeof window === 'undefined') return
    localStorage.setItem(storageKeyInstalled, JSON.stringify(installedPluginIds))
  }, [installedPluginIds, storageReady, storageKeyInstalled])

  useEffect(() => {
    if (!storageReady || typeof window === 'undefined') return
    localStorage.setItem(storageKeyEnabled, JSON.stringify(enabledPluginIds))
  }, [enabledPluginIds, storageReady, storageKeyEnabled])

  const registered = getRegisteredPlugins()

  const isPluginInstalled = (id: string) => installedPluginIds.includes(id)
  const isPluginEnabled = (id: string) => isPluginInstalled(id) && enabledPluginIds.includes(id)
  const hasPluginUpdate = (id: string) => Boolean(pluginUpdates[id]?.available)
  const getPluginUpdateInfo = (id: string) => pluginUpdates[id] || null

  const installPlugin = async (id: string, isUpdate = false) => {
    if (installingPluginId === id) return

    if (isPluginInstalled(id) && !isUpdate) {
      enablePlugin(id)
      return
    }

    const bundled = BUNDLED_PLUGINS[id]
    if (bundled) registerPlugin(bundled)

    const installer = getPluginInstaller()
    const targetVersion = pluginUpdates[id]?.newVersion || liveVersionMap[id] || 'v0.0.1'

    // Bundled plugins ship their code inside the app — no package download needed
    if (installer && !bundled) {
      let downloadUrl = pluginUpdates[id]?.downloadUrl || liveDownloadMap[id] || `/plugins/${id}/release.zip`
      if (downloadUrl.startsWith('/')) {
        downloadUrl = `${window.location.origin}${downloadUrl}`
      }
      setInstallingPluginId(id)
      setInstallProgressMap((prev) => ({ ...prev, [id]: 0 }))

      const unsubProgress = installer.onDownloadProgress((progress) => {
        if (progress.pluginId !== id) return
        setInstallProgressMap((prev) => ({ ...prev, [id]: progress.percent }))
      })

      try {
        await installer.install({
          pluginId: id,
          version: targetVersion,
          downloadUrl,
        })
      } catch (err) {
        console.warn(`[PluginProvider] Plugin package download notice for "${id}":`, err)
      } finally {
        unsubProgress()
        setInstallingPluginId(null)
        setInstallProgressMap((prev) => {
          const copy = { ...prev }
          delete copy[id]
          return copy
        })
      }
    }

    setInstalledPluginIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setEnabledPluginIds((prev) => {
      if (prev.includes(id)) return prev
      return [...prev, id]
    })
    localStorage.setItem(pluginVerKey(id), targetVersion)

    setPluginUpdates((prev) => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })

    const plugin = registered.find((p) => p.metadata.id === id)
    plugin?.onEnable?.()
    await refreshPluginUpdates()
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
    if (!BUNDLED_PLUGIN_IDS.includes(id)) {
      unregisterPlugin(id)
    }
    setInstalledPluginIds((prev) => prev.filter((pId) => pId !== id))

    // Purge all persistent data associated with this plugin completely
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`cz-plugin-data-${id}`)
        localStorage.removeItem(pluginVerKey(id))
        if (id === 'cat-music') {
          localStorage.removeItem('cz-catmusic-store')
          localStorage.removeItem('cz-catmusic-playlists')
          localStorage.removeItem('cz-catmusic-favorites')
          localStorage.removeItem('cz-catmusic-history')
        }
        if (id === 'polimarket') {
          localStorage.removeItem('cz-polimarket-seen-events')
          localStorage.removeItem('cz-polimarket-alerts')
          localStorage.removeItem('cz-polimarket-settings')
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
      const pluginId = plugin.metadata.id
      if (!isPluginEnabled(pluginId) || !plugin.railTabs?.length) return
      for (const tab of plugin.railTabs) {
        tabs.push(tab)
      }
    })

    const orderFor = (pluginId: string) => {
      const plugin = registered.find((p) => p.metadata.id === pluginId)
      return plugin?.railOrder ?? 100
    }

    return tabs.sort((a, b) => {
      const orderDiff = orderFor(a.id) - orderFor(b.id)
      if (orderDiff !== 0) return orderDiff
      return a.label.localeCompare(b.label)
    })
  }

  // Nest root providers in a fixed order so React never remounts children when plugins change
  let wrappedContent = <>{children}</>

  for (const { id, Provider } of [...STABLE_ROOT_PROVIDERS].reverse()) {
    wrappedContent = (
      <Provider key={id} user={user} active={installedPluginIds.includes(id)}>
        {wrappedContent}
      </Provider>
    )
  }

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
        refreshPluginUpdates,
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
