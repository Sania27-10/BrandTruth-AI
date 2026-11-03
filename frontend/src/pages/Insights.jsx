import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { Spinner, ErrorBox, Empty } from '../components/States.jsx'
import Modal from '../components/Modal.jsx'
import { fmtDate } from '../lib.js'

const EMPTY_FILTERS = { from: '', to: '', rule: '', severity: '', channel: '', creatorDecision: '', reviewerDecision: '' }

export default function Insights() {
  const { api, role } = useApp()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [open, setOpen] = useState(null)

  const load = useCallback(async (next) => {
    setError('')
    try {
      const q = {}
      Object.entries(next || filters).forEach(([k, v]) => { if (v) q[k] = v })
      setData(await api.getInsights(q))
    } catch (e) { setError(e.message) }
  }, [api, filters])

  useEffect(() => { if (role === 'manager') load(EMPTY_FILTERS) }, [role]) // eslint-disable-line react-hooks/exhaustive-deps

  if (role !== 'manager') return <p className="text-sm text-slate-500">Governance insights are a manager view. Switch role in the header.</p>

  const setF = (k, v) => setFilters((prev) => ({ ...prev, [k]: v }))
  const eventsFor = (id) => (data?.events || []).filter((e) => e.guidelineId === id)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Governance insights</h1>
        <p className="text-sm text-slate-500">Counts come from this workspace. Flagged is unique findings, not extra versions of the same poster. Click a card to see the submissions behind it.</p>
      </div>
      {error && <ErrorBox message={error} onRetry={() => load()} />}

      <form className="card grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); load() }}>
        <div><label className="label" htmlFor="from">From</label><input id="from" type="date" className="input" value={filters.from} onChange={(e) => setF('from', e.target.value)} /></div>
        <div><label className="label" htmlFor="to">To</label><input id="to" type="date" className="input" value={filters.to} onChange={(e) => setF('to', e.target.value)} /></div>
        <div><label className="label" htmlFor="rule">Rule / fact ID</label><input id="rule" className="input" value={filters.rule} onChange={(e) => setF('rule', e.target.value)} placeholder="e.g. R-12" /></div>
        <div>
          <label className="label" htmlFor="sev">Severity</label>
          <select id="sev" className="input" value={filters.severity} onChange={(e) => setF('severity', e.target.value)}>
            <option value="">Any</option>
            <option value="low">Low</option><option value="medium">Medium</option>
            <option value="high">High</option><option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ch">Channel</label>
          <select id="ch" className="input" value={filters.channel} onChange={(e) => setF('channel', e.target.value)}>
            <option value="">Any</option>
            <option value="instagram">Instagram</option>
            <option value="print">Print</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cd">Creator decision</label>
          <select id="cd" className="input" value={filters.creatorDecision} onChange={(e) => setF('creatorDecision', e.target.value)}>
            <option value="">Any</option>
            <option value="accepted">Accepted</option>
            <option value="ignored">Ignored</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="rd">Reviewer decision</label>
          <select id="rd" className="input" value={filters.reviewerDecision} onChange={(e) => setF('reviewerDecision', e.target.value)}>
            <option value="">Any</option>
            <option value="approved_anyway">Approved anyway</option>
            <option value="requested_changes">Requested changes</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button className="btn btn-primary" type="submit">Apply filters</button>
          <button type="button" className="btn btn-ghost" onClick={() => { setFilters(EMPTY_FILTERS); load(EMPTY_FILTERS) }}>Reset</button>
        </div>
      </form>

      {!data && !error && <Spinner />}
      {data && data.rows.length === 0 && <Empty title="No review history in this filter" hint="Run checks, accept or ignore findings, then send them through review. This page never invents numbers." />}
      {data && data.rows.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ['Flagged', data.totals.flagged],
              ['Accepted fixes', data.totals.accepted],
              ['Ignored', data.totals.ignored],
              ['Approved anyway', data.totals.overrides],
            ].map(([k, v]) => (
              <div key={k} className="card"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</p><p className="mt-1 text-2xl font-extrabold">{v}</p></div>
            ))}
          </div>
          {data.calculation && (
            <p className="text-xs text-slate-400">
              Flagged: {data.calculation.flagged} Accepted: {data.calculation.accepted} Ignored: {data.calculation.ignored} Approved anyway: {data.calculation.overrides}
            </p>
          )}
          <div className="space-y-3">
            {data.rows.map((r) => (
              <button type="button" key={r.id} onClick={() => setOpen(r)} className="card w-full space-y-2 text-left transition hover:border-brand-500">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-bold">{r.id} · {r.text}</h2>
                  <p className="text-xs text-slate-500">{Math.round(r.ignoreRate * 100)}% ignore rate</p>
                </div>
                <Bar label="Flagged" value={r.flagged} max={data.totals.flagged || 1} color="bg-slate-700" />
                <Bar label="Ignored (creator)" value={r.ignored} max={data.totals.flagged || 1} color="bg-amber-500" />
                <Bar label="Accepted (creator)" value={r.accepted} max={data.totals.flagged || 1} color="bg-green-600" />
                <Bar label="Reviewer overrides" value={r.overrides} max={data.totals.flagged || 1} color="bg-orange-500" />
                <p className="text-sm text-slate-600">{r.hint}</p>
                {r.lastTriggered && <p className="text-xs text-slate-400">Last triggered {fmtDate(r.lastTriggered)}</p>}
              </button>
            ))}
          </div>
        </>
      )}

      {open && (
        <Modal title={`${open.id} history`} onClose={() => setOpen(null)} wide>
          <p className="mb-3 text-sm text-slate-600">{open.hint}</p>
          {eventsFor(open.id).length === 0 && <Empty title="No rows behind this card" hint="The totals above only count findings that still exist on a submission." />}
          <ul className="space-y-3">
            {eventsFor(open.id).map((e) => (
              <li key={e.id} className="rounded-xl border border-slate-100 p-3 text-sm">
                <p className="font-semibold">{e.title}</p>
                <p className="mt-1">Claim: “{e.claim}”</p>
                {e.suggestedFix && <p className="text-slate-600">Suggested: {e.suggestedFix}</p>}
                <p className="mt-1 text-xs text-slate-500">
                  Creator: {e.creatorDecision || 'undecided'} · Reviewer: {e.reviewerDecision || 'pending'}
                  {e.reviewerComment ? ` · “${e.reviewerComment}”` : ''} · v{e.ruleVersion} · {fmtDate(e.submittedAt)}
                </p>
                <button className="mt-2 text-sm font-semibold text-brand-700" onClick={() => navigate('/submission/' + e.submissionId + (e.claim ? `?claim=${encodeURIComponent(e.claim)}` : ''))}>Open submission</button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  )
}

function Bar({ label, value, max, color }) {
  const pct = Math.max(4, Math.round((value / max) * 100))
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-500"><span>{label}</span><span>{value}</span></div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  )
}
