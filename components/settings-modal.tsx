'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  Check,
  ChevronRight,
  Download,
  Globe,
  Keyboard,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  Moon,
  Palette,
  Pencil,
  Search,
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

type Section = 'account' | 'profile' | 'privacy' | 'notifications' | 'appearance' | 'chat' | 'language'

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
  const { t, lang } = useLanguage()
  const [active, setActive] = useState<Section>('account')
  const [sidebarSearch, setSidebarSearch] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)

  // Sub-navigation items for "Cuenta" (Account) section
  const accountSubItems = [
    { id: 'info-cuenta', label: lang === 'es' ? 'Información de cuenta' : 'Account Info' },
    { id: 'pwd-seguridad', label: lang === 'es' ? 'Contraseña y seguridad' : 'Password & Security' },
    { id: 'reputacion-cuenta', label: lang === 'es' ? 'Reputación de la cuenta' : 'Account Standing' },
  ]

  const scrollToSubItem = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Grouped navigation matching Discord exactly
  const userSettings: { id: Section; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'account', label: lang === 'es' ? 'Cuenta' : 'Account', icon: <UserIcon className="size-4" /> },
    { id: 'profile', label: lang === 'es' ? 'Perfiles' : 'Profiles', icon: <Pencil className="size-4" /> },
    { id: 'privacy', label: lang === 'es' ? 'Datos y privacidad' : 'Privacy & Safety', icon: <Lock className="size-4" /> },
    { id: 'notifications', label: lang === 'es' ? 'Notificaciones' : 'Notifications', icon: <Bell className="size-4" /> },
  ]

  const appSettings: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'appearance', label: lang === 'es' ? 'Apariencia' : 'Appearance', icon: <Palette className="size-4" /> },
    { id: 'chat', label: lang === 'es' ? 'Chat y texto' : 'Text & Images', icon: <MessageCircle className="size-4" /> },
    { id: 'language', label: lang === 'es' ? 'Idioma' : 'Language', icon: <Globe className="size-4" /> },
  ]

  const allSections = [...userSettings, ...appSettings]

  const filterList = <T extends { label: string }>(items: T[]) =>
    sidebarSearch.trim()
      ? items.filter((item) => item.label.toLowerCase().includes(sidebarSearch.toLowerCase()))
      : items

  useEffect(() => {
    if (!open) return
    setActive('account')
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-label={t.settingsModalCloseLabel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            className="relative flex h-[92dvh] max-h-[860px] w-full max-w-5xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl"
          >
            {/* ── Discord Left Sidebar ─────────────────── */}
            <nav className="hidden w-[240px] shrink-0 flex-col border-r border-border/60 bg-background/80 sm:flex select-none">
              {/* User mini profile card header */}
              <div className="p-3 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                    {user.image ? (
                      <img src={user.image} alt="" className="size-full object-cover" />
                    ) : (
                      initialsOf(user.name)
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-foreground leading-tight flex items-center gap-1">
                      {user.name} <span className="text-[12px]">🐱</span>
                    </p>
                    <button
                      onClick={() => setActive('profile')}
                      className="flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>{lang === 'es' ? 'Editar perfiles' : 'Edit profiles'}</span>
                      <Pencil className="size-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Search bar */}
              <div className="px-3 pt-3 pb-1.5">
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 px-2.5 py-1.5 focus-within:border-primary/60 transition-all">
                  <Search className="size-3.5 shrink-0 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={lang === 'es' ? 'Buscar' : 'Search'}
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

              {/* Scrollable navigation items */}
              <div className="thin-scroll flex-1 overflow-y-auto px-2 py-2 space-y-4">
                {/* User Settings group */}
                {filterList(userSettings).length > 0 && (
                  <div>
                    <p className="px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      {lang === 'es' ? 'Ajustes de usuario' : 'User Settings'}
                    </p>
                    <div className="space-y-0.5">
                      {filterList(userSettings).map((s) => {
                        const isSelected = active === s.id
                        return (
                          <div key={s.id}>
                            <button
                              onClick={() => setActive(s.id)}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13.5px] font-semibold transition-all ${
                                isSelected
                                  ? 'bg-secondary text-foreground shadow-sm'
                                  : 'text-muted-foreground/80 hover:bg-secondary/40 hover:text-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                {s.icon}
                                <span>{s.label}</span>
                              </div>
                            </button>

                            {/* Active section sub-navigation tree (like Discord screenshot) */}
                            {isSelected && s.id === 'account' && (
                              <div className="relative ml-5 my-1 pl-3 border-l-2 border-border/80 space-y-1">
                                {accountSubItems.map((sub) => (
                                  <button
                                    key={sub.id}
                                    onClick={() => scrollToSubItem(sub.id)}
                                    className="block w-full text-left text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors py-0.5 truncate"
                                  >
                                    {sub.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="mx-2 h-px bg-border/40" />

                {/* App Settings group */}
                {filterList(appSettings).length > 0 && (
                  <div>
                    <p className="px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      {lang === 'es' ? 'Ajustes de la aplicación' : 'App Settings'}
                    </p>
                    <div className="space-y-0.5">
                      {filterList(appSettings).map((s) => {
                        const isSelected = active === s.id
                        return (
                          <button
                            key={s.id}
                            onClick={() => setActive(s.id)}
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13.5px] font-semibold transition-all ${
                              isSelected
                                ? 'bg-secondary text-foreground shadow-sm'
                                : 'text-muted-foreground/80 hover:bg-secondary/40 hover:text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {s.icon}
                              <span>{s.label}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* ── Right Content Area ──────────────────── */}
            <div className="flex min-w-0 flex-1 flex-col bg-card">
              {/* Header with Title and Close X */}
              <header className="flex items-center justify-between border-b border-border/50 px-6 py-4">
                <h2 className="text-base font-bold text-foreground">
                  {allSections.find((s) => s.id === active)?.label}
                </h2>
                <button
                  onClick={onClose}
                  aria-label={t.settingsModalCloseLabel}
                  className="flex size-7 items-center justify-center rounded-full border border-border/80 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </header>

              {/* Mobile tabs */}
              <div className="flex gap-1 overflow-x-auto border-b border-border/50 px-3 py-2 sm:hidden">
                {allSections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
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

              {/* Main content body */}
              <div ref={contentRef} className="thin-scroll flex-1 overflow-y-auto px-7 py-6">
                {active === 'account' && <DiscordAccountSection user={user} lang={lang} />}
                {active === 'profile' && <ProfileSection user={user} onClose={onClose} />}
                {active === 'appearance' && (
                  <AppearanceSection theme={theme} onThemeChange={onThemeChange} />
                )}
                {active === 'chat' && <ChatSection />}
                {active === 'notifications' && <NotificationsSection />}
                {active === 'privacy' && <PrivacySection />}
                {active === 'language' && <LanguageSection />}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/* ── Discord Account Section (Exact screenshot match) ─────────────────── */

function DiscordAccountSection({ user, lang }: { user: AppUser; lang: string }) {
  const router = useRouter()
  const [showEmail, setShowEmail] = useState(false)
  const [showPhone, setShowPhone] = useState(false)

  // Password modal / inline edit state
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdChanging, setPwdChanging] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [editingPwd, setEditingPwd] = useState(false)

  const handleChangePassword = async () => {
    if (pwdChanging) return
    setPwdError(null)
    setPwdSuccess(false)

    if (!currentPwd) return setPwdError(lang === 'es' ? 'Introduce tu contraseña actual' : 'Enter current password')
    if (newPwd.length < 6) return setPwdError(lang === 'es' ? 'La contraseña debe tener al menos 6 caracteres' : 'Password must be at least 6 characters')
    if (newPwd !== confirmPwd) return setPwdError(lang === 'es' ? 'Las contraseñas no coinciden' : 'Passwords do not match')

    setPwdChanging(true)
    try {
      await changePassword(currentPwd, newPwd)
      setPwdSuccess(true)
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
      setTimeout(() => {
        setPwdSuccess(false)
        setEditingPwd(false)
      }, 2000)
    } catch (e) {
      setPwdError(e instanceof Error ? e.message : 'Error al cambiar la contraseña')
    } finally {
      setPwdChanging(false)
    }
  }

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return (
    <div className="max-w-2xl space-y-8 select-none">
      {/* ── 1. Información de cuenta ──────────── */}
      <div id="info-cuenta" className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">
          {lang === 'es' ? 'Información de cuenta' : 'Account Info'}
        </h3>

        <div className="space-y-4 rounded-xl border border-border/50 bg-secondary/15 p-4">
          {/* Username */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                {lang === 'es' ? 'Nombre de usuario' : 'Username'}
              </p>
              <p className="mt-0.5 text-[14px] font-medium text-foreground truncate">{user.name.toLowerCase().replace(/\s+/g, '_')}</p>
            </div>
            <button className="rounded-md bg-secondary/80 hover:bg-secondary px-4 py-1.5 text-[13px] font-semibold text-foreground transition-all border border-border/40">
              {lang === 'es' ? 'Editar' : 'Edit'}
            </button>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/30">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                {lang === 'es' ? 'Correo electrónico' : 'Email Address'}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-[14px] font-medium text-foreground">
                <span>{showEmail ? user.email : '********' + (user.email.includes('@') ? '@' + user.email.split('@')[1] : '')}</span>
                <button
                  onClick={() => setShowEmail(!showEmail)}
                  className="text-[12px] font-semibold text-primary hover:underline"
                >
                  {showEmail ? (lang === 'es' ? 'Ocultar' : 'Hide') : (lang === 'es' ? 'Mostrar' : 'Reveal')}
                </button>
              </div>
            </div>
            <button className="rounded-md bg-secondary/80 hover:bg-secondary px-4 py-1.5 text-[13px] font-semibold text-foreground transition-all border border-border/40">
              {lang === 'es' ? 'Editar' : 'Edit'}
            </button>
          </div>

          {/* Phone */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/30">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                {lang === 'es' ? 'Número de teléfono' : 'Phone Number'}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-[14px] font-medium text-foreground">
                <span>{showPhone ? '+34 600 123 456' : '********7676'}</span>
                <button
                  onClick={() => setShowPhone(!showPhone)}
                  className="text-[12px] font-semibold text-primary hover:underline"
                >
                  {showPhone ? (lang === 'es' ? 'Ocultar' : 'Hide') : (lang === 'es' ? 'Mostrar' : 'Reveal')}
                </button>
              </div>
            </div>
            <button className="rounded-md bg-secondary/80 hover:bg-secondary px-4 py-1.5 text-[13px] font-semibold text-foreground transition-all border border-border/40">
              {lang === 'es' ? 'Editar' : 'Edit'}
            </button>
          </div>
        </div>
      </div>

      <div className="h-px bg-border/40" />

      {/* ── 2. Contraseña y seguridad ────────── */}
      <div id="pwd-seguridad" className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">
          {lang === 'es' ? 'Contraseña y seguridad' : 'Password & Security'}
        </h3>

        <div className="space-y-4 rounded-xl border border-border/50 bg-secondary/15 p-4">
          {/* Password row */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-foreground">
                {lang === 'es' ? 'Contraseña' : 'Password'}
              </p>
            </div>
            <button
              onClick={() => setEditingPwd(!editingPwd)}
              className="rounded-md bg-secondary/80 hover:bg-secondary px-4 py-1.5 text-[13px] font-semibold text-foreground transition-all border border-border/40"
            >
              {lang === 'es' ? 'Cambiar contraseña' : 'Change Password'}
            </button>
          </div>

          {/* Inline password form */}
          {editingPwd && (
            <div className="mt-3 space-y-3 pt-3 border-t border-border/30">
              <input
                type="password"
                placeholder={lang === 'es' ? 'Contraseña actual' : 'Current Password'}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none"
              />
              <input
                type="password"
                placeholder={lang === 'es' ? 'Nueva contraseña' : 'New Password'}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none"
              />
              <input
                type="password"
                placeholder={lang === 'es' ? 'Confirmar nueva contraseña' : 'Confirm New Password'}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none"
              />
              {pwdError && <p className="text-[12px] text-destructive">{pwdError}</p>}
              {pwdSuccess && <p className="text-[12px] text-green-500">{lang === 'es' ? 'Contraseña actualizada' : 'Password updated'}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleChangePassword}
                  disabled={pwdChanging}
                  className="rounded-md bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground"
                >
                  {pwdChanging ? <Loader2 className="size-3.5 animate-spin" /> : (lang === 'es' ? 'Guardar' : 'Save')}
                </button>
                <button
                  onClick={() => setEditingPwd(false)}
                  className="rounded-md bg-secondary px-4 py-1.5 text-[13px] font-semibold text-muted-foreground"
                >
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* Multi-factor auth */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/30">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-foreground">
                {lang === 'es' ? 'Autenticación de varios factores' : 'Two-Factor Authentication'}
              </p>
            </div>
            <button className="flex items-center gap-1 rounded-md bg-secondary/80 hover:bg-secondary px-4 py-1.5 text-[13px] font-semibold text-foreground transition-all border border-border/40">
              <span>{lang === 'es' ? 'Configurar' : 'Enable'}</span>
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Devices */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/30">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-foreground">
                {lang === 'es' ? 'Dispositivos con sesión iniciada' : 'Logged-in Devices'}
              </p>
            </div>
            <button className="flex items-center gap-1 rounded-md bg-secondary/80 hover:bg-secondary px-4 py-1.5 text-[13px] font-semibold text-foreground transition-all border border-border/40">
              <span>{lang === 'es' ? '3 dispositivos' : '3 devices'}</span>
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="h-px bg-border/40" />

      {/* ── 3. Reputación de la cuenta ───────── */}
      <div id="reputacion-cuenta" className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">
          {lang === 'es' ? 'Reputación de la cuenta' : 'Account Standing'}
        </h3>
        <div className="rounded-xl border border-border/50 bg-secondary/15 p-4 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-semibold text-foreground">
              {lang === 'es' ? 'Estado de la cuenta: Excelente' : 'Account Status: All Good'}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {lang === 'es' ? 'No tienes infracciones registradas.' : 'You have no active violations.'}
            </p>
          </div>
          <span className="flex size-3 rounded-full bg-green-500 shadow-sm" />
        </div>
      </div>

      <div className="h-px bg-border/40" />

      {/* Sign Out */}
      <div className="pt-2">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2.5 text-[13.5px] font-semibold transition-all"
        >
          <LogOut className="size-4" />
          <span>{lang === 'es' ? 'Cerrar sesión' : 'Log Out'}</span>
        </button>
      </div>
    </div>
  )
}

/* ── Remaining Sections ─────────────────────────────────────────────── */

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
            {image ? (
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
    </div>
  )
}

/* ── Reusable utilities ───────────────────────────────────────────────── */

function SectionTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{children}</h3>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
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
