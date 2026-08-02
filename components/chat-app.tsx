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
import { ReleaseNotesModal } from '@/components/release-notes-modal'
import { ChatBackground } from '@/components/chat-background'
import { CallProvider } from '@/components/calls/call-provider'
import { PluginProvider, usePlugins } from '@/lib/plugins/plugin-provider'
import { CatMusicPlayerBar } from '@/components/cat-music/player-bar'
import { themes } from '@/lib/themes'

export type AppUser = { id: string; name: string; email: string; image?: string | null; banner?: string | null }
export type Conversation = ConversationListItem

function ChatAppInner({
  user,
  initialConversations,
  onOpenSettings,
}: {
  user: AppUser
  initialConversations: ConversationListItem[]
  onOpenSettings: () => void
}) {
  const [activeView, setActiveView] = useState<string>('chat')
  const [searchOpen, setSearchOpen] = useState(false)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(true)
  const [activeConversationId, setActiveConversationId] = useState<number | null>(
    initialConversations[0]?.id ?? null,
  )

  const { isPluginEnabled, getActiveRailTabs } = usePlugins()

  // Restore saved active view after hydration on mount
  useEffect(() => {
    const saved = localStorage.getItem('cz-active-app-view')
    if (saved) {
      setActiveView(saved)
    }
  }, [])

  // Persist active view in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cz-active-app-view', activeView)
    }
  }, [activeView])

  // Fallback to 'chat' if current active plugin view gets disabled
  useEffect(() => {
    if (activeView !== 'chat' && !isPluginEnabled(activeView)) {
      setActiveView('chat')
    }
  }, [activeView, isPluginEnabled])

  // Listen for plugin navigation requests (e.g. Escape from game view via hash)
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#chat') {
        setActiveView('chat')
        history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const { data: conversations = initialConversations, mutate: mutateConversations } = useSWR(
    'conversations',
    () => getConversations(),
    {
      fallbackData: initialConversations,
      refreshInterval: 3000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  )

  const mutateConversationInfo = useCallback((conversationId: number) => {
    globalMutate(['conversation-info', conversationId])
  }, [])

  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const closeNewChat = useCallback(() => setNewChatOpen(false), [])

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

  const activePluginTab = getActiveRailTabs().find((t) => t.id === activeView)
  const PluginViewComponent = activePluginTab?.component

  return (
    <CallProvider user={user}>
      <main className="relative flex h-dvh overflow-hidden bg-background p-3 pl-0">
        <ChatBackground />
        <IconRail activeView={activeView} onSelectView={setActiveView} />

        {/* VIEW 1: Main CatChat Workspace */}
        {activeView === 'chat' && (
          <div className="flex flex-1 min-w-0 h-full">
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
                  className="hidden h-full overflow-hidden rounded-3xl lg:block"
                >
                  <InfoPanel conversation={activeConversation} currentUserId={user.id} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* VIEW 2: Active Plugin View (e.g. CatMusic) */}
        {activeView !== 'chat' && PluginViewComponent && (
          <div
            className={`flex-1 min-w-0 h-full overflow-hidden ml-3 ${
              activeView === 'cat-music'
                ? 'rounded-3xl'
                : 'rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl'
            }`}
          >
            <PluginViewComponent user={user} onOpenSettings={onOpenSettings} />
          </div>
        )}

        {/* Persistent YouTube Player Bar for CatMusic (shown ONLY in CatMusic view) */}
        {isPluginEnabled('cat-music') && activeView === 'cat-music' && <CatMusicPlayerBar />}

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
        <ReleaseNotesModal />
        <UserDock
          onOpenSettings={onOpenSettings}
          user={user}
          activeView={activeView}
          onOpenCatMusic={() => setActiveView('cat-music')}
        />
      </main>
    </CallProvider>
  )
}

export function ChatApp(props: { user: AppUser; initialConversations: ConversationListItem[] }) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cz-theme')
      if (saved && themes.some((t) => t.id === saved)) return saved
    }
    return 'catchat'
  })

  useEffect(() => {
    const t = themes.find((x) => x.id === theme)
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.classList.toggle('dark', Boolean(t?.dark))
    root.classList.toggle('light', !t?.dark)
    localStorage.setItem('cz-theme', theme)
  }, [theme])

  return (
    <PluginProvider user={props.user}>
      <ChatAppInner {...props} onOpenSettings={() => setSettingsOpen(true)} />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        user={props.user}
      />
    </PluginProvider>
  )
}
