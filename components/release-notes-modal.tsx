'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, X, Check, Flame, Wrench, Zap, Palette, Rocket, Info, AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'

export type LatestYmlData = {
  version: string
  releaseNotes?: string
  showReleaseModal?: boolean | string
}

export type ThemeConfig = {
  preset?: 'discord' | 'cyberpunk' | 'emerald' | 'sunset' | 'midnight'
  headerGradient?: string
  accentColor?: string
  btnBg?: string
  badgeBg?: string
  badgeText?: string
}

export function parseTheme(text: string): { theme: ThemeConfig; cleanNotes: string } {
  const match = text.match(/<!--\s*theme:\s*(\{[\s\S]*?\})\s*-->/)
  if (!match) return { theme: { preset: 'discord' }, cleanNotes: text }
  try {
    const theme = JSON.parse(match[1]) as ThemeConfig
    const cleanNotes = text.replace(match[0], '').trim()
    return { theme, cleanNotes }
  } catch {
    return { theme: { preset: 'discord' }, cleanNotes: text }
  }
}

export function parseYml(text: string): LatestYmlData {
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

export function triggerReleaseNotesModal(data?: LatestYmlData) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-release-notes-modal', { detail: { data } }))
  }
}

function BulletIcon({ line }: { line: string }) {
  if (line.includes('✨') || line.toLowerCase().includes('novedad')) return <Flame className="size-4 text-[#5865F2] shrink-0 mt-0.5" />
  if (line.includes('🐛') || line.toLowerCase().includes('fix') || line.toLowerCase().includes('error') || line.toLowerCase().includes('corrección')) return <Wrench className="size-4 text-emerald-400 shrink-0 mt-0.5" />
  if (line.includes('⚡') || line.toLowerCase().includes('rendimiento') || line.toLowerCase().includes('estabilidad')) return <Zap className="size-4 text-amber-400 shrink-0 mt-0.5" />
  if (line.includes('🎨') || line.toLowerCase().includes('ui') || line.toLowerCase().includes('diseño') || line.toLowerCase().includes('interfaz')) return <Palette className="size-4 text-purple-400 shrink-0 mt-0.5" />
  return <Rocket className="size-4 text-sky-400 shrink-0 mt-0.5" />
}

function renderFormattedBadgesAndText(text: string) {
  const parts = text.split(/(\[\w+\]|\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[12px] text-sky-300 border border-white/10">{part.slice(1, -1)}</code>
    }
    if (part.startsWith('[') && part.endsWith(']')) {
      const tag = part.slice(1, -1).toUpperCase()
      if (['NUEVO', 'NEW'].includes(tag)) {
        return <span key={i} className="mr-1.5 inline-flex items-center rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30 uppercase">NUEVO</span>
      }
      if (['FIX', 'CORRECCIÓN', 'CORRECCION'].includes(tag)) {
        return <span key={i} className="mr-1.5 inline-flex items-center rounded-md bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30 uppercase">FIX</span>
      }
      if (['MEJORA', 'PRO'].includes(tag)) {
        return <span key={i} className="mr-1.5 inline-flex items-center rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30 uppercase">MEJORA</span>
      }
      if (['UI', 'DISEÑO', 'DISENO'].includes(tag)) {
        return <span key={i} className="mr-1.5 inline-flex items-center rounded-md bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30 uppercase">UI</span>
      }
      return <span key={i} className="mr-1.5 inline-flex items-center rounded-md bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300 border border-sky-500/30 uppercase">{tag}</span>
    }
    return part
  })
}

export function FormattedMarkdownLine({ line, theme }: { line: string; theme: ThemeConfig }) {
  const trimmed = line.trim()
  if (!trimmed) return null

  // Callout boxes (> [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING])
  if (trimmed.startsWith('>')) {
    const content = trimmed.replace(/^>\s*/, '')
    if (content.includes('[!TIP]') || content.includes('[!SUCCESS]')) {
      return (
        <div className="flex items-start gap-3 rounded-r-xl border-l-4 border-emerald-500 bg-emerald-500/10 p-3.5 text-[13px] text-emerald-200">
          <Sparkles className="size-4 text-emerald-400 shrink-0 mt-0.5" />
          <span className="flex-1">{renderFormattedBadgesAndText(content.replace(/\[!(TIP|SUCCESS)\]\s*/, ''))}</span>
        </div>
      )
    }
    if (content.includes('[!IMPORTANT]') || content.includes('[!STAR]')) {
      return (
        <div className="flex items-start gap-3 rounded-r-xl border-l-4 border-amber-500 bg-amber-500/10 p-3.5 text-[13px] text-amber-200">
          <Flame className="size-4 text-amber-400 shrink-0 mt-0.5" />
          <span className="flex-1">{renderFormattedBadgesAndText(content.replace(/\[!(IMPORTANT|STAR)\]\s*/, ''))}</span>
        </div>
      )
    }
    if (content.includes('[!WARNING]') || content.includes('[!ALERT]')) {
      return (
        <div className="flex items-start gap-3 rounded-r-xl border-l-4 border-rose-500 bg-rose-500/10 p-3.5 text-[13px] text-rose-200">
          <AlertTriangle className="size-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="flex-1">{renderFormattedBadgesAndText(content.replace(/\[!(WARNING|ALERT)\]\s*/, ''))}</span>
        </div>
      )
    }
    return (
      <div className="flex items-start gap-3 rounded-r-xl border-l-4 border-[#5865F2] bg-[#5865F2]/10 p-3.5 text-[13px] text-blue-200">
        <Info className="size-4 text-[#7983f5] shrink-0 mt-0.5" />
        <span className="flex-1">{renderFormattedBadgesAndText(content.replace(/\[!NOTE\]\s*/, ''))}</span>
      </div>
    )
  }

  // Section Headers (## Heading)
  if (trimmed.startsWith('#')) {
    const cleanHeader = trimmed.replace(/^#+\s*/, '')
    const headerBorder = theme.preset === 'cyberpunk' ? 'border-fuchsia-500/30' : theme.preset === 'emerald' ? 'border-emerald-500/30' : 'border-[#5865F2]/30'
    return (
      <div className={`mt-4 mb-2 first:mt-0 flex items-center gap-2.5 rounded-xl bg-gradient-to-r ${theme.headerGradient || 'from-[#5865F2]/20 via-[#7983f5]/10 to-transparent'} p-3 border ${headerBorder} text-[14.5px] font-bold text-white shadow-sm`}>
        <Sparkles className="size-4 text-[#7983f5]" />
        <span>{renderFormattedBadgesAndText(cleanHeader)}</span>
      </div>
    )
  }

  // Bullet items (- item)
  if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
    const cleanBullet = trimmed.replace(/^[-*•]\s*/, '')
    return (
      <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3 text-[13.5px] leading-relaxed text-white/90 border border-white/5 shadow-sm transition-all hover:bg-white/[0.07]">
        <BulletIcon line={cleanBullet} />
        <span className="flex-1">{renderFormattedBadgesAndText(cleanBullet)}</span>
      </div>
    )
  }

  return (
    <p className="text-[13px] leading-relaxed text-white/85 px-1 py-0.5">
      {renderFormattedBadgesAndText(trimmed)}
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

    const openHandler = (e: CustomEvent) => {
      if (e.detail?.data) {
        setData(e.detail.data)
      } else if (!data) {
        checkReleaseNotes()
      }
      setOpen(true)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('open-release-notes-modal' as any, openHandler as any)
    }

    return () => {
      active = false
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-release-notes-modal' as any, openHandler as any)
      }
    }
  }, [])

  const handleDismiss = () => {
    if (data?.version) {
      localStorage.setItem(`seen-release-notes-v${data.version}`, 'true')
    }
    setOpen(false)
  }

  if (!open || !data) return null

  const { theme: customTheme, cleanNotes } = parseTheme(data.releaseNotes || '')

  const headerGradient = customTheme.headerGradient || (
    customTheme.preset === 'cyberpunk'
      ? 'from-fuchsia-600/35 via-pink-500/20 to-cyan-500/15'
      : customTheme.preset === 'emerald'
      ? 'from-emerald-600/35 via-teal-500/20 to-cyan-500/15'
      : customTheme.preset === 'sunset'
      ? 'from-amber-600/35 via-orange-500/20 to-purple-600/15'
      : customTheme.preset === 'midnight'
      ? 'from-purple-900/40 via-indigo-900/25 to-blue-900/15'
      : 'from-[#5865F2]/25 via-[#3b82f6]/10 to-transparent'
  )

  const btnStyle = customTheme.btnBg || (
    customTheme.preset === 'cyberpunk'
      ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 shadow-fuchsia-500/30'
      : customTheme.preset === 'emerald'
      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/30'
      : customTheme.preset === 'sunset'
      ? 'bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 shadow-amber-500/30'
      : customTheme.preset === 'midnight'
      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/30'
      : 'bg-[#5865F2] hover:bg-[#4752c4] shadow-[#5865F2]/25'
  )

  const lines = cleanNotes.split('\n').filter((l) => l.trim().length > 0)

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
            <div className={`relative border-b border-white/10 bg-gradient-to-br ${headerGradient} p-6`}>
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
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm ${btnStyle.split(' ')[0]}`}>
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
                <FormattedMarkdownLine key={idx} line={line} theme={customTheme} />
              ))}
            </div>

            {/* Footer action */}
            <div className="border-t border-white/10 bg-[#111214] p-4">
              <button
                onClick={handleDismiss}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-bold text-white shadow-lg transition-all active:scale-[0.98] ${btnStyle}`}
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
