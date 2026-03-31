import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] hover:scale-[1.02] hover:-translate-y-px',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_10px_30px_rgba(0,0,0,0.35)] hover:bg-primary/90 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.14),0_14px_40px_rgba(0,0,0,0.45),0_0_40px_rgba(var(--glow-cyan),0.22)]',
        secondary:
          'bg-white/5 text-foreground border border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] hover:bg-white/8 hover:border-white/15',
        outline:
          'border border-white/10 bg-white/0 text-foreground hover:bg-white/6 hover:border-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'
