const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
]

export function createPeer() {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS })
}

export class CallConnection {
  pc: RTCPeerConnection
  private queuedCandidates: RTCIceCandidateInit[] = []
  private remoteDescriptionSet = false
  private negotiationLock = false

  onRemoteStream: ((stream: MediaStream) => void) | null = null
  onIceFailed: (() => void) | null = null
  onConnectionLost: (() => void) | null = null
  onNegotiationNeeded: (() => void) | null = null

  constructor() {
    this.pc = createPeer()

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.onIceCandidate?.(e.candidate)
      }
    }

    this.pc.ontrack = (e) => {
      const [stream] = e.streams
      if (stream) {
        this.onRemoteStream?.(stream)
      }
    }

    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState
      if (state === 'failed') this.onIceFailed?.()
      if (state === 'disconnected') this.onConnectionLost?.()
    }

    this.pc.onnegotiationneeded = () => {
      if (this.negotiationLock) return
      this.onNegotiationNeeded?.()
    }
  }

  onIceCandidate: ((c: RTCPeerConnectionIceEvent['candidate']) => void) | null = null

  setOnIceCandidate(cb: (c: RTCPeerConnectionIceEvent['candidate']) => void) {
    this.onIceCandidate = cb
  }

  async addAudioTrack(stream: MediaStream) {
    const audioTrack = stream.getAudioTracks()[0]
    if (audioTrack) {
      const sender = this.pc.getSenders().find((s) => s.track?.kind === 'audio')
      if (sender) {
        await sender.replaceTrack(audioTrack)
      } else {
        this.pc.addTrack(audioTrack, stream)
      }
    }
  }

  async addVideoTrack(stream: MediaStream) {
    const videoTrack = stream.getVideoTracks()[0]
    if (videoTrack) {
      const sender = this.pc.getSenders().find((s) => s.track?.kind === 'video')
      if (sender) {
        await sender.replaceTrack(videoTrack)
      } else {
        this.pc.addTrack(videoTrack, stream)
      }
    }
  }

  async removeVideoTrack() {
    const sender = this.pc.getSenders().find((s) => s.track?.kind === 'video')
    if (sender) {
      this.negotiationLock = true
      this.pc.removeTrack(sender)
      this.negotiationLock = false
    }
  }

  async addScreenTrack(stream: MediaStream) {
    const videoTrack = stream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.contentHint = 'detail'
      videoTrack.onended = () => {
        this.onScreenEnded?.()
      }
      this.pc.addTransceiver(videoTrack, { direction: 'sendonly' })
    }
  }

  onScreenEnded: (() => void) | null = null

  async muteMic() {
    const sender = this.pc.getSenders().find((s) => s.track?.kind === 'audio')
    if (sender) {
      sender.track!.enabled = false
    }
  }

  async unmuteMic() {
    const sender = this.pc.getSenders().find((s) => s.track?.kind === 'audio')
    if (sender) {
      sender.track!.enabled = true
    }
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    return offer
  }

  async handleOffer(sdp: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp))
    this.remoteDescriptionSet = true
    this.applyQueuedCandidates()
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    return answer
  }

  async handleAnswer(sdp: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp))
    this.remoteDescriptionSet = true
    this.applyQueuedCandidates()
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (this.remoteDescriptionSet) {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate))
    } else {
      this.queuedCandidates.push(candidate)
    }
  }

  private async applyQueuedCandidates() {
    while (this.queuedCandidates.length > 0) {
      const c = this.queuedCandidates.shift()!
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(c))
      } catch {
        // ignore
      }
    }
  }

  async negotiate(): Promise<RTCSessionDescriptionInit> {
    this.negotiationLock = true
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    this.negotiationLock = false
    return offer
  }

  async handleRenegotiation(sdp: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp))
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    return answer
  }

  async getStats(): Promise<{ rtt: number; packetLoss: number }> {
    const stats = await this.pc.getStats()
    let rtt = 0
    let packetLoss = 0
    stats.forEach((r) => {
      if (r.type === 'candidate-pair' && r.state === 'succeeded' && r.currentRoundTripTime) {
        rtt = Math.round(r.currentRoundTripTime * 1000)
      }
      if (r.type === 'inbound-rtp' && typeof r.packetsLost === 'number' && typeof r.packetsReceived === 'number') {
        const total = r.packetsLost + r.packetsReceived
        if (total > 0) packetLoss = Math.round((r.packetsLost / total) * 100)
      }
    })
    return { rtt, packetLoss }
  }

  close() {
    this.pc.close()
  }
}

export async function getAudioStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })
}

export async function getVideoStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { width: 1280, height: 720, frameRate: 30 },
  })
}

export async function getAudioVideoStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: { width: 1280, height: 720, frameRate: 30 },
  })
}

export async function getScreenStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 15 },
    audio: false,
  })
}
