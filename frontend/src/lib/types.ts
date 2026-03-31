export type TrajectoryPoint = {
  t: number
  x: number
  y: number
}

export type PredictRequest = {
  history: TrajectoryPoint[]
  horizon_seconds: number
  num_points: number
}

export type PredictResponse = {
  predicted: TrajectoryPoint[]
  model_name: string
}
