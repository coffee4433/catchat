'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  Check,
  Download,
  Globe,
  Keyboard,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  Moon,
  Palette,
  Shield,
  Sun,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  changePassword,
  deleteAccount as deleteAccountAction,
  exportUserData,
  updateProfile,
  uploadProfileImage,
} from '@/app/actions/chat'
import { authClient } from '@/lib/auth-client'
import { themes } from '@/lib/themes'
import { useLanguage } from '@/lib/i18n'
import { usePrefs } from '@/hooks/use-prefs'

type AppUser = { id: string; name: string; email: string; image?: string | null; banner?: string | null }

type Section = 'profile' | 'appearance' | 'chat' | 'notifications' | 'privacy' | 'language' | 'account'

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function SettingsModal({
  open,
  onClose,
  theme,
  onThemeChange,
  user,
}: {
  open: boolean
  onClose: () => void
  theme: string
  onThemeChange: (id: string) => void
  user: AppUser
}) {
  const { t } = useLanguage()
  const [active, setActive] = useState<Section>('profile')
  const [sidebarSearch, setSidebarSearch] = useState('')

  // Grouped navigation sections matching Discord's structure
  const generalSections: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: t.profileSection, icon: <UserIcon className="size-5" /> },
    { id: 'privacy', label: t.privacySection, icon: <Lock className="size-5" /> },
    { id: 'notifications', label: t.notificationsSection, icon: <Bell className="size-5" /> },
  ]

  const appSections: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'appearance', label: t.appearanceSection, icon: <Palette className="size-5" /> },
    { id: 'chat', label: t.chatSection, icon: <MessageCircle className="size-5" /> },
    { id: 'language', label: t.languageSection, icon: <Globe className="size-5" /> },
    { id: 'account', label: t.accountSection, icon: <Shield className="size-5" /> },
  ]

  const allSections = [...generalSections, ...appSections]

  // Filter sections by search
  const filterSections = (sections: typeof generalSections) =>
    sidebarSearch.trim()
      ? sections.filter((s) => s.label.toLowerCase().includes(sidebarSearch.toLowerCase()))
      : sections

  useEffect(() => {
    if (!open) return
    setActive('profile')
    setSidebarSearch('')
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t.settingsModalTitle}
        >
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-label={t.settingsModalCloseLabel}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            className="relative flex h-[90dvh] max-h-[820px] w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            {/* ── Discord-style Left nav ──────────── */}
            <nav className="hidden w-[252px] shrink-0 flex-col border-r border-border bg-background/50 sm:flex">
              {/* Profile card at top */}
              <div className="border-b border-border p-3">
                <button
                  onClick={() => setActive('profile')}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-secondary/60"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                    {user.image ? (
                      <img src={user.image} alt="" className="size-full object-cover" />
                    ) : (
                      initialsOf(user.name)
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-foreground">{user.name}</p>
                    <p className="truncate text-[12px] text-muted-foreground">{t.profileSection}</p>
                  </div>
                </button>
              </div>

              {/* Search bar */}
              <div className="px-3 py-2.5">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted-foreground">
                    <path d="M15.62 17.03a9 9 0 1 1 1.41-1.41l4.68 4.67a1 1 0 0 1-1.42 1.42l-4.67-4.68ZM17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                  </svg>
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder || 'Search'}
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

              {/* Scrollable nav */}
              <div className="thin-scroll flex-1 overflow-y-auto px-2 pb-3">
                {/* General section */}
                {filterSections(generalSections).length > 0 && (
                  <div className="mb-1">
                    <p className="px-2.5 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      General
                    </p>
                    {filterSections(generalSections).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setActive(s.id)}
                        aria-current={active === s.id}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors ${
                          active === s.id
                            ? 'bg-secondary font-semibold text-foreground'
                            : 'text-muted-foreground font-medium hover:bg-secondary/60 hover:text-foreground'
                        }`}
                      >
                        {s.icon}
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Divider */}
                {filterSections(generalSections).length > 0 && filterSections(appSections).length > 0 && (
                  <div className="mx-2.5 my-1.5 h-px bg-border" />
                )}

                {/* App Settings section */}
                {filterSections(appSections).length > 0 && (
                  <div className="mb-1">
                    <p className="px-2.5 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t.appearanceSection ? 'App Settings' : 'App Settings'}
                    </p>
                    {filterSections(appSections).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setActive(s.id)}
                        aria-current={active === s.id}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors ${
                          active === s.id
                            ? 'bg-secondary font-semibold text-foreground'
                            : 'text-muted-foreground font-medium hover:bg-secondary/60 hover:text-foreground'
                        }`}
                      >
                        {s.icon}
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </nav>

            {/* ── Content ────────────────────────── */}
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-sm font-semibold capitalize">
                  {allSections.find((s) => s.id === active)?.label}
                </h2>
                <button
                  onClick={onClose}
                  aria-label={t.settingsModalCloseLabel}
                  className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </header>

              {/* Mobile section tabs */}
              <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 sm:hidden">
                {allSections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    aria-current={active === s.id}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-[13.5px] transition-colors ${
                      active === s.id
                        ? 'bg-secondary font-semibold text-foreground'
                        : 'text-muted-foreground font-medium hover:bg-secondary/60 hover:text-foreground'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="thin-scroll flex-1 overflow-y-auto px-5 py-5">
                {active === 'profile' && <ProfileSection user={user} onClose={onClose} />}
                {active === 'appearance' && (
                  <AppearanceSection theme={theme} onThemeChange={onThemeChange} />
                )}
                {active === 'chat' && <ChatSection />}
                {active === 'notifications' && <NotificationsSection />}
                {active === 'privacy' && <PrivacySection />}
                {active === 'language' && <LanguageSection />}
                {active === 'account' && <AccountSection user={user} />}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/* --- Sections ---------------------------------------------------------------- */

function ProfileSection({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [name, setName] = useState(user.name)
  const [image, setImage] = useState(user.image ?? '')
  const [banner, setBanner] = useState(user.banner ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const dirty = name.trim() !== user.name

  function compressImage(file: File, maxDim: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.onerror = reject
      img.src = url
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen no puede superar los 10MB')
      return
    }

    setUploading(type)
    setError(null)

    try {
      const maxDim = type === 'avatar' ? 512 : 1024
      const base64 = await compressImage(file, maxDim)

      const url = await uploadProfileImage(base64, type)

      if (type === 'avatar') {
        setImage(url)
      } else {
        setBanner(url)
      }

      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : t.saveError)
    } finally {
      setUploading(null)
    }
  }

  const handleSave = async () => {
    if (!dirty || saving) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await updateProfile({ name })
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : t.saveError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg space-y-5">
      {/* Banner */}
      <div>
        <p className="mb-1.5 text-[13.5px] font-semibold">{t.bannerLabel}</p>
        <div
          className="relative h-32 w-full cursor-pointer overflow-hidden rounded-xl bg-secondary"
          onClick={() => bannerInputRef.current?.click()}
        >
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={banner} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-[13px] text-muted-foreground">
              {t.bannerHint}
            </div>
          )}
          {uploading === 'banner' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
              <Loader2 className="size-5 animate-spin text-white" />
            </div>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'banner')}
          />
        </div>
      </div>

      {/* Avatar + name row */}
      <div className="flex items-center gap-4">
        <div className="relative cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
          <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-lg font-semibold text-muted-foreground">
            {(image) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image || '/placeholder.svg'} alt="" className="size-16 rounded-full object-cover" />
            ) : (
              initialsOf(name || user.name)
            )}
          </span>
          {uploading === 'avatar' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <Loader2 className="size-5 animate-spin text-white" />
            </div>
          )}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'avatar')}
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name || user.name}</p>
          <p className="truncate text-[12px] text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Field label={t.fullName}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </Field>

      <Field label={t.emailAddress} hint={t.emailNotChangeable}>
        <input
          value={user.email}
          disabled
          className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-[13px] text-muted-foreground outline-none"
        />
      </Field>

      {error ? <p className="text-[12px] text-destructive">{error}</p> : null}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-[13.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : saved ? <Check className="size-3.5" /> : null}
          {saved ? t.saved : t.saveBtn}
        </button>
        <button
          onClick={onClose}
          className="rounded-lg px-3.5 py-2 text-[13.5px] font-semibold text-muted-foreground transition-colors hover:bg-secondary"
        >
          {t.cancelBtn}
        </button>
      </div>
    </div>
  )
}

function AppearanceSection({
  theme,
  onThemeChange,
}: {
  theme: string
  onThemeChange: (id: string) => void
}) {
  const { t } = useLanguage()
  const lightThemes = themes.filter((t) => !t.dark)
  const darkThemes = themes.filter((t) => t.dark)
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Sun className="size-3.5 text-muted-foreground" />
          <h3 className="text-[12px] font-semibold text-muted-foreground">
            {t.lightThemes}
          </h3>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {lightThemes.map((t) => (
            <ThemeTile key={t.id} t={t} selected={theme === t.id} onSelect={onThemeChange} />
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <Moon className="size-3.5 text-muted-foreground" />
          <h3 className="text-[12px] font-semibold text-muted-foreground">
            {t.darkThemes}
          </h3>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {darkThemes.map((t) => (
            <ThemeTile key={t.id} t={t} selected={theme === t.id} onSelect={onThemeChange} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ChatSection() {
  const { t } = useLanguage()
  const [prefs, update] = usePrefs()
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <SectionTitle icon={<MessageCircle className="size-3.5" />}>{t.chatSettingsTitle}</SectionTitle>
        <div className="mt-2 divide-y divide-border">
          <Toggle
            label={t.enterToSend}
            hint={t.enterToSendHint}
            checked={prefs.enterToSend}
            onChange={(v) => update({ enterToSend: v })}
          />
          <Toggle
            label={t.showTimestamps}
            hint={t.showTimestampsHint}
            checked={prefs.showTimestamps}
            onChange={(v) => update({ showTimestamps: v })}
          />
        </div>
      </div>

      <div>
        <SectionTitle icon={<Keyboard className="size-3.5" />}>{t.chatAppearance}</SectionTitle>
        <div className="mt-3 space-y-4">
          <Field label={t.fontSizeLabel}>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => update({ fontSize: size })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-center text-[13px] transition-all ${
                    prefs.fontSize === size
                      ? 'border-ring bg-secondary font-medium text-foreground ring-2 ring-ring/30'
                      : 'border-border text-muted-foreground hover:border-ring/40 hover:bg-secondary/50'
                  }`}
                >
                  {size === 'small' ? t.fontSizeSmall : size === 'medium' ? t.fontSizeMedium : t.fontSizeLarge}
                </button>
              ))}
            </div>
          </Field>

          <Field label={t.densityLabel}>
            <div className="flex gap-2">
              {(['compact', 'normal', 'spacious'] as const).map((density) => (
                <button
                  key={density}
                  onClick={() => update({ chatDensity: density })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-center text-[13px] transition-all ${
                    prefs.chatDensity === density
                      ? 'border-ring bg-secondary font-medium text-foreground ring-2 ring-ring/30'
                      : 'border-border text-muted-foreground hover:border-ring/40 hover:bg-secondary/50'
                  }`}
                >
                  {density === 'compact' ? t.densityCompact : density === 'normal' ? t.densityNormal : t.densitySpacious}
                </button>
              ))}
            </div>
          </Field>

          <Field label={t.timeFormatLabel}>
            <div className="flex gap-2">
              {(['12h', '24h'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => update({ timeFormat: format })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-center text-[13px] transition-all ${
                    prefs.timeFormat === format
                      ? 'border-ring bg-secondary font-medium text-foreground ring-2 ring-ring/30'
                      : 'border-border text-muted-foreground hover:border-ring/40 hover:bg-secondary/50'
                  }`}
                >
                  {format === '12h' ? t.timeFormat12h : t.timeFormat24h}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </div>
    </div>
  )
}

function NotificationsSection() {
  const { t, lang } = useLanguage()
  const [prefs, update] = usePrefs()
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <SectionTitle icon={<Bell className="size-3.5" />}>{t.generalNotifs}</SectionTitle>
        <div className="mt-2 divide-y divide-border">
          <Toggle
            label={t.desktopNotifs}
            hint={t.desktopNotifsHint}
            checked={prefs.desktopNotifications}
            onChange={(v) => update({ desktopNotifications: v })}
          />
          <Toggle
            label={t.soundNotifs}
            hint={t.soundNotifsHint}
            checked={prefs.messageSounds}
            onChange={(v) => update({ messageSounds: v })}
          />
          <Toggle
            label={t.newContactNotifs}
            hint={t.newContactNotifsHint}
            checked={prefs.newContactNotifications}
            onChange={(v) => update({ newContactNotifications: v })}
          />
        </div>
      </div>

      <div>
        <SectionTitle>{t.muteNotifs}</SectionTitle>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {t.muteNotifsHint}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { label: t.mute1h, value: '1h' },
            { label: t.mute8h, value: '8h' },
            { label: t.mute24h, value: '24h' },
            { label: t.unmute, value: null },
          ].map((opt) => (
            <button
              key={opt.value ?? 'off'}
              onClick={() => {
                if (opt.value === null) {
                  update({ muteUntil: null })
                } else {
                  const hours = parseInt(opt.value)
                  const until = new Date(Date.now() + hours * 3600000).toISOString()
                  update({ muteUntil: until })
                }
              }}
              className={`rounded-lg border px-3 py-1.5 text-[13px] transition-all ${
                (opt.value === null && !prefs.muteUntil) ||
                (opt.value !== null && prefs.muteUntil)
                  ? opt.value === null && !prefs.muteUntil
                    ? 'border-ring bg-secondary font-medium text-foreground ring-2 ring-ring/30'
                    : 'border-border text-muted-foreground hover:border-ring/40 hover:bg-secondary/50'
                  : 'border-border text-muted-foreground hover:border-ring/40 hover:bg-secondary/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {prefs.muteUntil && new Date(prefs.muteUntil) > new Date() && (
          <p className="mt-2 text-[12px] text-muted-foreground">
            {t.mutedUntil}{' '}
            {new Date(prefs.muteUntil).toLocaleString(lang === 'es' ? 'es' : 'en', {
              hour: '2-digit',
              minute: '2-digit',
              day: 'numeric',
              month: 'short',
            })}
          </p>
        )}
      </div>
    </div>
  )
}

function PrivacySection() {
  const { t } = useLanguage()
  const [prefs, update] = usePrefs()
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <SectionTitle icon={<Lock className="size-3.5" />}>{t.visibility}</SectionTitle>
        <div className="mt-2 divide-y divide-border">
          <Toggle
            label={t.showOnlineStatus}
            hint={t.showOnlineStatusHint}
            checked={prefs.showOnlineStatus}
            onChange={(v) => update({ showOnlineStatus: v })}
          />
          <Toggle
            label={t.hideLastSeen}
            hint={t.hideLastSeenHint}
            checked={prefs.hideLastSeen}
            onChange={(v) => update({ hideLastSeen: v })}
          />
          <Toggle
            label={t.readReceipts}
            hint={t.readReceiptsHint}
            checked={prefs.readReceipts}
            onChange={(v) => update({ readReceipts: v })}
          />
        </div>
      </div>

      <div>
        <SectionTitle icon={<Shield className="size-3.5" />}>{t.messageControl}</SectionTitle>
        <div className="mt-3">
          <Field label={t.whoCanMessage}>
            <div className="flex gap-2">
              {(['everyone', 'contacts'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => update({ whoCanMessage: option })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-center text-[13px] transition-all ${
                    prefs.whoCanMessage === option
                      ? 'border-ring bg-secondary font-medium text-foreground ring-2 ring-ring/30'
                      : 'border-border text-muted-foreground hover:border-ring/40 hover:bg-secondary/50'
                  }`}
                >
                  {option === 'everyone' ? t.everyone : t.onlyContacts}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </div>
    </div>
  )
}

function LanguageSection() {
  const { t } = useLanguage()
  const [prefs, update] = usePrefs()

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
  ]

  const timezones = [
    'Europe/Madrid',
    'Europe/London',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Mexico_City',
    'America/Bogota',
    'America/Buenos_Aires',
    'America/Sao_Paulo',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ]

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <SectionTitle icon={<Globe className="size-3.5" />}>{t.appLangTitle}</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => update({ language: lang.code })}
              className={`rounded-lg border px-3 py-2.5 text-left text-[13px] transition-all ${
                prefs.language === lang.code
                  ? 'border-ring bg-secondary font-medium text-foreground ring-2 ring-ring/30'
                  : 'border-border text-muted-foreground hover:border-ring/40 hover:bg-secondary/50'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>{t.timezoneLabel}</SectionTitle>
        <div className="mt-3">
          <select
            value={prefs.timezone}
            onChange={(e) => update({ timezone: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {t.detectedTimezone} {Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')}
          </p>
        </div>
      </div>
    </div>
  )
}

function AccountSection({ user }: { user: AppUser }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  // Change password state
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdChanging, setPwdChanging] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Export state
  const [exporting, setExporting] = useState(false)

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    await authClient.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  const handleChangePassword = async () => {
    if (pwdChanging) return
    setPwdError(null)
    setPwdSuccess(false)

    if (!currentPwd) return setPwdError(t.passwordRequiredError)
    if (newPwd.length < 6) return setPwdError(t.passwordLengthError)
    if (newPwd !== confirmPwd) return setPwdError(t.passwordsNoMatch)

    setPwdChanging(true)
    try {
      await changePassword(currentPwd, newPwd)
      setPwdSuccess(true)
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
      setTimeout(() => setPwdSuccess(false), 3000)
    } catch (e) {
      setPwdError(e instanceof Error ? e.message : t.passwordChangeError)
    } finally {
      setPwdChanging(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleting) return
    if (deleteConfirm !== 'ELIMINAR') {
      setDeleteError(t.deleteConfirmError)
      return
    }
    setDeleteError(null)
    setDeleting(true)
    try {
      await deleteAccountAction()
      await authClient.signOut()
      router.push('/sign-in')
      router.refresh()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t.accountDeleteError)
      setDeleting(false)
    }
  }

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const data = await exportUserData()
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently fail
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Session info */}
      <div className="rounded-xl border border-border p-4">
        <p className="text-[13.5px] font-semibold">{t.accountTitle}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{user.email}</p>
      </div>

      {/* Change password */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-muted-foreground" />
          <p className="text-[13.5px] font-semibold">{t.changePassword}</p>
        </div>
        <div className="mt-3 space-y-3">
          <input
            type="password"
            value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)}
            placeholder={t.currentPassword}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <input
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder={t.minPasswordHint}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <input
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            placeholder={t.confirmNewPassword}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          {pwdError && <p className="text-[12px] text-destructive">{pwdError}</p>}
          {pwdSuccess && (
            <p className="flex items-center gap-1.5 text-[12px] text-success">
              <Check className="size-3.5" /> {t.passwordUpdated}
            </p>
          )}
          <button
            onClick={handleChangePassword}
            disabled={pwdChanging}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-[13.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pwdChanging && <Loader2 className="size-3.5 animate-spin" />}
            {t.changePwdBtn}
          </button>
        </div>
      </div>

      {/* Export data */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-2">
          <Download className="size-4 text-muted-foreground" />
          <p className="text-[13.5px] font-semibold">{t.exportData}</p>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {t.exportDataDesc}
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3.5 py-2 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
        >
          {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          {exporting ? t.exporting : t.exportBtn}
        </button>
      </div>

      {/* Sign out */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-2">
          <LogOut className="size-4 text-muted-foreground" />
          <p className="text-[13.5px] font-semibold">{t.signOut}</p>
        </div>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {t.signOutDesc}
        </p>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-[13.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {signingOut ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
          {t.signOutBtn}
        </button>
      </div>

      {/* Delete account */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-2">
          <Trash2 className="size-4 text-destructive" />
          <p className="text-[13.5px] font-semibold text-destructive">{t.deleteAccount}</p>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {t.deleteAccountWarning}
        </p>
        <div className="mt-3 space-y-2">
          <input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={t.deleteConfirmPlaceholder}
            className="w-full rounded-lg border border-destructive/30 bg-background px-3 py-2 text-[13px] outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/30"
          />
          {deleteError && <p className="text-[12px] text-destructive">{deleteError}</p>}
          <button
            onClick={handleDeleteAccount}
            disabled={deleting || deleteConfirm !== 'ELIMINAR'}
            className="inline-flex items-center gap-2 rounded-lg bg-destructive px-3.5 py-2 text-[13.5px] font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            {t.deleteAccountActionBtn}
          </button>
        </div>
      </div>
    </div>
  )
}

/* --- Reusable pieces --------------------------------------------------------- */

function SectionTitle({
  icon,
  children,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="text-[12px] font-semibold text-muted-foreground">
        {children}
      </h3>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold">{label}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-secondary'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-card shadow-sm transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

function ThemeTile({
  t,
  selected,
  onSelect,
}: {
  t: (typeof themes)[number]
  selected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
      onClick={() => onSelect(t.id)}
      aria-pressed={selected}
      className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
        selected
          ? 'border-transparent ring-2 ring-ring ring-offset-2 ring-offset-card'
          : 'border-border hover:border-ring/40'
      }`}
    >
      <span className="block h-14 w-full p-2" style={{ backgroundColor: t.preview.bg }}>
        <span
          className="flex h-full w-full items-center gap-1.5 rounded-md px-2 shadow-sm"
          style={{ backgroundColor: t.preview.card }}
        >
          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: t.preview.accent }} />
          <span
            className="h-1.5 w-10 rounded-full opacity-70"
            style={{ backgroundColor: t.preview.text }}
          />
        </span>
      </span>
      <span className="flex items-center justify-between px-2.5 py-1.5">
        <span className="text-[12px] font-semibold">{t.name}</span>
        {selected && <Check className="size-3.5 text-foreground" />}
      </span>
    </button>
  )
}
