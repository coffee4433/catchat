export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="animate-aurora absolute left-[8%] top-1/2 h-[160vmin] w-[160vmin] -translate-x-1/2 -translate-y-1/2 rounded-full">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 180deg, transparent 20%, var(--primary) 48%, oklch(0.95 0.05 195) 50%, var(--primary) 52%, transparent 80%)',
            filter: 'blur(48px)',
            opacity: 0.55,
          }}
        />
        <div
          className="absolute inset-[6%] rounded-full bg-background"
          style={{ boxShadow: '0 0 120px 10px oklch(0.85 0.16 195 / 0.25) inset' }}
        />
      </div>

      <div
        className="animate-pulse-glow absolute -bottom-40 -right-40 h-[38rem] w-[38rem] rounded-full"
        style={{
          background:
            'radial-gradient(circle, oklch(0.72 0.19 25 / 0.22) 0%, transparent 65%)',
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, var(--background) 100%)',
        }}
      />
    </div>
  )
}
