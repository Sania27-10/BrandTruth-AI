import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { startDemo } from '../api.js'
import { useApp } from '../context/AppContext.jsx'
import { ErrorBox } from '../components/States.jsx'

export default function Landing() {
  const { startWorkspace, notice, workspace } = useApp()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const begin = async () => {
    setLoading(true); setError('')
    try {
      const ws = await startDemo()
      startWorkspace(ws)
      navigate('/check')
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-10 text-center">
      <ShieldCheck className="h-12 w-12 text-brand-600" />
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">BrandTruth AI</h1>
      <p className="mt-3 text-lg text-slate-600">Catch brand mistakes before the post goes live.</p>

      {notice && <div className="mt-6 w-full max-w-md rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{notice}</div>}

      <button onClick={begin} disabled={loading} className="btn btn-primary mt-8 !px-8 !py-3 !text-base">
        {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Setting up your workspace...</> : 'Start demo'}
      </button>
      {workspace && !loading && (
        <button onClick={() => navigate('/check')} className="mt-3 text-sm font-semibold text-brand-700 underline">Continue your current demo</button>
      )}
      <p className="mt-3 text-sm text-slate-500">No sign-up needed. Try it in 2 minutes.</p>
      {loading && <p className="mt-2 text-xs text-slate-500">The server may take up to a minute to wake up the first time.</p>}
      {error && <div className="mt-4 w-full max-w-md"><ErrorBox message={error} onRetry={begin} /></div>}

      <div className="mt-12 grid w-full gap-4 text-left sm:grid-cols-3">
        {[
          ['1. Brand rules', 'A manager stores approved facts and rules once.'],
          ['2. Check and fix', 'Creators get explained findings, each tied to the exact rule, with a suggested fix.'],
          ['3. Human approval', 'Reviewers comment and approve. Every version is kept.'],
        ].map(([t, d]) => (
          <div key={t} className="card"><p className="font-bold">{t}</p><p className="mt-1 text-sm text-slate-600">{d}</p></div>
        ))}
      </div>
      <p className="mt-8 text-xs text-slate-400">Demo uses made-up sample data (Chai Tapri Co.). Please do not enter confidential information.</p>
    </div>
  )
}
