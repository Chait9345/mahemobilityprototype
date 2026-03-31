import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import SceneView from './SceneView'

type Props = {
  history: number[][]
  predictions: {
    coordinate_type: 'relative' | 'absolute'
    modes: { trajectory: number[][]; probability?: number; confidence?: number; collision?: boolean }[]
  } | null
  socialNeighbors?: number[][][]
  viewMode?: 'focus' | 'social'
  renderMode?: 'graph' | 'scene'
}

export default function TrajectoryChart({ history, predictions, socialNeighbors = [], viewMode = 'focus', renderMode = 'graph' }: Props) {
  if (!history) return null

  const visibleHistory = viewMode === 'focus' && history.length > 4 ? history.slice(-4) : history
  const origin = visibleHistory.length > 0 ? visibleHistory[visibleHistory.length - 1] : [0, 0]
  const anchor = visibleHistory.length > 0 ? visibleHistory[visibleHistory.length - 1] : [0, 0]

  const isRelative = predictions?.coordinate_type === 'relative'

  const getMagnitude = ([x, y]: number[]) => Math.sqrt(x * x + y * y)
  const toAgentCentric = (p: readonly [number, number]) => [p[0] - anchor[0], p[1] - anchor[1]] as const

  if (predictions && predictions.modes.length > 0) {
    console.log('\n=== TRAJECTORY CHART ANALYSIS ===')
    console.log('[TRAJECTORY] Coordinate type (explicit):', predictions.coordinate_type)
    console.log('[TRAJECTORY] Last history point:', origin)
    console.log('[TRAJECTORY] Origin magnitude:', getMagnitude(origin).toFixed(2))
    
    console.log('\n=== RAW MODES ANALYSIS ===')
    predictions.modes.forEach((mode, i) => {
      const firstPoint = mode.trajectory[0]
      const mag = getMagnitude(firstPoint)
      
      console.log(`\nMode ${i}:`)
      console.log('  First 5 points:', mode.trajectory.slice(0, 5))
      console.log('  First point magnitude:', mag.toFixed(4))
      
      if (mag < 10) {
        console.log('  → VERY SMALL (< 10) → likely RELATIVE offsets')
      } else if (mag < 100) {
        console.log('  → MEDIUM (10-100) → SUSPICIOUS / unclear')
      } else {
        console.log('  → LARGE (> 100) → likely ABSOLUTE world coords')
      }
    })
  }

  const toWorldPred = (p: number[]) => {
    const x = p?.[0]
    const y = p?.[1]
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null

    const lastX = origin[0]
    const lastY = origin[1]
    return isRelative ? ([x + lastX, y + lastY] as const) : ([x, y] as const)
  }

  const modes = (predictions?.modes ?? []).slice(0, 3)
  const bestIdx = (() => {
    if (modes.length === 0) return -1
    let best = 0
    let bestP = modes[0].probability ?? 0
    for (let i = 1; i < modes.length; i += 1) {
      const p = modes[i].probability ?? 0
      if (p > bestP) {
        bestP = p
        best = i
      }
    }
    return best
  })()

  // Color scheme: mode1=green, mode2=orange, mode3=purple, collision=red
  const getModeColor = (idx: number, hasCollision?: boolean) => {
    if (hasCollision) return '#FF0000' // Red for collision
    const modeColors = ['#00FF88', '#FF8800', '#A855F7'] // Green, Orange, Purple
    return modeColors[idx % modeColors.length]
  }

  const historyWorld = visibleHistory
    .map((p) => (p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) ? ([p[0], p[1]] as const) : null))
    .filter((p): p is readonly [number, number] => p != null)

  const historyRelative = historyWorld.map((p) => toAgentCentric(p))

  const activeSocialNeighbors = viewMode === 'social' ? socialNeighbors : []

  const neighborWorld = activeSocialNeighbors.map((neighbor) =>
    neighbor
      .map((p) => (p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) ? ([p[0], p[1]] as const) : null))
      .filter((p): p is readonly [number, number] => p != null),
  )

  const neighborRelative = neighborWorld.map((neighbor) => neighbor.map((p) => toAgentCentric(p)))

  if (predictions) {
    console.log('\n=== TRANSFORMATION DECISION ===')
    console.log('[TRAJECTORY] Using explicit coordinate_type:', isRelative ? 'RELATIVE (will anchor)' : 'ABSOLUTE (no anchoring)')
  }

  const modesWorld = modes.map((m, modeIdx) => {
    const pts = m.trajectory
      .map((p) => toWorldPred(p))
      .filter((p): p is readonly [number, number] => p != null)

    if (historyWorld.length === 0) return pts
    if (pts.length === 0) return [historyWorld[historyWorld.length - 1]]

    const start = historyWorld[historyWorld.length - 1]
    const first = pts[0]
    const sameStart = Math.abs(first[0] - start[0]) < 1e-6 && Math.abs(first[1] - start[1]) < 1e-6
    const final = sameStart ? pts : [start, ...pts]

    if (modeIdx === 0) {
      console.log('\n=== AFTER TRANSFORMATION (Mode 0) ===')
      console.log('Coordinate type:', isRelative ? 'relative' : 'absolute')
      console.log('Last history point:', start)
      console.log('First transformed point:', final[0])
      console.log('Perfect match:', Math.abs(final[0][0] - start[0]) < 1e-3 && Math.abs(final[0][1] - start[1]) < 1e-3)
      console.log('Transformed points (first 3):', final.slice(0, 3))
    }

    return final
  })

  if (modesWorld.length > 0) {
    console.log('\n=== ALL MODES AFTER TRANSFORMATION ===')
    modesWorld.forEach((modeWorld, i) => {
      console.log(`Mode ${i} first 3 points:`, modeWorld.slice(0, 3))
    })
    console.log('=== END TRAJECTORY ANALYSIS ===\n')
  }

  // Apply light smoothing for visual stability (preserves first/last points)
  const smoothTrajectory = (mode: readonly (readonly [number, number])[]) => {
    if (mode.length < 3) return mode

    return mode.map((point, i) => {
      // Preserve first and last points exactly
      if (i === 0 || i === mode.length - 1) return point

      const prev = mode[i - 1]
      const curr = point
      const next = mode[i + 1]

      // Weighted smoothing (0.25-0.5-0.25) - preserves shape better than equal weights
      return [
        prev[0] * 0.25 + curr[0] * 0.5 + next[0] * 0.25,
        prev[1] * 0.25 + curr[1] * 0.5 + next[1] * 0.25,
      ] as const
    })
  }

  const finalModes = modesWorld.map(smoothTrajectory)
  const finalModesRelative = finalModes.map((mode) => mode.map((p) => toAgentCentric(p)))

  // AGGRESSIVE SMART ZOOM: focus on predictions + last 2-3 history points only
  const computeViewportBounds = () => {
    if (viewMode === 'social') {
      return { xDomain: [-25, 25] as const, yDomain: [-25, 25] as const }
    }

    const allPoints: number[][] = []
    
    // Add only last 2-3 history points for context
    const recentHistory = historyRelative.slice(-3)
    recentHistory.forEach((p) => allPoints.push([p[0], p[1]]))
    
    // Add ALL prediction points (primary focus)
    finalModesRelative.forEach((mode) => {
      mode.forEach((p) => allPoints.push([p[0], p[1]]))
    })

    if (allPoints.length === 0) {
      return { xDomain: [-5, 5] as const, yDomain: [-5, 5] as const }
    }

    const xs = allPoints.map((p) => p[0])
    const ys = allPoints.map((p) => p[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    // Add 30% padding
    const rangeX = maxX - minX
    const rangeY = maxY - minY
    const padding = 0.3
    const paddedMinX = minX - rangeX * padding
    const paddedMaxX = maxX + rangeX * padding
    const paddedMinY = minY - rangeY * padding
    const paddedMaxY = maxY + rangeY * padding

    // Ensure minimum range for very small trajectories
    const minRange = 2.5
    const finalRangeX = Math.max(paddedMaxX - paddedMinX, minRange)
    const finalRangeY = Math.max(paddedMaxY - paddedMinY, minRange)
    const centerX = (paddedMinX + paddedMaxX) / 2
    const centerY = (paddedMinY + paddedMaxY) / 2

    return {
      xDomain: [centerX - finalRangeX / 2, centerX + finalRangeX / 2] as const,
      yDomain: [centerY - finalRangeY / 2, centerY + finalRangeY / 2] as const,
    }
  }

  const { xDomain, yDomain } = computeViewportBounds()

  const historyData = historyRelative.map((p, i) => ({ x: p[0], y: p[1], i }))
  const neighborData = neighborRelative.map((arr) => arr.map((p, i) => ({ x: p[0], y: p[1], i })))
  const modeData = finalModesRelative.map((arr) => arr.map((p, i) => ({ x: p[0], y: p[1], i })))

  const hasAnyCollision = modes.some((m) => m.collision)

  // Render Scene View if renderMode is 'scene'
  if (renderMode === 'scene') {
    return (
      <div className="animate-in fade-in duration-300">
        <SceneView
          history={history}
          predictions={predictions}
          socialNeighbors={socialNeighbors}
          viewMode={viewMode}
        />
      </div>
    )
  }

  // Default: Render Graph View
  return (
    <div className="h-full w-full rounded-xl bg-[#050b18] p-4 shadow-inner">
      {/* Collision Warning Banner */}
      {hasAnyCollision && (
        <div className="mb-3 animate-pulse rounded-lg border-2 border-red-500 bg-red-500/10 px-4 py-2 text-center">
          <div className="text-sm font-bold text-red-500 drop-shadow-[0_0_8px_#FF0000]">
            ⚠️ COLLISION RISK DETECTED
          </div>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-5 text-sm">
          {/* Legend - Enhanced */}
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#00E5FF] opacity-60"></div>
            <span className="font-semibold text-gray-300">History</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#00FF88] shadow-[0_0_6px_#00FF88]"></div>
            <span className="font-bold text-[#00FF88]">Mode 1</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#FF8800] shadow-[0_0_6px_#FF8800]"></div>
            <span className="font-bold text-[#FF8800]">Mode 2</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#A855F7] shadow-[0_0_6px_#A855F7]"></div>
            <span className="font-bold text-[#A855F7]">Mode 3</span>
          </div>
          {hasAnyCollision && (
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 animate-pulse rounded-full bg-[#FF0000] shadow-[0_0_8px_#FF0000]"></div>
              <span className="font-bold text-red-400">Collision</span>
            </div>
          )}
        </div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
          {viewMode === 'focus' ? 'Prediction Mode' : 'Social Context Active'}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart>
          <CartesianGrid stroke="#1f2a38" strokeDasharray="3 3" />

          <XAxis type="number" dataKey="x" domain={xDomain} hide />
          <YAxis type="number" dataKey="y" domain={yDomain} hide />

          <Tooltip
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null
              const point = payload[0]
              const name = String(point.name || '')
              
              // Extract mode index from name like "Mode 1"
              const modeMatch = name.match(/Mode (\d+)/)
              if (!modeMatch) {
                return (
                  <div
                    style={{
                      background: 'rgba(8, 12, 20, 0.95)',
                      border: '1px solid rgba(0, 229, 255, 0.3)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ color: '#00E5FF', fontWeight: 600 }}>{name}</div>
                  </div>
                )
              }
              
              const modeIdx = parseInt(modeMatch[1]) - 1
              const mode = modes[modeIdx]
              if (!mode) return null
              
              const hasCollision = mode.collision ?? false
              const confidence = mode.confidence ?? 0
              const color = getModeColor(modeIdx, hasCollision)
              
              return (
                <div
                  style={{
                    background: 'rgba(8, 12, 20, 0.95)',
                    border: `2px solid ${color}`,
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontSize: 12,
                    boxShadow: `0 0 12px ${color}66`,
                  }}
                >
                  <div style={{ color: color, fontWeight: 700, marginBottom: 6, fontSize: 13 }}>
                    Mode {modeIdx + 1}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>
                    <strong>Confidence:</strong> {(confidence * 100).toFixed(1)}%
                  </div>
                  <div style={{ color: hasCollision ? '#FF4444' : '#00FF88', fontWeight: 600 }}>
                    <strong>Collision:</strong> {hasCollision ? 'Yes ⚠️' : 'No ✓'}
                  </div>
                </div>
              )
            }}
          />

          {viewMode === 'social' && neighborData.map((data, idx) => (
            <Scatter
              key={`neighbor-${idx}`}
              name={`neighbor-${idx}`}
              data={data}
              line={{ stroke: '#FFFFFF', strokeWidth: 1, opacity: 0.2 }}
              fill="#FFFFFF"
              shape={false}
              isAnimationActive={false}
            />
          ))}

          <Scatter
            name="History"
            data={historyData}
            line={{ stroke: '#00E5FF', strokeWidth: 1, opacity: 0.5 }}
            fill="#00E5FF"
            fillOpacity={0.4}
            shape={false}
            isAnimationActive={false}
          />

          {modeData.map((data, idx) => {
            const mode = modes[idx]
            const hasCollision = mode?.collision ?? false
            const confidence = mode?.confidence ?? 0
            const isBest = idx === bestIdx
            const isHighestConfidence = modes.reduce((best, m, i) => 
              (m.confidence ?? 0) > (modes[best].confidence ?? 0) ? i : best
            , 0) === idx
            const stroke = getModeColor(idx, hasCollision)
            const glow = hasCollision
              ? `drop-shadow(0 0 16px ${stroke}FF) drop-shadow(0 0 24px ${stroke}CC)`
              : isHighestConfidence
              ? `drop-shadow(0 0 12px ${stroke}DD) drop-shadow(0 0 20px ${stroke}88)`
              : isBest
              ? `drop-shadow(0 0 10px ${stroke}CC) drop-shadow(0 0 18px ${stroke}66)`
              : `drop-shadow(0 0 8px ${stroke}88)`
            return (
              <Scatter
                key={idx}
                name={`Mode ${idx + 1}`}
                data={data}
                style={{ filter: glow }}
                line={{
                  stroke,
                  strokeWidth: hasCollision ? 6.5 : isHighestConfidence ? 5.5 : isBest ? 5 : 3.5,
                  strokeDasharray: hasCollision ? '0' : isHighestConfidence ? '0' : isBest ? '0' : '6 6',
                  opacity: hasCollision ? 1 : isHighestConfidence ? 0.95 : isBest ? 1 : 0.85,
                }}
                fill={stroke}
                fillOpacity={hasCollision ? 0.8 : 0.6}
                shape="circle"
                isAnimationActive={true}
                animationDuration={1000 + idx * 250}
                animationEasing="ease-out"
              />
            )
          })}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
