'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Monitor, AppWindow, MonitorUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

interface ScreenSource {
  id: string
  name: string
  thumbnail: string
}

export function ScreenPicker() {
  const [open, setOpen] = useState(false)
  const [sources, setSources] = useState<ScreenSource[]>([])
  const [tab, setTab] = useState<'screens' | 'windows'>('screens')
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const api = (window as any).screenShare as
      | { onSources: (cb: (s: ScreenSource[]) => void) => () => void; select: (id: string | null) => Promise<void> }
      | undefined

    if (!api) return

    const unsub = api.onSources((s: ScreenSource[]) => {
      console.log('[ScreenPicker] sources received:', s.length)
      setSources(s)
      setSelected(null)
      setTab('screens')
      setOpen(true)
    })
    return () => unsub()
  }, [])

  const screens = useMemo(() => sources.filter((s) => s.id.startsWith('screen')), [sources])
  const windows = useMemo(() => sources.filter((s) => !s.id.startsWith('screen')), [sources])
  const visibleSources = tab === 'screens' ? screens : windows

  const handleShare = async () => {
    if (!selected) return
    const api = (window as any).screenShare
    if (api) await api.select(selected)
    setOpen(false)
    setSources([])
    setSelected(null)
  }

  const handleCancel = () => {
    const api = (window as any).screenShare
    if (api) api.select(null).catch(() => {})
    setOpen(false)
    setSources([])
    setSelected(null)
  }

  const isElectron = typeof window !== 'undefined' && 'screenShare' in window
  if (!isElectron) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={handleCancel}
        >
          <motion.div
            initial={{ scale: 0.94, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111214] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#23a55a]/15 text-[#23a55a]">
                  <MonitorUp className="size-4.5" />
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold text-white">Compartir pantalla</h2>
                  <p className="text-[12px] text-white/40">Elige qué quieres compartir en la llamada</p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                aria-label="Cerrar"
                className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4">
              <button
                onClick={() => setTab('screens')}
                className={`relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  tab === 'screens' ? 'text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab === 'screens' && (
                  <motion.span
                    layoutId="screen-picker-tab"
                    className="absolute inset-0 rounded-lg bg-white/10"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Monitor className="relative size-4" />
                <span className="relative">Pantallas</span>
                <span className="relative rounded-full bg-white/10 px-1.5 py-px text-[10px] text-white/50">
                  {screens.length}
                </span>
              </button>
              <button
                onClick={() => setTab('windows')}
                className={`relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  tab === 'windows' ? 'text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab === 'windows' && (
                  <motion.span
                    layoutId="screen-picker-tab"
                    className="absolute inset-0 rounded-lg bg-white/10"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <AppWindow className="relative size-4" />
                <span className="relative">Aplicaciones</span>
                <span className="relative rounded-full bg-white/10 px-1.5 py-px text-[10px] text-white/50">
                  {windows.length}
                </span>
              </button>
            </div>

            {/* Grid */}
            <div className="thin-scroll grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-6 sm:grid-cols-3">
              {sources.length === 0 && (
                <p className="col-span-full py-10 text-center text-sm text-white/40">Cargando fuentes...</p>
              )}
              {sources.length > 0 && visibleSources.length === 0 && (
                <p className="col-span-full py-10 text-center text-sm text-white/40">
                  {tab === 'screens' ? 'No hay pantallas disponibles' : 'No hay ventanas disponibles'}
                </p>
              )}
              {visibleSources.map((source, i) => {
                const isSelected = selected === source.id
                return (
                  <motion.button
                    key={source.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.25, ease: 'easeOut' }}
                    onClick={() => setSelected(source.id)}
                    onDoubleClick={handleShare}
                    className={`group flex flex-col gap-2 rounded-xl border-2 p-2 text-left transition-all ${
                      isSelected
                        ? 'border-[#23a55a] bg-[#23a55a]/10'
                        : 'border-transparent bg-white/[0.04] hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="relative w-full overflow-hidden rounded-lg bg-black/50" style={{ aspectRatio: '16/10' }}>
                      {source.thumbnail ? (
                        <img
                          src={source.thumbnail || '/placeholder.svg'}
                          alt={source.name}
                          className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-white/20">
                          {tab === 'screens' ? <Monitor className="size-8" /> : <AppWindow className="size-8" />}
                        </div>
                      )}
                      {isSelected && (
                        <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-[#23a55a] text-white">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="size-3">
                            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <span className={`truncate px-1 text-[12px] font-medium ${isSelected ? 'text-white' : 'text-white/60'}`}>
                      {source.name}
                    </span>
                  </motion.button>
                )
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-white/[0.06] px-6 py-4">
              <button
                onClick={handleCancel}
                className="rounded-lg px-4 py-2 text-[13px] font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleShare}
                disabled={!selected}
                className="rounded-lg bg-[#23a55a] px-5 py-2 text-[13px] font-semibold text-white shadow-lg transition-all hover:bg-[#1a8045] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Compartir
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
