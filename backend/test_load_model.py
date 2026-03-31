from ml.inference import load_model

model = load_model()
print("Model loaded:", model is not None)