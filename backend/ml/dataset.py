import os
import json
import torch
from torch.utils.data import Dataset
import numpy as np

class TrajectoryDataset(Dataset):
    def __init__(self, data_dir):
        self.samples = []

        for file in os.listdir(data_dir):
            if not file.endswith(".json"):
                continue

            path = os.path.join(data_dir, file)

            with open(path, "r") as f:
                data = json.load(f)

            agents = data.get("agents", [])

            for agent in agents:
                traj = agent.get("trajectory", [])

                if len(traj) < 20:
                    continue

                # history (8) + future (12)
                history = traj[-20:-12]
                future = traj[-12:]

                history = np.array(history, dtype=np.float32)
                future = np.array(future, dtype=np.float32)

                # normalize relative to last history point
                ref = history[-1].copy()
                history -= ref
                future -= ref

                # neighbors (dummy for now)
                neighbors = np.zeros((5, 8, 2), dtype=np.float32)

                self.samples.append({
                    "history": history,
                    "future": future,
                    "neighbors": neighbors
                })

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        sample = self.samples[idx]

        return {
            "history": torch.tensor(sample["history"]),
            "future": torch.tensor(sample["future"]),
            "neighbors": torch.tensor(sample["neighbors"])
        }