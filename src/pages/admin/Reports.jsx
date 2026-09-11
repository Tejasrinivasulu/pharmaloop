import { useEffect, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { api } from '../../lib/api';
import { AlertBanner, Button, Card, CardHeader, EmptyState, LoadingScreen, PageHeader, } from '../../components/ui';
import { formatDateTime, prettyStatus } from './format';
export default function Reports() {
    const [dash, setDash] = useState(null);
    const [returns, setReturns] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [investigations, setInvestigations] = useState([]);
    const [orgs, setOrgs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [kind, setKind] = useState(null);
    const printRef = useRef(null);
    useEffect(() => {
        Promise.all([
            api('/api/admin/dashboard'),
            api('/api/admin/returns'),
            api('/api/admin/alerts'),
            api('/api/admin/investigations'),
            api('/api/admin/organizations'),
        ])
            .then(([d, r, a, i, o]) => {
            setDash(d);
            setReturns(r.returns || []);
            setAlerts(a.alerts || []);
            setInvestigations(i.investigations || []);
            setOrgs(o.organizations || []);
        })
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
            .finally(() => setLoading(false));
    }, []);
    function print() {
        const node = printRef.current;
        if (!node)
            return;
        const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
        if (!w)
            return;
        w.document.write(`<!doctype html><html><head><title>PharmaLoop Report</title>
      <style>
        body{font-family:Georgia,serif;padding:32px;color:#0f172a}
        h1{font-size:22px;margin:0 0 4px} h2{font-size:16px;margin:24px 0 8px;border-bottom:1px solid #cbd5e1;padding-bottom:4px}
        p,li{font-size:13px;line-height:1.5} .muted{color:#64748b;font-size:12px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
        th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
        th{background:#f8fafc}
      </style></head><body>${node.innerHTML}</body></html>`);
        w.document.close();
        w.focus();
        w.print();
    }
    if (loading)
        return <LoadingScreen label="Loading report data…"/>;
    if (error || !dash) {
        return <AlertBanner tone="danger" title="Reports unavailable">{error}</AlertBanner>;
    }
    return (<div className="space-y-6">
      <PageHeader title="Reports" subtitle="Generate printable regulator summaries from live API data" actions={kind ? (<Button variant="secondary" onClick={print}>
              <Printer className="h-4 w-4"/>
              Print summary
            </Button>) : undefined}/>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
            ['overview', 'National overview'],
            ['returns', 'Returns pipeline'],
            ['alerts', 'Risk & alerts'],
            ['investigations', 'Investigations'],
        ].map(([k, label]) => (<Button key={k} variant={kind === k ? 'primary' : 'secondary'} className="justify-start" onClick={() => setKind(k)}>
            {label}
          </Button>))}
      </div>

      {!kind && (<Card>
          <EmptyState title="Select a report" text="Choose a generator above to preview a printable summary."/>
        </Card>)}

      {kind && (<Card>
          <CardHeader title="Printable preview" subtitle={`Generated ${formatDateTime(new Date().toISOString())}`}/>
          <div ref={printRef} className="space-y-4 p-6 text-slate-800">
            <div>
              <h1 className="font-display text-xl font-bold">PharmaLoop Regulator Report</h1>
              <p className="text-sm text-slate-500">
                {dash.org?.name || 'CDSCO Regional Monitor'} · {prettyStatus(kind)}
              </p>
            </div>

            {kind === 'overview' && (<>
                <h2 className="font-display text-base font-semibold">KPI snapshot</h2>
                <ul className="grid gap-1 text-sm sm:grid-cols-2">
                  <li>Organizations: {dash.kpis.organizations}</li>
                  <li>Active pharmacies: {dash.kpis.activePharmacies}</li>
                  <li>Total returns: {dash.kpis.totalReturns}</li>
                  <li>Open discrepancies: {dash.kpis.openDiscrepancies}</li>
                  <li>Re-entry alerts: {dash.kpis.reEntryAlerts}</li>
                  <li>Open investigations: {dash.kpis.openInvestigations}</li>
                  <li>Certificates: {dash.kpis.certificates}</li>
                  <li>Audit events: {dash.kpis.auditEvents}</li>
                </ul>
                <h2 className="font-display text-base font-semibold">Organizations by region</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Region</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map((o) => (<tr key={o.id}>
                        <td>{o.name}</td>
                        <td>{o.type}</td>
                        <td>{o.region}</td>
                        <td>{o.status}</td>
                      </tr>))}
                  </tbody>
                </table>
              </>)}

            {kind === 'returns' && (<>
                <h2 className="font-display text-base font-semibold">Returns by status</h2>
                <ul className="text-sm">
                  {Object.entries(dash.returnsByStatus).map(([s, c]) => (<li key={s}>
                      {prettyStatus(s)}: {c}
                    </li>))}
                </ul>
                <h2 className="font-display text-base font-semibold">Return register</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Batch</th>
                      <th>Pharmacy</th>
                      <th>Status</th>
                      <th>Discrepancy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map((r) => (<tr key={r.id}>
                        <td>{r.returnCode}</td>
                        <td>{r.batchNumber}</td>
                        <td>{r.pharmacyName}</td>
                        <td>{prettyStatus(r.status)}</td>
                        <td>{r.discrepancy ? 'Yes' : 'No'}</td>
                      </tr>))}
                  </tbody>
                </table>
              </>)}

            {kind === 'alerts' && (<>
                <p className="text-sm text-slate-600">
                  Policy: POSSIBLE_RE_ENTRY opens investigation — never auto-fraud.
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Batch</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((a) => (<tr key={a.id}>
                        <td>{a.title}</td>
                        <td>{prettyStatus(a.type)}</td>
                        <td>{a.severity}</td>
                        <td>{a.batchNumber || '—'}</td>
                        <td>{a.status}</td>
                      </tr>))}
                  </tbody>
                </table>
              </>)}

            {kind === 'investigations' && (<table>
                <thead>
                  <tr>
                    <th>Case</th>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {investigations.map((inv) => (<tr key={inv.id}>
                      <td>{inv.caseNo}</td>
                      <td>{inv.title}</td>
                      <td>{inv.priority}</td>
                      <td>{prettyStatus(inv.status)}</td>
                      <td>{inv.assignedTo}</td>
                    </tr>))}
                </tbody>
              </table>)}
          </div>
        </Card>)}
    </div>);
}
