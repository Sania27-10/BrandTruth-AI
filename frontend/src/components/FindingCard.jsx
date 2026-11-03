import { Check, X, Undo2 } from 'lucide-react'
import StatusBadge from './StatusBadge.jsx'

export default function FindingCard({ finding, onDecide, highlight }) {
  const f = finding
  const ignored = f.decision === 'ignored'
  const accepted = f.decision === 'accepted'
  const sourceLabel = f.source === 'ai' ? 'AI review' : f.source === 'sample' ? 'Saved sample check' : 'Exact code check'
  return (
    <div className={`card ${ignored ? 'border-amber-300 bg-amber-50/40' : ''} ${accepted ? 'opacity-90' : ''} ${f.stale ? 'border-amber-400' : ''} ${highlight ? 'ring-2 ring-amber-400' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={f.status} />
        {f.stale && <StatusBadge value="reverification_required" />}
        {f.reverified && !f.stale && <StatusBadge value="reverified" />}
        {f.decision && <StatusBadge value={f.decision} />}
        {f.ruleOrFactId && <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">{f.ruleOrFactId}{f.factVersion ? ` v${f.factVersion}` : f.ruleVersion ? ` v${f.ruleVersion}` : ''}</span>}
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{sourceLabel}</span>
        {ignored && !onDecide && <span className="text-xs font-semibold text-amber-700">Ignored by creator — still open for the reviewer</span>}
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900">&ldquo;{f.claim}&rdquo;</p>
      <p className="mt-1 text-sm text-slate-600">{f.reason}</p>
      {f.staleReason && <p className="mt-1 text-sm text-amber-800">{f.staleReason}</p>}
      {(f.originalFactValue || f.updatedFactValue) && (
        <p className="mt-1 text-xs text-slate-500">Approved value was {f.originalFactValue || '—'} · now {f.updatedFactValue || '—'}</p>
      )}
      {f.suggestedFix && f.status !== 'supported' && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
          <span className="label !mb-0.5">Suggested correction</span>
          <span className="text-slate-800">{f.suggestedFix}</span>
          {f.verified && (
            <p className="mt-2 text-xs font-medium text-green-700">Verified rewrite: this wording was run through the same checker and does not break another stored rule. Approved brand phrasing is preferred when a first draft would fail.</p>
          )}
          {!f.verified && f.verifiedNote && (
            <p className="mt-2 text-xs text-amber-700">{f.verifiedNote}</p>
          )}
        </div>
      )}
      {!f.suggestedFix && f.status !== 'supported' && f.verifiedNote && (
        <p className="mt-3 text-xs text-amber-700">{f.verifiedNote}</p>
      )}
      {onDecide && f.status !== 'supported' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {!f.decision ? (
            <>
              {f.suggestedFix && <button className="btn btn-primary !py-1.5" onClick={() => onDecide('accepted')}><Check className="h-4 w-4" /> Accept fix</button>}
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
