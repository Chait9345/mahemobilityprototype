import { motion } from 'framer-motion'
import { Wifi } from 'lucide-react'

import { Card } from '../ui/card'

export type HeaderProps = {
  sceneId?: string
}

export function Header({ sceneId }: HeaderProps) {
  return (
    <header className="h-16 border-b border-white/10 bg-gradient-to-b from-white/8 to-white/2 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-5">
        <div className="flex items-center gap-4">
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Trajectory Intelligence System</div>
            <div className="text-[11px] text-muted-foreground">Intent-aware multi-modal prediction</div>
          </div>

          <Card className="flex items-center gap-2 px-3 py-1.5">
            <motion.span
              className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.65)]"
              animate={{ opacity: [0.35, 1, 0.35], scale: [1, 1.25, 1] }}
              transition={{ duration: 1.15, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-emerald-300"
              animate={{
                boxShadow: [
                  '0 0 0 rgba(52,211,153,0.0)',
                  '0 0 28px rgba(52,211,153,0.18)',
                  '0 0 0 rgba(52,211,153,0.0)',
                ],
              }}
              transition={{ duration: 2.8, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
              style={{ willChange: 'box-shadow' }}
            >
              <Wifi className="h-3.5 w-3.5" />
              LIVE
            </motion.div>
          </Card>
        </div>

        <div className="text-[11px] text-muted-foreground">
          Scene:
          <span className="ml-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 font-medium text-foreground">
            {sceneId || '—'}
          </span>
        </div>
      </div>
    </header>
  )
}
