import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Spinner, ErrorBox, Empty } from '../components/States.jsx'

export default function Insights() {
  const { api, role } = useApp()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try { setData(await api.getInsights()) } catch (e) { setError(e.message) }
  }, [api])
  useEffect(() => { if (role === 'manager') load() }, [load, role])

  if (role !== 'manager') return null

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Governance insights</h1>
        <p className="text-sm text-slate-500">How often each rule fires, and how often people ignore it. A high ignore rate usually means the rule is unclear.</p>
      </div>
      {error && <ErrorBox message={error} onRetry={load} />}
      {!data && !error && <Spinner />}
      {data && data.rows.length === 0 && <Empty title="No review history yet" hint="Run a few checks and send them through review first." />}
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
          <div className="space-y-3">
            {data.rows.map((r) => (
              <article key={r.id} className="card space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-bold">{r.id} · {r.text}</h2>
                  <p className="text-xs text-slate-500">{Math.round(r.ignoreRate * 100)}% ignored</p>
                </div>
                <Bar label="Flagged" value={r.flagged} max={data.totals.flagged || 1} color="bg-slate-700" />
                <Bar label="Ignored" value={r.ignored} max={data.totals.flagged || 1} color="bg-amber-500" />
                <Bar label="Accepted" value={r.accepted} max={data.totals.flagged || 1} color="bg-green-600" />
                <p className="text-sm text-slate-600">{r.hint}</p>
                {r.claims.length > 0 && (
                  <p className="text-xs text-slate-500">Examples: {r.claims.slice(0, 3).map((c) => `“${c}”`).join(' · ')}</p>
                )}
              </article>
            ))}
          </div>
        </>
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
