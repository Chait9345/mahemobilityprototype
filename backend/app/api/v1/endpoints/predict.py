from fastapi import APIRouter, HTTPException

from app.schemas.predict import PredictRequest, PredictResponse
from app.services.predictor import PredictorService

router = APIRouter()

_predictor = PredictorService()


@router.post("/", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    try:
        return _predictor.predict(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
