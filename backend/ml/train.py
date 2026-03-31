from __future__ import annotations

from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from ml.dataset import TrajectoryDataset
from ml.model import TrajectoryModel


def main() -> None:
    data_dir = Path(__file__).resolve().parents[1] / "data" / "processed"

    dataset = TrajectoryDataset(str(data_dir))
    loader = DataLoader(dataset, batch_size=32, shuffle=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model = TrajectoryModel().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    epochs = 20
    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        n_batches = 0

        for batch in loader:
            history = batch["history"].to(device)
            future = batch["future"].to(device)
            neighbors = batch["neighbors"].to(device)

            optimizer.zero_grad(set_to_none=True)
            trajs, _probs = model(history, neighbors)  # trajs: [B, K, 12, 2]

            # Best-of-K MSE loss
            # per-mode, per-sample mean over time and xy -> [B, K]
            diff = trajs - future.unsqueeze(1)
            per_mode = (diff * diff).mean(dim=(2, 3))
            best, _ = per_mode.min(dim=1)
            loss = best.mean()
            loss.backward()
            optimizer.step()

            total_loss += float(loss.item())
            n_batches += 1

        avg_loss = total_loss / max(1, n_batches)
        print(f"Epoch {epoch} Loss: {avg_loss:.4f}")

    ckpt_dir = Path(__file__).resolve().parent / "checkpoints"
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    ckpt_path = ckpt_dir / "model.pth"
    torch.save(model.state_dict(), ckpt_path)
    print(f"Saved model to: {ckpt_path}")


if __name__ == "__main__":
    main()
