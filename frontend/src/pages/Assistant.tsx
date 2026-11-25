import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowUp, Bot, Copy, Database, Eraser, Lightbulb, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, User } from 'lucide-react'
import { useFinance } from '../store/FinanceContext'
import { answer, SUGGESTIONS, type Reply } from '../lib/assistant'
import { baseline, healthReport, netWorth } from '../lib/analytics'
import { cx, money } from '../lib/format'
import { Card, PageHeader } from '../components/ui'

interface Msg { id: number; role: 'user' | 'ai'; text?: string; reply?: Reply }

/** Tiny inline formatter for **bold** and _italic_ in generated text. */
function rich(s: string): ReactNode {
  return s.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, i) =>
    part.startsWith('**') ? <strong key={i} className="font-semibold text-fg">{part.slice(2, -2)}</strong> : part.startsWith('_') && part.endsWith('_') && part.length > 2 ? <em key={i} className="text-fg-subtle">{part.slice(1, -1)}</em> : <Fragment key={i}>{part}</Fragment>,
  )
}

const WELCOME: Msg = {
  id: 0,
  role: 'ai',
  reply: {
    text: "Hi! I'm **WealthWise AI**. I've analysed your 12 months of transactions, budgets, goals and balances. Ask me anything about your money — spending, savings, goals, risk or what-if questions.",
    followUps: SUGGESTIONS.slice(0, 4),
  },
}

export default function Assistant() {
  const data = useFinance()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [feedback, setFeedback] = useState<Record<number, 'up' | 'down'>>({})
  const endRef = useRef<HTMLDivElement>(null)
  const sentInitial = useRef(false)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs, thinking])

  const ask = (text: string) => {
    const q = text.trim()
    if (!q || thinking) return
    if (/^simulate/i.test(q)) { nav('/simulator'); return }
    setMsgs((m) => [...m, { id: Date.now(), role: 'user', text: q }])
    setInput('')
    setThinking(true)
    // Simulated latency so the experience mirrors a real model call
    setTimeout(() => {
      setMsgs((m) => [...m, { id: Date.now() + 1, role: 'ai', reply: answer(q, data) }])
      setThinking(false)
    }, 650 + Math.random() * 600)
  }

  useEffect(() => {
    const q = params.get('q')
    if (q && !sentInitial.current) {
      sentInitial.current = true
      params.delete('q')
      setParams(params, { replace: true })
      ask(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const base = baseline(data.transactions)
  const nw = netWorth(data.accounts)
  const score = healthReport(data.transactions, data.accounts, data.budgets, data.goals, data.profile).score

  const copy = (r: Reply) => {
    const t = [r.text, ...(r.bullets ?? []).map((b) => `• ${b}`)].join('\n').replace(/\*\*|_/g, '')
    navigator.clipboard?.writeText(t)
    data.notify('Copied to clipboard', 'info')
  }

  return (
    <>
      <PageHeader
        title="AI financial assistant"
        subtitle="Grounded in your own data — every number is calculated, not guessed"
        actions={<button className="btn-ghost" onClick={() => setMsgs([WELCOME])}><Eraser size={15} /> New chat</button>}
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="flex h-[calc(100vh-210px)] min-h-[520px] flex-col overflow-hidden">
          <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6">
            {msgs.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end gap-3">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-brand/15 px-4 py-2.5 text-sm text-fg">{m.text}</div>
                  <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-ink-600 text-fg-muted"><User size={15} /></div>
                </div>
              ) : (
                <div key={m.id} className="flex gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#34d399] to-[#059669] text-ink-950"><Sparkles size={15} /></div>
                  <div className="min-w-0 max-w-[92%] flex-1 space-y-3 text-sm leading-relaxed text-fg-muted">
                    <p>{rich(m.reply!.text)}</p>
                    {m.reply!.table && (
                      <div className="overflow-x-auto rounded-xl border border-ink-600/70">
                        <table className="w-full text-xs">
                          <thead className="bg-ink-850"><tr>{m.reply!.table.head.map((h) => <th key={h} className="px-3 py-2 text-left font-medium text-fg-subtle">{h}</th>)}</tr></thead>
                          <tbody className="divide-y divide-ink-600/50">
                            {m.reply!.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={cx('num px-3 py-2', j === 0 ? 'font-medium text-fg' : '')}>{c}</td>)}</tr>)}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {m.reply!.bullets && (
                      <ul className="space-y-1.5">
                        {m.reply!.bullets.map((b, i) => <li key={i} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" /><span>{rich(b)}</span></li>)}
                      </ul>
                    )}
                    {m.id !== 0 && (
                      <div className="flex items-center gap-1 text-fg-subtle">
                        <button className="cursor-pointer rounded-md p-1 hover:bg-ink-700 hover:text-fg" onClick={() => copy(m.reply!)} aria-label="Copy"><Copy size={13} /></button>
                        <button className={cx('cursor-pointer rounded-md p-1 hover:bg-ink-700', feedback[m.id] === 'up' && 'text-good')} onClick={() => setFeedback((f) => ({ ...f, [m.id]: 'up' }))} aria-label="Helpful"><ThumbsUp size={13} /></button>
                        <button className={cx('cursor-pointer rounded-md p-1 hover:bg-ink-700', feedback[m.id] === 'down' && 'text-bad')} onClick={() => setFeedback((f) => ({ ...f, [m.id]: 'down' }))} aria-label="Not helpful"><ThumbsDown size={13} /></button>
                      </div>
                    )}
                    {m.reply!.followUps && m === msgs[msgs.length - 1] && !thinking && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {m.reply!.followUps.map((f) => (
                          <button key={f} onClick={() => ask(f)} className="cursor-pointer rounded-full border border-ink-600 bg-ink-850 px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-brand/50 hover:text-fg">{f}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
            {thinking && (
              <div className="flex gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#34d399] to-[#059669] text-ink-950"><Sparkles size={15} /></div>
                <div className="flex items-center gap-2 text-xs text-fg-subtle">
                  <span className="dot-typing flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="size-1.5 rounded-full bg-brand" />)}</span>
                  Analysing your transactions…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <form className="border-t border-ink-600/60 p-3 sm:p-4" onSubmit={(e) => { e.preventDefault(); ask(input) }}>
            <div className="flex items-end gap-2 rounded-2xl border border-ink-600 bg-ink-850 p-2 focus-within:border-brand/60">
              <textarea
                rows={1}
                className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-fg-subtle"
                placeholder="Ask about your spending, goals, or a what-if…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input) } }}
                aria-label="Message"
              />
              <button type="submit" className="btn-primary !rounded-xl !p-2" disabled={!input.trim() || thinking} aria-label="Send"><ArrowUp size={17} /></button>
            </div>
            <p className="mt-2 px-1 text-[11px] text-fg-subtle">Educational insights, not regulated financial advice. Demo mode runs on-device.</p>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold"><Database size={15} className="text-brand" /> Context the AI can see</div>
            <dl className="mt-4 space-y-2.5 text-sm">
              {[
                ['Transactions analysed', data.transactions.length.toString()],
                ['Avg monthly income', money(base.income, { compact: true })],
                ['Avg monthly spend', money(base.expense, { compact: true })],
                ['Net worth', money(nw.net, { compact: true })],
                ['Active goals', data.goals.length.toString()],
                ['Health score', `${score}/100`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between"><dt className="text-fg-muted">{k}</dt><dd className="num font-medium">{v}</dd></div>
              ))}
            </dl>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold"><Lightbulb size={15} className="text-warn" /> Try asking</div>
            <div className="mt-3 space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="block w-full cursor-pointer rounded-lg px-2.5 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-ink-700 hover:text-fg">{s}</button>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={15} className="text-s1" /> Privacy</div>
            <p className="mt-2 text-xs leading-relaxed text-fg-muted">In demo mode your data never leaves this browser. With the backend connected, bank links are read-only.</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-fg-subtle"><Bot size={13} /> Model: WealthWise Insight Engine (demo)</div>
          </Card>
        </div>
      </div>
    </>
  )
}
