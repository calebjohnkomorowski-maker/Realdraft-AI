# Marketplace boundary — the swappable layer

Everything the simulation knows about "the outside world" goes through one
interface: [`interface.py`](./interface.py) → `class Marketplace`. The engine
**only ever calls `Marketplace.tick(request) -> MarketResult`**. It never imports
the simulator directly. That makes the marketplace a clean seam you can replace
with a real Etsy/Shopify/Printful connector without touching agents, the tick
loop, the API, or the dashboard.

## The contract

```python
class Marketplace(ABC):
    def tick(self, request: MarketRequest) -> MarketResult: ...
```

- **`MarketRequest`** (input): `business_id`, `tick`, `season_factor`,
  `season_label`, `reputation`, `marketing_spend`, and a list of
  `ProductSnapshot` (id, name, category, price, unit_cost, quality).
- **`MarketResult`** (output): `sales: list[Sale]` (product_id, units, revenue,
  cogs) and `reviews: list[NewReview]` (product_id, rating 1–5, text).

The simulation settles cash/metrics/reputation purely from `MarketResult`, so a
real connector just needs to populate those two lists from real data.

## Where the swap happens — exactly one line

`engine/simulation.py`, in `Simulation.__init__`:

```python
self.marketplace = SimulatedMarketplace()
```

Replace it with your connector:

```python
self.marketplace = ShopifyMarketplace(api_key=...)   # implements Marketplace
```

Nothing else changes.

## Writing a real connector

Create e.g. `marketplace/shopify.py`:

```python
from .interface import Marketplace, MarketRequest, MarketResult, Sale, NewReview

class ShopifyMarketplace(Marketplace):
    def __init__(self, api_key: str): ...

    def tick(self, request: MarketRequest) -> MarketResult:
        # 1. Push pending changes the agent already applied to local state
        #    (price updates, new/discontinued products) up to the real store.
        # 2. Pull orders + reviews that occurred since the last tick.
        # 3. Map them into Sale / NewReview and return a MarketResult.
        ...
```

### Mapping notes
- **Agent actions vs. the store.** In the simulation the agent mutates local
  `Product` state (price, launch, discontinue) and the simulator reacts. For a
  real store, those mutations must be *pushed* to the platform. Either do it
  inside `tick()` (read the current product state from the request) or add a
  small `apply_changes()` hook — keep it behind this interface.
- **Tick cadence.** A simulated tick ≈ one business day. Against a real API a
  tick becomes a polling window; pull deltas since the last poll rather than the
  full history.
- **Idempotency / rate limits.** Real APIs need dedupe (don't double-count an
  order) and backoff. Confine all of that to the connector.
- **`quality`/`reputation`** are simulation conveniences. With a real store,
  derive `reputation` from the platform's actual review average and ignore
  `quality`.
