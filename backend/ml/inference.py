from __future__ import annotations

from pathlib import Path

import torch

from ml.model import TrajectoryModel


def load_model() -> TrajectoryModel:
    ckpt_path = Path(__file__).resolve().parent / "checkpoints" / "model.pth"

    device = torch.device("cpu")
    model = TrajectoryModel()

    state = torch.load(ckpt_path, map_location=device)
    model.load_state_dict(state)
    model.eval()
    return model


def predict(model: TrajectoryModel, history, neighbors=None):
    device = torch.device("cpu")
    model = model.to(device)
    model.eval()

    hist = torch.as_tensor(history, dtype=torch.float32, device=device)
    if hist.dim() == 2:
        hist = hist.unsqueeze(0)
    if hist.dim() != 3 or hist.size(-1) != 2:
        raise ValueError(f"history must be [8,2] or [B,8,2], got {tuple(hist.shape)}")

    neigh = None
    if neighbors is not None:
        neigh = torch.as_tensor(neighbors, dtype=torch.float32, device=device)
        if neigh.dim() == 3:
            neigh = neigh.unsqueeze(0)
        if neigh.dim() != 4 or neigh.size(-1) != 2:
            raise ValueError(f"neighbors must be [5,8,2] or [B,5,8,2], got {tuple(neigh.shape)}")

    with torch.no_grad():
        trajs, probs = model(hist, neigh)

    return trajs.cpu().numpy(), probs.cpu().numpy()
