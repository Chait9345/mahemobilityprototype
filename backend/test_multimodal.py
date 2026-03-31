from ml.model import TrajectoryModel
import torch

print("TESTING MULTI-MODAL MODEL...")

model = TrajectoryModel()

x = torch.randn(1, 8, 2)

out, probs = model(x)

print("Trajectories shape:", out.shape)
print("Probabilities shape:", probs.shape)
print("Probabilities:", probs)
print("Sum:", probs.sum())

print("DONE")