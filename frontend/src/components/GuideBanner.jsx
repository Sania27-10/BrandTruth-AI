import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

const BY_ROLE = {
  creator: [
    ['checked', 'Select a sample poster or upload your own'],
    ['decided', 'Check the content, then accept one fix and ignore another'],
    ['submitted', 'Submit for review'],
    ['approved', 'Switch to Reviewer after you submit, or keep editing drafts'],
  ],
  reviewer: [
    ['queue', 'Open the review queue'],
    ['inspect', 'Select a submission and inspect findings and comments'],
    ['decide', 'Approve, request changes, or approve anyway after confirming ignored findings'],
    ['done', 'The creator is notified and can resubmit'],
  ],
  manager: [
    ['library', 'Open the Brand Library'],
    ['change', 'Change an approved fact (F-04 for festival dates, or F-01 for the snack discount)'],
    ['mesh', 'Open ProofMesh'],
    ['inspect', 'Inspect affected assets and submissions, then re-verify'],
  ],
}

export default function GuideBanner() {
  const { progress, role, workspace } = useApp()
  const key = `bt_guide_hidden_${workspace?.orgCode || 'x'}_${role}`
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem(key) === '1' } catch { return false }
  })
  useEffect(() => {
    try { setHidden(sessionStorage.getItem(key) === '1') } catch { setHidden(false) }
  }, [key])
  if (hidden) return null
  const close = () => {
    try { sessionStorage.setItem(key, '1') } catch { /* ignore */ }
    setHidden(true)
  }
  const steps = BY_ROLE[role] || BY_ROLE.creator
  const title = role === 'manager' ? 'Manager walkthrough' : role === 'reviewer' ? 'Reviewer walkthrough' : 'Creator walkthrough'
  return (
    <div className="mb-5 rounded-2xl border border-brand-100 bg-brand-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-brand-700">{title}</p>
        <button onClick={close} aria-label="Hide guide" className="rounded p-1 text-brand-700 hover:bg-brand-100"><X className="h-4 w-4" /></button>
      </div>
      <ol className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {steps.map(([k, text], i) => (
          <li key={k} className={`flex items-start gap-2 text-sm ${progress[k] ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${progress[k] ? 'bg-green-500 text-white' : 'bg-white text-brand-700'}`}>
              {progress[k] ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            {text}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-slate-500">Use the role switcher at the top. Demo accounts are printed on the home page (meera / rahul / priya).</p>
    </div>
  )
}
