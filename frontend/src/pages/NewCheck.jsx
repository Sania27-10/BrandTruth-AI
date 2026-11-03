import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Upload, Send, Save } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { SAMPLES, applyFixes } from '../lib.js'
import FindingCard from '../components/FindingCard.jsx'
import Modal from '../components/Modal.jsx'
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
  const [progress, setProgress] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [dropOver, setDropOver] = useState(false)

  const finalText = useMemo(() => (findings ? applyFixes(checkedText, findings) : ''), [checkedText, findings])
  const undecided = findings ? findings.filter((f) => f.status !== 'supported' && !f.decision).length : 0
  const acceptedN = findings ? findings.filter((f) => f.decision === 'accepted').length : 0
  const ignoredN = findings ? findings.filter((f) => f.decision === 'ignored').length : 0
  const counts = findings ? {
    contradicted: findings.filter((f) => f.status === 'contradicted').length,
    review: findings.filter((f) => f.status === 'needs_review').length,
    supported: findings.filter((f) => f.status === 'supported').length,
  } : null

  const pickSample = (s) => { setText(s.text); setTitle(s.title); setFindings(null); setMeta(null); setError(''); setImgNote('') }

  const runCheck = async () => {
    if (!text.trim()) { setError('Paste text, pick a sample, or upload an image first.'); return }
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
    setBusy(submit ? 'submit' : 'draft'); setError(''); setConfirm(false)
    try {
      const doc = await api.createSubmission({ title, originalText: checkedText, finalText, findings, submit })
      if (submit) mark('submitted')
      navigate('/submission/' + doc._id)
    } catch (e) {
      setError(e.message)
      setBusy('')
    }
  }

  const readFile = (file) => {
    if (!file) return
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) { setError('Use a PNG, JPG, WEBP or GIF.'); return }
    if (file.size > 3 * 1024 * 1024) { setError('Please choose an image under 3 MB.'); return }
    setError(''); setImgNote(''); setBusy('image'); setProgress('Uploading…')
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        setProgress('Reading text from the image…')
        const base64 = String(reader.result).split(',')[1]
        const res = await api.extractText(base64, file.type)
        const extracted = String(res.text || '').trim()
        if (!extracted) {
          setError('No text came back from that image. Paste the copy by hand, then run the checker.')
          return
        }
        setText(extracted)
        setFindings(null)
        setMeta(null)
        setImgNote('Text pulled from the image. Fix any OCR mistakes, then click Check my content. The checker will not run until you do.')
      } catch (err) {
        setError(err.message)
      } finally {
        setBusy(''); setProgress('')
      }
    }
    reader.onerror = () => { setError('Could not read that file.'); setBusy(''); setProgress('') }
    reader.readAsDataURL(file)
  }

  const onImage = (e) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    readFile(file)
  }

  if (role !== 'creator') {
    return <p className="text-sm text-slate-500">Checking posters is a Creator job. Switch to Creator in the header. Managers own facts; reviewers own the queue.</p>
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Check your content</h1>
        <p className="text-sm text-slate-500">Start with a sample, paste copy, or drop an image. After the check, accept one fix and ignore another so the reviewer has a real decision trail.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SAMPLES.map((s) => (
          <button key={s.id} onClick={() => pickSample(s)} className="card text-left transition hover:border-brand-500">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Sample poster</p>
            <p className="mt-1 font-bold">{s.title}</p>
            <p className="mt-1 text-sm text-slate-600">&ldquo;{s.text}&rdquo;</p>
            {s.uses && <p className="mt-2 text-xs text-slate-500">Checked against {s.uses.join(', ')} in the Brand Library</p>}
            <p className="mt-2 text-sm font-semibold text-brand-700">Use this sample</p>
          </button>
        ))}
      </div>

      <label
        className={`card flex cursor-pointer flex-col items-center gap-2 border-dashed text-center ${dropOver ? 'border-brand-500 bg-brand-50' : ''} ${busy ? 'pointer-events-none opacity-50' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDropOver(true) }}
        onDragLeave={() => setDropOver(false)}
        onDrop={(e) => { e.preventDefault(); setDropOver(false); readFile(e.dataTransfer.files[0]) }}
      >
        {busy === 'image' ? <Loader2 className="h-5 w-5 animate-spin text-brand-600" /> : <Upload className="h-5 w-5 text-brand-600" />}
        <span className="text-sm font-semibold">{busy === 'image' ? (progress || 'Reading image…') : 'Upload or drop a poster image'}</span>
        <span className="text-xs text-slate-500">PNG, JPG, WEBP, GIF under 3 MB. Text is extracted, then you check it.</span>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onImage} />
      </label>

      <div className="card space-y-3">
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Festival poster" maxLength={80} />
        </div>
        <div>
          <label className="label" htmlFor="text">Poster text</label>
          <textarea id="text" className="input min-h-[120px]" value={text} onChange={(e) => { setText(e.target.value); if (findings) { setFindings(null); setMeta(null) } }} placeholder="Paste the text of your poster, caption or banner here" maxLength={3000} />
        </div>
        <button className="btn btn-primary" onClick={runCheck} disabled={!text.trim() || !!busy}>
          {busy === 'check' ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking against your brand rules...</> : 'Check my content'}
        </button>
        {imgNote && <p className="text-xs text-slate-500">{imgNote}</p>}
      </div>

      {error && <ErrorBox message={error} onRetry={busy ? undefined : runCheck} />}

      {findings && (
        <section className="space-y-4" aria-live="polite">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card !p-3"><p className="text-xs font-semibold uppercase text-slate-500">Contradicted</p><p className="text-2xl font-extrabold text-red-700">{counts.contradicted}</p></div>
            <div className="card !p-3"><p className="text-xs font-semibold uppercase text-slate-500">Needs review</p><p className="text-2xl font-extrabold text-amber-700">{counts.review}</p></div>
            <div className="card !p-3"><p className="text-xs font-semibold uppercase text-slate-500">Supported</p><p className="text-2xl font-extrabold text-green-700">{counts.supported}</p></div>
          </div>
          {meta && <p className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600">{meta.note}</p>}
          {findings.length === 0 && <div className="card text-sm text-slate-600">No issues against stored facts and rules. A reviewer can still look it over.</div>}
          {findings.map((f) => <FindingCard key={f.id} finding={f} onDecide={(d) => decide(f.id, d)} />)}

          <div className="card space-y-3">
            <div>
              <span className="label">Text that would be saved (version {finalText !== checkedText ? 2 : 1})</span>
              <p className="rounded-xl bg-slate-50 p-3 text-sm">{finalText}</p>
            </div>
            <p className="text-sm text-slate-600">{findings.length} findings · {acceptedN} accepted · {ignoredN} ignored · {undecided} still open</p>
            {undecided > 0 && <p className="text-xs text-amber-700">Open findings stay visible to the reviewer. Ignoring one does not hide it.</p>}
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={() => setConfirm(true)} disabled={!!busy}>
                <Send className="h-4 w-4" /> Submit for review
              </button>
              <button className="btn btn-ghost" onClick={() => save(false)} disabled={!!busy}>
                {busy === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save as draft
              </button>
            </div>
          </div>
        </section>
      )}

      {confirm && (
        <Modal title="Send to the review queue?" onClose={() => setConfirm(false)}>
          <div className="space-y-3 text-sm">
            <p>This creates a submission and puts it in Priya&rsquo;s reviewer queue.</p>
            <ul className="list-disc pl-5 text-slate-600">
              <li>Title: {title || 'Untitled poster'}</li>
              <li>Version saved: {finalText !== checkedText ? 2 : 1}</li>
              <li>Status after send: Waiting for review</li>
              <li>{acceptedN} accepted fix{acceptedN === 1 ? '' : 'es'}, {ignoredN} ignored, {undecided} still open</li>
            </ul>
            {ignoredN + undecided > 0 && (
              <p className="rounded-xl bg-amber-50 p-3 text-amber-900">Ignored and open findings travel with the poster. The reviewer can request changes or approve anyway.</p>
            )}
            <div className="flex gap-2">
              <button className="btn btn-ghost flex-1" onClick={() => setConfirm(false)}>Cancel</button>
              <button className="btn btn-primary flex-1" disabled={!!busy} onClick={() => save(true)}>{busy === 'submit' ? 'Sending…' : 'Confirm submit'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
