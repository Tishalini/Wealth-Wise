import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { useFinance } from '../store/FinanceContext'
import { budgetStatus, categoryBreakdown, currentMonthKey, lastMonthKeys } from '../lib/analytics'
import { EXPENSE_CATEGORIES } from '../data/mock'
import { money, monthLabel } from '../lib/format'
import { Card, CardHeader, Legend, Modal, PageHeader, Progress, StatTile, StatusPill } from '../components/ui'
import { C, CATEGORY_COLOR, ChartTooltip, OTHER, axisProps } from '../components/charts'
import type { Budget } from '../data/types'

export default function Budgets() {
  const { transactions, budgets, upsertBudget, deleteBudget, notify } = useFinance()
  const [month, setMonth] = useState(currentMonthKey())
  const [editing, setEditing] = useState<Partial<Budget> | null>(null)
  const isCurrent = month === currentMonthKey()

  const rows = useMemo(() => budgetStatus(transactions, budgets, month), [transactions, budgets, month])
  const totals = rows.reduce((a, r) => ({ limit: a.limit + r.limit, spent: a.spent + r.spent }), { limit: 0, spent: 0 })
  const unbudgeted = useMemo(() => {
    const set = new Set(budgets.map((b) => b.category))
    return categoryBreakdown(transactions, month).filter((c) => !set.has(c.category))
  }, [transactions, budgets, month])

  const now = new Date()
  const daysLeft = isCurrent ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() : 0
  const safeDaily = isCurrent && daysLeft > 0 ? Math.max(0, totals.limit - totals.spent) / daysLeft : 0
  const chartData = rows.map((r) => ({ category: r.category, Budget: r.limit, Spent: r.spent, color: CATEGORY_COLOR[r.category] ?? OTHER }))

  return (
    <>
      <PageHeader
        title="Budgets"
        subtitle="Monthly spending limits with pace-based alerts"
        actions={
          <>
            <select className="input !w-auto" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
              {lastMonthKeys(12).reverse().map((m) => <option key={m} value={m}>{monthLabel(m, true)}</option>)}
            </select>
            <button className="btn-primary" onClick={() => setEditing({ category: EXPENSE_CATEGORIES.find((c) => !budgets.some((b) => b.category === c)) ?? 'Travel', limit: 5000 })}><Plus size={16} /> New budget</button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total budget" value={money(totals.limit)} icon={<Wallet size={16} />} hint={<span className="text-xs text-fg-muted">{rows.length} categories</span>} />
        <StatTile label="Spent" value={money(totals.spent)} accent={C.expense} hint={<span className="text-xs text-fg-muted">{((totals.spent / totals.limit) * 100).toFixed(0)}% of total budget</span>} />
        <StatTile label="Remaining" value={money(totals.limit - totals.spent)} accent={C.income} hint={<StatusPill level={totals.spent > totals.limit ? 'bad' : totals.spent > totals.limit * 0.85 ? 'warn' : 'good'} />} />
        <StatTile label={isCurrent ? 'Safe to spend / day' : 'Month closed'} value={isCurrent ? money(safeDaily) : '—'} icon={<CalendarDays size={16} />} hint={<span className="text-xs text-fg-muted">{isCurrent ? `${daysLeft} days left this month` : monthLabel(month, true)}</span>} />
      </div>

      <Card className="mt-4">
        <CardHeader title="Budget vs. actual" subtitle={monthLabel(month, true)} action={<Legend items={[{ label: 'Budget', color: '#3a4866' }, { label: 'Spent', color: C.s1 }]} />} />
        <div className="h-72 px-2 pt-4 pb-4">
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid stroke={C.grid} strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="category" {...axisProps} interval={0} tick={{ fill: C.axis, fontSize: 10 }} />
              <YAxis {...axisProps} width={56} tickFormatter={(v) => money(v, { compact: true })} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ffffff08' }} />
              <Bar dataKey="Budget" fill="#3a4866" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Spent" fill={C.s1} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((b) => (
          <Card key={b.id} className="group p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="size-2.5 rounded-[3px]" style={{ background: CATEGORY_COLOR[b.category] ?? OTHER }} />
                <span className="font-semibold">{b.category}</span>
              </div>
              <div className="flex gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                <button className="cursor-pointer rounded-lg p-1.5 text-fg-muted hover:bg-ink-600 hover:text-fg" onClick={() => setEditing(b)} aria-label={`Edit ${b.category} budget`}><Pencil size={14} /></button>
                <button className="cursor-pointer rounded-lg p-1.5 text-fg-muted hover:bg-bad/15 hover:text-bad" onClick={() => { deleteBudget(b.id); notify(`${b.category} budget removed`, 'danger') }} aria-label={`Delete ${b.category} budget`}><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="num text-2xl font-semibold">{money(b.spent)}</div>
                <div className="num text-xs text-fg-muted">of {money(b.limit)}</div>
              </div>
              <StatusPill level={b.status} label={b.status === 'bad' ? 'Over budget' : b.status === 'warn' ? 'Watch pace' : 'On track'} />
            </div>
            <div className="mt-4"><Progress value={b.used} tone={b.status} /></div>
            <div className="mt-2 flex justify-between text-xs text-fg-subtle">
              <span>{b.remaining >= 0 ? `${money(b.remaining)} left` : `${money(-b.remaining)} over`}</span>
              {isCurrent && <span>Projected {money(b.projected, { compact: true })}</span>}
            </div>
          </Card>
        ))}
      </div>

      {unbudgeted.length > 0 && (
        <Card className="mt-4">
          <CardHeader title="Unbudgeted spending" subtitle="Categories with spend but no limit set" />
          <div className="flex flex-wrap gap-2 px-5 pt-3 pb-5">
            {unbudgeted.map((u) => (
              <button key={u.category} className="btn-ghost !py-1.5 text-xs" onClick={() => setEditing({ category: u.category, limit: Math.ceil((u.amount * 1.1) / 500) * 500 })}>
                {u.category} · <span className="num">{money(u.amount)}</span> <Plus size={12} />
              </button>
            ))}
          </div>
        </Card>
      )}

      {editing && (
        <BudgetForm
          initial={editing}
          taken={budgets.filter((b) => b.id !== editing.id).map((b) => b.category)}
          onClose={() => setEditing(null)}
          onSave={(b) => { upsertBudget(b); notify(b.id ? 'Budget updated' : 'Budget created'); setEditing(null) }}
        />
      )}
    </>
  )
}

function BudgetForm({ initial, taken, onClose, onSave }: { initial: Partial<Budget>; taken: string[]; onClose: () => void; onSave: (b: Omit<Budget, 'id'> & { id?: string }) => void }) {
  const [category, setCategory] = useState(initial.category ?? 'Travel')
  const [limit, setLimit] = useState(initial.limit ?? 5000)
  const options = EXPENSE_CATEGORIES.filter((c) => !taken.includes(c))
  return (
    <Modal
      open
      onClose={onClose}
      title={initial.id ? `Edit ${initial.category} budget` : 'New budget'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!(limit > 0)} onClick={() => onSave({ id: initial.id, category, limit })}>Save budget</button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="b-cat">Category</label>
          <select id="b-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)} disabled={!!initial.id}>
            {(initial.id ? [category] : options).map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="b-lim">Monthly limit (₹)</label>
          <input id="b-lim" type="number" min={0} step={500} className="input num" value={limit || ''} onChange={(e) => setLimit(Number(e.target.value))} />
          <input type="range" min={1000} max={60000} step={500} value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="mt-3 w-full" aria-label="Limit slider" />
        </div>
      </div>
    </Modal>
  )
}
