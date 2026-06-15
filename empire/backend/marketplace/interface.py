"""The swappable marketplace boundary.

This is the ONE seam between the simulation and "the outside world." Today a
deterministic simulator implements it. To go live, write a class that
implements `Marketplace.tick()` against a real Etsy/Shopify API and inject it
at startup (see marketplace/README.md). Nothing else in the codebase needs to
change because the engine only ever talks to this interface.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ProductSnapshot:
    id: str
    name: str
    category: str
    price: float
    unit_cost: float
    quality: float


@dataclass
class MarketRequest:
    """Everything the marketplace needs to resolve one tick for one business."""
    business_id: str
    tick: int
    season_factor: float
    season_label: str
    reputation: float
    marketing_spend: float
    products: list[ProductSnapshot] = field(default_factory=list)


@dataclass
class Sale:
    product_id: str
    units: int
    revenue: float
    cogs: float


@dataclass
class NewReview:
    product_id: str
    rating: int          # 1..5
    text: str


@dataclass
class MarketResult:
    sales: list[Sale] = field(default_factory=list)
    reviews: list[NewReview] = field(default_factory=list)

    @property
    def units(self) -> int:
        return sum(s.units for s in self.sales)

    @property
    def revenue(self) -> float:
        return sum(s.revenue for s in self.sales)

    @property
    def cogs(self) -> float:
        return sum(s.cogs for s in self.sales)


class Marketplace(ABC):
    """Implement this to plug in a real storefront API."""

    @abstractmethod
    def tick(self, request: MarketRequest) -> MarketResult:
        """Resolve demand/orders/reviews for one business for one tick."""
        raise NotImplementedError
