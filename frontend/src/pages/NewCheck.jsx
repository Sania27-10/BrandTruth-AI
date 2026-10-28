import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Upload, Send, Save } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { SAMPLES, applyFixes } from '../lib.js'
import FindingCard from '../components/FindingCard.jsx'
import { ErrorBox } from '../components/States.jsx'

export default function NewCheck() {
  const { api, role, mark } = useApp()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [checkedText, setCheckedText] = useState('')
  const [findings, setFindings] = useState(null)
  const [meta, setMeta] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [imgNote, setImgNote] = useState('')

  const finalText = useMemo(() => (findings ? applyFixes(checkedText, findings) : ''), [checkedText, findings])
  const undecided = findings ? findings.filter((f) => f.status !== 'supported' && !f.decision).length : 0

  const pickSample = (s) => { setText(s.text); setTitle(s.title); setFindings(null); setMeta(null); setError('') }

  const runCheck = async () => {
    setBusy('check'); setError('')
    try {
      const res = await api.runCheck(text)
      setCheckedText(text.trim())
      setFindings(res.findings)
      setMeta(res.meta)
      mark('checked')
      if (!title.trim()) setTitle('Untitled poster')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  const decide = (id, decision) => {
    setFindings((list) => list.map((f) => (f.id === id ? { ...f, decision } : f)))
    if (decision) mark('decided')
  }

  const save = async (submit) => {
    setBusy(submit ? 'submit' : 'draft'); setError('')
    try {
      const doc = await api.createSubmission({ title, originalText: checkedText, finalText, findings, submit })
      if (submit) mark('submitted')
      navigate('/submission/' + doc._id)
    } catch (e) {
      setError(e.message)
      setBusy('')
    }
  }

  const onImage = (e) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { setError('Please choose an image under 3 MB.'); return }
    setError(''); setImgNote(''); setBusy('image')
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const base64 = String(reader.result).split(',')[1]
        const res = await api.extractText(base64, file.type)
        setText(res.text); setFindings(null); setMeta(null)
        setImgNote('Text read from your image by AI. Please correct any mistakes before checking.')
      } catch (err) {
        setError(err.message)
      } finally {
        setBusy('')
      }
    }
    reader.onerror = () => { setError('Could not read that file.'); setBusy('') }
    reader.readAsDataURL(file)
  }

  if (role !== 'creator') return null

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Check your content</h1>
        <p className="text-sm text-slate-500">Pick a sample poster or paste your own text. We check it against the brand&rsquo;s approved facts and rules.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SAMPLES.map((s) => (
          <button key={s.id} onClick={() => pickSample(s)} className="card text-left transition hover:border-brand-500">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Sample poster</p>
            <p className="mt-1 font-bold">{s.title}</p>
            <p className="mt-1 text-sm text-slate-600">&ldquo;{s.text}&rdquo;</p>
            <p className="mt-2 text-sm font-semibold text-brand-700">Use this sample</p>
          </button>
        ))}
      </div>

      <div className="card space-y-3">
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Festival poster" maxLength={80} />
        </div>
        <div>
          <label className="label" htmlFor="text">Poster text (or paste your own, checked live)</label>
          <textarea id="text" className="input min-h-[120px]" value={text} onChange={(e) => { setText(e.target.value); if (findings) { setFindings(null); setMeta(null) } }} placeholder="Paste the text of your poster, caption or banner here" maxLength={3000} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" onClick={runCheck} disabled={!text.trim() || !!busy}>
            {busy === 'check' ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking against your brand rules...</> : 'Check my content'}
          </button>
          <label className={`btn btn-ghost cursor-pointer ${busy ? 'pointer-events-none opacity-50' : ''}`}>
            {busy === 'image' ? <><Loader2 className="h-4 w-4 animate-spin" /> Reading image...</> : <><Upload className="h-4 w-4" /> Read text from an image (optional)</>}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onImage} />
          </label>
        </div>
        {imgNote && <p className="text-xs text-slate-500">{imgNote}</p>}
      </div>

      {error && <ErrorBox message={error} onRetry={busy ? undefined : runCheck} />}

      {findings && (
        <section className="space-y-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Findings ({findings.length})</h2>
            {meta && <p className="max-w-xl rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600">{meta.note}</p>}
          </div>
          {findings.length === 0 && <div className="card text-sm text-slate-600">No issues found against the stored facts and rules. A reviewer can still look it over.</div>}
          {findings.map((f) => <FindingCard key={f.id} finding={f} onDecide={(d) => decide(f.id, d)} />)}

          <div className="card space-y-3">
            <div>
              <span className="label">Current text (version {finalText !== checkedText ? 2 : 1} draft)</span>
              <p className="rounded-xl bg-slate-50 p-3 text-sm">{finalText}</p>
            </div>
            {undecided > 0 && <p className="text-xs text-amber-700">{undecided} finding{undecided > 1 ? 's are' : ' is'} not decided yet. Undecided findings are shown to the reviewer as open.</p>}
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={() => save(true)} disabled={!!busy}>
                {busy === 'submit' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit for review
              </button>
              <button className="btn btn-ghost" onClick={() => save(false)} disabled={!!busy}>
                {busy === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save as draft
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
