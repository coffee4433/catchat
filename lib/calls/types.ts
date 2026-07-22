export type CallType = 'audio' | 'video'

export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended'

export type RemoteMediaState = {
  micOn: boolean
  camOn: boolean
  screenOn: boolean
}

export type SignalingEvent =
  | 'call-request'
  | 'call-accept'
  | 'call-reject'
  | 'call-cancel'
  | 'sdp-offer'
  | 'sdp-answer'
  | 'ice-candidate'
  | 'renegotiate'
  | 'call-end'
  | 'media-state'

export interface CallRequestPayload {
  from: string
  callType: CallType
  callId: string
  conversationId: number
}

export interface CallReplyPayload {
  from: string
  callId: string
  reason?: string
}

export interface SdpPayload {
  from: string
  callId: string
  sdp: RTCSessionDescriptionInit
}

export interface IceCandidatePayload {
  from: string
  callId: string
  candidate: RTCIceCandidateInit
}

export interface CallEndPayload {
  from: string
  callId: string
}

export interface MediaStatePayload {
  from: string
  callId: string
  micOn: boolean
  camOn: boolean
  screenOn: boolean
}

export type CallSignal =
  | { event: 'call-request'; payload: CallRequestPayload }
  | { event: 'call-accept'; payload: CallReplyPayload }
  | { event: 'call-reject'; payload: CallReplyPayload }
  | { event: 'call-cancel'; payload: CallReplyPayload }
  | { event: 'sdp-offer'; payload: SdpPayload }
  | { event: 'sdp-answer'; payload: SdpPayload }
  | { event: 'ice-candidate'; payload: IceCandidatePayload }
  | { event: 'renegotiate'; payload: SdpPayload }
  | { event: 'call-end'; payload: CallEndPayload }
  | { event: 'media-state'; payload: MediaStatePayload }

export type CallState =
  | 'idle'
  | 'outgoing-ringing'
  | 'incoming-ringing'
  | 'connecting'
  | 'in-call'
  | 'ended'

export interface ActiveCall {
  callId: string
  conversationId: number
  callType: CallType
  state: CallState
  peerId: string
  peerName: string
  duration: number
  micOn: boolean
  camOn: boolean
  screenOn: boolean
  remoteMediaState: RemoteMediaState
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  screenStream: MediaStream | null
}
