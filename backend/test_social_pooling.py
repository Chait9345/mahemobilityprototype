import torch
from ml.model import TrajectoryModel

print("TESTING SOCIAL POOLING...")

# Create model
model = TrajectoryModel()
model.eval()

# Dummy inputs
history = torch.randn(1, 8, 2)          # main agent
neighbors = torch.randn(1, 5, 8, 2)     # 5 neighbors

# Case 1: WITHOUT neighbors
with torch.no_grad():
    traj_no_neighbors, _ = model(history, neighbors=None)

# Case 2: WITH neighbors
with torch.no_grad():
    traj_with_neighbors, _ = model(history, neighbors=neighbors)

print("Without neighbors:", traj_no_neighbors[0, 0, :3])
print("With neighbors:", traj_with_neighbors[0, 0, :3])

# Difference check
diff = torch.abs(traj_no_neighbors - traj_with_neighbors).mean()
print("Difference:", diff.item())

print("DONE")