// Data layer: MongoDB if MONGODB_URI is set, otherwise in-memory (resets on restart).
import { randomUUID } from 'node:crypto'
import { DB_NAME } from '../constants.js'

const mem = { users: new Map(), brands: new Map(), submissions: new Map() }
let db = null
let mode = 'memory'

export async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.log('[db] MONGODB_URI not set: using in-memory storage')
    return mode
  }
  try {
    const { MongoClient } = await import('mongodb')
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 })
    await client.connect()
    db = client.db(DB_NAME)
    mode = 'mongodb'
    console.log('[db] connected to MongoDB')
  } catch (e) {
    console.error('[db] MongoDB connection failed, falling back to memory:', e.message)
  }
  return mode
}

export const dbMode = () => mode
const clone = (x) => JSON.parse(JSON.stringify(x))

export async function insert(col, doc) {
  if (!doc._id) doc._id = randomUUID()
  if (db) await db.collection(col).insertOne(clone(doc))
  else mem[col].set(doc._id, clone(doc))
  return doc
}

export async function get(col, id) {
  if (db) return db.collection(col).findOne({ _id: id })
  const d = mem[col].get(id)
  return d ? clone(d) : null
}

export async function find(col, filter = {}) {
  if (db) return db.collection(col).find(filter).toArray()
  return [...mem[col].values()]
    .filter((d) => Object.entries(filter).every(([k, v]) => d[k] === v))
    .map(clone)
}

export async function save(col, doc) {
  if (db) await db.collection(col).replaceOne({ _id: doc._id }, clone(doc), { upsert: true })
  else mem[col].set(doc._id, clone(doc))
  return doc
}
