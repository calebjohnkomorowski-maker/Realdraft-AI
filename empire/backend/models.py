"""In-memory domain model for the simulation.

These are plain dataclasses (not the LLM schemas). They hold live state, are
serialized to JSON for the dashboard, and snapshotted to SQLite for restart
recovery.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import asdict, dataclass, field


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


@dataclass
class Product:
    id: str
    name: str
    category: str
    price: float
    unit_cost: float
    quality: float = 0.6  # 0..1, set at launch, drives reviews/repeat demand
    active: bool = True

    @staticmethod
    def new(name: str, category: str, price: float, unit_cost: float,
            quality: float = 0.6) -> "Product":
        return Product(_id("prod"), name, category, round(price, 2),
                       round(unit_cost, 2), quality)


@dataclass
class Review:
    id: str
    product_id: str
    rating: int
    text: str
    tick: int
    reply: str | None = None

    @staticmethod
    def new(product_id: str, rating: int, text: str, tick: int) -> "Review":
        return Review(_id("rev"), product_id, rating, text, tick)


@dataclass
class LogEntry:
    """A single line in an agent's chain-of-thought feed."""
    tick: int
    ts: float
    actor: str          # business_id or "ceo"
    kind: str           # "decision" | "directive" | "founder" | "system"
    reasoning: str
    actions: list[dict] = field(default_factory=list)


@dataclass
class Metrics:
    total_revenue: float = 0.0
    total_cogs: float = 0.0
    total_marketing: float = 0.0
    total_orders: int = 0
    # last-tick deltas (for the live room display)
    last_revenue: float = 0.0
    last_profit: float = 0.0
    last_orders: int = 0

    @property
    def total_profit(self) -> float:
        return self.total_revenue - self.total_cogs - self.total_marketing


@dataclass
class Business:
    id: str
    name: str
    room: int
    avatar: str
    concept: str
    products: list[Product] = field(default_factory=list)
    reviews: list[Review] = field(default_factory=list)

    cash: float = 0.0              # working capital allocated by the CEO
    marketing_per_tick: float = 0.0
    reputation: float = 0.7        # 0..1, moving average of review sentiment

    status: str = "active"         # "active" | "paused"
    priority: str = "normal"       # high | normal | low
    directives: list[str] = field(default_factory=list)  # pending guidance

    metrics: Metrics = field(default_factory=Metrics)
    current_action: str = "Setting up shop"
    log: list[LogEntry] = field(default_factory=list)

    @staticmethod
    def new(name: str, room: int, avatar: str, concept: str) -> "Business":
        return Business(_id("biz"), name, room, avatar, concept)

    def active_products(self) -> list[Product]:
        return [p for p in self.products if p.active]

    def find_product(self, pid: str) -> Product | None:
        return next((p for p in self.products if p.id == pid), None)

    def find_review(self, rid: str) -> Review | None:
        return next((r for r in self.reviews if r.id == rid), None)

    def push_log(self, entry: LogEntry, keep: int = 40) -> None:
        self.log.append(entry)
        if len(self.log) > keep:
            self.log = self.log[-keep:]


@dataclass
class World:
    tick: int = 0
    season_factor: float = 1.0
    season_label: str = "Spring"
    treasury: float = 0.0
    businesses: list[Business] = field(default_factory=list)
    ceo_log: list[LogEntry] = field(default_factory=list)
    ceo_inbox: list[str] = field(default_factory=list)  # founder -> CEO notes

    def find(self, business_id: str) -> Business | None:
        return next((b for b in self.businesses if b.id == business_id), None)

    def active_businesses(self) -> list[Business]:
        return [b for b in self.businesses if b.status == "active"]

    def push_ceo_log(self, entry: LogEntry, keep: int = 40) -> None:
        self.ceo_log.append(entry)
        if len(self.ceo_log) > keep:
            self.ceo_log = self.ceo_log[-keep:]

    # ---- global P&L -----------------------------------------------------
    def global_pnl(self) -> dict:
        rev = sum(b.metrics.total_revenue for b in self.businesses)
        cogs = sum(b.metrics.total_cogs for b in self.businesses)
        mkt = sum(b.metrics.total_marketing for b in self.businesses)
        orders = sum(b.metrics.total_orders for b in self.businesses)
        return {
            "revenue": round(rev, 2),
            "cogs": round(cogs, 2),
            "marketing": round(mkt, 2),
            "profit": round(rev - cogs - mkt, 2),
            "orders": orders,
            "treasury": round(self.treasury, 2),
        }

    def to_dict(self) -> dict:
        return {
            "tick": self.tick,
            "season_factor": round(self.season_factor, 3),
            "season_label": self.season_label,
            "pnl": self.global_pnl(),
            "ceo_inbox": list(self.ceo_inbox),
            "ceo_log": [asdict(e) for e in self.ceo_log[-12:]],
            "businesses": [_business_to_dict(b) for b in self.businesses],
        }


def _business_to_dict(b: Business) -> dict:
    m = b.metrics
    return {
        "id": b.id,
        "name": b.name,
        "room": b.room,
        "avatar": b.avatar,
        "concept": b.concept,
        "status": b.status,
        "priority": b.priority,
        "cash": round(b.cash, 2),
        "marketing_per_tick": round(b.marketing_per_tick, 2),
        "reputation": round(b.reputation, 3),
        "current_action": b.current_action,
        "directives": list(b.directives),
        "products": [asdict(p) for p in b.products],
        "reviews": [asdict(r) for r in b.reviews[-8:]],
        "metrics": {
            "total_revenue": round(m.total_revenue, 2),
            "total_profit": round(m.total_profit, 2),
            "total_orders": m.total_orders,
            "last_revenue": round(m.last_revenue, 2),
            "last_profit": round(m.last_profit, 2),
            "last_orders": m.last_orders,
        },
        "log": [asdict(e) for e in b.log[-12:]],
    }
