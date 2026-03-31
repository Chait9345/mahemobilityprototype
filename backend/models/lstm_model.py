from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import torch
from torch import nn


@dataclass(frozen=True)
class LSTMModelConfig:
    seq_len: int = 8
    hidden_size: int = 128
    num_layers: int = 1
    dropout: float = 0.0
    pred_len: int = 1


class TrajectoryLSTM(nn.Module):
    def __init__(self, config: LSTMModelConfig) -> None:
        super().__init__()
        self.config = config

        self.lstm = nn.LSTM(
            input_size=2,
            hidden_size=config.hidden_size,
            num_layers=config.num_layers,
            batch_first=True,
            dropout=config.dropout if config.num_layers > 1 else 0.0,
        )
        self.head = nn.Linear(config.hidden_size, 2 * config.pred_len)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if x.ndim != 3 or x.size(-1) != 2:
            raise ValueError("Input must have shape (batch, seq_len, 2)")
        if x.size(1) != self.config.seq_len:
            raise ValueError(f"Expected seq_len={self.config.seq_len}, got {x.size(1)}")

        out, _ = self.lstm(x)
        last = out[:, -1, :]
        y = self.head(last)
        y = y.view(x.size(0), self.config.pred_len, 2)
        return y


def load_model(
    config: LSTMModelConfig | None = None,
    weights_path: str | Path | None = None,
    device: str | torch.device | None = None,
) -> TrajectoryLSTM:
    cfg = config or LSTMModelConfig()
    model = TrajectoryLSTM(cfg)

    if device is not None:
        model = model.to(device)

    if weights_path is not None:
        p = Path(weights_path)
        state = torch.load(p, map_location=device if device is not None else "cpu")
        if isinstance(state, dict) and "state_dict" in state:
            state_dict = state["state_dict"]
        else:
            state_dict = state
        model.load_state_dict(state_dict)

    model.eval()
    return model


def save_dummy_pretrained_weights(
    out_path: str | Path,
    config: LSTMModelConfig | None = None,
) -> Path:
    cfg = config or LSTMModelConfig()
    model = TrajectoryLSTM(cfg)
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"state_dict": model.state_dict(), "config": cfg.__dict__}, out_path)
    return out_path
