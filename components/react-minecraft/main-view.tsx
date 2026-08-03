'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Square, Loader2, Package, Box } from 'lucide-react'
import { isElectronEnv } from '@/lib/plugins/plugin-provider'

type LogEntry = { stream: 'stdout' | 'stderr'; text: string }

type MinecraftApi = {
  installDeps: () => Promise<{ ok: boolean; installed?: boolean; error?: string }>
  start: () => Promise<{ ok: boolean; url?: string; error?: string; alreadyRunning?: boolean }>
  stop: () => Promise<{ ok: boolean }>
  status: () => Promise<{ running: boolean; url: string }>
  onStatus: (cb: (p: any) => void) => () => void
  onOutput: (cb: (p: { stream: string; chunk: string }) => void) => () => void
}

function getApi(): MinecraftApi | null {
  return typeof window !== 'undefined' ? (window as any).minecraftServer : null
}

export function MinecraftMainView({ user }: { user?: any; onOpenSettings?: () => void }) {
  const isElectron = isElectronEnv()
  const api = getApi()

  const [starting, setStarting] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [running, setRunning] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logsRef = useRef<LogEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  const appendLogs = useCallback((entries: LogEntry[]) => {
    const next = [...logsRef.current.slice(-200), ...entries]
    logsRef.current = next
    setLogs(next)
  }, [])

  // Subscribe to server events
  useEffect(() => {
    if (!api) return
    const offStatus = api.onStatus((p) => {
      if (p.running) {
        setRunning(true)
        setUrl(p.url || null)
        setStarting(false)
        setError(null)
      } else if (p.exited) {
        setRunning(false)
        setStarting(false)
      } else if (p.error) {
        setRunning(false)
        setStarting(false)
        setError(p.error)
      }
    })
    const offOutput = api.onOutput((p) => {
      appendLogs([{ stream: p.stream, text: p.chunk }])
    })
    return () => {
      offStatus()
      offOutput()
    }
  }, [api, appendLogs])

  // Check initial status on mount
  useEffect(() => {
    if (!api) return
    api.status().then((s) => {
      if (s.running) {
        setRunning(true)
        setUrl(s.url)
      }
    })
  }, [api])

  const handleInstall = async () => {
    if (!api) return
    setError(null)
    setInstalling(true)
    try {
      const res = await api.installDeps()
      if (!res.ok) {
        setError(res.error || 'Error al instalar dependencias')
      }
    } finally {
      setInstalling(false)
    }
  }

  const handleStart = async () => {
    if (!api) return
    setError(null)
    setStarting(true)
    try {
      const res = await api.start()
      if (res.ok && res.url) {
        setRunning(true)
        setUrl(res.url)
      } else if (!res.ok) {
        setError(res.error || 'Error al iniciar el servidor')
        setStarting(false)
      }
    } catch (e: any) {
      setError(e?.message || 'Error al iniciar el servidor')
      setStarting(false)
    }
  }

  const handleStop = async () => {
    if (!api) return
    setError(null)
    try {
      await api.stop()
      setRunning(false)
      setUrl(null)
    } catch (e: any) {
      setError(e?.message || 'Error al detener el servidor')
    }
  }

  if (!isElectron || !api) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-8">
        <div className="max-w-md text-center">
          <Box className="mx-auto mb-4 size-12 text-emerald-400" />
          <h2 className="mb-2 text-xl font-bold text-white">React Minecraft</h2>
          <p className="text-white/60">
            Este plugin solo está disponible en la app de escritorio de CatChat (Electron),
            ya que necesita arrancar un servidor local del juego.
          </p>
        </div>
      </div>
    )
  }

  if (running && url) {
    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-border/40 bg-black">
        <iframe
          src={url}
          title="React Minecraft"
          className="flex-1 border-0 bg-black"
          allow="fullscreen; pointer-lock; accelerometer; gyroscope"
        />
        <div className="flex items-center justify-between border-t border-white/10 bg-black/80 px-4 py-2">
          <span className="text-xs text-white/50">
            {user?.name || user?.email || 'Jugador'} &middot; WASD moverse, LShift correr, Espacio saltar, Click añadir bloque, Alt+Click quitar, 1-0 material
          </span>
          <button
            onClick={handleStop}
            className="flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/30"
          >
            <Square className="size-3.5" />
            Detener servidor
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-8">
      <div className="max-w-lg w-full text-center">
        <Box className="mx-auto mb-4 size-14 text-emerald-400" />
        <h2 className="mb-2 text-2xl font-bold text-white">React Minecraft</h2>
        <p className="mb-6 text-white/60">
          Clon de Minecraft en 3D (React Three Fiber + Three.js). El plugin levanta un servidor
          local propio instalado con <span className="font-mono text-emerald-300">pnpm</span>.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mb-4 flex items-center justify-center gap-3">
          <button
            onClick={handleInstall}
            disabled={installing || starting}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
          >
            {installing ? <Loader2 className="size-4 animate-spin" /> : <Package className="size-4" />}
            Instalar dependencias (pnpm)
          </button>
          <button
            onClick={handleStart}
            disabled={starting}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {starting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {starting ? 'Iniciando...' : 'Jugar'}
          </button>
        </div>

        {logs.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-black/60 p-3 text-left font-mono text-xs text-white/60">
            {logs.map((l, i) => (
              <div key={i} className={l.stream === 'stderr' ? 'text-amber-400/80' : ''}>
                {l.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
