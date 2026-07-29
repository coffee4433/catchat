'use client'

import { motion } from 'framer-motion'
import { CatLogo } from './cat-logo'

// Simulated chat bubbles displayed on the auth page for visual appeal
const bubbles = [
  {
    from: 'Michi_99',
    text: 'lol check this out 😸',
    side: 'left' as const,
    delay: 0.4,
    float: 'animate-float-slow',
  },
  {
    from: 'Luna',
    text: 'hey guys what\'s up?',
    side: 'right' as const,
    delay: 0.8,
    float: 'animate-float-slower',
  },
  {
    from: 'Garfield_x',
    text: 'works for me 👍',
    side: 'left' as const,
    delay: 1.2,
    float: 'animate-float-slow',
  },
]

export function FloatingBubbles() {
  return (
    <div className="relative hidden h-full flex-col justify-center gap-8 lg:flex">
      {/* Logo and brand header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="flex items-center gap-4"
      >
        <div className="animate-float-slower relative">
          <div className="absolute inset-0 rounded-3xl bg-primary/30 blur-2xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/30 bg-secondary">
            <CatLogo className="h-11 w-11" />
          </div>
        </div>
        <div>
          <h1 className="text-shimmer text-5xl font-bold tracking-tight">
            CatChat
          </h1>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            miau.protocol // on-line
          </p>
        </div>
      </motion.div>



      {/* Animated chat bubbles demo */}
      <div className="flex max-w-md flex-col gap-4" aria-hidden="true">
        {bubbles.map((b) => (
          <motion.div
            key={b.from}
            initial={{ opacity: 0, x: b.side === 'left' ? -40 : 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{
              duration: 0.6,
              delay: b.delay,
              type: 'spring',
              bounce: 0.45,
            }}
            className={`${b.float} ${b.side === 'right' ? 'self-end' : 'self-start'}`}
          >
            <div
              className={`glass-card max-w-xs rounded-3xl border px-5 py-3.5 ${
                b.side === 'right'
                  ? 'rounded-br-md border-accent/30'
                  : 'rounded-bl-md border-primary/20'
              }`}
            >
              <p
                className={`font-mono text-[10px] uppercase tracking-widest ${
                  b.side === 'right' ? 'text-accent' : 'text-primary'
                }`}
              >
                {b.from}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                {b.text}
              </p>
            </div>
          </motion.div>
        ))}

        {/* Typing indicator bubble */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.7 }}
          className="animate-float-slower self-start"
        >
          <div className="glass-card flex items-center gap-1.5 rounded-3xl rounded-bl-md border border-primary/20 px-5 py-4">
            <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
            <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
            <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
