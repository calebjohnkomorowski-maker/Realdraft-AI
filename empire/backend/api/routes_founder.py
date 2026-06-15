"""Founder panel: inject instructions into any storefront agent or the CEO."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/founder", tags=["founder"])


class Instruction(BaseModel):
    target: str = Field(description='business id or "ceo"')
    instruction: str = Field(min_length=1, max_length=240)


@router.post("/instruct")
def instruct(body: Instruction, request: Request) -> dict:
    sim = request.app.state.sim
    try:
        return sim.inject_instruction(body.target, body.instruction)
    except ValueError as err:
        raise HTTPException(400, str(err))
