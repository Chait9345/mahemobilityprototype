from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


def _slugify_scene_id(scene_id: str) -> str:
    s = scene_id.strip()
    if not s:
        return "scene"
    s = s.replace(" ", "_")
    s = re.sub(r"[^a-zA-Z0-9_-]+", "_", s)
    return s


def _as_xy_list(raw: Any) -> list[list[float]] | None:
    if not isinstance(raw, list):
        return None
    out: list[list[float]] = []
    for p in raw:
        if isinstance(p, (list, tuple)) and len(p) >= 2:
            try:
                out.append([float(p[0]), float(p[1])])
            except (TypeError, ValueError):
                return None
        elif isinstance(p, dict) and "x" in p and "y" in p:
            try:
                out.append([float(p["x"]), float(p["y"])])
            except (TypeError, ValueError):
                return None
        else:
            return None
    return out


def _normalize_tracks_input(data: Any) -> dict[str, dict[str, list[list[float]]]]:
    if not isinstance(data, dict):
        raise ValueError("tracks.json must be a JSON object")

    if all(isinstance(v, list) for v in data.values()):
        tracks: dict[str, list[list[float]]] = {}
        for inst, traj_raw in data.items():
            traj = _as_xy_list(traj_raw)
            if traj is not None:
                tracks[str(inst)] = traj
        return {"scene_1": tracks}

    out: dict[str, dict[str, list[list[float]]]] = {}
    for scene_id, scene_tracks in data.items():
        if not isinstance(scene_tracks, dict):
            continue
        st: dict[str, list[list[float]]] = {}
        for inst, traj_raw in scene_tracks.items():
            traj = _as_xy_list(traj_raw)
            if traj is not None:
                st[str(inst)] = traj
        out[str(scene_id)] = st

    return out


def build_scene_payload(
    scene_id: str,
    tracks: dict[str, list[list[float]]],
    *,
    min_len: int,
    max_agents: int,
) -> dict[str, Any]:
    items = [(inst, traj) for inst, traj in tracks.items() if len(traj) >= min_len]

    if len(items) > max_agents:
        items.sort(key=lambda kv: len(kv[1]), reverse=True)
        items = items[:max_agents]

    agents: list[dict[str, Any]] = []
    for idx, (_inst, traj) in enumerate(items):
        agents.append({"agent_id": idx, "trajectory": traj})

    return {"scene_id": scene_id, "agents": agents}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build per-scene dataset files from extracted tracks")
    parser.add_argument(
        "--tracks",
        default=str(Path(__file__).with_name("tracks.json")),
        help="Path to tracks.json (scene->instance_token->trajectory or instance_token->trajectory)",
    )
    parser.add_argument(
        "--out-dir",
        default=str(Path(__file__).with_name("processed")),
        help="Output directory for scene JSON files",
    )
    parser.add_argument("--max-scenes", type=int, default=5)
    parser.add_argument("--max-agents", type=int, default=20)
    parser.add_argument("--min-len", type=int, default=8)

    args = parser.parse_args(argv)

    tracks_path = Path(args.tracks)
    with tracks_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    scenes = _normalize_tracks_input(data)
    scene_ids = list(scenes.keys())[: max(0, int(args.max_scenes))]

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    written = 0
    for scene_id in scene_ids:
        payload = build_scene_payload(
            scene_id,
            scenes.get(scene_id, {}),
            min_len=int(args.min_len),
            max_agents=int(args.max_agents),
        )

        file_name = f"{_slugify_scene_id(scene_id)}.json"
        out_path = out_dir / file_name
        with out_path.open("w", encoding="utf-8") as f:
            json.dump(payload, f)
        written += 1

    print(f"scenes written: {written}")
    print(f"output dir: {out_dir}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
