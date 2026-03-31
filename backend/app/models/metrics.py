from pydantic import BaseModel


class MetricsResponse(BaseModel):
    uptime_seconds: float
    request_counts: dict[str, int]
    ade: float
    fde: float
