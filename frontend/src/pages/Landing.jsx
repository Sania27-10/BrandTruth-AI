import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Loader2, Copy, Check } from 'lucide-react'
import { startDemo, demoInfo, loginDemo } from '../api.js'
import { useApp } from '../context/AppContext.jsx'
import { ErrorBox } from '../components/States.jsx'

const FALLBACK_ACCOUNTS = [
  { username: 'meera', name: 'Meera', role: 'manager', password: 'chai-tapri' },
  { username: 'rahul', name: 'Rahul', role: 'creator', password: 'chai-tapri' },
  { username: 'priya', name: 'Priya', role: 'reviewer', password: 'chai-tapri' },
]

export default function Landing() {
  const { startWorkspace, notice, workspace, role } = useApp()
  const navigate = useNavigate()
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [accounts, setAccounts] = useState(FALLBACK_ACCOUNTS)
  const [password, setPassword] = useState('chai-tapri')
  const [username, setUsername] = useState('rahul')
  const [typedPassword, setTypedPassword] = useState('chai-tapri')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    demoInfo().then((info) => {
      if (info?.accounts?.length) setAccounts(info.accounts)
      if (info?.password) {
        setPassword(info.password)
        setTypedPassword(info.password)
      }
    }).catch(() => { /* keep the printed fallback */ })
  }, [])

  const go = (ws) => {
    startWorkspace(ws)
    const role = ws.signedInAs || 'creator'
    navigate(role === 'manager' ? '/brand' : role === 'reviewer' ? '/queue' : '/check')
  }

  const beginPrivate = async () => {
    setLoading('private'); setError('')
    try { go(await startDemo()) } catch (e) { setError(e.message); setLoading('') }
  }

  const enterRole = async (role) => {
    setLoading(role); setError('')
    try { go(await loginDemo({ role })) } catch (e) { setError(e.message); setLoading('') }
  }

  const enterForm = async (e) => {
    e.preventDefault()
    setLoading('form'); setError('')
    try { go(await loginDemo({ username, password: typedPassword })) } catch (err) { setError(err.message); setLoading('') }
  }

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard may be blocked */ }
  }

  const home = { manager: '/brand', reviewer: '/queue', creator: '/check' }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center px-4 py-10">
      <ShieldCheck className="h-12 w-12 text-brand-600" />
      <h1 className="mt-3 text-center text-4xl font-extrabold tracking-tight sm:text-5xl">BrandTruth AI</h1>
      <p className="mt-3 text-center text-lg text-slate-600">Catch brand mistakes before the post goes live.</p>

      {notice && <div className="mt-6 w-full max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{notice}</div>}

      <section className="card mt-8 w-full max-w-xl space-y-4 text-left">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Demo login</p>
          <h2 className="mt-1 text-lg font-bold">Use these accounts. No sign-up.</h2>
          <p className="mt-1 text-sm text-slate-600">Judges can log in as any role. The password is the same for all three people at Chai Tapri Co.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Password</span>
          <code className="rounded-lg bg-white px-2 py-1 text-sm font-bold text-slate-800">{password}</code>
          <button type="button" className="btn btn-ghost !py-1 !text-xs" onClick={copyPassword}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="py-1 pr-3">Role</th><th className="py-1 pr-3">Name</th><th className="py-1 pr-3">Username</th><th className="py-1 pr-3">Password</th><th className="py-1"></th></tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.username} className="border-t border-slate-100">
                  <td className="py-2 pr-3 capitalize">{a.role}</td>
                  <td className="py-2 pr-3 font-semibold">{a.name}</td>
                  <td className="py-2 pr-3"><code>{a.username}</code></td>
                  <td className="py-2 pr-3"><code>{a.password || password}</code></td>
                  <td className="py-2 text-right">
                    <button className="btn btn-primary !py-1 !text-xs" disabled={!!loading} onClick={() => enterRole(a.role)}>
                      {loading === a.role ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `Enter as ${a.name}`}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form onSubmit={enterForm} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" aria-label="Username" autoComplete="username" />
          <input className="input" type="text" value={typedPassword} onChange={(e) => setTypedPassword(e.target.value)} placeholder="password" aria-label="Password" autoComplete="current-password" />
          <button className="btn btn-ghost" disabled={!!loading}>{loading === 'form' ? 'Signing in...' : 'Log in'}</button>
        </form>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button onClick={beginPrivate} disabled={!!loading} className="btn btn-primary !px-6 !py-2.5">
          {loading === 'private' ? <><Loader2 className="h-5 w-5 animate-spin" /> Setting up...</> : 'Start a private demo'}
        </button>
        {workspace && !loading && (
          <button onClick={() => navigate(home[role] || '/check')} className="text-sm font-semibold text-brand-700 underline">Continue your current demo</button>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">A private demo gives you a fresh workspace. The shared login above keeps the sample brand, so ProofMesh and Insights already have history.</p>
      {loading && <p className="mt-2 text-xs text-slate-500">The server may take up to a minute to wake up the first time.</p>}
      {error && <div className="mt-4 w-full max-w-xl"><ErrorBox message={error} /></div>}

      <div className="mt-12 grid w-full gap-4 text-left sm:grid-cols-3">
        {[
          ['1. Check a poster', 'Open as Creator. Pick a sample, run the check, accept or ignore each fix.'],
          ['2. Approve it', 'Switch to Reviewer. Open the queue, comment, approve or send it back.'],
          ['3. Change a fact', 'Switch to Manager. Edit F-04 (festival date) or F-01 (snack discount), then open ProofMesh and Insights.'],
        ].map(([t, d]) => (
          <div key={t} className="card"><p className="font-bold">{t}</p><p className="mt-1 text-sm text-slate-600">{d}</p></div>
        ))}
      </div>
      <p className="mt-8 text-xs text-slate-400">Demo uses made-up sample data (Chai Tapri Co.). Please do not enter confidential information.</p>
    </div>
  )
}
