import type { Account, Budget, Goal, Profile, Transaction } from '../data/types'
import { money, monthKey, monthLabel } from './format'

const money0 = (v: number) => money(v)

export interface MonthSummary {
  key: string
  label: string
  income: number
  expense: number
  savings: number
  rate: number
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0)
const std = (xs: number[]) => {
  const m = mean(xs)
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
}

export const currentMonthKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function lastMonthKeys(n: number, offset = 0) {
  const d = new Date()
  const keys: string[] = []
  for (let i = n - 1 + offset; i >= offset; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1)
    keys.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

export function monthlySummary(txs: Transaction[], n = 12): MonthSummary[] {
  const keys = lastMonthKeys(n)
  const map = new Map(keys.map((k) => [k, { income: 0, expense: 0 }]))
  for (const t of txs) {
    const e = map.get(monthKey(t.date))
    if (!e) continue
    if (t.type === 'income') e.income += t.amount
    else e.expense += t.amount
  }
  return keys.map((k) => {
    const { income, expense } = map.get(k)!
    const savings = income - expense
    return { key: k, label: monthLabel(k), income, expense, savings, rate: income ? savings / income : 0 }
  })
}

/** Averages over the last 3 *complete* months — the current month is partial. */
export function baseline(txs: Transaction[]) {
  const full = monthlySummary(txs, 4).slice(0, 3)
  const income = mean(full.map((m) => m.income))
  const expense = mean(full.map((m) => m.expense))
  return { income, expense, savings: income - expense, rate: income ? (income - expense) / income : 0 }
}

export function categoryBreakdown(txs: Transaction[], key: string | string[], type: 'expense' | 'income' = 'expense') {
  const keys = Array.isArray(key) ? new Set(key) : new Set([key])
  const map = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== type || !keys.has(monthKey(t.date))) continue
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
  }
  return [...map.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount)
}

export function netWorth(accounts: Account[]) {
  const assets = sum(accounts.filter((a) => a.kind === 'asset').map((a) => a.balance))
  const liabilities = sum(accounts.filter((a) => a.kind === 'liability').map((a) => a.balance))
  const liquid = sum(accounts.filter((a) => a.group === 'Cash').map((a) => a.balance))
  const invested = sum(accounts.filter((a) => a.group === 'Investments' || a.group === 'Retirement').map((a) => a.balance))
  return { assets, liabilities, net: assets - liabilities, liquid, invested }
}

/** Reconstructs a plausible 12-month net worth path ending at today's value. */
export function netWorthHistory(txs: Transaction[], accounts: Account[]) {
  const months = monthlySummary(txs, 12)
  const { net } = netWorth(accounts)
  const marketDrift = [0.006, -0.012, 0.018, 0.009, -0.004, 0.021, 0.011, -0.008, 0.015, 0.007, 0.013, 0.004]
  const out: { key: string; label: string; value: number }[] = []
  let v = net
  for (let i = months.length - 1; i >= 0; i--) {
    out.unshift({ key: months[i].key, label: months[i].label, value: Math.round(v) })
    v = (v - months[i].savings) / (1 + marketDrift[i] * 0.6)
  }
  return out
}

// ---------- Budgets ----------
export function budgetStatus(txs: Transaction[], budgets: Budget[], key = currentMonthKey()) {
  const spent = new Map(categoryBreakdown(txs, key).map((c) => [c.category, c.amount]))
  const now = new Date()
  const isCurrent = key === currentMonthKey()
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const elapsed = isCurrent ? now.getDate() / dim : 1
  // Recurring charges (rent, subscriptions) are fixed: only variable spend is extrapolated by pace
  const recurring = new Map<string, number>()
  for (const t of txs) {
    if (t.type === 'expense' && t.recurring && t.date.startsWith(key)) recurring.set(t.category, (recurring.get(t.category) ?? 0) + t.amount)
  }
  return budgets.map((b) => {
    const s = spent.get(b.category) ?? 0
    const fixed = recurring.get(b.category) ?? 0
    const projected = isCurrent && elapsed > 0 ? fixed + (s - fixed) / elapsed : s
    const used = b.limit ? s / b.limit : 0
    const status: 'good' | 'warn' | 'bad' = s > b.limit ? 'bad' : projected > b.limit ? 'warn' : 'good'
    return { ...b, spent: s, projected, used, remaining: b.limit - s, status }
  })
}

// ---------- Goals ----------
export function goalProjection(g: Goal) {
  const now = new Date()
  const deadline = new Date(g.deadline)
  const monthsLeft = Math.max(1, (deadline.getFullYear() - now.getFullYear()) * 12 + deadline.getMonth() - now.getMonth())
  const remaining = Math.max(0, g.target - g.saved)
  const required = remaining / monthsLeft
  const monthsAtPace = g.monthlyContribution > 0 ? Math.ceil(remaining / g.monthlyContribution) : Infinity
  const eta = new Date(now.getFullYear(), now.getMonth() + (Number.isFinite(monthsAtPace) ? monthsAtPace : 0), 1)
  const onTrack = g.monthlyContribution >= required * 0.98
  return { monthsLeft, remaining, required, monthsAtPace, eta, onTrack, progress: g.target ? g.saved / g.target : 0 }
}

// ---------- Health score ----------
export type Level = 'good' | 'warn' | 'bad'

export interface HealthComponent {
  key: string
  label: string
  score: number
  weight: number
  value: string
  target: string
  detail: string
}

export interface Risk {
  title: string
  level: Level
  metric: string
  detail: string
}

export interface Recommendation {
  title: string
  detail: string
  impact: string
  category: 'Savings' | 'Spending' | 'Debt' | 'Investing' | 'Protection' | 'Goals'
  priority: 'high' | 'medium' | 'low'
}

export const CREDIT_LIMIT = 300000

export function healthReport(txs: Transaction[], accounts: Account[], budgets: Budget[], goals: Goal[], profile: Profile) {
  const base = baseline(txs)
  const nw = netWorth(accounts)
  const months = monthlySummary(txs, 7).slice(0, 6)
  const bstat = budgetStatus(txs, budgets)
  const cc = accounts.find((a) => a.group === 'Credit')?.balance ?? 0

  const emergencyMonths = base.expense ? nw.liquid / base.expense : 0
  const dti = base.income ? profile.monthlyEmi / base.income : 0
  const investRatio = nw.assets ? nw.invested / nw.assets : 0
  const cv = mean(months.map((m) => m.expense)) ? std(months.map((m) => m.expense)) / mean(months.map((m) => m.expense)) : 0
  const onBudget = bstat.length ? bstat.filter((b) => b.status !== 'bad').length / bstat.length : 1
  const ccUtil = cc / CREDIT_LIMIT

  const components: HealthComponent[] = [
    {
      key: 'savings', label: 'Savings rate', weight: 25,
      score: clamp((base.rate / 0.3) * 100),
      value: `${(base.rate * 100).toFixed(1)}%`, target: '≥ 30%',
      detail: 'Share of take-home income kept each month (3-month average).',
    },
    {
      key: 'emergency', label: 'Emergency fund', weight: 20,
      score: clamp((emergencyMonths / 6) * 100),
      value: `${emergencyMonths.toFixed(1)} mo`, target: '6 months',
      detail: 'Months of expenses covered by liquid cash and liquid funds.',
    },
    {
      key: 'debt', label: 'Debt-to-income', weight: 15,
      score: clamp(100 - ((dti - 0.1) / 0.4) * 100),
      value: `${(dti * 100).toFixed(1)}%`, target: '≤ 20%',
      detail: 'Monthly EMIs as a share of income.',
    },
    {
      key: 'budget', label: 'Budget discipline', weight: 15,
      score: clamp(onBudget * 100),
      value: `${bstat.filter((b) => b.status !== 'bad').length}/${bstat.length}`, target: 'All on budget',
      detail: 'Budget categories currently within their monthly limit.',
    },
    {
      key: 'invest', label: 'Wealth allocation', weight: 15,
      score: clamp((investRatio / 0.65) * 100),
      value: `${(investRatio * 100).toFixed(0)}%`, target: '≥ 65% invested',
      detail: 'Share of assets working in equity, debt and retirement funds.',
    },
    {
      key: 'stability', label: 'Spending stability', weight: 10,
      score: clamp(100 - ((cv - 0.05) / 0.25) * 100),
      value: `±${(cv * 100).toFixed(0)}%`, target: '≤ ±10%',
      detail: 'Month-to-month variation in total spending.',
    },
  ]

  const score = Math.round(sum(components.map((c) => c.score * c.weight)) / sum(components.map((c) => c.weight)))
  const grade = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'Fair' : 'Needs attention'

  const lvl = (good: boolean, warn: boolean): Level => (good ? 'good' : warn ? 'warn' : 'bad')
  const offTrack = goals.filter((g) => !goalProjection(g).onTrack)
  const overBudget = bstat.filter((b) => b.status === 'bad')
  const subs = categoryBreakdown(txs, lastMonthKeys(1, 1)).find((c) => c.category === 'Subscriptions')?.amount ?? 0
  const subCount = new Set(txs.filter((t) => t.category === 'Subscriptions' && t.date.startsWith(lastMonthKeys(1, 1)[0])).map((t) => t.description)).size

  const risks: Risk[] = [
    { title: 'Liquidity risk', level: lvl(emergencyMonths >= 6, emergencyMonths >= 3), metric: `${emergencyMonths.toFixed(1)} months covered`, detail: emergencyMonths >= 6 ? 'Your cash buffer can absorb a 6-month income shock.' : `You need ${money0(Math.max(0, 6 * base.expense - nw.liquid))} more in liquid assets to reach a 6-month buffer.` },
    { title: 'Credit utilisation', level: lvl(ccUtil < 0.1, ccUtil < 0.3), metric: `${(ccUtil * 100).toFixed(0)}% of limit`, detail: 'Keeping utilisation under 30% protects your CIBIL score.' },
    { title: 'Debt burden', level: lvl(dti < 0.2, dti < 0.35), metric: `${(dti * 100).toFixed(0)}% DTI`, detail: `Car loan EMI of ${money0(profile.monthlyEmi)} is the only active debt.` },
    { title: 'Budget overruns', level: lvl(overBudget.length === 0, overBudget.length <= 2), metric: `${overBudget.length} over limit`, detail: overBudget.length ? `Over budget in ${overBudget.map((b) => b.category).join(', ')} this month.` : 'Every category is within its limit this month.' },
    { title: 'Goal shortfall', level: lvl(offTrack.length === 0, offTrack.length <= 1), metric: `${offTrack.length} of ${goals.length} off-track`, detail: offTrack.length ? `${offTrack.map((g) => g.name).join(', ')} need higher monthly contributions.` : 'All goals are funded at the required pace.' },
    { title: 'Spending volatility', level: lvl(cv < 0.1, cv < 0.2), metric: `±${(cv * 100).toFixed(0)}% / month`, detail: 'Festive months and travel drive most of the variance.' },
  ]

  const recommendations: Recommendation[] = []
  if (base.rate < 0.3)
    recommendations.push({ title: 'Automate a step-up SIP', category: 'Savings', priority: 'high', detail: `Raise your savings rate from ${(base.rate * 100).toFixed(0)}% toward 30% by auto-investing ${money0(Math.round(((0.3 - base.rate) * base.income) / 1000) * 1000)} more on salary day.`, impact: `+${money0(((0.3 - base.rate) * base.income * 12))} / year invested` })
  if (emergencyMonths < 5.5)
    recommendations.push({ title: 'Top up your emergency fund', category: 'Protection', priority: 'high', detail: `Park ${money0(Math.ceil((6 * base.expense - nw.liquid) / 6 / 1000) * 1000)} / month in a liquid fund for 6 months to reach full coverage.`, impact: `${emergencyMonths.toFixed(1)} → 6.0 months buffer` })
  const dining = categoryBreakdown(txs, lastMonthKeys(3, 1)).find((c) => c.category === 'Food & Dining')
  if (dining && dining.amount / 3 > 10000)
    recommendations.push({ title: 'Trim food delivery spend', category: 'Spending', priority: 'medium', detail: `You average ${money0(dining.amount / 3)} / month on dining & delivery. Cutting 25% frees up meaningful cash.`, impact: `${money0((dining.amount / 3) * 0.25 * 12)} / year saved` })
  if (subs > 2500)
    recommendations.push({ title: 'Audit subscriptions', category: 'Spending', priority: 'low', detail: `${money0(subs)} / month goes to ${subCount} subscriptions. Pause the ones you used less than twice last month.`, impact: `Up to ${money0(subs * 0.4 * 12)} / year` })
  const carLoan = accounts.find((a) => a.group === 'Loans')?.balance ?? 0
  if (carLoan > 100000)
    recommendations.push({ title: 'Prepay the car loan', category: 'Debt', priority: 'medium', detail: `Prepaying ${money0(100000)} on your car loan (9.2% p.a.) beats most debt-fund returns post-tax.`, impact: `Saves ~${money0(19000)} interest, closes loan 7 months early` })
  if (investRatio < 0.65)
    recommendations.push({ title: 'Put idle cash to work', category: 'Investing', priority: 'medium', detail: 'Savings account balance above 1 month of expenses earns ~3%. Move the excess into your equity index fund.', impact: '+4–6% expected annual return on idle cash' })
  for (const g of offTrack.slice(0, 2)) {
    const p = goalProjection(g)
    recommendations.push({ title: `Rebalance "${g.name}"`, category: 'Goals', priority: g.priority === 'high' ? 'high' : 'low', detail: `Needs ${money0(p.required)} / month to hit the deadline, you contribute ${money0(g.monthlyContribution)}.`, impact: `Close a ${money0(p.required - g.monthlyContribution)} / month gap` })
  }

  return { score, grade, components, risks, recommendations, metrics: { emergencyMonths, dti, investRatio, cv, ccUtil, base, nw } }
}


// ---------- Forecast ----------
export function forecast(txs: Transaction[], accounts: Account[], monthsAhead = 6) {
  const hist = monthlySummary(txs, 7).slice(0, 6)
  const xs = hist.map((_, i) => i)
  const fit = (ys: number[]) => {
    const mx = mean(xs), my = mean(ys)
    const slope = sum(xs.map((x, i) => (x - mx) * (ys[i] - my))) / sum(xs.map((x) => (x - mx) ** 2))
    return { slope: slope * 0.5, intercept: my - slope * 0.5 * mx, sd: std(ys) } // dampened trend
  }
  const fi = fit(hist.map((m) => m.income))
  const fe = fit(hist.map((m) => m.expense))
  const { liquid } = netWorth(accounts)
  const now = new Date()
  const out: { key: string; label: string; income: number; expense: number; net: number; low: number; high: number; balance: number; band: [number, number] }[] = []
  let bal = liquid
  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const x = hist.length + i
    const seasonal = d.getMonth() === 11 ? 1.08 : d.getMonth() === 0 ? 0.95 : 1
    const income = Math.round(fi.intercept + fi.slope * x)
    const expense = Math.round((fe.intercept + fe.slope * x) * seasonal)
    const spread = Math.sqrt(fi.sd ** 2 + fe.sd ** 2) * (0.6 + i * 0.15)
    const net = income - expense
    bal += net
    out.push({ key, label: monthLabel(key), income, expense, net, low: Math.round(net - spread), high: Math.round(net + spread), balance: Math.round(bal), band: [Math.round(net - spread), Math.round(net + spread)] })
  }
  return { history: hist, projection: out }
}

export function upcomingBills(txs: Transaction[]) {
  const lastFull = lastMonthKeys(1, 1)[0]
  const now = new Date()
  const seen = new Set<string>()
  const bills: { description: string; category: string; amount: number; due: Date; daysLeft: number }[] = []
  for (const t of txs) {
    if (!t.recurring || t.type !== 'expense' || monthKey(t.date) !== lastFull || seen.has(t.description)) continue
    seen.add(t.description)
    const day = Number(t.date.slice(8))
    let due = new Date(now.getFullYear(), now.getMonth(), day)
    if (due < new Date(now.getFullYear(), now.getMonth(), now.getDate())) due = new Date(now.getFullYear(), now.getMonth() + 1, day)
    bills.push({ description: t.description, category: t.category, amount: t.amount, due, daysLeft: Math.round((+due - +now) / 864e5) })
  }
  return bills.sort((a, b) => +a.due - +b.due)
}

// ---------- Simulator ----------
export interface SimParams {
  incomeChange: number // %
  expenseChange: number // %
  extraInvest: number // per month
  annualReturn: number // %
  inflation: number // %
  years: number
  salaryGrowth: number // % per year
  windfall: number // one-time, can be negative (e.g. large purchase)
}

export function simulate(startNet: number, income: number, expense: number, p: SimParams) {
  const sInc = income * (1 + p.incomeChange / 100)
  // extraInvest is money redirected from spending into investments each month
  const sExp = expense * (1 + p.expenseChange / 100) - p.extraInvest
  const r = p.annualReturn / 100 / 12

  const run = (inc: number, exp: number, start: number, untilFI = false) => {
    let v = start, i = inc, e = exp, fi = exp * 12 * 25
    const series: number[] = [v]
    for (let m = 1; m <= (untilFI ? 50 : p.years) * 12; m++) {
      v = v * (1 + r) + (i - e)
      if (m % 12 === 0) {
        series.push(v)
        i *= 1 + p.salaryGrowth / 100
        e *= 1 + p.inflation / 100
        fi *= 1 + p.inflation / 100
      }
      if (untilFI && v >= fi) return { series, fiYears: m / 12 }
    }
    return { series, fiYears: null as number | null }
  }

  const base = run(income, expense, startNet).series
  const scen = run(sInc, sExp, startNet + p.windfall).series
  const deflate = (y: number) => Math.pow(1 + p.inflation / 100, y)
  const data = base.map((b, y) => ({
    year: y === 0 ? 'Now' : `Y${y}`,
    baseline: Math.round(b),
    scenario: Math.round(scen[y]),
    scenarioReal: Math.round(scen[y] / deflate(y)),
  }))

  const baseSurplus = income - expense
  const scenSurplus = sInc - sExp
  return {
    data,
    baseSurplus,
    scenSurplus,
    baseRate: income ? baseSurplus / income : 0,
    scenRate: sInc ? scenSurplus / sInc : 0,
    finalBase: base[base.length - 1],
    finalScen: scen[scen.length - 1],
    fiNumber: sExp * 12 * 25,
    yearsToFI: run(sInc, sExp, startNet + p.windfall, true).fiYears,
    baseYearsToFI: run(income, expense, startNet, true).fiYears,
  }
}
