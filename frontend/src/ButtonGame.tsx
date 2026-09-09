import { useEffect, useRef, useState } from 'react'

const TARGET_SIZE = 80

type Props = {
  onResult: (time: number) => void
}

function ButtonGame({ onResult }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [startTime, setStartTime] = useState(0)
  const [reactionTime, setReactionTime] = useState<number | null>(null)

  function spawnTarget() {
    const el = containerRef.current
    if (!el) return
    setPosition({
      x: Math.random() * (el.clientWidth - TARGET_SIZE),
      y: Math.random() * (el.clientHeight - TARGET_SIZE),
    })
    setStartTime(performance.now())
    setReactionTime(null)
  }

  useEffect(() => {
    spawnTarget()
  }, [])

  function handleClick() {
    const time = performance.now() - startTime
    setReactionTime(time)
    onResult(time)
  }

  return (
    <div className="game">
      <div className="play-area" ref={containerRef}>
        {reactionTime === null ? (
          <button
            className="target"
            style={{ left: position.x, top: position.y }}
            onClick={handleClick}
            aria-label="Click me"
          />
        ) : (
          <div className="result">
            <p className="result-time">{Math.round(reactionTime)} ms</p>
            <button className="retry" onClick={spawnTarget}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ButtonGame
