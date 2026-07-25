'use client'

import React, { useState } from 'react'
import {
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Code2,
  Command,
  Download,
  Globe,
  Layers,
  PackageOpen,
  Radio,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'
import { isElectronEnv, usePlugins } from '@/lib/plugins/plugin-provider'

export type StorePluginItem = {
  id: string
  name: string
  description: string
  version: string
  author: string
  category: 'media' | 'productivity' | 'utility' | 'ai'
  downloads: string
  rating: number
  githubUrl: string
  iconName: string
  verified: boolean
}

export const AVAILABLE_HUB_PLUGINS: StorePluginItem[] = []

const CATEGORIES = [
  { id: 'all', label: 'Todos', icon: Layers },
  { id: 'media', label: 'Media', icon: Radio },
  { id: 'ai', label: 'IA & Bots', icon: Sparkles },
  { id: 'productivity', label: 'Productividad', icon: Zap },
  { id: 'utility', label: 'Utilidades', icon: Command },
] as const

const PLUGIN_GRADIENTS = [
  'from-violet-500 via-purple-500 to-fuchsia-500',
  'from-cyan-400 via-sky-500 to-blue-600',
  'from-amber-400 via-orange-500 to-rose-500',
  'from-emerald-400 via-teal-500 to-cyan-600',
  'from-pink-500 via-rose-500 to-red-500',
]

function getGradient(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return PLUGIN_GRADIENTS[hash % PLUGIN_GRADIENTS.length]
}

function PluginIcon({ id, className }: { id: string; className?: string }) {
  if (id === 'cat-music') return <Radio className={className} />
  if (id === 'cat-ai') return <Sparkles className={className} />
  if (id === 'cat-canvas') return <Zap className={className} />
  return <Boxes className={className} />
}

export function PluginHubView({ onClose }: { onClose?: () => void }) {
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
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 size-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 size-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 size-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative flex h-full w-full flex-col overflow-y-auto p-6 md:p-8 space-y-8">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="pt-4 text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-400">
              <Sparkles className="size-3" />
              Extensión sin límites
            </div>
            <h2 className="mx-auto max-w-xl bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
              Potencia tu experiencia
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Instala plugins directamente desde GitHub Releases y transforma CatChat en tu centro de mando.
            </p>

            {/* Search */}
            <div className="group relative mx-auto mt-7 max-w-md">
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-violet-500/40 via-fuchsia-500/40 to-cyan-500/40 opacity-0 blur transition-opacity duration-300 group-focus-within:opacity-100" />
              <div className="relative flex items-center rounded-2xl border border-border/60 bg-secondary/50 backdrop-blur-xl transition-colors focus-within:border-border">
                <Search className="ml-4 size-4 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar plugins, autores, categorías..."
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
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const active = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
                      active
                        ? 'bg-foreground text-background shadow-md'
                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                    }`}
                  >
                    <Icon className="size-3.5" />
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </section>

          {/* ── Plugin grid ──────────────────────────────────── */}
          {filteredPlugins.length === 0 ? (
            <section className="flex flex-col items-center py-10 text-center">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-violet-500/10 blur-2xl" />
                <div className="relative flex size-20 items-center justify-center rounded-3xl border border-border/60 bg-secondary/30">
                  <PackageOpen className="size-9 text-muted-foreground" />
                </div>
              </div>
              <h3 className="mt-6 text-lg font-bold">Aún no hay plugins por aquí</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Publica plugins (como CatMusic) desde la{' '}
                <span className="font-semibold text-violet-400">Release Tool</span> de CatChat y
                aparecerán aquí automáticamente para todos los usuarios.
              </p>
            </section>
          ) : (
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredPlugins.map((plugin) => {
                const isInstalled = isPluginInstalled(plugin.id)
                const isEnabled = isPluginEnabled(plugin.id)
                const isInstalling = installingPluginId === plugin.id
                const progress = installProgressMap[plugin.id] || 0
                const gradient = getGradient(plugin.id)

                return (
                  <article
                    key={plugin.id}
                    className="group relative overflow-hidden rounded-3xl border border-border/50 bg-secondary/20 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:bg-secondary/30 hover:shadow-2xl hover:shadow-black/20"
                  >
                    {/* Gradient top accent */}
                    <div className={`h-1 w-full bg-gradient-to-r ${gradient} opacity-60`} />

                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3`}
                          >
                            <PluginIcon id={plugin.id} className="size-6" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-[15px] font-bold tracking-tight">
                                {plugin.name}
                              </h3>
                              {plugin.verified && (
                                <CheckCircle2 className="size-3.5 shrink-0 text-sky-400" />
                              )}
                            </div>
                            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                              @{plugin.author}
                              <span className="mx-1.5 text-border">•</span>
                              {plugin.downloads} descargas
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 rounded-md border border-border/50 bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          v{plugin.version}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="mt-4 line-clamp-2 min-h-9 text-[12.5px] leading-relaxed text-muted-foreground">
                        {plugin.description}
                      </p>

                      {/* Install progress */}
                      {isInstalling && (
                        <div className="mt-4 space-y-2 rounded-2xl border border-border/40 bg-background/40 p-3">
                          <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <span className="size-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                              Descargando desde GitHub…
                            </span>
                            <span className="tabular-nums text-foreground">{progress}%</span>
                          </div>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-300`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/30 pt-4">
                        <a
                          href={plugin.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Code2 className="size-3.5" />
                          Código fuente
                          <ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        </a>

                        <div className="flex items-center gap-2">
                          {!isInstalled ? (
                            <button
                              onClick={() => isElectron && installPlugin(plugin.id)}
                              disabled={!isElectron || isInstalling}
                              title={
                                isElectron
                                  ? 'Instalar plugin'
                                  : 'Solo disponible en la app de escritorio'
                              }
                              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
                                !isElectron
                                  ? 'cursor-not-allowed border border-border/50 bg-secondary/40 text-muted-foreground'
                                  : `bg-gradient-to-r ${gradient} text-white shadow-lg hover:scale-[1.03] hover:shadow-xl active:scale-95 disabled:opacity-60`
                              }`}
                            >
                              {isInstalling ? (
                                <>
                                  <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  Instalando…
                                </>
                              ) : (
                                <>
                                  <Download className="size-3.5" />
                                  {isElectron ? 'Instalar' : 'Solo escritorio'}
                                </>
                              )}
                            </button>
                          ) : (
                            <>
                              {/* Enable / Disable toggle */}
                              <button
                                onClick={() => togglePlugin(plugin.id)}
                                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 ${
                                  isEnabled
                                    ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                                    : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
                                }`}
                              >
                                <span
                                  className={`relative h-3.5 w-6 rounded-full transition-colors ${
                                    isEnabled ? 'bg-emerald-400' : 'bg-muted-foreground/30'
                                  }`}
                                >
                                  <span
                                    className={`absolute top-0.5 size-2.5 rounded-full bg-white transition-all ${
                                      isEnabled ? 'left-3' : 'left-0.5'
                                    }`}
                                  />
                                </span>
                                {isEnabled ? 'Activo' : 'Inactivo'}
                              </button>

                              {/* Uninstall */}
                              <button
                                onClick={() => uninstallPlugin(plugin.id)}
                                title="Desinstalar plugin"
                                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                              >
                                <Trash2 className="size-4" />
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
