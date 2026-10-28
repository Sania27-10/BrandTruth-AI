const FINDING = {
  contradicted: ['Contradicted', 'bg-red-50 text-red-700 border-red-200'],
  needs_review: ['Needs review', 'bg-amber-50 text-amber-700 border-amber-200'],
  supported: ['Supported', 'bg-green-50 text-green-700 border-green-200'],
  accepted: ['Accepted', 'bg-white text-green-700 border-green-300'],
  ignored: ['Ignored', 'bg-slate-100 text-slate-600 border-slate-200'],
}
const SUBMISSION = {
  draft: ['Draft', 'bg-slate-100 text-slate-700 border-slate-200'],
  waiting_for_review: ['Waiting for review', 'bg-blue-50 text-blue-700 border-blue-200'],
  changes_requested: ['Changes requested', 'bg-orange-50 text-orange-700 border-orange-200'],
  approved: ['Approved', 'bg-green-50 text-green-700 border-green-200'],
}

export default function StatusBadge({ value, kind = 'finding' }) {
  const map = kind === 'submission' ? SUBMISSION : FINDING
  const [text, cls] = map[value] || [value, 'bg-slate-100 text-slate-700 border-slate-200']
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>
}
