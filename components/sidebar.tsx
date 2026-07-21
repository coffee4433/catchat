'use client'

import { MessageSquare, Plus, Search, Trash2 } from 'lucide-react'
import type { ConversationListItem } from '@/app/actions/chat'
import { deleteConversation } from '@/app/actions/chat'
import { useLanguage } from '@/lib/i18n'

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function ConversationRow({
  conversation,
  active,
  onClick,
  onDelete,
}: {
  conversation: ConversationListItem
  active?: boolean
  onClick?: () => void
  onDelete?: () => void
}) {
  const { t } = useLanguage()
  return (
    <div
      className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13.5px] transition-colors ${
        active
          ? 'bg-secondary font-semibold text-foreground'
          : 'text-foreground/80 font-medium hover:bg-secondary/70'
      }`}
    >
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        {conversation.isDirect && conversation.otherUser ? (
          <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[9px] font-semibold text-muted-foreground">
            {conversation.otherUser.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={conversation.otherUser.image || '/placeholder.svg'}
                alt=""
                className="size-6 rounded-full object-cover"
              />
            ) : (
              initialsOf(conversation.otherUser.name)
            )}
          </span>
        ) : (
          <span className="shrink-0 text-muted-foreground">
            <MessageSquare className="size-4" />
          </span>
        )}
        <span className="truncate">{conversation.title}</span>
      </button>
      {onDelete ? (
        <button
          aria-label={`${t.deleteConversationLabel} ${conversation.title}`}
          onClick={onDelete}
          className="hidden shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive group-hover:block"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}

export function Sidebar({
  onOpenSearch,
  onOpenNewChat,
  conversations,
  activeConversationId,
  onSelectConversation,
  onConversationsChange,
}: {
  onOpenSearch: () => void
  onOpenNewChat: () => void
  conversations: ConversationListItem[]
  activeConversationId: number | null
  onSelectConversation: (id: number | null) => void
  onConversationsChange: () => void
}) {
  const { t } = useLanguage()

  const handleDelete = async (id: number) => {
    await deleteConversation(id)
    if (activeConversationId === id) {
      const remaining = conversations.filter((c) => c.id !== id)
      onSelectConversation(remaining[0]?.id ?? null)
    }
    onConversationsChange()
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between px-3 py-3">
        <span className="text-sm font-semibold">CatChat</span>
        <button
          aria-label={t.searchPlaceholder}
          onClick={onOpenSearch}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Search className="size-4" />
        </button>
      </div>

      <nav className="thin-scroll flex-1 overflow-y-auto px-2 pb-3" aria-label={t.conversationsLabel}>
        <div className="mt-1 mb-1 flex items-center justify-between px-2">
          <span className="text-[12px] font-semibold text-muted-foreground">
            {t.groupChats}
          </span>
          <button
            aria-label={t.newChatLabel}
            onClick={onOpenNewChat}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        {conversations.length === 0 ? (
          <p className="px-2 py-1.5 text-[12px] text-muted-foreground">
            {t.noOtherChats}
          </p>
        ) : (
          conversations.map((c) => (
            <ConversationRow
              key={c.id}
              conversation={c}
              active={c.id === activeConversationId}
              onClick={() => onSelectConversation(c.id)}
              onDelete={() => handleDelete(c.id)}
            />
          ))
        )}
      </nav>
    </aside>
  )
}
