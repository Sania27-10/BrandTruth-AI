import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import Modal from '../components/Modal.jsx'
import { Spinner, ErrorBox, Empty } from '../components/States.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { fmtDate } from '../lib.js'

const FACT_TYPES = [
  ['discount_percent', 'Discount percent'],
  ['offer_end_date', 'Offer end date'],
  ['offer_scope', 'Offer scope'],
  ['product_name', 'Product name'],
  ['other', 'Other'],
]
const typeLabel = (t) => (FACT_TYPES.find((x) => x[0] === t) || [t, t])[1]
const showValue = (f) => (f.type === 'offer_scope' ? f.value.approved : f.type === 'discount_percent' ? f.value + '%' : String(f.value))

export default function BrandLibrary() {
  const { api, role, mark } = useApp()
  const navigate = useNavigate()
  const [brand, setBrand] = useState(null)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editingRule, setEditingRule] = useState(null)
  const [asset, setAsset] = useState(null)
  const [toast, setToast] = useState('')
  const canEdit = role === 'manager'

  const load = useCallback(async () => {
    setError('')
    try { setBrand(await api.getBrand()) } catch (e) { setError(e.message) }
  }, [api])
  useEffect(() => { load() }, [load])

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 6000) }
  const done = (res) => {
    setBrand(res.brand); setModal(null)
    flash(`Saved ${res.added.id}. It applies to the next check.`)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Brand library</h1>
        <p className="text-sm text-slate-500">{brand ? `${brand.organization} · workspace ${brand.orgCode}` : ''}</p>
        <p className="mt-1 text-xs text-slate-500">Managers maintain facts and rules for both campaigns: festival drinks (F-03, F-04, R-12) and ragi snacks (F-01, R-13, R-14). Changing a fact keeps the old version and flags every linked poster in ProofMesh.</p>
      </div>
      {error && <ErrorBox message={error} onRetry={load} />}
      {toast && <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700" role="status">{toast}</div>}
      {!brand && !error && <Spinner />}
      {brand && (
        <>
          <section className="card !p-0 overflow-x-auto">
            <div className="flex items-center justify-between p-4">
              <h2 className="font-bold">Approved facts</h2>
              {canEdit && <button className="btn btn-primary !py-1.5" onClick={() => setModal('fact')}><Plus className="h-4 w-4" /> Add fact</button>}
            </div>
            {brand.facts.length === 0 && <div className="p-4"><Empty title="No facts yet" hint="Add the first approved fact so the checker has something to compare against." /></div>}
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">ID</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Value</th><th className="px-4 py-2">Note</th><th className="px-4 py-2">Version</th><th className="px-4 py-2"></th></tr></thead>
              <tbody>{brand.facts.map((f) => (
                <tr key={f.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-bold text-brand-700">{f.id}</td>
                  <td className="px-4 py-2">{typeLabel(f.type)}</td>
                  <td className="px-4 py-2">{showValue(f)}</td>
                  <td className="px-4 py-2 text-slate-600">{f.text}{f.description ? <span className="block text-xs text-slate-400">{f.description}</span> : null}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">v{f.version || 1}{f.previousValue ? ` · was ${f.previousValue}` : ''}</td>
                  <td className="px-4 py-2">{canEdit && <button className="text-sm font-semibold text-brand-700" onClick={() => { setEditing(f); mark('change') }}>Change</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          </section>

          <section className="card !p-0 overflow-x-auto">
            <div className="flex items-center justify-between p-4">
              <h2 className="font-bold">Rules</h2>
              {canEdit && <button className="btn btn-primary !py-1.5" onClick={() => setModal('rule')}><Plus className="h-4 w-4" /> Add rule</button>}
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">ID</th><th className="px-4 py-2">Rule</th><th className="px-4 py-2">Banned words</th><th className="px-4 py-2">Severity</th><th className="px-4 py-2">Version</th><th className="px-4 py-2"></th></tr></thead>
              <tbody>{brand.rules.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-bold text-brand-700">{r.id}</td>
                  <td className="px-4 py-2">{r.text}</td>
                  <td className="px-4 py-2 text-slate-600">{r.bannedWords && r.bannedWords.length ? r.bannedWords.join(', ') : 'none'}</td>
                  <td className="px-4 py-2 capitalize">{r.severity}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">v{r.version || 1}</td>
                  <td className="px-4 py-2">{canEdit && <button className="text-sm font-semibold text-brand-700" onClick={() => setEditingRule(r)}>Change</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          </section>

          <section>
            <h2 className="mb-3 font-bold">Brand assets</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(brand.assets || []).map((a) => (
                <button key={a.id} onClick={() => setAsset(a)} className="card text-left transition hover:border-brand-500">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-brand-600">{a.id} · {a.type}{a.campaign && a.campaign !== 'identity' && a.campaign !== 'general' ? ` · ${a.campaign}` : ''}</p>
                      <p className="mt-1 font-bold">{a.name}</p>
                    </div>
                    <StatusBadge value={a.verificationStatus === 'outdated' ? 'reverification_required' : a.verificationStatus === 'reverified' ? 'reverified' : 'supported'} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{a.previewText || a.note}</p>
                  <p className="mt-2 text-xs text-slate-400">Facts {(a.linkedFactIds || []).join(', ') || 'none'} · Rules {(a.linkedRuleIds || []).join(', ') || 'none'} · {a.linkedSubmissions?.length || 0} submissions</p>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {modal === 'fact' && <FactForm api={api} onDone={done} onClose={() => setModal(null)} />}
      {modal === 'rule' && <RuleForm api={api} onDone={done} onClose={() => setModal(null)} />}
      {editing && (
        <EditFact
          api={api}
          fact={editing}
          brandVersion={brand.version}
          onClose={() => setEditing(null)}
          onDone={(res) => {
            setBrand(res.brand)
            setEditing(null)
            const n = (res.impact && res.impact.flagged && res.impact.flagged.length) || 0
            flash(`Updated ${res.updated.id} to v${res.updated.version}. ${n} linked item${n === 1 ? '' : 's'} need re-verification. Open ProofMesh next.`)
            mark('mesh')
            navigate('/proofmesh')
          }}
        />
      )}
      {editingRule && (
        <EditRule
          api={api}
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          onDone={(res) => { setBrand(res.brand); setEditingRule(null); flash(`Updated ${res.updated.id} to v${res.updated.version}. Existing submissions keep the rule version they were checked with.`) }}
        />
      )}
      {asset && (
        <AssetDetail
          api={api}
          asset={asset}
          canEdit={canEdit}
          onClose={() => setAsset(null)}
          onRefresh={async () => { const b = await api.getBrand(); setBrand(b); const next = (b.assets || []).find((x) => x.id === asset.id); if (next) setAsset(next) }}
          onOpenSubmission={(id) => navigate('/submission/' + id)}
        />
      )}
    </div>
  )
}

function FactForm({ api, onDone, onClose }) {
  const [type, setType] = useState('discount_percent')
  const [value, setValue] = useState('')
  const [text, setText] = useState('')
  const [source, setSource] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { onDone(await api.addFact({ type, value, text, source, effectiveDate })) } catch (x) { setErr(x.message); setBusy(false) }
  }
  return (
    <Modal title="Add a fact" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label" htmlFor="ft">Fact type</label>
          <select id="ft" className="input" value={type} onChange={(e) => { setType(e.target.value); setValue('') }}>
            {FACT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></div>
        <div><label className="label" htmlFor="fv">Fact value</label>
          {type === 'offer_end_date'
            ? <input id="fv" type="date" className="input" value={value} onChange={(e) => setValue(e.target.value)} required />
            : <input id="fv" type={type === 'discount_percent' ? 'number' : 'text'} min="0" max="100" className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === 'discount_percent' ? 'e.g. 25' : type === 'offer_scope' ? 'e.g. cold coffee' : 'e.g. Masala Chai'} required />}
        </div>
        <div><label className="label" htmlFor="fn">Description (optional)</label>
          <input id="fn" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Short extra context. The canonical note is generated from the value." maxLength={200} /></div>
        <div><label className="label" htmlFor="fs">Supporting source / reference</label>
          <input id="fs" className="input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Festival calendar, slide 4" maxLength={200} /></div>
        <div><label className="label" htmlFor="fe">Effective date (optional)</label>
          <input id="fe" type="date" className="input" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} /></div>
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Saving...' : 'Add fact'}</button>
      </form>
    </Modal>
  )
}

function RuleForm({ api, onDone, onClose }) {
  const [text, setText] = useState('')
  const [words, setWords] = useState('')
  const [severity, setSeverity] = useState('medium')
  const [category, setCategory] = useState('claims')
  const [safe, setSafe] = useState('')
  const [explanation, setExplanation] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { onDone(await api.addRule({ text, bannedWords: words, severity, category, safeWording: safe, explanation })) } catch (x) { setErr(x.message); setBusy(false) }
  }
  return (
    <Modal title="Add a rule" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label" htmlFor="rt">Rule description</label>
          <input id="rt" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Never promise free delivery" required maxLength={300} /></div>
        <div><label className="label" htmlFor="rw">Banned words or phrases</label>
          <input id="rw" className="input" value={words} onChange={(e) => setWords(e.target.value)} placeholder="e.g. free, giveaway" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label" htmlFor="rs">Severity</label>
            <select id="rs" className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
            </select></div>
          <div><label className="label" htmlFor="rc">Category</label>
            <select id="rc" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="claims">Claims</option><option value="legal">Legal</option><option value="tone">Tone</option><option value="offer">Offer</option><option value="other">Other</option>
            </select></div>
        </div>
        <div><label className="label" htmlFor="rw2">Suggested compliant wording</label>
          <input id="rw2" className="input" value={safe} onChange={(e) => setSafe(e.target.value)} placeholder="Used when a rewrite has to stay inside the rules" maxLength={200} /></div>
        <div><label className="label" htmlFor="rx">Supporting explanation</label>
          <input id="rx" className="input" value={explanation} onChange={(e) => setExplanation(e.target.value)} maxLength={400} /></div>
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Saving...' : 'Add rule'}</button>
      </form>
    </Modal>
  )
}

function EditFact({ api, fact, brandVersion, onDone, onClose }) {
  const initial = fact.type === 'offer_scope' ? fact.value.approved : String(fact.value)
  const [value, setValue] = useState(initial)
  const [reason, setReason] = useState('')
  const [source, setSource] = useState(fact.source || '')
  const [impact, setImpact] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    api.previewFact(fact.id).then((p) => { if (alive) setImpact(p) }).catch(() => {})
    return () => { alive = false }
  }, [api, fact.id])

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      const payload = fact.type === 'offer_scope'
        ? { value: { approved: value, forbidden: fact.value.forbidden || [] }, reason, source, baseVersion: brandVersion }
        : { value, reason, source, baseVersion: brandVersion }
      onDone(await api.updateFact(fact.id, payload))
    } catch (x) { setErr(x.message); setBusy(false) }
  }
  return (
    <Modal title={`Change ${fact.id}`} onClose={onClose} wide>
      <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm">
        <p className="font-semibold">Current fact</p>
        <p className="mt-1">{fact.id} · {typeLabel(fact.type)}</p>
        <p>Current value: <b>{showValue(fact)}</b></p>
        <p>Note: {fact.text}</p>
        <p>Previous version: {fact.previousValue || 'none (this is v' + (fact.version || 1) + ')'}</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label" htmlFor="ev">New value</label>
          {fact.type === 'offer_end_date'
            ? <input id="ev" type="date" className="input" value={value} onChange={(e) => setValue(e.target.value)} required />
            : <input id="ev" className="input" value={value} onChange={(e) => setValue(e.target.value)} required />}
        </div>
        <div>
          <label className="label" htmlFor="er">Reason for change</label>
          <input id="er" className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Festival calendar extended" maxLength={300} />
        </div>
        <div>
          <label className="label" htmlFor="es">Supporting source / reference</label>
          <input id="es" className="input" value={source} onChange={(e) => setSource(e.target.value)} maxLength={200} />
        </div>
        {impact && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">Impact preview</p>
            <p>{impact.affectedSubmissions} affected submissions</p>
            <p>{impact.uniqueAssets} unique assets</p>
            <p>{impact.awaitingReview} submissions awaiting review</p>
          </div>
        )}
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" disabled={busy}>{busy ? 'Saving...' : 'Confirm fact change'}</button>
        </div>
      </form>
    </Modal>
  )
}

function EditRule({ api, rule, onDone, onClose }) {
  const [text, setText] = useState(rule.text)
  const [words, setWords] = useState((rule.bannedWords || []).join(', '))
  const [severity, setSeverity] = useState(rule.severity)
  const [category, setCategory] = useState(rule.category || 'claims')
  const [safe, setSafe] = useState(rule.safeWording || '')
  const [explanation, setExplanation] = useState(rule.explanation || '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { onDone(await api.updateRule(rule.id, { text, bannedWords: words, severity, category, safeWording: safe, explanation })) } catch (x) { setErr(x.message); setBusy(false) }
  }
  return (
    <Modal title={`Change ${rule.id}`} onClose={onClose} wide>
      <p className="mb-3 text-sm text-slate-600">The previous version is kept. New checks use v{(rule.version || 1) + 1}. Older submissions keep the version they were checked with.</p>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label" htmlFor="urt">Rule</label><input id="urt" className="input" value={text} onChange={(e) => setText(e.target.value)} required maxLength={300} /></div>
        <div><label className="label" htmlFor="urw">Banned words</label><input id="urw" className="input" value={words} onChange={(e) => setWords(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label" htmlFor="urs">Severity</label>
            <select id="urs" className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
            </select></div>
          <div><label className="label" htmlFor="urc">Category</label>
            <select id="urc" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="claims">Claims</option><option value="legal">Legal</option><option value="tone">Tone</option><option value="offer">Offer</option><option value="other">Other</option>
            </select></div>
        </div>
        <div><label className="label" htmlFor="urw2">Compliant wording</label><input id="urw2" className="input" value={safe} onChange={(e) => setSafe(e.target.value)} /></div>
        <div><label className="label" htmlFor="urx">Explanation</label><input id="urx" className="input" value={explanation} onChange={(e) => setExplanation(e.target.value)} /></div>
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" disabled={busy}>{busy ? 'Saving...' : 'Save rule version'}</button>
        </div>
      </form>
    </Modal>
  )
}

function AssetDetail({ api, asset, canEdit, onClose, onRefresh, onOpenSubmission }) {
  const [note, setNote] = useState(asset.note || '')
  const [content, setContent] = useState(asset.content || '')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const save = async () => {
    setBusy('save'); setErr('')
    try { await api.updateAsset(asset.id, { note, content }); await onRefresh() } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const reverify = async () => {
    setBusy('reverify'); setErr('')
    try { await api.reverifyAsset(asset.id); await onRefresh() } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  return (
    <Modal title={`${asset.id} · ${asset.name}`} onClose={onClose} wide>
      <div className="space-y-3 text-sm">
        <p className="text-slate-500">{asset.type} · {asset.channel || 'general'} · last modified {asset.lastModifiedAt ? fmtDate(asset.lastModifiedAt) : '—'}</p>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="label">Preview</p>
          <p>{asset.previewText || 'No linked content yet.'}</p>
        </div>
        <p>Verification: <b>{asset.verificationStatus}</b>{asset.lastVerificationDate ? ` · last check ${fmtDate(asset.lastVerificationDate)}` : ''}</p>
        <p>Linked facts: {(asset.linkedFacts || []).map((f) => `${f.id} (${f.value})`).join(', ') || 'none'}</p>
        <p>Linked rules: {(asset.linkedRules || []).map((r) => r.id).join(', ') || 'none'}</p>
        <div>
          <p className="font-semibold">Related submissions</p>
          {(asset.linkedSubmissions || []).length === 0 && <p className="text-slate-500">No submissions are linked to this asset yet.</p>}
          {(asset.linkedSubmissions || []).map((s) => (
            <button key={s.id} className="mt-1 block text-left text-brand-700" onClick={() => onOpenSubmission(s.id)}>
              {s.title} · {s.status}{s.outdatedClaims?.length ? ` · outdated: “${s.outdatedClaims[0]}”` : ''}
            </button>
          ))}
        </div>
        {canEdit && (
          <>
            <div><label className="label" htmlFor="an">Note</label><input id="an" className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <div><label className="label" htmlFor="ac">Asset copy</label><textarea id="ac" className="input min-h-[80px]" value={content} onChange={(e) => setContent(e.target.value)} /></div>
          </>
        )}
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex flex-wrap gap-2">
          {canEdit && <button className="btn btn-ghost" disabled={!!busy} onClick={save}>{busy === 'save' ? 'Saving...' : 'Save asset'}</button>}
          {canEdit && <button className="btn btn-primary" disabled={!!busy} onClick={reverify}>{busy === 'reverify' ? 'Checking...' : 'Re-verify asset'}</button>}
        </div>
      </div>
    </Modal>
  )
}
