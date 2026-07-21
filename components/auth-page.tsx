import { AuroraBackground } from '@/components/auth/aurora-background'
import { AuthCard } from '@/components/auth/auth-card'
import { FloatingBubbles } from '@/components/auth/floating-bubbles'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  return (
    <div data-theme="catchat" className="bg-background text-foreground">
      <main className="relative min-h-svh overflow-hidden">
        {/* Animated gradient background */}
        <AuroraBackground />

        {/* Terminal-style status indicator */}
        <p className="absolute left-6 top-6 z-10 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          catchat.core // v9.0
        </p>

        {/* Main content: decorative bubbles on left, auth card on right */}
        <div className="relative z-10 mx-auto grid min-h-svh w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-20">
          <FloatingBubbles />
          <div className="flex justify-center lg:justify-end">
            <AuthCard initialMode={mode} />
          </div>
        </div>
      </main>
    </div>
  )
}
