"""Strict, validated JSON schemas for agent decisions.

These Pydantic models ARE the contract the LLM (or mock engine) must satisfy.
`extra="forbid"` plus bounded fields means a hallucinated/extra field fails
validation instead of silently corrupting the simulation.
"""
from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field

# Shared config: reject unknown keys.
_strict = ConfigDict(extra="forbid")


# --------------------------------------------------------------------------
# Storefront actions (discriminated union on "type")
# --------------------------------------------------------------------------
class SetPrice(BaseModel):
    model_config = _strict
    type: Literal["set_price"]
    product_id: str
    new_price: float = Field(gt=0, le=10_000)


class LaunchProduct(BaseModel):
    model_config = _strict
    type: Literal["launch_product"]
    name: str = Field(min_length=2, max_length=60)
    category: str = Field(min_length=2, max_length=40)
    price: float = Field(gt=0, le=10_000)
    unit_cost: float = Field(ge=0, le=10_000)


class DiscontinueProduct(BaseModel):
    model_config = _strict
    type: Literal["discontinue_product"]
    product_id: str


class SetMarketingSpend(BaseModel):
    model_config = _strict
    type: Literal["set_marketing_spend"]
    amount: float = Field(ge=0, le=10_000)
    channel: Literal["ads", "social", "email"]


class ReplyToReview(BaseModel):
    model_config = _strict
    type: Literal["reply_to_review"]
    review_id: str
    message: str = Field(min_length=1, max_length=280)


class Hold(BaseModel):
    model_config = _strict
    type: Literal["hold"]
    note: str = Field(default="", max_length=160)


StorefrontAction = Annotated[
    Union[
        SetPrice,
        LaunchProduct,
        DiscontinueProduct,
        SetMarketingSpend,
        ReplyToReview,
        Hold,
    ],
    Field(discriminator="type"),
]


class StorefrontDecision(BaseModel):
    model_config = _strict
    reasoning: str = Field(max_length=280)
    actions: list[StorefrontAction] = Field(min_length=1, max_length=4)
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)
    needs_budget: float = Field(ge=0, le=100_000, default=0.0)


# --------------------------------------------------------------------------
# CEO decision
# --------------------------------------------------------------------------
class CeoAllocation(BaseModel):
    model_config = _strict
    business_id: str
    budget: float = Field(ge=0, le=1_000_000)
    priority: Literal["high", "normal", "low"] = "normal"


class CeoDirective(BaseModel):
    model_config = _strict
    business_id: str
    instruction: str = Field(min_length=1, max_length=240)


class CeoLifecycle(BaseModel):
    model_config = _strict
    business_id: str
    action: Literal["pause", "resume", "spawn"]
    concept: str | None = Field(default=None, max_length=200)


class CeoDecision(BaseModel):
    model_config = _strict
    reasoning: str = Field(max_length=280)
    allocations: list[CeoAllocation] = Field(default_factory=list, max_length=20)
    directives: list[CeoDirective] = Field(default_factory=list, max_length=20)
    lifecycle: list[CeoLifecycle] = Field(default_factory=list, max_length=20)
