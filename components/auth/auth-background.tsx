'use client'

import { useEffect, useRef } from 'react'

export function AuthBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let dots: {
      x: number; y: number; r: number; vx: number; vy: number
      o: number; pulse: number
    }[] = []

    const COUNT = 50

    function resize() {
      canvas!.width = innerWidth
      canvas!.height = innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < COUNT; i++) {
      dots.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        o: Math.random() * 0.5 + 0.3,
        pulse: Math.random() * Math.PI * 2,
      })
    }

    // shooting stars
    let stars: {
      x: number; y: number; vx: number; vy: number
      life: number; decay: number; len: number
    }[] = []

    function spawnStar() {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 3
      const cx = canvas!.width / 2
      const cy = canvas!.height / 2
      const radius = Math.max(canvas!.width, canvas!.height) * 0.7
      stars.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: -Math.cos(angle) * speed,
        vy: -Math.sin(angle) * speed,
        life: 1,
        decay: 0.008 + Math.random() * 0.012,
        len: 80 + Math.random() * 120,
      })
    }

    const starInterval = setInterval(spawnStar, 2500)
    spawnStar()

    let raf: number
    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      // shooting stars
      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i]
        s.x += s.vx
        s.y += s.vy
        s.life -= s.decay
        if (s.life <= 0) { stars.splice(i, 1); continue }
        const a = Math.atan2(s.vy, s.vx)
        const ex = s.x - Math.cos(a) * s.len
        const ey = s.y - Math.sin(a) * s.len
        const grad = ctx!.createLinearGradient(s.x, s.y, ex, ey)
        grad.addColorStop(0, `rgba(255,255,255,${s.life})`)
        grad.addColorStop(1, 'rgba(255,255,255,0)')
        ctx!.beginPath()
        ctx!.moveTo(s.x, s.y)
        ctx!.lineTo(ex, ey)
        ctx!.strokeStyle = grad
        ctx!.lineWidth = 1.2
        ctx!.stroke()
      }

      // particles
      for (const d of dots) {
        d.x += d.vx
        d.y += d.vy
        if (d.x < 0) d.x = canvas.width
        if (d.x > canvas.width) d.x = 0
        if (d.y < 0) d.y = canvas.height
        if (d.y > canvas.height) d.y = 0
        d.pulse += 0.015
        const alpha = d.o + Math.sin(d.pulse) * 0.2
        ctx!.beginPath()
        ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(255,255,255,${alpha})`
        ctx!.fill()
      }

      // connections
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x
          const dy = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            ctx!.beginPath()
            ctx!.moveTo(dots[i].x, dots[i].y)
            ctx!.lineTo(dots[j].x, dots[j].y)
            ctx!.strokeStyle = `rgba(255,255,255,${0.04 * (1 - dist / 100)})`
            ctx!.lineWidth = 0.5
            ctx!.stroke()
          }
        }
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      clearInterval(starInterval)
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <>
      {/* Aurora mesh */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(139,92,246,0.12) 0%, transparent 55%),' +
            'radial-gradient(ellipse at 70% 60%, rgba(6,182,212,0.1) 0%, transparent 55%),' +
            'radial-gradient(ellipse at 50% 80%, rgba(236,72,153,0.08) 0%, transparent 55%),' +
            'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.03) 0%, transparent 40%)',
        }}
      />
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
      />
      {/* Magic border */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] overflow-hidden rounded-2xl">
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '1px',
            overflow: 'hidden',
          }}
        >
          <div
            className="absolute top-1/2 left-1/2 animate-[magic-spin_10s_linear_infinite] opacity-70"
            style={{
              width: '300vh',
              height: '300vh',
              transform: 'translate(-50%, -50%)',
              background:
                'conic-gradient(from 0deg,' +
                'transparent 0%, transparent 15%, rgba(139,92,246,0.12) 20%, rgba(139,92,246,0.3) 22%, rgba(255,255,255,0.5) 23.5%, rgba(139,92,246,0.12) 25%,' +
                'transparent 25%, transparent 40%, rgba(6,182,212,0.1) 45%, rgba(6,182,212,0.25) 47%, rgba(255,255,255,0.4) 48.5%, rgba(6,182,212,0.1) 50%,' +
                'transparent 50%, transparent 65%, rgba(236,72,153,0.1) 70%, rgba(236,72,153,0.25) 72%, rgba(255,255,255,0.4) 73.5%, rgba(236,72,153,0.1) 75%,' +
                'transparent 75%, transparent 90%, rgba(139,92,246,0.1) 95%, rgba(139,92,246,0.25) 97%, rgba(255,255,255,0.4) 98.5%, rgba(139,92,246,0.1) 100%)',
            }}
          />
        </div>
      </div>
    </>
  )
}
