import * as React from 'react'

import { cn } from '../../lib/utils'

export type CardProps = React.HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,229,255,0.08)] transition-all duration-200 ease-out hover:border-white/20 hover:shadow-[0_0_60px_rgba(0,229,255,0.14)]',
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-70" />
      <div className="relative">{props.children}</div>
    </div>
  )
}

export function CardHeader({ className, ...props }: CardProps) {
  return <div className={cn('flex flex-col gap-1 p-4', className)} {...props} />
}

export function CardTitle({ className, ...props }: CardProps) {
  return <div className={cn('text-sm font-semibold', className)} {...props} />
}

export function CardDescription({ className, ...props }: CardProps) {
  return <div className={cn('text-xs text-muted-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={cn('p-4 pt-0', className)} {...props} />
}
