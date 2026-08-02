'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  AtSign,
  Check,
  Eye,
  EyeOff,
  Lock,
  User,
} from 'lucide-react'
import { authClient } from '@/lib/auth-client'

function Field({
  id,
  label,
  type = 'text',
  placeholder,
  icon,
  autoComplete,
  value,
  onChange,
}: {
  id: string
  label: string
  type?: string
  placeholder: string
  icon: React.ReactNode
  autoComplete?: string
  value: string
  onChange: (v: string) => void
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[11px] font-medium tracking-wide text-white/40 uppercase">
        {label}
      </label>
      <div className="group flex items-center gap-3 rounded-xl border border-white/[0.12] bg-white/[0.015] px-3.5 py-3 backdrop-blur-[2px] transition-all duration-300 focus-within:border-purple-400/50 focus-within:bg-white/[0.04] focus-within:shadow-[0_0_20px_rgba(139,92,246,0.12)]">
        <span className="text-white/30 transition-colors group-focus-within:text-purple-400">
          {icon}
        </span>
        <input
          id={id}
          name={id}
          type={isPassword && showPassword ? 'text' : type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm text-white placeholder:text-white/20 outline-none"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="text-white/30 transition-colors hover:text-white/60"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  )
}

export function AuthCard({ initialMode }: { initialMode: 'login' | 'register' }) {
  const router = useRouter()
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)

  const isLogin = mode === 'login'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status !== 'idle') return
    setError(null)
    setStatus('loading')

    const { error: authError } = isLogin
      ? await authClient.signIn.email({ email, password })
      : await authClient.signUp.email({ email, password, name })

    if (authError) {
      setError(authError.message ?? 'Something went wrong')
      setStatus('idle')
      return
    }

    setStatus('success')
    setTimeout(() => {
      router.push('/')
      router.refresh()
    }, 800)
  }

  function switchMode(next: 'login' | 'register') {
    if (next !== mode) setMode(next)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.175, 0.885, 0.32, 1.275] }}
      className="w-full"
    >
      <div
        className="relative overflow-hidden rounded-[2rem] border border-white/[0.12] p-6 sm:p-8"
        style={{
          background: 'linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 40%, rgba(255,255,255,0.02) 100%)',
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.15) inset, 0 24px 70px rgba(0,0,0,0.45), 0 0 80px rgba(139,92,246,0.08), 0 0 140px rgba(6,182,212,0.05)',
        }}
      >
        {/* Inner aurora glow, sutil para no tapar el cristal */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(ellipse at 25% 15%, rgba(139,92,246,0.10) 0%, transparent 50%),' +
              'radial-gradient(ellipse at 78% 65%, rgba(6,182,212,0.08) 0%, transparent 50%),' +
              'radial-gradient(ellipse at 50% 90%, rgba(236,72,153,0.06) 0%, transparent 50%)',
          }} />

        {/* Top sheen line, típico del vidrio */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }} />

        {/* Logo */}
        <div className="relative mb-6 flex justify-center">
          <motion.img
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }}
            src="/cat-chat-logo.png"
            alt="CatChat Logo"
            className="relative z-10 h-36 w-36 object-contain drop-shadow-[0_8px_28px_rgba(139,92,246,0.35)]"
          />
        </div>

        {/* Tab switcher */}
        <div className="relative mx-auto mb-8 flex w-fit gap-0.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-0.5">
          {(['login', 'register'] as const).map((m) => {
            const selected = mode === m
            return (
              <button
                key={m}
                role="tab"
                aria-selected={selected}
                onClick={() => switchMode(m)}
                className={`relative rounded-lg px-4 py-1.5 text-[12.5px] font-medium tracking-tight transition-all duration-300 ${
                  selected
                    ? 'text-white'
                    : 'text-white/35 hover:text-white/60'
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId="auth-tab-pill"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.2))',
                      boxShadow: '0 0 16px rgba(139,92,246,0.25), inset 0 0 0 1px rgba(255,255,255,0.08)',
                    }}
                  />
                )}
                <span className="relative z-10">{m === 'login' ? 'Sign In' : 'Sign Up'}</span>
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: isLogin ? -24 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isLogin ? 24 : -24 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="mb-7">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {isLogin ? 'Welcome back' : 'Join the pack'}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/40">
                {isLogin
                  ? 'Your chats missed you. Sign in and continue the conversation.'
                  : 'Create your account in seconds and start chatting.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {!isLogin && (
                <Field
                  id="name"
                  label="Name"
                  placeholder="your_name"
                  icon={<User className="h-4 w-4" />}
                  autoComplete="name"
                  value={name}
                  onChange={setName}
                />
              )}
              <Field
                id="email"
                label="Email"
                type="email"
                placeholder="you@email.com"
                icon={<AtSign className="h-4 w-4" />}
                autoComplete="email"
                value={email}
                onChange={setEmail}
              />
              <Field
                id="password"
                label="Password"
                type="password"
                placeholder="••••••••••"
                icon={<Lock className="h-4 w-4" />}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={password}
                onChange={setPassword}
              />

              {isLogin && (
                <div className="flex justify-end">
                  <button type="button" className="text-[11px] text-purple-400/60 transition-opacity hover:text-purple-400">
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <p className="text-center text-sm font-medium text-red-400" role="alert">
                  {error}
                </p>
              )}

              <motion.button
                type="submit"
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.97 }}
                disabled={status === 'loading'}
                className="group mt-2 flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-[13px] font-semibold tracking-tight text-white transition-all duration-300 disabled:cursor-not-allowed"
                style={{
                  ...(status === 'success'
                    ? {
                        background: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(22,163,74,0.14))',
                        border: '1px solid rgba(34,197,94,0.3)',
                        boxShadow: '0 0 20px rgba(34,197,94,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                      }
                    : {
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.12))',
                        border: '1px solid rgba(255,255,255,0.15)',
                        boxShadow: '0 0 20px rgba(139,92,246,0.15), 0 0 40px rgba(6,182,212,0.06), inset 0 1px 0 rgba(255,255,255,0.12)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                      }),
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {status === 'loading' ? (
                    <motion.span
                      key="loading"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center gap-2"
                    >
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Loading...
                    </motion.span>
                  ) : status === 'success' ? (
                    <motion.span
                      key="success"
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {isLogin ? 'Welcome!' : 'Account created!'}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center gap-1.5"
                    >
                      {isLogin ? 'Sign in to CatChat' : 'Create my account'}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </form>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}