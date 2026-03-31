import torch
import matplotlib.pyplot as plt
from ml.model import TrajectoryModel

print("VISUAL TEST: SOCIAL POOLING")

model = TrajectoryModel()
model.eval()

# Dummy inputs
history = torch.randn(1, 8, 2)

# Case 1: no neighbors
neighbors_none = None

# Case 2: with neighbors
neighbors = torch.randn(1, 5, 8, 2)

with torch.no_grad():
    traj_no_n, _ = model(history, neighbors_none)
    traj_with_n, _ = model(history, neighbors)

history = history[0].numpy()
traj_no_n = traj_no_n[0, 0].numpy()
traj_with_n = traj_with_n[0, 0].numpy()

# Plot
plt.figure()
plt.title("Social Pooling Effect")

# History
plt.plot(history[:, 0], history[:, 1], marker='o', label="history")

# Predictions
plt.plot(traj_no_n[:, 0], traj_no_n[:, 1], '--', label="no neighbors")
plt.plot(traj_with_n[:, 0], traj_with_n[:, 1], '--', label="with neighbors")

plt.legend()
plt.grid()
plt.show()