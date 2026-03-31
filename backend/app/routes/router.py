from fastapi import APIRouter

from app.routes import health, metrics, predict, scene

router = APIRouter()

router.include_router(health.router)
router.include_router(scene.router)
router.include_router(predict.router)
router.include_router(metrics.router)
