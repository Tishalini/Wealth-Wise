import type { TooltipProps } from 'recharts'
import { money } from '../lib/format'

/** Chart tokens — dark categorical palette validated against the #111827 card surface. */
export const C = {
  s1: '#338ced', // blue
  s2: '#e76624', // orange
  s3: '#00a888', // aqua
  s4: '#d28e05', // yellow
  s5: '#e24d8b', // magenta
  s6: '#0aac23', // green
  s7: '#9887ef', // violet
  s8: '#eb6263', // red
  grid: '#222d44',
  axis: '#6b768c',
  surface: '#111827',
  income: '#00a888',
  expense: '#e76624',
  savings: '#338ced',
}

export const CATEGORICAL = [C.s1, C.s2, C.s3, C.s4, C.s5, C.s6, C.s7, C.s8]
export const OTHER = '#5b6680'

export const axisProps = {
  stroke: C.axis,
  tick: { fill: C.axis, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const

export function ChartTooltip({ active, payload, label, formatter }: TooltipProps<number, string> & { formatter?: (v: number) => string }) {
  if (!active || !payload?.length) return null
  const fmt = formatter ?? ((v: number) => money(v))
  return (
    <div className="min-w-40 rounded-xl border border-ink-500 bg-ink-850/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur">
      {label !== undefined && <div className="mb-1.5 font-medium text-fg">{label}</div>}
      <div className="space-y-1">
        {payload
          .filter((p) => p.value !== undefined && p.value !== null && !Array.isArray(p.value))
          .map((p) => (
            <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-fg-muted">
                <span className="size-2 rounded-full" style={{ background: (p.color as string) ?? p.payload?.fill }} />
                {p.name}
              </span>
              <span className="num font-medium text-fg">{fmt(Number(p.value))}</span>
            </div>
          ))}
      </div>
    </div>
  )
}

/** Colour follows the category (entity), never its rank. Unlisted categories fold into "Other". */
export const CATEGORY_COLOR: Record<string, string> = {
  Housing: C.s1,
  Groceries: C.s2,
  'Food & Dining': C.s3,
  Transportation: C.s4,
  Shopping: C.s5,
  Utilities: C.s6,
  'EMI & Loans': C.s7,
  Travel: C.s8,
}

export function foldCategories(rows: { category: string; amount: number }[]) {
  const out: { category: string; amount: number; color: string }[] = []
  let other = 0
  for (const r of rows) {
    if (CATEGORY_COLOR[r.category]) out.push({ ...r, color: CATEGORY_COLOR[r.category] })
    else other += r.amount
  }
  if (other > 0) out.push({ category: 'Other', amount: other, color: OTHER })
  return out
}
