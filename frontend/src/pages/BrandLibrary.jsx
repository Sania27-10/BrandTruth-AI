import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import Modal from '../components/Modal.jsx'
import { Spinner, ErrorBox } from '../components/States.jsx'

const FACT_TYPES = [
  ['discount_percent', 'Discount percent'],
  ['offer_end_date', 'Offer end date'],
  ['product_name', 'Product name'],
  ['other', 'Other'],
]
const typeLabel = (t) => (FACT_TYPES.find((x) => x[0] === t) || [t, t === 'offer_scope' ? 'Offer scope' : t])[1]
const showValue = (f) => (f.type === 'offer_scope' ? f.value.approved : f.type === 'discount_percent' ? f.value + '%' : String(f.value))

export default function BrandLibrary() {
  const { api, role } = useApp()
  const [brand, setBrand] = useState(null)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const canEdit = role === 'manager'

  const load = useCallback(async () => {
    setError('')
    try { setBrand(await api.getBrand()) } catch (e) { setError(e.message) }
  }, [api])
  useEffect(() => { load() }, [load])

  const done = (res) => {
    setBrand(res.brand); setModal(null)
    setToast(`Added ${res.added.id}. It applies to the next check.`)
    setTimeout(() => setToast(''), 4000)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Brand library</h1>
        <p className="text-sm text-slate-500">{brand ? `${brand.organization} · workspace ${brand.orgCode}` : ''}</p>
        <p className="mt-1 text-xs text-slate-500">Only managers can change facts and rules. Exact code checks run on discounts, end dates, offer scope and banned words. Everything else is reviewed by AI.</p>
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
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">ID</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Value</th><th className="px-4 py-2">Note</th></tr></thead>
              <tbody>{brand.facts.map((f) => (
                <tr key={f.id} className="border-t border-slate-100"><td className="px-4 py-2 font-bold text-brand-700">{f.id}</td><td className="px-4 py-2">{typeLabel(f.type)}</td><td className="px-4 py-2">{showValue(f)}</td><td className="px-4 py-2 text-slate-600">{f.text}</td></tr>
              ))}</tbody>
            </table>
          </section>

          <section className="card !p-0 overflow-x-auto">
            <div className="flex items-center justify-between p-4">
              <h2 className="font-bold">Rules</h2>
              {canEdit && <button className="btn btn-primary !py-1.5" onClick={() => setModal('rule')}><Plus className="h-4 w-4" /> Add rule</button>}
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">ID</th><th className="px-4 py-2">Rule</th><th className="px-4 py-2">Banned words</th><th className="px-4 py-2">Severity</th></tr></thead>
              <tbody>{brand.rules.map((r) => (
                <tr key={r.id} className="border-t border-slate-100"><td className="px-4 py-2 font-bold text-brand-700">{r.id}</td><td className="px-4 py-2">{r.text}</td><td className="px-4 py-2 text-slate-600">{r.bannedWords && r.bannedWords.length ? r.bannedWords.join(', ') : 'none'}</td><td className="px-4 py-2 capitalize">{r.severity}</td></tr>
              ))}</tbody>
            </table>
          </section>

          <section className="card">
            <h2 className="font-bold">Brand assets</h2>
            {brand.assets.map((a) => (
              <p key={a.id} className="mt-2 text-sm"><b>{a.name}</b> ({a.id}): <span className="text-slate-600">{a.note}</span></p>
            ))}
            <p className="mt-2 text-xs text-slate-400">Automatic logo and visual checks are planned for Round 3.</p>
          </section>
        </>
      )}

      {modal === 'fact' && <FactForm api={api} onDone={done} onClose={() => setModal(null)} />}
      {modal === 'rule' && <RuleForm api={api} onDone={done} onClose={() => setModal(null)} />}
    </div>
  )
}

function FactForm({ api, onDone, onClose }) {
  const [type, setType] = useState('discount_percent')
  const [value, setValue] = useState('')
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { onDone(await api.addFact({ type, value, text })) } catch (x) { setErr(x.message); setBusy(false) }
  }
  return (
    <Modal title="Add a fact" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label" htmlFor="ft">Type</label>
          <select id="ft" className="input" value={type} onChange={(e) => { setType(e.target.value); setValue('') }}>
            {FACT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></div>
        <div><label className="label" htmlFor="fv">Value</label>
          {type === 'offer_end_date'
            ? <input id="fv" type="date" className="input" value={value} onChange={(e) => setValue(e.target.value)} required />
            : <input id="fv" type={type === 'discount_percent' ? 'number' : 'text'} min="0" max="100" className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === 'discount_percent' ? 'e.g. 25' : 'e.g. Masala Chai'} required />}
        </div>
        <div><label className="label" htmlFor="fn">Note (optional)</label>
          <input id="fn" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Short description" maxLength={200} /></div>
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
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { onDone(await api.addRule({ text, bannedWords: words, severity })) } catch (x) { setErr(x.message); setBusy(false) }
  }
  return (
    <Modal title="Add a rule" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label" htmlFor="rt">Rule</label>
          <input id="rt" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Never promise free delivery" required maxLength={300} /></div>
        <div><label className="label" htmlFor="rw">Banned words (comma separated, optional)</label>
          <input id="rw" className="input" value={words} onChange={(e) => setWords(e.target.value)} placeholder="e.g. free, giveaway" /></div>
        <div><label className="label" htmlFor="rs">Severity</label>
          <select id="rs" className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High (marked as contradicted)</option>
          </select></div>
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Saving...' : 'Add rule'}</button>
      </form>
    </Modal>
  )
}
