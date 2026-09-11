/** Shared domain types for PharmaLoop reverse-logistics API */

export type Role = 'Pharmacy' | 'Distributor' | 'Manufacturer' | 'Admin';

export type InventoryStatus =
  | 'AVAILABLE'
  | 'NOT_FOR_SALE'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'DISCREPANCY'
  | 'DISPOSAL_PENDING'
  | 'VERIFIED'
  | 'RE_ENTRY_FLAGGED';

export type BatchStatus =
  | 'ACTIVE'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'DISCREPANCY'
  | 'DISPOSAL_PENDING'
  | 'VERIFIED_DISPOSAL'
  | 'CLOSED'
  | 'RE_ENTRY_ALERT';

export type ReturnStatus =
  | 'RETURN_REQUESTED'
  | 'DISTRIBUTOR_VERIFIED'
  | 'MANUFACTURER_RECEIVED'
  | 'QUARANTINED'
  | 'DISPOSAL_REQUESTED'
  | 'DISPOSAL_COMPLETED'
  | 'EVIDENCE_SUBMITTED'
  | 'QUANTITY_RECONCILED'
  | 'DESTRUCTION_VERIFIED'
  | 'CLOSED';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType =
  | 'POSSIBLE_RE_ENTRY'
  | 'DISCREPANCY'
  | 'EXPIRED_STOCK'
  | 'EXPIRING_SOON'
  | 'DISPOSAL_PENDING'
  | 'INVESTIGATION'
  | 'COMPLIANCE';

export interface Organization {
  id: string;
  name: string;
  type: Role;
  licenseNo: string;
  region: string;
  address: string;
  contactEmail: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'UNDER_REVIEW';
  registeredAt: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  orgId: string;
  org: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  orgId: string;
  org: string;
}

export interface TimelineEvent {
  id: string;
  at: string;
  status: string;
  actor: string;
  org: string;
  note: string;
}

export interface BatchQuantities {
  originalQty: number;
  distributed: number;
  returned: number;
  received: number;
  disposed: number;
  verified: number;
}

export interface Batch {
  id: string;
  batchNumber: string;
  productName: string;
  strength: string;
  form: string;
  manufacturer: string;
  manufacturerOrgId: string;
  manufacturingDate: string;
  expiryDate: string;
  quantities: BatchQuantities;
  status: BatchStatus;
  notForSale: boolean;
  discrepancy: boolean;
  closed: boolean;
  passport: TimelineEvent[];
  units: BatchUnit[];
  createdAt: string;
  updatedAt: string;
}

export interface BatchUnit {
  id: string;
  unitCode: string;
  status: string;
  location: string;
  lastScanAt?: string;
  notes?: string;
}

export interface InventoryItem {
  id: string;
  orgId: string;
  orgName: string;
  batchNumber: string;
  productName: string;
  strength: string;
  form: string;
  manufacturer: string;
  qty: number;
  expectedQty?: number;
  receivedQty?: number;
  expiryDate: string;
  status: InventoryStatus;
  location: string;
  notForSale: boolean;
  reason?: string;
  updatedAt: string;
}

export interface ReturnQuantities {
  requested: number;
  verified: number;
  received: number;
  disposed: number;
  reconciled: number;
}

export interface DisposalEvidence {
  certificateId: string;
  method: string;
  facility: string;
  submittedAt: string;
  submittedBy: string;
  documents: string[];
  photoUrls: string[];
  notes: string;
}

export interface ReturnRecord {
  id: string;
  returnCode: string;
  batchNumber: string;
  productName: string;
  strength: string;
  pharmacyOrgId: string;
  pharmacyName: string;
  distributorOrgId: string;
  distributorName: string;
  manufacturerOrgId: string;
  manufacturerName: string;
  status: ReturnStatus;
  reason: string;
  quantities: ReturnQuantities;
  expectedQty: number;
  receivedQty: number | null;
  discrepancy: boolean;
  discrepancyNote?: string;
  evidence: DisposalEvidence | null;
  disposalCompleted: boolean;
  quantityReconciled: boolean;
  destructionVerified: boolean;
  closed: boolean;
  timeline: TimelineEvent[];
  unitCodes: string[];
  pickedUpAt?: string;
  manifestId?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface Settlement {
  id: string;
  pharmacyOrgId: string;
  pharmacyName: string;
  returnId: string;
  returnCode: string;
  batchNumber: string;
  productName: string;
  qty: number;
  amount: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  creditNoteNo?: string;
  paidAt?: string;
  createdAt: string;
}

export interface Manifest {
  id: string;
  manifestNo: string;
  distributorOrgId: string;
  distributorName: string;
  manufacturerOrgId: string;
  manufacturerName: string;
  returnIds: string[];
  totalUnits: number;
  status: 'DRAFT' | 'IN_TRANSIT' | 'DELIVERED' | 'CLOSED';
  pickupAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  role: Role;
  title: string;
  body: string;
  type: string;
  read: boolean;
  href?: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  batchNumber?: string;
  returnId?: string;
  orgId?: string;
  orgName?: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string;
}

export interface Investigation {
  id: string;
  caseNo: string;
  title: string;
  batchNumber?: string;
  returnId?: string;
  alertId?: string;
  orgId?: string;
  orgName?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  findings: string;
  assignedTo: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ip?: string;
}

export interface Certificate {
  id: string;
  certificateNo: string;
  returnId: string;
  batchNumber: string;
  productName: string;
  qty: number;
  method: string;
  facility: string;
  verifiedBy: string;
  issuedAt: string;
  status: 'ISSUED' | 'REVOKED';
}

export interface AiInsight {
  id: string;
  category: string;
  title: string;
  summary: string;
  confidence: number;
  recommendation: string;
  relatedBatch?: string;
  relatedReturn?: string;
  createdAt: string;
}

export interface Store {
  organizations: Organization[];
  users: User[];
  batches: Batch[];
  inventory: InventoryItem[];
  returns: ReturnRecord[];
  settlements: Settlement[];
  manifests: Manifest[];
  notifications: Notification[];
  alerts: Alert[];
  investigations: Investigation[];
  auditLog: AuditEntry[];
  certificates: Certificate[];
  aiInsights: AiInsight[];
  seq: number;
}

export function nextId(store: Store, prefix: string): string {
  store.seq += 1;
  return `${prefix}-${store.seq.toString().padStart(4, '0')}`;
}
