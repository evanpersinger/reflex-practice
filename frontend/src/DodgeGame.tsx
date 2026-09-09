import { useEffect, useRef, useState } from 'react'

const SHIP_SIZE = 40
const SPEED = 300

function DodgeGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const keysRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setPosition({
      x: el.clientWidth / 2 - SHIP_SIZE / 2,
      y: el.clientHeight / 2 - SHIP_SIZE / 2,
    })
  }, [])

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
    let frameId: number
    let lastTime = performance.now()

    function tick(time: number) {
      const dt = (time - lastTime) / 1000
      lastTime = time
      const keys = keysRef.current
      const el = containerRef.current

      if (el) {
        const dist = SPEED * dt
        setPosition((prev) => {
          let { x, y } = prev
          if (keys.has('a') || keys.has('arrowleft')) x -= dist
          if (keys.has('d') || keys.has('arrowright')) x += dist
          if (keys.has('w') || keys.has('arrowup')) y -= dist
          if (keys.has('s') || keys.has('arrowdown')) y += dist

          x = Math.max(0, Math.min(x, el.clientWidth - SHIP_SIZE))
          y = Math.max(0, Math.min(y, el.clientHeight - SHIP_SIZE))
          return { x, y }
        })
      }

      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [])

  return (
    <div className="game">
      <div className="play-area" ref={containerRef}>
        <div className="ship" style={{ left: position.x, top: position.y }} />
      </div>
    </div>
  )
}

export default DodgeGame
