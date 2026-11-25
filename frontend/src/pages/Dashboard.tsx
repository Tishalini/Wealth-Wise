import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownLeft, ArrowUpRight, Bot, Gauge, Landmark, PiggyBank, Sparkles, TrendingUp, Wallet } from 'lucide-react'
import { useFinance } from '../store/FinanceContext'
import { budgetStatus, categoryBreakdown, currentMonthKey, goalProjection, healthReport, monthlySummary, netWorth, netWorthHistory } from '../lib/analytics'
import { cx, dateLabel, money, monthLabel } from '../lib/format'
import { Card, CardHeader, Legend, PageHeader, Progress, Segmented, StatTile, StatusPill } from '../components/ui'
import { C, ChartTooltip, axisProps, foldCategories } from '../components/charts'
import { ScoreRing } from './Health'

export default function Dashboard() {
  const { transactions, accounts, budgets, goals, profile } = useFinance()
  const nav = useNavigate()
  const [range, setRange] = useState<'6' | '12'>('12')

  const d = useMemo(() => {
    const now = new Date()
    const curKey = currentMonthKey()
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
    const dayCut = now.getDate()
    // Month-to-date vs the same days of last month — a fair comparison for a partial month
    const mtd = (key: string, type: 'income' | 'expense') =>
      transactions.filter((t) => t.type === type && t.date.startsWith(key) && Number(t.date.slice(8)) <= dayCut).reduce((a, t) => a + t.amount, 0)
    const inc = mtd(curKey, 'income'), exp = mtd(curKey, 'expense')
    const pInc = mtd(prevKey, 'income'), pExp = mtd(prevKey, 'expense')
    const nw = netWorth(accounts)
    const hist = netWorthHistory(transactions, accounts)
    const nwDelta = hist.length > 1 ? (hist[hist.length - 1].value - hist[hist.length - 2].value) / hist[hist.length - 2].value : 0
    return {
      inc, exp, sav: inc - exp,
      dInc: pInc ? (inc - pInc) / pInc : 0,
      dExp: pExp ? (exp - pExp) / pExp : 0,
      dSav: pInc - pExp ? (inc - exp - (pInc - pExp)) / Math.abs(pInc - pExp) : 0,
      nw, hist, nwDelta,
      months: monthlySummary(transactions, 12),
      cats: foldCategories(categoryBreakdown(transactions, curKey)),
      budgets: budgetStatus(transactions, budgets).sort((a, b) => b.used - a.used),
      health: healthReport(transactions, accounts, budgets, goals, profile),
      curKey,
    }
  }, [transactions, accounts, budgets, goals, profile])

  const series = range === '6' ? d.months.slice(-6) : d.months
  const catTotal = d.cats.reduce((a, c) => a + c.amount, 0)
  const recent = transactions.slice(0, 6)

  return (
    <>
      <PageHeader
        title="Financial overview"
        subtitle={`${monthLabel(d.curKey, true)} · month to date · all accounts`}
        actions={
          <>
            <Link to="/assistant" className="btn-ghost"><Bot size={16} /> Ask WealthWise AI</Link>
            <Link to="/simulator" className="btn-primary"><Sparkles size={16} /> Run a scenario</Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Net worth" value={money(d.nw.net, { compact: true })} icon={<Landmark size={16} />} delta={d.nwDelta} accent={C.s7} />
        <StatTile label="Income" value={money(d.inc)} icon={<ArrowDownLeft size={16} />} delta={d.dInc} accent={C.income} />
        <StatTile label="Expenses" value={money(d.exp)} icon={<ArrowUpRight size={16} />} delta={d.dExp} invertDelta accent={C.expense} />
        <StatTile label="Savings" value={money(d.sav)} icon={<PiggyBank size={16} />} hint={<span className="text-xs text-fg-muted">{d.inc ? ((d.sav / d.inc) * 100).toFixed(1) : 0}% savings rate this month</span>} accent={C.savings} />
        <Card className="flex items-center gap-3 p-5">
          <ScoreRing score={d.health.score} size={76} stroke={7} />
          <div>
            <div className="text-xs font-medium tracking-wide text-fg-muted uppercase">Health score</div>
            <div className="mt-1 text-lg font-semibold">{d.health.grade}</div>
            <Link to="/health" className="mt-1 inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap text-brand hover:underline"><Gauge size={12} /> See breakdown</Link>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Cash flow"
            subtitle="Monthly income vs. expenses"
            action={<Segmented value={range} onChange={setRange} options={[{ value: '6', label: '6M' }, { value: '12', label: '12M' }]} />}
          />
          <div className="px-5 pt-3"><Legend items={[{ label: 'Income', color: C.income }, { label: 'Expenses', color: C.expense }]} /></div>
          <div className="h-[340px] px-2 pt-2 pb-4">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.income} stopOpacity={0.35} /><stop offset="100%" stopColor={C.income} stopOpacity={0} /></linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.expense} stopOpacity={0.3} /><stop offset="100%" stopColor={C.expense} stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={56} tickFormatter={(v) => money(v, { compact: true })} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: C.axis, strokeDasharray: '3 3' }} />
                <Area type="monotone" dataKey="income" name="Income" stroke={C.income} strokeWidth={2} fill="url(#gInc)" activeDot={{ r: 5, stroke: C.surface, strokeWidth: 2 }} />
                <Area type="monotone" dataKey="expense" name="Expenses" stroke={C.expense} strokeWidth={2} fill="url(#gExp)" activeDot={{ r: 5, stroke: C.surface, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Where your money went" subtitle={`${monthLabel(d.curKey, true)} spending by category`} />
          <div className="flex flex-col items-center gap-4 px-5 pt-2 pb-5 sm:flex-row xl:flex-col 2xl:flex-row">
            <div className="relative size-44 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={d.cats} dataKey="amount" nameKey="category" innerRadius="68%" outerRadius="100%" paddingAngle={1} stroke={C.surface} strokeWidth={2} isAnimationActive>
                    {d.cats.map((c) => <Cell key={c.category} fill={c.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="text-[11px] text-fg-muted">Spent</div>
                  <div className="num text-lg font-semibold">{money(catTotal, { compact: true })}</div>
                </div>
              </div>
            </div>
            <ul className="w-full space-y-1.5 text-sm">
              {d.cats.map((c) => (
                <li key={c.category} className="flex items-center justify-between gap-2">
                  <span className="inline-flex min-w-0 items-center gap-2 text-fg-muted"><span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: c.color }} /><span className="truncate">{c.category}</span></span>
                  <span className="num shrink-0 font-medium">{money(c.amount, { compact: true })} <span className="text-xs font-normal text-fg-subtle">{((c.amount / catTotal) * 100).toFixed(0)}%</span></span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader title="Net worth" subtitle="12-month trajectory" action={<span className="num text-sm font-semibold text-good">+{money(d.hist[d.hist.length - 1].value - d.hist[0].value, { compact: true })}</span>} />
          <div className="h-48 px-2 pt-3 pb-3">
            <ResponsiveContainer>
              <LineChart data={d.hist} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="label" {...axisProps} interval={1} />
                <YAxis {...axisProps} width={56} domain={['dataMin - 100000', 'dataMax + 100000']} tickFormatter={(v) => money(v, { compact: true })} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: C.axis, strokeDasharray: '3 3' }} />
                <Line type="monotone" dataKey="value" name="Net worth" stroke={C.s7} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: C.surface, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 border-t border-ink-600/60 text-center text-xs">
            {[['Assets', d.nw.assets], ['Liabilities', d.nw.liabilities], ['Invested', d.nw.invested]].map(([l, v]) => (
              <div key={l as string} className="px-2 py-3"><div className="text-fg-muted">{l}</div><div className="num mt-0.5 text-sm font-semibold">{money(v as number, { compact: true })}</div></div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Budget pulse" subtitle="Most-used budgets this month" action={<Link to="/budgets" className="text-xs font-medium text-brand hover:underline">Manage</Link>} />
          <div className="space-y-4 px-5 pt-4 pb-5">
            {d.budgets.slice(0, 5).map((b) => (
              <div key={b.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{b.category}</span>
                  <span className="num text-xs text-fg-muted">{money(b.spent, { compact: true })} / {money(b.limit, { compact: true })}</span>
                </div>
                <Progress value={b.used} tone={b.status} />
                {b.status !== 'good' && <div className="mt-1.5"><StatusPill level={b.status} label={b.status === 'bad' ? `Over by ${money(-b.remaining, { compact: true })}` : `On pace for ${money(b.projected, { compact: true })}`} /></div>}
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader title="Goals" subtitle="Progress toward what matters" action={<Link to="/goals" className="text-xs font-medium text-brand hover:underline">All goals</Link>} />
          <div className="space-y-4 px-5 pt-4 pb-5">
            {goals.slice(0, 4).map((g) => {
              const p = goalProjection(g)
              return (
                <div key={g.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{g.name}</span>
                    <span className="num shrink-0 text-xs text-fg-muted">{(p.progress * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={p.progress} tone={p.onTrack ? 'brand' : 'warn'} size="sm" />
                  <div className="mt-1 flex justify-between text-[11px] text-fg-subtle">
                    <span className="num">{money(g.saved, { compact: true })} of {money(g.target, { compact: true })}</span>
                    <span>{p.onTrack ? 'On track' : 'Behind pace'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Recent transactions" action={<Link to="/transactions" className="text-xs font-medium text-brand hover:underline">View all</Link>} />
          <ul className="mt-2 divide-y divide-ink-600/50">
            {recent.map((t) => (
              <li key={t.id}>
                <button onClick={() => nav(`/transactions?q=${encodeURIComponent(t.description)}`)} className="flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-left hover:bg-ink-700/40">
                  <span className={cx('grid size-9 shrink-0 place-items-center rounded-xl', t.type === 'income' ? 'bg-s3/12 text-s3' : 'bg-ink-700 text-fg-muted')}>
                    {t.type === 'income' ? <ArrowDownLeft size={16} /> : <Wallet size={16} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{t.description}</span>
                    <span className="block text-xs text-fg-subtle">{t.category} · {dateLabel(t.date)}</span>
                  </span>
                  <span className={cx('num text-sm font-semibold', t.type === 'income' ? 'text-good' : 'text-fg')}>{t.type === 'income' ? '+' : '−'}{money(t.amount)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="relative overflow-hidden xl:col-span-2">
          <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-brand/10 blur-3xl" />
          <CardHeader title="AI insights" subtitle="Generated from your last 90 days" action={<span className="inline-flex items-center gap-1 rounded-md bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand"><Sparkles size={12} /> Live</span>} />
          <div className="space-y-3 px-5 pt-4 pb-5">
            {d.health.recommendations.slice(0, 3).map((r) => (
              <div key={r.title} className="rounded-xl border border-ink-600/70 bg-ink-850/70 p-3.5">
                <div className="flex items-center gap-2 text-sm font-medium"><TrendingUp size={15} className="text-brand" /> {r.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">{r.detail}</p>
                <div className="mt-2 text-[11px] font-medium text-brand">{r.impact}</div>
              </div>
            ))}
            <Link to="/assistant" className="btn-ghost w-full"><Bot size={15} /> Ask a follow-up question</Link>
          </div>
        </Card>
      </div>
    </>
  )
}
