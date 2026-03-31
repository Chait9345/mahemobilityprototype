import { useCallback, useEffect, useState } from 'react'

import { getScenes } from '../services/api'

export function useScenesList() {
  const [data, setData] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const scenes = await getScenes()
      setData(scenes)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
