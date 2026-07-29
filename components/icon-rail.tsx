'use client'

import React, { useState } from 'react'
import { useLanguage } from '@/lib/i18n'
import { usePlugins } from '@/lib/plugins/plugin-provider'

function pluginIconSrc(id: string) {
  if (id === 'cat-music') return '/catmusic.png'
  if (id === 'polimarket') return '/polymarket-icon.png'
  return `/plugins/${id}/icon.png`
}

function PluginRailIcon({
  id,
  label,
  fallback,
}: {
  id: string
  label: string
  fallback: React.ReactNode
}) {
  const [imgFailed, setImgFailed] = useState(false)

  if (imgFailed) {
    return <span className="flex h-full w-full items-center justify-center">{fallback}</span>
  }

  return (
    <img
      src={pluginIconSrc(id)}
      alt={label}
      className="h-full w-full object-cover"
      onError={() => setImgFailed(true)}
    />
  )
}

export function IconRail({
  activeView,
  onSelectView,
}: {
  activeView?: string
  onSelectView?: (viewId: string) => void
}) {
  const { t } = useLanguage()
  const { getActiveRailTabs } = usePlugins()

  const pluginTabs = getActiveRailTabs()

  return (
    <aside
      aria-label={t.workspacesLabel}
      className="flex h-full w-14 shrink-0 flex-col items-center gap-3 py-4 select-none"
    >
      <button
        aria-label={t.catChatWorkspaceLabel}
        onClick={() => onSelectView?.('chat')}
        className={`flex size-10 shrink-0 items-center justify-center overflow-hidden transition-all ${
          !activeView || activeView === 'chat'
            ? 'scale-105 opacity-100'
            : 'opacity-70 hover:opacity-100 hover:scale-105'
        }`}
      >
        <img src="/catchat.png" alt="CatChat Logo" className="h-full w-full object-cover" />
      </button>

      <div className="my-1 h-[1px] w-6 bg-border/40" />

      {pluginTabs.map((tab) => {
        const isSelected = activeView === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onSelectView?.(tab.id)}
            title={tab.label}
            aria-label={tab.label}
            className={`flex size-10 shrink-0 items-center justify-center overflow-hidden transition-all ${
              isSelected
                ? 'scale-105 opacity-100'
                : 'opacity-70 hover:opacity-100 hover:scale-105'
            }`}
          >
            <PluginRailIcon id={tab.id} label={tab.label} fallback={tab.icon} />
          </button>
        )
      })}
    </aside>
  )
}
