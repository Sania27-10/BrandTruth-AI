import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheck, FilePlus, ListChecks, Library, ClipboardCheck, Info } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import GuideBanner from './GuideBanner.jsx'

const NAV = {
  creator: [{ to: '/check', label: 'New Check', icon: FilePlus }, { to: '/submissions', label: 'My Submissions', icon: ListChecks }],
  manager: [{ to: '/brand', label: 'Brand Library', icon: Library }],
  reviewer: [{ to: '/queue', label: 'Review Queue', icon: ClipboardCheck }],
}
const HOME = { creator: '/check', manager: '/brand', reviewer: '/queue' }
const ALLOWED = { creator: ['/check', '/submissions', '/submission'], manager: ['/brand', '/submission'], reviewer: ['/queue', '/submission'] }
const ROLES = [['creator', 'Creator'], ['manager', 'Manager'], ['reviewer', 'Reviewer']]

export default function Layout() {
  const { workspace, role, user, setRole, endDemo } = useApp()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  if (!workspace) return <Navigate to="/" replace />
  if (!ALLOWED[role].some((p) => pathname.startsWith(p))) return <Navigate to={HOME[role]} replace />
  const links = NAV[role]

  const switchRole = (r) => { setRole(r); navigate(HOME[r]) }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            <span className="text-lg font-extrabold tracking-tight">BrandTruth AI</span>
            <span className="hidden rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 sm:inline">{workspace.orgCode}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1 text-xs text-slate-500 lg:flex" title="Findings combine exact code checks with AI review. Humans approve everything.">
              <Info className="h-3.5 w-3.5" /> AI-assisted
            </span>
            <div className="flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Switch role">
              {ROLES.map(([r, label]) => (
                <button key={r} role="tab" aria-selected={role === r} onClick={() => switchRole(r)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${role === r ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <aside className="hidden w-52 shrink-0 md:block">
          <p className="mb-3 text-xs text-slate-500">Acting as <b>{user ? user.name : ''}</b> ({role})</p>
          <nav className="space-y-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon className="h-4 w-4" /> {label}
              </NavLink>
            ))}
          </nav>
          <button onClick={() => { endDemo(); navigate('/') }} className="mt-6 text-xs text-slate-500 underline hover:text-slate-700">Start a fresh demo</button>
        </aside>
        <main className="min-w-0 flex-1">
          <GuideBanner />
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-100 bg-white py-2 md:hidden">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 text-xs font-semibold ${isActive ? 'text-brand-700' : 'text-slate-500'}`}>
            <Icon className="h-5 w-5" /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
