import { useState } from 'react'
import { CalendarClock, Home, Laptop, Pencil, Plane, Plus, PlusCircle, Shield, Sunset, Target, Trash2, TrendingUp, Car, GraduationCap } from 'lucide-react'
import { useFinance } from '../store/FinanceContext'
import { goalProjection } from '../lib/analytics'
import { cx, money } from '../lib/format'
import { Badge, Card, Modal, PageHeader, Progress, StatTile, StatusPill } from '../components/ui'
import type { Goal } from '../data/types'

const ICONS: Record<string, typeof Home> = { shield: Shield, home: Home, plane: Plane, laptop: Laptop, sunset: Sunset, target: Target, car: Car, education: GraduationCap }

const monthYear = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

export default function Goals() {
  const { goals, upsertGoal, deleteGoal, contributeToGoal, notify } = useFinance()
  const [editing, setEditing] = useState<Partial<Goal> | null>(null)
  const [contrib, setContrib] = useState<Goal | null>(null)
  const [amount, setAmount] = useState(10000)

  const totalTarget = goals.reduce((a, g) => a + g.target, 0)
  const totalSaved = goals.reduce((a, g) => a + g.saved, 0)
  const monthly = goals.reduce((a, g) => a + g.monthlyContribution, 0)
  const onTrack = goals.filter((g) => goalProjection(g).onTrack).length

  return (
    <>
      <PageHeader
        title="Goals"
        subtitle="Plan, fund and track every milestone"
        actions={<button className="btn-primary" onClick={() => setEditing({ name: '', target: 100000, saved: 0, monthlyContribution: 5000, icon: 'target', priority: 'medium', deadline: new Date(new Date().getFullYear() + 1, new Date().getMonth(), 1).toISOString().slice(0, 10) })}><Plus size={16} /> New goal</button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total saved" value={money(totalSaved, { compact: true })} hint={<span className="text-xs text-fg-muted">of {money(totalTarget, { compact: true })} targeted</span>} />
        <StatTile label="Overall progress" value={`${((totalSaved / totalTarget) * 100).toFixed(1)}%`} hint={<Progress value={totalSaved / totalTarget} size="sm" />} />
        <StatTile label="Monthly commitment" value={money(monthly)} icon={<CalendarClock size={16} />} hint={<span className="text-xs text-fg-muted">across {goals.length} goals</span>} />
        <StatTile label="On track" value={`${onTrack} / ${goals.length}`} icon={<TrendingUp size={16} />} hint={<StatusPill level={onTrack === goals.length ? 'good' : onTrack >= goals.length - 1 ? 'warn' : 'bad'} />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {goals.map((g) => {
          const p = goalProjection(g)
          const Icon = ICONS[g.icon] ?? Target
          const r = 34, circ = 2 * Math.PI * r
          return (
            <Card key={g.id} className="group p-5">
              <div className="flex items-start gap-4">
                <div className="relative size-20 shrink-0">
                  <svg viewBox="0 0 80 80" className="size-20 -rotate-90">
                    <circle cx="40" cy="40" r={r} stroke="#222d44" strokeWidth="7" fill="none" />
                    <circle cx="40" cy="40" r={r} stroke={p.onTrack ? '#10b981' : '#f2a600'} strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - p.progress)} className="transition-[stroke-dashoffset] duration-700" />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center"><Icon size={22} className="text-fg-muted" /></div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{g.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge className={cx(g.priority === 'high' && '!border-s7/40 !text-s7')}>{g.priority} priority</Badge>
                        <StatusPill level={p.onTrack ? 'good' : 'warn'} label={p.onTrack ? 'On track' : 'Behind pace'} />
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                      <button className="cursor-pointer rounded-lg p-1.5 text-fg-muted hover:bg-ink-600 hover:text-fg" onClick={() => setEditing(g)} aria-label={`Edit ${g.name}`}><Pencil size={14} /></button>
                      <button className="cursor-pointer rounded-lg p-1.5 text-fg-muted hover:bg-bad/15 hover:text-bad" onClick={() => { deleteGoal(g.id); notify('Goal deleted', 'danger') }} aria-label={`Delete ${g.name}`}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="num text-xl font-semibold">{money(g.saved, { compact: true })}</span>
                    <span className="num text-sm text-fg-muted">/ {money(g.target, { compact: true })}</span>
                    <span className="num ml-auto text-sm font-semibold">{(p.progress * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-ink-600/60 bg-ink-850/60 p-3 text-xs">
                <div><div className="text-fg-subtle">Deadline</div><div className="mt-0.5 font-medium">{monthYear(new Date(g.deadline))}</div></div>
                <div><div className="text-fg-subtle">Needed / mo</div><div className="num mt-0.5 font-medium">{money(p.required, { compact: true })}</div></div>
                <div><div className="text-fg-subtle">ETA at pace</div><div className={cx('mt-0.5 font-medium', !p.onTrack && 'text-warn')}>{Number.isFinite(p.monthsAtPace) ? monthYear(p.eta) : '—'}</div></div>
              </div>
              {!p.onTrack && (
                <p className="mt-3 text-xs text-fg-muted">
                  Increase your contribution by <span className="num font-medium text-fg">{money(p.required - g.monthlyContribution)}</span>/mo to hit the deadline — or move it to <span className="font-medium text-fg">{monthYear(p.eta)}</span>.
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <button className="btn-ghost flex-1" onClick={() => { setContrib(g); setAmount(g.monthlyContribution) }} disabled={p.remaining <= 0}><PlusCircle size={15} /> Add funds</button>
                {!p.onTrack && <button className="btn-ghost flex-1" onClick={() => { upsertGoal({ ...g, monthlyContribution: Math.ceil(p.required / 500) * 500 }); notify(`${g.name} contribution adjusted`) }}><TrendingUp size={15} /> Auto-fix pace</button>}
              </div>
            </Card>
          )
        })}
      </div>

      <Modal
        open={!!contrib}
        onClose={() => setContrib(null)}
        title={`Add funds · ${contrib?.name ?? ''}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setContrib(null)}>Cancel</button>
            <button className="btn-primary" disabled={!(amount > 0)} onClick={() => { contributeToGoal(contrib!.id, amount); notify(`${money(amount)} added to ${contrib!.name}`); setContrib(null) }}>Add {money(amount)}</button>
          </>
        }
      >
        <label className="label" htmlFor="c-amt">Amount (₹)</label>
        <input id="c-amt" type="number" className="input num" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} />
        <div className="mt-3 flex flex-wrap gap-2">
          {[5000, 10000, 25000, 50000].map((v) => <button key={v} className="btn-ghost !py-1 text-xs" onClick={() => setAmount(v)}>{money(v)}</button>)}
        </div>
      </Modal>

      {editing && <GoalForm initial={editing} onClose={() => setEditing(null)} onSave={(g) => { upsertGoal(g); notify(g.id ? 'Goal updated' : 'Goal created'); setEditing(null) }} />}
    </>
  )
}

function GoalForm({ initial, onClose, onSave }: { initial: Partial<Goal>; onClose: () => void; onSave: (g: Omit<Goal, 'id'> & { id?: string }) => void }) {
  const [f, setF] = useState(initial as Goal)
  const set = <K extends keyof Goal>(k: K, v: Goal[K]) => setF((s) => ({ ...s, [k]: v }))
  const valid = f.name?.trim() && f.target > 0 && f.deadline
  return (
    <Modal
      open
      onClose={onClose}
      title={initial.id ? 'Edit goal' : 'New goal'}
      wide
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!valid} onClick={() => onSave({ ...f, name: f.name.trim() })}>Save goal</button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="g-name">Goal name</label>
          <input id="g-name" autoFocus className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. New car" />
        </div>
        <div><label className="label" htmlFor="g-t">Target amount (₹)</label><input id="g-t" type="number" className="input num" value={f.target || ''} onChange={(e) => set('target', Number(e.target.value))} /></div>
        <div><label className="label" htmlFor="g-s">Already saved (₹)</label><input id="g-s" type="number" className="input num" value={f.saved || ''} onChange={(e) => set('saved', Number(e.target.value))} /></div>
        <div><label className="label" htmlFor="g-m">Monthly contribution (₹)</label><input id="g-m" type="number" className="input num" value={f.monthlyContribution || ''} onChange={(e) => set('monthlyContribution', Number(e.target.value))} /></div>
        <div><label className="label" htmlFor="g-d">Target date</label><input id="g-d" type="date" className="input" value={f.deadline?.slice(0, 10)} onChange={(e) => set('deadline', e.target.value)} /></div>
        <div>
          <label className="label" htmlFor="g-p">Priority</label>
          <select id="g-p" className="input" value={f.priority} onChange={(e) => set('priority', e.target.value as Goal['priority'])}>
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </div>
        <div>
          <span className="label">Icon</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(ICONS).map(([k, I]) => (
              <button key={k} type="button" onClick={() => set('icon', k)} className={cx('grid size-9 cursor-pointer place-items-center rounded-lg border', f.icon === k ? 'border-brand bg-brand/15 text-brand' : 'border-ink-600 text-fg-muted hover:bg-ink-700')} aria-label={k}>
                <I size={16} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
