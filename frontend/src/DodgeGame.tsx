import { Stars, useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Box3, Vector3 } from 'three'

const SHIP_SIZE = 64
const SHIP_SPEED = 900
const OBSTACLE_MIN_SIZE = 20
const OBSTACLE_MAX_SIZE = 48
const OBSTACLE_SPEED = 520
const SPAWN_INTERVAL_MS = 700
const CROSS_SPEED = 500
const DIAGONAL_SPEED = 280
const MAX_SPAWN_Y_FRACTION = 0.55

type SpawnPattern = (
  el: { clientWidth: number; clientHeight: number },
  size: number,
) => { x: number; y: number; vx: number; vy: number }

const SPAWN_PATTERNS: SpawnPattern[] = [
  (el, size) => ({
    x: Math.random() * (el.clientWidth - size),
    y: -size,
    vx: 0,
    vy: OBSTACLE_SPEED,
  }),
  (el, size) => ({
    x: -size,
    y: -size,
    vx: DIAGONAL_SPEED,
    vy: OBSTACLE_SPEED,
  }),
  (el, size) => ({
    x: el.clientWidth,
    y: -size,
    vx: -DIAGONAL_SPEED,
    vy: OBSTACLE_SPEED,
  }),
  (el, size) => ({
    x: -size,
    y: Math.random() * el.clientHeight * MAX_SPAWN_Y_FRACTION,
    vx: CROSS_SPEED,
    vy: OBSTACLE_SPEED * 0.4,
  }),
  (el, size) => ({
    x: el.clientWidth,
    y: Math.random() * el.clientHeight * MAX_SPAWN_Y_FRACTION,
    vx: -CROSS_SPEED,
    vy: OBSTACLE_SPEED * 0.4,
  }),
]

const WORLD_WIDTH = 10
const WORLD_DEPTH = 24
const CAMERA_HEIGHT = 4.5
const CAMERA_BACK = 4.5
const LOOK_AHEAD = 8
const SHIP_START_Y_FRACTION = 0.85

type Phase = 'idle' | 'playing' | 'lost'
type Obstacle = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function toWorldX(px: number, containerW: number) {
  return (px / containerW - 0.5) * WORLD_WIDTH
}

function toWorldZ(py: number, containerH: number) {
  return (py / containerH) * WORLD_DEPTH - WORLD_DEPTH
}

function FixedCamera() {
  useFrame(({ camera }) => {
    camera.position.set(0, CAMERA_HEIGHT, CAMERA_BACK)
    camera.lookAt(0, 0, -LOOK_AHEAD)
  })
  return null
}

function ShipMesh({ x, z }: { x: number; z: number }) {
  const { scene } = useGLTF('/models/craft_racer.glb')
  useMemo(() => {
    const center = new Box3().setFromObject(scene).getCenter(new Vector3())
    scene.position.set(-center.x, -center.y, -center.z)
  }, [scene])
  return (
    <group position={[x, 0, z]}>
      <group rotation={[0, Math.PI, 0]} scale={1.4}>
        <primitive object={scene} />
      </group>
      <pointLight position={[0, 2.5, 1.5]} intensity={60} color="#ffffff" />
    </group>
  )
}

useGLTF.preload('/models/craft_racer.glb')

function ObstacleMesh({ x, z, size, rotation }: { x: number; z: number; size: number; rotation: number }) {
  const scale = size / OBSTACLE_MIN_SIZE
  return (
    <mesh position={[x, 0, z]} scale={scale} rotation={[rotation, rotation * 0.6, 0]}>
      <icosahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color="#ff3c3c" emissive="#ff3c3c" emissiveIntensity={0.35} flatShading />
    </mesh>
  )
}

function DodgeGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [survivedSeconds, setSurvivedSeconds] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [dodgedCount, setDodgedCount] = useState(0)
  const keysRef = useRef<Set<string>>(new Set())
  const shipRef = useRef({ x: 0, y: 0 })
  const obstaclesRef = useRef<Obstacle[]>([])
  const nextIdRef = useRef(0)
  const spawnTimerRef = useRef(0)
  const startTimeRef = useRef(0)
  const dodgedRef = useRef(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const start = {
      x: el.clientWidth / 2 - SHIP_SIZE / 2,
      y: el.clientHeight * SHIP_START_Y_FRACTION - SHIP_SIZE / 2,
    }
    shipRef.current = start
    setPosition(start)
  }, [])

  function startGame() {
    const el = containerRef.current
    if (!el) return
    const start = {
      x: el.clientWidth / 2 - SHIP_SIZE / 2,
      y: el.clientHeight * SHIP_START_Y_FRACTION - SHIP_SIZE / 2,
    }
    shipRef.current = start
    setPosition(start)
    obstaclesRef.current = []
    setObstacles([])
    spawnTimerRef.current = 0
    keysRef.current.clear()
    setSurvivedSeconds(null)
    setElapsedSeconds(0)
    dodgedRef.current = 0
    setDodgedCount(0)
    startTimeRef.current = performance.now()
    setPhase('playing')
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      keysRef.current.add(e.key.toLowerCase())
    }
    function handleKeyUp(e: KeyboardEvent) {
      keysRef.current.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return

    let frameId: number
    let lastTime = performance.now()

    function tick(time: number) {
      const dt = (time - lastTime) / 1000
      lastTime = time
      const el = containerRef.current
      if (!el) {
        frameId = requestAnimationFrame(tick)
        return
      }

      const keys = keysRef.current
      const dist = SHIP_SPEED * dt

      let { x, y } = shipRef.current
      if (keys.has('a') || keys.has('arrowleft')) x -= dist
      if (keys.has('d') || keys.has('arrowright')) x += dist
      if (keys.has('w') || keys.has('arrowup')) y -= dist
      if (keys.has('s') || keys.has('arrowdown')) y += dist
      x = Math.max(0, Math.min(x, el.clientWidth - SHIP_SIZE))
      y = Math.max(0, Math.min(y, el.clientHeight - SHIP_SIZE))
      shipRef.current = { x, y }
      setPosition({ x, y })
      setElapsedSeconds((time - startTimeRef.current) / 1000)

      const advanced = obstaclesRef.current.map((o) => ({
        ...o,
        x: o.x + o.vx * dt,
        y: o.y + o.vy * dt,
      }))
      const moved = advanced.filter(
        (o) =>
          o.y < el.clientHeight + o.size &&
          o.x > -o.size * 2 &&
          o.x < el.clientWidth + o.size * 2,
      )
      if (advanced.length > moved.length) {
        dodgedRef.current += advanced.length - moved.length
        setDodgedCount(dodgedRef.current)
      }

      spawnTimerRef.current += dt * 1000
      if (spawnTimerRef.current >= SPAWN_INTERVAL_MS) {
        spawnTimerRef.current = 0
        const size =
          OBSTACLE_MIN_SIZE + Math.random() * (OBSTACLE_MAX_SIZE - OBSTACLE_MIN_SIZE)
        const pattern = SPAWN_PATTERNS[Math.floor(Math.random() * SPAWN_PATTERNS.length)]
        const spawned = pattern(el, size)
        moved.push({
          id: nextIdRef.current++,
          ...spawned,
          size,
          rotation: Math.random() * Math.PI * 2,
        })
      }

      obstaclesRef.current = moved
      setObstacles(moved)

      const hit = moved.some(
        (o) =>
          x < o.x + o.size &&
          x + SHIP_SIZE > o.x &&
          y < o.y + o.size &&
          y + SHIP_SIZE > o.y,
      )

      if (hit) {
        setSurvivedSeconds((time - startTimeRef.current) / 1000)
        setPhase('lost')
        return
      }

      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [phase])

  const containerEl = containerRef.current
  const containerW = containerEl?.clientWidth || 1
  const containerH = containerEl?.clientHeight || 1
  const shipWorldX = toWorldX(position.x + SHIP_SIZE / 2, containerW)
  const shipWorldZ = toWorldZ(position.y + SHIP_SIZE / 2, containerH)

  return (
    <div className="game">
      <div className="timer-box">{formatTime(elapsedSeconds)}</div>

      <div className="play-area" ref={containerRef}>
        <Canvas shadows camera={{ fov: 60 }}>
          <color attach="background" args={['#05070a']} />
          <FixedCamera />
          <ambientLight intensity={1.5} />
          <hemisphereLight args={['#8899ff', '#1a1420', 1.5]} />
          <directionalLight position={[3, 6, 4]} intensity={2.5} color="#ffffff" />
          <pointLight position={[0, 4, 4]} intensity={80} color="#ff8800" />
          <fog attach="fog" args={['#05070a', 10, WORLD_DEPTH]} />
          <Stars radius={60} depth={40} count={3000} factor={3} fade speed={1} />
          <ShipMesh x={shipWorldX} z={shipWorldZ} />
          {obstacles.map((o) => (
            <ObstacleMesh
              key={o.id}
              x={toWorldX(o.x + o.size / 2, containerW)}
              z={toWorldZ(o.y + o.size / 2, containerH)}
              size={o.size}
              rotation={o.rotation}
            />
          ))}
        </Canvas>

        {phase === 'lost' && survivedSeconds !== null && (
          <div className="game-over">
            <div className="game-over-card">
              <h2>Run Over</h2>
              <ul>
                <li>Time: {formatTime(survivedSeconds)}</li>
                <li>Obstacles dodged: {dodgedCount}</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <button
        className="start-button"
        onClick={startGame}
        disabled={phase === 'playing'}
      >
        {phase === 'lost' ? 'Retry' : 'Start'}
      </button>
    </div>
  )
}

export default DodgeGame
