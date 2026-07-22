'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { getConversations, getConversationInfo, type ConversationListItem } from '@/app/actions/chat'
import { ChatThread } from '@/components/chat-thread'
import { IconRail } from '@/components/icon-rail'
import { InfoPanel } from '@/components/info-panel'
import { NewChatModal } from '@/components/new-chat-modal'
import { SearchModal } from '@/components/search-modal'
import { SettingsModal } from '@/components/settings-modal'
import { Sidebar } from '@/components/sidebar'
import { UserDock } from '@/components/user-dock'
import { CallProvider } from '@/components/calls/call-provider'
import { themes } from '@/lib/themes'

export type AppUser = { id: string; name: string; email: string; image?: string | null; banner?: string | null }
export type Conversation = ConversationListItem

export function ChatApp({
  user,
  initialConversations,
}: {
  user: AppUser
  initialConversations: ConversationListItem[]
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(true)
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cz-theme')
      if (saved && themes.some((t) => t.id === saved)) return saved
    }
    return 'light'
  })
  const [activeConversationId, setActiveConversationId] = useState<number | null>(
    initialConversations[0]?.id ?? null,
  )

  const { data: conversations = initialConversations, mutate: mutateConversations } = useSWR(
    'conversations',
    () => getConversations(),
    { fallbackData: initialConversations },
  )

  const mutateConversationInfo = useCallback((conversationId: number) => {
    globalMutate(['conversation-info', conversationId])
  }, [])

  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const closeNewChat = useCallback(() => setNewChatOpen(false), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  useEffect(() => {
    const t = themes.find((x) => x.id === theme)
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.classList.toggle('dark', Boolean(t?.dark))
    root.classList.toggle('light', !t?.dark)
    localStorage.setItem('cz-theme', theme)
  }, [theme])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? null

  return (
    <CallProvider user={user}>
      <main className="relative flex h-dvh overflow-hidden bg-background p-3 pl-0">
        <IconRail />
        <div className="hidden h-full lg:block ml-3">
          <Sidebar
            onOpenSearch={() => setSearchOpen(true)}
            onOpenNewChat={() => setNewChatOpen(true)}
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={setActiveConversationId}
            onConversationsChange={() => mutateConversations()}
            currentUserId={user.id}
          />
        </div>
        <ChatThread
          infoOpen={infoOpen}
          onToggleInfo={() => setInfoOpen((v) => !v)}
          user={user}
          conversation={activeConversation}
          onConversationChange={(id) => {
            setActiveConversationId(id)
            mutateConversations()
          }}
          onConversationInfoChange={mutateConversationInfo}
        />
        <AnimatePresence initial={false}>
          {infoOpen && activeConversation && (
            <motion.div
              key="info-panel"
              initial={{ width: 0, opacity: 0, x: 32, marginLeft: 0 }}
              animate={{ width: 288, opacity: 1, x: 0, marginLeft: 12 }}
              exit={{ width: 0, opacity: 0, x: 32, marginLeft: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 34 }}
              className="hidden h-full overflow-hidden lg:block"
            >
              <InfoPanel conversation={activeConversation} currentUserId={user.id} />
            </motion.div>
          )}
        </AnimatePresence>
        <SearchModal
          open={searchOpen}
          onClose={closeSearch}
          onSelectConversation={(id) => {
            setActiveConversationId(id)
            closeSearch()
          }}
          onStartChatWithUser={(id) => {
            setActiveConversationId(id)
            mutateConversations()
            closeSearch()
          }}
        />
        <NewChatModal
          open={newChatOpen}
          onClose={closeNewChat}
          onConversationCreated={(id) => {
            setActiveConversationId(id)
            mutateConversations()
          }}
        />
        <SettingsModal
          open={settingsOpen}
          onClose={closeSettings}
          theme={theme}
          onThemeChange={setTheme}
          user={user}
        />
        <UserDock onOpenSettings={() => setSettingsOpen(true)} user={user} />
      </main>
    </CallProvider>
  )
}
