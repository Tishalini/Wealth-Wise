import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Briefcase, Car, Flame, PiggyBank, RotateCcw, Scissors, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import { useFinance } from '../store/FinanceContext'
import { baseline, goalProjection, netWorth, simulate, type SimParams } from '../lib/analytics'
import { cx, money } from '../lib/format'
import { Card, CardHeader, Legend, PageHeader, Segmented } from '../components/ui'
import { C, ChartTooltip, axisProps } from '../components/charts'

const DEFAULTS: SimParams = { incomeChange: 0, expenseChange: 0, extraInvest: 0, annualReturn: 11, inflation: 6, years: 15, salaryGrowth: 8, windfall: 0 }

const PRESETS: { label: string; icon: typeof PiggyBank; desc: string; p: Partial<SimParams> }[] = [
  { label: 'Save 15% more', icon: PiggyBank, desc: 'Redirect ₹20K/mo into SIPs', p: { extraInvest: 20000 } },
  { label: 'Cut expenses', icon: Scissors, desc: 'Trim lifestyle spend by 15%', p: { expenseChange: -15 } },
  { label: 'Get a 25% raise', icon: Briefcase, desc: 'Job switch or promotion', p: { incomeChange: 25 } },
  { label: 'Job loss shock', icon: TrendingDown, desc: '40% income drop', p: { incomeChange: -40 } },
  { label: 'Buy a car', icon: Car, desc: '₹12L down payment', p: { windfall: -1200000, expenseChange: 8 } },
  { label: 'FIRE mode', icon: Flame, desc: 'Aggressive saving + returns', p: { extraInvest: 35000, expenseChange: -10, annualReturn: 12 } },
]

function Slider({ label, value, onChange, min, max, step, fmt }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; fmt: (v: number) => string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <label className="text-fg-muted">{label}</label>
        <span className={cx('num rounded-md px-2 py-0.5 text-xs font-semibold', value === 0 ? 'bg-ink-700 text-fg-muted' : 'bg-brand/15 text-brand')}>{fmt(value)}</span>
      </div>
      <input type="range" className="w-full" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </div>
  )
}

export default function Simulator() {
  const { transactions, accounts, goals } = useFinance()
  const [p, setP] = useState<SimParams>(DEFAULTS)
  const [active, setActive] = useState<string | null>(null)
  const [view, setView] = useState<'nominal' | 'real'>('nominal')
  const set = (k: keyof SimParams) => (v: number) => { setP((s) => ({ ...s, [k]: v })); setActive(null) }

  const base = useMemo(() => baseline(transactions), [transactions])
  const nw = useMemo(() => netWorth(accounts), [accounts])
  const r = useMemo(() => simulate(nw.net, base.income, base.expense, p), [nw.net, base, p])

  const data = r.data.map((d) => ({ ...d, scenarioShown: view === 'real' ? d.scenarioReal : d.scenario }))
  const diff = r.finalScen - r.finalBase
  const surplusDiff = r.scenSurplus - r.baseSurplus

  const goalImpact = goals.map((g) => {
    const share = goals.length ? surplusDiff / goals.length : 0
    const before = goalProjection(g)
    const after = goalProjection({ ...g, monthlyContribution: Math.max(0, g.monthlyContribution + share) })
    const delta = Number.isFinite(before.monthsAtPace) && Number.isFinite(after.monthsAtPace) ? before.monthsAtPace - after.monthsAtPace : 0
    return { g, before, after, delta }
  })

  const isBaseline = JSON.stringify(p) === JSON.stringify(DEFAULTS)
  const fiLabel = (y: number | null) => (y === null ? '50+ yrs' : `${y.toFixed(1)} yrs`)

  return (
    <>
      <PageHeader
        title="Scenario simulator"
        subtitle="Explore how decisions today compound into your future net worth"
        actions={<button className="btn-ghost" onClick={() => { setP(DEFAULTS); setActive(null) }}><RotateCcw size={15} /> Reset</button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {PRESETS.map((x) => (
          <button
            key={x.label}
            onClick={() => { setP({ ...DEFAULTS, ...x.p }); setActive(x.label) }}
            className={cx('card cursor-pointer p-4 text-left transition-colors hover:border-brand/50', active === x.label && '!border-brand bg-brand/5')}
          >
            <x.icon size={18} className={active === x.label ? 'text-brand' : 'text-fg-muted'} />
            <div className="mt-2 text-sm font-semibold">{x.label}</div>
            <div className="text-xs text-fg-subtle">{x.desc}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="p-5">
          <h3 className="text-[15px] font-semibold">Assumptions</h3>
          <p className="mt-0.5 text-xs text-fg-muted">Starting from your 3-month average: {money(base.income, { compact: true })} income, {money(base.expense, { compact: true })} spend.</p>
          <div className="mt-5 space-y-5">
            <Slider label="Income change" value={p.incomeChange} onChange={set('incomeChange')} min={-50} max={100} step={5} fmt={(v) => `${v > 0 ? '+' : ''}${v}%`} />
            <Slider label="Expense change" value={p.expenseChange} onChange={set('expenseChange')} min={-40} max={50} step={5} fmt={(v) => `${v > 0 ? '+' : ''}${v}%`} />
            <Slider label="Extra monthly investing" value={p.extraInvest} onChange={set('extraInvest')} min={0} max={60000} step={2500} fmt={(v) => money(v, { compact: true })} />
            <Slider label="One-time cash event" value={p.windfall} onChange={set('windfall')} min={-2000000} max={2000000} step={50000} fmt={(v) => money(v, { compact: true, sign: true })} />
            <div className="border-t border-ink-600/60 pt-5" />
            <Slider label="Expected annual return" value={p.annualReturn} onChange={set('annualReturn')} min={4} max={15} step={0.5} fmt={(v) => `${v}%`} />
            <Slider label="Annual salary growth" value={p.salaryGrowth} onChange={set('salaryGrowth')} min={0} max={15} step={1} fmt={(v) => `${v}%`} />
            <Slider label="Inflation" value={p.inflation} onChange={set('inflation')} min={2} max={10} step={0.5} fmt={(v) => `${v}%`} />
            <Slider label="Time horizon" value={p.years} onChange={set('years')} min={3} max={30} step={1} fmt={(v) => `${v} yrs`} />
          </div>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {[
              { l: `Net worth in ${p.years} yrs`, v: money(r.finalScen, { compact: true }), sub: `${diff >= 0 ? '+' : ''}${money(diff, { compact: true })} vs. today’s path`, good: diff >= 0 },
              { l: 'Monthly surplus', v: money(r.scenSurplus, { compact: true }), sub: `${surplusDiff >= 0 ? '+' : ''}${money(surplusDiff, { compact: true })} / month`, good: surplusDiff >= 0 },
              { l: 'Savings rate', v: `${(r.scenRate * 100).toFixed(1)}%`, sub: `was ${(r.baseRate * 100).toFixed(1)}%`, good: r.scenRate >= r.baseRate },
              { l: 'Financial independence', v: fiLabel(r.yearsToFI), sub: `baseline ${fiLabel(r.baseYearsToFI)} · target ${money(r.fiNumber, { compact: true })}`, good: (r.yearsToFI ?? 99) <= (r.baseYearsToFI ?? 99) },
            ].map((k) => (
              <Card key={k.l} className="p-5">
                <div className="text-xs font-medium tracking-wide text-fg-muted uppercase">{k.l}</div>
                <div className="num mt-2 text-2xl font-semibold">{k.v}</div>
                <div className={cx('mt-1.5 inline-flex items-center gap-1 text-xs', isBaseline ? 'text-fg-subtle' : k.good ? 'text-good' : 'text-bad')}>
                  {isBaseline ? null : k.good ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {isBaseline ? 'Baseline · pick a preset or move a slider' : k.sub}
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader
              title="Projected net worth"
              subtitle={`${p.years}-year projection · monthly compounding at ${p.annualReturn}%`}
              action={<Segmented value={view} onChange={setView} options={[{ value: 'nominal', label: 'Nominal' }, { value: 'real', label: 'Today’s ₹' }]} />}
            />
            <div className="px-5 pt-3"><Legend items={[{ label: 'Current path', color: C.axis, dashed: true }, { label: view === 'real' ? 'Scenario (inflation-adjusted)' : 'Scenario', color: C.s3 }]} /></div>
            <div className="h-80 px-2 pt-2 pb-4">
              <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="gSc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.s3} stopOpacity={0.35} /><stop offset="100%" stopColor={C.s3} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="year" {...axisProps} />
                  <YAxis {...axisProps} width={60} tickFormatter={(v) => money(v, { compact: true })} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: C.axis, strokeDasharray: '3 3' }} />
                  <Area type="monotone" dataKey="scenarioShown" name="Scenario" stroke={C.s3} strokeWidth={2} fill="url(#gSc)" activeDot={{ r: 5, stroke: C.surface, strokeWidth: 2 }} />
                  {view === 'nominal' && <Line type="monotone" dataKey="baseline" name="Current path" stroke={C.axis} strokeWidth={2} strokeDasharray="6 4" dot={false} />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Impact on your goals" subtitle="Change in surplus split evenly across goals" action={<Sparkles size={16} className="text-brand" />} />
            <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 2xl:grid-cols-3">
              {goalImpact.map(({ g, before, after, delta }) => (
                <div key={g.id} className="rounded-xl border border-ink-600/70 bg-ink-850/60 p-3.5">
                  <div className="truncate text-sm font-medium">{g.name}</div>
                  <div className="mt-1 flex items-baseline justify-between text-xs text-fg-muted">
                    <span>{Number.isFinite(before.monthsAtPace) ? `${before.monthsAtPace} mo` : '—'} → <span className="font-medium text-fg">{Number.isFinite(after.monthsAtPace) ? `${after.monthsAtPace} mo` : 'never'}</span></span>
                    <span className={cx('font-semibold', delta > 0 ? 'text-good' : delta < 0 ? 'text-bad' : 'text-fg-subtle')}>
                      {delta > 0 ? `${delta} mo sooner` : delta < 0 ? `${-delta} mo later` : 'no change'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
