import { Loader2, AlertTriangle } from 'lucide-react'

export function Spinner({ text = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500" role="status">
      <Loader2 className="h-4 w-4 animate-spin" /> {text}
    </div>
  )
}

export function Empty({ title, hint, children }) {
  return (
    <div className="card text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && <button className="btn btn-ghost !py-1" onClick={onRetry}>Retry</button>}
    </div>
  )
}
