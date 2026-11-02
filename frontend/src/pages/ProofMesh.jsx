import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Spinner, ErrorBox, Empty } from '../components/States.jsx'

const KIND = {
  fact: { fill: '#4f46e5', ring: '#c7d2fe' },
  asset: { fill: '#0f766e', ring: '#99f6e4' },
  submission: { fill: '#1d4ed8', ring: '#bfdbfe' },
  claim: { fill: '#b45309', ring: '#fde68a' },
}

export default function ProofMesh() {
  const { api, role } = useApp()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [factId, setFactId] = useState('F-04')

  const load = useCallback(async (id) => {
    setError('')
    try { setData(await api.getProofMesh(id)) } catch (e) { setError(e.message) }
  }, [api])

  useEffect(() => { if (role === 'manager') load(factId) }, [load, role, factId])

  const layout = useMemo(() => layoutGraph(data), [data])

  if (role !== 'manager') return null

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">ProofMesh</h1>
        <p className="text-sm text-slate-500">When a manager changes an approved fact, every poster that used that fact is flagged. The graph is fact → assets → claims.</p>
      </div>
      {error && <ErrorBox message={error} onRetry={() => load(factId)} />}
      {!data && !error && <Spinner />}
      {data && (
        <>
          <div className="flex flex-wrap gap-2">
            {data.facts.map((f) => (
              <button key={f.id} onClick={() => setFactId(f.id)}
                className={`rounded-full border px-3 py-1 text-sm font-semibold ${factId === f.id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                {f.id} · {f.linked} linked
              </button>
            ))}
          </div>
          <div className="card">
            <p className="font-bold">{data.fact.id}: {data.fact.text}</p>
            <p className="mt-1 text-sm text-slate-600">Current value: <b>{showVal(data.fact)}</b>. Flagged after the last change: {data.flaggedCount}.</p>
            {data.history.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-slate-500">
                {data.history.slice().reverse().map((h, i) => (
                  <li key={i}>{h.at.slice(0, 16).replace('T', ' ')} · {h.by} · {h.previous} → {h.next} · {h.flagged} flagged</li>
                ))}
              </ul>
            )}
          </div>
          {layout.nodes.length === 1 && (
            <Empty title="Nothing is linked to this fact yet" hint="Check a poster that uses this fact, or change F-04 on the Brand Library page to flag the sample Instagram story, table card and WhatsApp message." />
          )}
          {layout.nodes.length > 1 && (
            <div className="card overflow-x-auto !p-2">
              <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="h-[420px] w-full min-w-[640px]" role="img" aria-label="ProofMesh graph">
                {layout.edges.map((e, i) => (
                  <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.stale ? '#d97706' : '#cbd5e1'} strokeWidth="1.6" />
                ))}
                {layout.nodes.map((n) => (
                  <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                    <circle r="18" fill={n.stale ? '#f59e0b' : KIND[n.kind]?.fill || '#64748b'} stroke={KIND[n.kind]?.ring} strokeWidth="4" />
                    <text y="36" textAnchor="middle" className="fill-slate-700" fontSize="11">{clip(n.label, 28)}</text>
                  </g>
                ))}
              </svg>
              <div className="flex flex-wrap gap-3 px-3 pb-2 text-xs text-slate-500">
                <span>Indigo = fact</span>
                <span>Teal = asset</span>
                <span>Blue = submission</span>
                <span>Amber node = flagged after a fact change</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function showVal(f) {
  if (f.type === 'offer_scope') return f.value?.approved
  return String(f.value)
}

function clip(s, n) {
  const t = String(s || '')
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

function layoutGraph(data) {
  if (!data) return { nodes: [], edges: [], width: 800, height: 400 }
  const facts = data.nodes.filter((n) => n.kind === 'fact')
  const assets = data.nodes.filter((n) => n.kind === 'asset')
  const subs = data.nodes.filter((n) => n.kind === 'submission')
  const claims = data.nodes.filter((n) => n.kind === 'claim')
  const width = 860
  const cols = [facts, assets, subs, claims]
  const height = Math.max(380, ...cols.map((c) => 80 + c.length * 78))
  const placed = new Map()
  const xs = [90, 280, 520, 760]
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
