'use client'

import React, { useMemo, useEffect, useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { KeyboardControls, Text } from '@react-three/drei'
import { Physics, RigidBody, useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { Player } from '../../TPS-Controls/package/dist/index.esm.js'
import {
  useMultiplayer,
  type RemotePlayerState,
} from '@/lib/plugins/tps-controls/multiplayer'
import { RemotePlayer } from './remote-player'

function Environment() {
  return (
    <>
      <RigidBody position={[0, 0, 0]} type="fixed" colliders="cuboid">
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#4a5568" />
        </mesh>
      </RigidBody>

      <RigidBody position={[0, 1.5, -30]} type="fixed" colliders="cuboid">
        <mesh castShadow receiveShadow>
          <boxGeometry args={[20, 3, 1]} />
          <meshStandardMaterial color="#718096" />
        </mesh>
      </RigidBody>

      <RigidBody position={[25, 1.5, -15]} type="fixed" colliders="cuboid">
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1, 3, 20]} />
          <meshStandardMaterial color="#718096" />
        </mesh>
      </RigidBody>

      <RigidBody position={[-25, 1.5, -15]} type="fixed" colliders="cuboid">
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1, 3, 20]} />
          <meshStandardMaterial color="#718096" />
        </mesh>
      </RigidBody>

      <RigidBody position={[15, 0.4, 10]} type="fixed" colliders="cuboid">
        <mesh castShadow receiveShadow>
          <boxGeometry args={[6, 0.3, 6]} />
          <meshStandardMaterial color="#2d3748" />
        </mesh>
      </RigidBody>

      <RigidBody position={[-12, 0.3, -8]} type="fixed" colliders="cuboid">
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4, 0.3, 8]} />
          <meshStandardMaterial color="#2d3748" />
        </mesh>
      </RigidBody>

      <RigidBody position={[5, 1, 0]} type="dynamic" friction={0.8} colliders="cuboid">
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>
      </RigidBody>

      <RigidBody position={[-5, 0.75, 5]} type="dynamic" friction={0.8} colliders="cuboid">
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3, 1.5, 1]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>
      </RigidBody>

      <RigidBody position={[10, 0.5, -5]} type="dynamic" friction={0.8} colliders="cuboid">
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.5, 1, 3]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>
      </RigidBody>
    </>
  )
}

type GameProps = {
  userId: string
  userName: string
  remotePlayers: Map<string, RemotePlayerState>
  sendState: (s: Omit<RemotePlayerState, 'timestamp'>) => void
  sendDamage: (e: { fromId: string; fromName: string; toId: string; damage: number }) => void
  health: number
  setHealth: (h: number) => void
  maxHealth: number
}

function Game({
  userId,
  userName,
  remotePlayers,
  sendState,
  sendDamage,
  health,
  setHealth,
  maxHealth,
}: GameProps) {
  const { world } = useRapier()
  const shootingRef = useRef(false)
  const lastShotRef = useRef(0)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (e.button === 0) shootingRef.current = true
    }
    const onUp = (e: MouseEvent) => {
      if (e.button === 0) shootingRef.current = false
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  const lastSendRef = useRef(0)
  useFrame(({ camera }) => {
    const now = Date.now()
    world.forEachRigidBody((body) => {
      if (body.isDynamic()) {
        const pos = body.translation()
        const yaw = Math.atan2(
          camera.position.x - pos.x,
          camera.position.z - pos.z,
        )

        if (now - lastSendRef.current > 50) {
          lastSendRef.current = now
          sendState({
            id: userId,
            name: userName,
            position: [pos.x, pos.y, pos.z],
            rotation: yaw,
            health,
            action: 'idle',
          })
        }

        if (shootingRef.current && now - lastShotRef.current > 150) {
          lastShotRef.current = now
          const dir = new THREE.Vector3()
          camera.getWorldDirection(dir)

          const ray = new RAPIER.Ray(
            { x: camera.position.x, y: camera.position.y, z: camera.position.z },
            { x: dir.x, y: dir.y, z: dir.z },
          )
          const hit = world.castRay(ray, 200, true, undefined, undefined, undefined, (collider) => {
            const b = collider.parent()
            return b ? b.userData?.remotePlayerId !== undefined : false
          })

          if (hit && hit.collider.parent()) {
            const hitBody = hit.collider.parent()!
            const targetId = hitBody.userData?.remotePlayerId
            if (targetId && targetId !== userId) {
              sendDamage({
                fromId: userId,
                fromName: userName,
                toId: targetId as string,
                damage: 15,
              })
            }
          }
        }
      }
    })
  })

  useEffect(() => {
    if (health <= 0) {
      const t = setTimeout(() => setHealth(maxHealth), 3000)
      return () => clearTimeout(t)
    }
  }, [health, maxHealth, setHealth])

  const remoteArr = Array.from(remotePlayers.values())

  return (
    <>
      <Environment />
      <Player castShadow receiveShadow position={[0, 2, 0]} audioPath="/sfx/usp-shot.ogg" modelPath="/models/player.glb" />
      <PlayerNameTag username={userName} />

      {remoteArr.map((rp) => (
        <React.Fragment key={rp.id}>
          <RigidBody
            type="kinematicPosition"
            position={rp.position}
            colliders="cuboid"
            sensor
            userData={{ remotePlayerId: rp.id }}
          >
            <mesh visible={false}>
              <boxGeometry args={[1, 2, 1]} />
            </mesh>
          </RigidBody>
          <RemotePlayer state={rp} />
        </React.Fragment>
      ))}
    </>
  )
}

function PlayerNameTag({ username }: { username: string }) {
  const groupRef = useRef<THREE.Group>(null)
  const { world } = useRapier()

  useFrame(({ camera }) => {
    if (!groupRef.current) return
    world.forEachRigidBody((body) => {
      if (body.isDynamic()) {
        const pos = body.translation()
        groupRef.current!.position.set(pos.x, pos.y + 2.2, pos.z)
      }
    })
    groupRef.current.lookAt(camera.position)
  })

  return (
    <group ref={groupRef} position={[0, 4.2, 0]}>
      <Text fontSize={0.12} color="#ffffff" anchorX="center" anchorY="middle">
        {username}
      </Text>
    </group>
  )
}

function Scene({
  userId,
  userName,
  remotePlayers,
  sendState,
  sendDamage,
  health,
  setHealth,
  maxHealth,
}: GameProps) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        color="#fff4d6"
        position={[15, 25, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={80}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <directionalLight
        color="#c8a2ff"
        position={[-10, 5, -15]}
        intensity={0.6}
      />

      <gridHelper args={[100, 100, '#444', '#333']} position={[0, 0.003, 0]} />

      <Physics gravity={[0, -9.81, 0]}>
        <Game
          userId={userId}
          userName={userName}
          remotePlayers={remotePlayers}
          sendState={sendState}
          sendDamage={sendDamage}
          health={health}
          setHealth={setHealth}
          maxHealth={maxHealth}
        />
      </Physics>
    </>
  )
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2.5l7.5 3v5.2c0 5.3-3.3 9.2-7.5 10.8-4.2-1.6-7.5-5.5-7.5-10.8V5.5l7.5-3z"
        stroke="#d7e0ea"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4v16M4 12h16"
        stroke="#d7e0ea"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function StatBar({
  icon,
  value,
  max,
  fillColor,
}: {
  icon: React.ReactNode
  value: number
  max: number
  fillColor: string
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="flex items-center gap-2.5">
      {icon}
      <div className="flex-1 h-5 rounded-[10px] bg-[#47617a] overflow-hidden border border-black/10">
        <div
          className="h-full rounded-[10px] transition-all duration-150"
          style={{ width: `${pct}%`, background: fillColor }}
        />
      </div>
      <span className="min-w-[26px] text-right text-white text-[15px] font-semibold">
        {value}
      </span>
    </div>
  )
}

function StatBars({ health, maxHealth }: { health: number; maxHealth: number }) {
  return (
    <div
      className="inline-flex flex-col gap-2 px-[18px] py-4 rounded-[10px] w-[300px]"
      style={{ background: 'linear-gradient(90deg, #6d98c5 0%, #8eb9da 100%)' }}
    >
      <StatBar icon={<ShieldIcon />} value={0} max={100} fillColor="#47617a" />
      <StatBar
        icon={<PlusIcon />}
        value={health}
        max={maxHealth}
        fillColor="linear-gradient(90deg, #03bb26 0%, #48e025 100%)"
      />
    </div>
  )
}

export function TPSControlsMainView({ user }: { user?: any; onOpenSettings?: () => void }) {
  const userId = user?.id || 'anon'
  const userName = user?.name || user?.email || userId
  const [playing, setPlaying] = React.useState(false)
  const playingRef = useRef(false)

  const {
    remotePlayers,
    sendState,
    sendDamage,
    health,
    setHealth,
    maxHealth,
  } = useMultiplayer(userId, userName)

  const controlsMap = useMemo(
    () => [
      { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
      { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
      { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
      { name: 'right', keys: ['ArrowRight', 'KeyD'] },
      { name: 'run', keys: ['ShiftLeft'] },
      { name: 'jump', keys: ['Space'] },
    ],
    [],
  )

  useEffect(() => {
    const onLockChange = () => {
      const locked = document.pointerLockElement !== null
      playingRef.current = locked
      setPlaying(locked)
    }
    document.addEventListener('pointerlockchange', onLockChange)
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange)
      if (document.pointerLockElement) {
        document.exitPointerLock()
      }
    }
  }, [])

  // Block game keys from reaching KeyboardControls when not playing
  useEffect(() => {
    const gameKeys = new Set([
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Space', 'ShiftLeft', 'ShiftRight',
      'KeyF', 'Tab',
    ])
    const captureKeys = (e: KeyboardEvent) => {
      if (!playingRef.current && gameKeys.has(e.code)) {
        e.stopImmediatePropagation()
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', captureKeys, true)
    window.addEventListener('keyup', captureKeys, true)
    return () => {
      window.removeEventListener('keydown', captureKeys, true)
      window.removeEventListener('keyup', captureKeys, true)
    }
  }, [])

  // Escape from overlay goes back to chat
  useEffect(() => {
    if (playing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.pointerLockElement) {
        e.preventDefault()
        e.stopPropagation()
        window.location.hash = 'chat'
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playing])

  const handlePlayClick = () => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      canvas.requestPointerLock()
    } else {
      document.body.requestPointerLock()
    }
  }

  const playerCount = remotePlayers.size + 1

  return (
    <div className="relative h-full w-full bg-black">
      <div className="absolute inset-0">
        <KeyboardControls map={controlsMap}>
          <Canvas
            shadows
            camera={{ position: [0, 3, 10], fov: 60 }}
            style={{ width: '100%', height: '100%' }}
          >
            <Suspense fallback={null}>
              <Scene
                userId={userId}
                userName={userName}
                remotePlayers={remotePlayers}
                sendState={sendState}
                sendDamage={sendDamage}
                health={health}
                setHealth={setHealth}
                maxHealth={maxHealth}
              />
            </Suspense>
          </Canvas>
        </KeyboardControls>
      </div>

      {playing && (
        <>
          {/* Crosshair */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              className="text-white/70"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="16" cy="16" r="4" />
              <line x1="16" y1="2" x2="16" y2="10" />
              <line x1="16" y1="22" x2="16" y2="30" />
              <line x1="2" y1="16" x2="10" y2="16" />
              <line x1="22" y1="16" x2="30" y2="16" />
            </svg>
          </div>

          {/* Health HUD — bottom left */}
          <div className="pointer-events-none absolute bottom-8 left-8 z-10">
            <StatBars health={health} maxHealth={maxHealth} />
          </div>

          {/* Controls hint */}
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-black/60 px-6 py-3 text-white/50 text-sm z-10">
            WASD = Mover &middot; Shift = Correr &middot; Space = Saltar &middot; Click = Disparar &middot; Click Der = Apuntar
          </div>
        </>
      )}

      {!playing && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 cursor-pointer"
          onClick={handlePlayClick}
        >
          <div className="text-center select-none">
            <div className="text-white/80 text-3xl font-bold mb-3 drop-shadow-lg">
              TPS Controls
            </div>
            <div className="text-white/50 text-lg mb-8">
              Click para jugar
            </div>
            <div className="inline-block px-6 py-3 rounded-lg bg-white/10 text-white/60 text-sm">
              ESC para salir
            </div>
          </div>
        </div>
      )}

      {/* Player count */}
      <div className="pointer-events-none absolute top-4 right-4 rounded-lg bg-black/60 px-3 py-1.5 text-white/70 text-xs z-10">
        Jugadores: {playerCount}
      </div>
    </div>
  )
}
