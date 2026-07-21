'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { authClient } from '@/lib/auth-client'
import { useLanguage } from '@/lib/i18n'
import { ElectricBorder } from '@/components/electric-border'

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function UserDock({
  onOpenSettings,
  user,
}: {
  onOpenSettings: () => void
  user: { id: string; name: string; email: string; image?: string | null; banner?: string | null }
}) {
  const { t } = useLanguage()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const dockRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    await authClient.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dockRef.current &&
        !dockRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, delay: 0.15 }}
      className="fixed bottom-4 left-4 z-40"
    >
      <ElectricBorder active={showMenu} roundedClass="rounded-2xl">
        <div
          ref={dockRef}
          className="relative z-10 flex flex-col-reverse rounded-2xl border border-border bg-card/95 shadow-lg backdrop-blur-sm overflow-hidden"
        >
          <div
            className="flex cursor-pointer items-center gap-2 py-2 pl-2 pr-2.5"
            onClick={() => setShowMenu((v) => !v)}
          >
            <div className="flex items-center gap-2.5 rounded-xl px-1 py-0.5">
              <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[12px] font-semibold text-muted-foreground">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image || '/placeholder.svg'}
                    alt={user.name}
                    className="size-9 rounded-full object-cover"
                  />
                ) : (
                  initialsOf(user.name)
                )}
                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-success" />
              </span>
              <span className="min-w-0 pr-1">
                <span className="block max-w-32 truncate text-[13px] font-semibold leading-tight">
                  {user.name}
                </span>
                <span className="block max-w-32 truncate text-[11px] leading-tight text-muted-foreground">
                  {user.email}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenSettings()
                }}
                aria-label={t.settingsLabel}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Settings className="size-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSignOut()
                }}
                aria-label={t.signOutLabel}
                disabled={signingOut}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {showMenu && (
              <motion.div
                key="expanded"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="overflow-hidden"
              >
                <div
                  className="relative flex flex-col items-center px-4 pb-4 pt-10 rounded-t-2xl overflow-hidden"
                  style={user.banner ? { backgroundImage: `url(${user.banner})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                >
                  {user.banner && <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70" />}
                  <span className="relative mb-3 flex size-16 shrink-0 items-center justify-center rounded-full bg-secondary text-xl font-semibold text-muted-foreground ring-2 ring-white/20">
                    {user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.image || '/placeholder.svg'}
                        alt={user.name}
                        className="size-16 rounded-full object-cover"
                      />
                    ) : (
                      initialsOf(user.name)
                    )}
                    <span className="absolute bottom-0.5 right-0.5 size-4 rounded-full border-[3px] border-card bg-success" />
                  </span>
                  <span className={`relative max-w-full truncate text-center text-base font-semibold leading-tight ${user.banner ? 'text-white' : ''}`}>
                    {user.name}
                  </span>
                  <span className={`relative mt-0.5 max-w-full truncate text-center text-xs leading-tight ${user.banner ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {user.email}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ElectricBorder>
    </motion.div>
  )
}
