from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import torch

from ml.dataset import TrajectoryDataset
from ml.model import TrajectoryModel


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    data_dir = root / "data" / "processed"
    ckpt_path = Path(__file__).resolve().parent / "checkpoints" / "model.pth"

    ds = TrajectoryDataset(str(data_dir))
    sample = ds[0]

    history = sample["history"].float().unsqueeze(0)  # [1, 8, 2]
    future = sample["future"].float()  # [12, 2]
    neighbors = sample["neighbors"].float().unsqueeze(0)  # [1, 5, 8, 2]

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = TrajectoryModel().to(device)

    state = torch.load(ckpt_path, map_location=device)
    model.load_state_dict(state)
    model.eval()

    with torch.no_grad():
        trajs, probs = model(history.to(device), neighbors.to(device))
        trajs = trajs.cpu().squeeze(0)  # [K, 12, 2]
        probs = probs.cpu().squeeze(0)  # [K]

        best_k = int(torch.argmax(probs).item())
        pred = trajs[best_k]

    h = history.squeeze(0).cpu().numpy()
    f = future.cpu().numpy()
    p = pred.cpu().numpy()

    all_trajs = trajs.cpu().numpy()
    all_probs = probs.cpu().numpy()

    plt.figure(figsize=(6, 6))
    plt.plot(h[:, 0], h[:, 1], "o-", color="blue", label="history")
    plt.plot(f[:, 0], f[:, 1], "o-", color="green", label="gt future")
    for k in range(all_trajs.shape[0]):
        alpha = 0.15 + 0.35 * float(all_probs[k])
        plt.plot(all_trajs[k, :, 0], all_trajs[k, :, 1], "-", color="red", alpha=alpha)

    plt.plot(p[:, 0], p[:, 1], "o-", color="red", label=f"pred future (mode {best_k})")

    plt.axis("equal")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.title("Trajectory Prediction")
    plt.show()


if __name__ == "__main__":
    main()
