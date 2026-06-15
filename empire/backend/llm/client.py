"""Thin Anthropic API wrapper used by the live decision engine.

Imports the SDK lazily so the project runs in pure-mock mode without the
`anthropic` package installed or a key configured.
"""
from __future__ import annotations


class AnthropicClient:
    def __init__(self, api_key: str, model: str) -> None:
        from anthropic import Anthropic  # lazy import

        self._client = Anthropic(api_key=api_key)
        self._model = model

    def complete(self, system: str, user: str, max_tokens: int = 700) -> str:
        """Single-shot completion. Returns the raw text (expected to be JSON)."""
        resp = self._client.messages.create(
            model=self._model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        parts = [block.text for block in resp.content if getattr(block, "type", "") == "text"]
        return "".join(parts).strip()
