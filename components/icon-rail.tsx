'use client'

import { useLanguage } from '@/lib/i18n'

export function IconRail() {
  const { t } = useLanguage()
  return (
    <aside
      aria-label={t.workspacesLabel}
      className="flex h-full w-14 shrink-0 flex-col items-center gap-3 py-4"
    >
      <button
        aria-label={t.catChatWorkspaceLabel}
        className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background text-lg font-bold shadow-sm transition-transform hover:scale-105 active:scale-95"
      >
        C
      </button>
    </aside>
  )
}
