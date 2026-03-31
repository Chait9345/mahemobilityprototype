from fastapi import APIRouter

from app.models.scene import SceneResponse
from app.services.metrics_service import metrics_service
from app.services.scene_service import SceneService

router = APIRouter()
_scene_service = SceneService()


@router.get("/scenes", response_model=list[str])
def list_scenes() -> list[str]:
    metrics_service.increment("GET /scenes")
    return _scene_service.list_scenes()


@router.get("/scene/{scene_id}", response_model=SceneResponse)
def get_scene(scene_id: str) -> SceneResponse:
    metrics_service.increment("GET /scene/{scene_id}")
    return _scene_service.get_scene(scene_id)
