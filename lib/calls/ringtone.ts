/**
 * Lightweight WebAudio ringtone generator (no audio assets needed).
 * `kind: 'incoming'` plays a classic dual-tone ring; `kind: 'outgoing'`
 * plays a softer single-tone dial beep.
 */
export function createRinger(kind: 'incoming' | 'outgoing') {
  let ctx: AudioContext | null = null
  let interval: ReturnType<typeof setInterval> | null = null
  let muted = false

  const playBurst = () => {
    if (!ctx || muted) return
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(kind === 'incoming' ? 0.08 : 0.05, now + 0.02)

    const osc1 = ctx.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.value = kind === 'incoming' ? 440 : 425
    osc1.connect(gain)
    osc1.start(now)

    let osc2: OscillatorNode | null = null
    if (kind === 'incoming') {
      osc2 = ctx.createOscillator()
      osc2.type = 'sine'
      osc2.frequency.value = 480
      osc2.connect(gain)
      osc2.start(now)
    }

    const dur = kind === 'incoming' ? 1.2 : 0.9
    gain.gain.setValueAtTime(kind === 'incoming' ? 0.08 : 0.05, now + dur - 0.08)
    gain.gain.linearRampToValueAtTime(0, now + dur)
    osc1.stop(now + dur)
    osc2?.stop(now + dur)
  }

  return {
    start() {
      try {
        if (!ctx) ctx = new AudioContext()
        if (ctx.state === 'suspended') ctx.resume().catch(() => {})
        playBurst()
        interval = setInterval(playBurst, kind === 'incoming' ? 3000 : 2400)
      } catch {
        /* audio unavailable */
      }
    },
    setMuted(m: boolean) {
      muted = m
    },
    stop() {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
      ctx?.close().catch(() => {})
      ctx = null
    },
  }
}
