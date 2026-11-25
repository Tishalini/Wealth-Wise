import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Bot, Check, ShieldCheck, Sparkles } from 'lucide-react'
import { useFinance } from '../store/FinanceContext'
import { healthReport, lastMonthKeys, type Level } from '../lib/analytics'
import { cx, monthLabel } from '../lib/format'
import { Badge, Card, CardHeader, PageHeader, Progress, Segmented, StatusPill } from '../components/ui'
import { C, ChartTooltip, axisProps } from '../components/charts'

export function ScoreRing({ score, size = 180, stroke = 14 }: { score: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const arc = 0.75 // 270° gauge
  const color = score >= 70 ? '#10b981' : score >= 55 ? '#f2a600' : '#f0686a'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Financial health score ${score} out of 100`}>
      <svg width={size} height={size} className="rotate-[135deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#222d44" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${circ * arc} ${circ}`} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${circ * arc * (score / 100)} ${circ}`} className="transition-[stroke-dasharray] duration-1000" style={{ filter: `drop-shadow(0 0 ${size / 18}px ${color}66)` }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="num font-semibold tracking-tight" style={{ fontSize: size * 0.27 }}>{score}</div>
          {size > 120 && <div className="-mt-1 text-xs text-fg-muted">out of 100</div>}
        </div>
      </div>
    </div>
  )
}

const levelFromScore = (s: number): Level => (s >= 70 ? 'good' : s >= 45 ? 'warn' : 'bad')

export default function Health() {
  const { transactions, accounts, budgets, goals, profile, notify } = useFinance()
  const nav = useNavigate()
  const report = useMemo(() => healthReport(transactions, accounts, budgets, goals, profile), [transactions, accounts, budgets, goals, profile])
  const [done, setDone] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'high'>('all')

  // Illustrative trend leading to the live score
  const history = lastMonthKeys(6).map((k, i, arr) => ({ label: monthLabel(k), score: i === arr.length - 1 ? report.score : Math.round(report.score - (arr.length - 1 - i) * 2.2 + [1, -2, 2, -1, 1, 0][i]) }))
  const SHORT: Record<string, string> = { savings: 'Savings', emergency: 'Buffer', debt: 'Debt', budget: 'Budgets', invest: 'Invested', stability: 'Stability' }
  const radar = report.components.map((c) => ({ subject: SHORT[c.key] ?? c.label, score: Math.round(c.score) }))
  const recs = report.recommendations.filter((r) => filter === 'all' || r.priority === 'high')
  const byScore = [...report.components].sort((a, b) => a.score * a.weight - b.score * b.weight)
  const weakest = byScore[0]
  const strongest = [...report.components].sort((a, b) => b.score - a.score)[0]
  const counts = report.risks.reduce((a, r) => ({ ...a, [r.level]: (a[r.level] ?? 0) + 1 }), {} as Record<Level, number>)

  return (
    <>
      <PageHeader title="Financial health" subtitle="A transparent, weighted score across six pillars of financial wellbeing" />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -top-20 left-1/2 size-72 -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
          <div className="relative flex flex-col items-center text-center">
            <ScoreRing score={report.score} />
            <div className="mt-2 text-xl font-semibold">{report.grade}</div>
            <p className="mt-1 max-w-xs text-sm text-fg-muted">
              Strongest pillar: <span className="text-fg">{strongest.label.toLowerCase()}</span>. Improving your <span className="text-fg">{weakest.label.toLowerCase()}</span> is the fastest way to move up.
            </p>
            <div className="mt-4 flex gap-2">
              <StatusPill level="good" label={`${counts.good ?? 0} healthy`} />
              <StatusPill level="warn" label={`${counts.warn ?? 0} watch`} />
              <StatusPill level="bad" label={`${counts.bad ?? 0} at risk`} />
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Score breakdown" subtitle="Each pillar is scored 0–100 and weighted" />
          <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_260px]">
            <div className="space-y-4 px-5 pt-4 pb-5">
              {report.components.map((c) => (
                <div key={c.key}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{c.label} <span className="text-xs font-normal text-fg-subtle">· {c.weight}% weight</span></span>
                    <span className="num text-xs text-fg-muted"><span className="font-semibold text-fg">{c.value}</span> · target {c.target}</span>
                  </div>
                  <Progress value={c.score / 100} tone={levelFromScore(c.score)} />
                  <div className="mt-1 text-[11px] text-fg-subtle">{c.detail}</div>
                </div>
              ))}
            </div>
            <div className="hidden h-64 md:block">
              <ResponsiveContainer>
                <RadarChart data={radar} outerRadius="68%">
                  <PolarGrid stroke={C.grid} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: C.axis, fontSize: 11 }} />
                  <Radar dataKey="score" name="Score" stroke={C.s3} fill={C.s3} fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v}/100`} />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold tracking-wide text-fg-muted uppercase">Risk indicators</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {report.risks.map((r) => (
          <Card key={r.title} className={cx('p-5', r.level === 'bad' && 'border-bad/30', r.level === 'warn' && 'border-warn/25')}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">{r.title}</span>
              <StatusPill level={r.level} />
            </div>
            <div className="num mt-3 text-lg font-semibold">{r.metric}</div>
            <p className="mt-1 text-xs leading-relaxed text-fg-muted">{r.detail}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Personalised recommendations"
            subtitle="Ranked by impact on your score"
            action={<Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'high', label: 'High priority' }]} />}
          />
          <ul className="mt-3 divide-y divide-ink-600/50">
            {recs.map((r) => {
              const isDone = done.has(r.title)
              return (
                <li key={r.title} className={cx('flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center', isDone && 'opacity-50')}>
                  <div className={cx('grid size-9 shrink-0 place-items-center rounded-xl', r.priority === 'high' ? 'bg-brand/15 text-brand' : 'bg-ink-700 text-fg-muted')}>
                    {isDone ? <Check size={17} /> : <Sparkles size={17} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cx('font-medium', isDone && 'line-through')}>{r.title}</span>
                      <Badge>{r.category}</Badge>
                      {r.priority === 'high' && <Badge className="!border-brand/40 !text-brand">High impact</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-fg-muted">{r.detail}</p>
                    <p className="mt-1 text-xs font-medium text-brand">{r.impact}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={() => nav(`/assistant?q=${encodeURIComponent(`Explain: ${r.title}`)}`)}><Bot size={14} /> Explain</button>
                    <button
                      className="btn-ghost !px-2.5 !py-1.5 text-xs"
                      onClick={() => {
                        setDone((s) => { const n = new Set(s); n.has(r.title) ? n.delete(r.title) : n.add(r.title); return n })
                        if (!isDone) notify('Marked as done — nice work!')
                      }}
                    >
                      <Check size={14} /> {isDone ? 'Undo' : 'Done'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Score trend" subtitle="Last 6 months" action={<ShieldCheck size={16} className="text-brand" />} />
          <div className="h-56 px-2 pt-4 pb-3">
            <ResponsiveContainer>
              <LineChart data={history} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} domain={[40, 100]} width={40} />
                <Tooltip content={<ChartTooltip formatter={(v) => `${v}/100`} />} cursor={{ stroke: C.axis, strokeDasharray: '3 3' }} />
                <Line type="monotone" dataKey="score" name="Health score" stroke={C.s3} strokeWidth={2} dot={{ r: 4, fill: C.s3, stroke: C.surface, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="px-5 pb-5 text-xs text-fg-muted">Your score is recalculated whenever transactions, budgets, goals or balances change.</p>
        </Card>
      </div>
    </>
  )
}
