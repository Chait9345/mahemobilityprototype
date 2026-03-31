import { Activity } from 'lucide-react'

export type BottomPanelProps = {
  status?: string
  metrics?: Record<string, unknown>
}

export function BottomPanel({ status = 'Ready', metrics }: BottomPanelProps) {
  return (
    <div className="h-full border-t border-border bg-card p-3">
      <div className="h-full rounded-lg border border-border bg-background p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4" />
            Bottom Panel
          </div>
          <div className="text-xs text-muted-foreground">{status}</div>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">{metrics ? JSON.stringify(metrics) : 'Events, metrics, model info, and logs.'}</div>
      </div>
    </div>
  )
}
