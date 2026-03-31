import { useEffect, useMemo, useState } from 'react'

import { AppShell } from '../components/layout/AppShell'
import { BottomPanel } from '../components/dashboard/BottomPanel'
import { Header } from '../components/dashboard/Header'
import { Sidebar } from '../components/dashboard/Sidebar'
import TrajectoryChart from '../components/TrajectoryChart'
import { useMetrics } from '../hooks/useMetrics'
import { useSceneData } from '../hooks/useSceneData'
import { useScenesList } from '../hooks/useScenesList'
import { predict, type PredictResponse } from '../services/api'

export function DashboardPage() {
  const scenesQuery = useScenesList()
  const [sceneId, setSceneId] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<PredictResponse | null>(null)
  const [ade, setADE] = useState<string | null>(null)
  const [fde, setFDE] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'focus' | 'social'>('focus')
  const [renderMode, setRenderMode] = useState<'graph' | 'scene'>('graph')
  const [toggles, setToggles] = useState({
    showGrid: true,
    showHistory: true,
    showPredictions: true,
  })

  const sceneQuery = useSceneData(sceneId)
  const metricsQuery = useMetrics(3000)

  useEffect(() => {
    if (sceneId) return
    if (scenesQuery.data.length === 0) return
    setSceneId(scenesQuery.data[0])
  }, [sceneId, scenesQuery.data])

  useEffect(() => {
    if (!sceneQuery.data) return
    console.log('Scene data:', sceneQuery.data)
    console.log('Agents (backend):', sceneQuery.data.agents)
  }, [sceneQuery.data])

  const trajectories = useMemo(() => {
    const scene = sceneQuery.data
    if (!scene) return [] as number[][][]
    return scene.agents.slice(0, 6).map((a) => a.history)
  }, [sceneQuery.data])

  const agents = useMemo(() => {
    const scene = sceneQuery.data
    if (!scene) return [] as { agentId: string; history: number[][]; future: number[][] }[]
    console.log('[DEBUG] Building agents from scene data (deterministic source):', scene.scene_id)
    return scene.agents
      .slice(0, 200)
      .map((a) => ({
        agentId: String(a.agent_id),
        history: a.history.filter((pt) => pt.length >= 2 && Number.isFinite(pt[0]) && Number.isFinite(pt[1])),
        future: (a.future || []).filter((pt) => pt.length >= 2 && Number.isFinite(pt[0]) && Number.isFinite(pt[1])),
      }))
      .filter((a) => a.history.length >= 2)
  }, [sceneQuery.data])

  useEffect(() => {
    console.log('[DEBUG] Loading:', sceneQuery.loading)
    console.log('[DEBUG] Agents count:', agents.length)
    console.log('[DEBUG] Agent IDs:', agents.map((a) => a.agentId))
    console.log('[DEBUG] Selected agent:', selectedAgentId)
    console.log('[DEBUG] Selected agent type:', typeof selectedAgentId)
    if (agents.length > 0) {
      console.log('[DEBUG] First agent future length:', agents[0].future.length)
    }
  }, [agents, sceneQuery.loading, selectedAgentId])

  // Clear stale agent selection immediately when scene changes
  useEffect(() => {
    console.log('[DEBUG] Scene changed, clearing agent selection')
    setSelectedAgentId(null)
  }, [sceneId])

  // Auto-select first valid agent when agents list changes (wait for loading to complete)
  useEffect(() => {
    if (sceneQuery.loading) {
      console.log('[DEBUG] Scene still loading, waiting...')
      return
    }

    if (!agents || agents.length === 0) {
      console.log('[DEBUG] No agents available yet')
      return
    }

    // If no agent selected, select first agent
    if (!selectedAgentId) {
      console.log('[DEBUG] Auto-selecting first agent:', agents[0].agentId)
      setSelectedAgentId(agents[0].agentId)
    }
  }, [agents, selectedAgentId, sceneQuery.loading])

  const sceneOptions = useMemo(() => {
    return scenesQuery.data.map((s) => ({ label: s, value: s }))
  }, [scenesQuery.data])

  const agentOptions = useMemo(() => {
    return agents.map((a) => ({ label: a.agentId, value: a.agentId }))
  }, [agents])

  const visibleTrajectories = useMemo(() => {
    if (!selectedAgentId) return trajectories
    const idx = agents.findIndex((a) => a.agentId === selectedAgentId)
    if (idx < 0 || idx >= trajectories.length) return trajectories
    return [trajectories[idx]]
  }, [selectedAgentId, agents, trajectories])

  async function refresh() {
    await Promise.all([sceneQuery.refresh(), metricsQuery.refresh()])
  }

  async function runPredict() {
    await metricsQuery.refresh()

    // Reset metrics before new prediction
    setADE(null)
    setFDE(null)
    setViewMode('focus')

    const id = selectedAgentId
    if (!id) {
      setPredictions(null)
      return
    }

    const a = agents.find((x) => x.agentId === id)
    if (!a || a.history.length === 0) {
      setPredictions(null)
      return
    }

    console.log('selectedAgent:', a)
    console.log('[DEBUG] Ground truth future:', a.future)

    const historyLen = 8
    const hist = a.history.length > historyLen ? a.history.slice(-historyLen) : a.history
    if (hist.length < 2) {
      setPredictions(null)
      return
    }

    const neighborLen = 8
    const neighbors = agents
      .filter((x) => x.agentId !== id)
      .map((x) => (x.history.length > neighborLen ? x.history.slice(-neighborLen) : x.history))
      .filter((t) => t.length === neighborLen)
      .slice(0, 5)

    const payload = {
      history: hist.map((p) => [p[0], p[1]]),
      neighbors: neighbors.length > 0 ? neighbors.map((t) => t.map((p) => [p[0], p[1]])) : undefined,
    }

    console.log('[DEBUG] predict payload (using locked history):', payload)
    console.log('[DEBUG] History source: backend API scene data (NOT randomly generated)')

    setPredictions(null)

    try {
      const res = await predict(payload)
      
      console.log('\n=== RAW BACKEND RESPONSE ===')
      console.log(JSON.stringify(res, null, 2))
      console.log('\n=== HISTORY CONTEXT ===')
      console.log('Last history point:', hist[hist.length - 1])
      console.log('History length:', hist.length)
      
      // Compute ADE and FDE using ground truth future
      if (a.future && a.future.length > 0 && res.modes && res.modes.length > 0) {
        const groundTruth = a.future
        const lastHistoryPoint = hist[hist.length - 1]
        
        console.log('\n=== COMPUTING ADE/FDE ===')
        console.log('PRED RAW (first mode, first 3 points):', res.modes[0].trajectory.slice(0, 3))
        console.log('GT RAW (first 3 points):', groundTruth.slice(0, 3))
        console.log('Last history point:', lastHistoryPoint)
        console.log('Coordinate type:', res.coordinate_type)
        console.log('Ground truth length:', groundTruth.length)
        
        // Compute scene scale from ground truth trajectory bounds
        const xs = groundTruth.map((p) => p[0])
        const ys = groundTruth.map((p) => p[1])
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)
        const sceneScale = Math.sqrt(
          Math.pow(maxX - minX, 2) + Math.pow(maxY - minY, 2)
        )
        
        console.log('\n=== SCENE SCALE ===')
        console.log('X range:', [minX.toFixed(2), maxX.toFixed(2)])
        console.log('Y range:', [minY.toFixed(2), maxY.toFixed(2)])
        console.log('Scene scale:', sceneScale.toFixed(3))
        
        // Helper function to compute normalized metrics
        const computeMetrics = (pred: number[][], gt: number[][]) => {
          const n = Math.min(pred.length, gt.length)
          if (n === 0) return { ade: 0, fde: 0 }
          
          let sumDist = 0
          
          for (let i = 0; i < n; i++) {
            const dx = pred[i][0] - gt[i][0]
            const dy = pred[i][1] - gt[i][1]
            const dist = Math.sqrt(dx * dx + dy * dy)
            const normalizedDist = dist / (sceneScale + 1e-6)
            sumDist += normalizedDist
          }
          
          const ade = sumDist / n
          
          const lastPred = pred[n - 1]
          const lastGt = gt[n - 1]
          const rawFde = Math.sqrt(
            Math.pow(lastPred[0] - lastGt[0], 2) +
            Math.pow(lastPred[1] - lastGt[1], 2)
          )
          const fde = rawFde / (sceneScale + 1e-6)
          
          return { ade, fde }
        }
        
        // Transform predictions to absolute coordinates if needed
        const modeMetrics = res.modes.map((mode, modeIdx) => {
          let pred = mode.trajectory
          
          // If predictions are relative, convert to absolute by adding last history point
          if (res.coordinate_type === 'relative') {
            pred = pred.map((p) => [
              p[0] + lastHistoryPoint[0],
              p[1] + lastHistoryPoint[1],
            ])
          }
          
          const { ade, fde } = computeMetrics(pred, groundTruth)
          
          console.log(`Mode ${modeIdx}: ADE (normalized)=${ade.toFixed(3)}, FDE (normalized)=${fde.toFixed(3)}`)
          
          return { ade, fde, modeIdx }
        })
        
        // Compute confidence scores based on inverse ADE
        const rawScores = modeMetrics.map((m) => 1 / (m.ade + 1e-6))
        const sumScores = rawScores.reduce((a, b) => a + b, 0)
        const confidences = rawScores.map((s) => s / sumScores)
        
        console.log('\n=== CONFIDENCE SCORES ===')
        modeMetrics.forEach((m, i) => {
          console.log(`Mode ${i}: Confidence=${(confidences[i] * 100).toFixed(1)}%`)
        })
        
        // Select best mode (lowest ADE)
        const bestMode = modeMetrics.reduce((best, curr) => 
          curr.ade < best.ade ? curr : best
        )
        
        console.log(`\nBest mode: ${bestMode.modeIdx} with ADE (normalized)=${bestMode.ade.toFixed(3)}, FDE (normalized)=${bestMode.fde.toFixed(3)}, Confidence=${(confidences[bestMode.modeIdx] * 100).toFixed(1)}%`)
        
        // Update UI state with computed metrics
        setADE(bestMode.ade.toFixed(3))
        setFDE(bestMode.fde.toFixed(3))
        
        // Collision detection
        const COLLISION_DIST = 2.0
        const nearbyAgents = agents
          .filter((x) => x.agentId !== id)
          .filter((x) => {
            if (x.history.length === 0) return false
            const lastPos = x.history[x.history.length - 1]
            const selectedLastPos = hist[hist.length - 1]
            const dx = lastPos[0] - selectedLastPos[0]
            const dy = lastPos[1] - selectedLastPos[1]
            const dist = Math.sqrt(dx * dx + dy * dy)
            return dist < 20
          })
          .slice(0, 3)
        
        const checkCollision = (pred: number[][], neighbors: typeof nearbyAgents) => {
          if (neighbors.length === 0) return false
          
          for (let t = 0; t < pred.length; t++) {
            for (const n of neighbors) {
              if (n.history.length === 0) continue
              const np = n.history[n.history.length - 1]
              
              const dx = pred[t][0] - np[0]
              const dy = pred[t][1] - np[1]
              const dist = Math.sqrt(dx * dx + dy * dy)
              
              if (dist < COLLISION_DIST) {
                return true
              }
            }
          }
          return false
        }
        
        console.log('\n=== COLLISION DETECTION ===')
        console.log('Nearby agents for collision check:', nearbyAgents.length)
        console.log('Collision distance threshold:', COLLISION_DIST)
        
        // Enrich modes with confidence scores and collision detection
        const enrichedModes = res.modes.map((mode, i) => {
          let pred = mode.trajectory
          
          // Convert to absolute coordinates for collision check
          if (res.coordinate_type === 'relative') {
            pred = pred.map((p) => [
              p[0] + lastHistoryPoint[0],
              p[1] + lastHistoryPoint[1],
            ])
          }
          
          const collision = checkCollision(pred, nearbyAgents)
          
          console.log(`Mode ${i}: Collision=${collision}`)
          
          return {
            ...mode,
            confidence: confidences[i],
            collision,
          }
        })
        
        const bestModeHasCollision = enrichedModes[bestMode.modeIdx].collision
        if (bestModeHasCollision) {
          console.log('⚠️  WARNING: Best prediction mode has collision risk!')
        }
        
        console.log('\n=== ENRICHED MODES ===')
        console.log('CONFIDENCES:', confidences)
        console.log('Sum of confidences:', confidences.reduce((a, b) => a + b, 0).toFixed(3))
        console.log('Collision risks:', enrichedModes.map((m) => m.collision))
        
        setPredictions({
          ...res,
          modes: enrichedModes,
        })
      } else {
        setPredictions(res)
      }
      await metricsQuery.refresh()
    } catch {
      setPredictions(null)
    }
  }

  function onReset() {
    console.log('[DEBUG] Reset: clearing predictions only')
    setViewMode('focus')
    setPredictions(null)
  }

  // List of valid scenes that exist in the dataset
  const VALID_SCENES = [
    'scene-0061',
    'scene-0103',
    'scene-0553',
    'scene-0655',
    'scene-0757',
  ]

  function getRandomSceneId() {
    const index = Math.floor(Math.random() * VALID_SCENES.length)
    return VALID_SCENES[index]
  }

  function handleRandomScene() {
    const newSceneId = getRandomSceneId()
    console.log('[DEBUG] Loading random scene:', newSceneId)
    setSceneId(newSceneId)
    setViewMode('focus')
    setPredictions(null)
    // Agent selection will be handled automatically by useEffect when agents list updates
  }

  function handleToggleViewMode() {
    setViewMode((mode) => (mode === 'focus' ? 'social' : 'focus'))
  }

  function handleToggleRenderMode() {
    setRenderMode((mode) => (mode === 'graph' ? 'scene' : 'graph'))
  }

  function onToggle(key: keyof typeof toggles, value: boolean) {
    setToggles((t) => ({ ...t, [key]: value }))
  }

  const selectedAgent = useMemo(() => {
    const id = selectedAgentId
    if (!id) return null
    const agent = agents.find((a) => a.agentId === id) ?? null
    if (agent) {
      console.log('[DEBUG] selectedAgent locked:', {
        agentId: agent.agentId,
        historyLength: agent.history.length,
        firstPoint: agent.history[0],
        lastPoint: agent.history[agent.history.length - 1],
      })
    }
    return agent
  }, [agents, selectedAgentId])

  const chartHistory = useMemo(() => {
    if (!selectedAgent) return [] as number[][]
    const h = selectedAgent.history
    if (!toggles.showHistory) return [] as number[][]
    return h.length > 8 ? h.slice(-8) : h
  }, [selectedAgent, toggles.showHistory])

  const socialNeighbors = useMemo(() => {
    if (!selectedAgent || agents.length === 0) return [] as number[][][]

    const lastSelected = selectedAgent.history[selectedAgent.history.length - 1]
    if (!lastSelected || lastSelected.length < 2) return [] as number[][][]

    const radius = 20
    return agents
      .filter((a) => a.agentId !== selectedAgent.agentId)
      .filter((a) => a.history.length > 0)
      .map((a) => {
        const lastOther = a.history[a.history.length - 1]
        if (!lastOther || lastOther.length < 2) return { history: a.history, dist: Number.POSITIVE_INFINITY }
        const dx = lastSelected[0] - lastOther[0]
        const dy = lastSelected[1] - lastOther[1]
        const dist = Math.sqrt(dx * dx + dy * dy)
        return { history: a.history, dist }
      })
      .filter((a) => a.dist < radius)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
      .map((a) => a.history)
  }, [agents, selectedAgent])

  useEffect(() => {
    if (chartHistory.length > 0) {
      console.log('[DEBUG] chartHistory (locked snapshot):', chartHistory)
      console.log('[DEBUG] Last history point:', chartHistory[chartHistory.length - 1])
    }
  }, [chartHistory])

  useEffect(() => {
    console.log('[DEBUG] predictions state:', predictions)
  }, [predictions])

  return (
    <AppShell
      header={<Header sceneId={sceneId} />}
      sidebar={
        <Sidebar
          scenes={sceneOptions}
          agents={agentOptions}
          sceneId={sceneId}
          agentId={selectedAgentId || ''}
          onChangeSceneId={(v) => {
            setSceneId(v)
            setSelectedAgentId(null)
            setPredictions(null)
          }}
          onChangeAgentId={(v) => {
            setSelectedAgentId(v)
            setPredictions(null)
          }}
          toggles={toggles}
          onToggle={onToggle}
        />
      }
      main={
        <main className="min-h-0 p-4">
          {selectedAgent ? (
            <TrajectoryChart
              history={chartHistory}
              predictions={toggles.showPredictions ? predictions : null}
              socialNeighbors={socialNeighbors}
              viewMode={viewMode}
              renderMode={renderMode}
            />
          ) : (
            <div className="flex h-[440px] w-full items-center justify-center rounded-xl bg-[#0b1220] p-4 shadow-inner text-sm text-muted-foreground">
              Select an agent
            </div>
          )}
        </main>
      }
      bottom={
        <BottomPanel
          onPredict={runPredict}
          onReset={onReset}
          onRandomScene={handleRandomScene}
          onToggleViewMode={handleToggleViewMode}
          onToggleRenderMode={handleToggleRenderMode}
          canPredict={Boolean(selectedAgentId)}
          metrics={metricsQuery.data ?? undefined}
          ade={ade}
          fde={fde}
          viewMode={viewMode}
          renderMode={renderMode}
          predictions={predictions}
        />
      }
    />
  )
}
