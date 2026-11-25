import { useState } from 'react'
import { Building2, Download, RefreshCcw, Save } from 'lucide-react'
import { useFinance } from '../store/FinanceContext'
import { netWorth } from '../lib/analytics'
import { money } from '../lib/format'
import { Badge, Card, CardHeader, Modal, PageHeader, Segmented } from '../components/ui'
import type { Profile } from '../data/types'
import { defaultProfile } from '../data/mock'

export default function SettingsPage() {
  const { profile, updateProfile, accounts, resetDemo, notify, transactions, budgets, goals } = useFinance()
  const [f, setF] = useState<Profile>(profile)
  const [confirmReset, setConfirmReset] = useState(false)
  const nw = netWorth(accounts)

  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ profile, accounts, budgets, goals, transactions }, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'wealthwise-export.json'
    a.click()
    URL.revokeObjectURL(url)
    notify('Data exported')
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Profile, preferences and connected accounts" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Profile & preferences" />
          <form
            className="space-y-4 p-5"
            onSubmit={(e) => { e.preventDefault(); updateProfile(f); notify('Preferences saved') }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="p-name">Full name</label><input id="p-name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div><label className="label" htmlFor="p-email">Email</label><input id="p-email" type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            </div>
            <div>
              <span className="label">Display currency</span>
              <Segmented value={f.currency} onChange={(v) => setF({ ...f, currency: v })} options={[{ value: 'INR', label: '₹ INR' }, { value: 'USD', label: '$ USD' }, { value: 'EUR', label: '€ EUR' }]} />
              <p className="mt-1.5 text-xs text-fg-subtle">Amounts are stored in INR and converted at demo rates for display.</p>
            </div>
            <div>
              <span className="label">Risk appetite</span>
              <Segmented value={f.riskAppetite} onChange={(v) => setF({ ...f, riskAppetite: v })} options={[{ value: 'conservative', label: 'Conservative' }, { value: 'balanced', label: 'Balanced' }, { value: 'aggressive', label: 'Aggressive' }]} />
              <p className="mt-1.5 text-xs text-fg-subtle">Used by the AI assistant when suggesting asset allocation.</p>
            </div>
            <div className="max-w-xs"><label className="label" htmlFor="p-emi">Total monthly EMIs (₹)</label><input id="p-emi" type="number" className="input num" value={f.monthlyEmi} onChange={(e) => setF({ ...f, monthlyEmi: Number(e.target.value) })} /></div>
            <div className="flex justify-end"><button className="btn-primary" type="submit"><Save size={15} /> Save preferences</button></div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Linked accounts" subtitle={`Net worth ${money(nw.net, { compact: true })}`} />
          <ul className="mt-3 divide-y divide-ink-600/50">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className="grid size-9 place-items-center rounded-xl bg-ink-700 text-fg-muted"><Building2 size={16} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="text-xs text-fg-subtle">{a.institution}</div>
                </div>
                <Badge>{a.group}</Badge>
                <span className={`num w-28 text-right text-sm font-semibold ${a.kind === 'liability' ? 'text-bad' : ''}`}>{a.kind === 'liability' ? '−' : ''}{money(a.balance, { compact: true })}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Data" subtitle="Everything is stored locally in your browser" />
          <div className="flex flex-wrap gap-2 p-5">
            <button className="btn-ghost" onClick={exportJson}><Download size={15} /> Export all data (JSON)</button>
            <button className="btn-danger" onClick={() => setConfirmReset(true)}><RefreshCcw size={15} /> Reset demo data</button>
          </div>
        </Card>
      </div>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset demo data?"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
            <button className="btn-danger" onClick={() => { resetDemo(); setF(defaultProfile); setConfirmReset(false); notify('Demo data restored', 'info') }}>Reset</button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">All transactions, budgets, goals and preferences you changed will be replaced with the original sample dataset.</p>
      </Modal>
    </>
  )
}
