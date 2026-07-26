/**
 * Deepgram Real-Time Speech-to-Text Streaming
 * 
 * Uses Deepgram's WebSocket API for true real-time transcription.
 * Text appears word-by-word as the user speaks.
 * Free tier: 45,000 minutes (no credit card required).
 */

export interface DeepgramStreamCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void
  onError: (error: string) => void
  onClose: () => void
}

export class DeepgramStreamer {
  private socket: WebSocket | null = null
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private lastInterimText: string = ''

  async start(language: string, callbacks: DeepgramStreamCallbacks): Promise<boolean> {
    // 1. Get API key from server
    let apiKey: string
    try {
      const res = await fetch('/api/deepgram-token')
      if (!res.ok) {
        callbacks.onError('Deepgram API key not configured')
        return false
      }
      const data = await res.json()
      apiKey = data.apiKey
      if (!apiKey) {
        callbacks.onError('No Deepgram API key available')
        return false
      }
    } catch {
      callbacks.onError('Failed to get Deepgram token')
      return false
    }

    // 2. Get microphone stream
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      callbacks.onError('Microphone access denied')
      return false
    }

    // 3. Open WebSocket to Deepgram
    const lang = language === 'es' ? 'es' : 'en'
    // endpointing=3000 gives 3 seconds of silence before finalizing an utterance
    // This prevents premature splitting of continuous speech
    const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=${lang}&smart_format=true&interim_results=true&punctuate=true&endpointing=3000&utterance_end_ms=3000`

    this.socket = new WebSocket(wsUrl, ['token', apiKey])

    this.socket.onopen = () => {
      // 4. Start streaming audio to Deepgram
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : undefined

      this.mediaRecorder = new MediaRecorder(this.stream!, { mimeType })

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(event.data)
        }
      }

      // Send audio chunks every 150ms for real-time feel
      this.mediaRecorder.start(150)
    }

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const transcript = data?.channel?.alternatives?.[0]?.transcript
        if (transcript) {
          const isFinal = data.is_final === true
          if (!isFinal) {
            this.lastInterimText = transcript
          } else {
            this.lastInterimText = ''
          }
          callbacks.onTranscript(transcript, isFinal)
        }
      } catch {
        // ignore parse errors
      }
    }

    this.socket.onerror = () => {
      callbacks.onError('Deepgram WebSocket error')
    }

    this.socket.onclose = () => {
      callbacks.onClose()
    }

    return true
  }

  /**
   * Returns the last interim (non-finalized) text that was being transcribed
   * when stop() is called. This ensures we don't lose speech that hasn't
   * been finalized yet by Deepgram.
   */
  getLastInterim(): string {
    return this.lastInterimText
  }

  stop() {
    // 1. Stop MediaRecorder to flush remaining audio
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop() } catch {}
      this.mediaRecorder = null
    }
    // 2. Stop microphone
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
    // 3. Close WebSocket (give a brief delay for last messages)
    if (this.socket) {
      const sock = this.socket
      this.socket = null
      if (sock.readyState === WebSocket.OPEN) {
        sock.send(JSON.stringify({ type: 'CloseStream' }))
        // Wait 500ms for Deepgram to flush remaining transcriptions before closing
        setTimeout(() => {
          try { sock.close() } catch {}
        }, 500)
      } else {
        try { sock.close() } catch {}
      }
    }
  }
}
