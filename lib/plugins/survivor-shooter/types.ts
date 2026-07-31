export interface GameState {
  health: number
  maxHealth: number
  score: number
  kills: number
  ammo: number
  maxAmmo: number
  isReloading: boolean
  gameStarted: boolean
}

export interface Enemy {
  id: string
  position: [number, number, number]
  health: number
  type: 'walker' | 'runner'
}

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'END_GAME' }
  | { type: 'TAKE_DAMAGE'; amount: number }
  | { type: 'ADD_SCORE'; points: number }
  | { type: 'ADD_KILL' }
  | { type: 'SHOOT' }
  | { type: 'RELOAD_START' }
  | { type: 'RELOAD_END' }
  | { type: 'SET_AMMO'; amount: number }
