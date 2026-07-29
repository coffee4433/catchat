export type CallType = 'voice' | 'video'

export interface CallInvitePayload {
  from: string
  fromName: string
  callId: string
  conversationId: number
  callType: CallType
}

export interface CallReplyPayload {
  from: string
  callId: string
}

export interface ActiveCall {
  callId: string
  conversationId: number
  callType: CallType
  state: 'outgoing-ringing' | 'incoming-ringing' | 'in-call' | 'ended' | 'cancelled' | 'no-answer'
  peerName: string
  peerImage?: string | null
  token?: string
  livekitUrl?: string
}
