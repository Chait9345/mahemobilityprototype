from app.models.scene import SceneAgent, SceneResponse

from services.data_loader import data_loader


class SceneService:
    def get_scene(self, scene_id: str) -> SceneResponse:
        scene = data_loader.get_scene(scene_id)
        if scene is None:
            return SceneResponse(scene_id=scene_id, agents=[])

        agents: list[SceneAgent] = []
        for a in scene.agents:
            trajectory = a.trajectory
            
            # Split trajectory into history and future for evaluation
            if len(trajectory) >= 20:
                history = trajectory[:8]
                future = trajectory[8:20]
            else:
                # Fallback for short trajectories
                split = int(len(trajectory) * 0.4)
                history = trajectory[:split] if split > 0 else trajectory
                future = trajectory[split:] if split < len(trajectory) else []
            
            agents.append(SceneAgent(
                agent_id=int(a.agent_id),
                history=history,
                future=future
            ))

        return SceneResponse(scene_id=scene.scene_id, agents=agents)

    def list_scenes(self) -> list[str]:
        scenes = data_loader.get_all_scenes()
        return [s.scene_id for s in scenes]
