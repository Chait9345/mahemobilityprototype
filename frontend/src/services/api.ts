export const API_BASE_URL = 'http://127.0.0.1:8000'

export type SceneAgent = {
  agent_id: number
  history: number[][]
  future: number[][]
}

export type SceneResponse = {
  scene_id: string
  agents: SceneAgent[]
}

export type TrajectoryPoint = { t: number; x: number; y: number }

export type PredictRequest = {
  history: number[][]
  neighbors?: number[][][]
}

export type PredictResponse = {
  coordinate_type: 'relative' | 'absolute'
  modes: {
    trajectory: number[][]
    probability: number
    confidence?: number
    collision?: boolean
  }[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`)
  }

  return (await res.json()) as T
}

export function getScene(sceneId: string): Promise<SceneResponse> {
  return request<SceneResponse>(`/scene/${encodeURIComponent(sceneId)}`)
}

export function getScenes(): Promise<string[]> {
  return request<string[]>('/scenes')
}

export function getMetrics(): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>('/metrics')
}

export function predict(data: PredictRequest): Promise<PredictResponse> {
  return request<PredictResponse>('/predict', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
