import { supabase } from '@/lib/supabase/client'
import type { CallSignal, CallRequestPayload } from './types'

export function subscribeIncomingCalls(
  userId: string,
  onRing: (payload: CallRequestPayload) => void,
) {
  const channel = supabase
    .channel(`incoming-calls:${userId}`)
    .on('broadcast', { event: 'call-request' }, ({ payload }) => {
      onRing(payload as CallRequestPayload)
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

export function subscribeCallChannel(
  conversationId: number,
  handlers: {
    onAccept: (p: { from: string; callId: string }) => void
    onReject: (p: { from: string; callId: string; reason?: string }) => void
    onCancel: (p: { from: string; callId: string }) => void
    onSdpOffer: (p: { from: string; callId: string; sdp: RTCSessionDescriptionInit }) => void
    onSdpAnswer: (p: { from: string; callId: string; sdp: RTCSessionDescriptionInit }) => void
    onIceCandidate: (p: { from: string; callId: string; candidate: RTCIceCandidateInit }) => void
    onRenegotiate: (p: { from: string; callId: string; sdp: RTCSessionDescriptionInit }) => void
    onCallEnd: (p: { from: string; callId: string }) => void
    onMediaState: (p: { from: string; callId: string; micOn: boolean; camOn: boolean; screenOn: boolean }) => void
  },
) {
  const channel = createCallChannel(conversationId)

  channel
    .on('broadcast', { event: 'call-accept' }, ({ payload }) => handlers.onAccept(payload))
    .on('broadcast', { event: 'call-reject' }, ({ payload }) => handlers.onReject(payload))
    .on('broadcast', { event: 'call-cancel' }, ({ payload }) => handlers.onCancel(payload))
    .on('broadcast', { event: 'sdp-offer' }, ({ payload }) => handlers.onSdpOffer(payload))
    .on('broadcast', { event: 'sdp-answer' }, ({ payload }) => handlers.onSdpAnswer(payload))
    .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => handlers.onIceCandidate(payload))
    .on('broadcast', { event: 'renegotiate' }, ({ payload }) => handlers.onRenegotiate(payload))
    .on('broadcast', { event: 'call-end' }, ({ payload }) => handlers.onCallEnd(payload))
    .on('broadcast', { event: 'media-state' }, ({ payload }) => handlers.onMediaState(payload))
    .subscribe()

  return channel
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

export async function broadcastCallRequest(payload: CallRequestPayload, calleeId: string) {
  const channel = supabase.channel(`incoming-calls:${calleeId}`, {
    config: { broadcast: { self: false } },
  })

  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        resolve()
      }
    })
  })

  await channel.send({
    type: 'broadcast',
    event: 'call-request',
    payload,
  })

  setTimeout(() => {
    supabase.removeChannel(channel)
  }, 5000)
}
