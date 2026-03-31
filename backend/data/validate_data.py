from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any


def _is_number(x: Any) -> bool:
    if isinstance(x, bool):
        return False
    if isinstance(x, (int, float)):
        return not math.isnan(float(x))
    return False


def _validate_trajectory(traj: Any, *, min_len: int) -> tuple[bool, str, int]:
    if not isinstance(traj, list):
        return False, "trajectory is not a list", 0

    if len(traj) < min_len:
        return False, f"trajectory length {len(traj)} < {min_len}", len(traj)

    for i, p in enumerate(traj):
        if p is None:
            return False, f"trajectory point {i} is null", len(traj)
        if not (isinstance(p, list) and len(p) >= 2):
            return False, f"trajectory point {i} is not [x,y]", len(traj)
        if not _is_number(p[0]) or not _is_number(p[1]):
            return False, f"trajectory point {i} has non-numeric/NaN coords", len(traj)

    return True, "ok", len(traj)


def validate_scene_file(path: Path, *, min_len: int) -> tuple[bool, str, int, list[int]]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, dict):
        return False, "scene file is not a JSON object", 0, []

    agents = data.get("agents")
    if not isinstance(agents, list) or len(agents) == 0:
        return False, "scene has no agents", 0, []

    traj_lens: list[int] = []

    for idx, agent in enumerate(agents):
        if not isinstance(agent, dict):
            return False, f"agent[{idx}] is not an object", len(agents), traj_lens

        traj = agent.get("trajectory")
        ok, msg, tlen = _validate_trajectory(traj, min_len=min_len)
        if not ok:
            return False, f"agent[{idx}] invalid: {msg}", len(agents), traj_lens
        traj_lens.append(tlen)

    return True, "ok", len(agents), traj_lens


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate processed scene-level dataset")
    parser.add_argument(
        "--data-dir",
        default=str(Path(__file__).with_name("processed")),
        help="Directory containing scene_*.json files",
    )
    parser.add_argument("--min-len", type=int, default=8)

    args = parser.parse_args(argv)

    data_dir = Path(args.data_dir)
    scene_files = sorted(data_dir.glob("scene_*.json"))

    total_scenes = 0
    agents_per_scene: list[int] = []
    all_traj_lens: list[int] = []

    for sf in scene_files:
        ok, msg, n_agents, traj_lens = validate_scene_file(sf, min_len=int(args.min_len))
        if not ok:
            print(f"INVALID: {sf.name}: {msg}")
            return 1

        total_scenes += 1
        agents_per_scene.append(n_agents)
        all_traj_lens.extend(traj_lens)

    avg_traj_len = (sum(all_traj_lens) / len(all_traj_lens)) if all_traj_lens else 0.0

    print(f"total scenes: {total_scenes}")
    if total_scenes > 0:
        for i, n in enumerate(agents_per_scene, start=1):
            print(f"agents in scene_{i}: {n}")
    print(f"avg trajectory length: {avg_traj_len:.2f}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
