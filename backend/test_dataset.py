from ml.dataset import TrajectoryDataset

print("STARTING TEST...")

ds = TrajectoryDataset("data/processed")
print("Dataset size:", len(ds))

sample = ds[0]

print("History:", sample["history"].shape)
print("Future:", sample["future"].shape)
print("Neighbors:", sample["neighbors"].shape)
print("Last history point:", sample["history"][-1])

print("DONE")