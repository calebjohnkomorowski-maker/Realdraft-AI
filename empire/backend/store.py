"""SQLite persistence: agent logs, transaction history, world snapshots.

Live state lives in memory (the World object); this layer records history and
lets the simulation resume after a restart.
"""
from __future__ import annotations

import json
import sqlite3
import time
from dataclasses import asdict

from models import (
    Business,
    LogEntry,
    Metrics,
    Product,
    Review,
    World,
)


class Store:
    def __init__(self, db_path: str) -> None:
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self) -> None:
        self._conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tick INTEGER, ts REAL, actor TEXT, kind TEXT,
                reasoning TEXT, actions TEXT
            );
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tick INTEGER, ts REAL, business_id TEXT, kind TEXT,
                revenue REAL, cogs REAL, marketing REAL, balance REAL
            );
            CREATE TABLE IF NOT EXISTS snapshot (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                data TEXT, updated_at REAL
            );
            """
        )
        self._conn.commit()

    # ---- history ------------------------------------------------------
    def add_log(self, entry: LogEntry) -> None:
        self._conn.execute(
            "INSERT INTO logs (tick, ts, actor, kind, reasoning, actions) "
            "VALUES (?,?,?,?,?,?)",
            (entry.tick, entry.ts, entry.actor, entry.kind, entry.reasoning,
             json.dumps(entry.actions)),
        )
        self._conn.commit()

    def record_transaction(self, tick: int, business_id: str, revenue: float,
                           cogs: float, marketing: float, balance: float,
                           kind: str = "sale") -> None:
        self._conn.execute(
            "INSERT INTO transactions (tick, ts, business_id, kind, revenue, "
            "cogs, marketing, balance) VALUES (?,?,?,?,?,?,?,?)",
            (tick, time.time(), business_id, kind, revenue, cogs, marketing, balance),
        )
        self._conn.commit()

    def get_logs(self, business_id: str | None = None, limit: int = 50) -> list[dict]:
        if business_id:
            cur = self._conn.execute(
                "SELECT * FROM logs WHERE actor=? ORDER BY id DESC LIMIT ?",
                (business_id, limit))
        else:
            cur = self._conn.execute(
                "SELECT * FROM logs ORDER BY id DESC LIMIT ?", (limit,))
        rows = []
        for r in cur.fetchall():
            d = dict(r)
            d["actions"] = json.loads(d["actions"] or "[]")
            rows.append(d)
        return rows

    def get_transactions(self, business_id: str | None = None,
                         limit: int = 100) -> list[dict]:
        if business_id:
            cur = self._conn.execute(
                "SELECT * FROM transactions WHERE business_id=? "
                "ORDER BY id DESC LIMIT ?", (business_id, limit))
        else:
            cur = self._conn.execute(
                "SELECT * FROM transactions ORDER BY id DESC LIMIT ?", (limit,))
        return [dict(r) for r in cur.fetchall()]

    # ---- snapshot (restart recovery) ----------------------------------
    def save_snapshot(self, world: World) -> None:
        data = json.dumps(_world_full(world))
        self._conn.execute(
            "INSERT INTO snapshot (id, data, updated_at) VALUES (1, ?, ?) "
            "ON CONFLICT(id) DO UPDATE SET data=excluded.data, "
            "updated_at=excluded.updated_at",
            (data, time.time()),
        )
        self._conn.commit()

    def load_snapshot(self) -> World | None:
        cur = self._conn.execute("SELECT data FROM snapshot WHERE id=1")
        row = cur.fetchone()
        if not row:
            return None
        try:
            return _world_from_full(json.loads(row["data"]))
        except Exception:
            return None


# --------------------------------------------------------------------------
# Full (de)serialization for snapshots
# --------------------------------------------------------------------------
def _world_full(world: World) -> dict:
    return {
        "tick": world.tick,
        "season_factor": world.season_factor,
        "season_label": world.season_label,
        "treasury": world.treasury,
        "ceo_inbox": list(world.ceo_inbox),
        "ceo_log": [asdict(e) for e in world.ceo_log],
        "businesses": [asdict(b) for b in world.businesses],
    }


def _world_from_full(d: dict) -> World:
    businesses = []
    for bd in d.get("businesses", []):
        b = Business(
            id=bd["id"], name=bd["name"], room=bd["room"], avatar=bd["avatar"],
            concept=bd["concept"],
            products=[Product(**p) for p in bd.get("products", [])],
            reviews=[Review(**r) for r in bd.get("reviews", [])],
            cash=bd.get("cash", 0.0),
            marketing_per_tick=bd.get("marketing_per_tick", 0.0),
            reputation=bd.get("reputation", 0.7),
            status=bd.get("status", "active"),
            priority=bd.get("priority", "normal"),
            directives=bd.get("directives", []),
            metrics=Metrics(**bd.get("metrics", {})),
            current_action=bd.get("current_action", ""),
            log=[LogEntry(**e) for e in bd.get("log", [])],
        )
        businesses.append(b)
    return World(
        tick=d.get("tick", 0),
        season_factor=d.get("season_factor", 1.0),
        season_label=d.get("season_label", "Spring"),
        treasury=d.get("treasury", 0.0),
        businesses=businesses,
        ceo_log=[LogEntry(**e) for e in d.get("ceo_log", [])],
        ceo_inbox=d.get("ceo_inbox", []),
    )
