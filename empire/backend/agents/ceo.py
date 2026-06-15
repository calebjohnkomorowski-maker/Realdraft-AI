"""CEO agent: reviews the portfolio and reallocates the shared treasury."""
from __future__ import annotations

from agents.base import make_log
from llm.engine import DecisionEngine
from models import Business, World

_AVATARS = ["🧵", "☕", "📐", "🕯️", "💍", "🎨", "🧴", "🪴"]


class CeoAgent:
    def __init__(self, engine: DecisionEngine, store) -> None:
        self.engine = engine
        self.store = store

    def review(self, world: World) -> None:
        decision = self.engine.ceo_decision(world)

        # Allocations: move treasury -> business cash (clamped to availability).
        moved = []
        for alloc in decision.allocations:
            b = world.find(alloc.business_id)
            if not b:
                continue
            amount = round(min(alloc.budget, max(world.treasury, 0.0)), 2)
            if amount > 0:
                b.cash = round(b.cash + amount, 2)
                world.treasury = round(world.treasury - amount, 2)
                self.store.record_transaction(world.tick, b.id, 0.0, 0.0,
                                              -amount, b.cash, kind="allocation")
                moved.append(f"{b.name}+${amount:.0f}")
            b.priority = alloc.priority

        # Directives: pushed into the operator's next prompt.
        for d in decision.directives:
            b = world.find(d.business_id)
            if not b:
                continue
            b.directives.append(d.instruction)
            b.directives = b.directives[-3:]
            b.push_log(make_log(world.tick, b.id, "directive",
                                f"CEO: {d.instruction}"))

        # Lifecycle changes.
        for lc in decision.lifecycle:
            self._lifecycle(world, lc)

        summary = decision.reasoning
        if moved:
            summary = f"{summary} ({', '.join(moved)})"
        entry = make_log(world.tick, "ceo", "decision", summary[:280],
                         [a.model_dump() for a in decision.allocations])
        world.push_ceo_log(entry)
        self.store.add_log(entry)

        # Acknowledge & consume any founder guidance addressed to the CEO.
        for note in world.ceo_inbox:
            self.store.add_log(make_log(world.tick, "ceo", "founder",
                                        f"Founder guidance noted: {note}"))
        world.ceo_inbox.clear()

    def _lifecycle(self, world: World, lc) -> None:
        if lc.action == "spawn":
            room = max((b.room for b in world.businesses), default=0) + 1
            avatar = _AVATARS[(room - 1) % len(_AVATARS)]
            concept = lc.concept or "A new experimental storefront."
            biz = Business.new(f"Room {room}", room, avatar, concept)
            seed = round(min(200.0, max(world.treasury, 0.0)), 2)
            biz.cash = seed
            world.treasury = round(world.treasury - seed, 2)
            world.businesses.append(biz)
            world.push_ceo_log(make_log(world.tick, "ceo", "system",
                                        f"Spawned {biz.name}: {concept}"))
            return

        b = world.find(lc.business_id)
        if not b:
            return
        if lc.action == "pause":
            b.status = "paused"
            b.current_action = "Paused by CEO"
            # Return idle cash to the treasury.
            world.treasury = round(world.treasury + max(b.cash, 0.0), 2)
            b.cash = 0.0
        elif lc.action == "resume":
            b.status = "active"
            b.current_action = "Resuming operations"
