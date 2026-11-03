import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Send } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import FindingCard from '../components/FindingCard.jsx'
import { Spinner, ErrorBox } from '../components/States.jsx'
import { fmtDate } from '../lib.js'

export default function SubmissionDetail() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const focusClaim = params.get('claim') || ''
  const { api, role, mark } = useApp()
  const [s, setS] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [comment, setComment] = useState('')
  const [editText, setEditText] = useState('')
  const [ack, setAck] = useState(false)
  const [showAckPanel, setShowAckPanel] = useState(false)
  const [leftVer, setLeftVer] = useState(1)

  const load = useCallback(async () => {
    setError('')
    try {
      const d = await api.getSubmission(id)
      setS(d)
      setEditText(d.versions[d.versions.length - 1].text)
      if (d.versions.length > 1) setLeftVer(d.versions.length - 1)
    } catch (e) { setError(e.message) }
  }, [api, id])
  useEffect(() => { load() }, [load])

  const run = async (fn, after) => {
    setBusy(true); setError('')
    try {
      const d = await fn()
      setS(d); setEditText(d.versions[d.versions.length - 1].text)
      if (after) after()
    } catch (e) {
      setError(e.message)
      if (e.code === 'ACK_REQUIRED') setShowAckPanel(true)
    } finally { setBusy(false) }
  }

  const addComment = () => {
    if (!comment.trim()) return
    run(() => api.addComment(id, comment), () => setComment(''))
  }

  const ignored = useMemo(() => (s?.findings || []).filter((f) => f.decision === 'ignored'), [s])
  const openFindings = useMemo(
    () => (s?.findings || []).filter((f) => f.status !== 'supported' && f.decision !== 'accepted'),
    [s],
  )
  const staleBits = !!(s && (s.stale || (s.findings || []).some((f) => f.stale)))
  const needsAnyway = openFindings.length > 0 || staleBits

  const tryApprove = () => {
    if (needsAnyway && !ack) {
      setShowAckPanel(true)
      setError('This poster still has ignored or outdated findings. Confirm below, then use Approve anyway.')
      return
    }
    run(async () => {
      if (comment.trim()) await api.addComment(id, comment)
      return api.approve(id, needsAnyway)
    }, () => { mark('decide'); mark('approved'); setComment(''); setShowAckPanel(false) })
  }

  if (error && !s) return <ErrorBox message={error} onRetry={load} />
  if (!s) return <Spinner />

  const latest = s.versions[s.versions.length - 1]
  const isReviewer = role === 'reviewer'
  const isCreator = role === 'creator'
  const isManager = role === 'manager'
  const waiting = s.status === 'waiting_for_review' || s.status === 'needs_rereview'
  const left = s.versions.find((v) => v.no === Number(leftVer)) || s.versions[0]
  const backTo = isReviewer ? '/queue' : isCreator ? '/submissions' : '/proofmesh'

  return (
    <div className="space-y-5">
      <Link to={backTo} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">{s.title}</h1>
        <StatusBadge kind="submission" value={s.status} />
        <span className="text-sm text-slate-500">ID {s._id} · Version {s.versions.length} · by {s.creator}</span>
      </div>
      <p className="text-xs text-slate-500">
        Submitted {fmtDate(s.createdAt)}{s.assetId ? ` · linked asset ${s.assetId}` : ''}{s.channel ? ` · ${s.channel}` : ''}
        {s.approvedBy ? ` · last decision by ${s.approvedBy}` : ''}
      </p>
      {error && <ErrorBox message={error} />}
      {s.stale && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          A brand fact used in this poster changed after the last check. Stale findings are not current verification. Re-run the checker or ask the creator to update the copy first.
        </div>
      )}

      <section className="card">
        <span className="label">Content preview</span>
        <p className="text-sm whitespace-pre-wrap">{latest.text}</p>
      </section>

      {isReviewer && waiting && (
        <section className="card space-y-3 border-brand-100">
          <p className="font-bold">Reviewer decision</p>
          <p className="text-sm text-slate-600">
            {ignored.length
              ? `${ignored.length} finding${ignored.length === 1 ? ' was' : 's were'} ignored by the creator. They stay visible. You can send this back, or approve it anyway after confirming.`
              : 'If the copy matches the brand, approve it. If not, request changes and say why.'}
          </p>
          <textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment (required if you request changes)" maxLength={500} aria-label="Reviewer comment" />
          {(needsAnyway || showAckPanel) && (
            <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <input type="checkbox" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              <span>
                I have read the ignored / unresolved findings
                {staleBits ? ' and the stale checks' : ''}. Approve this version anyway. This is not the same as saying the checker passed.
              </span>
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            {needsAnyway ? (
              <button className="btn btn-primary" disabled={busy || !ack} onClick={tryApprove}>
                <Check className="h-4 w-4" /> Approve anyway
              </button>
            ) : (
              <button className="btn btn-primary" disabled={busy} onClick={tryApprove}><Check className="h-4 w-4" /> Approve</button>
            )}
            <button className="btn btn-danger" disabled={busy} onClick={() => {
              if (!comment.trim()) { setError('Write a short note so the creator knows what to change.'); return }
              run(() => api.requestChanges(id, comment), () => { mark('decide'); setComment('') })
            }}>Request changes</button>
          </div>
          {needsAnyway && !ack && (
            <p className="text-xs text-slate-500">Approve anyway stays disabled until you tick the box. Request changes does not need that box.</p>
          )}
        </section>
      )}

      {isCreator && s.status === 'draft' && (
        <section className="card flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Draft only. A reviewer will not see it until you submit.</p>
          <button className="btn btn-primary" disabled={busy} onClick={() => run(() => api.submitForReview(id), () => mark('submitted'))}><Send className="h-4 w-4" /> Submit for review</button>
        </section>
      )}

      {isCreator && s.status === 'changes_requested' && (
        <section className="card space-y-3 border-orange-200">
          <p className="font-bold text-orange-700">The reviewer asked for edits. Change the copy and send version {s.versions.length + 1}.</p>
          <textarea className="input min-h-[100px]" value={editText} onChange={(e) => setEditText(e.target.value)} aria-label="Edited text" maxLength={3000} />
          <button className="btn btn-primary" disabled={busy || !editText.trim()} onClick={() => run(() => api.resubmit(id, editText, s.updatedAt))}><Send className="h-4 w-4" /> Resubmit as version {s.versions.length + 1}</button>
        </section>
      )}

      {isCreator && s.status === 'needs_rereview' && (
        <section className="card space-y-3 border-amber-200">
          <p className="font-bold text-amber-800">A fact changed after this poster was approved or submitted. Update the outdated claim, then resubmit. Re-verify first if you only need a fresh check.</p>
          <textarea className="input min-h-[100px]" value={editText} onChange={(e) => setEditText(e.target.value)} aria-label="Updated text" maxLength={3000} />
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-ghost" disabled={busy} onClick={() => run(() => api.reverify(id))}>Re-verify current text</button>
            <button className="btn btn-primary" disabled={busy || !editText.trim()} onClick={() => run(() => api.resubmit(id, editText, s.updatedAt))}><Send className="h-4 w-4" /> Resubmit as version {s.versions.length + 1}</button>
          </div>
        </section>
      )}

      {isManager && (
        <section className="card flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Managers do not approve posters. You can re-run the checker against the current brand facts.</p>
          <button className="btn btn-ghost" disabled={busy} onClick={() => run(() => api.reverify(id))}>Re-verify</button>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">Verification findings ({s.findings.length})</h2>
          <p className="text-xs text-slate-500">
            {s.findings.filter((f) => f.decision === 'accepted').length} accepted · {ignored.length} ignored · {s.findings.filter((f) => f.status === 'supported').length} supported
          </p>
        </div>
        {s.findings.length === 0 && <p className="text-sm text-slate-500">No findings were recorded for this version.</p>}
        {s.findings.map((f, i) => (
          <FindingCard key={f.id + i} finding={f} highlight={!!focusClaim && String(f.claim).toLowerCase().includes(focusClaim.toLowerCase())} />
        ))}
      </section>

      {s.versions.length > 1 && (
        <section className="card space-y-3">
          <h2 className="font-bold">Version comparison</h2>
          <label className="text-sm text-slate-600">
            Compare
            <select className="input mt-1" value={leftVer} onChange={(e) => setLeftVer(Number(e.target.value))} aria-label="Older version">
              {s.versions.slice(0, -1).map((v) => <option key={v.no} value={v.no}>v{v.no}</option>)}
            </select>
            {' '}with current v{latest.no}
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">v{left.no} · {left.by}</p>
              <p className="mt-2 text-sm">{left.text}</p>
            </div>
            <div className="rounded-xl bg-brand-50 p-3">
              <p className="text-xs font-bold text-brand-700">v{latest.no} · {latest.by}</p>
              <p className="mt-2 text-sm">{latest.text}</p>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card">
          <h2 className="font-bold">Version history</h2>
          <ol className="mt-3 space-y-3">
            {s.versions.map((v) => (
              <li key={v.no} className="border-l-2 border-brand-100 pl-3">
                <p className="text-xs font-bold text-brand-700">v{v.no} · {v.by} · {fmtDate(v.at)}</p>
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
            <li key={i} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="text-xs font-bold text-slate-500">{c.by} · {fmtDate(c.at)}</p><p className="mt-0.5">{c.text}</p></li>
          ))}
        </ul>
        {!(isReviewer && waiting) && (
          <div className="mt-3 flex gap-2">
            <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment" maxLength={500} aria-label="Add a comment" onKeyDown={(e) => e.key === 'Enter' && addComment()} />
            <button className="btn btn-ghost" onClick={addComment} disabled={busy || !comment.trim()}>Post</button>
          </div>
        )}
      </section>
    </div>
  )
}
