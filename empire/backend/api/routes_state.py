"""Read endpoints: world state, per-business detail, history."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/api", tags=["state"])


def _sim(request: Request):
    return request.app.state.sim


@router.get("/state")
def get_state(request: Request) -> dict:
    sim = _sim(request)
    return {"mode": sim.mode, "clock": sim.clock.status(), "world": sim.snapshot()}


@router.get("/business/{business_id}")
def get_business(business_id: str, request: Request) -> dict:
    sim = _sim(request)
    b = sim.world.find(business_id)
    if not b:
        raise HTTPException(404, "business not found")
    from models import _business_to_dict
    return _business_to_dict(b)


@router.get("/logs")
def get_logs(request: Request, business_id: str | None = None, limit: int = 50) -> dict:
    return {"logs": _sim(request).store.get_logs(business_id, limit)}


@router.get("/transactions")
def get_transactions(request: Request, business_id: str | None = None,
                     limit: int = 100) -> dict:
    return {"transactions": _sim(request).store.get_transactions(business_id, limit)}
