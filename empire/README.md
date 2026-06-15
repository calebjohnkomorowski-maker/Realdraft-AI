# 🏛️ AI Business Empire — Control Room

A local, multi-agent "AI business empire" you can watch run. A **CEO agent**
oversees several **storefront agents**, each running its own simulated online
business in its own *room* of a building. Every tick each storefront looks at
its state, makes a decision (price changes, new products, marketing, customer
replies), executes it against a simulated marketplace, and reports metrics. The
CEO periodically reallocates a shared budget toward whoever is performing best.

The dashboard renders this as a **floor plan**: one room per business with a live
avatar, current action, revenue/orders/profit, and a scrolling feed of each
agent's reasoning. A **founder panel** lets you inject instructions into any
agent or the CEO.

> Runs out of the box with a **zero-cost deterministic mock engine**. Add an
> Anthropic API key to switch agent reasoning to **claude-sonnet-4-6**.

---

## Architecture

```
React dashboard  ──WebSocket /ws──►  FastAPI  ──►  Simulation (tick loop)
 (floor plan)     ◄──REST /api───            │         │
                                             │         ├─ StorefrontAgent ×N
                                             │         ├─ CeoAgent
                                             │         ├─ DecisionEngine  (mock | claude-sonnet-4-6)
                                             │         └─ Marketplace      (simulated | real connector)
                                             └─ SQLite (logs, transactions, snapshot)
```

| Layer | Where |
|-------|-------|
| Tick loop / orchestration | `backend/engine/simulation.py` |
| Speed control (pause/1x/fast) | `backend/engine/clock.py` |
| Strict decision schema (validated) | `backend/llm/schemas.py` |
| Decision engines (mock + live LLM) | `backend/llm/engine.py` |
| Anthropic wrapper | `backend/llm/client.py` |
| Prompts + state summarizers | `backend/agents/prompts.py` |
| Storefront / CEO behavior | `backend/agents/storefront.py`, `ceo.py` |
| **Swappable marketplace** | `backend/marketplace/` (see its README) |
| Persistence | `backend/store.py` |
| API | `backend/api/`, `backend/main.py` |
| Dashboard | `frontend/src/` |

---

## Setup

### 1. Backend

```bash
cd empire
cp .env.example .env          # edit if you want live LLM calls
pip install -r requirements.txt
cd backend
python -m uvicorn main:app --reload --port 8000
```

The simulation starts automatically and begins ticking. By default it runs the
**mock engine** (no key, no token cost). To use real agent reasoning, set in
`.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
USE_MOCK=false
ANTHROPIC_MODEL=claude-sonnet-4-6
```

### 2. Frontend

```bash
cd empire/frontend
npm install
npm run dev          # http://localhost:5173 (proxies /api and /ws to :8000)
```

Open **http://localhost:5173**.

---

## How the tick loop works

One **tick** ≈ one simulated business day. The loop lives in
`Simulation._do_tick()`:

1. **Advance time** — increment the tick and update the season
   (Spring→Summer→Fall→Winter every 10 ticks; season scales demand).
2. **Each active storefront agent:**
   - receives a **summarized** snapshot (current metrics, products, last 3
     decisions, active directives, a few unanswered reviews — *not* full
     history, to keep prompts small/cheap),
   - returns a **strict JSON decision** (validated by Pydantic),
   - the decision is applied to local state (price/marketing/products),
   - the **marketplace** resolves demand → orders, revenue, reviews,
   - cash, metrics, and reputation are settled.
3. **Every `CEO_REVIEW_EVERY` ticks** the CEO reviews the portfolio and returns
   allocations (move treasury → a store's cash), directives (pushed into a
   store's next prompt), and lifecycle actions (pause/resume/spawn).
4. **Persist** a snapshot to SQLite and **broadcast** the new world state to all
   connected dashboards over the WebSocket.

The loop runs as a background `asyncio` task; blocking work (including real LLM
calls) is offloaded with `asyncio.to_thread` so the server stays responsive.
Speed is controlled live: **pause / 1x / fast-forward** (`engine/clock.py`).

### Decision schema (strict + validated)

Defined in `backend/llm/schemas.py` with `extra="forbid"` and bounded fields, so
malformed or hallucinated output **fails validation instead of corrupting the
sim**. On invalid output the live engine does **one repair retry**, then falls
back to a safe `hold`. Storefront decision shape:

```jsonc
{
  "reasoning": "string (<=280 chars)",
  "actions": [
    { "type": "set_price", "product_id": "...", "new_price": 12.5 },
    { "type": "launch_product", "name": "...", "category": "...", "price": 18, "unit_cost": 6 },
    { "type": "discontinue_product", "product_id": "..." },
    { "type": "set_marketing_spend", "amount": 25, "channel": "ads|social|email" },
    { "type": "reply_to_review", "review_id": "...", "message": "..." },
    { "type": "hold", "note": "..." }
  ],
  "confidence": 0.0,
  "needs_budget": 0.0
}
```

The CEO returns `{ reasoning, allocations[], directives[], lifecycle[] }`
(see `CeoDecision`).

### Keeping LLM calls cheap
- Small, focused system prompts; **summarized** state per tick, never full
  history (`agents/prompts.py`).
- The CEO runs every *N* ticks, not every tick.
- Strict JSON + one bounded repair attempt; no open-ended retries.

---

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/state` | full world snapshot + mode + clock |
| GET | `/api/business/{id}` | one business |
| GET | `/api/logs?business_id=&limit=` | decision history |
| GET | `/api/transactions?business_id=&limit=` | transaction history |
| GET | `/api/control/status` | mode / speed / tick |
| POST | `/api/control/speed` | `{ "speed": "pause"\|"1x"\|"fast" }` |
| POST | `/api/founder/instruct` | `{ "target": "ceo"\|"<business_id>", "instruction": "..." }` |
| WS | `/ws` | pushes a world snapshot after every tick |

---

## Swapping the simulated marketplace for a real API

The marketplace is the one seam to the outside world, behind a single interface.
**The engine only ever calls `Marketplace.tick()`** — see
[`backend/marketplace/README.md`](backend/marketplace/README.md) for the full
guide. In short, the swap is one line in `engine/simulation.py`:

```python
self.marketplace = SimulatedMarketplace()        # ← replace with:
self.marketplace = ShopifyMarketplace(api_key=...)  # implements Marketplace
```

Your connector implements `tick(request) -> MarketResult`: push the agent's
pending price/product changes to the real store, pull orders + reviews since the
last tick, and map them into `Sale` / `NewReview`. Nothing else changes.

---

## Persistence

SQLite (`backend/empire.db`, configurable via `DB_PATH`) stores agent `logs`,
`transactions`, and a single world `snapshot`. On restart the simulation resumes
from the snapshot; delete the `.db` file to start fresh.

## Project note

This `empire/` app is self-contained and unrelated to the RealDraft real-estate
app that also lives in this repository.
