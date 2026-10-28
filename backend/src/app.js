import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import routes from './routes/index.js'
import { apiNotFound, errorHandler } from './middlewares/error.middleware.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors())
app.use(express.json({ limit: '6mb' }))

app.use('/api', routes)
app.use('/api', apiNotFound)

// In production the built React app is served from this same server (one link to share).
// In development the Vite dev server runs separately and proxies /api to this server.
const dist = path.join(__dirname, '../../frontend/dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
} else {
  app.get('/', (_req, res) => res.send('BrandTruth API is running. Start the frontend (cd frontend && npm run dev) or build it for production.'))
}

app.use(errorHandler)

export default app
