export type TxType = 'income' | 'expense'

export interface Transaction {
  id: string
  date: string // ISO yyyy-mm-dd
  description: string
  category: string
  type: TxType
  amount: number // always positive
  account: string
  note?: string
  recurring?: boolean
}

export interface Budget {
  id: string
  category: string
  limit: number // monthly
}

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
  deadline: string // ISO
  monthlyContribution: number
  icon: string
  priority: 'high' | 'medium' | 'low'
}

export interface Account {
  id: string
  name: string
  kind: 'asset' | 'liability'
  group: 'Cash' | 'Investments' | 'Retirement' | 'Property' | 'Credit' | 'Loans'
  balance: number
  institution: string
}

export interface Profile {
  name: string
  email: string
  currency: 'INR' | 'USD' | 'EUR'
  riskAppetite: 'conservative' | 'balanced' | 'aggressive'
  monthlyEmi: number
}
