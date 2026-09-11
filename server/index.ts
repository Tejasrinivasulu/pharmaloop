import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { createApp } from './src/index.js'
import { connectAndHydrateStore, persistStoreNow, isMongoLive } from './src/mongo.js'
import { DEMO_PASSWORD } from './src/store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const PORT = Number(process.env.PORT) || 4000

async function main() {
  const mode = await connectAndHydrateStore()

  const app = await createApp()
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PharmaLoop API listening on http://0.0.0.0:${PORT}`)
    console.log(`Data store: ${mode === 'mongo' ? 'MongoDB (real-time)' : 'in-memory'}`)
    console.log(`Demo logins (password: ${DEMO_PASSWORD}):`)
    console.log('  pharmacy@pharmaloop.com     / Pharmacy')
    console.log('  distributor@pharmaloop.com  / Distributor')
    console.log('  manufacturer@pharmaloop.com / Manufacturer')
    console.log('  admin@pharmaloop.com        / Admin')
  })

  const shutdown = async () => {
    if (isMongoLive()) {
      try {
        await persistStoreNow()
        console.log('[mongo] flushed store on shutdown')
      } catch {
        /* ignore */
      }
    }
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown())
  process.on('SIGTERM', () => void shutdown())
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
