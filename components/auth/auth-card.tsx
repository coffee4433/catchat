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
  Sparkles,
  User,
} from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { CatLogo } from './cat-logo'

// Reusable form field with icon, label, and optional password visibility toggle
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
      <label
        htmlFor={id}
        className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
      >
        {label}
      </label>
      <div className="input-glow group flex items-center gap-3 rounded-2xl border border-border bg-input px-4 py-3.5 transition-all duration-300">
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
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
        />
        {/* Toggle password visibility for password fields */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="text-muted-foreground transition-colors hover:text-primary"
            aria-label={
              showPassword ? 'Hide password' : 'Show password'
            }
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
  // Track form submission status for UI feedback
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)

  const isLogin = mode === 'login'

  // Handle sign-in or sign-up form submission
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

    // Brief success animation before redirecting to home
    setStatus('success')
    setTimeout(() => {
      router.push('/')
      router.refresh()
    }, 800)
  }

  // Navigate between login and register modes
  function switchMode(next: 'login' | 'register') {
    if (next !== mode) {
      setMode(next)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="group relative w-full max-w-md perspective-1000"
    >
      <div className="animate-pulse-glow absolute -inset-1 rounded-[2.5rem] bg-primary/15 blur-2xl" />

      <div className="card-3d glass-card relative overflow-hidden rounded-[2rem] border border-border p-7 shadow-2xl sm:p-9">
        {/* Top gradient accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

        {/* Mobile logo header */}
        <div className="mb-7 flex items-center gap-3 lg:hidden">
          <CatLogo className="h-9 w-9" />
          <span className="text-shimmer text-2xl font-bold">CatChat</span>
        </div>

        {/* Tab switcher between Sign In and Sign Up */}
        <div
          role="tablist"
          aria-label="Authentication mode"
          className="relative mb-8 grid grid-cols-2 rounded-2xl border border-border bg-input p-1"
        >
          {/* Animated sliding indicator */}
          <motion.div
            layout
            className="absolute inset-y-1 w-[calc(50%-4px)] rounded-xl bg-primary"
            style={{ left: isLogin ? '4px' : 'calc(50% + 4px)' }}
            transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
          />
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`relative z-10 rounded-xl py-2.5 text-sm font-semibold transition-colors duration-300 ${
                mode === m
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Animated form container – swaps between login and register */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: isLogin ? -24 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isLogin ? 24 : -24 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Heading and subtitle */}
            <div className="mb-7">
              <h2 className="text-balance text-3xl font-bold tracking-tight">
                {isLogin ? 'Welcome back' : 'Join the pack'}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {isLogin
                  ? 'Your chats missed you. Sign in and continue the conversation.'
                  : 'Create your account in seconds and start chatting.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Name field only shown during registration */}
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

              {/* Forgot password link only on sign-in */}
              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs font-medium text-primary transition-opacity hover:opacity-75"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}

              {/* Error message display */}
              {error && (
                <p className="text-sm text-destructive text-center" role="alert">
                  {error}
                </p>
              )}

              {/* Submit button with animated states: idle -> loading -> success */}
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={status === 'loading'}
                className={`group relative mt-1 flex items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 text-sm font-bold transition-colors duration-300 ${
                  status === 'success'
                    ? 'btn-success text-white'
                    : 'bg-primary text-primary-foreground'
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
                {/* Hover shine effect */}
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </motion.button>
            </form>


          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
