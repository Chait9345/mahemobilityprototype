import { motion } from 'framer-motion'

import { cn } from '../../lib/utils'

export type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}

export function Switch({ checked, onCheckedChange, className }: SwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-10 items-center rounded-full border border-white/10 bg-white/5 p-0.5 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.03)] transition-all duration-150 ease-out',
        checked ? 'shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_25px_rgba(var(--glow-cyan),0.18)]' : '',
        className,
      )}
      aria-pressed={checked}
    >
      <motion.div
        className={cn('h-5 w-5 rounded-full shadow-[0_6px_18px_rgba(0,0,0,0.35)]', checked ? 'bg-primary' : 'bg-white/20')}
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{ x: checked ? 16 : 0 }}
      />
    </button>
  )
}
