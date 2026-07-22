import { supabase } from '@/lib/supabase/client'
import type { CallInvitePayload } from './types'

export function subscribeIncomingCalls(
  userId: string,
  onRing: (payload: CallInvitePayload) => void,
) {
  const channel = supabase
    .channel(`incoming-calls:${userId}`)
    .on('broadcast', { event: 'call:invite' }, ({ payload }) => {
      onRing(payload as CallInvitePayload)
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function createCallChannel(conversationId: number) {
  return supabase.channel(`call:${conversationId}`, {
    config: { broadcast: { self: false } },
  })
}

export async function subscribeAndWait(channel: ReturnType<typeof supabase.channel>): Promise<void> {
  return new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        resolve()
      }
    })
  })
}

export async function broadcastCallInvite(payload: CallInvitePayload, calleeId: string) {
  const channel = supabase.channel(`incoming-calls:${calleeId}`, {
    config: { broadcast: { self: false } },
  })

  await subscribeAndWait(channel)

  await channel.send({
    type: 'broadcast',
    event: 'call:invite',
    payload,
  })

  setTimeout(() => {
    supabase.removeChannel(channel)
  }, 5000)
}

export async function sendCallSignal(
  channel: ReturnType<typeof createCallChannel>,
  event: string,
  payload: Record<string, unknown>,
) {
  await channel.send({
    type: 'broadcast',
    event,
    payload,
  })
}
