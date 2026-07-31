'use client'

import React, { createContext, useContext, useReducer, useCallback } from 'react'
import type { GameState, GameAction } from './types'

const initialState: GameState = {
  health: 100,
  maxHealth: 100,
  score: 0,
  kills: 0,
  ammo: 30,
  maxAmmo: 30,
  isReloading: false,
  gameStarted: false,
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return { ...initialState, gameStarted: true }
    case 'END_GAME':
      return { ...state, gameStarted: false }
    case 'TAKE_DAMAGE':
      return { ...state, health: Math.max(0, state.health - action.amount) }
    case 'ADD_SCORE':
      return { ...state, score: state.score + action.points }
    case 'ADD_KILL':
      return { ...state, kills: state.kills + 1 }
    case 'SHOOT':
      return { ...state, ammo: Math.max(0, state.ammo - 1) }
    case 'RELOAD_START':
      return { ...state, isReloading: true }
    case 'RELOAD_END':
      return { ...state, isReloading: false, ammo: state.maxAmmo }
    case 'SET_AMMO':
      return { ...state, ammo: action.amount }
    default:
      return state
  }
}

const GameContext = createContext<{
  state: GameState
  dispatch: React.Dispatch<GameAction>
} | null>(null)

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be inside SurvivorShooterRootProvider')
  return ctx
}

export function SurvivorShooterRootProvider({
  children,
  active = true,
}: {
  children: React.ReactNode
  user?: unknown
  active?: boolean
}) {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}
