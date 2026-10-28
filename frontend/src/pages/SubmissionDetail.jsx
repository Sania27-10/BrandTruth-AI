import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Check, Send } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import FindingCard from '../components/FindingCard.jsx'
import { Spinner, ErrorBox } from '../components/States.jsx'
import { fmtDate } from '../lib.js'

export default function SubmissionDetail() {
  const { id } = useParams()
  const { api, role, mark } = useApp()
  const [s, setS] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [comment, setComment] = useState('')
  const [editText, setEditText] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const d = await api.getSubmission(id)
      setS(d)
      setEditText(d.versions[d.versions.length - 1].text)
    } catch (e) { setError(e.message) }
  }, [api, id])
  useEffect(() => { load() }, [load])

  const run = async (fn, after) => {
    setBusy(true); setError('')
    try {
      const d = await fn()
      setS(d); setEditText(d.versions[d.versions.length - 1].text)
      if (after) after()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const addComment = () => {
    if (!comment.trim()) return
    run(() => api.addComment(id, comment), () => setComment(''))
  }

  if (error && !s) return <ErrorBox message={error} onRetry={load} />
  if (!s) return <Spinner />

  const latest = s.versions[s.versions.length - 1]
  const isReviewer = role === 'reviewer'
  const isCreator = role === 'creator'

  return (
    <div className="space-y-5">
      <Link to={isReviewer ? '/queue' : isCreator ? '/submissions' : '/brand'} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">{s.title}</h1>
        <StatusBadge kind="submission" value={s.status} />
        <span className="text-sm text-slate-500">Version {s.versions.length} &middot; by {s.creator}</span>
      </div>
      {error && <ErrorBox message={error} />}

      <section className="card">
        <span className="label">Current text</span>
        <p className="text-sm">{latest.text}</p>
      </section>

      {isReviewer && s.status === 'waiting_for_review' && (
        <section className="card space-y-3 border-brand-100">
          <p className="font-bold">Your decision</p>
          <textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment (required if you request changes)" maxLength={500} aria-label="Reviewer comment" />
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" disabled={busy} onClick={() => run(async () => { if (comment.trim()) await api.addComment(id, comment); return api.approve(id) }, () => { mark('approved'); setComment('') })}><Check className="h-4 w-4" /> Approve</button>
            <button className="btn btn-danger" disabled={busy} onClick={() => { if (!comment.trim()) { setError('Please write a comment explaining what to change.'); return } run(() => api.requestChanges(id, comment), () => setComment('')) }}>Request changes</button>
          </div>
        </section>
      )}

      {isCreator && s.status === 'draft' && (
        <section className="card flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">This is a draft. Submit it when you are ready for a reviewer.</p>
          <button className="btn btn-primary" disabled={busy} onClick={() => run(() => api.submitForReview(id), () => mark('submitted'))}><Send className="h-4 w-4" /> Submit for review</button>
        </section>
      )}

      {isCreator && s.status === 'changes_requested' && (
        <section className="card space-y-3 border-orange-200">
          <p className="font-bold text-orange-700">Changes requested. Edit your text and resubmit.</p>
          <textarea className="input min-h-[100px]" value={editText} onChange={(e) => setEditText(e.target.value)} aria-label="Edited text" maxLength={3000} />
          <button className="btn btn-primary" disabled={busy || !editText.trim()} onClick={() => run(() => api.resubmit(id, editText))}><Send className="h-4 w-4" /> Resubmit as version {s.versions.length + 1}</button>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Findings ({s.findings.length})</h2>
        {s.findings.length === 0 && <p className="text-sm text-slate-500">No findings were recorded.</p>}
        {s.findings.map((f, i) => <FindingCard key={f.id + i} finding={f} />)}
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card">
          <h2 className="font-bold">Version history</h2>
          <ol className="mt-3 space-y-3">
            {s.versions.map((v) => (
              <li key={v.no} className="border-l-2 border-brand-100 pl-3">
                <p className="text-xs font-bold text-brand-700">v{v.no} &middot; {v.by} &middot; {fmtDate(v.at)}</p>
                <p className="mt-0.5 text-sm text-slate-700">{v.text}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="card">
          <h2 className="font-bold">Activity</h2>
          <ol className="mt-3 space-y-2">
            {s.history.map((h, i) => (
              <li key={i} className="text-sm"><span className="font-semibold">{h.by}</span> <span className="text-slate-600">{h.detail}</span> <span className="text-xs text-slate-400">{fmtDate(h.at)}</span></li>
            ))}
          </ol>
        </section>
      </div>

      <section className="card">
        <h2 className="font-bold">Comments</h2>
        {s.comments.length === 0 && <p className="mt-2 text-sm text-slate-500">No comments yet.</p>}
        <ul className="mt-3 space-y-2">
          {s.comments.map((c, i) => (
            <li key={i} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="text-xs font-bold text-slate-500">{c.by} &middot; {fmtDate(c.at)}</p><p className="mt-0.5">{c.text}</p></li>
          ))}
        </ul>
        {!(isReviewer && s.status === 'waiting_for_review') && (
          <div className="mt-3 flex gap-2">
            <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment" maxLength={500} aria-label="Add a comment" onKeyDown={(e) => e.key === 'Enter' && addComment()} />
            <button className="btn btn-ghost" onClick={addComment} disabled={busy || !comment.trim()}>Post</button>
          </div>
        )}
      </section>
    </div>
  )
}
