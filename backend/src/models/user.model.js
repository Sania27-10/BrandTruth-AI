import { randomUUID } from 'node:crypto'

// Demo users: one per role, each with its own token.
export const makeUser = ({ name, role, orgCode, username = null, password = null }) => ({
  _id: randomUUID(), name, role, orgCode, token: randomUUID(), username, password,
})
export const publicUser = (u) => ({ name: u.name, role: u.role, token: u.token, username: u.username || null })
