import { createContext, useContext, useState, useMemo, useCallback } from 'react'
import { makeApi } from '../api.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const load = (k, d) => {
  try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d }
}
const save = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }

export function AppProvider({ children }) {
  const [workspace, setWorkspace] = useState(() => load('bt_ws', null))
  const [role, setRoleState] = useState(() => load('bt_role', 'creator'))
  const [progress, setProgress] = useState(() => load('bt_prog', {}))
  const [notice, setNotice] = useState('')

  const user = workspace ? workspace.users.find((u) => u.role === role) || null : null

  const expire = useCallback(() => {
    setWorkspace(null)
    save('bt_ws', null)
    setNotice('Your demo workspace expired (the server may have restarted). Please start a new demo.')
  }, [])

  const api = useMemo(() => makeApi(user ? user.token : null, expire), [user, expire])

  const startWorkspace = (ws) => {
    setWorkspace(ws); save('bt_ws', ws)
    setRoleState('creator'); save('bt_role', 'creator')
    setProgress({}); save('bt_prog', {})
    setNotice('')
  }
  const setRole = (r) => { setRoleState(r); save('bt_role', r) }
  const mark = (step) => setProgress((p) => { const n = { ...p, [step]: true }; save('bt_prog', n); return n })
  const endDemo = () => { setWorkspace(null); save('bt_ws', null); setProgress({}); save('bt_prog', {}) }

  const value = { workspace, role, user, api, progress, notice, setNotice, startWorkspace, setRole, mark, endDemo }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
