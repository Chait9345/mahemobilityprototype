import { useMemo, useState } from 'react'

export function useScenes() {
  const scenes = useMemo(() => ['scene_1', 'scene_2', 'scene_3', 'scene_4', 'scene_5'], [])
  const [selectedSceneId, setSelectedSceneId] = useState<string>(scenes[0] ?? '')

  return {
    scenes,
    selectedSceneId,
    setSelectedSceneId,
  }
}
