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
      className="flex h-full w-14 shrink-0 flex-col items-center gap-3 py-4 border-r border-border/20 select-none"
    >
      {/* Main CatChat Workspace Icon */}
      <button
        aria-label={t.catChatWorkspaceLabel}
        onClick={() => onSelectView?.('chat')}
        className={`flex size-10 items-center justify-center rounded-xl overflow-hidden transition-all ${
          !activeView || activeView === 'chat'
            ? 'bg-secondary shadow-md ring-2 ring-primary/60 scale-105'
            : 'bg-secondary/60 hover:bg-secondary hover:ring-1 hover:ring-border'
        }`}
      >
        <img src="/catchat.png" alt="CatChat Logo" className="w-full h-full object-contain p-0.5" />
      </button>

      <div className="w-6 h-[1px] bg-border/40 my-1" />

      {/* Dynamic Plugin Rail Tabs */}
      {pluginTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelectView?.(tab.id)}
          title={tab.label}
          aria-label={tab.label}
          className={`flex size-9 items-center justify-center rounded-xl transition-all ${
            activeView === tab.id
              ? 'bg-primary text-primary-foreground shadow-lg scale-105 ring-2 ring-primary/40'
              : 'bg-secondary/80 text-foreground/70 hover:scale-105 hover:bg-secondary hover:text-foreground'
          }`}
        >
          {tab.icon}
        </button>
      ))}
    </aside>
  )
}
