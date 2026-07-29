'use client'

import { useLanguage } from '@/lib/i18n'

export default function Loading() {
  const { t } = useLanguage()

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-foreground/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{t.loading}</p>
      </div>
    </div>
  )
}
