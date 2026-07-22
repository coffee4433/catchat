'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Search, UserPlus, X, Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { createDirectConversation, searchUsers, type UserSearchResult } from '@/app/actions/chat'
import { sendFriendRequest } from '@/app/actions/friends'
import { useLanguage } from '@/lib/i18n'

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function NewChatModal({
  open,
  onClose,
  onConversationCreated,
}: {
  open: boolean
  onClose: () => void
  onConversationCreated: (conversationId: number) => void
}) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [startingWith, setStartingWith] = useState<string | null>(null)
  const [requested, setRequested] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebouncedValue(query, 250)

  const { data: results = [], isLoading } = useSWR<UserSearchResult[]>(
    open && debouncedQuery.trim() ? ['user-search', debouncedQuery] : null,
    () => searchUsers(debouncedQuery),
    { keepPreviousData: true },
  )

  useEffect(() => {
    if (open) {
      setQuery('')
      setStartingWith(null)
      setRequested(new Set())
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleAddFriend = async (userId: string) => {
    if (startingWith) return
    setStartingWith(userId)
    try {
      await sendFriendRequest(userId)
      globalMutate('friend-requests')
      setRequested((prev) => new Set(prev).add(userId))
    } catch (e) {
      // May already have a pending request
      if (e instanceof Error && e.message.includes('already sent')) {
        setRequested((prev) => new Set(prev).add(userId))
      }
    } finally {
      setStartingWith(null)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={t.newChatTitle}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="mt-[12vh] flex max-h-[60vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <UserPlus className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">{t.newChatTitle}</h2>
              </div>
              <button
                onClick={onClose}
                aria-label={t.newChatCloseLabel}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.newChatSearchPlaceholder}
                aria-label={t.newChatSearchLabel}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
              />
              {isLoading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
            </div>

            <div className="thin-scroll flex-1 overflow-y-auto p-2" role="listbox" aria-label={t.newChatSearchLabel}>
              {!query.trim() ? (
                <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">
                  {t.newChatNoQuery}
                </p>
              ) : results.length === 0 && !isLoading ? (
                <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">
                  {t.newChatNoResults}
                  {' "'}
                  {query}
                  {'"'}
                </p>
              ) : (
                results.map((u) => (
                  <button
                    key={u.id}
                    role="option"
                    aria-selected={false}
                    onClick={() => handleAddFriend(u.id)}
                    disabled={startingWith !== null}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-secondary disabled:opacity-60"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[12px] font-semibold text-muted-foreground">
                      {u.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.image || '/placeholder.svg'} alt="" className="size-9 rounded-full object-cover" />
                      ) : (
                        initialsOf(u.name)
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{u.name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{u.email}</span>
                    </span>
                    {requested.has(u.id) ? (
                      <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-green-500">
                        <Check className="size-3.5" />
                        Requested
                      </span>
                    ) : startingWith === u.id ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : (
                      <span className="shrink-0 text-[11px] font-medium text-muted-foreground">Add Friend</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
