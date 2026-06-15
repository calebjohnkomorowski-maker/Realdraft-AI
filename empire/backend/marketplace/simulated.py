"""Deterministic-ish simulated marketplace.

Generates demand from price elasticity, marketing, reputation, product quality,
and seasonality. Swappable for a real connector via the Marketplace interface.
"""
from __future__ import annotations

import hashlib
import math
import random

from .interface import (
    Marketplace,
    MarketRequest,
    MarketResult,
    NewReview,
    Sale,
)

# Rough baseline daily demand by category at a "fair" reference price.
_CATEGORY_BASE = {
    "clothing": 3.0,
    "apparel": 3.0,
    "mugs": 2.4,
    "drinkware": 2.4,
    "templates": 4.0,   # digital: cheap, higher volume
    "digital": 4.0,
    "candles": 2.6,
    "jewelry": 1.8,
    "art": 1.8,
    "stickers": 3.2,
}
_DEFAULT_BASE = 2.0

# Categories that sell better in certain seasons (multiplier when in season).
_SEASONAL = {
    "candles": {"Winter": 1.5, "Fall": 1.2},
    "clothing": {"Fall": 1.3, "Spring": 1.2},
    "apparel": {"Fall": 1.3, "Spring": 1.2},
    "mugs": {"Winter": 1.3},
    "drinkware": {"Winter": 1.3},
}

_POSITIVE = [
    "Exactly as pictured, love it!",
    "Fast shipping and great quality.",
    "Bought again — consistently good.",
    "Better than expected for the price.",
]
_MIXED = [
    "Nice but a little pricey.",
    "Good product, slow to arrive.",
    "Decent quality, packaging was meh.",
]
_NEGATIVE = [
    "Not worth the price.",
    "Quality wasn't what I hoped.",
    "Felt overpriced for what it is.",
]


class SimulatedMarketplace(Marketplace):
    def __init__(self, seed: int = 1337) -> None:
        self._seed = seed

    def _rng(self, request: MarketRequest, salt: str) -> random.Random:
        key = f"{self._seed}:{request.business_id}:{request.tick}:{salt}"
        digest = hashlib.sha256(key.encode()).hexdigest()
        return random.Random(int(digest[:16], 16))

    def tick(self, request: MarketRequest) -> MarketResult:
        result = MarketResult()
        # Marketing has diminishing returns and is shared across the catalog.
        marketing_factor = 1.0 + 0.35 * math.log1p(max(0.0, request.marketing_spend) / 20.0)
        rep_factor = 0.5 + request.reputation  # 0.5 .. 1.5

        for p in request.products:
            rng = self._rng(request, p.id)
            base = _CATEGORY_BASE.get(p.category.lower(), _DEFAULT_BASE)

            # Reference "fair" price ~ 3x unit cost (or $12 if cost unknown).
            ref_price = max(p.unit_cost * 3.0, 8.0)
            # Price elasticity: cheaper than reference -> more demand.
            price_factor = (ref_price / max(p.price, 0.01)) ** 1.3
            price_factor = min(price_factor, 2.2)

            quality_factor = 0.6 + 0.8 * p.quality  # 0.6 .. 1.4

            seasonal = _SEASONAL.get(p.category.lower(), {})
            season_cat = seasonal.get(request.season_label, 1.0)

            expected = (
                base
                * price_factor
                * marketing_factor
                * rep_factor
                * quality_factor
                * request.season_factor
                * season_cat
            )
            # Poisson-ish noise around expectation.
            noise = rng.uniform(0.7, 1.3)
            units = max(0, int(round(expected * noise)))
            if units == 0:
                continue

            revenue = round(units * p.price, 2)
            cogs = round(units * p.unit_cost, 2)
            result.sales.append(Sale(p.id, units, revenue, cogs))

            # Reviews: ~1 per 6 units, sentiment from quality vs price/value.
            n_reviews = rng.random() < (units / 6.0)
            if n_reviews:
                value = quality_factor / price_factor  # quality you get per dollar pressure
                roll = rng.random() + (value - 0.8) * 0.4
                if roll > 0.75:
                    rating, text = 5, rng.choice(_POSITIVE)
                elif roll > 0.45:
                    rating, text = 4, rng.choice(_MIXED)
                elif roll > 0.25:
                    rating, text = 3, rng.choice(_MIXED)
                else:
                    rating, text = rng.choice([1, 2]), rng.choice(_NEGATIVE)
                result.reviews.append(NewReview(p.id, rating, text))

        return result
