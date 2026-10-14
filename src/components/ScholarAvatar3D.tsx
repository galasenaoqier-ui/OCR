import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, OrbitControls, useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useRef } from 'react'
import type { Group } from 'three'

function Model({ speaking, thinking, onReady }: { speaking: boolean; thinking: boolean; onReady: () => void }) {
  const { scene } = useGLTF('/character/digital-scholar/model/digital-scholar.glb')
  const ref = useRef<Group>(null)
  useEffect(() => {
    onReady()
    scene.traverse((node) => {
      if ('castShadow' in node) node.castShadow = true
      if ('receiveShadow' in node) node.receiveShadow = true
    })
  }, [onReady, scene])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.position.y = Math.sin(t * (speaking ? 2.2 : 0.8)) * (speaking ? 0.018 : 0.008)
    ref.current.rotation.z = thinking ? Math.sin(t * 0.7) * 0.035 : Math.sin(t * 0.45) * 0.012
  })
  return <primitive ref={ref} object={scene} scale={1.12} position={[0, -1.7, 0]} />
}

export default function ScholarAvatar3D({ speaking, thinking, onReady }: { speaking: boolean; thinking: boolean; onReady: () => void }) {
  return (
    <Canvas camera={{ position: [0, 2.2, 8.2], fov: 30 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={1.35} />
      <directionalLight position={[2.5, 5, 4]} intensity={2.2} color="#f4d6a0" />
      <directionalLight position={[-3, 2, 2]} intensity={1.1} color="#83b8c4" />
      <Suspense fallback={null}>
        <Model speaking={speaking} thinking={thinking} onReady={onReady} />
        <Environment preset="studio" />
      </Suspense>
      <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
    </Canvas>
  )
}

useGLTF.preload('/character/digital-scholar/model/digital-scholar.glb')
