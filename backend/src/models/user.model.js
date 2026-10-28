import { randomUUID } from 'node:crypto'

// Demo users: one per role, each with its own token.
export const makeUser = ({ name, role, orgCode }) => ({ _id: randomUUID(), name, role, orgCode, token: randomUUID() })
export const publicUser = (u) => ({ name: u.name, role: u.role, token: u.token })
