from ml.model import TrajectoryModel
from ml.dataset import TrajectoryDataset
import torch
import matplotlib.pyplot as plt

model = TrajectoryModel()

# load trained weights (important)
model.load_state_dict(torch.load("ml/checkpoints/model.pth"))
model.eval()

ds = TrajectoryDataset("data/processed")

sample = ds[0]

history = sample["history"].unsqueeze(0)
gt = sample["future"]

with torch.no_grad():
    preds, probs = model(history)

preds = preds[0].numpy()
probs = probs[0].numpy()

h = history[0].numpy()
gt = gt.numpy()

plt.plot(h[:,0], h[:,1], 'b', label="history")
plt.plot(gt[:,0], gt[:,1], 'g', label="ground truth")

for i in range(3):
    plt.plot(preds[i,:,0], preds[i,:,1], '--', label=f"mode {i} (p={probs[i]:.2f})")

plt.legend()
plt.title("Multi-modal Prediction")
plt.show()