'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  AtSign,
  Cat,
  Check,
  Eye,
  EyeOff,
  Lock,
  User,
} from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { CatLogo } from './cat-logo'

// Mechanical spring easing (overshoot) used across the industrial system.
const EASE_MECH: [number, number, number, number] = [0.175, 0.885, 0.32, 1.275]

// Recessed data-slot field: inset neumorphic well, mono label, LED-glow focus.
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
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="stamp text-[10px] text-muted-foreground emboss"
      >
        {label}
      </label>
      <div className="group flex items-center gap-3 rounded-xl bg-input px-4 py-3.5 shadow-[var(--shadow-neu-inset)] transition-shadow duration-300 focus-within:shadow-[var(--shadow-neu-inset),0_0_0_2px_var(--ring)]">
        <span className="text-muted-foreground transition-colors group-focus-within:text-primary">
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
          className="w-full bg-transparent text-sm font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/60"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="text-muted-foreground transition-colors hover:text-primary"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
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
      transition={{ duration: 0.7, ease: EASE_MECH }}
      className="w-full"
    >
      {/* Bolted plastic chassis: dual-shadow extrusion + machined corner screws */}
      <div className="screws relative overflow-hidden rounded-[1.75rem] bg-card p-7 shadow-[var(--shadow-neu)] sm:p-9">
        {/* Header: recessed icon housing, wordmark, live status LED */}
        <div className="mb-7 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-input shadow-[var(--shadow-neu-inset)]">
            <CatLogo className="h-7 w-7" />
          </span>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-foreground emboss">
              CatChat
            </span>
            <span className="stamp flex items-center gap-1.5 text-[9px] text-muted-foreground">
              <span className="led text-[color:var(--success)]" style={{ color: 'var(--success)' }} />
              system online
            </span>
          </div>
        </div>

        {/* Tab switcher: recessed track, extruded active key */}
        <div
          role="tablist"
          aria-label="Authentication mode"
          className="relative mb-8 grid grid-cols-2 gap-1.5 rounded-2xl bg-input p-1.5 shadow-[var(--shadow-neu-inset)]"
        >
          {(['login', 'register'] as const).map((m) => {
            const selected = mode === m
            return (
              <button
                key={m}
                role="tab"
                aria-selected={selected}
                onClick={() => switchMode(m)}
                className={`stamp relative z-10 rounded-xl py-2.5 text-xs transition-all duration-300 ${
                  selected
                    ? 'bg-card text-primary shadow-[var(--shadow-neu-sm)]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
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
              <h2 className="text-balance text-2xl font-extrabold tracking-tight text-foreground emboss">
                {isLogin ? 'Welcome back' : 'Join the pack'}
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
                {isLogin
                  ? 'Your chats missed you. Sign in and continue the conversation.'
                  : 'Create your account in seconds and start chatting.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                  <button
                    type="button"
                    className="stamp text-[10px] text-primary transition-opacity hover:opacity-70"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <p className="text-center text-sm font-semibold text-destructive" role="alert">
                  {error}
                </p>
              )}

              {/* Tactile accent key: red-tinted extrusion, inverts to pressed on tap */}
              <motion.button
                type="submit"
                whileTap={{ y: 1 }}
                disabled={status === 'loading'}
                className={`stamp group mt-1 flex items-center justify-center gap-2 rounded-2xl py-4 text-xs text-primary-foreground transition-shadow duration-200 ${
                  status === 'success'
                    ? 'bg-[color:var(--success)] shadow-[var(--shadow-neu-sm)]'
                    : 'bg-primary shadow-[var(--shadow-accent)] active:shadow-[var(--shadow-neu-pressed)]'
                }`}
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
                      <Cat className="h-4 w-4 animate-bounce" />
                      Loading...
                    </motion.span>
                  ) : status === 'success' ? (
                    <motion.span
                      key="success"
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      {isLogin ? 'Welcome!' : 'Account created!'}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center gap-2"
                    >
                      {isLogin ? 'Sign in to CatChat' : 'Create my account'}
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
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
