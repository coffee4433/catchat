'use client'

import React, { type ReactNode } from 'react'

export function TPSControlsRootProvider({
  children,
}: {
  children: ReactNode
  user?: unknown
  active?: boolean
}) {
  return <>{children}</>
}
