"""Decision engines.

Two interchangeable implementations behind one interface:
- LLMDecisionEngine: builds compact prompts, calls claude-sonnet-4-6, validates
  the strict JSON, repairs once, then falls back safely.
- MockDecisionEngine: deterministic rule-based decisions so the whole sim runs
  with zero token cost (default).
"""
from __future__ import annotations

import json
import random
import re
from abc import ABC, abstractmethod

from pydantic import ValidationError

from agents.prompts import (
    CEO_SYSTEM,
    storefront_system,
    summarize_storefront,
    summarize_world,
)
from llm.client import AnthropicClient
from llm.schemas import CeoDecision, StorefrontDecision
from models import Business, World


class DecisionEngine(ABC):
    @abstractmethod
    def storefront_decision(self, business: Business, world: World) -> StorefrontDecision: ...

    @abstractmethod
    def ceo_decision(self, world: World) -> CeoDecision: ...


# --------------------------------------------------------------------------
# JSON helpers
# --------------------------------------------------------------------------
def extract_json(text: str) -> dict:
    """Pull the first JSON object out of a model response."""
    text = text.strip()
    # Strip ```json fences if present.
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence:
        text = fence.group(1)
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("no JSON object found in response")
    return json.loads(text[start:end + 1])


# --------------------------------------------------------------------------
# Live LLM engine
# --------------------------------------------------------------------------
class LLMDecisionEngine(DecisionEngine):
    def __init__(self, client: AnthropicClient) -> None:
        self._client = client

    def _decide(self, system: str, payload: dict, model_cls):
        user = json.dumps(payload, separators=(",", ":"))
        raw = self._client.complete(system, user)
        try:
            return model_cls.model_validate(extract_json(raw))
        except (ValidationError, ValueError, json.JSONDecodeError) as err:
            # One repair attempt: show the model its own output and the error.
            repair = (
                f"Your previous reply was invalid: {err}\n"
                f"Previous reply:\n{raw}\n"
                "Return corrected STRICT JSON only."
            )
            raw2 = self._client.complete(system, user + "\n\n" + repair)
            return model_cls.model_validate(extract_json(raw2))

    def storefront_decision(self, business: Business, world: World) -> StorefrontDecision:
        try:
            return self._decide(
                storefront_system(business),
                summarize_storefront(business, world),
                StorefrontDecision,
            )
        except Exception as err:  # never crash the tick loop
            return _safe_hold(f"LLM error, holding: {err}")

    def ceo_decision(self, world: World) -> CeoDecision:
        try:
            return self._decide(CEO_SYSTEM, summarize_world(world), CeoDecision)
        except Exception as err:
            return CeoDecision(reasoning=f"LLM error, no changes: {err}")


def _safe_hold(reason: str) -> StorefrontDecision:
    return StorefrontDecision(
        reasoning=reason[:280],
        actions=[{"type": "hold", "note": "fallback"}],
        confidence=0.0,
    )


# --------------------------------------------------------------------------
# Mock engine (rule-based, zero cost)
# --------------------------------------------------------------------------
class MockDecisionEngine(DecisionEngine):
    def _rng(self, seed_parts: str) -> random.Random:
        return random.Random(hash(seed_parts) & 0xFFFFFFFF)

    def storefront_decision(self, business: Business, world: World) -> StorefrontDecision:
        rng = self._rng(f"{business.id}:{world.tick}")
        m = business.metrics
        actions: list[dict] = []
        notes: list[str] = []
        active = business.active_products()

        # 0) No products live -> launch a starter.
        if not active and business.cash > 40:
            actions.append(_starter_product(business, rng))
            notes.append("No live products; launching a starter.")
            return StorefrontDecision(
                reasoning=_join(notes), actions=actions, confidence=0.5)

        # 1) Reputation repair: reply to a poor unanswered review.
        bad = next((r for r in business.reviews
                    if r.reply is None and r.rating <= 3), None)
        if bad and rng.random() < 0.7:
            actions.append({
                "type": "reply_to_review",
                "review_id": bad.id,
                "message": "Thanks for the feedback — we're improving this. "
                           "Reach out and we'll make it right.",
            })
            notes.append("Addressing a critical review.")

        # 2) Pricing: no orders last tick -> discount the priciest product.
        if active and m.last_orders == 0:
            target = max(active, key=lambda p: p.price)
            new_price = max(round(target.price * 0.9, 2), round(target.unit_cost * 1.2, 2))
            if new_price < target.price:
                actions.append({"type": "set_price", "product_id": target.id,
                                "new_price": new_price})
                notes.append(f"No sales; cutting {target.name} price.")
        elif active and m.last_profit > 0 and rng.random() < 0.25:
            # Selling well -> test a small price increase on the cheapest item.
            target = min(active, key=lambda p: p.price)
            actions.append({"type": "set_price", "product_id": target.id,
                            "new_price": round(target.price * 1.05, 2)})
            notes.append(f"Demand is healthy; nudging {target.name} price up.")

        # 3) Marketing: scale with what's working / affordable.
        cap = max(0.0, business.cash - 30.0)
        if m.last_profit < 0 and business.marketing_per_tick > 0:
            spend = round(business.marketing_per_tick * 0.6, 2)
            actions.append({"type": "set_marketing_spend", "amount": spend,
                            "channel": "social"})
            notes.append("Trimming marketing to protect margin.")
        elif m.last_profit > 5 and cap > business.marketing_per_tick + 10:
            spend = round(min(business.marketing_per_tick + 8.0, cap, 80.0), 2)
            actions.append({"type": "set_marketing_spend", "amount": spend,
                            "channel": rng.choice(["ads", "social", "email"])})
            notes.append("Profitable; pressing on marketing.")

        # 4) Occasionally expand the catalog.
        if world.tick > 0 and world.tick % 15 == 0 and business.cash > 120 and len(active) < 5:
            actions.append(_starter_product(business, rng))
            notes.append("Expanding the product line.")

        if not actions:
            actions.append({"type": "hold", "note": "Steady; observing demand."})
            notes.append("Holding to gather more demand signal.")

        return StorefrontDecision(
            reasoning=_join(notes)[:280], actions=actions[:4],
            confidence=round(rng.uniform(0.4, 0.8), 2))

    def ceo_decision(self, world: World) -> CeoDecision:
        active = world.active_businesses()
        treasury = world.treasury
        allocations, directives, lifecycle = [], [], []

        if active and treasury > 0:
            weights = {b.id: max(b.metrics.last_profit, 0) + 5.0 for b in active}
            total_w = sum(weights.values()) or 1.0
            remaining = treasury
            ranked = sorted(active, key=lambda b: b.metrics.last_profit, reverse=True)
            for i, b in enumerate(ranked):
                share = round(min(remaining, treasury * weights[b.id] / total_w), 2)
                remaining = round(remaining - share, 2)
                priority = "high" if i == 0 else ("low" if i == len(ranked) - 1 else "normal")
                allocations.append({"business_id": b.id, "budget": share,
                                    "priority": priority})

        # Directive + possible pause for chronic losers.
        for b in active:
            if b.metrics.total_profit < -150:
                directives.append({
                    "business_id": b.id,
                    "instruction": "Profit is deep negative — cut marketing, test "
                                   "lower prices, and drop weak products.",
                })
            if b.metrics.total_profit < -400 and b.cash < 25:
                lifecycle.append({"business_id": b.id, "action": "pause",
                                  "concept": None})

        top = max(active, key=lambda b: b.metrics.last_profit, default=None)
        reasoning = "Reallocating treasury toward momentum."
        if top:
            reasoning = f"Backing {top.name} (best recent profit); pressuring laggards."

        return CeoDecision(reasoning=reasoning[:280], allocations=allocations,
                           directives=directives, lifecycle=lifecycle)


_CONCEPT_PRODUCTS = {
    "clothing": [("Graphic Tee", "clothing", 24, 8), ("Cozy Hoodie", "clothing", 42, 16),
                 ("Tote Bag", "clothing", 18, 6)],
    "mugs": [("11oz Ceramic Mug", "mugs", 16, 5), ("Travel Tumbler", "drinkware", 28, 11),
             ("Enamel Camp Mug", "mugs", 22, 8)],
    "templates": [("Resume Template", "templates", 12, 0.5),
                  ("Notion Dashboard", "templates", 19, 0.5),
                  ("Social Media Kit", "templates", 15, 0.5)],
    "candles": [("Soy Candle", "candles", 20, 7), ("Wax Melts", "candles", 12, 4)],
}


def _starter_product(business: Business, rng: random.Random) -> dict:
    key = next((k for k in _CONCEPT_PRODUCTS if k in business.concept.lower()), None)
    pool = _CONCEPT_PRODUCTS.get(key or "", [("New Product", "general", 18, 7)])
    existing = {p.name for p in business.products}
    choices = [c for c in pool if c[0] not in existing] or pool
    name, category, price, cost = rng.choice(choices)
    return {"type": "launch_product", "name": name, "category": category,
            "price": float(price), "unit_cost": float(cost)}


def _join(parts: list[str]) -> str:
    return " ".join(parts) if parts else "Holding."


# --------------------------------------------------------------------------
# Factory
# --------------------------------------------------------------------------
def build_engine(settings) -> DecisionEngine:
    if settings.use_mock:
        return MockDecisionEngine()
    return LLMDecisionEngine(AnthropicClient(settings.anthropic_api_key,
                                             settings.anthropic_model))
