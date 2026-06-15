"""Compact prompts and state summarizers.

Key cost-control idea: the LLM never sees full history. Each tick we send a
small summarized snapshot (current metrics, last 3 decisions, active
directives, a few unanswered reviews) and ask for strict JSON back.
"""
from __future__ import annotations

from models import Business, World

# --------------------------------------------------------------------------
# System prompts
# --------------------------------------------------------------------------
STOREFRONT_SYSTEM = """You are the autonomous operator of an online store in a \
simulated marketplace.

STORE: {name}
CONCEPT: {concept}

GOAL: maximize cumulative profit (revenue - cost of goods - marketing). You run \
on a tick-based loop (one tick ~= one business day). Each tick you receive a \
compact snapshot of your store and must return ONE decision.

LEVERS:
- set_price: adjust a product's price (elastic demand: lower price -> more units).
- launch_product: add a new product (name, category, price, unit_cost).
- discontinue_product: drop a weak product.
- set_marketing_spend: per-tick ad spend; drives traffic with diminishing returns.
- reply_to_review: respond to a customer review (helps reputation).
- hold: do nothing this tick.

RULES:
- You may only spend marketing/launch costs you can afford from your cash.
- Follow any CEO/founder directives in the snapshot.
- Keep reasoning under 280 characters.

Return STRICT JSON only, matching this shape (no prose, no markdown):
{{"reasoning": str, "actions": [ <one or more action objects> ],
  "confidence": 0..1, "needs_budget": number}}
Action objects use a "type" field, one of: set_price, launch_product, \
discontinue_product, set_marketing_spend, reply_to_review, hold."""

CEO_SYSTEM = """You are the CEO overseeing a portfolio of autonomous online \
stores in a simulated marketplace. You review them periodically and reallocate \
a shared treasury toward the best performers.

GOAL: maximize total portfolio profit.

LEVERS:
- allocations: move treasury cash into each store (budget = new capital to add).
- directives: short instructions pushed into a store operator's next prompt.
- lifecycle: pause a chronic loser, resume a paused store, or spawn a new concept.

RULES:
- Total allocations must not exceed the available treasury shown.
- Favor stores with strong recent profit and momentum; starve or pause losers.
- Keep reasoning under 280 characters.

Return STRICT JSON only (no prose, no markdown):
{{"reasoning": str, "allocations": [{{"business_id": str, "budget": number, \
"priority": "high"|"normal"|"low"}}], "directives": [{{"business_id": str, \
"instruction": str}}], "lifecycle": [{{"business_id": str, "action": \
"pause"|"resume"|"spawn", "concept": str|null}}]}}"""


def storefront_system(business: Business) -> str:
    return STOREFRONT_SYSTEM.format(name=business.name, concept=business.concept)


# --------------------------------------------------------------------------
# Summarizers (compact JSON-able dicts)
# --------------------------------------------------------------------------
def summarize_storefront(business: Business, world: World) -> dict:
    m = business.metrics
    unanswered = [
        {"review_id": r.id, "product_id": r.product_id,
         "rating": r.rating, "text": r.text}
        for r in business.reviews if r.reply is None
    ][-4:]
    recent = [e.reasoning for e in business.log if e.kind == "decision"][-3:]
    return {
        "business_id": business.id,
        "name": business.name,
        "concept": business.concept,
        "tick": world.tick,
        "season": world.season_label,
        "cash": round(business.cash, 2),
        "marketing_per_tick": round(business.marketing_per_tick, 2),
        "reputation": round(business.reputation, 2),
        "priority": business.priority,
        "directives": list(business.directives),
        "products": [
            {"product_id": p.id, "name": p.name, "category": p.category,
             "price": p.price, "unit_cost": p.unit_cost, "active": p.active}
            for p in business.products
        ],
        "last_tick": {
            "revenue": round(m.last_revenue, 2),
            "profit": round(m.last_profit, 2),
            "orders": m.last_orders,
        },
        "totals": {
            "revenue": round(m.total_revenue, 2),
            "profit": round(m.total_profit, 2),
            "orders": m.total_orders,
        },
        "unanswered_reviews": unanswered,
        "recent_decisions": recent,
    }


def summarize_world(world: World) -> dict:
    rows = []
    for b in world.businesses:
        m = b.metrics
        rows.append({
            "business_id": b.id,
            "name": b.name,
            "status": b.status,
            "priority": b.priority,
            "cash": round(b.cash, 2),
            "reputation": round(b.reputation, 2),
            "last_profit": round(m.last_profit, 2),
            "total_profit": round(m.total_profit, 2),
            "total_orders": m.total_orders,
        })
    return {
        "tick": world.tick,
        "season": world.season_label,
        "treasury_available": round(world.treasury, 2),
        "founder_instructions": list(world.ceo_inbox),
        "businesses": rows,
    }
