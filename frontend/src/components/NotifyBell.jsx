import { useCallback, useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { fmtDate } from '../lib.js'

export default function NotifyBell() {
  const { api } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState({ items: [], unread: 0 })

  const load = useCallback(async () => {
    try { setData(await api.listNotifications()) } catch { /* bell is optional */ }
  }, [api])

  useEffect(() => { load() }, [load])

  const openItem = async (n) => {
    try { await api.readNotification(n._id) } catch { /* ignore */ }
    setOpen(false)
    navigate(n.href || '/')
    load()
  }

  return (
    <div className="relative">
      <button className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Notifications" onClick={() => { setOpen((v) => !v); load() }}>
        <Bell className="h-4 w-4" />
        {data.unread > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-600" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] rounded-2xl border border-slate-100 bg-white p-2 shadow-soft">
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Notifications</p>
            {data.unread > 0 && (
              <button className="text-xs font-semibold text-brand-700" onClick={async () => { await api.readAllNotifications(); load() }}>Mark all read</button>
            )}
          </div>
          {data.items.length === 0 && <p className="px-2 py-6 text-center text-sm text-slate-500">No notifications yet. Actions you take will show up here.</p>}
          <ul className="max-h-80 overflow-y-auto">
            {data.items.map((n) => (
              <li key={n._id}>
                <button onClick={() => openItem(n)} className={`w-full rounded-xl px-3 py-2 text-left text-sm ${n.read ? 'text-slate-500' : 'bg-brand-50 text-slate-800'}`}>
                  <span className="font-semibold">{n.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{n.body}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">{fmtDate(n.at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
