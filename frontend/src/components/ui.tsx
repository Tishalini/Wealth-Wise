import { useEffect, type ReactNode } from 'react'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, X, XCircle } from 'lucide-react'
import { cx } from '../lib/format'
import type { Level } from '../lib/analytics'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('card animate-fade-up', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div>
        <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Delta({ value, invert = false, suffix = 'vs last month' }: { value: number; invert?: boolean; suffix?: string }) {
  if (!Number.isFinite(value)) return null
  const up = value >= 0
  const good = invert ? !up : up
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={cx('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium', good ? 'bg-good/12 text-good' : 'bg-bad/12 text-bad')}>
        <Icon size={12} aria-hidden />
        {Math.abs(value * 100).toFixed(1)}%
      </span>
      <span className="text-fg-subtle">{suffix}</span>
    </span>
  )
}

export function StatTile({ label, value, icon, delta, invertDelta, hint, accent }: { label: string; value: string; icon?: ReactNode; delta?: number; invertDelta?: boolean; hint?: ReactNode; accent?: string }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent ?? '#10b981'}88, transparent)` }} />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-fg-muted uppercase">{label}</span>
        {icon && (
          <span className="grid size-8 place-items-center rounded-lg border border-ink-600 bg-ink-700/70 text-fg-muted" aria-hidden>
            {icon}
          </span>
        )}
      </div>
      <div className="num mt-3 text-[26px] font-semibold tracking-tight text-fg">{value}</div>
      <div className="mt-2 min-h-5">{delta !== undefined ? <Delta value={delta} invert={invertDelta} /> : hint}</div>
    </Card>
  )
}

export function Progress({ value, tone = 'brand', size = 'md' }: { value: number; tone?: 'brand' | Level; size?: 'sm' | 'md' }) {
  const color = { brand: 'bg-brand', good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad' }[tone]
  return (
    <div className={cx('w-full overflow-hidden rounded-full bg-ink-600/70', size === 'sm' ? 'h-1.5' : 'h-2')} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full rounded-full transition-[width] duration-700', color)} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  )
}

const LEVEL_META: Record<Level, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  good: { label: 'Healthy', cls: 'bg-good/12 text-good border-good/25', Icon: CheckCircle2 },
  warn: { label: 'Watch', cls: 'bg-warn/12 text-warn border-warn/25', Icon: AlertTriangle },
  bad: { label: 'At risk', cls: 'bg-bad/12 text-bad border-bad/25', Icon: XCircle },
}

export function StatusPill({ level, label }: { level: Level; label?: string }) {
  const m = LEVEL_META[level]
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium', m.cls)}>
      <m.Icon size={12} aria-hidden />
      {label ?? m.label}
    </span>
  )
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center rounded-md border border-ink-600 bg-ink-700/60 px-2 py-0.5 text-[11px] font-medium text-fg-muted', className)}>{children}</span>
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-950/75 backdrop-blur-sm" onClick={onClose} />
      <div className={cx('card animate-fade-up relative w-full max-h-[90vh] overflow-auto', wide ? 'max-w-2xl' : 'max-w-lg')}>
        <div className="flex items-center justify-between border-b border-ink-600/70 px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button className="rounded-lg p-1.5 text-fg-muted hover:bg-ink-700 hover:text-fg cursor-pointer" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-600/70 px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-xl border border-ink-600 bg-ink-850 p-0.5" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('cursor-pointer rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors', value === o.value ? 'bg-ink-600 text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, hint, action }: { icon: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="mb-1 grid size-12 place-items-center rounded-2xl border border-ink-600 bg-ink-700/60 text-fg-muted">{icon}</div>
      <p className="font-medium">{title}</p>
      {hint && <p className="max-w-sm text-sm text-fg-muted">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.dashed ? (
            <svg width="16" height="4" aria-hidden><line x1="0" y1="2" x2="16" y2="2" stroke={i.color} strokeWidth="2" strokeDasharray="4 3" /></svg>
          ) : (
            <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} aria-hidden />
          )}
          {i.label}
        </span>
      ))}
    </div>
  )
}
