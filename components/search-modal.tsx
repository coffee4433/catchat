'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, Loader2, MessageSquare, Search, UserPlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import {
  createDirectConversation,
  globalSearch,
  type GlobalSearchResults,
} from '@/app/actions/chat'
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

function highlight(text: string, query: string) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-foreground">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-card px-1.5 text-[11px] font-medium text-muted-foreground shadow-sm">
      {children}
    </span>
  )
}

const EMPTY: GlobalSearchResults = { conversations: [], messages: [], users: [] }

export function SearchModal({
  open,
  onClose,
  onSelectConversation,
  onStartChatWithUser,
}: {
  open: boolean
  onClose: () => void
  onSelectConversation: (id: number) => void
  onStartChatWithUser: (id: number) => void
}) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [startingWith, setStartingWith] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebouncedValue(query, 250)

  const { data: results = EMPTY, isLoading } = useSWR<GlobalSearchResults>(
    open && debouncedQuery.trim() ? ['global-search', debouncedQuery] : null,
    () => globalSearch(debouncedQuery),
    { keepPreviousData: true },
  )

  useEffect(() => {
    if (open) {
      setQuery('')
      setStartingWith(null)
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

  const handleStartChat = async (userId: string) => {
    if (startingWith) return
    setStartingWith(userId)
    try {
      const { id } = await createDirectConversation(userId)
      onStartChatWithUser(id)
      onClose()
    } finally {
      setStartingWith(null)
    }
  }

  const hasResults =
    results.conversations.length > 0 || results.messages.length > 0 || results.users.length > 0

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 z-50 flex items-start justify-center bg-foreground/10 backdrop-blur-[2px]"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={t.searchModalTitle}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="mt-[8vh] flex max-h-[74vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            style={{ willChange: 'transform, opacity' }}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchModalPlaceholder}
                aria-label={t.searchModalTitle}
                className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
              />
              {isLoading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
            </div>

            <div
              className="thin-scroll flex-1 overflow-y-auto px-2.5 py-2"
              role="listbox"
              aria-label={t.searchModalTitle}
            >
              {!query.trim() ? (
                <p className="px-2.5 py-10 text-center text-sm text-muted-foreground">
                  {t.searchModalNoQuery}
                </p>
              ) : !hasResults && !isLoading ? (
                <p className="px-2.5 py-10 text-center text-sm text-muted-foreground">
                  {t.searchModalNoResults}
                  {' "'}
                  {query}
                  {'"'}
                </p>
              ) : (
                <>
                  {results.users.length > 0 && (
                    <Group label={t.searchModalUsersGroup}>
                      {results.users.map((u) => (
                        <button
                          key={u.id}
                          role="option"
                          aria-selected={false}
                          onClick={() => handleStartChat(u.id)}
                          disabled={startingWith !== null}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-secondary disabled:opacity-60"
                        >
                          <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[10px] font-semibold text-muted-foreground">
                            {u.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={u.image || '/placeholder.svg'}
                                alt=""
                                className="size-7 rounded-full object-cover"
                              />
                            ) : (
                              initialsOf(u.name)
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {highlight(u.name, query)}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {u.email}
                            </span>
                          </span>
                          {startingWith === u.id ? (
                            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                          ) : (
                            <UserPlus className="size-4 shrink-0 text-muted-foreground" />
                          )}
                        </button>
                      ))}
                    </Group>
                  )}

                  {results.conversations.length > 0 && (
                    <Group label={t.searchModalConversationsGroup}>
                      {results.conversations.map((c) => (
                        <button
                          key={c.id}
                          role="option"
                          aria-selected={false}
                          onClick={() => {
                            onSelectConversation(c.id)
                            onClose()
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-secondary"
                        >
                          <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                          <span className="truncate font-medium">{highlight(c.title, query)}</span>
                        </button>
                      ))}
                    </Group>
                  )}

                  {results.messages.length > 0 && (
                    <Group label={t.searchModalMessagesGroup}>
                      {results.messages.map((m) => (
                        <button
                          key={m.id}
                          role="option"
                          aria-selected={false}
                          onClick={() => {
                            onSelectConversation(m.conversationId)
                            onClose()
                          }}
                          className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-secondary"
                        >
                          <span className="truncate">{highlight(m.content, query)}</span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            {t.searchModalIn} {m.conversationTitle}
                          </span>
                        </button>
                      ))}
                    </Group>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-border bg-background/60 px-4 py-2.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Kbd>
                  <CornerDownLeft className="size-3" />
                </Kbd>
                {t.searchModalOpenLabel}
              </span>
              <button
                onClick={onClose}
                className="ml-auto flex items-center gap-1.5 hover:text-foreground"
              >
                <Kbd>esc</Kbd>
                {t.searchModalCloseLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pb-1">
      <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  )
}
