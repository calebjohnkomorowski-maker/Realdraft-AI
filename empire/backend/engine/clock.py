"""Speed control for the tick loop: pause / 1x / fast-forward."""
from __future__ import annotations

_MULTIPLIER = {"pause": 0.0, "1x": 1.0, "fast": 6.0}


class Clock:
    def __init__(self, base_tick_seconds: float, speed: str = "1x") -> None:
        self.base_tick_seconds = base_tick_seconds
        self.speed = speed if speed in _MULTIPLIER else "1x"

    @property
    def is_paused(self) -> bool:
        return self.speed == "pause"

    def set_speed(self, speed: str) -> None:
        if speed not in _MULTIPLIER:
            raise ValueError(f"invalid speed: {speed}")
        self.speed = speed

    def delay(self) -> float:
        """Seconds to sleep between ticks at the current speed."""
        mult = _MULTIPLIER[self.speed]
        if mult <= 0:
            return 0.1
        return self.base_tick_seconds / mult

    def status(self) -> dict:
        return {"speed": self.speed, "base_tick_seconds": self.base_tick_seconds}
