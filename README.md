# reflexes-practice

A browser-based reflexes practice game with two modes:

- **Button** — click a randomly placed target as fast as you can, reaction time is timed
- **Dodge** — pilot a 3D spaceship through incoming asteroids, survive as long as possible

## Stack

- Frontend: TypeScript + React + Vite
- Backend: Python (FastAPI)

## Run

Backend:

```bash
uv run uvicorn backend.main:app --reload --port 8020
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```
