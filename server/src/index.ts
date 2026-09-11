import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import authRoutes from './routes/auth.js'
import pharmacyRoutes from './routes/pharmacy.js'
import distributorRoutes from './routes/distributor.js'
import manufacturerRoutes from './routes/manufacturer.js'
import adminRoutes from './routes/admin.js'
import sharedRoutes from './routes/shared.js'
import { isMongoLive, mongoPersistMiddleware } from './mongo.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function corsOrigins(): boolean | string | string[] {
  const raw = process.env.FRONTEND_ORIGIN || process.env.CORS_ORIGIN
  if (!raw || raw === '*') return true
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

export async function createApp() {
  const app = express()

  app.use(
    cors({
      origin: corsOrigins(),
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '2mb' }))
  app.use(mongoPersistMiddleware)

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'PharmaLoop API',
      store: isMongoLive() ? 'mongodb' : 'in-memory',
      mongo: mongoose.connection.readyState === 1 ? 'connected' : 'offline',
      time: new Date().toISOString(),
    })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api', sharedRoutes)
  app.use('/api/pharmacy', pharmacyRoutes)
  app.use('/api/distributor', distributorRoutes)
  app.use('/api/manufacturer', manufacturerRoutes)
  app.use('/api/admin', adminRoutes)

  // Production: serve Vite build from same host (Render single service)
  const distPath = path.resolve(__dirname, '../../dist')
  if (existsSync(distPath)) {
    app.use(express.static(distPath))
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  } else {
    app.use((_req, res) => {
      res.status(404).json({ error: 'Not found' })
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = (err as { status?: number }).status || 500
    const message = err instanceof Error ? err.message : 'Internal server error'
    res.status(status).json({ error: message })
  })

  return app
}

/** @deprecated use connectAndHydrateStore from mongo.ts */
export async function maybeConnectMongo(): Promise<void> {
  const { connectAndHydrateStore } = await import('./mongo.js')
  await connectAndHydrateStore()
}
