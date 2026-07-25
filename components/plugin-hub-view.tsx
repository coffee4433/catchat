'use client'

import React, { useState } from 'react'
import {
  Boxes,
  Cloud,
  Command,
  Download,
  HardDrive,
  Layers,
  PackageOpen,
  Radio,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'
import { isElectronEnv, usePlugins } from '@/lib/plugins/plugin-provider'
import { useLanguage } from '@/lib/i18n'

export type StorePluginItem = {
  id: string
  name: string
  description: string
  version: string
  author: string
  category: 'media' | 'productivity' | 'utility' | 'ai'
  icon?: string
  rating?: number
  githubUrl: string
  verified: boolean
}

export const AVAILABLE_HUB_PLUGINS: StorePluginItem[] = []

function PluginIcon({ id, className }: { id: string; className?: string }) {
  if (id === 'cat-music') {
    return (
      <img
        src="/plugins/cat-music/icon.png"
        alt="CatMusic"
        className="w-full h-full object-cover rounded-none"
      />
    )
  }
  if (id === 'cat-ai') return <Sparkles className={className} />
  if (id === 'cat-canvas') return <Zap className={className} />
  return <Boxes className={className} />
}

export function PluginHubView({ onClose }: { onClose?: () => void }) {
  const { lang } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [hubPlugins, setHubPlugins] = useState<StorePluginItem[]>(AVAILABLE_HUB_PLUGINS)

  const {
    isPluginInstalled,
    isPluginEnabled,
    installPlugin,
    uninstallPlugin,
    togglePlugin,
    installingPluginId,
    installProgressMap,
  } = usePlugins()

  const categories = [
    { id: 'all', label: lang === 'es' ? 'Todos' : 'All', icon: Layers },
    { id: 'media', label: 'Media', icon: Radio },
    { id: 'ai', label: lang === 'es' ? 'IA & Bots' : 'AI & Bots', icon: Sparkles },
    { id: 'productivity', label: lang === 'es' ? 'Productividad' : 'Productivity', icon: Zap },
    { id: 'utility', label: lang === 'es' ? 'Utilidades' : 'Utilities', icon: Command },
  ] as const

  // Fetch live published plugins from GitHub Releases API
  React.useEffect(() => {
    fetch('/api/plugins')
      .then((res) => res.json())
      .then((data) => {
        if (data.plugins && Array.isArray(data.plugins) && data.plugins.length > 0) {
          setHubPlugins(data.plugins)
        }
      })
      .catch(() => {})
  }, [])

  const filteredPlugins = hubPlugins.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.author.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const isElectron = isElectronEnv()

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background text-foreground select-none">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 size-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 size-72 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative flex h-full w-full flex-col overflow-y-auto thin-scroll p-6 md:p-8 space-y-8">
        {/* ── Search section ───────────────────────────────── */}
        <section className="pt-2">
          {/* Search bar */}
          <div className="group relative mx-auto max-w-xl">
            <div className="absolute -inset-0.5 rounded-2xl bg-primary/30 opacity-0 blur transition-opacity duration-300 group-focus-within:opacity-100" />
            <div className="relative flex items-center rounded-2xl border border-border/60 bg-secondary/50 backdrop-blur-xl transition-colors focus-within:border-primary/50">
              <Search className="ml-4 size-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                placeholder={
                  lang === 'es'
                    ? 'Buscar plugins, autores, categorías...'
                    : 'Search plugins, authors, categories...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              />
              <kbd className="mr-3 hidden shrink-0 rounded-md border border-border/60 bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">
                ⌘K
              </kbd>
            </div>
          </div>
        </section>

        {/* ── Category pills ───────────────────────────────── */}
        <section className="flex items-center justify-center">
          <div className="flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-border/40 bg-secondary/20 p-1.5 backdrop-blur-xl">
            {categories.map((cat) => {
              const Icon = cat.icon
              const active = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Plugin grid ──────────────────────────────────── */}
        {filteredPlugins.length === 0 ? (
          <section className="flex flex-col items-center py-10 text-center">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-primary/10 blur-2xl" />
              <div className="relative flex size-20 items-center justify-center rounded-3xl border border-border/60 bg-secondary/30">
                <PackageOpen className="size-9 text-muted-foreground" />
              </div>
            </div>
            <h3 className="mt-6 text-lg font-bold">
              {lang === 'es' ? 'Aún no hay plugins por aquí' : 'No plugins available yet'}
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {lang === 'es'
                ? 'Publica plugins (como CatMusic) desde la Release Tool de CatChat y aparecerán aquí automáticamente para todos los usuarios.'
                : 'Publish plugins (like CatMusic) from CatChat Release Tool and they will automatically appear here for all users.'}
            </p>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredPlugins.map((plugin) => {
              const isInstalled = isPluginInstalled(plugin.id)
              const isEnabled = isPluginEnabled(plugin.id)
              const isInstalling = installingPluginId === plugin.id
              const progress = installProgressMap[plugin.id] || 0

              // Format clean version without double 'vv'
              const formattedVersion = plugin.version
                ? plugin.version.startsWith('v')
                  ? plugin.version
                  : `v${plugin.version}`
                : 'v1.0.0'

              return (
                <article
                  key={plugin.id}
                  className="relative overflow-hidden rounded-2xl border border-border/50 bg-secondary/20 backdrop-blur-xl transition-colors hover:border-primary/40 hover:bg-secondary/30"
                >
                  {/* Top theme accent bar */}
                  <div className="h-1 w-full bg-primary/60" />

                  <div className="p-3.5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden">
                          <PluginIcon id={plugin.id} className="size-full" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="truncate text-xs font-bold tracking-tight">
                              {plugin.name}
                            </h3>
                            {!isInstalled ? (
                              <span title={lang === 'es' ? 'Disponible en la nube' : 'Available in cloud'}>
                                <Cloud className="size-3 shrink-0 text-muted-foreground/80" />
                              </span>
                            ) : (
                              <span title={lang === 'es' ? 'Instalando en el dispositivo' : 'Installed on device'}>
                                <HardDrive className="size-3 shrink-0 text-emerald-400" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-md border border-border/50 bg-secondary/60 px-1.5 py-0.5 font-mono text-[9.5px] text-muted-foreground">
                        {formattedVersion}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="mt-2.5 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">
                      {plugin.description}
                    </p>

                    {/* Install progress */}
                    {isInstalling && (
                      <div className="mt-3 space-y-1.5 rounded-xl border border-border/40 bg-background/40 p-2">
                        <div className="flex items-center justify-between text-[10px] font-semibold">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <span className="size-2.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span>{lang === 'es' ? 'Descargando…' : 'Downloading…'}</span>
                          </span>
                          <span className="tabular-nums text-foreground">{progress}%</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/30 pt-2.5">
                      <div className="flex items-center gap-1.5">
                        {!isInstalled ? (
                          <button
                            onClick={() => isElectron && installPlugin(plugin.id)}
                            disabled={!isElectron || isInstalling}
                            title={
                              isElectron
                                ? lang === 'es'
                                  ? 'Instalar plugin'
                                  : 'Install plugin'
                                : lang === 'es'
                                  ? 'Solo disponible en la app de escritorio'
                                  : 'Desktop app only'
                            }
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                              !isElectron
                                ? 'cursor-not-allowed border border-border/50 bg-secondary/40 text-muted-foreground'
                                : 'bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 disabled:opacity-60'
                            }`}
                          >
                            {isInstalling ? (
                              <>
                                <span className="size-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                <span>{lang === 'es' ? 'Instalando…' : 'Installing…'}</span>
                              </>
                            ) : (
                              <>
                                <Download className="size-3" />
                                <span>
                                  {isElectron
                                    ? lang === 'es'
                                      ? 'Instalar'
                                      : 'Install'
                                    : lang === 'es'
                                      ? 'Solo escritorio'
                                      : 'Desktop only'}
                                </span>
                              </>
                            )}
                          </button>
                        ) : (
                          <>
                            {/* Enable / Disable toggle */}
                            <button
                              onClick={() => togglePlugin(plugin.id)}
                              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                                isEnabled
                                  ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
                              }`}
                            >
                              <span
                                className={`relative h-3 w-5 rounded-full transition-colors ${
                                  isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 size-2 rounded-full bg-primary-foreground transition-all ${
                                    isEnabled ? 'left-2.5' : 'left-0.5'
                                  }`}
                                />
                              </span>
                              <span>
                                {isEnabled
                                  ? lang === 'es'
                                    ? 'Activo'
                                    : 'Active'
                                  : lang === 'es'
                                    ? 'Inactivo'
                                    : 'Inactive'}
                              </span>
                            </button>

                            {/* Uninstall */}
                            <button
                              onClick={() => uninstallPlugin(plugin.id)}
                              title={lang === 'es' ? 'Desinstalar plugin' : 'Uninstall plugin'}
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </div>
  )
}
