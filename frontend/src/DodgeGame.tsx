import { Rocket } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const SHIP_SIZE = 40
const SHIP_SPEED = 300
const OBSTACLE_SIZE = 16
const OBSTACLE_SPEED = 220
const SPAWN_INTERVAL_MS = 700

type Phase = 'idle' | 'playing' | 'lost'
type Obstacle = { id: number; x: number; y: number }

function DodgeGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const keysRef = useRef<Set<string>>(new Set())
  const shipRef = useRef({ x: 0, y: 0 })
  const obstaclesRef = useRef<Obstacle[]>([])
  const nextIdRef = useRef(0)
  const spawnTimerRef = useRef(0)

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
    keysRef.current.clear()
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
        .map((o) => ({ ...o, y: o.y + OBSTACLE_SPEED * dt }))
        .filter((o) => o.y < el.clientHeight)

      spawnTimerRef.current += dt * 1000
      if (spawnTimerRef.current >= SPAWN_INTERVAL_MS) {
        spawnTimerRef.current = 0
        moved.push({
          id: nextIdRef.current++,
          x: Math.random() * (el.clientWidth - OBSTACLE_SIZE),
          y: -OBSTACLE_SIZE,
        })
      }

      obstaclesRef.current = moved
      setObstacles(moved)

      const hit = moved.some(
        (o) =>
          x < o.x + OBSTACLE_SIZE &&
          x + SHIP_SIZE > o.x &&
          y < o.y + OBSTACLE_SIZE &&
          y + SHIP_SIZE > o.y,
      )

      if (hit) {
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
        {phase === 'playing' && (
          <Rocket
            className="ship"
            style={{ left: position.x, top: position.y }}
            size={SHIP_SIZE}
            strokeWidth={2}
          />
        )}
        {obstacles.map((o) => (
          <div key={o.id} className="obstacle" style={{ left: o.x, top: o.y }} />
        ))}
        {phase === 'lost' && <div className="game-over">Crashed</div>}
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
