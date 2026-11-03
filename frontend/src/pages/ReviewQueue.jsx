import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { Spinner, Empty, ErrorBox } from '../components/States.jsx'
import { fmtDate } from '../lib.js'

export default function ReviewQueue() {
  const { api, role, mark } = useApp()
  const navigate = useNavigate()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)

  const load = useCallback(async () => {
    setError('')
    try {
      setItems(await api.listQueue())
      mark('queue')
    } catch (e) { setError(e.message) }
  }, [api, mark])
  useEffect(() => { if (role === 'reviewer') load() }, [load, role])

  if (role !== 'reviewer') {
    return <p className="text-sm text-slate-500">Switch to Reviewer to open the queue. Creators submit posters; managers do not approve them.</p>
  }

  const openReview = (id) => {
    mark('inspect')
    navigate('/submission/' + id)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Review queue</h1>
        <p className="text-sm text-slate-500">Human decision only. If a creator ignored a finding, you will see it on the review screen and can still approve anyway after confirming.</p>
      </div>
      {error && <ErrorBox message={error} onRetry={load} />}
      {!items && !error && <Spinner />}
      {items && items.length === 0 && <Empty title="Nothing waiting for review" hint="Submit a poster as Creator and it will land here." />}
      {items && items.map((s) => {
        const expanded = openId === s.id
        return (
          <article key={s.id} className="card space-y-3">
            <div className="flex w-full flex-wrap items-start justify-between gap-3">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenId(expanded ? null : s.id)}>
                <p className="font-bold">{s.title}</p>
                <p className="text-xs text-slate-500">
                  {s.id} · {s.creator} · v{s.version} · {fmtDate(s.updatedAt)}
                </p>
              </button>
              <div className="flex flex-wrap items-center gap-2">
                {s.stale && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    <AlertTriangle className="h-3 w-3" /> Fact changed
                  </span>
                )}
                {s.ignoredCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    {s.ignoredCount} ignored
                  </span>
                )}
                <StatusBadge kind="submission" value={s.status} />
                <button type="button" className="rounded p-1 text-slate-500" aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => setOpenId(expanded ? null : s.id)}>
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {expanded && (
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                {s.reReviewReason && <p className="mb-2 text-amber-800">{s.reReviewReason}</p>}
                <p>{s.unresolvedCount || 0} unresolved finding{(s.unresolvedCount || 0) === 1 ? '' : 's'} · {s.acceptedCount || 0} accepted · {s.ignoredCount || 0} ignored</p>
                <p className="mt-1 text-xs">Ignored findings do not block the queue. Open the poster and use Approve anyway if the brand can live with them.</p>
              </div>
            )}
            <button className="btn btn-primary !py-1.5" onClick={() => openReview(s.id)}>Review submission</button>
          </article>
        )
      })}
    </div>
  )
}
