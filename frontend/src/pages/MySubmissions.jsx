import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { Spinner, Empty, ErrorBox } from '../components/States.jsx'
import { fmtDate } from '../lib.js'

export default function MySubmissions() {
  const { api, role } = useApp()
  const navigate = useNavigate()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try { setItems(await api.listSubmissions()) } catch (e) { setError(e.message) }
  }, [api])
  useEffect(() => { if (role === 'creator') load() }, [load, role])

  if (role !== 'creator') return null
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">My submissions</h1>
      {error && <ErrorBox message={error} onRetry={load} />}
      {!items && !error && <Spinner />}
      {items && items.length === 0 && <Empty title="No submissions yet" hint="Start with a check on the New Check page." />}
      {items && items.length > 0 && (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Version</th><th className="px-4 py-3">Updated</th></tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} tabIndex={0} onClick={() => navigate('/submission/' + s.id)} onKeyDown={(e) => e.key === 'Enter' && navigate('/submission/' + s.id)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold">{s.title}</td>
                  <td className="px-4 py-3"><StatusBadge kind="submission" value={s.status} /></td>
                  <td className="px-4 py-3">v{s.version}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(s.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
