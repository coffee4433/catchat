'use client'

import React from 'react'
import { cn } from '@/lib/utils'

type GlassVariant = 'default' | 'strong' | 'light'

const variantClass: Record<GlassVariant, string> = {
  default: 'cm-glass',
  strong: 'cm-glass-strong',
  light: 'cm-glass-light',
}

export function GlassPanel({
  children,
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & { variant?: GlassVariant }) {
  return (
    <div className={cn('rounded-[24px]', variantClass[variant], className)} {...props}>
      {children}
    </div>
  )
}
