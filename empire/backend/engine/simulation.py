"""The tick-based simulation orchestrator.

Owns the World and drives it forward: each tick every active storefront agent
decides + executes against the marketplace; every N ticks the CEO reviews and
reallocates. Runs as a background asyncio task and broadcasts a world snapshot
after every tick.
"""
from __future__ import annotations

import asyncio

from agents.base import make_log
from agents.ceo import CeoAgent
from agents.storefront import StorefrontAgent
from engine.clock import Clock
from engine.events import EventBus
from llm.engine import build_engine
from marketplace import SimulatedMarketplace
from models import Business, Product, World
from store import Store

# (label, season multiplier) cycled every 10 ticks.
_SEASONS = [("Spring", 1.0), ("Summer", 0.9), ("Fall", 1.1), ("Winter", 1.25)]


class Simulation:
    def __init__(self, settings) -> None:
        self.settings = settings
        self.store = Store(settings.db_path)
        self.engine = build_engine(settings)
        self.marketplace = SimulatedMarketplace()
        self.clock = Clock(settings.base_tick_seconds)
        self.bus = EventBus()

        self.storefront = StorefrontAgent(self.engine, self.marketplace, self.store)
        self.ceo = CeoAgent(self.engine, self.store)

        self.world = self.store.load_snapshot() or self._seed_world()
        self._task: asyncio.Task | None = None
        self._running = False

    @property
    def mode(self) -> str:
        return "mock" if self.settings.use_mock else "live"

    # ------------------------------------------------------------------
    def _seed_world(self) -> World:
        world = World(treasury=self.settings.starting_treasury)
        seeds = [
            ("Thread & Co.", "🧵", "An Etsy clothing store selling graphic tees and totes.",
             [("Graphic Tee", "clothing", 24, 8), ("Tote Bag", "clothing", 18, 6)]),
            ("Mug Lab", "☕", "A print-on-demand shop for ceramic mugs and tumblers.",
             [("11oz Ceramic Mug", "mugs", 16, 5), ("Travel Tumbler", "drinkware", 28, 11)]),
            ("Template Forge", "📐", "A digital store selling resume and Notion templates.",
             [("Resume Template", "templates", 12, 0.5), ("Notion Dashboard", "templates", 19, 0.5)]),
        ]
        seed_cash = 300.0
        for i, (name, avatar, concept, products) in enumerate(seeds, start=1):
            b = Business.new(name, i, avatar, concept)
            b.cash = seed_cash
            b.marketing_per_tick = 10.0
            for pname, cat, price, cost in products:
                b.products.append(Product.new(pname, cat, price, cost, quality=0.65))
            world.businesses.append(b)
            world.treasury = round(world.treasury - seed_cash, 2)
        world.push_ceo_log(make_log(0, "ceo", "system",
                                    "Empire initialized with 3 storefronts."))
        return world

    # ------------------------------------------------------------------
    def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._running = True
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        self._running = False
        if self._task:
            await asyncio.gather(self._task, return_exceptions=True)

    async def _run(self) -> None:
        while self._running:
            if self.clock.is_paused:
                await asyncio.sleep(0.1)
                continue
            # Run the (potentially blocking) tick off the event loop.
            snapshot = await asyncio.to_thread(self._do_tick)
            await self.bus.publish(snapshot)
            await asyncio.sleep(self.clock.delay())

    def _do_tick(self) -> dict:
        w = self.world
        w.tick += 1
        label, factor = _SEASONS[(w.tick // 10) % len(_SEASONS)]
        w.season_label, w.season_factor = label, factor

        for b in w.active_businesses():
            self.storefront.tick(b, w)

        if w.tick % self.settings.ceo_review_every == 0:
            self.ceo.review(w)

        self.store.save_snapshot(w)
        return w.to_dict()

    # ------------------------------------------------------------------
    # Founder controls
    def inject_instruction(self, target: str, instruction: str) -> dict:
        instruction = instruction.strip()
        if not instruction:
            raise ValueError("instruction is empty")
        if target == "ceo":
            self.world.ceo_inbox.append(instruction)
            entry = make_log(self.world.tick, "ceo", "founder",
                             f"Founder → CEO: {instruction}")
            self.world.push_ceo_log(entry)
            self.store.add_log(entry)
            return {"ok": True, "target": "ceo"}

        b = self.world.find(target)
        if not b:
            raise ValueError(f"unknown target: {target}")
        b.directives.append(instruction)
        b.directives = b.directives[-3:]
        entry = make_log(self.world.tick, b.id, "founder",
                         f"Founder: {instruction}")
        b.push_log(entry)
        self.store.add_log(entry)
        return {"ok": True, "target": b.id}

    def snapshot(self) -> dict:
        return self.world.to_dict()
