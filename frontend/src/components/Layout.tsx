import { useMemo, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight, Bell, Bot, CheckCircle2, Gauge, Info, LayoutDashboard, LineChart, Menu, PiggyBank,
  Plus, Search, Settings, SlidersHorizontal, Target, Wallet, X, XCircle,
} from 'lucide-react'
import { useFinance } from '../store/FinanceContext'
import { healthReport } from '../lib/analytics'
import { cx } from '../lib/format'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, section: 'Main' },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight, section: 'Main' },
  { to: '/budgets', label: 'Budgets', icon: Wallet, section: 'Main' },
  { to: '/goals', label: 'Goals', icon: Target, section: 'Main' },
  { to: '/cash-flow', label: 'Cash-flow Forecast', icon: LineChart, section: 'Intelligence' },
  { to: '/simulator', label: 'Scenario Simulator', icon: SlidersHorizontal, section: 'Intelligence' },
  { to: '/health', label: 'Financial Health', icon: Gauge, section: 'Intelligence' },
  { to: '/assistant', label: 'AI Assistant', icon: Bot, section: 'Intelligence' },
  { to: '/settings', label: 'Settings', icon: Settings, section: 'Account' },
]

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#34d399] to-[#059669] shadow-[0_6px_20px_-6px_#10b981aa]">
        <PiggyBank size={19} className="text-ink-950" strokeWidth={2.4} />
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-bold tracking-[0.08em]">WEALTHWISE</div>
        <div className="text-[10px] font-medium tracking-wide text-fg-subtle">Financial intelligence</div>
      </div>
    </div>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, transactions, accounts, budgets, goals } = useFinance()
  const { score } = useMemo(() => healthReport(transactions, accounts, budgets, goals, profile), [transactions, accounts, budgets, goals, profile])
  const sections = [...new Set(NAV.map((n) => n.section))]
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-7">
        <Logo />
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3" aria-label="Primary">
        {sections.map((s) => (
          <div key={s}>
            <div className="px-3 pb-2 text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{s}</div>
            <div className="space-y-0.5">
              {NAV.filter((n) => n.section === s).map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cx(
                      'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-brand/10 text-fg shadow-[inset_2px_0_0_0_#10b981]' : 'text-fg-muted hover:bg-ink-700/70 hover:text-fg',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <n.icon size={17} className={isActive ? 'text-brand' : 'text-fg-subtle group-hover:text-fg-muted'} />
                      {n.label}
                      {n.to === '/assistant' && <span className="ml-auto rounded-md bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand">AI</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="m-3 rounded-2xl border border-ink-600 bg-gradient-to-br from-ink-700/80 to-ink-800 p-4">
        <div className="flex items-center justify-between text-xs text-fg-muted">
          <span>Health score</span>
          <span className="num text-sm font-semibold text-fg">{score}/100</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-600">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-strong to-[#34d399]" style={{ width: `${score}%` }} />
        </div>
        <NavLink to="/health" onClick={onNavigate} className="mt-3 block text-xs font-medium text-brand hover:underline">
          View breakdown →
        </NavLink>
      </div>
    </div>
  )
}

function Notifications() {
  const { transactions, accounts, budgets, goals, profile } = useFinance()
  const [open, setOpen] = useState(false)
  const [read, setRead] = useState(false)
  const nav = useNavigate()
  const items = useMemo(() => {
    const r = healthReport(transactions, accounts, budgets, goals, profile)
    return r.risks.filter((x) => x.level !== 'good').map((x) => ({ ...x }))
  }, [transactions, accounts, budgets, goals, profile])
  return (
    <div className="relative">
      <button className="btn-ghost relative !px-2.5" aria-label="Notifications" onClick={() => { setOpen((o) => !o); setRead(true) }}>
        <Bell size={17} />
        {!read && items.length > 0 && <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-bad text-[10px] font-bold text-ink-950">{items.length}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="card animate-fade-up absolute right-0 z-40 mt-2 w-80 overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-600 px-4 py-3 text-sm font-semibold">
              Alerts <span className="text-xs font-normal text-fg-muted">{items.length} active</span>
            </div>
            <div className="max-h-80 divide-y divide-ink-600/60 overflow-auto">
              {items.length === 0 && <div className="flex items-center gap-2 px-4 py-6 text-sm text-fg-muted"><CheckCircle2 size={16} className="text-good" /> All clear — no active risks.</div>}
              {items.map((i) => (
                <button key={i.title} className="flex w-full cursor-pointer gap-3 px-4 py-3 text-left hover:bg-ink-700/60" onClick={() => { setOpen(false); nav('/health') }}>
                  {i.level === 'bad' ? <XCircle size={16} className="mt-0.5 shrink-0 text-bad" /> : <Info size={16} className="mt-0.5 shrink-0 text-warn" />}
                  <div>
                    <div className="text-sm font-medium">{i.title} <span className="text-fg-muted">· {i.metric}</span></div>
                    <div className="mt-0.5 text-xs text-fg-muted">{i.detail}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { profile } = useFinance()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const initials = profile.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return (
    <header className="sticky top-0 z-20 border-b border-ink-600/60 bg-ink-900/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button className="btn-ghost !px-2.5 lg:hidden" onClick={onMenu} aria-label="Open menu">
          <Menu size={18} />
        </button>
        <div className="hidden text-sm md:block">
          <span className="text-fg-muted">{greet},</span> <span className="font-medium">{profile.name.split(' ')[0]}</span>
        </div>
        <form
          className="relative ml-auto w-full max-w-xs"
          onSubmit={(e) => {
            e.preventDefault()
            nav(`/transactions?q=${encodeURIComponent(q)}`)
          }}
        >
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
          <input className="input !rounded-xl !py-2 pl-9" placeholder="Search transactions…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search transactions" />
        </form>
        <button className="btn-primary hidden sm:inline-flex" onClick={() => nav('/transactions?new=1')}>
          <Plus size={16} /> Add transaction
        </button>
        <Notifications />
        <button onClick={() => nav('/settings')} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl bg-gradient-to-br from-s7 to-s1 text-xs font-bold text-white" aria-label="Profile settings">
          {initials}
        </button>
      </div>
    </header>
  )
}

function Toasts() {
  const { toasts } = useFinance()
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cx('card animate-fade-up pointer-events-auto flex items-center gap-2.5 px-4 py-3 text-sm', t.tone === 'danger' && 'border-bad/40')}>
          {t.tone === 'danger' ? <XCircle size={16} className="text-bad" /> : t.tone === 'info' ? <Info size={16} className="text-s1" /> : <CheckCircle2 size={16} className="text-good" />}
          {t.message}
        </div>
      ))}
    </div>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const loc = useLocation()
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-ink-600/60 bg-ink-850/70 backdrop-blur lg:block">
        <Sidebar />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/70" onClick={() => setMobileOpen(false)} />
          <aside className="animate-fade-up absolute inset-y-0 left-0 w-72 border-r border-ink-600 bg-ink-850">
            <button className="absolute top-5 right-3 rounded-lg p-1.5 text-fg-muted hover:bg-ink-700" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X size={18} />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
      <div className="min-w-0">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main key={loc.pathname} className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
      <Toasts />
    </div>
  )
}
