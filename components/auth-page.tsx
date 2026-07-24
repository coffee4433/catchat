import { AuthCard } from '@/components/auth/auth-card'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  return (
    <div className="bg-background text-foreground">
      <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-12">
        {/* Top-left light hotspot to reinforce the neumorphic light source */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(120% 80% at 12% 0%, rgba(255,255,255,0.6), rgba(255,255,255,0) 55%)',
          }}
        />

        {/* Stamped product label, top-left */}
        <p className="stamp absolute left-6 top-6 z-10 text-[10px] text-muted-foreground emboss">
          catchat.core &middot; unit&nbsp;09
        </p>
        {/* Stamped serial, top-right */}
        <p className="stamp absolute right-6 top-6 z-10 text-[10px] text-muted-foreground emboss">
          rev&nbsp;2.4 / sku&nbsp;cc-01
        </p>

        <div className="relative z-10 w-full max-w-md">
          <AuthCard initialMode={mode} />
        </div>
      </main>
    </div>
  )
}
