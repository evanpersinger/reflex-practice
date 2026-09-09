import sqlite3
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DB_PATH = Path(__file__).parent / "reflexes.db"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3008"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game TEXT NOT NULL,
                time_ms REAL NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


init_db()


class AttemptCreate(BaseModel):
    game: str
    time_ms: float


class Attempt(AttemptCreate):
    id: int
    created_at: str


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/attempts")
def create_attempt(attempt: AttemptCreate) -> Attempt:
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO attempts (game, time_ms) VALUES (?, ?)",
            (attempt.game, attempt.time_ms),
        )
        row = conn.execute(
            "SELECT * FROM attempts WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
    return Attempt(**dict(row))


@app.get("/api/attempts/{game}")
def list_attempts(game: str) -> list[Attempt]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM attempts WHERE game = ? ORDER BY id", (game,)
        ).fetchall()
    return [Attempt(**dict(row)) for row in rows]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8020)
