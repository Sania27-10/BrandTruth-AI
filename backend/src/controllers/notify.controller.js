import * as db from '../db/index.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { listForUser } from '../utils/notify.js'

export const listNotifications = asyncHandler(async (req, res) => {
  const items = await listForUser(req.user)
  res.json({ items, unread: items.filter((n) => !n.read).length })
})

export const markRead = asyncHandler(async (req, res) => {
  const n = await db.get('notifications', req.params.id)
  if (!n || n.orgCode !== req.user.orgCode || n.userId !== req.user._id) {
    return res.json({ ok: true })
  }
  n.read = true
  await db.save('notifications', n)
  res.json(n)
})

export const markAllRead = asyncHandler(async (req, res) => {
  const items = await listForUser(req.user)
  for (const n of items) {
    if (n.read) continue
    n.read = true
    await db.save('notifications', n)
  }
  res.json({ ok: true })
})
