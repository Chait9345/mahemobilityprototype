from __future__ import annotations

import math
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import torch

from models.lstm_model import LSTMModelConfig, load_model


@dataclass(frozen=True)
class PredictionResult:
    paths: list[list[list[float]]]
    probabilities: list[float]


_model_lock = threading.Lock()
_model: Any | None = None
_model_config: LSTMModelConfig | None = None


def _softmax(xs: list[float]) -> list[float]:
    if len(xs) == 0:
        return []
    m = max(xs)
    exps = [math.exp(x - m) for x in xs]
    s = sum(exps)
    if s <= 0:
        return [1.0 / len(xs) for _ in xs]
    return [e / s for e in exps]


def _moving_average(points: list[list[float]], window: int) -> list[list[float]]:
    if window <= 1 or len(points) <= 2:
        return points
    w = min(window, len(points))
    half = w // 2
    out: list[list[float]] = []
    for i in range(len(points)):
        j0 = max(0, i - half)
        j1 = min(len(points), i + half + 1)
        chunk = points[j0:j1]
        sx = sum(p[0] for p in chunk)
        sy = sum(p[1] for p in chunk)
        n = len(chunk)
        out.append([sx / n, sy / n])
    return out


def _ensure_model(
    *,
    hidden_size: int = 128,
    seq_len: int = 8,
    weights_path: str | Path | None = None,
    device: str | torch.device | None = None,
) -> tuple[Any, LSTMModelConfig]:
    global _model, _model_config

    cfg = LSTMModelConfig(seq_len=seq_len, hidden_size=hidden_size, pred_len=1)

    if _model is not None and _model_config == cfg:
        return _model, _model_config

    with _model_lock:
        if _model is not None and _model_config == cfg:
            return _model, _model_config
        _model = load_model(config=cfg, weights_path=weights_path, device=device)
        _model_config = cfg
        return _model, _model_config


class TrajectoryPredictionService:
    def predict(
        self,
        trajectory: list[list[float]],
        *,
        num_future: int = 12,
        num_paths: int = 3,
        hidden_size: int = 128,
        seq_len: int = 8,
        noise_std: float = 0.15,
        smoothing_window: int = 3,
        weights_path: str | Path | None = None,
        device: str | torch.device | None = None,
    ) -> dict[str, Any]:
        if num_paths != 3:
            raise ValueError("num_paths must be 3")
        if num_future <= 0:
            raise ValueError("num_future must be > 0")
        if len(trajectory) == 0:
            raise ValueError("trajectory must contain at least 1 point")

        model, cfg = _ensure_model(
            hidden_size=hidden_size,
            seq_len=seq_len,
            weights_path=weights_path,
            device=device,
        )

        dev = next(model.parameters()).device

        history = [[float(p[0]), float(p[1])] for p in trajectory if isinstance(p, (list, tuple)) and len(p) >= 2]
        if len(history) == 0:
            raise ValueError("trajectory must contain points shaped [x, y]")

        all_paths: list[list[list[float]]] = []
        scores: list[float] = []

        for k in range(num_paths):
            seq = history[-cfg.seq_len :]
            if len(seq) < cfg.seq_len:
                pad = [seq[0]] * (cfg.seq_len - len(seq))
                seq = pad + seq

            gen: list[list[float]] = []
            total_noise_energy = 0.0

            for _ in range(num_future):
                x = torch.tensor([seq], dtype=torch.float32, device=dev)
                with torch.no_grad():
                    y = model(x)
                next_xy = y[0, 0].detach().cpu().tolist()

                noise = torch.randn(2).mul(noise_std).tolist() if noise_std > 0 else [0.0, 0.0]
                next_xy = [float(next_xy[0] + noise[0]), float(next_xy[1] + noise[1])]

                total_noise_energy += float(noise[0] * noise[0] + noise[1] * noise[1])

                gen.append(next_xy)
                seq = (seq + [next_xy])[-cfg.seq_len :]

            gen = _moving_average(gen, smoothing_window)
            all_paths.append(gen)
            scores.append(-total_noise_energy + (0.01 * (k + 1)))

        probabilities = _softmax(scores)

        return {
            "paths": all_paths,
            "probabilities": probabilities,
        }


prediction_service = TrajectoryPredictionService()
