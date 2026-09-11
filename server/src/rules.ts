import type {
  Alert,
  AuditEntry,
  Batch,
  InventoryItem,
  PublicUser,
  ReturnRecord,
  ReturnStatus,
  Role,
  Store,
  TimelineEvent,
} from './types.js';
import { nextId } from './types.js';

/** Push an in-app notification (role-wide and/or specific user). Persists via Mongo middleware. */
export function pushNotification(
  store: Store,
  opts: {
    role: Role;
    userId?: string;
    title: string;
    body: string;
    type?: string;
    href?: string;
  },
): void {
  store.notifications.unshift({
    id: nextId(store, 'notif'),
    userId: opts.userId || '',
    role: opts.role,
    title: opts.title,
    body: opts.body,
    type: opts.type || 'info',
    read: false,
    href: opts.href,
    createdAt: new Date().toISOString(),
  });
}

/** Business rules for PharmaLoop reverse logistics */

export function isExpired(expiryDate: string, asOf = new Date()): boolean {
  const exp = new Date(expiryDate);
  exp.setHours(23, 59, 59, 999);
  return exp.getTime() < asOf.getTime();
}

/** Rule 1: Expired stock → NOT FOR SALE */
export function applyExpiredNotForSale(item: InventoryItem): InventoryItem {
  if (isExpired(item.expiryDate)) {
    return {
      ...item,
      status: item.status === 'VERIFIED' || item.status === 'RE_ENTRY_FLAGGED' ? item.status : 'EXPIRED',
      notForSale: true,
      reason: item.reason || 'Expired — NOT FOR SALE',
    };
  }
  return item;
}

/** Rule 2: Expected ≠ Received → discrepancy */
export function detectDiscrepancy(expected: number, received: number): {
  discrepancy: boolean;
  note?: string;
} {
  if (expected !== received) {
    const delta = received - expected;
    const sign = delta > 0 ? '+' : '';
    return {
      discrepancy: true,
      note: `Expected ${expected}, received ${received} (${sign}${delta})`,
    };
  }
  return { discrepancy: false };
}

export interface CloseCheckResult {
  ok: boolean;
  errors: string[];
}

/**
 * Rules 3 & 4:
 * Cannot close with simple "destroyed".
 * Closed only after disposal completed + evidence + reconcile + verified.
 */
export function canCloseReturn(ret: ReturnRecord): CloseCheckResult {
  const errors: string[] = [];

  if (ret.closed) {
    errors.push('Return is already closed');
  }
  if (!ret.disposalCompleted) {
    errors.push('Disposal must be completed before close');
  }
  if (!ret.evidence) {
    errors.push('Disposal evidence is required — cannot close with simple "destroyed" claim');
  }
  if (!ret.quantityReconciled) {
    errors.push('Returned quantity must be reconciled against disposed quantity');
  }
  if (!ret.destructionVerified) {
    errors.push('Destruction must be verified before close');
  }
  if (ret.status !== 'DESTRUCTION_VERIFIED' && ret.status !== 'CLOSED') {
    errors.push(
      `Return status must be DESTRUCTION_VERIFIED to close (current: ${ret.status})`,
    );
  }

  return { ok: errors.length === 0, errors };
}

export function canVerifyDisposal(ret: ReturnRecord): CloseCheckResult {
  const errors: string[] = [];
  if (!ret.disposalCompleted) {
    errors.push('Disposal must be completed first');
  }
  if (!ret.evidence) {
    errors.push('Evidence must be submitted before verification');
  }
  if (!ret.quantityReconciled) {
    errors.push('Quantity must be reconciled before verification');
  }
  if (ret.closed) {
    errors.push('Cannot modify a closed return');
  }
  return { ok: errors.length === 0, errors };
}

/** Rule 6: Never delete closed records */
export function assertNotDeletingClosed(
  entity: { closed?: boolean; id: string },
  action: string,
): void {
  if (entity.closed) {
    throw Object.assign(
      new Error(`Cannot ${action} closed record ${entity.id} — closed records are immutable`),
      { status: 409 },
    );
  }
}

/** Rule 7: Track batch + returned quantity separately (partial returns OK) */
export function applyPartialReturnToBatch(
  batch: Batch,
  returnedQty: number,
): Batch {
  return {
    ...batch,
    quantities: {
      ...batch.quantities,
      returned: batch.quantities.returned + returnedQty,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Rule 5: Scan of closed/disposed → possible re-entry alert (not auto-fraud)
 */
export function handleClosedScan(
  store: Store,
  batch: Batch,
  unitCode: string,
  scanOrgName: string,
  actor: PublicUser,
): Alert {
  const alert: Alert = {
    id: nextId(store, 'alert'),
    type: 'POSSIBLE_RE_ENTRY',
    severity: 'critical',
    title: `Possible re-entry — ${batch.batchNumber}`,
    message: `Scan of closed/disposed unit ${unitCode} at ${scanOrgName}. Flagged as POSSIBLE_RE_ENTRY (not auto-fraud). Investigate chain of custody.`,
    batchNumber: batch.batchNumber,
    orgId: actor.orgId,
    orgName: actor.org,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  };
  store.alerts.unshift(alert);

  batch.status = 'RE_ENTRY_ALERT';
  batch.passport.push({
    id: nextId(store, 'pp'),
    at: new Date().toISOString(),
    status: 'POSSIBLE_RE_ENTRY',
    actor: actor.name,
    org: actor.org,
    note: `Scan of ${unitCode} after closed/disposed — POSSIBLE_RE_ENTRY (not auto-fraud)`,
  });
  batch.updatedAt = new Date().toISOString();

  return alert;
}

export function appendTimeline(
  store: Store,
  ret: ReturnRecord,
  status: ReturnStatus | string,
  actor: PublicUser,
  note: string,
): TimelineEvent {
  const event: TimelineEvent = {
    id: nextId(store, 'tl'),
    at: new Date().toISOString(),
    status,
    actor: actor.name,
    org: actor.org,
    note,
  };
  ret.timeline.push(event);
  ret.updatedAt = event.at;
  return event;
}

export function appendAudit(
  store: Store,
  actor: PublicUser,
  action: string,
  entityType: string,
  entityId: string,
  details: string,
): AuditEntry {
  const entry: AuditEntry = {
    id: nextId(store, 'aud'),
    at: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    entityType,
    entityId,
    details,
  };
  store.auditLog.unshift(entry);
  return entry;
}

export const RETURN_FLOW: ReturnStatus[] = [
  'RETURN_REQUESTED',
  'DISTRIBUTOR_VERIFIED',
  'MANUFACTURER_RECEIVED',
  'QUARANTINED',
  'DISPOSAL_REQUESTED',
  'DISPOSAL_COMPLETED',
  'EVIDENCE_SUBMITTED',
  'QUANTITY_RECONCILED',
  'DESTRUCTION_VERIFIED',
  'CLOSED',
];

export function enrichReturn(ret: ReturnRecord, store: Store) {
  const batch = store.batches.find((b) => b.batchNumber === ret.batchNumber);
  const certificate = store.certificates.find((c) => c.returnId === ret.id);
  const relatedAlerts = store.alerts.filter((a) => a.returnId === ret.id || a.batchNumber === ret.batchNumber);
  return {
    ...ret,
    batch: batch
      ? {
          batchNumber: batch.batchNumber,
          productName: batch.productName,
          strength: batch.strength,
          expiryDate: batch.expiryDate,
          status: batch.status,
          quantities: batch.quantities,
          closed: batch.closed,
          notForSale: batch.notForSale,
          discrepancy: batch.discrepancy,
        }
      : null,
    certificate: certificate || null,
    alerts: relatedAlerts,
    lifecycleComplete: ret.closed,
    compliance: {
      disposalCompleted: ret.disposalCompleted,
      evidenceSubmitted: !!ret.evidence,
      quantityReconciled: ret.quantityReconciled,
      destructionVerified: ret.destructionVerified,
      canClose: canCloseReturn(ret).ok,
      closeBlockers: canCloseReturn(ret).errors,
    },
  };
}

export function enrichBatch(batch: Batch, store: Store) {
  const relatedReturns = store.returns.filter((r) => r.batchNumber === batch.batchNumber);
  const relatedAlerts = store.alerts.filter((a) => a.batchNumber === batch.batchNumber);
  const certificates = store.certificates.filter((c) => c.batchNumber === batch.batchNumber);
  return {
    ...batch,
    returns: relatedReturns.map((r) => ({
      id: r.id,
      returnCode: r.returnCode,
      status: r.status,
      quantities: r.quantities,
      closed: r.closed,
      discrepancy: r.discrepancy,
      pharmacyName: r.pharmacyName,
      createdAt: r.createdAt,
    })),
    alerts: relatedAlerts,
    certificates,
    forSale: !batch.notForSale && !isExpired(batch.expiryDate) && !batch.closed,
  };
}

/** Inventory status from expiry date (AVAILABLE / EXPIRING / EXPIRED) */
export function inventoryStatusFromExpiry(expiryDate: string): InventoryItem['status'] {
  if (isExpired(expiryDate)) return 'EXPIRED';
  const exp = new Date(expiryDate);
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  if (exp.getTime() <= soon.getTime()) return 'EXPIRING';
  return 'AVAILABLE';
}

/** Deduct qty from an org's inventory for a batch. Throws message string on failure. */
export function deductInventoryQty(
  store: Store,
  orgId: string,
  batchNumber: string,
  qty: number,
): InventoryItem {
  const item = store.inventory.find((i) => i.orgId === orgId && i.batchNumber === batchNumber);
  if (!item) throw new Error('Inventory not found for this batch');
  const live = applyExpiredNotForSale(item);
  if (live.notForSale || live.status === 'EXPIRED') throw new Error('Cannot sell expired / not-for-sale stock');
  if (item.qty < qty) throw new Error(`Insufficient stock (available ${item.qty})`);
  item.qty -= qty;
  item.updatedAt = new Date().toISOString();
  if (item.qty === 0) {
    store.inventory = store.inventory.filter((i) => i.id !== item.id);
  }
  return item;
}

/** Add or increase inventory at buyer org for a batch. */
export function creditInventoryQty(
  store: Store,
  org: { id: string; name: string },
  batch: Batch,
  qty: number,
  location: string,
): InventoryItem {
  const now = new Date().toISOString();
  const existing = store.inventory.find(
    (i) => i.orgId === org.id && i.batchNumber === batch.batchNumber,
  );
  if (existing) {
    existing.qty += qty;
    existing.updatedAt = now;
    existing.status = inventoryStatusFromExpiry(existing.expiryDate);
    existing.notForSale = existing.status === 'EXPIRED';
    return existing;
  }
  const status = inventoryStatusFromExpiry(batch.expiryDate);
  const created: InventoryItem = {
    id: nextId(store, 'inv'),
    orgId: org.id,
    orgName: org.name,
    batchNumber: batch.batchNumber,
    productName: batch.productName,
    strength: batch.strength,
    form: batch.form,
    manufacturer: batch.manufacturer,
    qty,
    expiryDate: batch.expiryDate,
    status,
    location,
    notForSale: status === 'EXPIRED',
    reason: status === 'EXPIRED' ? 'Expired — NOT FOR SALE' : undefined,
    updatedAt: now,
  };
  store.inventory.unshift(created);
  return created;
}

/** Transfer stock between orgs and append batch passport event. */
export function transferStock(
  store: Store,
  opts: {
    fromOrgId: string;
    toOrg: { id: string; name: string };
    batchNumber: string;
    qty: number;
    actor: PublicUser;
    passportStatus: string;
    note: string;
    buyerLocation: string;
  },
): { batch: Batch; buyerItem: InventoryItem } {
  const batch = store.batches.find((b) => b.batchNumber === opts.batchNumber);
  if (!batch) throw new Error('Batch not found');
  if (batch.closed) throw new Error('Batch is closed');
  deductInventoryQty(store, opts.fromOrgId, opts.batchNumber, opts.qty);
  const buyerItem = creditInventoryQty(store, opts.toOrg, batch, opts.qty, opts.buyerLocation);
  const now = new Date().toISOString();
  batch.quantities.distributed += opts.qty;
  batch.updatedAt = now;
  batch.passport.push({
    id: nextId(store, 'pp'),
    at: now,
    status: opts.passportStatus,
    actor: opts.actor.name,
    org: opts.actor.org,
    note: opts.note,
  });
  return { batch, buyerItem };
}
