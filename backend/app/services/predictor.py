from __future__ import annotations

from dataclasses import dataclass

from app.models.predict import (
    BatchPredictRequest,
    BatchPredictResponse,
    PredictRequest,
    PredictResponse,
)
from app.models.trajectory import TrajectoryPoint


@dataclass(frozen=True)
class PredictorInfo:
    name: str = "stub-linear"


class PredictorService:
    def __init__(self) -> None:
        self.info = PredictorInfo()

    def predict(self, req: PredictRequest) -> PredictResponse:
        if len(req.history) == 0:
            raise ValueError("history must contain at least 1 point")

        last = req.history[-1]

        if len(req.history) >= 2:
            prev = req.history[-2]
            dt = max(last.t - prev.t, 1e-6)
            vx = (last.x - prev.x) / dt
            vy = (last.y - prev.y) / dt
        else:
            vx = 0.0
            vy = 0.0

        step = req.horizon_seconds / float(req.num_points)
        predicted: list[TrajectoryPoint] = []
        for i in range(1, req.num_points + 1):
            t = last.t + step * i
            x = last.x + vx * (step * i)
            y = last.y + vy * (step * i)
            predicted.append(TrajectoryPoint(t=t, x=x, y=y))

        return PredictResponse(predicted=predicted, model_name=self.info.name)

    def predict_batch(self, req: BatchPredictRequest) -> BatchPredictResponse:
        responses = [self.predict(r) for r in req.requests]
        return BatchPredictResponse(responses=responses)
