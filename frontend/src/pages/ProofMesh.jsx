import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { Spinner, ErrorBox, Empty } from '../components/States.jsx'
import Modal from '../components/Modal.jsx'

const KIND = {
  fact: { fill: '#4f46e5', ring: '#c7d2fe', label: 'Brand fact' },
  rule: { fill: '#6d28d9', ring: '#ddd6fe', label: 'Brand rule' },
  asset: { fill: '#0f766e', ring: '#99f6e4', label: 'Brand asset' },
  submission: { fill: '#1d4ed8', ring: '#bfdbfe', label: 'Submission' },
  claim: { fill: '#b45309', ring: '#fde68a', label: 'Finding / claim' },
  version: { fill: '#64748b', ring: '#cbd5e1', label: 'Fact version' },
}

function nodeFill(n) {
  if (n.state === 'contradicted') return '#dc2626'
  if (n.state === 'reverified' || (!n.stale && n.state === 'reverified')) return '#059669'
  if (n.stale || n.state === 'flagged') return '#f59e0b'
  return KIND[n.kind]?.fill || '#64748b'
}

export default function ProofMesh() {
  const { api, role, mark } = useApp()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [factId, setFactId] = useState('F-04')
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (id) => {
    setError('')
    try { setData(await api.getProofMesh(id)); mark('inspect') } catch (e) { setError(e.message) }
  }, [api, mark])

  useEffect(() => { if (role === 'manager') load(factId) }, [load, role, factId])

  const layout = useMemo(() => layoutGraph(data), [data])

  if (role !== 'manager') return null

  const onNode = (n) => {
    if (n.kind === 'submission' && n.href) {
      navigate(n.href)
      return
    }
    setSelected(n)
  }

  const reverify = async (id) => {
    setBusy(true); setError('')
    try {
      await api.reverify(id)
      await load(factId)
      setSelected(null)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const summary = data?.summary || {}

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">ProofMesh</h1>
        <p className="text-sm text-slate-500">Live graph of approved facts, rules, assets, submissions and claims. Festival copy hangs off F-04 / F-03. The healthy snack sample hangs off F-01, R-13 and R-14. Counts come from this workspace.</p>
      </div>
      {error && <ErrorBox message={error} onRetry={() => load(factId)} />}
      {!data && !error && <Spinner />}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-5">
            {[
              ['Affected submissions', summary.affectedSubmissions],
              ['Unique assets', summary.uniqueAssets],
              ['Pending re-verification', summary.pendingReverify],
              ['Successfully re-verified', summary.reVerified],
              ['Unresolved claims', summary.unresolvedClaims],
            ].map(([k, v]) => (
              <div key={k} className="card !p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</p><p className="mt-1 text-2xl font-extrabold">{v ?? 0}</p></div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {[...(data.facts || []), ...(data.rules || [])].map((f) => (
              <button key={f.id} onClick={() => setFactId(f.id)}
                className={`rounded-full border px-3 py-1 text-sm font-semibold ${factId === f.id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                {f.id} · {f.linked} linked
              </button>
            ))}
          </div>
          <div className="card">
            <p className="font-bold">{data.fact.id}: {data.fact.text}</p>
            <p className="mt-1 text-sm text-slate-600">{data.kind === 'rule' ? 'Rule' : 'Current value'}: <b>{showVal(data.fact)}</b>{data.fact.previousValue ? ` · previous: ${data.fact.previousValue}` : ''} · version {data.fact.version || 1}</p>
            {data.history.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-slate-500">
                {data.history.slice().reverse().map((h, i) => (
                  <li key={i}>{h.at.slice(0, 16).replace('T', ' ')} · {h.by} · {h.previous} → {h.next} · {h.flagged} flagged</li>
                ))}
              </ul>
            )}
          </div>
          {layout.nodes.length <= 1 && (
            <Empty title="Nothing is linked to this guideline yet" hint="Festival assets sit on F-04. Snack assets sit on F-01, R-13 and R-14. Change F-01 or F-04 in the Brand Library to flag the matching campaign." />
          )}
          {layout.nodes.length > 1 && (
            <div className="card overflow-x-auto !p-2">
              <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="h-[420px] w-full min-w-[640px]" role="img" aria-label="ProofMesh graph">
                {layout.edges.map((e, i) => (
                  <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.stale ? '#d97706' : '#cbd5e1'} strokeWidth="1.6" />
                ))}
                {layout.nodes.map((n) => (
                  <g key={n.id} transform={`translate(${n.x},${n.y})`} className="cursor-pointer" onClick={() => onNode(n)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onNode(n)}>
                    <circle r="18" fill={nodeFill(n)} stroke={KIND[n.kind]?.ring} strokeWidth="4" />
                    <text y="36" textAnchor="middle" className="fill-slate-700" fontSize="11">{clip(n.label, 28)}</text>
                  </g>
                ))}
              </svg>
              <div className="flex flex-wrap gap-3 px-3 pb-2 text-xs text-slate-500">
                <span>Indigo = fact</span>
                <span>Violet = rule</span>
                <span>Teal = asset</span>
                <span>Blue = submission</span>
                <span>Amber = flagged</span>
                <span>Green = re-verified</span>
                <span>Red = contradicted claim</span>
                <span>Grey = previous fact version</span>
              </div>
              <p className="px-3 pb-2 text-xs text-slate-400">Click a node. Submissions open the real record. Facts, assets and claims open a detail panel with actions.</p>
            </div>
          )}
        </>
      )}
      {selected && (
        <Modal title={selected.label} onClose={() => setSelected(null)} wide>
          <NodePanel
            node={selected}
            busy={busy}
            onReverify={reverify}
            onOpen={(id, claim) => navigate('/submission/' + id + (claim ? `?claim=${encodeURIComponent(claim)}` : ''))}
            onMarkUpdated={async (id) => {
              setBusy(true); setError('')
              try { await api.markUpdated(id); await load(factId); setSelected(null) }
              catch (e) { setError(e.message) }
              finally { setBusy(false) }
            }}
          />
        </Modal>
      )}
    </div>
  )
}

function NodePanel({ node, busy, onReverify, onOpen, onMarkUpdated }) {
  const d = node.detail || {}
  if (node.kind === 'fact' || node.kind === 'rule') {
    return (
      <div className="space-y-2 text-sm">
        <p>Fact ID: <b>{d.factId}</b></p>
        <p>Current value: <b>{d.currentValue}</b></p>
        <p>Previous value: {d.previousValue || 'none'}</p>
        <p>Dependent assets: {d.dependentAssets}</p>
        <p>Affected submissions: {d.affectedSubmissions}</p>
        {(d.history || []).length > 0 && (
          <ul className="text-xs text-slate-500">
            {d.history.map((h, i) => <li key={i}>{h.previous} → {h.next} · {h.flagged} flagged</li>)}
          </ul>
        )}
      </div>
    )
  }
  if (node.kind === 'asset') {
    return (
      <div className="space-y-2 text-sm">
        <p className="rounded-xl bg-slate-50 p-3">{d.preview || 'No preview'}</p>
        <p>Linked fact: {d.linkedFact}</p>
        <p>Verification: {d.verificationState}</p>
        {(d.linkedSubmissions || []).map((s) => (
          <button key={s.id} className="block text-brand-700" onClick={() => onOpen(s.id)}>{s.title} · {s.status}</button>
        ))}
      </div>
    )
  }
  if (node.kind === 'claim') {
    return (
      <div className="space-y-2 text-sm">
        <p className="rounded-xl bg-amber-50 p-3 font-semibold">&ldquo;{d.claim}&rdquo;</p>
        <p>Fact {d.factId}: was {d.originalFactValue || '—'} · now {d.updatedFactValue || '—'}</p>
        <p>Submission version: v{d.submissionVersion}</p>
        <p>{d.reason}</p>
        {d.suggestedFix && <p>Recommended correction: {d.suggestedFix}</p>}
        <button className="btn btn-primary" onClick={() => onOpen(d.submissionId, d.claim)}>View flagged claim</button>
      </div>
    )
  }
  if (node.kind === 'version') {
    return <p className="text-sm">Previous approved value: {d.previousValue}. Current: {d.currentValue}.</p>
  }
  return (
    <div className="space-y-2 text-sm">
      <p>{d.title} · {d.status}</p>
      <p className="rounded-xl bg-slate-50 p-3">{d.text}</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-ghost" onClick={() => onOpen(d.submissionId)}>View affected asset</button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => onMarkUpdated(d.submissionId)}>Mark as updated</button>
        <button className="btn btn-primary" disabled={busy} onClick={() => onReverify(d.submissionId)}>{busy ? 'Checking...' : 'Re-verify'}</button>
      </div>
    </div>
  )
}

function showVal(f) {
  if (!f) return ''
  if (f.type === 'offer_scope') return f.value?.approved
  if (f.type === 'discount_percent') return String(f.value) + '%'
  if (f.value == null) return f.safeWording || f.text || f.id
  return String(f.value)
}

function clip(s, n) {
  const t = String(s || '')
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

function layoutGraph(data) {
  if (!data) return { nodes: [], edges: [], width: 800, height: 400 }
  const facts = data.nodes.filter((n) => n.kind === 'fact' || n.kind === 'rule')
  const versions = data.nodes.filter((n) => n.kind === 'version')
  const assets = data.nodes.filter((n) => n.kind === 'asset')
  const subs = data.nodes.filter((n) => n.kind === 'submission')
  const claims = data.nodes.filter((n) => n.kind === 'claim')
  const width = 980
  const cols = [versions.length ? versions : facts, versions.length ? facts : assets, versions.length ? assets : subs, versions.length ? subs : claims, versions.length ? claims : []]
  const height = Math.max(380, ...cols.map((c) => 80 + c.length * 78))
  const placed = new Map()
  const xs = [70, 250, 450, 680, 900]
  cols.forEach((col, i) => {
    col.forEach((n, idx) => {
      const gap = height / (col.length + 1)
      placed.set(n.id, { ...n, x: xs[i], y: gap * (idx + 1) })
    })
  })
  const edges = (data.edges || []).map((e) => {
    const a = placed.get(e.from)
    const b = placed.get(e.to)
    if (!a || !b) return null
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stale: !!(a.stale || b.stale) }
  }).filter(Boolean)
  return { nodes: [...placed.values()], edges, width, height }
}
