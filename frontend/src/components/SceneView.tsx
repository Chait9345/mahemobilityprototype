import { useMemo } from 'react'

type Props = {
  history: number[][]
  predictions: {
    coordinate_type: 'relative' | 'absolute'
    modes: { trajectory: number[][]; probability?: number; confidence?: number; collision?: boolean }[]
  } | null
  socialNeighbors?: number[][][]
  viewMode?: 'focus' | 'social'
}

export default function SceneView({ history, predictions, socialNeighbors = [], viewMode = 'focus' }: Props) {
  if (!history) return null

  const visibleHistory = viewMode === 'focus' && history.length > 4 ? history.slice(-4) : history
  const anchor = visibleHistory.length > 0 ? visibleHistory[visibleHistory.length - 1] : [0, 0]
  const origin = visibleHistory.length > 0 ? visibleHistory[visibleHistory.length - 1] : [0, 0]

  const isRelative = predictions?.coordinate_type === 'relative'

  const toAgentCentric = (p: readonly [number, number]) => [p[0] - anchor[0], p[1] - anchor[1]] as const

  const toWorldPred = (p: number[]) => {
    const x = p?.[0]
    const y = p?.[1]
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null

    const lastX = origin[0]
    const lastY = origin[1]
    return isRelative ? ([x + lastX, y + lastY] as const) : ([x, y] as const)
  }

  const modes = (predictions?.modes ?? []).slice(0, 3)

  // Color scheme matching graph view
  const getModeColor = (idx: number, hasCollision?: boolean) => {
    if (hasCollision) return '#FF0000'
    const modeColors = ['#00FF88', '#FF8800', '#A855F7']
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

  const modesWorld = modes.map((m) => {
    const pts = m.trajectory
      .map((p) => toWorldPred(p))
      .filter((p): p is readonly [number, number] => p != null)

    if (historyWorld.length === 0) return pts
    if (pts.length === 0) return [historyWorld[historyWorld.length - 1]]

    const start = historyWorld[historyWorld.length - 1]
    const first = pts[0]
    const sameStart = Math.abs(first[0] - start[0]) < 1e-6 && Math.abs(first[1] - start[1]) < 1e-6
    return sameStart ? pts : [start, ...pts]
  })

  const finalModesRelative = modesWorld.map((mode) => mode.map((p) => toAgentCentric(p)))

  // AGGRESSIVE SMART ZOOM: same as graph view
  const computeViewportBounds = () => {
    if (viewMode === 'social') {
      return { minX: -25, maxX: 25, minY: -25, maxY: 25 }
    }

    const allPoints: number[][] = []
    
    const recentHistory = historyRelative.slice(-3)
    recentHistory.forEach((p) => allPoints.push([p[0], p[1]]))
    
    finalModesRelative.forEach((mode) => {
      mode.forEach((p) => allPoints.push([p[0], p[1]]))
    })

    if (allPoints.length === 0) {
      return { minX: -5, maxX: 5, minY: -5, maxY: 5 }
    }

    const xs = allPoints.map((p) => p[0])
    const ys = allPoints.map((p) => p[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    const rangeX = maxX - minX
    const rangeY = maxY - minY
    const padding = 0.3
    const paddedMinX = minX - rangeX * padding
    const paddedMaxX = maxX + rangeX * padding
    const paddedMinY = minY - rangeY * padding
    const paddedMaxY = maxY + rangeY * padding

    const minRange = 2.5
    const finalRangeX = Math.max(paddedMaxX - paddedMinX, minRange)
    const finalRangeY = Math.max(paddedMaxY - paddedMinY, minRange)
    const centerX = (paddedMinX + paddedMaxX) / 2
    const centerY = (paddedMinY + paddedMaxY) / 2

    return {
      minX: centerX - finalRangeX / 2,
      maxX: centerX + finalRangeX / 2,
      minY: centerY - finalRangeY / 2,
      maxY: centerY + finalRangeY / 2,
    }
  }

  const bounds = computeViewportBounds()
  const viewWidth = bounds.maxX - bounds.minX
  const viewHeight = bounds.maxY - bounds.minY
  const svgWidth = 800
  const svgHeight = 420

  // Transform world coordinates to SVG coordinates
  const toSVG = (x: number, y: number): [number, number] => {
    const svgX = ((x - bounds.minX) / viewWidth) * svgWidth
    const svgY = svgHeight - ((y - bounds.minY) / viewHeight) * svgHeight
    return [svgX, svgY]
  }

  const hasAnyCollision = modes.some((m) => m.collision)

  return (
    <div className="h-full w-full rounded-xl bg-gradient-to-br from-[#0a0e1a] via-[#0d1220] to-[#0a0e1a] p-4 shadow-inner">
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
          {/* Legend */}
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
          Scene View {viewMode === 'social' ? '• Social Context' : ''}
        </div>
      </div>

      <svg
        width="100%"
        height="420"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="rounded-lg"
      >
        <defs>
          {/* Vignette effect for depth */}
          <radialGradient id="vignette" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
          </radialGradient>
          
          {/* Grass gradient */}
          <linearGradient id="grass-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a3a1a" />
            <stop offset="100%" stopColor="#0d1f0d" />
          </linearGradient>
          
          {/* Road gradient */}
          <linearGradient id="road-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2a2a2a" />
            <stop offset="50%" stopColor="#1f1f1f" />
            <stop offset="100%" stopColor="#2a2a2a" />
          </linearGradient>
        </defs>

        {/* Sky/Background */}
        <rect width={svgWidth} height={svgHeight} fill="#0a0e14" />
        
        {/* Grass areas (left and right) */}
        <rect x="0" y="0" width={svgWidth * 0.2} height={svgHeight} fill="url(#grass-gradient)" />
        <rect x={svgWidth * 0.8} y="0" width={svgWidth * 0.2} height={svgHeight} fill="url(#grass-gradient)" />
        
        {/* Main road surface (60% of width, centered) */}
        <rect 
          x={svgWidth * 0.2} 
          y="0" 
          width={svgWidth * 0.6} 
          height={svgHeight} 
          fill="url(#road-gradient)" 
        />
        
        {/* Road edge lines */}
        <line 
          x1={svgWidth * 0.2} 
          y1="0" 
          x2={svgWidth * 0.2} 
          y2={svgHeight} 
          stroke="#ffffff" 
          strokeWidth="2" 
          opacity="0.6" 
        />
        <line 
          x1={svgWidth * 0.8} 
          y1="0" 
          x2={svgWidth * 0.8} 
          y2={svgHeight} 
          stroke="#ffffff" 
          strokeWidth="2" 
          opacity="0.6" 
        />
        
        {/* Center lane dashed markings */}
        <line 
          x1={svgWidth * 0.5} 
          y1="0" 
          x2={svgWidth * 0.5} 
          y2={svgHeight} 
          stroke="#ffdd44" 
          strokeWidth="3" 
          strokeDasharray="20,15" 
          opacity="0.8" 
        />
        
        {/* Vignette overlay for depth */}
        <rect width={svgWidth} height={svgHeight} fill="url(#vignette)" />

        {/* Neighbor agents (pedestrians/other vehicles) */}
        {viewMode === 'social' && neighborRelative.map((neighbor, idx) => {
          if (neighbor.length === 0) return null
          const lastPoint = neighbor[neighbor.length - 1]
          const [svgX, svgY] = toSVG(lastPoint[0], lastPoint[1])
          return (
            <g key={`neighbor-${idx}`}>
              {/* Pedestrian representation */}
              <circle 
                cx={svgX} 
                cy={svgY} 
                r="5" 
                fill="#ffaa44" 
                opacity="0.7" 
                style={{ filter: 'drop-shadow(0 0 4px #ffaa44)' }} 
              />
              <circle cx={svgX} cy={svgY} r="3" fill="#ffffff" opacity="0.5" />
            </g>
          )
        })}

        {/* History trajectory (faded cyan line with glow) */}
        {historyRelative.length > 1 && (
          <polyline
            points={historyRelative.map((p) => toSVG(p[0], p[1]).join(',')).join(' ')}
            fill="none"
            stroke="#00E5FF"
            strokeWidth="3"
            opacity="0.5"
            style={{ filter: 'drop-shadow(0 0 4px #00E5FF)' }}
          />
        )}

        {/* Prediction trajectories with enhanced visibility */}
        {finalModesRelative.map((mode, idx) => {
          if (mode.length === 0) return null
          const m = modes[idx]
          const hasCollision = m?.collision ?? false
          const confidence = m?.confidence ?? 0
          const isHighestConfidence = modes.reduce((best, m, i) => 
            (m.confidence ?? 0) > (modes[best].confidence ?? 0) ? i : best
          , 0) === idx
          const color = getModeColor(idx, hasCollision)
          const strokeWidth = hasCollision ? 6 : isHighestConfidence ? 5 : 4

          return (
            <g key={`mode-${idx}`} className="animate-in fade-in" style={{ animationDelay: `${idx * 150}ms` }}>
              {/* Outer glow for depth */}
              <polyline
                points={mode.map((p) => toSVG(p[0], p[1]).join(',')).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth + 4}
                opacity="0.2"
                strokeDasharray={hasCollision || isHighestConfidence ? '0' : '10 6'}
              />
              {/* Main trajectory line */}
              <polyline
                points={mode.map((p) => toSVG(p[0], p[1]).join(',')).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={hasCollision || isHighestConfidence ? '0' : '10 6'}
                opacity={hasCollision ? 1 : 0.95}
                style={{
                  filter: hasCollision
                    ? `drop-shadow(0 0 10px ${color}) drop-shadow(0 0 16px ${color})`
                    : isHighestConfidence
                    ? `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 12px ${color})`
                    : `drop-shadow(0 0 6px ${color})`,
                }}
              >
                {!hasCollision && !isHighestConfidence && (
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="-16"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                )}
                {hasCollision && (
                  <animate
                    attributeName="opacity"
                    values="1;0.7;1"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                )}
              </polyline>
              {/* Draw points along trajectory with enhanced visibility */}
              {mode.map((p, i) => {
                const [svgX, svgY] = toSVG(p[0], p[1])
                return (
                  <circle
                    key={i}
                    cx={svgX}
                    cy={svgY}
                    r={hasCollision ? 4 : 3}
                    fill={color}
                    opacity={0.9}
                    style={{ filter: `drop-shadow(0 0 3px ${color})` }}
                  />
                )
              })}
            </g>
          )
        })}

        {/* Main agent (direction-aware triangle marker at current position) */}
        {historyRelative.length > 0 && (() => {
          const currentPos = historyRelative[historyRelative.length - 1]
          const [svgX, svgY] = toSVG(currentPos[0], currentPos[1])
          
          // Calculate direction from last two history points
          let angle = 0
          const hasDirection = historyRelative.length >= 2
          if (hasDirection) {
            const prev = historyRelative[historyRelative.length - 2]
            const dx = currentPos[0] - prev[0]
            const dy = currentPos[1] - prev[1]
            angle = Math.atan2(dy, dx) * (180 / Math.PI)
          }

          return (
            <g transform={`translate(${svgX}, ${svgY}) rotate(${angle})`}>
              {hasDirection ? (
                // Triangle (arrow-like) marker pointing in direction of motion
                <>
                  {/* Shadow for depth */}
                  <polygon
                    points="0,-8 -6,6 6,6"
                    fill="#000000"
                    opacity="0.2"
                    transform="translate(0, 2)"
                  />
                  
                  {/* Main triangle */}
                  <polygon
                    points="0,-8 -6,6 6,6"
                    fill="#00E5FF"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    style={{ filter: 'drop-shadow(0 0 8px #00E5FF) drop-shadow(0 0 12px #00E5FF)' }}
                  />
                  
                  {/* Inner highlight for depth */}
                  <polygon
                    points="0,-6 -4,4 4,4"
                    fill="#4dd4ff"
                    opacity="0.6"
                  />
                </>
              ) : (
                // Fallback: simple circle if no direction available
                <>
                  <circle
                    cx="0"
                    cy="0"
                    r="8"
                    fill="#00E5FF"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    style={{ filter: 'drop-shadow(0 0 8px #00E5FF) drop-shadow(0 0 12px #00E5FF)' }}
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r="5"
                    fill="#4dd4ff"
                    opacity="0.6"
                  />
                </>
              )}
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
