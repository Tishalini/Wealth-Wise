import type { Profile } from '../data/types'

const LOCALE: Record<Profile['currency'], string> = { INR: 'en-IN', USD: 'en-US', EUR: 'de-DE' }
// Demo conversion so the currency switch changes the numbers, not just the symbol
export const FX: Record<Profile['currency'], number> = { INR: 1, USD: 1 / 84, EUR: 1 / 91 }

let currentCurrency: Profile['currency'] = 'INR'
export const setCurrency = (c: Profile['currency']) => {
  currentCurrency = c
}
export const getCurrency = () => currentCurrency

export function money(value: number, opts: { compact?: boolean; sign?: boolean; decimals?: number } = {}) {
  const v = value * FX[currentCurrency]
  const locale = LOCALE[currentCurrency]
  let out: string
  if (opts.compact) {
    out = compactMoney(v)
  } else {
    out = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currentCurrency,
      maximumFractionDigits: opts.decimals ?? 0,
      minimumFractionDigits: opts.decimals ?? 0,
    }).format(Math.abs(v))
    if (v < 0) out = '−' + out
  }
  if (opts.sign && v > 0) out = '+' + out
  return out
}

function compactMoney(v: number) {
  const abs = Math.abs(v)
  const neg = v < 0 ? '−' : ''
  if (currentCurrency === 'INR') {
    if (abs >= 1e7) return `${neg}₹${trim(abs / 1e7)} Cr`
    if (abs >= 1e5) return `${neg}₹${trim(abs / 1e5)} L`
    if (abs >= 1e3) return `${neg}₹${trim(abs / 1e3)}K`
    return `${neg}₹${Math.round(abs)}`
  }
  const sym = currentCurrency === 'USD' ? '$' : '€'
  if (abs >= 1e6) return `${neg}${sym}${trim(abs / 1e6)}M`
  if (abs >= 1e3) return `${neg}${sym}${trim(abs / 1e3)}K`
  return `${neg}${sym}${Math.round(abs)}`
}

const trim = (n: number) => (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(/\.0+$|(\.\d*?)0+$/, '$1')

export const pct = (v: number, decimals = 1) => `${(v * 100).toFixed(decimals)}%`

export const monthKey = (iso: string) => iso.slice(0, 7)

export const monthLabel = (key: string, long = false) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', long ? { month: 'long', year: 'numeric' } : { month: 'short' })
}

export const dateLabel = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
