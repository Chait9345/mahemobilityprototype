import type { PredictRequest, PredictResponse } from './types'

export async function predictTrajectory(baseUrl: string, req: PredictRequest): Promise<PredictResponse> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/v1/predict/`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Request failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`)
  }

  return (await res.json()) as PredictResponse
}
