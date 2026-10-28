import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { Spinner, Empty, ErrorBox } from '../components/States.jsx'
import { fmtDate } from '../lib.js'

export default function ReviewQueue() {
  const { api, role } = useApp()
  const navigate = useNavigate()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try { setItems(await api.listSubmissions('waiting_for_review')) } catch (e) { setError(e.message) }
  }, [api])
  useEffect(() => { if (role === 'reviewer') load() }, [load, role])

  if (role !== 'reviewer') return null
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Review queue</h1>
        <p className="text-sm text-slate-500">Content waiting for a human decision. Nothing is published until a reviewer approves it.</p>
      </div>
      {error && <ErrorBox message={error} onRetry={load} />}
      {!items && !error && <Spinner />}
      {items && items.length === 0 && <Empty title="Nothing waiting for review" hint="Submit a poster as Creator and it will appear here." />}
      {items && items.map((s) => (
        <button key={s.id} onClick={() => navigate('/submission/' + s.id)} className="card flex w-full flex-wrap items-center justify-between gap-3 text-left transition hover:border-brand-500">
          <div>
            <p className="font-bold">{s.title}</p>
            <p className="text-xs text-slate-500">by {s.creator} &middot; v{s.version} &middot; {fmtDate(s.updatedAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            {s.ignoredCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                <AlertTriangle className="h-3 w-3" /> {s.ignoredCount} ignored finding{s.ignoredCount > 1 ? 's' : ''}
              </span>
            )}
            <StatusBadge kind="submission" value={s.status} />
          </div>
        </button>
      ))}
    </div>
  )
}
