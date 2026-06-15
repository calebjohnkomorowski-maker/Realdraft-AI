"""Shared agent helpers."""
from __future__ import annotations

import time

from models import LogEntry


def make_log(tick: int, actor: str, kind: str, reasoning: str,
             actions: list[dict] | None = None) -> LogEntry:
    return LogEntry(
        tick=tick,
        ts=time.time(),
        actor=actor,
        kind=kind,
        reasoning=reasoning,
        actions=actions or [],
    )


_ACTION_LABELS = {
    "set_price": "Adjusting prices",
    "launch_product": "Launching a product",
    "discontinue_product": "Dropping a product",
    "set_marketing_spend": "Tuning marketing",
    "reply_to_review": "Replying to a customer",
    "hold": "Watching the market",
}


def action_label(actions: list[dict]) -> str:
    if not actions:
        return "Watching the market"
    return _ACTION_LABELS.get(actions[0].get("type", ""), "Working")
