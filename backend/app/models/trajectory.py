from pydantic import BaseModel, Field


class TrajectoryPoint(BaseModel):
    t: float = Field(..., description="Timestamp in seconds")
    x: float
    y: float
