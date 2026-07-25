'use client'

import React, { useState } from 'react'
import {
  Boxes,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe,
  Code2,
  Radio,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'
import { usePlugins } from '@/lib/plugins/plugin-provider'

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

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-background/60 p-6 text-foreground space-y-6">
      {/* Hero Store Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-indigo-500/20 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black shadow-lg shadow-emerald-500/25">
              <Boxes className="size-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-foreground">CatChat Plugin Hub</h1>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10.5px] font-extrabold text-emerald-400">
                  Marketplace
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Descarga e instala plugins directamente desde GitHub Releases
              </p>
            </div>
          </div>

          <a
            href="https://github.com/coffee4433/catchat/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-2xl border border-border/60 bg-secondary/40 px-4 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-secondary hover:scale-105 active:scale-95"
          >
            <Globe className="size-4 text-emerald-400" />
            <span>GitHub Releases Hub</span>
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </a>
        </div>
      </div>

      {/* Search Bar & Categories */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar plugins disponibles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-border/60 bg-secondary/40 pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'media', label: 'Música & Audio' },
            { id: 'ai', label: 'IA & Bots' },
            { id: 'productivity', label: 'Productividad' },
            { id: 'utility', label: 'Utilidades & Juegos' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Plugins Grid */}
      {filteredPlugins.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-secondary/10 py-16 px-6 text-center space-y-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary/80 text-muted-foreground">
            <Boxes className="size-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">No hay plugins publicados en GitHub Releases</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Publica plugins (como CatMusic) utilizando la ventana de <span className="font-semibold text-emerald-400">Release Tool</span> de CatChat y aparecerán automáticamente aquí para todos los usuarios.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlugins.map((plugin) => {
          const isInstalled = isPluginInstalled(plugin.id)
          const isEnabled = isPluginEnabled(plugin.id)
          const isInstalling = installingPluginId === plugin.id
          const progress = installProgressMap[plugin.id] || 0

          return (
            <div
              key={plugin.id}
              className={`group relative flex flex-col justify-between rounded-3xl border p-5 transition-all backdrop-blur-xl ${
                isInstalled
                  ? 'border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20'
                  : 'border-border/60 bg-secondary/20 hover:border-emerald-500/40 hover:bg-secondary/40'
              }`}
            >
              <div className="space-y-3">
                {/* Header info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-400/20 text-emerald-400 font-extrabold ring-1 ring-emerald-500/30 shadow-md">
                      {plugin.id === 'cat-music' ? (
                        <Radio className="size-6 text-emerald-400" />
                      ) : plugin.id === 'cat-ai' ? (
                        <Sparkles className="size-6 text-emerald-400" />
                      ) : plugin.id === 'cat-canvas' ? (
                        <Zap className="size-6 text-emerald-400" />
                      ) : (
                        <Boxes className="size-6 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-foreground text-base">{plugin.name}</h3>
                        <span className="rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                          {plugin.version}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-muted-foreground">
                        Por <span className="font-semibold text-foreground">@{plugin.author}</span> • {plugin.downloads} descargas
                      </p>
                    </div>
                  </div>

                  {isInstalled && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      <span>Instalado</span>
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground/90 leading-relaxed">{plugin.description}</p>
              </div>

              {/* Progress bar if downloading */}
              {isInstalling && (
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-emerald-400">
                    <span>Descargando desde GitHub Release...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="mt-5 flex items-center justify-between pt-3 border-t border-border/30">
                <a
                  href={plugin.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Code2 className="size-3.5" />
                  <span>Ver código</span>
                </a>

                <div className="flex items-center gap-2">
                  {!isInstalled ? (
                    <button
                      onClick={() => installPlugin(plugin.id)}
                      disabled={isInstalling}
                      className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                      {isInstalling ? (
                        <>
                          <span className="size-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                          <span>Instalando...</span>
                        </>
                      ) : (
                        <>
                          <Download className="size-4" />
                          <span>Instalar Plugin</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      {/* Toggle Enable / Disable */}
                      <button
                        onClick={() => togglePlugin(plugin.id)}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                          isEnabled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        {isEnabled ? 'Activado' : 'Desactivado'}
                      </button>

                      {/* Uninstall Button */}
                      <button
                        onClick={() => uninstallPlugin(plugin.id)}
                        className="rounded-xl p-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                        title="Desinstalar Plugin"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
