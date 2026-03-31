export type TrajectoryPoint = { t: number; x: number; y: number }

export type SceneAgent = {
  agent_id: number
  history: number[][]
}

export type SceneResponse = {
  scene_id: string
  agents: SceneAgent[]
}

export async function fetchScene(baseUrl: string, sceneId: string): Promise<SceneResponse> {
  const url = `${baseUrl.replace(/\/$/, '')}/scene/${encodeURIComponent(sceneId)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch scene: ${res.status} ${res.statusText}`)
  return (await res.json()) as SceneResponse
}

export async function fetchMetrics(baseUrl: string): Promise<Record<string, unknown>> {
  const url = `${baseUrl.replace(/\/$/, '')}/metrics`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.status} ${res.statusText}`)
  return (await res.json()) as Record<string, unknown>
}
