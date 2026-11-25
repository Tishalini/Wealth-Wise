import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowDownLeft, ArrowUp, ChevronLeft, ChevronRight, Download, Filter, Pencil, Plus, Repeat, Search, Trash2, Wallet, X } from 'lucide-react'
import { useFinance } from '../store/FinanceContext'
import type { Transaction, TxType } from '../data/types'
import { ACCOUNTS_LIST, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../data/mock'
import { cx, dateLabel, money, monthLabel } from '../lib/format'
import { lastMonthKeys } from '../lib/analytics'
import { Badge, Card, EmptyState, Modal, PageHeader, Segmented } from '../components/ui'
import { CATEGORY_COLOR, OTHER } from '../components/charts'

const PAGE = 12
type SortKey = 'date' | 'amount'

const today = () => new Date().toISOString().slice(0, 10)
const blank = (): Omit<Transaction, 'id'> => ({ date: today(), description: '', category: 'Food & Dining', type: 'expense', amount: 0, account: ACCOUNTS_LIST[0], note: '', recurring: false })

export default function Transactions() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, notify } = useFinance()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [type, setType] = useState<'all' | TxType>('all')
  const [category, setCategory] = useState('all')
  const [account, setAccount] = useState('all')
  const [month, setMonth] = useState('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' })
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Transaction | Omit<Transaction, 'id'> | null>(null)
  const [confirmDel, setConfirmDel] = useState<Transaction | null>(null)

  useEffect(() => {
    if (params.get('new') === '1') {
      setEditing(blank())
      params.delete('new')
      setParams(params, { replace: true })
    }
    const pq = params.get('q')
    if (pq !== null) setQ(pq)
  }, [params, setParams])

  const months = lastMonthKeys(12).reverse()
  const allCats = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out = transactions.filter(
      (t) =>
        (type === 'all' || t.type === type) &&
        (category === 'all' || t.category === category) &&
        (account === 'all' || t.account === account) &&
        (month === 'all' || t.date.startsWith(month)) &&
        (!needle || t.description.toLowerCase().includes(needle) || t.category.toLowerCase().includes(needle) || (t.note ?? '').toLowerCase().includes(needle)),
    )
    out.sort((a, b) => {
      const v = sort.key === 'date' ? a.date.localeCompare(b.date) : a.amount - b.amount
      return sort.dir === 'asc' ? v : -v
    })
    return out
  }, [transactions, q, type, category, account, month, sort])

  useEffect(() => {
    setPage(1)
  }, [q, type, category, account, month])

  const totals = useMemo(() => {
    const inc = filtered.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0)
    const exp = filtered.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
    return { inc, exp, net: inc - exp }
  }, [filtered])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE)
  const activeFilters = [type !== 'all', category !== 'all', account !== 'all', month !== 'all', q !== ''].filter(Boolean).length

  const clear = () => { setQ(''); setType('all'); setCategory('all'); setAccount('all'); setMonth('all') }

  const exportCsv = () => {
    const head = 'Date,Description,Category,Type,Amount,Account,Note\n'
    const body = filtered.map((t) => [t.date, `"${t.description.replace(/"/g, '""')}"`, t.category, t.type, t.amount, t.account, `"${(t.note ?? '').replace(/"/g, '""')}"`].join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([head + body], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `wealthwise-transactions-${today()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    notify(`Exported ${filtered.length} transactions`)
  }

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))
  const SortIcon = ({ k }: { k: SortKey }) => (sort.key === k ? sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : null)

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle={`${transactions.length} transactions across ${ACCOUNTS_LIST.length} accounts`}
        actions={
          <>
            <button className="btn-ghost" onClick={exportCsv}><Download size={16} /> Export CSV</button>
            <button className="btn-primary" onClick={() => setEditing(blank())}><Plus size={16} /> Add transaction</button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { l: 'Income (filtered)', v: totals.inc, c: 'text-good' },
          { l: 'Expenses (filtered)', v: totals.exp, c: 'text-fg' },
          { l: 'Net', v: totals.net, c: totals.net >= 0 ? 'text-good' : 'text-bad' },
        ].map((s) => (
          <Card key={s.l} className="px-5 py-4">
            <div className="text-xs text-fg-muted">{s.l}</div>
            <div className={cx('num mt-1 text-xl font-semibold', s.c)}>{money(s.v)}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-ink-600/60 p-4 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
            <input className="input pl-9" placeholder="Search by merchant, category or note…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented value={type} onChange={setType} options={[{ value: 'all', label: 'All' }, { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expenses' }]} />
            <select className="input !w-auto" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
              <option value="all">All categories</option>
              {allCats.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className="input !w-auto" value={account} onChange={(e) => setAccount(e.target.value)} aria-label="Account">
              <option value="all">All accounts</option>
              {ACCOUNTS_LIST.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className="input !w-auto" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
              <option value="all">All months</option>
              {months.map((m) => <option key={m} value={m}>{monthLabel(m, true)}</option>)}
            </select>
            {activeFilters > 0 && <button className="btn-ghost !py-2" onClick={clear}><X size={14} /> Clear ({activeFilters})</button>}
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={<Filter size={20} />} title="No transactions match" hint="Try a different search term or clear your filters." action={<button className="btn-ghost" onClick={clear}>Clear filters</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs text-fg-subtle">
                  <th className="px-5 py-3 font-medium"><button className="inline-flex cursor-pointer items-center gap-1 hover:text-fg" onClick={() => toggleSort('date')}>Date <SortIcon k="date" /></button></th>
                  <th className="px-3 py-3 font-medium">Description</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">Account</th>
                  <th className="px-3 py-3 text-right font-medium"><button className="inline-flex cursor-pointer items-center gap-1 hover:text-fg" onClick={() => toggleSort('amount')}>Amount <SortIcon k="amount" /></button></th>
                  <th className="w-24 px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-600/50">
                {rows.map((t) => (
                  <tr key={t.id} className="group hover:bg-ink-700/35">
                    <td className="num px-5 py-3 whitespace-nowrap text-fg-muted">{dateLabel(t.date)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className={cx('grid size-8 shrink-0 place-items-center rounded-lg', t.type === 'income' ? 'bg-s3/12 text-s3' : 'bg-ink-700 text-fg-muted')}>
                          {t.type === 'income' ? <ArrowDownLeft size={15} /> : <Wallet size={15} />}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-medium">{t.description}{t.recurring && <Repeat size={12} className="text-fg-subtle" aria-label="Recurring" />}</div>
                          {t.note && <div className="truncate text-xs text-fg-subtle">{t.note}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 text-fg-muted">
                        <span className="size-2 rounded-full" style={{ background: t.type === 'income' ? '#00a888' : CATEGORY_COLOR[t.category] ?? OTHER }} />
                        {t.category}
                      </span>
                    </td>
                    <td className="px-3 py-3"><Badge>{t.account}</Badge></td>
                    <td className={cx('num px-3 py-3 text-right font-semibold whitespace-nowrap', t.type === 'income' ? 'text-good' : 'text-fg')}>
                      {t.type === 'income' ? '+' : '−'}{money(t.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                        <button className="cursor-pointer rounded-lg p-1.5 text-fg-muted hover:bg-ink-600 hover:text-fg" onClick={() => setEditing(t)} aria-label={`Edit ${t.description}`}><Pencil size={15} /></button>
                        <button className="cursor-pointer rounded-lg p-1.5 text-fg-muted hover:bg-bad/15 hover:text-bad" onClick={() => setConfirmDel(t)} aria-label={`Delete ${t.description}`}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-ink-600/60 px-5 py-3 text-xs text-fg-muted">
          <span>Showing {filtered.length ? (page - 1) * PAGE + 1 : 0}–{Math.min(page * PAGE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-1">
            <button className="btn-ghost !p-1.5" disabled={page === 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
            <span className="num px-2">{page} / {pages}</span>
            <button className="btn-ghost !p-1.5" disabled={page === pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
          </div>
        </div>
      </Card>

      {editing && (
        <TxForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(t) => {
            if ('id' in t && t.id) { updateTransaction(t as Transaction); notify('Transaction updated') }
            else { addTransaction(t); notify('Transaction added') }
            setEditing(null)
          }}
        />
      )}

      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Delete transaction?"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button className="btn-danger" onClick={() => { deleteTransaction(confirmDel!.id); notify('Transaction deleted', 'danger'); setConfirmDel(null) }}><Trash2 size={15} /> Delete</button>
          </>
        }
      >
        {confirmDel && (
          <p className="text-sm text-fg-muted">
            <span className="font-medium text-fg">{confirmDel.description}</span> · {money(confirmDel.amount)} on {dateLabel(confirmDel.date)} will be removed. Budgets, forecasts and your health score update immediately.
          </p>
        )}
      </Modal>
    </>
  )
}

function TxForm({ initial, onClose, onSave }: { initial: Transaction | Omit<Transaction, 'id'>; onClose: () => void; onSave: (t: Transaction | Omit<Transaction, 'id'>) => void }) {
  const [f, setF] = useState(initial)
  const [err, setErr] = useState<string | null>(null)
  const isEdit = 'id' in initial
  const cats = f.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const set = <K extends keyof Transaction>(k: K, v: Transaction[K]) => setF((s) => ({ ...s, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.description.trim()) return setErr('Add a description.')
    if (!(f.amount > 0)) return setErr('Amount must be greater than zero.')
    onSave({ ...f, description: f.description.trim() })
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit transaction' : 'New transaction'}>
      <form onSubmit={submit} className="space-y-4">
        <Segmented
          value={f.type}
          onChange={(v) => setF((s) => ({ ...s, type: v, category: v === 'income' ? 'Salary' : 'Food & Dining' }))}
          options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
        />
        <div>
          <label className="label" htmlFor="tx-desc">Description</label>
          <input id="tx-desc" autoFocus className="input" placeholder="e.g. Swiggy dinner" value={f.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="tx-amt">Amount (₹)</label>
            <input id="tx-amt" type="number" min={0} step="1" className="input num" value={f.amount || ''} onChange={(e) => set('amount', Number(e.target.value))} placeholder="0" />
          </div>
          <div>
            <label className="label" htmlFor="tx-date">Date</label>
            <input id="tx-date" type="date" className="input" value={f.date} max={today()} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="tx-cat">Category</label>
            <select id="tx-cat" className="input" value={f.category} onChange={(e) => set('category', e.target.value)}>
              {cats.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tx-acc">Account</label>
            <select id="tx-acc" className="input" value={f.account} onChange={(e) => set('account', e.target.value)}>
              {ACCOUNTS_LIST.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="tx-note">Note (optional)</label>
          <input id="tx-note" className="input" value={f.note ?? ''} onChange={(e) => set('note', e.target.value)} placeholder="Add context for the AI assistant" />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
          <input type="checkbox" checked={!!f.recurring} onChange={(e) => set('recurring', e.target.checked)} className="size-4 accent-[#10b981]" />
          Recurring every month
        </label>
        {err && <p className="text-sm text-bad">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">{isEdit ? 'Save changes' : 'Add transaction'}</button>
        </div>
      </form>
    </Modal>
  )
}
