import { useEffect, useRef, useState } from 'react'

const DOT_SIZE = 80
const COUNTDOWN_SECONDS = 3

type Phase = 'idle' | 'countdown' | 'playing'

type Props = {
  onResult: (time: number) => void
}

function ButtonGame({ onResult }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [startTime, setStartTime] = useState(0)
  const [reactionTime, setReactionTime] = useState<number | null>(null)

  function startCountdown() {
    setReactionTime(null)
    setCountdown(COUNTDOWN_SECONDS)
    setPhase('countdown')
  }

  function spawnDot() {
    const el = containerRef.current
    if (!el) return
    setPosition({
      x: Math.random() * (el.clientWidth - DOT_SIZE),
      y: Math.random() * (el.clientHeight - DOT_SIZE),
    })
    setStartTime(performance.now())
    setPhase('playing')
  }

  useEffect(() => {
    if (phase !== 'countdown') return

    const timeout = setTimeout(() => {
      if (countdown === 1) {
        spawnDot()
      } else {
        setCountdown((c) => c - 1)
      }
    }, 1000)
    return () => clearTimeout(timeout)
  }, [phase, countdown])

  function handleClick() {
    const time = performance.now() - startTime
    setReactionTime(time)
    setPhase('idle')
    onResult(time)
  }

  return (
    <div className="game">
      <div className="timer-box">
        {reactionTime === null ? '--' : Math.round(reactionTime)} ms
      </div>

      <div className="play-area" ref={containerRef}>
        {phase === 'countdown' && <div className="countdown">{countdown}</div>}
        {phase === 'playing' && (
          <button
            className="dot"
            style={{ left: position.x, top: position.y }}
            onClick={handleClick}
            aria-label="Click the dot"
          />
        )}
      </div>

      <button
        className="start-button"
        onClick={startCountdown}
        disabled={phase !== 'idle'}
      >
        Start
      </button>
    </div>
  )
}

export default ButtonGame
