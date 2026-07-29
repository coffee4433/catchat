'use client'

import { Calendar, CircleCheck, Loader2, MessageSquare, Users } from 'lucide-react'
import useSWR from 'swr'
import {
  getConversationInfo,
  type ConversationInfo,
  type ConversationListItem,
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

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-2 text-[13px]">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-1.5 font-medium">{value}</span>
    </div>
  )
}

export function InfoPanel({
  conversation,
  currentUserId,
}: {
  conversation: ConversationListItem
  currentUserId: string
}) {
  const { t } = useLanguage()
  const { data: info, isLoading } = useSWR<ConversationInfo>(
    ['conversation-info', conversation.id],
    () => getConversationInfo(conversation.id),
  )

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{t.detailsTitle}</h2>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto px-4 py-3">
        {isLoading || !info ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="sr-only">{t.loadingInfo}</span>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2 pb-4 text-center">
              {conversation.isDirect && conversation.otherUser ? (
                <span className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-secondary text-lg font-semibold text-muted-foreground">
                  {conversation.otherUser.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={conversation.otherUser.image || '/placeholder.svg'}
                      alt=""
                      className="size-16 rounded-full object-cover"
                    />
                  ) : (
                    initialsOf(conversation.otherUser.name)
                  )}
                </span>
              ) : (
                <span className="flex size-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <MessageSquare className="size-7" />
                </span>
              )}
              <div>
              <p className="font-sans text-[13.5px] font-semibold text-foreground">
                {conversation.isDirect ? t.directMessage : info.title}
              </p>
                {conversation.isDirect && conversation.otherUser ? (
                  <p className="text-[12px] text-muted-foreground">{conversation.otherUser.email}</p>
                ) : (
                  <p className="text-[12px] text-muted-foreground">{t.conversationType}</p>
                )}
              </div>
            </div>

            <h3 className="text-[12px] font-semibold text-muted-foreground">
              {t.infoSectionTitle}
            </h3>
            <div className="mt-1 divide-y divide-border/70">
              <InfoRow
                icon={<Calendar className="size-3.5" />}
                label={t.createdLabel}
                value={formatDate(info.createdAt)}
              />
              <InfoRow
                icon={<MessageSquare className="size-3.5" />}
                label={t.messagesLabel}
                value={info.messageCount}
              />
              <InfoRow
                icon={<Users className="size-3.5" />}
                label={t.participantsLabel}
                value={info.participants.length}
              />
              <InfoRow
                icon={<CircleCheck className="size-3.5" />}
                label={t.statusLabel}
                value={
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                    {'\u2022'} {t.activeStatus}
                  </span>
                }
              />
            </div>

            <h3 className="mt-5 text-[12px] font-semibold text-muted-foreground">
              {t.participantsCount} <span>({info.participants.length})</span>
            </h3>
            <ul className="mt-2 space-y-2.5 pb-2">
              {info.participants.map((p) => (
                <li key={p.id} className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image || '/placeholder.svg'}
                        alt=""
                        className="size-8 rounded-full object-cover"
                      />
                    ) : (
                      initialsOf(p.name)
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-foreground leading-tight">
                      {p.name}
                      {p.id === currentUserId ? (
                        <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                          {t.youSuffix}
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">{p.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </aside>
  )
}
