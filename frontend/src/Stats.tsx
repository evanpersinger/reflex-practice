type Props = {
  times: number[]
}

function Stats({ times }: Props) {
  const best = times.length ? Math.min(...times) : null
  const average = times.length
    ? times.reduce((sum, t) => sum + t, 0) / times.length
    : null

  return (
    <div className="stats">
      <h1>Stats</h1>
      {times.length === 0 ? (
        <p>No attempts yet.</p>
      ) : (
        <ul>
          <li>Attempts: {times.length}</li>
          <li>Best: {Math.round(best as number)} ms</li>
          <li>Average: {Math.round(average as number)} ms</li>
        </ul>
      )}
    </div>
  )
}

export default Stats
