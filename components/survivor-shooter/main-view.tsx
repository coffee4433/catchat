'use client'

import React, { useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sky, PointerLockControls, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { PluginViewProps } from '@/lib/plugins/plugin-types'
import { useGame } from '@/lib/plugins/survivor-shooter/survivor-shooter-provider'

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#3a5a2a" />
    </mesh>
  )
}

function Tree({ position }: { position: [number, number, number] }) {
  const height = 3 + Math.random() * 4
  const trunkRadius = 0.2 + Math.random() * 0.2
  const foliageRadius = 1.2 + Math.random() * 1
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[trunkRadius, trunkRadius + 0.1, height, 8]} />
        <meshStandardMaterial color="#6b4226" />
      </mesh>
      <mesh position={[0, height + 0.8, 0]} castShadow>
        <coneGeometry args={[foliageRadius, 3, 10]} />
        <meshStandardMaterial color="#2d5a1e" />
      </mesh>
      <mesh position={[0, height + 2.0, 0]} castShadow>
        <coneGeometry args={[foliageRadius * 0.8, 2.5, 10]} />
        <meshStandardMaterial color="#3a7a2a" />
      </mesh>
    </group>
  )
}

function Trees() {
  const trees = useMemo(() => {
    const items: Array<[number, number, number]> = []
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 12 + Math.random() * 70
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      items.push([x, 0, z])
    }
    return items
  }, [])
  return (
    <>
      {trees.map((pos, i) => (
        <Tree key={i} position={pos} />
      ))}
    </>
  )
}

function Weapon({ isShooting }: { isShooting: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const muzzleFlashRef = useRef<THREE.Mesh>(null)
  const flashStart = useRef(0)

  useFrame((_, delta) => {
    if (muzzleFlashRef.current) {
      if (isShooting) {
        flashStart.current = 0
        muzzleFlashRef.current.visible = true
      } else {
        flashStart.current += delta
        if (flashStart.current > 0.05) {
          muzzleFlashRef.current.visible = false
        }
      }
    }
  })

  return (
    <group ref={groupRef} position={[0.25, -0.25, 0.45]} rotation={[0, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.08, 0.08, 0.5]} />
        <meshStandardMaterial color="#333" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.05, 0.2]} castShadow>
        <boxGeometry args={[0.06, 0.12, 0.15]} />
        <meshStandardMaterial color="#222" metalness={0.85} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.08, 0.05]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial color="#111" metalness={0.95} roughness={0.2} />
      </mesh>
      <mesh
        ref={muzzleFlashRef}
        position={[0, -0.02, 0.52]}
        visible={false}
      >
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#ffaa00" />
      </mesh>
    </group>
  )
}

function PlayerCharacter({ isShooting }: { isShooting: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.8, 4, 8]} />
        <meshStandardMaterial color="#2255aa" />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#ffccaa" />
      </mesh>
      <mesh position={[0.05, 1.6, 0.18]} castShadow>
        <capsuleGeometry args={[0.04, 0.1, 4, 8]} />
        <meshStandardMaterial color="#ffaa88" />
      </mesh>
      <Weapon isShooting={isShooting} />
    </group>
  )
}

function BulletTrail({ start, end }: { start: THREE.Vector3; end: THREE.Vector3 }) {
  const ref = useRef<THREE.Mesh>(null)
  const elapsed = useRef(0)

  useFrame((_, delta) => {
    elapsed.current += delta
    if (ref.current) {
      ref.current.material = new THREE.MeshBasicMaterial({
        color: '#ffaa00',
        transparent: true,
        opacity: Math.max(0, 1 - elapsed.current * 8),
      })
    }
  })

  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  const direction = new THREE.Vector3().subVectors(end, start)
  const length = direction.length()

  return (
    <mesh ref={ref} position={mid}>
      <cylinderGeometry args={[0.02, 0.02, length, 4]} />
      <meshBasicMaterial color="#ffaa00" transparent opacity={0.9} />
    </mesh>
  )
}

function GameScene() {
  const { state, dispatch } = useGame()
  const playerRef = useRef<THREE.Group>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const keys = useRef<Set<string>>(new Set())
  const mouseRef = useRef({ x: 0, y: 0 })
  const yawRef = useRef(Math.PI)
  const pitchRef = useRef(0)
  const isShooting = useRef(false)
  const [trails, setTrails] = React.useState<Array<{ id: number; start: THREE.Vector3; end: THREE.Vector3 }>>([])
  const trailIdRef = useRef(0)

  const { camera } = useThree()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.code)
      if (e.code === 'KeyR') {
        dispatch({ type: 'RELOAD_START' })
        setTimeout(() => dispatch({ type: 'RELOAD_END' }), 1500)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code)
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x += e.movementX * 0.002
      mouseRef.current.y += e.movementY * 0.002
      mouseRef.current.y = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, mouseRef.current.y))
    }
    const handleMouseDown = () => {
      if (state.ammo > 0 && !state.isReloading) {
        isShooting.current = true
        dispatch({ type: 'SHOOT' })
        dispatch({ type: 'ADD_SCORE', points: 5 })
        const raycaster = new THREE.Raycaster()
        if (cameraRef.current) {
          const dir = new THREE.Vector3(0, 0, -1)
          dir.applyQuaternion(cameraRef.current.quaternion)
          raycaster.set(cameraRef.current.position, dir)
          const far = new THREE.Vector3().copy(cameraRef.current.position).add(dir.multiplyScalar(100))
          const trailId = trailIdRef.current++
          setTrails((t) => [...t.slice(-8), { id: trailId, start: cameraRef.current!.position.clone(), end: far.clone() }])
          setTimeout(() => setTrails((t) => t.filter((tr) => tr.id !== trailId)), 150)
        }
        setTimeout(() => { isShooting.current = false }, 100)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [state.ammo, state.isReloading, dispatch])

  useFrame((_, delta) => {
    if (!playerRef.current) return

    const speed = 8
    const move = new THREE.Vector3()
    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()

    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    if (keys.current.has('KeyW')) move.add(forward)
    if (keys.current.has('KeyS')) move.sub(forward)
    if (keys.current.has('KeyA')) move.sub(right)
    if (keys.current.has('KeyD')) move.add(right)

    if (move.length() > 0) {
      move.normalize().multiplyScalar(speed * delta)
      playerRef.current.position.add(move)
      const clamp = 90
      playerRef.current.position.x = Math.max(-clamp, Math.min(clamp, playerRef.current.position.x))
      playerRef.current.position.z = Math.max(-clamp, Math.min(clamp, playerRef.current.position.z))
    }

    yawRef.current += mouseRef.current.x * 0.3
    pitchRef.current += mouseRef.current.y * 0.3

    const camDist = 3.5
    const camHeight = 2.5
    const camX = Math.sin(yawRef.current) * camDist
    const camZ = Math.cos(yawRef.current) * camDist
    const pos = playerRef.current.position

    camera.position.lerp(
      new THREE.Vector3(pos.x - camX, pos.y + camHeight, pos.z - camZ),
      8 * delta
    )
    camera.lookAt(pos.x, pos.y + 1.2, pos.z)

    playerRef.current.rotation.y = yawRef.current
    mouseRef.current.x *= 0.9
    mouseRef.current.y *= 0.9
  })

  return (
    <>
      <PointerLockControls />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[30, 40, 20]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={100}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      <Sky sunPosition={[100, 50, 100]} />
      <Ground />
      <Trees />
      <group ref={playerRef} position={[0, 0, 5]}>
        <PlayerCharacter isShooting={isShooting.current} />
      </group>
      {trails.map((t) => (
        <BulletTrail key={t.id} start={t.start} end={t.end} />
      ))}
      <perspectiveCamera ref={cameraRef} />
    </>
  )
}

function HUD() {
  const { state, dispatch } = useGame()

  if (!state.gameStarted) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="pointer-events-auto flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-black/60 p-10 backdrop-blur-xl">
          <h1 className="text-3xl font-bold text-white">SURVIVOR SHOOTER</h1>
          <p className="text-sm text-white/60">Third-person survival game</p>
          <button
            onClick={() => {
              dispatch({ type: 'START_GAME' })
              document.body.requestPointerLock()
            }}
            className="rounded-xl bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-500 transition-colors"
          >
            PLAY
          </button>
          <div className="mt-4 text-xs text-white/40 space-y-1 text-center">
            <p>WASD = Move</p>
            <p>Mouse = Look / Shoot</p>
            <p>R = Reload</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-4">
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-black/50 px-3 py-1.5 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="h-2 w-28 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-red-500 transition-all duration-300"
                style={{ width: `${state.health}%` }}
              />
            </div>
            <span className="text-xs font-bold text-white">{state.health}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-black/50 px-3 py-1.5 backdrop-blur">
          <span className="text-xs font-mono font-bold text-white">
            {state.ammo} / {state.maxAmmo} {state.isReloading ? '🔄' : ''}
          </span>
        </div>
        <div className="rounded-lg bg-black/50 px-3 py-1.5 backdrop-blur">
          <span className="text-xs font-bold text-emerald-400">⚡ {state.score}</span>
        </div>
      </div>
      <div className="pointer-events-auto">
        <button
          onClick={() => {
            document.exitPointerLock()
            dispatch({ type: 'END_GAME' })
          }}
          className="rounded-lg bg-black/50 px-3 py-1.5 text-xs text-white/50 backdrop-blur hover:text-white"
        >
          ESC
        </button>
      </div>
    </div>
  )
}

export function SurvivorShooterMainView({ user, onOpenSettings }: PluginViewProps) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Canvas
        shadows
        camera={{ fov: 55, near: 0.1, far: 200, position: [0, 4, 8] }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <GameScene />
      </Canvas>
      <HUD />
      {/* Crosshair */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <div className="absolute left-1/2 top-0 h-3 w-[1px] -translate-x-1/2 bg-white/60" />
          <div className="absolute left-1/2 top-full h-3 w-[1px] -translate-x-1/2 bg-white/60" />
          <div className="absolute left-0 top-1/2 h-[1px] w-3 -translate-y-1/2 bg-white/60" />
          <div className="absolute right-0 top-1/2 h-[1px] w-3 -translate-y-1/2 bg-white/60" />
          <div className="size-1 rounded-full bg-white/40" />
        </div>
      </div>
    </div>
  )
}
