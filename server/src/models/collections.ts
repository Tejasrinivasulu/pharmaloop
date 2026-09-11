import mongoose, { Schema } from 'mongoose'

/** Strict Mixed for nested objects we already type in TypeScript */
const Mixed = Schema.Types.Mixed

const organizationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    type: { type: String, required: true, index: true },
    licenseNo: { type: String, required: true },
    region: { type: String, required: true },
    address: { type: String, required: true },
    contactEmail: { type: String, required: true },
    status: { type: String, required: true },
    registeredAt: { type: String, required: true },
  },
  { collection: 'organizations', versionKey: false },
)

const userSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true, index: true },
    orgId: { type: String, required: true, index: true },
    org: { type: String, required: true },
  },
  { collection: 'users', versionKey: false },
)

const batchSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    batchNumber: { type: String, required: true, unique: true, index: true },
    productName: { type: String, required: true },
    strength: { type: String, required: true },
    form: { type: String, required: true },
    manufacturer: { type: String, required: true },
    manufacturerOrgId: { type: String, required: true, index: true },
    manufacturingDate: { type: String, required: true },
    expiryDate: { type: String, required: true },
    quantities: { type: Mixed, required: true },
    status: { type: String, required: true, index: true },
    notForSale: { type: Boolean, required: true },
    discrepancy: { type: Boolean, required: true },
    closed: { type: Boolean, required: true },
    passport: { type: [Mixed], default: [] },
    units: { type: [Mixed], default: [] },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'batches', versionKey: false },
)

const inventorySchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    orgId: { type: String, required: true, index: true },
    orgName: { type: String, required: true },
    batchNumber: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    strength: { type: String, required: true },
    form: { type: String, required: true },
    manufacturer: { type: String, required: true },
    qty: { type: Number, required: true },
    expectedQty: Number,
    receivedQty: Number,
    expiryDate: { type: String, required: true },
    status: { type: String, required: true, index: true },
    location: { type: String, required: true },
    notForSale: { type: Boolean, required: true },
    reason: String,
    updatedAt: { type: String, required: true },
  },
  { collection: 'inventory', versionKey: false },
)

const returnSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    returnCode: { type: String, required: true, unique: true, index: true },
    batchNumber: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    strength: { type: String, required: true },
    pharmacyOrgId: { type: String, required: true, index: true },
    pharmacyName: { type: String, required: true },
    distributorOrgId: { type: String, required: true, index: true },
    distributorName: { type: String, required: true },
    manufacturerOrgId: { type: String, required: true, index: true },
    manufacturerName: { type: String, required: true },
    status: { type: String, required: true, index: true },
    reason: { type: String, required: true },
    quantities: { type: Mixed, required: true },
    expectedQty: { type: Number, required: true },
    receivedQty: { type: Mixed, default: null },
    discrepancy: { type: Boolean, required: true },
    discrepancyNote: String,
    evidence: { type: Mixed, default: null },
    disposalCompleted: { type: Boolean, required: true },
    quantityReconciled: { type: Boolean, required: true },
    destructionVerified: { type: Boolean, required: true },
    closed: { type: Boolean, required: true, index: true },
    timeline: { type: [Mixed], default: [] },
    unitCodes: { type: [String], default: [] },
    pickedUpAt: String,
    manifestId: { type: String, index: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
    closedAt: String,
  },
  { collection: 'returns', versionKey: false },
)

const settlementSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    pharmacyOrgId: { type: String, required: true, index: true },
    pharmacyName: { type: String, required: true },
    returnId: { type: String, required: true, index: true },
    returnCode: { type: String, required: true },
    batchNumber: { type: String, required: true },
    productName: { type: String, required: true },
    qty: { type: Number, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, required: true, index: true },
    creditNoteNo: String,
    paidAt: String,
    createdAt: { type: String, required: true },
  },
  { collection: 'settlements', versionKey: false },
)

const manifestSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    manifestNo: { type: String, required: true, unique: true, index: true },
    distributorOrgId: { type: String, required: true, index: true },
    distributorName: { type: String, required: true },
    manufacturerOrgId: { type: String, required: true, index: true },
    manufacturerName: { type: String, required: true },
    returnIds: { type: [String], default: [] },
    totalUnits: { type: Number, required: true },
    status: { type: String, required: true, index: true },
    pickupAt: String,
    deliveredAt: String,
    createdAt: { type: String, required: true },
  },
  { collection: 'manifests', versionKey: false },
)

const notificationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: '', index: true },
    role: { type: String, required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: { type: String, required: true },
    read: { type: Boolean, required: true, index: true },
    href: String,
    createdAt: { type: String, required: true },
  },
  { collection: 'notifications', versionKey: false },
)

const alertSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true, index: true },
    severity: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    batchNumber: { type: String, index: true },
    returnId: { type: String, index: true },
    orgId: String,
    orgName: String,
    status: { type: String, required: true, index: true },
    createdAt: { type: String, required: true },
    resolvedAt: String,
  },
  { collection: 'alerts', versionKey: false },
)

const investigationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    caseNo: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    batchNumber: String,
    returnId: String,
    alertId: String,
    orgId: String,
    orgName: String,
    status: { type: String, required: true, index: true },
    priority: { type: String, required: true },
    findings: { type: String, default: '' },
    assignedTo: { type: String, required: true },
    createdBy: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'investigations', versionKey: false },
)

const auditSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    at: { type: String, required: true, index: true },
    actorId: { type: String, required: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    details: { type: String, required: true },
    ip: String,
  },
  { collection: 'audit_log', versionKey: false },
)

const certificateSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    certificateNo: { type: String, required: true, unique: true },
    returnId: { type: String, required: true, index: true },
    batchNumber: { type: String, required: true },
    productName: { type: String, required: true },
    qty: { type: Number, required: true },
    method: { type: String, required: true },
    facility: { type: String, required: true },
    verifiedBy: { type: String, default: '' },
    issuedAt: { type: String, required: true },
    status: { type: String, required: true },
  },
  { collection: 'certificates', versionKey: false },
)

const aiInsightSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    confidence: { type: Number, required: true },
    recommendation: { type: String, required: true },
    relatedBatch: String,
    relatedReturn: String,
    createdAt: { type: String, required: true },
  },
  { collection: 'ai_insights', versionKey: false },
)

const metaSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'app_meta', versionKey: false },
)

function modelOf<T>(name: string, schema: Schema) {
  return (mongoose.models[name] || mongoose.model(name, schema)) as mongoose.Model<T>
}

export const Models = {
  Organization: () => modelOf('Organization', organizationSchema),
  User: () => modelOf('User', userSchema),
  Batch: () => modelOf('Batch', batchSchema),
  Inventory: () => modelOf('Inventory', inventorySchema),
  Return: () => modelOf('Return', returnSchema),
  Settlement: () => modelOf('Settlement', settlementSchema),
  Manifest: () => modelOf('Manifest', manifestSchema),
  Notification: () => modelOf('Notification', notificationSchema),
  Alert: () => modelOf('Alert', alertSchema),
  Investigation: () => modelOf('Investigation', investigationSchema),
  Audit: () => modelOf('Audit', auditSchema),
  Certificate: () => modelOf('Certificate', certificateSchema),
  AiInsight: () => modelOf('AiInsight', aiInsightSchema),
  Meta: () => modelOf('AppMeta', metaSchema),
}
