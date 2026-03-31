import { useCallback, useEffect, useState } from 'react'

import type { SceneResponse } from '../services/api'
import { getScene } from '../services/api'

export function useSceneData(sceneId: string) {
  const [data, setData] = useState<SceneResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!sceneId) return
    setLoading(true)
    setError(null)
    try {
      const res = await getScene(sceneId)
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [sceneId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
