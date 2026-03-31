import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { BarChart3, RotateCcw, Sparkles } from 'lucide-react'
import { useEffect } from 'react'

import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

export type BottomPanelProps = {
  onPredict?: () => void
  onReset?: () => void
  onRandomScene?: () => void
  onToggleViewMode?: () => void
  onToggleRenderMode?: () => void
  canPredict?: boolean
  metrics?: Record<string, unknown>
  ade?: string | null
  fde?: string | null
  viewMode?: 'focus' | 'social'
  renderMode?: 'graph' | 'scene'
  predictions?: {
    modes: {
      confidence?: number
      collision?: boolean
    }[]
  } | null
}

function AnimatedNumber({ value, decimals = 3, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const mv = useMotionValue(value)
  const rounded = useTransform(mv, (v) => `${v.toFixed(decimals)}${suffix}`)

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
    })
    return () => controls.stop()
  }, [mv, value])

  return <motion.span>{rounded}</motion.span>
}

function MetricCard({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{ willChange: 'transform, opacity' }}
      whileHover={{ y: -2 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-lg font-semibold tabular-nums">{value}</div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function BottomPanel({ onPredict, onReset, onRandomScene, onToggleViewMode, onToggleRenderMode, canPredict = true, metrics, ade, fde, viewMode = 'focus', renderMode = 'graph', predictions }: BottomPanelProps) {
  const uptime = typeof metrics?.uptime_seconds === 'number' ? (metrics.uptime_seconds as number) : null

  const reqCounts = metrics?.request_counts
  const totalRequests = (() => {
    if (!reqCounts || typeof reqCounts !== 'object') return null
    let sum = 0
    for (const v of Object.values(reqCounts as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v)) sum += v
    }
    return sum
  })()

  return (
    <div className="h-full border-t border-white/10 bg-gradient-to-b from-white/4 to-white/2 p-4 backdrop-blur-xl">
      <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          style={{ willChange: 'transform, opacity' }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="tracking-tight">Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={onPredict} disabled={!canPredict}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Predict
                  </Button>
                  <Button variant="outline" onClick={onReset}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                  <Button variant="secondary" onClick={onRandomScene}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Random Scene
                  </Button>
                  <Button variant="outline" onClick={onToggleViewMode}>
                    {viewMode === 'focus' ? '🌐 Show Social Context' : '👁 Show Prediction Focus'}
                  </Button>
                  <Button variant="outline" onClick={onToggleRenderMode}>
                    {renderMode === 'graph' ? '🚗 Scene View' : '📊 Graph View'}
                  </Button>
                </div>
                {(ade || fde) && (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-6 text-sm font-semibold">
                      <div className="text-cyan-400 drop-shadow-[0_0_8px_#00E5FF]">
                        ADE: {ade ?? '—'}
                      </div>
                      <div className="text-red-400 drop-shadow-[0_0_8px_#FF4444]">
                        FDE: {fde ?? '—'}
                      </div>
                    </div>
                    {predictions?.modes && predictions.modes.some((m) => m.confidence !== undefined) && (
                      <div className="flex flex-col gap-2 text-xs">
                        <div className="text-muted-foreground font-semibold uppercase tracking-wider">Mode Confidence</div>
                        <div className="flex gap-4">
                          {predictions.modes.map((mode, idx) => {
                            const conf = mode.confidence ?? 0
                            const hasCollision = mode.collision ?? false
                            const bestIdx = predictions.modes.reduce((best, m, i) => 
                              (m.confidence ?? 0) > (predictions.modes[best].confidence ?? 0) ? i : best
                            , 0)
                            const isBest = idx === bestIdx
                            
                            // Match trajectory colors: mode1=green, mode2=orange, mode3=purple, collision=red
                            const getModeColor = () => {
                              if (hasCollision) return '#FF0000'
                              const colors = ['#00FF88', '#FF8800', '#A855F7']
                              return colors[idx % colors.length]
                            }
                            const color = getModeColor()
                            
                            return (
                              <div
                                key={idx}
                                className={`flex items-center gap-1.5 ${
                                  isBest ? 'font-bold' : 'font-semibold'
                                }`}
                                style={{
                                  color: color,
                                  textShadow: isBest ? `0 0 8px ${color}` : 'none',
                                }}
                              >
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{
                                    backgroundColor: color,
                                    boxShadow: hasCollision ? `0 0 8px ${color}` : isBest ? `0 0 6px ${color}` : 'none',
                                  }}
                                ></div>
                                <span>
                                  Mode {idx + 1}: {(conf * 100).toFixed(1)}%{hasCollision ? ' ⚠️' : isBest ? ' ⭐' : ''}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                        {predictions.modes.some((m) => m.collision) && (
                          <div className="text-red-500 font-bold text-xs mt-1 animate-pulse">
                            ⚠️ Collision risk detected in {predictions.modes.filter((m) => m.collision).length} mode(s)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-2">
          <MetricCard
            title="Requests"
            value={totalRequests == null ? '—' : <AnimatedNumber value={totalRequests} decimals={0} />}
          />
          <MetricCard
            title="Uptime"
            value={uptime == null ? '—' : <AnimatedNumber value={uptime} decimals={0} suffix="s" />}
          />
        </div>
      </div>
    </div>
  )
}
