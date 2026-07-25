'use client'

import React from 'react'

export function ElectricBorder({
  children,
  className = '',
  color = 'var(--primary)',
  roundedClass = 'rounded-2xl',
  active = true,
}: {
  children: React.ReactNode
  className?: string
  color?: string
  roundedClass?: string
  active?: boolean
  topOnly?: boolean
}) {
  if (!active) {
    return <div className={`relative ${roundedClass} ${className}`}>{children}</div>
  }

  return (
    <div className={`relative ${roundedClass} ${className}`}>
      {/* Lightweight hardware-accelerated border glow */}
      <div
        className={`absolute -inset-[1px] ${roundedClass} pointer-events-none z-0 transition-opacity duration-300`}
        style={{
          boxShadow: `0 0 12px -2px ${color}, inset 0 0 1px 1px ${color}`,
          opacity: 0.8,
        }}
      />
      <div className={`relative z-10 h-full w-full ${roundedClass}`}>{children}</div>
    </div>
  )
}
