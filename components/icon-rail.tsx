'use client'

import { useLanguage } from '@/lib/i18n'
import { usePlugins } from '@/lib/plugins/plugin-provider'

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
      {/* Main CatChat Workspace Icon */}
      <button
        aria-label={t.catChatWorkspaceLabel}
        onClick={() => onSelectView?.('chat')}
        className={`flex size-10 shrink-0 items-center justify-center overflow-hidden transition-all ${
          !activeView || activeView === 'chat'
            ? 'scale-105 opacity-100'
            : 'opacity-70 hover:opacity-100 hover:scale-105'
        }`}
      >
        <img src="/catchat.png" alt="CatChat Logo" className="w-full h-full object-cover" />
      </button>

      <div className="w-6 h-[1px] bg-border/40 my-1" />

      {/* Dynamic Plugin Rail Tabs */}
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
            {tab.id === 'cat-music' ? (
              <img src="/catmusic.png" alt={tab.label} className="w-full h-full object-cover" />
            ) : (
              tab.icon
            )}
          </button>
        )
      })}
    </aside>
  )
}
