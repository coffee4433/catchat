'use client'

import { Check, X } from 'lucide-react'
import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { getPendingRequests, acceptFriendRequest, rejectFriendRequest, type FriendRequestWithUser } from '@/app/actions/friends'
import { createDirectConversation } from '@/app/actions/chat'

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function FriendRequestsPanel({
  currentUserId,
  onChatWithUser,
}: {
  currentUserId: string
  onChatWithUser?: (id: number) => void
}) {
  const { data: requests = [], mutate } = useSWR(
    'friend-requests',
    getPendingRequests,
    { refreshInterval: 5000, revalidateOnFocus: true },
  )

  const [acting, setActing] = useState<string | null>(null)

  const incoming = requests.filter((r) => r.status === 'pending' && r.toUserId === currentUserId)

  const handleAccept = async (req: FriendRequestWithUser) => {
    if (acting) return
    setActing(req.id)
    try {
      await acceptFriendRequest(req.id)
      const { id } = await createDirectConversation(req.fromUserId)
      globalMutate('conversations')
      onChatWithUser?.(id)
    } finally {
      setActing(null)
      mutate()
    }
  }

  const handleReject = async (reqId: string) => {
    if (acting) return
    setActing(reqId)
    try {
      await rejectFriendRequest(reqId)
    } finally {
      setActing(null)
      mutate()
    }
  }

  if (incoming.length === 0) return null

  return (
    <div className="mt-3">
      <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        Pending Requests
      </p>
      <div className="mt-1 space-y-0.5">
        {incoming.map((req) => (
          <div
            key={req.id}
            className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/70"
          >
            <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[10px] font-semibold text-muted-foreground">
              {req.fromUser.image ? (
                <img
                  src={req.fromUser.image}
                  alt=""
                  className="size-7 rounded-full object-cover"
                />
              ) : (
                initialsOf(req.fromUser.name)
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
              {req.fromUser.name}
            </span>
            <button
              onClick={() => handleAccept(req)}
              disabled={acting !== null}
              className="rounded-md p-1 text-green-500 opacity-0 transition-all hover:bg-green-500/10 group-hover:opacity-100"
              title="Accept"
            >
              <Check className="size-3.5" />
            </button>
            <button
              onClick={() => handleReject(req.id)}
              disabled={acting !== null}
              className="rounded-md p-1 text-red-500 opacity-0 transition-all hover:bg-red-500/10 group-hover:opacity-100"
              title="Reject"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
