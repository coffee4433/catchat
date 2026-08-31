'use client'

import { useEffect, useRef } from 'react'

interface Dot {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  baseAlpha: number
  phase: number
}

interface Star {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  decay: number
  len: number
}

const DOT_COUNT = 30
const STAR_INTERVAL = 1400
const STAR_MAX = 8

export function ChatBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const dots: Dot[] = []
    const stars: Star[] = []
    let raf = 0

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = innerWidth * dpr
      canvas!.height = innerHeight * dpr
      canvas!.style.width = `${innerWidth}px`
      canvas!.style.height = `${innerHeight}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()
    window.addEventListener('resize', size)

    for (let i = 0; i < DOT_COUNT; i++) {
      dots.push({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        r: Math.random() * 1.4 + 0.4,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        baseAlpha: Math.random() * 0.35 + 0.15,
        phase: Math.random() * Math.PI * 2,
      })
    }

    function spawnStar() {
      if (stars.length >= STAR_MAX) return
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 3.5
      const cx = innerWidth / 2
      const cy = innerHeight / 2
      const radius = Math.max(innerWidth, innerHeight) * 0.6
      const longTrail = Math.random() < 0.4
      stars.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: -Math.cos(angle) * speed,
        vy: -Math.sin(angle) * speed,
        life: 1,
        decay: longTrail ? 0.004 + Math.random() * 0.006 : 0.008 + Math.random() * 0.014,
        len: longTrail ? 200 + Math.random() * 250 : 50 + Math.random() * 100,
      })
    }

    const starTimer = setInterval(spawnStar, STAR_INTERVAL)
    spawnStar()
    setTimeout(spawnStar, 300)

    let lastTime = 0
    function draw(time: number) {
      raf = requestAnimationFrame(draw)

      if (time - lastTime < 14) return
      lastTime = time

      const w = innerWidth
      const h = innerHeight
      ctx!.clearRect(0, 0, w, h)

      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i]
        s.x += s.vx
        s.y += s.vy
        s.life -= s.decay
        if (s.life <= 0) {
          stars.splice(i, 1)
          continue
        }
        const a = Math.atan2(s.vy, s.vx)
        const ex = s.x - Math.cos(a) * s.len
        const ey = s.y - Math.sin(a) * s.len
        const isLong = s.len > 160
        ctx!.beginPath()
        ctx!.arc(s.x, s.y, isLong ? 1.8 : 1.0, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(255,255,255,${Math.min(s.life * 1.2, 1).toFixed(3)})`
        ctx!.fill()
        const grad = ctx!.createLinearGradient(s.x, s.y, ex, ey)
        grad.addColorStop(0, `rgba(255,255,255,${Math.min(s.life, 1).toFixed(3)})`)
        grad.addColorStop(1, 'rgba(255,255,255,0)')
        ctx!.beginPath()
        ctx!.moveTo(s.x, s.y)
        ctx!.lineTo(ex, ey)
        ctx!.strokeStyle = grad
        ctx!.lineWidth = isLong ? 1.3 : 0.9
        ctx!.stroke()
      }

      for (const d of dots) {
        d.x += d.vx
        d.y += d.vy
        if (d.x < 0) d.x = w
        if (d.x > w) d.x = 0
        if (d.y < 0) d.y = h
        if (d.y > h) d.y = 0
        d.phase += 0.012
        const alpha = d.baseAlpha + Math.sin(d.phase) * 0.12
        if (alpha <= 0.02) continue
        ctx!.beginPath()
        ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`
        ctx!.fill()
      }
    }

    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(starTimer)
      window.removeEventListener('resize', size)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    />
  )
}
