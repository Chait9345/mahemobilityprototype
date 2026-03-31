from __future__ import annotations

import time
from dataclasses import dataclass, field

from services.metrics import calculate_ade, calculate_fde

from app.models.metrics import MetricsResponse


@dataclass
class MetricsState:
    started_at: float = field(default_factory=time.time)
    request_counts: dict[str, int] = field(default_factory=dict)
    last_pred: list[list[float]] | None = None


class MetricsService:
    def __init__(self) -> None:
        self._state = MetricsState()

    def increment(self, key: str) -> None:
        self._state.request_counts[key] = self._state.request_counts.get(key, 0) + 1

    def set_last_prediction(self, pred: list[list[float]] | None) -> None:
        self._state.last_pred = pred

    def snapshot(self) -> MetricsResponse:
        uptime = time.time() - self._state.started_at

        gt_dummy: list[list[float]] = [[0.0, 0.0], [1.0, 0.6], [2.2, 1.3], [3.5, 2.1]]
        pred = self._state.last_pred or gt_dummy

        ade = calculate_ade(pred, gt_dummy)
        fde = calculate_fde(pred, gt_dummy)

        return MetricsResponse(
            uptime_seconds=uptime,
            request_counts=dict(self._state.request_counts),
            ade=ade,
            fde=fde,
        )


metrics_service = MetricsService()
