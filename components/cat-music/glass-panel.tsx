'use client'

import React from 'react'
import { cn } from '@/lib/utils'

type GlassVariant = 'default' | 'strong' | 'light' | 'acrylic' | 'tint'

const variantClass: Record<GlassVariant, string> = {
  default: 'cm-glass',
  strong: 'cm-glass-strong',
  light: 'cm-glass-light',
  acrylic: 'cm-acrylic',
  /** Picks up the current artwork's colour — for chrome that should feel live. */
  tint: 'cm-tint',
}

export function GlassPanel({
  children,
  className,
  variant = 'default',
  hairline = true,
  lift = false,
  ...props
}: React.ComponentProps<'div'> & {
  variant?: GlassVariant
  /** Bevelled light-catching edge. On by default; off for busy nested panels. */
  hairline?: boolean
  /** Raises toward the pointer with an accent-tinted shadow. */
  lift?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-[24px]',
        variantClass[variant],
        hairline && 'cm-hairline',
        lift && 'cm-lift',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
