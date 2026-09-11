import { Card, CardHeader, PageHeader, AlertBanner } from '../../components/ui';
const RULES = [
    {
        title: 'Possible re-entry is not auto-fraud',
        body: 'Scanning a closed or disposal-verified unit raises POSSIBLE_RE_ENTRY. The platform opens (or recommends) an investigation. Penalties, license actions, and fraud determinations require human resolution — never automatic imposition from a scan event alone.',
    },
    {
        title: 'Disposal claims require verification',
        body: 'Disposal Completed without evidence remains “Disposal claimed — verification pending.” Closure requires evidence, quantity reconciliation, certificate linkage where applicable, and destruction verification.',
    },
    {
        title: 'Quantity reconciliation before close',
        body: 'Returned, received, disposed, and verified quantities must reconcile within policy tolerances. Discrepancies stay visible to the regulator until investigated or accepted with documented findings.',
    },
    {
        title: 'Append-only audit trail',
        body: 'WHO / WHAT / WHEN / ENTITY events are append-only. Corrections add new events; historical custody records are not overwritten.',
    },
    {
        title: 'Certificate integrity',
        body: 'Missing or unverified disposal certificates block a clean closed state. Regulators monitor missing-certificate estimates from disposal-stage returns.',
    },
    {
        title: 'Role-scoped AI endpoints',
        body: 'Manufacturer AI insight APIs may be inaccessible to Admin. Regulator AI risk views use /api/admin/alerts and batch passport data instead.',
    },
];
export default function Settings() {
    return (<div className="space-y-6">
      <PageHeader title="Platform settings" subtitle="Verification rules and regulator operating notes for PharmaLoop"/>

      <AlertBanner tone="warning" title="Operating principle">
        Possible Re-entry → Investigation. Evidence and audit decide outcomes — not automated punishment.
      </AlertBanner>

      <div className="grid gap-4 lg:grid-cols-2">
        {RULES.map((r) => (<Card key={r.title}>
            <CardHeader title={r.title}/>
            <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{r.body}</p>
          </Card>))}
      </div>

      <Card className="p-5">
        <h3 className="font-display text-base font-semibold text-slate-900">Environment notes</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>JWT session via Authorization bearer token from login.</li>
          <li>Admin APIs require role Admin on /api/admin/*.</li>
          <li>Batch passport + scan simulation: GET /api/batches/:batchNumber?scan=UNIT.</li>
          <li>Investigation create fields: title (required), batchNumber, returnId, alertId, orgId, priority, findings.</li>
        </ul>
      </Card>
    </div>);
}
