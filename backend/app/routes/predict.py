from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models.predict import BatchPredictRequest, BatchPredictResponse
from app.services.metrics_service import metrics_service

from ml.inference import load_model, predict as predict_model

router = APIRouter()
_model = load_model()


class PredictMLRequest(BaseModel):
    history: list[list[float]] = Field(..., min_length=1, description="Observed trajectory points [[x,y], ...]")
    neighbors: list[list[list[float]]] | None = Field(
        default=None,
        description="Optional neighbors trajectories [[[x,y],...], ...]",
    )


class PredictMLResponse(BaseModel):
    coordinate_type: str = Field(..., description="Coordinate type: 'relative' or 'absolute'")
    modes: list


@router.post("/predict", response_model=PredictMLResponse)
def predict(req: PredictMLRequest) -> PredictMLResponse:
    metrics_service.increment("POST /predict")
    try:
        trajs, probs = predict_model(_model, req.history, req.neighbors)

        # Remove batch dim: [B,K,T,2] -> [K,T,2], [B,K] -> [K]
        trajs0 = trajs[0]
        probs0 = probs[0]

        modes = []
        for k in range(trajs0.shape[0]):
            traj = [[round(float(x), 4), round(float(y), 4)] for x, y in trajs0[k]]
            prob = round(float(probs0[k]), 4)
            modes.append({"trajectory": traj, "probability": prob})

        return PredictMLResponse(coordinate_type="relative", modes=modes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/predict/batch", response_model=BatchPredictResponse)
def predict_batch(req: BatchPredictRequest) -> BatchPredictResponse:
    metrics_service.increment("POST /predict/batch")
    try:
        raise ValueError("/predict/batch not supported for ML inference")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
