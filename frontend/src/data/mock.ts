import type { Account, Budget, Goal, Profile, Transaction } from './types'

/** Demo data is generated relative to today, so the current month always has live-looking data. */
export const TODAY = new Date()

export const EXPENSE_CATEGORIES = [
  'Housing',
  'Groceries',
  'Food & Dining',
  'Transportation',
  'Utilities',
  'Shopping',
  'Entertainment',
  'Health',
  'Subscriptions',
  'Travel',
  'Education',
  'Insurance',
  'EMI & Loans',
] as const

export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Other Income'] as const

export const ACCOUNTS_LIST = ['HDFC Savings', 'ICICI Credit Card', 'UPI Wallet', 'Zerodha']

// Deterministic PRNG so the demo is identical every load
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

let idCounter = 0
const nid = () => `tx_${(++idCounter).toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`

export function generateTransactions(): Transaction[] {
  const rnd = mulberry32(20261125)
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)]
  const between = (a: number, b: number) => Math.round(a + rnd() * (b - a))
  const txs: Transaction[] = []
  const today = TODAY

  for (let m = 11; m >= 0; m--) {
    const base = new Date(today.getFullYear(), today.getMonth() - m, 1)
    const y = base.getFullYear()
    const mo = base.getMonth()
    const daysInMonth = new Date(y, mo + 1, 0).getDate()
    const lastDay = m === 0 ? today.getDate() : daysInMonth
    const day = (d: number) => iso(new Date(y, mo, d))
    const seasonal = mo === 9 || mo === 10 ? 1.25 : mo === 11 ? 1.15 : 1 // festive season

    const push = (t: Omit<Transaction, 'id'>) => {
      if (Number(t.date.slice(8)) <= lastDay) txs.push({ id: nid(), ...t })
    }

    // Income — salary got a raise in April
    const salary = mo >= 3 && y === today.getFullYear() ? 184000 : 168000
    push({ date: day(1), description: 'Salary — Nimbus Technologies', category: 'Salary', type: 'income', amount: salary, account: 'HDFC Savings', recurring: true })
    if (rnd() > 0.35)
      push({ date: day(between(8, 24)), description: pick(['Upwork — UI audit', 'Freelance dashboard project', 'Toptal consulting']), category: 'Freelance', type: 'income', amount: between(12000, 38000), account: 'HDFC Savings' })
    if (mo % 3 === 2)
      push({ date: day(15), description: 'Mutual fund dividend', category: 'Investments', type: 'income', amount: between(3500, 7200), account: 'Zerodha' })

    // Fixed costs
    push({ date: day(3), description: 'Rent — Prestige Shantiniketan', category: 'Housing', type: 'expense', amount: 32000, account: 'HDFC Savings', recurring: true })
    push({ date: day(5), description: 'Car loan EMI — HDFC', category: 'EMI & Loans', type: 'expense', amount: 14500, account: 'HDFC Savings', recurring: true })
    push({ date: day(7), description: 'BESCOM electricity', category: 'Utilities', type: 'expense', amount: between(1800, 3400), account: 'UPI Wallet', recurring: true })
    push({ date: day(7), description: 'ACT Fibernet', category: 'Utilities', type: 'expense', amount: 1179, account: 'ICICI Credit Card', recurring: true })
    push({ date: day(9), description: 'Jio postpaid', category: 'Utilities', type: 'expense', amount: 699, account: 'ICICI Credit Card', recurring: true })
    push({ date: day(2), description: 'Netflix Premium', category: 'Subscriptions', type: 'expense', amount: 649, account: 'ICICI Credit Card', recurring: true })
    push({ date: day(4), description: 'Spotify Family', category: 'Subscriptions', type: 'expense', amount: 179, account: 'ICICI Credit Card', recurring: true })
    push({ date: day(11), description: 'Cult.fit membership', category: 'Health', type: 'expense', amount: 2499, account: 'ICICI Credit Card', recurring: true })
    push({ date: day(12), description: 'Amazon Prime', category: 'Subscriptions', type: 'expense', amount: 299, account: 'ICICI Credit Card', recurring: true })
    push({ date: day(14), description: 'ChatGPT Plus', category: 'Subscriptions', type: 'expense', amount: 1950, account: 'ICICI Credit Card', recurring: true })
    if (mo === 0 || mo === 6)
      push({ date: day(18), description: 'HDFC Ergo health insurance', category: 'Insurance', type: 'expense', amount: 14200, account: 'HDFC Savings' })
    push({ date: day(20), description: 'LIC term premium', category: 'Insurance', type: 'expense', amount: 2100, account: 'HDFC Savings', recurring: true })

    // Variable spend
    const groceryTrips = between(4, 6)
    for (let i = 0; i < groceryTrips; i++)
      push({ date: day(between(1, lastDay)), description: pick(['BigBasket order', 'Zepto groceries', 'DMart', 'Blinkit']), category: 'Groceries', type: 'expense', amount: Math.round(between(1400, 3800) * seasonal), account: pick(['UPI Wallet', 'ICICI Credit Card']) })
    const meals = between(7, 12)
    for (let i = 0; i < meals; i++)
      push({ date: day(between(1, lastDay)), description: pick(['Swiggy', 'Zomato', 'Third Wave Coffee', 'Truffles', 'Toit Brewpub', 'Meghana Foods']), category: 'Food & Dining', type: 'expense', amount: Math.round(between(350, 2600) * seasonal), account: pick(['UPI Wallet', 'ICICI Credit Card']) })
    const rides = between(6, 10)
    for (let i = 0; i < rides; i++)
      push({ date: day(between(1, lastDay)), description: pick(['Uber', 'Ola', 'Namma Metro recharge', 'Shell petrol']), category: 'Transportation', type: 'expense', amount: between(180, 2900), account: pick(['UPI Wallet', 'ICICI Credit Card']) })
    const shops = between(2, 5)
    for (let i = 0; i < shops; i++)
      push({ date: day(between(1, lastDay)), description: pick(['Amazon.in', 'Myntra', 'Croma', 'IKEA', 'Nykaa', 'Decathlon']), category: 'Shopping', type: 'expense', amount: Math.round(between(900, 7800) * seasonal), account: 'ICICI Credit Card' })
    const fun = between(1, 3)
    for (let i = 0; i < fun; i++)
      push({ date: day(between(1, lastDay)), description: pick(['PVR INOX', 'BookMyShow — concert', 'Steam', 'Bowling at Smaaash']), category: 'Entertainment', type: 'expense', amount: between(600, 3800), account: 'ICICI Credit Card' })
    if (rnd() > 0.55)
      push({ date: day(between(1, lastDay)), description: pick(['Apollo Pharmacy', 'Practo consultation', 'Dental check-up']), category: 'Health', type: 'expense', amount: between(450, 4200), account: 'UPI Wallet' })
    if (mo === 4 || mo === 9 || mo === 11)
      push({ date: day(between(10, 22)), description: pick(['IndiGo — BLR→GOI', 'MakeMyTrip hotel', 'Vistara — BLR→DEL']), category: 'Travel', type: 'expense', amount: between(14000, 26000), account: 'ICICI Credit Card' })
    if (mo === 1 || mo === 7)
      push({ date: day(16), description: 'Coursera Plus annual', category: 'Education', type: 'expense', amount: between(4000, 9000), account: 'ICICI Credit Card' })
  }

  return txs.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export const defaultBudgets: Budget[] = [
  { id: 'b1', category: 'Housing', limit: 33000 },
  { id: 'b2', category: 'Groceries', limit: 18000 },
  { id: 'b3', category: 'Food & Dining', limit: 15000 },
  { id: 'b4', category: 'Transportation', limit: 14000 },
  { id: 'b5', category: 'Shopping', limit: 20000 },
  { id: 'b6', category: 'Utilities', limit: 6000 },
  { id: 'b7', category: 'Entertainment', limit: 6000 },
  { id: 'b8', category: 'Subscriptions', limit: 3500 },
  { id: 'b9', category: 'Health', limit: 6000 },
]

const addMonths = (n: number) => iso(new Date(TODAY.getFullYear(), TODAY.getMonth() + n, 1))

export const defaultGoals: Goal[] = [
  { id: 'g1', name: 'Emergency Fund', target: 600000, saved: 420000, deadline: addMonths(12), monthlyContribution: 15000, icon: 'shield', priority: 'high' },
  { id: 'g2', name: 'Home Down Payment', target: 2500000, saved: 780000, deadline: addMonths(48), monthlyContribution: 22500, icon: 'home', priority: 'high' },
  { id: 'g3', name: 'Europe Trip 2027', target: 300000, saved: 200000, deadline: addMonths(10), monthlyContribution: 10000, icon: 'plane', priority: 'medium' },
  { id: 'g4', name: 'MacBook Pro M5', target: 240000, saved: 210000, deadline: addMonths(4), monthlyContribution: 7500, icon: 'laptop', priority: 'low' },
]

export const defaultAccounts: Account[] = [
  { id: 'a1', name: 'HDFC Savings', kind: 'asset', group: 'Cash', balance: 286400, institution: 'HDFC Bank' },
  { id: 'a2', name: 'Liquid Fund', kind: 'asset', group: 'Cash', balance: 420000, institution: 'Parag Parikh' },
  { id: 'a3', name: 'Equity Mutual Funds', kind: 'asset', group: 'Investments', balance: 1240000, institution: 'Zerodha Coin' },
  { id: 'a4', name: 'Direct Stocks', kind: 'asset', group: 'Investments', balance: 538000, institution: 'Zerodha' },
  { id: 'a5', name: 'EPF + PPF', kind: 'asset', group: 'Retirement', balance: 1610000, institution: 'EPFO / SBI' },
  { id: 'a6', name: 'Sovereign Gold Bonds', kind: 'asset', group: 'Investments', balance: 182000, institution: 'RBI' },
  { id: 'a7', name: 'ICICI Credit Card', kind: 'liability', group: 'Credit', balance: 48600, institution: 'ICICI Bank' },
  { id: 'a8', name: 'Car Loan', kind: 'liability', group: 'Loans', balance: 392000, institution: 'HDFC Bank' },
]

export const defaultProfile: Profile = {
  name: 'Aarav Mehta',
  email: 'demo@wealthwise.app',
  currency: 'INR',
  riskAppetite: 'balanced',
  monthlyEmi: 14500,
}
