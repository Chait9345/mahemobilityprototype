from pydantic import BaseModel, Field


class TrajectoryPoint(BaseModel):
    t: float = Field(..., description="Timestamp in seconds")
    x: float
    y: float


class PredictRequest(BaseModel):
    history: list[TrajectoryPoint] = Field(..., description="Observed trajectory points")
    horizon_seconds: float = Field(3.0, ge=0.1, description="How far into the future to predict")
    num_points: int = Field(10, ge=1, le=200, description="Number of predicted points")


class PredictResponse(BaseModel):
    predicted: list[TrajectoryPoint]
    model_name: str
