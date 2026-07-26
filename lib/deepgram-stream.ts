/**
 * Deepgram Real-Time Speech-to-Text Streaming
 * 
 * Streams 16kHz 16-bit Linear PCM audio over WebSocket with KeepAlive
 * for unlimited duration continuous dictation with smart formatting,
 * punctuation, diacritics (accents), and spelling correction like Google.
 */

export interface DeepgramStreamCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void
  onError: (error: string) => void
  onClose: () => void
}

export class DeepgramStreamer {
  private socket: WebSocket | null = null
  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private processor: ScriptProcessorNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private keepAliveTimer: any = null

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

    // 3. Open WebSocket to Deepgram with raw 16kHz PCM encoding & smart formatting (accents + punctuation)
    const langCode = language === 'es' ? 'es' : 'en'
    const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=${langCode}&encoding=linear16&sample_rate=16000&smart_format=true&punctuate=true&diacritize=true`

    this.socket = new WebSocket(wsUrl, ['token', apiKey])

    this.socket.onopen = () => {
      // Send KeepAlive every 4 seconds so WebSocket connection NEVER times out in long conversations
      this.keepAliveTimer = setInterval(() => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          try {
            this.socket.send(JSON.stringify({ type: 'KeepAlive' }))
          } catch {}
        }
      }, 4000)

      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        this.audioContext = new AudioCtx({ sampleRate: 16000 })
        this.source = this.audioContext.createMediaStreamSource(this.stream!)
        
        // Use 4096 buffer size (~250ms chunks)
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1)

        this.source.connect(this.processor)
        this.processor.connect(this.audioContext.destination)

        this.processor.onaudioprocess = (e) => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0)
            const pcmBuffer = new Int16Array(inputData.length)
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]))
              pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7fff
            }
            this.socket.send(pcmBuffer.buffer)
          }
        }
      } catch (err) {
        console.error('Failed to setup AudioContext for Deepgram:', err)
        callbacks.onError('Audio processing error')
      }
    }

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const transcript = data?.channel?.alternatives?.[0]?.transcript
        if (typeof transcript === 'string') {
          const isFinal = data.is_final === true || data.speech_final === true
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
      if (this.keepAliveTimer) {
        clearInterval(this.keepAliveTimer)
        this.keepAliveTimer = null
      }
      callbacks.onClose()
    }

    return true
  }

  stop() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer)
      this.keepAliveTimer = null
    }
    if (this.processor) {
      try { this.processor.disconnect() } catch {}
      this.processor = null
    }
    if (this.source) {
      try { this.source.disconnect() } catch {}
      this.source = null
    }
    if (this.audioContext) {
      try { this.audioContext.close() } catch {}
      this.audioContext = null
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
    if (this.socket) {
      const sock = this.socket
      this.socket = null
      if (sock.readyState === WebSocket.OPEN) {
        try { sock.send(JSON.stringify({ type: 'CloseStream' })) } catch {}
        try { sock.close() } catch {}
      }
    }
  }
}
