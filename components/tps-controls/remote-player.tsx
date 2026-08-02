'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { RemotePlayerState } from '@/lib/plugins/tps-controls/multiplayer'

type Props = {
  state: RemotePlayerState
}

export function RemotePlayer({ state }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const targetPos = useMemo(() => new THREE.Vector3(...state.position), [])
  const currentPos = useRef(new THREE.Vector3(...state.position))
  const targetYaw = useRef(state.rotation)

  React.useEffect(() => {
    targetPos.set(...state.position)
    targetYaw.current = state.rotation
  }, [state.position, state.rotation])

  useFrame(({ camera }, delta) => {
    if (!groupRef.current) return

    currentPos.current.lerp(targetPos, Math.min(1, delta * 15))
    groupRef.current.position.copy(currentPos.current)

    const currentYaw = groupRef.current.rotation.y
    let diff = targetYaw.current - currentYaw
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    groupRef.current.rotation.y += diff * Math.min(1, delta * 15)

    groupRef.current.lookAt(
      camera.position.x,
      groupRef.current.position.y,
      camera.position.z,
    )
  })

  return (
    <group ref={groupRef} position={state.position}>
      <mesh position={[0, 1, 0]} castShadow>
        <capsuleGeometry args={[0.35, 0.8, 8, 16]} />
        <meshStandardMaterial color={state.health > 0 ? '#4488ff' : '#ff4444'} />
      </mesh>

      <mesh position={[0, 0.35, 0]} castShadow>
        <capsuleGeometry args={[0.45, 1.0, 8, 16]} />
        <meshStandardMaterial color={state.health > 0 ? '#3366cc' : '#cc3333'} />
      </mesh>

      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color={state.health > 0 ? '#ffcc88' : '#ff8888'} />
      </mesh>

      <Text
        position={[0, 2.15, 0]}
        fontSize={0.12}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {state.name}
      </Text>
    </group>
  )
}
