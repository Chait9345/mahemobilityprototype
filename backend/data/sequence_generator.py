from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def _iter_trajectories(tracks_data: Any) -> list[list[list[float]]]:
    trajectories: list[list[list[float]]] = []

    if isinstance(tracks_data, dict):
        if all(isinstance(v, list) for v in tracks_data.values()):
            for v in tracks_data.values():
                traj = _as_xy_list(v)
                if traj is not None:
                    trajectories.append(traj)
            return trajectories

        for v in tracks_data.values():
            if isinstance(v, dict):
                for vv in v.values():
                    traj = _as_xy_list(vv)
                    if traj is not None:
                        trajectories.append(traj)
        return trajectories

    return trajectories


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


def generate_sequences(
    trajectories: list[list[list[float]]],
    *,
    input_len: int = 5,
    output_len: int = 6,
    min_total_len: int = 11,
) -> list[dict[str, list[list[float]]]]:
    total_len = input_len + output_len
    if total_len != min_total_len:
        min_total_len = total_len

    sequences: list[dict[str, list[list[float]]]] = []

    for traj in trajectories:
        if len(traj) < min_total_len:
            continue

        for start in range(0, len(traj) - total_len + 1):
            window = traj[start : start + total_len]
            origin = window[0]
            rel = [[p[0] - origin[0], p[1] - origin[1]] for p in window]

            seq_in = rel[:input_len]
            seq_out = rel[input_len:]

            sequences.append({"input": seq_in, "output": seq_out})

    return sequences


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate sliding-window sequences from trajectory tracks")
    parser.add_argument(
        "--tracks",
        default=str(Path(__file__).with_name("tracks.json")),
        help="Path to tracks.json (instance_token -> [[x,y],...]) or scene->instance_token->trajectory",
    )
    parser.add_argument(
        "--out",
        default=str(Path(__file__).with_name("sequences.json")),
        help="Output sequences JSON path",
    )
    parser.add_argument("--input-len", type=int, default=5)
    parser.add_argument("--output-len", type=int, default=6)

    args = parser.parse_args(argv)

    tracks_path = Path(args.tracks)
    with tracks_path.open("r", encoding="utf-8") as f:
        tracks_data = json.load(f)

    trajectories = _iter_trajectories(tracks_data)

    sequences = generate_sequences(
        trajectories,
        input_len=int(args.input_len),
        output_len=int(args.output_len),
        min_total_len=11,
    )

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(sequences, f)

    total_sequences = len(sequences)
    avg_in = (sum(len(s["input"]) for s in sequences) / total_sequences) if total_sequences else 0.0
    avg_out = (sum(len(s["output"]) for s in sequences) / total_sequences) if total_sequences else 0.0

    print(f"total sequences generated: {total_sequences}")
    print(f"average input length: {avg_in:.2f}")
    print(f"average output length: {avg_out:.2f}")
    print(f"saved to: {out_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
