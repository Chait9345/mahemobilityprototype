# Trajectory Intelligence System

This project predicts future movement of agents in dynamic environments using deep learning.

Given past trajectory data, the system generates multiple possible future paths (multi-modal prediction) and evaluates them for safety using collision detection.

Unlike traditional models that output a single prediction, our system models uncertainty by generating multiple plausible futures along with confidence scores.

Key capabilities:
- Multi-modal trajectory prediction
- Real-time inference
- Collision risk detection
- Social context awareness
- Interactive visualization

## Model Architecture

We use an LSTM-based sequence-to-sequence model for trajectory prediction.

Input:
- Past trajectory (history) of an agent

Model:
- Encoder: LSTM processes historical motion
- Decoder: Generates multiple future trajectories
- Multi-modal output: 3 possible trajectories

Output:
- Predicted future trajectories
- Confidence score for each mode

Evaluation:
- ADE (Average Displacement Error)
- FDE (Final Displacement Error)

Additionally, predicted trajectories are evaluated for collision risk with nearby agents.

## Dataset Used

We use a subset of the nuScenes dataset.

- Real-world autonomous driving dataset
- Contains agent trajectories in urban environments
- Includes multiple interacting agents

We used a representative subset for:
- Faster training
- Real-time performance
- Rapid prototyping

The pipeline is fully scalable to the complete dataset.

## Setup & Installation

### Backend
cd backend
pip install -r requirements.txt

### Frontend
cd frontend
npm install

## ▶️ How to Run

### 🔧 Start Backend

cd backend

# Windows (recommended)
py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Mac/Linux (alternative)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

👉 Backend will run at:
http://localhost:8000


### 🎨 Start Frontend

cd frontend
npm run dev

👉 Open in browser:
http://localhost:5173

## Example Outputs

The system provides:

- Multi-modal trajectory predictions (3 modes)
- Confidence scores for each mode
- ADE / FDE metrics
- Collision detection alerts
- Interactive visualization (scene view + graph view)

Example:

- ADE: ~0.5 – 3.0
- FDE: ~1.0 – 6.0
- Latency: ~10–50 ms

The system highlights:
- Safe trajectories
- Risky trajectories (collision)

## Key Features

- Multi-modal prediction (uncertainty modeling)
- Collision-aware trajectory evaluation
- Real-time inference
- Interactive visualization
- Agent-agnostic modeling

Note: The model is demonstrated using a subset of the dataset for faster evaluation and real-time performance.The project is capable and can be scaled by training the complete dataset.