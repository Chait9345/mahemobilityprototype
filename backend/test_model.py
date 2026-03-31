from ml.model import TrajectoryModel
import torch

print("TESTING MODEL...")

model = TrajectoryModel()

x = torch.randn(2, 8, 2)
out = model(x)

print("Output shape:", out.shape)
print("NaNs present:", torch.isnan(out).any())

print("DONE")