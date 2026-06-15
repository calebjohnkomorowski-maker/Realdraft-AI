"""Speed controls: pause / 1x / fast-forward."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter(prefix="/api/control", tags=["control"])


class SpeedRequest(BaseModel):
    speed: str  # "pause" | "1x" | "fast"


@router.get("/status")
def status(request: Request) -> dict:
    sim = request.app.state.sim
    return {"mode": sim.mode, "clock": sim.clock.status(), "tick": sim.world.tick}


@router.post("/speed")
def set_speed(body: SpeedRequest, request: Request) -> dict:
    sim = request.app.state.sim
    try:
        sim.clock.set_speed(body.speed)
    except ValueError as err:
        raise HTTPException(400, str(err))
    return {"ok": True, "clock": sim.clock.status()}
