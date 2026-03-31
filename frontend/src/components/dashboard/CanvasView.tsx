import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'

import { TrajectoryCanvas } from '../../canvas/TrajectoryCanvas'
import type { PredictResponse } from '../../services/api'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

export type CanvasViewProps = {
  agents: { agentId: string; history: number[][] }[]
  predictedPaths?: number[][][]
  predictions?: PredictResponse | null
  selectedAgentId?: string | null
  hoveredAgentId?: string | null
  onHoverAgentId?: (agentId: string | null) => void
  onSelectAgentId?: (agentId: string) => void
  showGrid: boolean
}

export function CanvasView({
  agents,
  predictedPaths = [],
  predictions = null,
  selectedAgentId = null,
  hoveredAgentId = null,
  onHoverAgentId,
  onSelectAgentId,
  showGrid,
}: CanvasViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [canvasWidth, setCanvasWidth] = useState(900)
  const canvasHeight = 560

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      if (!Number.isFinite(w) || w <= 0) return
      setCanvasWidth(Math.max(320, Math.min(900, Math.floor(w))))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const paddedCanvasWidth = useMemo(() => Math.max(320, canvasWidth - 40), [canvasWidth])

  return (
    <main className="min-h-0 p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{ willChange: 'transform, opacity' }}
        className="h-full"
      >
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="tracking-tight">Canvas</CardTitle>
              <div className="text-[11px] text-muted-foreground">Hover to inspect • Click to select</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex w-full items-center justify-center">
              <div
                ref={containerRef}
                className="w-full max-w-[900px] overflow-hidden rounded-[16px] p-5"
              >
                <div className="flex w-full items-center justify-center">
                  <TrajectoryCanvas
                    width={paddedCanvasWidth}
                    height={canvasHeight}
                    agents={agents}
                    predictedPaths={predictedPaths}
                    predictions={predictions}
                    selectedAgentId={selectedAgentId}
                    hoveredAgentId={hoveredAgentId}
                    onHoverAgentId={onHoverAgentId}
                    onSelectAgentId={onSelectAgentId}
                    showGrid={showGrid}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  )
}
