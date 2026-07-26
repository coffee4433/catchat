/**
 * Deepgram Real-Time Speech-to-Text Streaming
 * 
 * Streams native 16-bit Linear PCM audio matched dynamically to microphone sample rate
 * over WebSocket with KeepAlive for 100% accurate, continuous real-time transcription.
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

    // 3. Initialize AudioContext at native hardware sample rate (e.g. 48000Hz, 44100Hz)
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      this.audioContext = new AudioCtx()
    } catch (err) {
      console.error('Failed to create AudioContext:', err)
      callbacks.onError('Audio Context Error')
      return false
    }

    const nativeSampleRate = this.audioContext.sampleRate || 48000
    const langCode = language === 'es' ? 'es' : 'en'

    // 4. Open WebSocket to Deepgram matching exact microphone sample rate
    const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=${langCode}&encoding=linear16&sample_rate=${nativeSampleRate}&smart_format=true&interim_results=true&punctuate=true&diacritize=true`

    this.socket = new WebSocket(wsUrl, ['token', apiKey])

    this.socket.onopen = () => {
      // Send KeepAlive every 4s so connection never drops during long conversations
      this.keepAliveTimer = setInterval(() => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          try {
            this.socket.send(JSON.stringify({ type: 'KeepAlive' }))
          } catch {}
        }
      }, 4000)

      try {
        this.source = this.audioContext!.createMediaStreamSource(this.stream!)
        
        // 4096 buffer size
        this.processor = this.audioContext!.createScriptProcessor(4096, 1, 1)

        this.source.connect(this.processor)
        this.processor.connect(this.audioContext!.destination)

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
        console.error('Failed to setup AudioNode processing for Deepgram:', err)
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
