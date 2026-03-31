from pydantic import BaseModel, Field


class SceneAgent(BaseModel):
    agent_id: int
    history: list[list[float]] = Field(default_factory=list)
    future: list[list[float]] = Field(default_factory=list)


class SceneResponse(BaseModel):
    scene_id: str
    agents: list[SceneAgent]
