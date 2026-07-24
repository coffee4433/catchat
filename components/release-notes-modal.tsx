'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, X, Check, Flame, Wrench, Zap, Palette, Rocket } from 'lucide-react'
import { useEffect, useState } from 'react'

type LatestYmlData = {
  version: string
  releaseNotes?: string
  showReleaseModal?: boolean | string
}

function parseYml(text: string): LatestYmlData {
  const result: LatestYmlData = { version: '' }
  const versionMatch = text.match(/^version:\s*['"]?([^'"\n\r]+)['"]?/m)
  if (versionMatch) result.version = versionMatch[1].trim()

  const modalMatch = text.match(/^showReleaseModal:\s*(true|false)/m)
  if (modalMatch) result.showReleaseModal = modalMatch[1] === 'true'

  const notesIndex = text.indexOf('releaseNotes:')
  if (notesIndex !== -1) {
    const rawNotes = text.slice(notesIndex + 'releaseNotes:'.length).trim()
    result.releaseNotes = rawNotes
      .replace(/^\|\s*/, '')
      .split('\n')
      .map((l) => l.replace(/^  /, ''))
      .join('\n')
      .trim()
  }

  return result
}

function BulletIcon({ line }: { line: string }) {
  if (line.includes('✨') || line.toLowerCase().includes('novedad')) return <Flame className="size-4 text-[#5865F2] shrink-0 mt-0.5" />
  if (line.includes('🐛') || line.toLowerCase().includes('fix') || line.toLowerCase().includes('error') || line.toLowerCase().includes('corrección')) return <Wrench className="size-4 text-emerald-400 shrink-0 mt-0.5" />
  if (line.includes('⚡') || line.toLowerCase().includes('rendimiento') || line.toLowerCase().includes('estabilidad')) return <Zap className="size-4 text-amber-400 shrink-0 mt-0.5" />
  if (line.includes('🎨') || line.toLowerCase().includes('ui') || line.toLowerCase().includes('diseño') || line.toLowerCase().includes('interfaz')) return <Palette className="size-4 text-purple-400 shrink-0 mt-0.5" />
  return <Rocket className="size-4 text-sky-400 shrink-0 mt-0.5" />
}

function renderMarkdownText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[12px] text-sky-300">{part.slice(1, -1)}</code>
    }
    return part
  })
}

function FormattedMarkdownLine({ line }: { line: string }) {
  const trimmed = line.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('#')) {
    const cleanHeader = trimmed.replace(/^#+\s*/, '')
    return (
      <div className="pt-3 pb-1 border-b border-white/10 first:pt-0">
        <h3 className="text-[14px] font-bold text-[#7983f5] flex items-center gap-2">
          {renderMarkdownText(cleanHeader)}
        </h3>
      </div>
    )
  }

  if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
    const cleanBullet = trimmed.replace(/^[-*•]\s*/, '')
    return (
      <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3 text-[13.5px] leading-relaxed text-white/90 border border-white/5 shadow-sm">
        <BulletIcon line={cleanBullet} />
        <span className="flex-1">{renderMarkdownText(cleanBullet)}</span>
      </div>
    )
  }

  return (
    <p className="text-[13px] leading-relaxed text-white/80 px-1">
      {renderMarkdownText(trimmed)}
    </p>
  )
}

export function ReleaseNotesModal() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<LatestYmlData | null>(null)

  useEffect(() => {
    let active = true

    async function checkReleaseNotes() {
      try {
        const res = await fetch('/updates/latest.yml?t=' + Date.now(), { cache: 'no-store' })
        if (!res.ok) return
        const text = await res.text()
        const parsed = parseYml(text)

        if (!parsed.version) return

        const showModal = parsed.showReleaseModal !== false && parsed.showReleaseModal !== 'false'
        const seenKey = `seen-release-notes-v${parsed.version}`
        const alreadySeen = typeof window !== 'undefined' && localStorage.getItem(seenKey) === 'true'

        if (active && showModal && !alreadySeen && parsed.releaseNotes) {
          setData(parsed)
          setOpen(true)
        }
      } catch {
        // Silently ignore if latest.yml fetch fails
      }
    }

    checkReleaseNotes()
    return () => {
      active = false
    }
  }, [])

  const handleDismiss = () => {
    if (data?.version) {
      localStorage.setItem(`seen-release-notes-v${data.version}`, 'true')
    }
    setOpen(false)
  }

  if (!open || !data) return null

  const lines = (data.releaseNotes || '')
    .split('\n')
    .filter((l) => l.trim().length > 0)

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#1e1f22] text-white shadow-2xl"
          >
            {/* Header section with gradient background */}
            <div className="relative border-b border-white/10 bg-gradient-to-br from-[#5865F2]/25 via-[#3b82f6]/10 to-transparent p-6">
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
              >
                <X className="size-4" />
              </button>

              <div className="flex items-center gap-3.5">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 p-2 shadow-inner ring-1 ring-white/20">
                  <img src="/icon.png" alt="CatChat Logo" className="size-10 object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#5865F2] px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                      <Sparkles className="size-3" /> Novedades
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/80">
                      v{data.version}
                    </span>
                  </div>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
                    ¡Mira lo nuevo en CatChat!
                  </h2>
                </div>
              </div>
            </div>

            {/* Release notes body */}
            <div className="max-h-[60vh] overflow-y-auto p-6 space-y-3">
              {lines.map((line, idx) => (
                <FormattedMarkdownLine key={idx} line={line} />
              ))}
            </div>

            {/* Footer action */}
            <div className="border-t border-white/10 bg-[#111214] p-4">
              <button
                onClick={handleDismiss}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5865F2] py-3 text-[14px] font-bold text-white shadow-lg shadow-[#5865F2]/25 transition-all hover:bg-[#4752c4] active:scale-[0.98]"
              >
                <Check className="size-4" /> ¡Entendido!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
