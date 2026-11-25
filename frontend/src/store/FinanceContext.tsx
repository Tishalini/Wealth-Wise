import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Account, Budget, Goal, Profile, Transaction } from '../data/types'
import { defaultAccounts, defaultBudgets, defaultGoals, defaultProfile, generateTransactions } from '../data/mock'
import { setCurrency } from '../lib/format'

const STORAGE_KEY = 'wealthwise:v2'

interface State {
  transactions: Transaction[]
  budgets: Budget[]
  goals: Goal[]
  accounts: Account[]
  profile: Profile
}

export interface Toast {
  id: number
  message: string
  tone: 'success' | 'info' | 'danger'
}

interface Ctx extends State {
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  updateTransaction: (t: Transaction) => void
  deleteTransaction: (id: string) => void
  upsertBudget: (b: Omit<Budget, 'id'> & { id?: string }) => void
  deleteBudget: (id: string) => void
  upsertGoal: (g: Omit<Goal, 'id'> & { id?: string }) => void
  deleteGoal: (id: string) => void
  contributeToGoal: (id: string, amount: number) => void
  updateProfile: (p: Partial<Profile>) => void
  resetDemo: () => void
  toasts: Toast[]
  notify: (message: string, tone?: Toast['tone']) => void
}

const FinanceContext = createContext<Ctx | null>(null)

const fresh = (): State => ({
  transactions: generateTransactions(),
  budgets: defaultBudgets,
  goals: defaultGoals,
  accounts: defaultAccounts,
  profile: defaultProfile,
})

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw) as State & { savedMonth?: string }
      // Regenerate demo data when a new month starts so charts stay current
      const month = new Date().toISOString().slice(0, 7)
      if (s.savedMonth === month) return s
    }
  } catch {
    /* ignore corrupt storage */
  }
  return fresh()
}

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load)
  const [toasts, setToasts] = useState<Toast[]>([])

  setCurrency(state.profile.currency)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedMonth: new Date().toISOString().slice(0, 7) }))
  }, [state])

  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  const value = useMemo<Ctx>(() => {
    const sortTx = (xs: Transaction[]) => [...xs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    return {
      ...state,
      toasts,
      notify,
      addTransaction: (t) => setState((s) => ({ ...s, transactions: sortTx([{ ...t, id: uid('tx') }, ...s.transactions]) })),
      updateTransaction: (t) => setState((s) => ({ ...s, transactions: sortTx(s.transactions.map((x) => (x.id === t.id ? t : x))) })),
      deleteTransaction: (id) => setState((s) => ({ ...s, transactions: s.transactions.filter((x) => x.id !== id) })),
      upsertBudget: (b) =>
        setState((s) => ({
          ...s,
          budgets: b.id ? s.budgets.map((x) => (x.id === b.id ? { ...x, ...b, id: x.id } : x)) : [...s.budgets, { ...b, id: uid('b') }],
        })),
      deleteBudget: (id) => setState((s) => ({ ...s, budgets: s.budgets.filter((x) => x.id !== id) })),
      upsertGoal: (g) =>
        setState((s) => ({
          ...s,
          goals: g.id ? s.goals.map((x) => (x.id === g.id ? { ...x, ...g, id: x.id } : x)) : [...s.goals, { ...g, id: uid('g') }],
        })),
      deleteGoal: (id) => setState((s) => ({ ...s, goals: s.goals.filter((x) => x.id !== id) })),
      contributeToGoal: (id, amount) =>
        setState((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g)) })),
      updateProfile: (p) => setState((s) => ({ ...s, profile: { ...s.profile, ...p } })),
      resetDemo: () => setState(fresh()),
    }
  }, [state, toasts, notify])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used inside FinanceProvider')
  return ctx
}
