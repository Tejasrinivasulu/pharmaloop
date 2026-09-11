import mongoose from 'mongoose'
import type { Store } from './types.js'
import { createSeedStore, getStore, resetStoreSync, DEMO_PASSWORD } from './store.js'
import { Models } from './models/collections.js'

let mongoEnabled = false
let saveTimer: ReturnType<typeof setTimeout> | null = null
let saving: Promise<void> | null = null

const ROLE_ORDER = ['Admin', 'Manufacturer', 'Distributor', 'Pharmacy'] as const

/** Drop Mongo/_id noise and keep only own enumerable fields in stable JSON form */
function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function sortById<T extends { id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id))
}

function sortByCreatedDesc<T extends { createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function sortUsers(rows: Store['users']) {
  return [...rows].sort((a, b) => {
    const ra = ROLE_ORDER.indexOf(a.role as (typeof ROLE_ORDER)[number])
    const rb = ROLE_ORDER.indexOf(b.role as (typeof ROLE_ORDER)[number])
    if (ra !== rb) return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb)
    return a.email.localeCompare(b.email)
  })
}

function sortOrgs(rows: Store['organizations']) {
  return [...rows].sort((a, b) => {
    const ra = ROLE_ORDER.indexOf(a.type as (typeof ROLE_ORDER)[number])
    const rb = ROLE_ORDER.indexOf(b.type as (typeof ROLE_ORDER)[number])
    if (ra !== rb) return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb)
    return a.name.localeCompare(b.name)
  })
}

function stripMongoIds<T extends Record<string, unknown>>(doc: T): Omit<T, '_id' | '__v'> {
  const { _id: _a, __v: _b, ...rest } = doc as T & { _id?: unknown; __v?: unknown }
  return rest
}

export function isMongoLive(): boolean {
  return mongoEnabled && mongoose.connection.readyState === 1
}

async function replaceCollection(
  model: mongoose.Model<unknown>,
  docs: Record<string, unknown>[],
): Promise<void> {
  await model.deleteMany({})
  if (!docs.length) return
  await model.insertMany(docs, { ordered: true })
}

/** Persist full store into ordered, named collections */
async function writeStoreNormalized(store: Store): Promise<void> {
  if (!isMongoLive()) return

  const data = plain(store)

  await Promise.all([
    replaceCollection(Models.Organization(), sortOrgs(data.organizations) as unknown as Record<string, unknown>[]),
    replaceCollection(Models.User(), sortUsers(data.users) as unknown as Record<string, unknown>[]),
    replaceCollection(
      Models.Batch(),
      sortById(data.batches).sort((a, b) => a.batchNumber.localeCompare(b.batchNumber)) as unknown as Record<
        string,
        unknown
      >[],
    ),
    replaceCollection(
      Models.Inventory(),
      [...data.inventory].sort((a, b) => a.batchNumber.localeCompare(b.batchNumber)) as unknown as Record<
        string,
        unknown
      >[],
    ),
    replaceCollection(
      Models.Return(),
      sortByCreatedDesc(data.returns) as unknown as Record<string, unknown>[],
    ),
    replaceCollection(
      Models.Settlement(),
      sortByCreatedDesc(data.settlements) as unknown as Record<string, unknown>[],
    ),
    replaceCollection(
      Models.Manifest(),
      sortByCreatedDesc(data.manifests) as unknown as Record<string, unknown>[],
    ),
    replaceCollection(
      Models.Notification(),
      sortByCreatedDesc(data.notifications).slice(0, 500) as unknown as Record<string, unknown>[],
    ),
    replaceCollection(
      Models.Alert(),
      sortByCreatedDesc(data.alerts) as unknown as Record<string, unknown>[],
    ),
    replaceCollection(
      Models.Investigation(),
      sortByCreatedDesc(data.investigations) as unknown as Record<string, unknown>[],
    ),
    replaceCollection(
      Models.Audit(),
      [...data.auditLog]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 2000) as unknown as Record<string, unknown>[],
    ),
    replaceCollection(Models.Certificate(), sortById(data.certificates) as unknown as Record<string, unknown>[]),
    replaceCollection(
      Models.AiInsight(),
      sortByCreatedDesc(data.aiInsights) as unknown as Record<string, unknown>[],
    ),
    Models.Meta().findOneAndUpdate(
      { key: 'main' },
      { key: 'main', seq: data.seq, updatedAt: new Date() },
      { upsert: true },
    ),
  ])
}

async function loadStoreNormalized(): Promise<Store | null> {
  const userCount = await Models.User().countDocuments()
  if (!userCount) return null

  const [
    organizationsRaw,
    usersRaw,
    batchesRaw,
    inventoryRaw,
    returnsRaw,
    settlementsRaw,
    manifestsRaw,
    notificationsRaw,
    alertsRaw,
    investigationsRaw,
    auditRaw,
    certificatesRaw,
    aiRaw,
    meta,
  ] = await Promise.all([
    Models.Organization().find({}).lean(),
    Models.User().find({}).lean(),
    Models.Batch().find({}).lean(),
    Models.Inventory().find({}).lean(),
    Models.Return().find({}).lean(),
    Models.Settlement().find({}).lean(),
    Models.Manifest().find({}).lean(),
    Models.Notification().find({}).lean(),
    Models.Alert().find({}).lean(),
    Models.Investigation().find({}).lean(),
    Models.Audit().find({}).lean(),
    Models.Certificate().find({}).lean(),
    Models.AiInsight().find({}).lean(),
    Models.Meta().findOne({ key: 'main' }).lean(),
  ])

  const clean = <T>(rows: unknown[]): T[] =>
    (rows as Record<string, unknown>[]).map((r) => stripMongoIds(r) as unknown as T)

  const organizations = sortOrgs(clean<Store['organizations'][number]>(organizationsRaw as unknown[]))
  const users = sortUsers(clean<Store['users'][number]>(usersRaw as unknown[]))
  const batches = sortById(clean<Store['batches'][number]>(batchesRaw as unknown[])).sort((a, b) =>
    a.batchNumber.localeCompare(b.batchNumber),
  )
  const inventory = clean<Store['inventory'][number]>(inventoryRaw as unknown[]).sort((a, b) =>
    a.batchNumber.localeCompare(b.batchNumber),
  )
  const returns = sortByCreatedDesc(clean<Store['returns'][number]>(returnsRaw as unknown[]))
  const settlements = sortByCreatedDesc(clean<Store['settlements'][number]>(settlementsRaw as unknown[]))
  const manifests = sortByCreatedDesc(clean<Store['manifests'][number]>(manifestsRaw as unknown[]))
  const notifications = sortByCreatedDesc(
    clean<Store['notifications'][number]>(notificationsRaw as unknown[]),
  )
  const alerts = sortByCreatedDesc(clean<Store['alerts'][number]>(alertsRaw as unknown[]))
  const investigations = sortByCreatedDesc(
    clean<Store['investigations'][number]>(investigationsRaw as unknown[]),
  )
  const auditLog = [...clean<Store['auditLog'][number]>(auditRaw as unknown[])].sort((a, b) =>
    b.at.localeCompare(a.at),
  )
  const certificates = sortById(clean<Store['certificates'][number]>(certificatesRaw as unknown[]))
  const aiInsights = sortByCreatedDesc(clean<Store['aiInsights'][number]>(aiRaw as unknown[]))

  return {
    organizations,
    users,
    batches,
    inventory,
    returns,
    settlements,
    manifests,
    notifications,
    alerts,
    investigations,
    auditLog,
    certificates,
    aiInsights,
    seq: (meta as { seq?: number } | null)?.seq ?? 10,
  }
}

/** Migrate legacy single-document blob into clean collections, then drop blob */
async function migrateLegacyBlobIfNeeded(): Promise<boolean> {
  const legacy =
    mongoose.models.PharmaLoopStore ||
    mongoose.model(
      'PharmaLoopStore',
      new mongoose.Schema(
        {
          key: String,
          data: mongoose.Schema.Types.Mixed,
          updatedAt: Date,
        },
        { collection: 'pharmaloop_store' },
      ),
    )

  const doc = await legacy.findOne({ key: 'main' }).lean<{ data?: Store }>()
  if (!doc?.data?.users?.length) return false

  const userCount = await Models.User().countDocuments()
  if (userCount > 0) {
    // Already on normalized collections — remove legacy blob collection
    try {
      await mongoose.connection.db!.dropCollection('pharmaloop_store')
      console.log('[mongo] dropped legacy pharmaloop_store collection')
    } catch {
      await legacy.deleteMany({})
    }
    return false
  }

  resetStoreSync(doc.data)
  await writeStoreNormalized(doc.data)
  try {
    await mongoose.connection.db!.dropCollection('pharmaloop_store')
  } catch {
    await legacy.deleteMany({})
  }
  console.log(
    `[mongo] migrated legacy blob → clean collections (${doc.data.users.length} users, ${doc.data.returns?.length ?? 0} returns)`,
  )
  return true
}

export async function connectAndHydrateStore(): Promise<'mongo' | 'memory'> {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.log('[mongo] MONGODB_URI not set — using in-memory store only')
    await getStore()
    return 'memory'
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
    mongoEnabled = true
    console.log('[mongo] connected — clean ordered collections')

    await migrateLegacyBlobIfNeeded()

    const loaded = await loadStoreNormalized()
    if (loaded?.users?.length) {
      resetStoreSync(loaded)
      // Rewrite once so documents are sorted/clean even if older inserts were messy
      await writeStoreNormalized(loaded)
      console.log(
        `[mongo] loaded: orgs=${loaded.organizations.length} users=${loaded.users.length} ` +
          `batches=${loaded.batches.length} inventory=${loaded.inventory.length} ` +
          `returns=${loaded.returns.length} settlements=${loaded.settlements.length}`,
      )
    } else {
      const seeded = await createSeedStore()
      resetStoreSync(seeded)
      await writeStoreNormalized(seeded)
      console.log('[mongo] seeded clean collections:')
      console.log(`  password: ${DEMO_PASSWORD}`)
      console.log('  admin@pharmaloop.com / Admin')
      console.log('  pharmacy@pharmaloop.com / Pharmacy')
      console.log('  distributor@pharmaloop.com / Distributor')
      console.log('  manufacturer@pharmaloop.com / Manufacturer')
      console.log('  collections: organizations, users, batches, inventory, returns, …')
    }

    return 'mongo'
  } catch (err) {
    mongoEnabled = false
    console.warn(
      '[mongo] connection failed — falling back to in-memory:',
      err instanceof Error ? err.message : err,
    )
    await getStore()
    return 'memory'
  }
}

export function persistStoreSoon(): void {
  if (!isMongoLive()) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saving = getStore()
      .then((store) => writeStoreNormalized(store))
      .catch((err) => {
        console.warn('[mongo] persist failed:', err instanceof Error ? err.message : err)
      })
      .finally(() => {
        saving = null
      })
  }, 200)
}

export async function persistStoreNow(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (saving) await saving
  if (!isMongoLive()) return
  const store = await getStore()
  await writeStoreNormalized(store)
}

export function mongoPersistMiddleware(
  req: { method: string },
  res: { statusCode: number; on: (ev: string, fn: () => void) => void },
  next: () => void,
): void {
  res.on('finish', () => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return
    if (res.statusCode >= 400) return
    persistStoreSoon()
  })
  next()
}
