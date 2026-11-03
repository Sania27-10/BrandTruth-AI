import * as db from '../db/index.js'

export async function notifyRoles(orgCode, roles, payload) {
  const users = await db.find('users', { orgCode })
  const at = new Date().toISOString()
  const wanted = new Set(roles)
  for (const u of users) {
    if (!wanted.has(u.role)) continue
    await db.insert('notifications', {
      orgCode,
      userId: u._id,
      role: u.role,
      event: payload.event,
      title: payload.title,
      body: payload.body,
      href: payload.href || '/',
      read: false,
      at,
    })
  }
}

export async function listForUser(user) {
  const rows = await db.find('notifications', { orgCode: user.orgCode, userId: user._id })
  return rows.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 50)
}
