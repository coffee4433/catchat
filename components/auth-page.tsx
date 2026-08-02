import { AuthCard } from '@/components/auth/auth-card'
import { AuthBackground } from '@/components/auth/auth-background'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  return (
    <div className="bg-[#0d0d0d] text-foreground">
      <AuthBackground />
      <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-12">
        <div className="relative z-10 w-full max-w-md">
          <AuthCard initialMode={mode} />
        </div>
      </main>
    </div>
  )
}
