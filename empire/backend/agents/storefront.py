"""Storefront agent: turns one LLM/mock decision into marketplace effects."""
from __future__ import annotations

import random

from agents.base import action_label, make_log
from llm.engine import DecisionEngine
from marketplace import MarketRequest, Marketplace, ProductSnapshot
from models import Business, Product, Review, World


class StorefrontAgent:
    def __init__(self, engine: DecisionEngine, marketplace: Marketplace, store) -> None:
        self.engine = engine
        self.marketplace = marketplace
        self.store = store

    def tick(self, business: Business, world: World) -> None:
        # 1) Decide.
        decision = self.engine.storefront_decision(business, world)
        action_dicts = [a.model_dump() for a in decision.actions]

        # 2) Apply decision to state (price/marketing/products take effect now).
        self._apply(business, decision, world)

        entry = make_log(world.tick, business.id, "decision",
                         decision.reasoning, action_dicts)
        business.push_log(entry)
        business.current_action = action_label(action_dicts)
        self.store.add_log(entry)

        # 3) Resolve demand through the marketplace.
        effective_marketing = min(business.marketing_per_tick, max(business.cash, 0.0))
        request = MarketRequest(
            business_id=business.id,
            tick=world.tick,
            season_factor=world.season_factor,
            season_label=world.season_label,
            reputation=business.reputation,
            marketing_spend=effective_marketing,
            products=[
                ProductSnapshot(p.id, p.name, p.category, p.price, p.unit_cost, p.quality)
                for p in business.active_products()
            ],
        )
        result = self.marketplace.tick(request)

        # 4) Settle cash, metrics, reviews, reputation.
        self._settle(business, world, result, effective_marketing)

    # ------------------------------------------------------------------
    def _apply(self, business: Business, decision, world: World) -> None:
        rng = random.Random(hash(f"{business.id}:{world.tick}:q") & 0xFFFFFFFF)
        for action in decision.actions:
            t = action.type
            if t == "set_price":
                p = business.find_product(action.product_id)
                if p:
                    p.price = round(action.new_price, 2)
            elif t == "launch_product":
                business.products.append(Product.new(
                    action.name, action.category, action.price, action.unit_cost,
                    quality=round(rng.uniform(0.5, 0.78), 2)))
            elif t == "discontinue_product":
                p = business.find_product(action.product_id)
                if p:
                    p.active = False
            elif t == "set_marketing_spend":
                business.marketing_per_tick = round(action.amount, 2)
            elif t == "reply_to_review":
                r = business.find_review(action.review_id)
                if r and r.reply is None:
                    r.reply = action.message
                    business.reputation = min(1.0, business.reputation + 0.02)
            # hold: no-op

    def _settle(self, business: Business, world: World, result, marketing: float) -> None:
        m = business.metrics
        revenue, cogs, units = result.revenue, result.cogs, result.units
        profit = revenue - cogs - marketing

        business.cash = round(business.cash + revenue - cogs - marketing, 2)
        m.total_revenue += revenue
        m.total_cogs += cogs
        m.total_marketing += marketing
        m.total_orders += units
        m.last_revenue = revenue
        m.last_profit = round(profit, 2)
        m.last_orders = units

        # New reviews + reputation as a slow moving average of sentiment.
        for nr in result.reviews:
            review = Review.new(nr.product_id, nr.rating, nr.text, world.tick)
            business.reviews.append(review)
        if business.reviews:
            recent = business.reviews[-10:]
            sentiment = sum(r.rating for r in recent) / (5.0 * len(recent))
            business.reputation = round(0.85 * business.reputation + 0.15 * sentiment, 3)

        self.store.record_transaction(
            world.tick, business.id, revenue, cogs, marketing, business.cash)
