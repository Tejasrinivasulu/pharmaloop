import bcrypt from 'bcryptjs';
import type {
  Store,
  Batch,
  InventoryItem,
  Organization,
  User,
} from './types.js';

/** Demo password for Admin + Pharmacy + Distributor + Manufacturer seed accounts */
export const DEMO_PASSWORD = 'demo123'
/** @deprecated use DEMO_PASSWORD */
export const STARTER_PASSWORD = DEMO_PASSWORD;

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Clean starter dataset — only 2 medicines.
 * No pre-built returns, settlements, alerts, or manifests.
 * Users create the full reverse-logistics chain themselves.
 *
 * Medicine A — Paracetamol 500mg (PCM-2026-A01) — expiring soon
 * Medicine B — Amoxicillin 250mg (AMX-2025-B02) — expired / NOT FOR SALE
 */
export async function createSeedStore(): Promise<Store> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = new Date().toISOString();

  const organizations: Organization[] = [
    {
      id: 'org-pharmacy-1',
      name: 'City Care Pharmacy',
      type: 'Pharmacy',
      licenseNo: 'DL-PH-2024-1182',
      region: 'Delhi NCR',
      address: '12 Ring Road, South Extension, New Delhi',
      contactEmail: 'pharmacy@pharmaloop.com',
      status: 'ACTIVE',
      registeredAt: '2024-01-15T00:00:00.000Z',
    },
    {
      id: 'org-distributor-1',
      name: 'MedLink Distributors',
      type: 'Distributor',
      licenseNo: 'DL-WD-2023-4401',
      region: 'North Zone',
      address: 'Plot 8, Okhla Industrial Area, New Delhi',
      contactEmail: 'distributor@pharmaloop.com',
      status: 'ACTIVE',
      registeredAt: '2023-06-01T00:00:00.000Z',
    },
    {
      id: 'org-manufacturer-1',
      name: 'ABC Pharma',
      type: 'Manufacturer',
      licenseNo: 'MFG-CDSCO-9912',
      region: 'Gujarat',
      address: 'ABC Pharma Campus, Sanand, Ahmedabad',
      contactEmail: 'manufacturer@pharmaloop.com',
      status: 'ACTIVE',
      registeredAt: '2022-03-20T00:00:00.000Z',
    },
    {
      id: 'org-admin-1',
      name: 'CDSCO Regional Monitor',
      type: 'Admin',
      licenseNo: 'CDSCO-REG-NCR',
      region: 'National Capital Region',
      address: 'FDA Bhawan, Kotla Road, New Delhi',
      contactEmail: 'admin@pharmaloop.com',
      status: 'ACTIVE',
      registeredAt: '2021-01-01T00:00:00.000Z',
    },
  ];

  const users: User[] = [
    {
      id: 'user-pharmacy',
      email: 'pharmacy@pharmaloop.com',
      passwordHash,
      name: 'Priya Sharma',
      role: 'Pharmacy',
      orgId: 'org-pharmacy-1',
      org: 'City Care Pharmacy',
    },
    {
      id: 'user-distributor',
      email: 'distributor@pharmaloop.com',
      passwordHash,
      name: 'Rahul Mehta',
      role: 'Distributor',
      orgId: 'org-distributor-1',
      org: 'MedLink Distributors',
    },
    {
      id: 'user-manufacturer',
      email: 'manufacturer@pharmaloop.com',
      passwordHash,
      name: 'Ananya Patel',
      role: 'Manufacturer',
      orgId: 'org-manufacturer-1',
      org: 'ABC Pharma',
    },
    {
      id: 'user-admin',
      email: 'admin@pharmaloop.com',
      passwordHash,
      name: 'Dr. Vikram Rao',
      role: 'Admin',
      orgId: 'org-admin-1',
      org: 'CDSCO Regional Monitor',
    },
  ];

  const batches: Batch[] = [
    {
      id: 'batch-pcm',
      batchNumber: 'PCM-2026-A01',
      productName: 'Paracetamol',
      strength: '500mg',
      form: 'Tablet',
      manufacturer: 'ABC Pharma',
      manufacturerOrgId: 'org-manufacturer-1',
      manufacturingDate: daysFromNow(-300),
      expiryDate: daysFromNow(20),
      quantities: {
        originalQty: 1000,
        distributed: 200,
        returned: 0,
        received: 0,
        disposed: 0,
        verified: 0,
      },
      status: 'EXPIRING',
      notForSale: false,
      discrepancy: false,
      closed: false,
      passport: [
        {
          id: 'pp-pcm-1',
          at: daysFromNow(-300) + 'T08:00:00.000Z',
          status: 'MANUFACTURED',
          actor: 'ABC Pharma',
          org: 'ABC Pharma',
          note: 'Batch released',
        },
        {
          id: 'pp-pcm-2',
          at: daysFromNow(-90) + 'T10:00:00.000Z',
          status: 'DISTRIBUTED',
          actor: 'MedLink Distributors',
          org: 'MedLink Distributors',
          note: '200 units to City Care Pharmacy',
        },
      ],
      units: [
        { id: 'u-pcm-1', unitCode: 'PCM-2026-A01-U0001', status: 'IN_STOCK', location: 'Shelf A-1' },
        { id: 'u-pcm-2', unitCode: 'PCM-2026-A01-U0002', status: 'IN_STOCK', location: 'Shelf A-1' },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'batch-amx',
      batchNumber: 'AMX-2025-B02',
      productName: 'Amoxicillin',
      strength: '250mg',
      form: 'Capsule',
      manufacturer: 'ABC Pharma',
      manufacturerOrgId: 'org-manufacturer-1',
      manufacturingDate: daysFromNow(-400),
      expiryDate: daysFromNow(-15),
      quantities: {
        originalQty: 800,
        distributed: 150,
        returned: 0,
        received: 0,
        disposed: 0,
        verified: 0,
      },
      status: 'EXPIRED',
      notForSale: true,
      discrepancy: false,
      closed: false,
      passport: [
        {
          id: 'pp-amx-1',
          at: daysFromNow(-400) + 'T08:00:00.000Z',
          status: 'MANUFACTURED',
          actor: 'ABC Pharma',
          org: 'ABC Pharma',
          note: 'Batch released',
        },
        {
          id: 'pp-amx-2',
          at: daysFromNow(-120) + 'T10:00:00.000Z',
          status: 'DISTRIBUTED',
          actor: 'MedLink Distributors',
          org: 'MedLink Distributors',
          note: '150 units to City Care Pharmacy',
        },
        {
          id: 'pp-amx-3',
          at: daysFromNow(-15) + 'T09:00:00.000Z',
          status: 'EXPIRED',
          actor: 'System',
          org: 'City Care Pharmacy',
          note: 'Past expiry — NOT FOR SALE',
        },
      ],
      units: [
        { id: 'u-amx-1', unitCode: 'AMX-2025-B02-U0001', status: 'EXPIRED', location: 'Quarantine Bin' },
        { id: 'u-amx-2', unitCode: 'AMX-2025-B02-U0002', status: 'EXPIRED', location: 'Quarantine Bin' },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];

  const inventory: InventoryItem[] = [
    {
      id: 'inv-mfr-pcm',
      orgId: 'org-manufacturer-1',
      orgName: 'ABC Pharma',
      batchNumber: 'PCM-2026-A01',
      productName: 'Paracetamol',
      strength: '500mg',
      form: 'Tablet',
      manufacturer: 'ABC Pharma',
      qty: 800,
      expiryDate: daysFromNow(20),
      status: 'EXPIRING',
      location: 'Warehouse Bay-1',
      notForSale: false,
      reason: 'Manufacturer warehouse — available to sell to distributors',
      updatedAt: now,
    },
    {
      id: 'inv-mfr-amx',
      orgId: 'org-manufacturer-1',
      orgName: 'ABC Pharma',
      batchNumber: 'AMX-2025-B02',
      productName: 'Amoxicillin',
      strength: '250mg',
      form: 'Capsule',
      manufacturer: 'ABC Pharma',
      qty: 650,
      expiryDate: daysFromNow(-15),
      status: 'EXPIRED',
      location: 'Quarantine Bay',
      notForSale: true,
      reason: 'Expired — NOT FOR SALE',
      updatedAt: now,
    },
    {
      id: 'inv-dist-pcm',
      orgId: 'org-distributor-1',
      orgName: 'MedLink Distributors',
      batchNumber: 'PCM-2026-A01',
      productName: 'Paracetamol',
      strength: '500mg',
      form: 'Tablet',
      manufacturer: 'ABC Pharma',
      qty: 80,
      expiryDate: daysFromNow(20),
      status: 'EXPIRING',
      location: 'Dist Hub Rack-3',
      notForSale: false,
      reason: 'Distributor stock — sell to pharmacies',
      updatedAt: now,
    },
    {
      id: 'inv-pcm',
      orgId: 'org-pharmacy-1',
      orgName: 'City Care Pharmacy',
      batchNumber: 'PCM-2026-A01',
      productName: 'Paracetamol',
      strength: '500mg',
      form: 'Tablet',
      manufacturer: 'ABC Pharma',
      qty: 120,
      expiryDate: daysFromNow(20),
      status: 'EXPIRING',
      location: 'Shelf A-1',
      notForSale: false,
      reason: 'Expires within 30 days — preventive return recommended',
      updatedAt: now,
    },
    {
      id: 'inv-amx',
      orgId: 'org-pharmacy-1',
      orgName: 'City Care Pharmacy',
      batchNumber: 'AMX-2025-B02',
      productName: 'Amoxicillin',
      strength: '250mg',
      form: 'Capsule',
      manufacturer: 'ABC Pharma',
      qty: 80,
      expiryDate: daysFromNow(-15),
      status: 'EXPIRED',
      location: 'Quarantine Bin',
      notForSale: true,
      reason: 'Expired — NOT FOR SALE',
      updatedAt: now,
    },
  ];

  return {
    organizations,
    users,
    batches,
    inventory,
    returns: [],
    settlements: [],
    manifests: [],
    notifications: [],
    alerts: [],
    investigations: [],
    auditLog: [],
    certificates: [],
    aiInsights: [
      {
        id: 'ai-01',
        category: 'Expiry Forecast',
        title: 'Paracetamol near expiry',
        summary: 'PCM-2026-A01 (120 units) expires within ~20 days at City Care Pharmacy.',
        confidence: 0.9,
        recommendation: 'Create a preventive return for Paracetamol before NOT FOR SALE lock.',
        relatedBatch: 'PCM-2026-A01',
        createdAt: now,
      },
      {
        id: 'ai-02',
        category: 'Expired Stock',
        title: 'Amoxicillin expired',
        summary: 'AMX-2025-B02 (80 units) is past expiry and marked NOT FOR SALE.',
        confidence: 0.97,
        recommendation: 'Submit expired return immediately and keep units in quarantine.',
        relatedBatch: 'AMX-2025-B02',
        createdAt: now,
      },
    ],
    seq: 10,
  };
}

let store: Store | null = null;

export async function getStore(): Promise<Store> {
  if (!store) store = await createSeedStore();
  return store;
}

export function resetStoreSync(seeded: Store): void {
  store = seeded;
}

/** Force a fresh clean store (e.g. after code reload in tests). */
export async function resetStore(): Promise<Store> {
  store = await createSeedStore();
  return store;
}
