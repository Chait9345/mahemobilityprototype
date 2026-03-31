from __future__ import annotations

import json
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class AgentTrajectory:
    agent_id: int
    trajectory: list[list[float]]


@dataclass(frozen=True)
class SceneData:
    scene_id: str
    agents: list[AgentTrajectory]


class ProcessedDatasetLoader:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._cached_mtimes: dict[str, float] | None = None
        self._cached_scenes: dict[str, SceneData] | None = None

    def _default_processed_dir(self) -> Path:
        return Path(__file__).resolve().parents[1] / "data" / "processed"

    def _read_scene_file(self, path: Path) -> SceneData:
        with path.open("r", encoding="utf-8") as f:
            obj = json.load(f)

        if not isinstance(obj, dict):
            raise ValueError(f"Invalid scene file (expected object): {path}")

        scene_id = str(obj.get("scene_id", ""))
        if not scene_id:
            raise ValueError(f"Missing scene_id in: {path}")

        agents_raw = obj.get("agents")
        if not isinstance(agents_raw, list):
            agents_raw = []

        agents: list[AgentTrajectory] = []
        for a in agents_raw:
            if not isinstance(a, dict):
                continue
            if "agent_id" not in a:
                continue
            try:
                agent_id = int(a.get("agent_id"))
            except (TypeError, ValueError):
                continue

            traj_raw = a.get("trajectory")
            traj = self._parse_trajectory(traj_raw)
            agents.append(AgentTrajectory(agent_id=agent_id, trajectory=traj))

        return SceneData(scene_id=scene_id, agents=agents)

    def _parse_trajectory(self, traj: Any) -> list[list[float]]:
        if not isinstance(traj, list):
            return []
        out: list[list[float]] = []
        for p in traj:
            if isinstance(p, (list, tuple)) and len(p) >= 2:
                try:
                    out.append([float(p[0]), float(p[1])])
                except (TypeError, ValueError):
                    continue
            elif isinstance(p, dict) and "x" in p and "y" in p:
                try:
                    out.append([float(p["x"]), float(p["y"])])
                except (TypeError, ValueError):
                    continue
        return out

    def _compute_mtimes(self, processed_dir: Path) -> dict[str, float]:
        mtimes: dict[str, float] = {}
        for p in processed_dir.glob("*.json"):
            if p.is_file():
                mtimes[str(p.resolve())] = p.stat().st_mtime
        return mtimes

    def _load_all(self, processed_dir: Path) -> dict[str, SceneData]:
        scenes: dict[str, SceneData] = {}
        for p in sorted(processed_dir.glob("*.json")):
            if not p.is_file():
                continue
            sd = self._read_scene_file(p)
            scenes[sd.scene_id] = sd
        return scenes

    def load(self, processed_dir: str | Path | None = None) -> dict[str, SceneData]:
        d = Path(processed_dir) if processed_dir is not None else self._default_processed_dir()

        with self._lock:
            current_mtimes = self._compute_mtimes(d) if d.exists() else {}
            if self._cached_scenes is not None and self._cached_mtimes == current_mtimes:
                return self._cached_scenes

            scenes = self._load_all(d) if d.exists() else {}
            self._cached_mtimes = current_mtimes
            self._cached_scenes = scenes
            return scenes

    def get_scene(self, scene_id: str, processed_dir: str | Path | None = None) -> SceneData | None:
        scenes = self.load(processed_dir=processed_dir)
        return scenes.get(scene_id)

    def get_all_scenes(self, processed_dir: str | Path | None = None) -> list[SceneData]:
        scenes = self.load(processed_dir=processed_dir)
        return list(scenes.values())


data_loader = ProcessedDatasetLoader()
