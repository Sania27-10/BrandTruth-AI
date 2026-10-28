import { Check, X, Undo2 } from 'lucide-react'
import StatusBadge from './StatusBadge.jsx'

// onDecide(decision) is optional. Without it the card is read-only (used on the detail page).
export default function FindingCard({ finding, onDecide }) {
  const f = finding
  const ignored = f.decision === 'ignored'
  const accepted = f.decision === 'accepted'
  return (
    <div className={`card ${ignored ? 'border-amber-300 bg-amber-50/40' : ''} ${accepted ? 'opacity-90' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={f.status} />
        {f.decision && <StatusBadge value={f.decision} />}
        {f.ruleOrFactId && <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700" title="Approved fact or rule used">{f.ruleOrFactId}</span>}
        {ignored && !onDecide && <span className="text-xs font-semibold text-amber-700">Ignored by creator, please look closely</span>}
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900">&ldquo;{f.claim}&rdquo;</p>
      <p className="mt-1 text-sm text-slate-600">{f.reason}</p>
      {f.suggestedFix && f.status !== 'supported' && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
          <span className="label !mb-0.5">Suggested fix</span>
          <span className="text-slate-800">{f.suggestedFix}</span>
        </div>
      )}
      {onDecide && f.status !== 'supported' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {!f.decision ? (
            <>
              <button className="btn btn-primary !py-1.5" onClick={() => onDecide('accepted')}><Check className="h-4 w-4" /> Accept fix</button>
              <button className="btn btn-ghost !py-1.5" onClick={() => onDecide('ignored')}><X className="h-4 w-4" /> Ignore</button>
            </>
          ) : (
            <button className="btn btn-ghost !py-1.5" onClick={() => onDecide(null)}><Undo2 className="h-4 w-4" /> Undo</button>
          )}
        </div>
      )}
    </div>
  )
}
