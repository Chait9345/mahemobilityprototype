from fastapi import APIRouter

from app.models.health import HealthResponse
from app.services.metrics_service import metrics_service

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    metrics_service.increment("GET /health")
    return HealthResponse(status="ok")
