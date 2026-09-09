import { useEffect, useState } from 'react'
import './App.css'
import ButtonGame from './ButtonGame'
import DodgeGame from './DodgeGame'
import Stats from './Stats'

type Screen = 'button' | 'dodge' | 'stats'
type Attempt = { time_ms: number }

function App() {
  const [screen, setScreen] = useState<Screen>('button')
  const [times, setTimes] = useState<number[]>([])

  useEffect(() => {
    fetch('/api/attempts/button')
      .then((res) => res.json())
      .then((attempts: Attempt[]) => setTimes(attempts.map((a) => a.time_ms)))
      .catch(() => {})
  }, [])

  function recordResult(time: number) {
    setTimes((prev) => [...prev, time])
    fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'button', time_ms: time }),
    }).catch(() => {})
  }

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-games">
          <button
            className={`nav-button ${screen === 'button' ? 'active' : ''}`}
            onClick={() => setScreen('button')}
          >
            Button
          </button>
          <button
            className={`nav-button ${screen === 'dodge' ? 'active' : ''}`}
            onClick={() => setScreen('dodge')}
          >
            Dodge
          </button>
        </div>
        <button
          className={`nav-button ${screen === 'stats' ? 'active' : ''}`}
          onClick={() => setScreen('stats')}
        >
          Stats
        </button>
      </nav>

      {screen === 'button' && <ButtonGame onResult={recordResult} />}
      {screen === 'dodge' && <DodgeGame />}
      {screen === 'stats' && <Stats times={times} />}
    </div>
  )
}

export default App
