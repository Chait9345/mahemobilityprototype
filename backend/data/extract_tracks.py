from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

_THIS_DIR = Path(__file__).resolve().parent
if str(_THIS_DIR) not in sys.path:
    sys.path.insert(0, str(_THIS_DIR))

from nuscenes_setup import init_nuscenes


def _is_target_category(category_name: str) -> bool:
    c = category_name.lower()
    return ("pedestrian" in c) or ("cycle" in c)


def extract_scene_tracks(
    nusc: Any,
    scene: dict[str, Any],
    *,
    min_len: int,
    max_agents: int,
) -> dict[str, list[list[float]]]:
    instance_to_traj: dict[str, list[list[float]]] = defaultdict(list)

    token = scene.get("first_sample_token")
    while token:
        sample = nusc.get("sample", token)
        for ann_token in sample.get("anns", []):
            ann = nusc.get("sample_annotation", ann_token)
            category_name = str(ann.get("category_name", ""))
            if not _is_target_category(category_name):
                continue

            instance_token = str(ann.get("instance_token", ""))
            if not instance_token:
                continue

            translation = ann.get("translation")
            if not (isinstance(translation, list) and len(translation) >= 2):
                continue

            x = float(translation[0])
            y = float(translation[1])
            instance_to_traj[instance_token].append([x, y])

        token = sample.get("next")

    filtered = {k: v for k, v in instance_to_traj.items() if len(v) >= min_len}

    if len(filtered) > max_agents:
        sorted_items = sorted(filtered.items(), key=lambda kv: len(kv[1]), reverse=True)
        filtered = dict(sorted_items[:max_agents])

    return filtered


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Extract pedestrian/cyclist tracks from nuScenes")
    parser.add_argument(
        "--config",
        default=str(Path(__file__).with_name("nuscenes_config.json")),
        help="Path to nuscenes_config.json (see nuscenes_config.example.json)",
    )
    parser.add_argument(
        "--out",
        default=str(Path(__file__).with_name("tracks.json")),
        help="Output JSON file path",
    )
    parser.add_argument("--max-scenes", type=int, default=5)
    parser.add_argument("--max-agents", type=int, default=20)
    parser.add_argument("--min-len", type=int, default=8)

    args = parser.parse_args(argv)

    try:
        nusc = init_nuscenes(args.config)
    except Exception as e:
        print(f"FAILED to initialize NuScenes: {e}", file=sys.stderr)
        return 1

    scenes = list(nusc.scene)
    scenes = scenes[: max(0, int(args.max_scenes))]

    out_by_scene: dict[str, dict[str, list[list[float]]]] = {}

    total_agents = 0
    total_len = 0

    for scene in scenes:
        scene_token = str(scene.get("token", ""))
        scene_name = str(scene.get("name", ""))
        scene_id = scene_name or scene_token
        tracks = extract_scene_tracks(
            nusc,
            scene,
            min_len=int(args.min_len),
            max_agents=int(args.max_agents),
        )

        out_by_scene[scene_id] = tracks
        total_agents += len(tracks)
        total_len += sum(len(t) for t in tracks.values())

    avg_len = (total_len / float(total_agents)) if total_agents > 0 else 0.0

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(out_by_scene, f)

    print("Summary")
    print(f"- scenes processed: {len(out_by_scene)}")
    print(f"- agents extracted: {total_agents}")
    print(f"- average trajectory length: {avg_len:.2f}")
    print(f"- output: {out_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
