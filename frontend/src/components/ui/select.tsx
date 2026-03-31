import * as React from 'react'
import { createPortal } from 'react-dom'

import { cn } from '../../lib/utils'

export type SelectOption = { label: string; value: string }

type SelectContextValue = {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement>
  contentRef: React.RefObject<HTMLDivElement>
  placeholder?: string
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const ctx = React.useContext(SelectContext)
  if (!ctx) throw new Error('Select components must be used within <Select>')
  return ctx
}

export type SelectProps = {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  children: React.ReactNode
}

export function Select({ value, onValueChange, placeholder, children }: SelectProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null!)
  const contentRef = React.useRef<HTMLDivElement>(null!)

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null
      const trigger = triggerRef.current
      const content = contentRef.current
      if (trigger && t && trigger.contains(t)) return
      if (content && t && content.contains(t)) return
      setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  const ctx: SelectContextValue = React.useMemo(
    () => ({ value, onValueChange, open, setOpen, triggerRef, contentRef, placeholder }),
    [onValueChange, open, placeholder, value],
  )

  return <SelectContext.Provider value={ctx}>{children}</SelectContext.Provider>
}

export type SelectTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>

export function SelectTrigger({ className, ...props }: SelectTriggerProps) {
  const { open, setOpen, triggerRef } = useSelectContext()
  return (
    <button
      type="button"
      ref={triggerRef}
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={cn(
        'flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-foreground outline-none backdrop-blur-2xl shadow-[0_0_40px_rgba(0,229,255,0.08)] transition-all duration-150 ease-out hover:border-white/20 hover:shadow-[0_0_60px_rgba(0,229,255,0.14)] focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-0',
        className,
      )}
      {...props}
    />
  )
}

export type SelectValueProps = {
  className?: string
}

export function SelectValue({ className }: SelectValueProps) {
  const { value, placeholder } = useSelectContext()
  return (
    <span className={cn('truncate text-foreground', !value ? 'text-white/55' : '', className)}>
      {value || placeholder || 'Select'}
    </span>
  )
}

function useTriggerRect(open: boolean) {
  const { triggerRef } = useSelectContext()
  const [rect, setRect] = React.useState<DOMRect | null>(null)

  React.useEffect(() => {
    if (!open) return
    const el = triggerRef.current
    if (!el) return
    const update = () => setRect(el.getBoundingClientRect())
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, triggerRef])

  return rect
}

export type SelectContentProps = {
  className?: string
  children: React.ReactNode
}

export function SelectContent({ className, children }: SelectContentProps) {
  const { open, contentRef } = useSelectContext()
  const rect = useTriggerRect(open)
  if (!open || !rect) return null

  return createPortal(
    <div
      role="listbox"
      ref={contentRef}
      className={cn(
        'fixed z-[9999] mt-2 max-h-[260px] overflow-auto rounded-2xl border border-white/12 bg-white/7 p-1 text-sm text-white/90 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,229,255,0.14)]',
        className,
      )}
      style={{
        left: Math.max(12, rect.left),
        top: rect.bottom + 8,
        width: rect.width,
      }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/12 to-transparent opacity-70" />
      <div className="relative">{children}</div>
    </div>,
    document.body,
  )
}

export type SelectItemProps = {
  value: string
  children: React.ReactNode
  className?: string
}

export function SelectItem({ value, children, className }: SelectItemProps) {
  const { value: current, onValueChange, setOpen } = useSelectContext()
  const selected = current === value
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => {
        onValueChange(value)
        setOpen(false)
      }}
      className={cn(
        'flex w-full select-none items-center justify-between rounded-xl px-3 py-2 text-left transition-colors duration-150',
        selected ? 'bg-white/10 text-white' : 'text-white/85 hover:bg-white/8 hover:text-white',
        className,
      )}
    >
      <span className="truncate">{children}</span>
      {selected ? <span className="text-[12px] text-white/70">✓</span> : null}
    </button>
  )
}

