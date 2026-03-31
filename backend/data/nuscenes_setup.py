from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def _read_config(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(
            f"Config file not found: {path}. Create it based on nuscenes_config.example.json"
        )
    with path.open("r", encoding="utf-8") as f:
        cfg = json.load(f)
    if not isinstance(cfg, dict):
        raise ValueError("Config must be a JSON object")
    return cfg


def init_nuscenes(config_path: str | Path) -> Any:
    from nuscenes.nuscenes import NuScenes

    config_path = Path(config_path)
    cfg = _read_config(config_path)

    version = str(cfg.get("version", "v1.0-mini"))
    dataroot = Path(str(cfg.get("dataroot", "")))
    verbose = bool(cfg.get("verbose", True))

    if not dataroot.exists():
        raise FileNotFoundError(
            "nuScenes dataroot does not exist. Set `dataroot` in the config to the folder containing "
            "the nuScenes directories like `samples/`, `sweeps/`, and the metadata JSON files. "
            f"Got: {dataroot}"
        )

    nusc = NuScenes(version=version, dataroot=str(dataroot), verbose=verbose)
    return nusc


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="nuScenes SDK setup check / initializer")
    parser.add_argument(
        "--config",
        default=str(Path(__file__).with_name("nuscenes_config.json")),
        help="Path to nuscenes_config.json",
    )

    args = parser.parse_args(argv)

    cfg_path = Path(args.config)

    print("nuScenes dataset placement instructions:")
    print("- Download nuScenes (e.g. v1.0-mini) from https://www.nuscenes.org/")
    print("- Choose a local folder, e.g. C:/datasets/nuscenes")
    print("- Place the extracted nuScenes content there so it contains folders like:")
    print("  - samples/")
    print("  - sweeps/")
    print("  - maps/")
    print("  - v1.0-mini/ (metadata JSONs)")
    print("- Create backend/data/nuscenes_config.json based on backend/data/nuscenes_config.example.json")
    print()

    try:
        nusc = init_nuscenes(cfg_path)
    except Exception as e:
        print(f"FAILED to initialize NuScenes: {e}", file=sys.stderr)
        return 1

    print("SUCCESS: NuScenes initialized")
    print(f"- version: {nusc.version}")
    print(f"- dataroot: {nusc.dataroot}")

    try:
        n_scenes = len(nusc.scene)
        print(f"- scenes: {n_scenes}")
    except Exception:
        pass

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
