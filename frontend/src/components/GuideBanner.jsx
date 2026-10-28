import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

const STEPS = [
  ['checked', 'Creator: pick a sample poster and click "Check my content"'],
  ['decided', 'Accept a fix and ignore one'],
  ['submitted', 'Click "Submit for review"'],
  ['approved', 'Switch to Reviewer (top right), open the item and Approve'],
]

export default function GuideBanner() {
  const { progress } = useApp()
  const [hidden, setHidden] = useState(() => sessionStorage.getItem('bt_guide_hidden') === '1')
  if (hidden) return null
  const close = () => { sessionStorage.setItem('bt_guide_hidden', '1'); setHidden(true) }
  return (
    <div className="mb-5 rounded-2xl border border-brand-100 bg-brand-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-brand-700">Try it in 4 steps</p>
        <button onClick={close} aria-label="Hide guide" className="rounded p-1 text-brand-700 hover:bg-brand-100"><X className="h-4 w-4" /></button>
      </div>
      <ol className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {STEPS.map(([key, text], i) => (
          <li key={key} className={`flex items-start gap-2 text-sm ${progress[key] ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${progress[key] ? 'bg-green-500 text-white' : 'bg-white text-brand-700'}`}>
              {progress[key] ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            {text}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-slate-500">Managers can add facts and rules on the Brand Library page. No sign-in needed: one person can use all three roles.</p>
    </div>
  )
}
