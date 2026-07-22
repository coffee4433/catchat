'use client'

import { Phone, Video, PhoneMissed } from 'lucide-react'
import type { CallRecord } from '@/app/actions/calls'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function CallMessageBubble({
  call,
  currentUserId,
}: {
  call: CallRecord
  currentUserId: string
}) {
  const isCaller = call.callerId === currentUserId
  const isMissed = call.status === 'missed' || call.status === 'rejected'
  const duration =
    call.answeredAt && call.endedAt
      ? Math.round((new Date(call.endedAt).getTime() - new Date(call.answeredAt).getTime()) / 1000)
      : 0

  let icon: React.ReactNode
  let label: string

  if (isMissed) {
    icon = <PhoneMissed className="size-4 text-red-500" />
    if (isCaller) {
      label = 'Call not answered'
    } else {
      label = 'Missed call'
    }
  } else if (call.type === 'video') {
    icon = <Video className="size-4 text-primary" />
    label = `Video call · ${formatDuration(duration)}`
  } else {
    icon = <Phone className="size-4 text-primary" />
    label = `Voice call · ${formatDuration(duration)}`
  }

  return (
    <div className="flex items-center justify-center py-2">
      <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
        <span className="text-[10px] text-muted-foreground/50">
          {new Date(call.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
