import Konva from 'konva'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Label, Layer, Line, Rect, Stage, Tag, Text } from 'react-konva'

const GLOW_CYAN = '#00E5FF'
const GLOW_PRED = '#FF6B6B'

type Particle = {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  life: number
  ttl: number
}

export type TrajectoryCanvasProps = {
  width?: number
  height?: number
  agents?: { agentId: string; history: number[][] }[]
  predictedPaths?: number[][][]
  predictions?: { modes: { trajectory: number[][]; probability: number }[] } | null
  selectedAgentId?: string | null
  hoveredAgentId?: string | null
  onHoverAgentId?: (agentId: string | null) => void
  onSelectAgentId?: (agentId: string) => void
  showGrid?: boolean
}

function cubicInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function polylineLength(points: number[]) {
  let len = 0
  for (let i = 2; i < points.length; i += 2) {
    const x0 = points[i - 2]
    const y0 = points[i - 1]
    const x1 = points[i]
    const y1 = points[i + 1]
    const dx = x1 - x0
    const dy = y1 - y0
    len += Math.sqrt(dx * dx + dy * dy)
  }
  return len
}

function makeGridLines(width: number, height: number, step: number) {
  const lines: number[][] = []
  for (let x = 0; x <= width; x += step) lines.push([x, 0, x, height])
  for (let y = 0; y <= height; y += step) lines.push([0, y, width, y])
  return lines
}

export function TrajectoryCanvas({
  width = 800,
  height = 500,
  agents = [],
  predictedPaths = [],
  predictions = null,
  selectedAgentId = null,
  hoveredAgentId = null,
  onHoverAgentId,
  onSelectAgentId,
  showGrid = true,
}: TrajectoryCanvasProps) {
  if (!selectedAgentId) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
        Select an agent
      </div>
    )
  }

  const grid = useMemo(() => makeGridLines(width, height, 40), [width, height])

  const stageRef = useRef<Konva.Stage | null>(null)
  const gridLineRefs = useRef<Map<number, Konva.Line>>(new Map())
  const pastLineRefs = useRef<Map<string, Konva.Line>>(new Map())
  const agentCircleRefs = useRef<Map<string, Konva.Circle>>(new Map())
  const agentPulseRefs = useRef<Map<string, Konva.Circle>>(new Map())
  const trailLineRef = useRef<Konva.Line | null>(null)
  const trailPointsRef = useRef<number[]>([])
  const predLineRefs = useRef<Map<string, Konva.Line>>(new Map())
  const predPointsRef = useRef<Map<string, number[]>>(new Map())

  const prevPredCountRef = useRef(0)
  const particlesRef = useRef<Particle[]>([])
  const [particles, setParticles] = useState<Particle[]>([])

  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; text: string }>(
    { visible: false, x: 0, y: 0, text: '' },
  )
  const tooltipNextRef = useRef<{ visible: boolean; x: number; y: number; text: string } | null>(null)
  const tooltipRafRef = useRef<number | null>(null)

  const scheduleTooltip = (next: { visible: boolean; x: number; y: number; text: string }) => {
    tooltipNextRef.current = next
    if (tooltipRafRef.current != null) return
    tooltipRafRef.current = window.requestAnimationFrame(() => {
      tooltipRafRef.current = null
      const v = tooltipNextRef.current
      if (v) setTooltip(v)
    })
  }

  const toCanvas = useMemo(() => {
    const selectedAgent = agents.find((a) => a.agentId === selectedAgentId)

    const points = selectedAgent?.history ?? []

    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    const consumePoint = (p: number[]) => {
      if (p.length < 2) return
      const x = p[0]
      const y = p[1]
      if (!Number.isFinite(x) || !Number.isFinite(y)) return
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }

    for (const p of points) consumePoint(p)

    if (!Number.isFinite(minX)) {
      minX = 0
      maxX = 1
      minY = 0
      maxY = 1
    }

    const padding = 60
    minX -= padding
    maxX += padding
    minY -= padding
    maxY += padding

    const rangeX = Math.max(1e-3, maxX - minX)
    const rangeY = Math.max(1e-3, maxY - minY)

    const scaleX = width / rangeX
    const scaleY = height / rangeY
    let scale = Math.min(scaleX, scaleY)
    scale = Math.min(scale, 8)
    scale = Math.max(scale, 0.5)

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const offsetX = width / 2 - centerX * scale
    const offsetY = height / 2 - centerY * scale

    return (p: number[]) => {
      const x = p[0] * scale + offsetX
      const y = p[1] * scale + offsetY
      return [x, y] as const
    }
  }, [agents, height, selectedAgentId, width])

  const pastLines = useMemo(() => {
    const selectedAgent = agents.find((a) => a.agentId === selectedAgentId)
    if (!selectedAgent)
      return [] as {
        agentId: string
        points: number[]
        last: readonly [number, number]
        segments: { key: string; points: number[]; opacity: number }[]
      }[]

    const pts = selectedAgent.history.flatMap((p) => {
      const c = toCanvas(p)
      return [c[0], c[1]]
    })
    const last = selectedAgent.history.length
      ? toCanvas(selectedAgent.history[selectedAgent.history.length - 1])
      : ([0, 0] as const)

    const segments = (() => {
      const pairs = Math.floor(pts.length / 2)
      if (pairs < 3) return [] as { key: string; points: number[]; opacity: number }[]

      const segCount = 6
      const out: { key: string; points: number[]; opacity: number }[] = []
      for (let s = 0; s < segCount; s += 1) {
        const t0 = s / segCount
        const t1 = (s + 1) / segCount
        const i0 = Math.max(0, Math.floor((pairs - 1) * t0))
        const i1 = Math.min(pairs - 1, Math.floor((pairs - 1) * t1) + 1)
        if (i1 - i0 < 2) continue

        const slice = pts.slice(i0 * 2, i1 * 2)
        const opacity = 0.20 + 0.80 * t1
        out.push({ key: `seg-${s}`, points: slice, opacity })
      }
      return out
    })()

    return [{ agentId: selectedAgent.agentId, points: pts, last, segments }]
  }, [agents, selectedAgentId, toCanvas])

  const predLines = useMemo(() => {
    if (!predictions || predictions.modes.length === 0) return [] as {
      key: string
      points: number[]
      probability: number
    }[]

    const selectedAgent = agents.find((a) => a.agentId === selectedAgentId)
    const selectedLast = selectedAgent && selectedAgent.history.length > 0 ? selectedAgent.history[selectedAgent.history.length - 1] : null

    const firstModeFirstPoint = predictions.modes[0]?.trajectory?.[0] ?? null
    const predMag = firstModeFirstPoint ? Math.max(Math.abs(firstModeFirstPoint[0] ?? 0), Math.abs(firstModeFirstPoint[1] ?? 0)) : 0
    const lastMag = selectedLast ? Math.max(Math.abs(selectedLast[0] ?? 0), Math.abs(selectedLast[1] ?? 0)) : 0
    const shouldOffset = Boolean(selectedLast) && Number.isFinite(predMag) && Number.isFinite(lastMag) && lastMag > 50 && predMag < 10

    return predictions.modes.map((m, idx) => {
      const pts = m.trajectory.flatMap((p) => {
        const world: number[] =
          shouldOffset && selectedLast
            ? [p[0] + selectedLast[0], p[1] + selectedLast[1]]
            : p

        const c = toCanvas(world)
        return [c[0], c[1]]
      })
      return { key: `mode-${idx}`, points: pts, probability: m.probability }
    })
  }, [agents, predictions, selectedAgentId, toCanvas])

  const bestPredKey = useMemo(() => {
    if (predLines.length === 0) return null
    let best = predLines[0]
    for (const p of predLines) if (p.probability > best.probability) best = p
    return best.key
  }, [predLines])

  useEffect(() => {
    const current = predLines.length
    const prev = prevPredCountRef.current
    prevPredCountRef.current = current
    if (prev === 0 && current > 0) {
      const selected = selectedAgentId
      if (!selected) return
      const a = pastLines.find((x) => x.agentId === selected)
      if (!a) return

      const burst: Particle[] = []
      for (let i = 0; i < 18; i += 1) {
        const ang = (Math.PI * 2 * i) / 18
        const sp = 45 + Math.random() * 55
        burst.push({
          id: `${performance.now()}-${i}`,
          x: a.last[0],
          y: a.last[1],
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          life: 0,
          ttl: 0.55 + Math.random() * 0.25,
        })
      }
      particlesRef.current = burst
      setParticles(burst)
    }
  }, [pastLines, predLines.length, selectedAgentId])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const start = performance.now()
    const anim = new Konva.Animation(() => {
      const now = performance.now()
      const dt = (now - start) / 1000

      for (const [idx, node] of gridLineRefs.current.entries()) {
        node.dashOffset(-dt * 6 - idx * 0.35)
      }

      for (const l of pastLines) {
        const pulse = agentPulseRefs.current.get(l.agentId)
        if (!pulse) continue
        const isSelected = selectedAgentId === l.agentId
        const isHovered = hoveredAgentId === l.agentId
        const base = isSelected ? 18 : isHovered ? 16 : 14
        const amp = isSelected ? 6 : 4
        const phase = (dt * 1.2 + (l.agentId.length % 10) * 0.15) % (Math.PI * 2)
        const k = (Math.sin(phase) + 1) / 2
        pulse.radius(base + amp * k)
        pulse.opacity(isSelected ? 0.22 + 0.14 * k : isHovered ? 0.16 + 0.10 * k : 0.10 + 0.08 * k)
      }

      for (const [key, node] of predLineRefs.current.entries()) {
        const phase = (dt * 3.0 + (key.length % 9) * 0.21) % (Math.PI * 2)
        const k = (Math.sin(phase) + 1) / 2
        node.opacity(0.86 + 0.12 * k)
        node.shadowOpacity(0.55 + 0.25 * k)
        node.shadowBlur(14 + 10 * k)
      }

      if (selectedAgentId) {
        const c = agentCircleRefs.current.get(selectedAgentId)
        const trail = trailLineRef.current
        if (c && trail) {
          const pos = c.position()
          const pts = trailPointsRef.current

          pts.push(pos.x, pos.y)
          const maxPairs = 40
          if (pts.length > maxPairs * 2) pts.splice(0, pts.length - maxPairs * 2)
          trail.points(pts)

          const fadePhase = (dt * 0.8) % (Math.PI * 2)
          const k = (Math.sin(fadePhase) + 1) / 2
          trail.opacity(0.20 + 0.08 * k)
        }
      }

      if (particlesRef.current.length > 0) {
        const arr = particlesRef.current
        const next: Particle[] = []
        for (const p of arr) {
          const life = p.life + 1 / 60
          if (life >= p.ttl) continue
          const drag = 0.92
          const nx = p.x + p.vx * (1 / 60)
          const ny = p.y + p.vy * (1 / 60)
          next.push({
            ...p,
            x: nx,
            y: ny,
            vx: p.vx * drag,
            vy: p.vy * drag,
            life,
          })
        }
        particlesRef.current = next
        if (particles.length !== next.length) setParticles(next)
      }
    }, stage)

    anim.start()
    return () => {
      anim.stop()
    }
  }, [hoveredAgentId, pastLines, selectedAgentId])

  useEffect(() => {
    const layer = stageRef.current?.findOne('Layer') as Konva.Layer | undefined
    void layer

    for (const l of pastLines) {
      const node = pastLineRefs.current.get(l.agentId)
      if (!node) continue

      const len = polylineLength(l.points)
      node.dash([len, len])
      node.dashOffset(len)

      const tween = new Konva.Tween({
        node,
        duration: 0.9,
        dashOffset: 0,
        easing: Konva.Easings.EaseInOut,
      })
      tween.play()
    }
  }, [pastLines])

  useEffect(() => {
    predPointsRef.current.clear()
    for (const p of predLines) predPointsRef.current.set(p.key, p.points)

    const stage = stageRef.current
    if (!stage || predLines.length === 0) {
      for (const p of predLines) {
        const node = predLineRefs.current.get(p.key)
        if (!node) continue
        node.points(p.points)
      }
      return
    }

    const visibleRef = new Map<string, number[]>()

    for (const p of predLines) {
      const node = predLineRefs.current.get(p.key)
      if (!node) continue

      const full = predPointsRef.current.get(p.key) ?? []
      const initial = full.length >= 4 ? full.slice(0, 4) : full
      node.points(initial)
      visibleRef.set(p.key, initial.slice())
    }

    const start = performance.now()
    const durationMs = 900

    const anim = new Konva.Animation(() => {
      const now = performance.now()
      const raw = Math.min(1, (now - start) / durationMs)
      const t = cubicInOut(raw)

      for (const p of predLines) {
        const full = predPointsRef.current.get(p.key) ?? []
        const node = predLineRefs.current.get(p.key)
        if (!node || full.length < 4) continue

        const maxPairs = Math.floor(full.length / 2)
        const targetPairs = Math.floor(maxPairs * t)

        const visible = visibleRef.get(p.key)
        if (!visible) continue

        const currentPairs = Math.floor(visible.length / 2)
        if (targetPairs > currentPairs) {
          const next = full.slice(0, targetPairs * 2)
          visible.splice(0, visible.length, ...next)
          node.points(visible)
        }
      }

      if (raw >= 1) {
        for (const p of predLines) {
          const full = predPointsRef.current.get(p.key) ?? []
          const node = predLineRefs.current.get(p.key)
          if (!node || full.length < 4) continue
          node.points(full)
        }
        anim.stop()
      }
    }, stage)

    anim.start()
    return () => {
      anim.stop()
    }
  }, [predLines])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !selectedAgentId) return

    const agent = agents.find((a) => a.agentId === selectedAgentId)
    if (!agent || agent.history.length < 2) return

    const circle = agentCircleRefs.current.get(selectedAgentId)
    if (!circle) return

    trailPointsRef.current = []

    const pts = agent.history.map((p) => toCanvas(p))
    const start = performance.now()
    const durationMs = 1800

    const anim = new Konva.Animation(() => {
      const now = performance.now()
      const raw = ((now - start) % durationMs) / durationMs
      const t = cubicInOut(raw)

      const total = pts.length - 1
      const f = t * total
      const i = Math.min(total - 1, Math.max(0, Math.floor(f)))
      const u = f - i

      const p0 = pts[i]
      const p1 = pts[i + 1]
      const x = p0[0] + (p1[0] - p0[0]) * u
      const y = p0[1] + (p1[1] - p0[1]) * u
      circle.position({ x, y })
    }, stage)

    anim.start()
    return () => {
      anim.stop()
    }
  }, [agents, selectedAgentId, toCanvas])

  return (
    <div className="h-full w-full overflow-hidden rounded-md bg-muted">
      <Stage width={width} height={height} ref={(r) => (stageRef.current = r)}>
        <Layer>
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: width, y: height }}
            fillLinearGradientColorStops={[0, 'rgba(12,18,32,0.95)', 1, 'rgba(6,10,22,0.95)']}
            listening={false}
          />

          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fillRadialGradientStartPoint={{ x: width / 2, y: height / 2 }}
            fillRadialGradientEndPoint={{ x: width / 2, y: height / 2 }}
            fillRadialGradientStartRadius={0}
            fillRadialGradientEndRadius={Math.max(width, height) * 0.55}
            fillRadialGradientColorStops={[0, 'rgba(0,229,255,0.10)', 1, 'rgba(0,229,255,0.0)']}
            listening={false}
          />

          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fillRadialGradientStartPoint={{ x: width / 2, y: height / 2 }}
            fillRadialGradientEndPoint={{ x: width / 2, y: height / 2 }}
            fillRadialGradientStartRadius={Math.min(width, height) * 0.15}
            fillRadialGradientEndRadius={Math.max(width, height) * 0.75}
            fillRadialGradientColorStops={[0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.55)']}
            listening={false}
          />

          {showGrid
            ? grid.map((pts, idx) => (
                <Line
                  key={idx}
                  points={pts}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={1}
                  dash={[8, 14]}
                  listening={false}
                  ref={(node) => {
                    if (node) gridLineRefs.current.set(idx, node)
                  }}
                />
              ))
            : null}
        </Layer>
        <Layer>
          <Line
            points={[]}
            listening={false}
            stroke={GLOW_CYAN}
            strokeWidth={3}
            lineCap="round"
            lineJoin="round"
            tension={0.45}
            shadowColor={GLOW_CYAN}
            shadowBlur={18}
            shadowOpacity={0.55}
            opacity={0.22}
            ref={(node) => {
              if (node) trailLineRef.current = node
            }}
          />

          {pastLines.map((l) => {
            const isSelected = selectedAgentId === l.agentId
            const isHovered = hoveredAgentId === l.agentId
            const isFocused = selectedAgentId != null

            const dim = isFocused ? (isSelected ? 1 : 0.08) : 1
            const radius = isSelected ? 8 : isHovered ? 6 : 4.5

            return (
              <>
                <Line
                  key={`glow-${l.agentId}`}
                  points={l.points}
                  stroke={GLOW_CYAN}
                  strokeWidth={16}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  opacity={0.22 * dim}
                  shadowColor={GLOW_CYAN}
                  shadowBlur={46}
                  shadowOpacity={0.85}
                  listening={false}
                />

                {l.segments.map((s) => (
                  <Line
                    key={`${l.agentId}-${s.key}`}
                    points={s.points}
                    stroke={GLOW_CYAN}
                    strokeWidth={6}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    opacity={0.9 * s.opacity * dim}
                    shadowColor={GLOW_CYAN}
                    shadowBlur={18}
                    shadowOpacity={0.65 * s.opacity}
                    strokeLinearGradientStartPoint={{ x: 0, y: 0 }}
                    strokeLinearGradientEndPoint={{ x: width, y: height }}
                    strokeLinearGradientColorStops={[0, 'rgba(0,229,255,0.95)', 0.7, 'rgba(0,229,255,0.55)', 1, 'rgba(0,229,255,0.08)']}
                    ref={(node) => {
                      if (node) pastLineRefs.current.set(l.agentId, node)
                    }}
                    onMouseEnter={() => {
                      onHoverAgentId?.(l.agentId)
                    }}
                    onMouseLeave={() => {
                      onHoverAgentId?.(null)
                    }}
                    onClick={() => onSelectAgentId?.(l.agentId)}
                    onMouseMove={() => {
                      const stage = stageRef.current
                      const pos = stage?.getPointerPosition()
                      if (!pos) return
                      const hist = agents.find((a) => a.agentId === l.agentId)?.history
                      const last = hist && hist.length > 0 ? hist[hist.length - 1] : null
                      if (!last) return
                      scheduleTooltip({
                        visible: true,
                        x: pos.x,
                        y: pos.y,
                        text: `Agent ${l.agentId} • x=${last[0].toFixed(1)} y=${last[1].toFixed(1)}`,
                      })
                    }}
                  />
                ))}
                <Circle
                  key={`pulse-${l.agentId}`}
                  x={l.last[0]}
                  y={l.last[1]}
                  radius={14}
                  fill="rgba(0,229,255,0.12)"
                  shadowColor={GLOW_CYAN}
                  shadowBlur={22}
                  shadowOpacity={0.65}
                  listening={false}
                  ref={(node) => {
                    if (node) agentPulseRefs.current.set(l.agentId, node)
                  }}
                />
                <Circle
                  key={`agent-${l.agentId}`}
                  x={l.last[0]}
                  y={l.last[1]}
                  radius={7}
                  fill={GLOW_CYAN}
                  opacity={1}
                  shadowColor={GLOW_CYAN}
                  shadowBlur={42}
                  shadowOpacity={0.95}
                  ref={(node) => {
                    if (node) agentCircleRefs.current.set(l.agentId, node)
                  }}
                  onMouseEnter={() => {
                    onHoverAgentId?.(l.agentId)
                    const node = agentCircleRefs.current.get(l.agentId)
                    if (node) {
                      const tween = new Konva.Tween({
                        node,
                        duration: 0.12,
                        scaleX: 1.35,
                        scaleY: 1.35,
                        easing: Konva.Easings.EaseOut,
                      })
                      tween.play()
                    }
                  }}
                  onMouseLeave={() => {
                    onHoverAgentId?.(null)
                    scheduleTooltip({ visible: false, x: tooltip.x, y: tooltip.y, text: tooltip.text })
                    const node = agentCircleRefs.current.get(l.agentId)
                    if (node) {
                      const tween = new Konva.Tween({
                        node,
                        duration: 0.12,
                        scaleX: 1,
                        scaleY: 1,
                        easing: Konva.Easings.EaseOut,
                      })
                      tween.play()
                    }
                  }}
                  onClick={() => onSelectAgentId?.(l.agentId)}
                  onMouseMove={() => {
                    const stage = stageRef.current
                    const pos = stage?.getPointerPosition()
                    if (!pos) return
                    const hist = agents.find((a) => a.agentId === l.agentId)?.history
                    const last = hist && hist.length > 0 ? hist[hist.length - 1] : null
                    if (!last) return
                    scheduleTooltip({
                      visible: true,
                      x: pos.x + 12,
                      y: pos.y + 12,
                      text: `(${last[0].toFixed(2)}, ${last[1].toFixed(2)})`,
                    })
                  }}
                />
                <Circle
                  key={`core-${l.agentId}`}
                  x={l.last[0]}
                  y={l.last[1]}
                  radius={3.4}
                  fill="#e6fcff"
                  opacity={0.92}
                  shadowColor="#e6fcff"
                  shadowBlur={10}
                  shadowOpacity={0.65}
                  listening={false}
                />
              </>
            )
          })}

          {predLines.map((p) => {
            const isBest = bestPredKey != null && p.key === bestPredKey
            const stroke = isBest ? GLOW_CYAN : GLOW_PRED
            const strokeWidth = isBest ? 4 : 2
            const dash = isBest ? undefined : ([8, 6] as number[])
            const opacity = isBest ? 1 : 0.6
            const shadowBlur = isBest ? 40 : 24
            const shadowOpacity = isBest ? 0.95 : 0.85

            return (
              <Line
                key={p.key}
                points={p.points}
                stroke={stroke}
                strokeWidth={strokeWidth}
                dash={dash}
                tension={0.35}
                lineCap="round"
                lineJoin="round"
                opacity={opacity}
                shadowColor={stroke}
                shadowBlur={shadowBlur}
                shadowOpacity={shadowOpacity}
                listening={false}
                ref={(node) => {
                  if (node) predLineRefs.current.set(p.key, node)
                }}
              />
            )
          })}

          {particles.map((p) => {
            const t = Math.min(1, p.life / p.ttl)
            const a = (1 - t) * 0.35
            return (
              <Circle
                key={p.id}
                x={p.x}
                y={p.y}
                radius={2.2 + 1.8 * (1 - t)}
                fill={GLOW_PRED}
                opacity={a}
                shadowColor={GLOW_PRED}
                shadowBlur={12}
                shadowOpacity={0.5}
                listening={false}
              />
            )
          })}

          {tooltip.visible ? (
            <Label x={tooltip.x} y={tooltip.y} listening={false}>
              <Tag
                fill="rgba(255,255,255,0.06)"
                stroke="rgba(255,255,255,0.14)"
                strokeWidth={1}
                cornerRadius={10}
                shadowColor={GLOW_CYAN}
                shadowBlur={18}
                shadowOpacity={0.18}
              />
              <Text text={tooltip.text} fill="rgba(255,255,255,0.92)" fontSize={12} padding={8} />
            </Label>
          ) : null}
        </Layer>
      </Stage>
    </div>
  )
}
