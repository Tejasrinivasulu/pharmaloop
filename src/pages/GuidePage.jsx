import { Link } from 'react-router-dom'
import { ArrowLeft, Pill } from 'lucide-react'
import { Card } from '../components/ui'

const LOGINS = [
  { role: 'Pharmacy', email: 'pharmacy@pharmaloop.com' },
  { role: 'Distributor', email: 'distributor@pharmaloop.com' },
  { role: 'Manufacturer', email: 'manufacturer@pharmaloop.com' },
  { role: 'Admin', email: 'admin@pharmaloop.com' },
]

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-brand-800">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <span className="inline-flex items-center gap-2 font-display text-sm font-bold text-brand-900">
            <Pill className="h-4 w-4" /> PharmaLoop workflows
          </span>
          <Link to="/login" className="text-sm font-semibold text-brand-800">
            Login
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">
            Feature workflows (how dashboards connect)
          </h1>
          <p className="mt-2 text-slate-600">
            Password for all demos: <code className="rounded bg-slate-100 px-1">demo123</code>. Use the
            header <strong>bell</strong> for notifications. Example medicine:{' '}
            <code>PCM-2026-A01</code> Paracetamol (or <code>AMX-2025-B02</code> Amoxicillin).
          </p>
        </div>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Demo logins</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {LOGINS.map((l) => (
              <li key={l.role}>
                <strong>{l.role}</strong> — {l.email}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">1. Return request (Pharmacy → Distributor)</h2>
          <p className="mt-2 text-sm text-slate-600">
            Starts reverse logistics. Creates a return others must process in order.
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Login Pharmacy → Inventory or Expiry Alerts</li>
            <li>Open Paracetamol <code>PCM-2026-A01</code> → Return → qty <strong>40</strong> → submit</li>
            <li>
              <strong>What happens:</strong> status <code>RETURN_REQUESTED</code>; inventory qty drops;
              Distributor bell: “New return to verify”
            </li>
            <li>Pharmacy Return Tracking shows the new return (waiting on Distributor)</li>
          </ol>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">2. Verify (Distributor → Pharmacy / Admin)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Login Distributor → Scan &amp; Verify → select the return</li>
            <li>
              Enter verified qty <strong>40</strong> (or <strong>35</strong> to create a discrepancy)
            </li>
            <li>
              <strong>Links to:</strong> Pharmacy sees “Return verified”; if mismatch → Admin
              Discrepancies + Distributor Discrepancies
            </li>
            <li>Status becomes <code>DISTRIBUTOR_VERIFIED</code></li>
          </ol>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">3. Pickup → Consolidate → Dispatch</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Distributor → Pickup Management → select return → Confirm pickup</li>
            <li>Return Consolidation → select picked return → Create manifest (DRAFT)</li>
            <li>Manufacturer Returns (manifests) → Dispatch → status <code>IN_TRANSIT</code></li>
            <li>
              <strong>Links to:</strong> Manufacturer bell + Return Management (ready to receive);
              Pharmacy notified of pickup
            </li>
          </ol>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">4. Receive &amp; quarantine (Manufacturer)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Manufacturer → Return Management → Receive qty <strong>40</strong></li>
            <li>Quarantine → hold bay</li>
            <li>
              <strong>Links to:</strong> Pharmacy + Distributor get “received” notifications; if qty
              mismatch → Admin Discrepancies
            </li>
          </ol>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">5. Disposal chain (Manufacturer only, ordered)</h2>
          <p className="mt-2 text-sm text-slate-600">
            Cannot close with a simple “destroyed” claim — each step unlocks the next.
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Disposal Management → Request disposal</li>
            <li>Complete disposal (qty disposed)</li>
            <li>Submit evidence (certificate / facility)</li>
            <li>Quantity Reconciliation → reconcile disposed qty</li>
            <li>Disposal Verification → Verify destruction → Close return</li>
            <li>
              <strong>Links to:</strong> Certificates page; Pharmacy Settlement credit created;
              Admin All Returns / Compliance see CLOSED
            </li>
          </ol>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">6. Settlement (Manufacturer → Pharmacy → Distributor)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Manufacturer Settlement → Approve → Mark paid</li>
            <li>Pharmacy Settlement → credit note / paid amount</li>
            <li>Distributor Settlement → same credit line linked to the return they handled</li>
            <li>Pharmacy bell: settlement approved/paid</li>
          </ol>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">7. Scan / batch passport / re-entry (all roles + Admin)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Any role can open Batch Passport for <code>PCM-2026-A01</code> (timeline of events)</li>
            <li>Pharmacy Scan: enter batch/unit to check status</li>
            <li>
              After CLOSE: Admin Batch Search → simulate scan <code>PCM-2026-A01-U0001</code>
            </li>
            <li>
              <strong>Links to:</strong> POSSIBLE_RE_ENTRY alert → Admin AI Risk Alerts + Manufacturer
              Alerts → Investigations (not auto-fraud)
            </li>
          </ol>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">8. Admin oversight features</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>
              <strong>Organizations</strong> — activate / review / suspend orgs created by signup or
              User management
            </li>
            <li>
              <strong>User management</strong> — create Distributor / Manufacturer / Admin logins
              (Pharmacy self-signs up)
            </li>
            <li>
              <strong>All returns / Compliance / Reports</strong> — live view of the chain above
            </li>
            <li>
              <strong>Discrepancies</strong> — clear flags after review (from verify/receive mismatches)
            </li>
            <li>
              <strong>Investigations</strong> — open from alerts → Start / Escalate / Close
            </li>
            <li>
              <strong>Audit trail</strong> — append-only WHO / WHAT / WHEN for every action
            </li>
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">9. Notifications (header bell)</h2>
          <p className="mt-2 text-sm text-slate-700">
            Created automatically when another role acts. Click a notification to jump to the related
            page. Not listed in the sidebar.
          </p>
        </Card>

        <Card className="p-5 border-brand-200 bg-brand-50/40">
          <h2 className="font-display text-lg font-bold">One full example (do this yourself)</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-800">
            <li>Pharmacy: return <code>PCM-2026-A01</code> × 40</li>
            <li>Distributor: verify 40 → pickup → consolidate → dispatch</li>
            <li>Manufacturer: receive 40 → quarantine → dispose → evidence → reconcile → verify → close</li>
            <li>Manufacturer: settlement Approve + Paid</li>
            <li>Pharmacy: check Settlement + CLOSED return</li>
            <li>Admin: batch search + optional re-entry scan + investigation</li>
          </ol>
        </Card>
      </main>
    </div>
  )
}
