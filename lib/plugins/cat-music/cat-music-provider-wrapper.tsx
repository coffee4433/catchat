'use client'

import React from 'react'
import { LibraryProvider } from './library-context'
import { CatMusicPlayerProvider } from './player-context'

export function CatMusicRootProvider({ children }: { children: React.ReactNode }) {
  return (
    <LibraryProvider>
      <CatMusicPlayerProvider>{children}</CatMusicPlayerProvider>
    </LibraryProvider>
  )
}
