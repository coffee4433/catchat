'use client'

import React from 'react'
import { LibraryProvider } from './library-context'
import { CatMusicPlayerProvider } from './player-context'

export function CatMusicRootProvider({
  children,
  active = true,
}: {
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <LibraryProvider active={active}>
      <CatMusicPlayerProvider active={active}>{children}</CatMusicPlayerProvider>
    </LibraryProvider>
  )
}
