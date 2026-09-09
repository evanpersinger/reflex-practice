import { Diamond, Gem, Octagon, Rocket, Stone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const SHIP_SIZE = 64
const SHIP_SPEED = 300
const OBSTACLE_MIN_SIZE = 20
const OBSTACLE_MAX_SIZE = 48
const OBSTACLE_SPEED = 340
const SPAWN_INTERVAL_MS = 700
const CROSS_SPEED = 500
const CROSS_INTERVAL_MS = 10000
const OBSTACLE_SHAPES = [Stone, Gem, Octagon, Diamond]

type Phase = 'idle' | 'playing' | 'lost'
type Obstacle = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  Shape: (typeof OBSTACLE_SHAPES)[number]
}

function DodgeGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [survivedSeconds, setSurvivedSeconds] = useState<number | null>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const shipRef = useRef({ x: 0, y: 0 })
  const obstaclesRef = useRef<Obstacle[]>([])
  const nextIdRef = useRef(0)
  const spawnTimerRef = useRef(0)
  const crossTimerRef = useRef(0)
  const startTimeRef = useRef(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const start = {
      x: el.clientWidth / 2 - SHIP_SIZE / 2,
      y: el.clientHeight / 2 - SHIP_SIZE / 2,
    }
    shipRef.current = start
    setPosition(start)
  }, [])

  function startGame() {
    const el = containerRef.current
    if (!el) return
    const start = {
      x: el.clientWidth / 2 - SHIP_SIZE / 2,
      y: el.clientHeight / 2 - SHIP_SIZE / 2,
    }
    shipRef.current = start
    setPosition(start)
    obstaclesRef.current = []
    setObstacles([])
    spawnTimerRef.current = 0
    crossTimerRef.current = 0
    keysRef.current.clear()
    setSurvivedSeconds(null)
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

      const moved = obstaclesRef.current
        .map((o) => ({ ...o, x: o.x + o.vx * dt, y: o.y + o.vy * dt }))
        .filter(
          (o) =>
            o.y < el.clientHeight + o.size &&
            o.x > -o.size * 2 &&
            o.x < el.clientWidth + o.size * 2,
        )

      spawnTimerRef.current += dt * 1000
      if (spawnTimerRef.current >= SPAWN_INTERVAL_MS) {
        spawnTimerRef.current = 0
        const size =
          OBSTACLE_MIN_SIZE + Math.random() * (OBSTACLE_MAX_SIZE - OBSTACLE_MIN_SIZE)
        moved.push({
          id: nextIdRef.current++,
          x: Math.random() * (el.clientWidth - size),
          y: -size,
          vx: 0,
          vy: OBSTACLE_SPEED,
          size,
          rotation: Math.random() * 360,
          Shape: OBSTACLE_SHAPES[Math.floor(Math.random() * OBSTACLE_SHAPES.length)],
        })
      }

      crossTimerRef.current += dt * 1000
      if (crossTimerRef.current >= CROSS_INTERVAL_MS) {
        crossTimerRef.current = 0
        const size =
          OBSTACLE_MIN_SIZE + Math.random() * (OBSTACLE_MAX_SIZE - OBSTACLE_MIN_SIZE)
        const fromLeft = Math.random() < 0.5
        moved.push({
          id: nextIdRef.current++,
          x: fromLeft ? -size : el.clientWidth,
          y: Math.random() * (el.clientHeight - size),
          vx: fromLeft ? CROSS_SPEED : -CROSS_SPEED,
          vy: 0,
          size,
          rotation: Math.random() * 360,
          Shape: OBSTACLE_SHAPES[Math.floor(Math.random() * OBSTACLE_SHAPES.length)],
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

  return (
    <div className="game">
      <div className="play-area" ref={containerRef}>
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="ship-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff8800" />
              <stop offset="50%" stopColor="#ff3ea5" />
              <stop offset="100%" stopColor="#00e5ff" />
            </linearGradient>
          </defs>
        </svg>
        <Rocket
          className="ship"
          style={{ left: position.x, top: position.y }}
          size={SHIP_SIZE}
          strokeWidth={2}
        />
        {obstacles.map((o) => (
          <o.Shape
            key={o.id}
            className="obstacle"
            style={{ left: o.x, top: o.y, transform: `rotate(${o.rotation}deg)` }}
            size={o.size}
            strokeWidth={2}
          />
        ))}
        {phase === 'lost' && survivedSeconds !== null && (
          <div className="game-over">
            <div className="game-over-card">
              <h2>Run Over</h2>
              <ul>
                <li>Time: {survivedSeconds.toFixed(1)}s</li>
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
