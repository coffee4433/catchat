'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquare, UserPlus, MoreHorizontal, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { PopoverUser } from './user-popover'

/* ─── Helpers ───────────────────────────────────── */

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ─── Note persistence (localStorage) ──────────── */

function getNoteKey(currentUserId: string, targetUserId: string) {
  return `cz-note:${currentUserId}:${targetUserId}`
}

function loadNote(currentUserId: string, targetUserId: string): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(getNoteKey(currentUserId, targetUserId)) || ''
}

function saveNote(currentUserId: string, targetUserId: string, note: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(getNoteKey(currentUserId, targetUserId), note)
}

/* ─── Tabs ──────────────────────────────────────── */

type Tab = 'activity' | 'mutual-friends' | 'mutual-servers'

/* ─── Component ─────────────────────────────────── */

export function UserProfileModal({
  user,
  currentUserId,
  onClose,
}: {
  user: PopoverUser
  currentUserId: string
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<Tab>('activity')
  const [note, setNote] = useState(() => loadNote(currentUserId, user.id))
  const noteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isSelf = user.id === currentUserId

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Debounced note save
  function handleNoteChange(val: string) {
    setNote(val)
    if (noteTimeoutRef.current) clearTimeout(noteTimeoutRef.current)
    noteTimeoutRef.current = setTimeout(() => {
      saveNote(currentUserId, user.id, val)
    }, 500)
  }

  // Banner color fallback
  const bannerColor = user.banner
    ? undefined
    : `hsl(${[...user.name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360}, 55%, 48%)`

  const tabs: { id: Tab; label: string }[] = [
    { id: 'activity', label: 'Activity' },
    { id: 'mutual-friends', label: 'No mutual friends' },
    { id: 'mutual-servers', label: 'No mutual servers' },
  ]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 32 }}
          className="relative flex w-full max-w-[880px] max-h-[85vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-20 flex size-8 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
          >
            <X className="size-4" />
          </button>

          {/* ── Left column: Identity ─────── */}
          <div className="flex w-[340px] shrink-0 flex-col border-r border-border">
            {/* Banner */}
            <div
              className="relative h-[120px] w-full shrink-0"
              style={
                user.banner
                  ? { backgroundImage: `url(${user.banner})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { backgroundColor: bannerColor }
              }
            />

            {/* Avatar overlapping banner */}
            <div className="relative px-5">
              <div className="-mt-12 flex size-[88px] items-center justify-center overflow-hidden rounded-full border-[5px] border-card bg-secondary">
                {user.image ? (
                  <img src={user.image} alt={user.name} className="size-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-muted-foreground">
                    {initialsOf(user.name)}
                  </span>
                )}
              </div>
              {/* Presence dot */}
              <div className="absolute bottom-0 left-[76px] size-5 rounded-full border-[3px] border-card bg-green-500" />
            </div>

            {/* Name + username */}
            <div className="px-5 pt-2.5">
              <h2 className="text-xl font-bold text-foreground leading-tight">{user.name}</h2>
              <p className="text-sm text-muted-foreground">@{user.name.toLowerCase().replace(/\s+/g, '')}</p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 px-5 pt-4">
              {!isSelf ? (
                <>
                  <button className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90">
                    <MessageSquare className="size-4" />
                    Message
                  </button>
                  <button
                    className="flex size-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
                    title="Add friend"
                  >
                    <UserPlus className="size-4" />
                  </button>
                  <button
                    className="flex size-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
                    title="More options"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </>
              ) : (
                <button className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90">
                  Edit Profile
                </button>
              )}
            </div>

            {/* Metadata */}
            <div className="mt-4 border-t border-border px-5 py-3 space-y-2.5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Member since</p>
                <p className="text-sm text-foreground">{formatDate(user.createdAt)}</p>
              </div>
            </div>

            {/* Private note */}
            {!isSelf && (
              <div className="border-t border-border px-5 py-3 mt-auto">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Note (only visible to you)
                </p>
                <textarea
                  value={note}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  placeholder="Click to add a note"
                  className="thin-scroll w-full resize-none rounded-md border-none bg-transparent p-0 text-sm text-foreground/70 outline-none placeholder:text-muted-foreground/40 placeholder:italic focus:text-foreground"
                  rows={2}
                />
              </div>
            )}
          </div>

          {/* ── Right column: Tabs ────────── */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Tab bar */}
            <div className="flex gap-4 border-b border-border px-5 pt-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 text-sm font-semibold transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-foreground text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="thin-scroll flex-1 overflow-y-auto p-5">
              {activeTab === 'activity' && (
                <div className="flex h-full flex-col items-center justify-center text-center py-12">
                  <p className="text-base font-semibold text-foreground">
                    {user.name} doesn&apos;t have any activity to share here
                  </p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    What a mystery! Ask them to tell you a secret
                  </p>
                  {!isSelf && (
                    <button className="mt-5 flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80">
                      <MessageSquare className="size-4" />
                      Message
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'mutual-friends' && (
                <div className="flex h-full flex-col items-center justify-center text-center py-12">
                  <p className="text-sm text-muted-foreground">No mutual friends</p>
                </div>
              )}

              {activeTab === 'mutual-servers' && (
                <div className="flex h-full flex-col items-center justify-center text-center py-12">
                  <p className="text-sm text-muted-foreground">No mutual servers</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
