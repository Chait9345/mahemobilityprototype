from fastapi import APIRouter

from app.models.metrics import MetricsResponse
from app.services.metrics_service import metrics_service

router = APIRouter()


@router.get("/metrics", response_model=MetricsResponse)
def metrics() -> MetricsResponse:
    metrics_service.increment("GET /metrics")
    return metrics_service.snapshot()
