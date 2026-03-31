import { Play, RefreshCcw } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '../ui/button'

export type HeaderProps = {
  title?: string
  subtitle?: string
  onRefresh?: () => void
}

export function Header({ title = 'Trajectory Studio', subtitle = 'nuScenes • LSTM • Multi-path', onRefresh }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-sm font-semibold tracking-wide"
        >
          {title}
        </motion.div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        <Button size="sm">
          <Play className="mr-2 h-4 w-4" />
          Run
        </Button>
      </div>
    </header>
  )
}
