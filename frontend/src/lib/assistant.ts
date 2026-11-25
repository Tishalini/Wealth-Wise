/**
 * WealthWise AI — on-device analysis engine (demo mode).
 *
 * Every answer is computed from the user's live data (transactions, budgets, goals,
 * balances). In production, swap `answer()` for a call to the Python backend
 * (e.g. POST /api/assistant) that grounds an LLM on the same metrics.
 */
import type { Account, Budget, Goal, Profile, Transaction } from '../data/types'
import { baseline, budgetStatus, categoryBreakdown, forecast, goalProjection, healthReport, lastMonthKeys, monthlySummary, netWorth } from './analytics'
import { money, monthLabel } from './format'

export interface Data {
  transactions: Transaction[]
  accounts: Account[]
  budgets: Budget[]
  goals: Goal[]
  profile: Profile
}

export interface Reply {
  text: string
  bullets?: string[]
  table?: { head: string[]; rows: string[][] }
  followUps?: string[]
}

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w))

export const SUGGESTIONS = [
  'How am I doing financially this month?',
  'Where can I cut back on spending?',
  'Can I afford a ₹1.5L vacation in March?',
  'Am I on track for my goals?',
  'Explain my financial health score',
  'What will my cash flow look like next quarter?',
  'Review my subscriptions',
  'How should I invest my surplus?',
]

export function answer(question: string, d: Data): Reply {
  const q = question.toLowerCase()
  const base = baseline(d.transactions)
  const nw = netWorth(d.accounts)
  const report = healthReport(d.transactions, d.accounts, d.budgets, d.goals, d.profile)
  const last3 = lastMonthKeys(3, 1)

  // ---- Explain a specific recommendation (deep link from the Health page) ----
  if (q.startsWith('explain:')) {
    const rec = report.recommendations.find((r) => q.includes(r.title.toLowerCase()))
    if (rec) {
      return {
        text: `**${rec.title}** — here's the reasoning:`,
        bullets: [rec.detail, `Expected impact: **${rec.impact}**.`, `This targets your ${rec.category.toLowerCase()} pillar, which feeds directly into your health score of ${report.score}/100.`],
        followUps: ['Explain my financial health score', 'Simulate this change'],
      }
    }
  }

  // ---- Affordability -------------------------------------------------------
  if (has(q, 'afford', 'buy', 'purchase')) {
    const amt = parseAmount(q) ?? 150000
    const months = Math.max(1, parseMonthsAway(q) ?? 4)
    const surplus = base.savings
    const goalLoad = d.goals.reduce((a, g) => a + g.monthlyContribution, 0)
    const free = Math.max(0, surplus - goalLoad)
    const saveable = free * months
    const bufferAfter = (nw.liquid - Math.max(0, amt - saveable)) / base.expense
    const verdict = saveable >= amt ? 'Yes — comfortably.' : bufferAfter >= 4 ? 'Yes, with a trade-off.' : 'Not without risk right now.'
    return {
      text: `**${verdict}** A ${money(amt)} expense in ${months} month${months > 1 ? 's' : ''} breaks down like this:`,
      bullets: [
        `Your average monthly surplus is **${money(surplus)}**, of which **${money(Math.min(goalLoad, surplus))}** is committed to goals — leaving **${money(free)}** free.`,
        `Saving only the free surplus gets you **${money(saveable)}** by then${saveable >= amt ? ', which fully covers it.' : `, a gap of **${money(amt - saveable)}**.`}`,
        saveable >= amt
          ? 'Your emergency fund and goals stay untouched.'
          : `Covering the gap from liquid savings would leave **${bufferAfter.toFixed(1)} months** of expenses as a buffer (target: 6).`,
        `Alternative: pause the "${d.goals.find((g) => g.priority === 'low')?.name ?? 'lowest-priority'}" contribution for ${months} months to fund it without touching savings.`,
      ],
      followUps: ['What if I cut dining out to save faster?', 'Am I on track for my goals?'],
    }
  }

  // ---- Cut back / spending -------------------------------------------------
  if (has(q, 'cut', 'reduce', 'save more', 'overspend', 'spending', 'spend', 'dining', 'food')) {
    const now = categoryBreakdown(d.transactions, last3)
    const prev = categoryBreakdown(d.transactions, lastMonthKeys(3, 4))
    const prevMap = new Map(prev.map((c) => [c.category, c.amount]))
    const discretionary = ['Food & Dining', 'Shopping', 'Entertainment', 'Travel', 'Subscriptions', 'Transportation', 'Groceries']
    const rows = now
      .filter((c) => discretionary.includes(c.category))
      .map((c) => {
        const avg = c.amount / 3
        const change = prevMap.get(c.category) ? c.amount / prevMap.get(c.category)! - 1 : 0
        const cutPct = c.category === 'Groceries' ? 0.1 : c.category === 'Transportation' ? 0.15 : 0.25
        return { cat: c.category, avg, change, save: avg * cutPct, cutPct }
      })
      .sort((a, b) => b.save - a.save)
    const total = rows.slice(0, 4).reduce((a, r) => a + r.save, 0)
    const topMerchant = topMerchants(d.transactions, last3, 'Food & Dining')[0]
    return {
      text: `I analysed your last 90 days of discretionary spending. Realistic trims across your top 4 categories could free up **${money(total)} / month** (≈ ${money(total * 12, { compact: true })} a year) without touching essentials.`,
      table: {
        head: ['Category', 'Avg / month', 'vs prior 3 mo', 'Suggested cut', 'Monthly saving'],
        rows: rows.slice(0, 5).map((r) => [r.cat, money(r.avg), `${r.change >= 0 ? '+' : ''}${(r.change * 100).toFixed(0)}%`, `${(r.cutPct * 100).toFixed(0)}%`, money(r.save)]),
      },
      bullets: [
        topMerchant ? `**${topMerchant.name}** is your most frequent dining merchant — ${topMerchant.count} orders, ${money(topMerchant.total)} in 90 days. Capping delivery to weekends alone typically saves 30–40%.` : 'Food delivery is the easiest lever for most users.',
        `Investing that ${money(total)} monthly at 11% grows to roughly **${money(fv(total, 0.11, 10), { compact: true })}** in 10 years.`,
      ],
      followUps: ['Review my subscriptions', 'Simulate saving this amount'],
    }
  }

  // ---- Subscriptions ---------------------------------------------------------
  if (has(q, 'subscription', 'netflix', 'recurring')) {
    const lastKey = lastMonthKeys(1, 1)[0]
    const subs = d.transactions.filter((t) => t.category === 'Subscriptions' && t.date.startsWith(lastKey))
    const total = subs.reduce((a, t) => a + t.amount, 0)
    return {
      text: `You have **${subs.length} active subscriptions** costing **${money(total)} / month** (${money(total * 12)} per year).`,
      table: { head: ['Service', 'Monthly', 'Yearly'], rows: subs.map((s) => [s.description, money(s.amount), money(s.amount * 12)]) },
      bullets: [
        'Netflix Premium → Standard saves ~₹150/month if you rarely watch in 4K.',
        'Amazon Prime is cheaper on the annual plan (₹1,499/yr vs ₹299/mo) — saves ~₹2,000/year.',
        'Consider rotating streaming services month-to-month rather than holding them all.',
      ],
      followUps: ['Where can I cut back on spending?'],
    }
  }

  // ---- Goals -----------------------------------------------------------------
  if (has(q, 'goal', 'on track', 'target', 'down payment', 'emergency fund')) {
    const rows = d.goals.map((g) => ({ g, p: goalProjection(g) }))
    const off = rows.filter((r) => !r.p.onTrack)
    return {
      text: off.length === 0 ? `**All ${rows.length} goals are on track.** Here's where each one stands:` : `**${rows.length - off.length} of ${rows.length} goals are on track.** ${off.map((r) => `"${r.g.name}"`).join(' and ')} need${off.length === 1 ? 's' : ''} attention.`,
      table: {
        head: ['Goal', 'Progress', 'Needed / mo', 'Contributing', 'Status'],
        rows: rows.map(({ g, p }) => [g.name, `${(p.progress * 100).toFixed(0)}%`, money(p.required), money(g.monthlyContribution), p.onTrack ? 'On track' : 'Behind']),
      },
      bullets: off.map(({ g, p }) => `**${g.name}:** raise contribution by ${money(p.required - g.monthlyContribution)}/mo, or extend the deadline to ${p.eta.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}.`),
      followUps: ['Can I afford a ₹1.5L vacation in March?', 'How should I invest my surplus?'],
    }
  }

  // ---- Health score ---------------------------------------------------------
  if (has(q, 'health', 'score', 'risk', 'explain')) {
    const sorted = [...report.components].sort((a, b) => a.score - b.score)
    return {
      text: `Your financial health score is **${report.score}/100 (${report.grade})**. It's a weighted blend of six pillars:`,
      table: { head: ['Pillar', 'Your value', 'Target', 'Score', 'Weight'], rows: report.components.map((c) => [c.label, c.value, c.target, `${Math.round(c.score)}`, `${c.weight}%`]) },
      bullets: [
        `**Strongest:** ${sorted[sorted.length - 1].label} (${Math.round(sorted[sorted.length - 1].score)}/100).`,
        `**Weakest:** ${sorted[0].label} (${Math.round(sorted[0].score)}/100) — ${sorted[0].detail.toLowerCase()}`,
        `Top action: **${report.recommendations[0]?.title}** — ${report.recommendations[0]?.impact}.`,
      ],
      followUps: ['Where can I cut back on spending?', 'Am I on track for my goals?'],
    }
  }

  // ---- Forecast ---------------------------------------------------------------
  if (has(q, 'forecast', 'next month', 'quarter', 'cash flow', 'cashflow', 'predict', 'future')) {
    const f = forecast(d.transactions, d.accounts, 3).projection
    const total = f.reduce((a, p) => a + p.net, 0)
    return {
      text: `Over the next 3 months I project **${money(total)}** in net savings, ending with about **${money(f[2].balance, { compact: true })}** in liquid accounts.`,
      table: { head: ['Month', 'Income', 'Expenses', 'Net', 'Range'], rows: f.map((p) => [p.label, money(p.income), money(p.expense), money(p.net), `${money(p.low, { compact: true })} – ${money(p.high, { compact: true })}`]) },
      bullets: [
        'Projection uses a dampened trend of your last 6 months plus seasonal adjustments (December spend typically runs ~8% higher).',
        `The tightest month is **${f.reduce((m, p) => (p.net < m.net ? p : m)).label}** — schedule big purchases outside it.`,
      ],
      followUps: ['Can I afford a ₹1.5L vacation in March?'],
    }
  }

  // ---- Investing ------------------------------------------------------------
  if (has(q, 'invest', 'sip', 'mutual fund', 'stock', 'surplus', 'portfolio')) {
    const free = Math.max(base.savings * 0.25, base.savings - d.goals.reduce((a, g) => a + g.monthlyContribution, 0))
    const risk = d.profile.riskAppetite
    const mix = risk === 'aggressive' ? [75, 15, 10] : risk === 'balanced' ? [60, 30, 10] : [35, 50, 15]
    return {
      text: `You can direct about **${money(free)} / month** to long-term investing alongside your goals. For a **${risk}** risk profile, a sensible split is:`,
      table: {
        head: ['Bucket', 'Allocation', 'Monthly', 'Example'],
        rows: [
          ['Equity', `${mix[0]}%`, money((free * mix[0]) / 100), 'Nifty 50 index fund, flexi-cap fund'],
          ['Debt', `${mix[1]}%`, money((free * mix[1]) / 100), 'PPF, short-duration debt fund'],
          ['Gold', `${mix[2]}%`, money((free * mix[2]) / 100), 'Sovereign Gold Bonds'],
        ],
      },
      bullets: [
        `Your current invested share of assets is **${(report.metrics.investRatio * 100).toFixed(0)}%**; target 65%+.`,
        'Keep the emergency fund in a liquid fund, not equity.',
        '_This is educational guidance, not personalised investment advice._',
      ],
      followUps: ['Simulate investing this amount', 'Am I on track for my goals?'],
    }
  }

  // ---- Simulate (handoff) -----------------------------------------------------
  if (has(q, 'simulat', 'what if', 'scenario')) {
    return {
      text: 'The **Scenario Simulator** lets you model this interactively — drag income, expense and investment sliders and watch your 15-year net worth update live.',
      bullets: ['Try the **"Save 15% more"** preset to see the effect of redirecting ₹20K/month.', 'Switch to **Today\'s ₹** to see results adjusted for inflation.'],
      followUps: ['How am I doing financially this month?'],
    }
  }

  // ---- Default: monthly overview -------------------------------------------
  const months = monthlySummary(d.transactions, 2)
  const last = monthlySummary(d.transactions, 4).slice(0, 3)
  const bs = budgetStatus(d.transactions, d.budgets)
  const over = bs.filter((b) => b.status === 'bad')
  const watch = bs.filter((b) => b.status === 'warn')
  const cur = months[1]
  return {
    text: `Here's your snapshot for **${monthLabel(cur.key, true)}** so far. Overall you're in **${report.grade.toLowerCase()}** shape with a health score of **${report.score}/100**.`,
    bullets: [
      `**Income:** ${money(cur.income)} · **Spent:** ${money(cur.expense)} · **Saved:** ${money(cur.savings)} (${(cur.rate * 100).toFixed(0)}%).`,
      `Your 3-month average savings rate is **${(base.rate * 100).toFixed(1)}%** — ${base.rate >= 0.3 ? 'excellent, above the 30% benchmark.' : base.rate >= 0.2 ? 'solid, but there is room to reach 30%.' : 'below the 20% minimum we recommend.'}`,
      over.length ? `**Over budget:** ${over.map((b) => `${b.category} (${money(-b.remaining)} over)`).join(', ')}.` : 'No categories are over budget yet.',
      watch.length ? `**Watch:** ${watch.map((b) => b.category).join(', ')} are on pace to exceed their limits.` : 'Spending pace is within limits across all categories.',
      `Net worth stands at **${money(nw.net, { compact: true })}**, with ${money(nw.liquid, { compact: true })} liquid.`,
      `Best month recently: **${last.reduce((m, x) => (x.savings > m.savings ? x : m)).label}** (${money(last.reduce((m, x) => (x.savings > m.savings ? x : m)).savings)} saved).`,
    ],
    followUps: ['Where can I cut back on spending?', 'Explain my financial health score', 'What will my cash flow look like next quarter?'],
  }
}

function topMerchants(txs: Transaction[], keys: string[], category: string) {
  const set = new Set(keys)
  const map = new Map<string, { count: number; total: number }>()
  for (const t of txs) {
    if (t.category !== category || !set.has(t.date.slice(0, 7))) continue
    const e = map.get(t.description) ?? { count: 0, total: 0 }
    e.count++
    e.total += t.amount
    map.set(t.description, e)
  }
  return [...map.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count)
}

const fv = (pmt: number, rate: number, years: number) => {
  const r = rate / 12, n = years * 12
  return pmt * ((Math.pow(1 + r, n) - 1) / r)
}

function parseAmount(q: string): number | null {
  const m = q.replace(/,/g, '').match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(l|lakh|lakhs|k|cr|crore)?\b/)
  if (!m) return null
  const n = parseFloat(m[1])
  const unit = m[2]
  if (unit === 'l' || unit === 'lakh' || unit === 'lakhs') return n * 1e5
  if (unit === 'k') return n * 1e3
  if (unit === 'cr' || unit === 'crore') return n * 1e7
  return n < 1000 ? null : n
}

function parseMonthsAway(q: string): number | null {
  const names = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  const idx = names.findIndex((n) => new RegExp(`\\b${n}`).test(q))
  if (idx >= 0) {
    const now = new Date().getMonth()
    return ((idx - now + 12) % 12) || 12
  }
  const m = q.match(/(\d+)\s*months?/)
  return m ? Number(m[1]) : null
}
