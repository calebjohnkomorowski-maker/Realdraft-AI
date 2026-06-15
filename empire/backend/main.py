"""FastAPI entrypoint for the AI Business Empire control room."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from api import routes_control, routes_founder, routes_state
from config import settings
from engine.simulation import Simulation


@asynccontextmanager
async def lifespan(app: FastAPI):
    sim = Simulation(settings)
    app.state.sim = sim
    sim.start()
    try:
        yield
    finally:
        await sim.stop()


app = FastAPI(title="AI Business Empire", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_state.router)
app.include_router(routes_control.router)
app.include_router(routes_founder.router)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "mode": app.state.sim.mode}


@app.websocket("/ws")
async def ws(websocket: WebSocket) -> None:
    await websocket.accept()
    sim = websocket.app.state.sim
    queue = sim.bus.subscribe()
    # Send the current snapshot immediately so a fresh client isn't blank.
    await websocket.send_json({"type": "snapshot", "world": sim.snapshot(),
                               "mode": sim.mode, "clock": sim.clock.status()})
    try:
        while True:
            world = await queue.get()
            await websocket.send_json({"type": "snapshot", "world": world,
                                       "mode": sim.mode, "clock": sim.clock.status()})
    except WebSocketDisconnect:
        pass
    finally:
        sim.bus.unsubscribe(queue)
