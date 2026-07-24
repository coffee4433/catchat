'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquare, UserPlus, MoreHorizontal, X, Smile } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

/* ─── Types ─────────────────────────────────────── */

export interface PopoverUser {
  id: string
  name: string
  image?: string | null
  banner?: string | null
  email?: string
  createdAt?: string | null
}

interface Props {
  user: PopoverUser
  currentUserId: string
  anchorRect: DOMRect | null
  onClose: () => void
  onOpenFullProfile: () => void
  onSendMessage?: (content: string) => void
}

/* ─── Helpers ───────────────────────────────────── */

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function getPopoverPosition(anchor: DOMRect) {
  const W = 320
  const H = 340
  const GAP = 8
  let x = anchor.right + GAP
  let y = anchor.top

  // flip left if overflows right
  if (x + W > window.innerWidth - 16) {
    x = anchor.left - W - GAP
  }
  // clamp to left edge
  if (x < 16) x = 16

  // clamp bottom
  if (y + H > window.innerHeight - 16) {
    y = window.innerHeight - H - 16
  }
  // clamp top
  if (y < 16) y = 16

  return { x, y }
}

/* ─── Component ─────────────────────────────────── */

export function UserPopover({
  user,
  currentUserId,
  anchorRect,
  onClose,
  onOpenFullProfile,
  onSendMessage,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [quickMsg, setQuickMsg] = useState('')

  const isSelf = user.id === currentUserId

  // Close on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function keyHandler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [onClose])

  const handleSendQuickMsg = useCallback(() => {
    if (!quickMsg.trim()) return
    onSendMessage?.(quickMsg.trim())
    setQuickMsg('')
  }, [quickMsg, onSendMessage])

  if (!anchorRect) return null

  const pos = getPopoverPosition(anchorRect)

  // Banner color fallback — use a hash of the user's name for a deterministic color
  const bannerColor = user.banner
    ? undefined
    : `hsl(${[...user.name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360}, 55%, 48%)`

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.92, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="fixed z-[60] w-[320px] overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
        style={{ left: pos.x, top: pos.y }}
      >
        {/* Banner */}
        <div
          className="relative h-[72px] w-full"
          style={
            user.banner
              ? { backgroundImage: `url(${user.banner})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { backgroundColor: bannerColor }
          }
        >
          {/* Action buttons on banner */}
          {!isSelf && (
            <div className="absolute right-2 top-2 flex gap-1.5">
              <button
                className="flex size-8 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
                title="Add friend"
              >
                <UserPlus className="size-4" />
              </button>
              <button
                className="flex size-8 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
                title="More options"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </div>
          )}
        </div>

        {/* Avatar (overlapping banner) */}
        <div className="relative px-4">
          <button
            onClick={onOpenFullProfile}
            className="-mt-10 flex size-[76px] items-center justify-center overflow-hidden rounded-full border-[4px] border-popover bg-secondary transition-transform hover:scale-105"
            title="View full profile"
          >
            {user.image ? (
              <img src={user.image} alt={user.name} className="size-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">
                {initialsOf(user.name)}
              </span>
            )}
          </button>

          {/* Presence dot */}
          <div className="absolute bottom-0 left-[66px] size-4 rounded-full border-[3px] border-popover bg-green-500" />
        </div>

        {/* Name + username */}
        <div className="px-4 pt-2 pb-3">
          <h3 className="text-[17px] font-bold text-foreground leading-tight">{user.name}</h3>
          <p className="text-sm text-muted-foreground">@{user.name.toLowerCase().replace(/\s+/g, '')}</p>
        </div>

        {/* Quick message */}
        {!isSelf && (
          <div className="border-t border-border px-3 py-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2">
              <input
                ref={inputRef}
                type="text"
                placeholder={`Message @${user.name}`}
                value={quickMsg}
                onChange={(e) => setQuickMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendQuickMsg()
                }}
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
              />
              <button className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                <Smile className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* Self: Edit profile link */}
        {isSelf && (
          <div className="border-t border-border px-4 py-3">
            <button
              onClick={onOpenFullProfile}
              className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
            >
              Edit Profile
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
