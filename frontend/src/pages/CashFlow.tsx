import { useMemo, useState } from 'react'
import { Area, Bar, ComposedChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts'
import { CalendarClock, Plus, Receipt, TrendingUp, Trash2, Wallet } from 'lucide-react'
import { useFinance } from '../store/FinanceContext'
import { forecast, upcomingBills } from '../lib/analytics'
import { cx, money } from '../lib/format'
import { Badge, Card, CardHeader, Legend, PageHeader, Segmented, StatTile } from '../components/ui'
import { C, ChartTooltip, axisProps } from '../components/charts'

interface Planned { id: number; label: string; month: number; amount: number }

export default function CashFlow() {
  const { transactions, accounts } = useFinance()
  const [horizon, setHorizon] = useState<'3' | '6' | '12'>('6')
  const [planned, setPlanned] = useState<Planned[]>([{ id: 1, label: 'Diwali gifts & travel', month: 0, amount: 45000 }])
  const [draft, setDraft] = useState({ label: '', month: 1, amount: 20000 })

  const fc = useMemo(() => forecast(transactions, accounts, Number(horizon)), [transactions, accounts, horizon])

  const projection = useMemo(() => {
    let shift = 0
    return fc.projection.map((p, i) => {
      const extra = planned.filter((x) => x.month === i).reduce((a, x) => a + x.amount, 0)
      shift += extra
      return { ...p, expense: p.expense + extra, net: p.net - extra, band: [p.band[0] - extra, p.band[1] - extra] as [number, number], balance: p.balance - shift, planned: extra }
    })
  }, [fc, planned])

  const chart = [
    ...fc.history.map((h) => ({ label: h.label, actual: h.savings })),
    ...projection.map((p, i) => ({ label: p.label, projected: p.net, band: p.band, ...(i === 0 ? {} : {}) })),
  ]
  // connect the dashed projection line to the last actual point
  if (fc.history.length) (chart[fc.history.length - 1] as Record<string, unknown>).projected = fc.history[fc.history.length - 1].savings

  const total = projection.reduce((a, p) => a + p.net, 0)
  const worst = projection.reduce((m, p) => (p.net < m.net ? p : m), projection[0])
  const bills = useMemo(() => upcomingBills(transactions), [transactions])
  const billsTotal30 = bills.filter((b) => b.daysLeft <= 30).reduce((a, b) => a + b.amount, 0)

  return (
    <>
      <PageHeader
        title="Cash-flow forecast"
        subtitle="Trend-based projection from your last 6 months, with confidence range"
        actions={<Segmented value={horizon} onChange={setHorizon} options={[{ value: '3', label: '3 months' }, { value: '6', label: '6 months' }, { value: '12', label: '12 months' }]} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={`Projected savings · ${horizon}M`} value={money(total, { compact: true })} icon={<TrendingUp size={16} />} accent={C.s1} hint={<span className="text-xs text-fg-muted">{money(total / projection.length)} avg / month</span>} />
        <StatTile label="Ending cash balance" value={money(projection[projection.length - 1]?.balance ?? 0, { compact: true })} icon={<Wallet size={16} />} accent={C.income} hint={<span className="text-xs text-fg-muted">liquid accounts, after planned spend</span>} />
        <StatTile label="Tightest month" value={worst?.label ?? '—'} icon={<CalendarClock size={16} />} accent={C.s4} hint={<span className="num text-xs text-fg-muted">{money(worst?.net ?? 0)} net · low case {money(worst?.band[0] ?? 0, { compact: true })}</span>} />
        <StatTile label="Bills next 30 days" value={money(billsTotal30)} icon={<Receipt size={16} />} accent={C.expense} hint={<span className="text-xs text-fg-muted">{bills.filter((b) => b.daysLeft <= 30).length} recurring payments</span>} />
      </div>

      <Card className="mt-4">
        <CardHeader title="Monthly net cash flow" subtitle="Actuals vs. forecast with 80% confidence band" />
        <div className="px-5 pt-3"><Legend items={[{ label: 'Actual', color: C.s1 }, { label: 'Forecast', color: C.s7, dashed: true }, { label: 'Confidence range', color: '#9887ef44' }]} /></div>
        <div className="h-80 px-2 pt-2 pb-4">
          <ResponsiveContainer>
            <ComposedChart data={chart} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} width={56} tickFormatter={(v) => money(v, { compact: true })} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: C.axis, strokeDasharray: '3 3' }} />
              <ReferenceLine y={0} stroke="#3a4866" />
              <Area dataKey="band" name="Range" stroke="none" fill={C.s7} fillOpacity={0.14} isAnimationActive={false} />
              <Line type="monotone" dataKey="actual" name="Actual" stroke={C.s1} strokeWidth={2} dot={{ r: 4, fill: C.s1, stroke: C.surface, strokeWidth: 2 }} activeDot={{ r: 6, stroke: C.surface, strokeWidth: 2 }} />
              <Line type="monotone" dataKey="projected" name="Forecast" stroke={C.s7} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4, fill: C.s7, stroke: C.surface, strokeWidth: 2 }} activeDot={{ r: 6, stroke: C.surface, strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Projected balance & breakdown" subtitle="Liquid cash after forecast income, spending and planned events" />
          <div className="h-56 px-2 pt-4">
            <ResponsiveContainer>
              <ComposedChart data={projection} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={56} tickFormatter={(v) => money(v, { compact: true })} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="balance" name="Cash balance" radius={[4, 4, 0, 0]} maxBarSize={44}>
                  {projection.map((p) => <Cell key={p.key} fill={p.planned ? C.s4 : C.s3} />)}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="px-5 pb-2"><Legend items={[{ label: 'Cash balance', color: C.s3 }, { label: 'Month with planned expense', color: C.s4 }]} /></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="border-t border-ink-600/60 text-left text-xs text-fg-subtle">
                <th className="px-5 py-2.5 font-medium">Month</th><th className="px-3 py-2.5 text-right font-medium">Income</th><th className="px-3 py-2.5 text-right font-medium">Expenses</th><th className="px-3 py-2.5 text-right font-medium">Net</th><th className="px-5 py-2.5 text-right font-medium">Balance</th>
              </tr></thead>
              <tbody className="divide-y divide-ink-600/50">
                {projection.map((p) => (
                  <tr key={p.key} className="hover:bg-ink-700/30">
                    <td className="px-5 py-2.5 font-medium">{p.label} {p.planned > 0 && <Badge className="ml-1 !text-warn">+{money(p.planned, { compact: true })} planned</Badge>}</td>
                    <td className="num px-3 py-2.5 text-right text-fg-muted">{money(p.income)}</td>
                    <td className="num px-3 py-2.5 text-right text-fg-muted">{money(p.expense)}</td>
                    <td className={cx('num px-3 py-2.5 text-right font-semibold', p.net >= 0 ? 'text-good' : 'text-bad')}>{money(p.net, { sign: true })}</td>
                    <td className="num px-5 py-2.5 text-right">{money(p.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Planned one-off expenses" subtitle="Model known events in the forecast" />
            <div className="space-y-2 px-5 pt-3">
              {planned.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-xl border border-ink-600/70 bg-ink-850/60 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1"><div className="truncate font-medium">{p.label}</div><div className="text-xs text-fg-subtle">{projection[p.month]?.label ?? '—'}</div></div>
                  <span className="num font-medium">{money(p.amount, { compact: true })}</span>
                  <button className="cursor-pointer rounded-lg p-1 text-fg-muted hover:text-bad" onClick={() => setPlanned((x) => x.filter((y) => y.id !== p.id))} aria-label={`Remove ${p.label}`}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <form
              className="grid grid-cols-2 gap-2 p-5"
              onSubmit={(e) => {
                e.preventDefault()
                if (!draft.label.trim() || !(draft.amount > 0)) return
                setPlanned((x) => [...x, { ...draft, id: Date.now(), label: draft.label.trim() }])
                setDraft({ label: '', month: 1, amount: 20000 })
              }}
            >
              <input className="input col-span-2" placeholder="e.g. Car insurance renewal" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} aria-label="Expense label" />
              <select className="input" value={draft.month} onChange={(e) => setDraft({ ...draft, month: Number(e.target.value) })} aria-label="Month">
                {projection.map((p, i) => <option key={p.key} value={i}>{p.label}</option>)}
              </select>
              <input type="number" className="input num" value={draft.amount || ''} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} aria-label="Amount" />
              <button className="btn-ghost col-span-2" type="submit"><Plus size={15} /> Add to forecast</button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Upcoming bills" subtitle="Detected recurring payments" />
            <ul className="mt-2 max-h-80 divide-y divide-ink-600/50 overflow-auto">
              {bills.map((b) => (
                <li key={b.description} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <div className="w-11 shrink-0 rounded-lg border border-ink-600 bg-ink-850 py-1 text-center leading-tight">
                    <div className="text-[9px] text-fg-subtle uppercase">{b.due.toLocaleDateString('en-US', { month: 'short' })}</div>
                    <div className="num text-sm font-semibold">{b.due.getDate()}</div>
                  </div>
                  <div className="min-w-0 flex-1"><div className="truncate font-medium">{b.description}</div><div className="text-xs text-fg-subtle">{b.daysLeft === 0 ? 'Due today' : `In ${b.daysLeft} days`}</div></div>
                  <span className="num font-medium">{money(b.amount)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}
