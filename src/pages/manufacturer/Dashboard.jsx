import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Card, CardHeader, DataTable, EmptyState, KpiCard, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
import { formatDate, prettyStatus } from './format';
export default function ManufacturerDashboard() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api('/api/manufacturer/dashboard')
            .then(setData)
            .catch((e) => setError(e.message || 'Failed to load dashboard'))
            .finally(() => setLoading(false));
    }, []);
    if (loading)
        return <LoadingScreen label="Loading manufacturer dashboard…"/>;
    if (error)
        return <AlertBanner tone="danger" title="Unable to load dashboard">{error}</AlertBanner>;
    if (!data)
        return null;
    const { kpis } = data;
    return (<div>
      <PageHeader title="Manufacturer Dashboard" subtitle={data.org
            ? `${data.org.name} · intake, quarantine, verified disposal compliance`
            : 'Intake, quarantine, and verified disposal compliance'}/>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Awaiting Receive" value={kpis.awaitingReceive} accent="warning" hint="Distributor verified"/>
        <KpiCard label="In Quarantine" value={kpis.inQuarantine} accent="warning" hint="Not for sale"/>
        <KpiCard label="Disposal Pending" value={kpis.disposalPending} hint="Requested or completed"/>
        <KpiCard label="Awaiting Verification" value={kpis.awaitingVerification} accent="warning" hint="Quantity reconciled"/>
        <KpiCard label="Closed (Verified)" value={kpis.closed} accent="success" hint="Full compliance chain"/>
        <KpiCard label="Open Discrepancies" value={kpis.openDiscrepancies} accent="danger" hint="Cannot close"/>
        <KpiCard label="Open Alerts" value={kpis.openAlerts} accent="danger"/>
        <KpiCard label="Certificates Issued" value={kpis.certificatesIssued} accent="success"/>
      </div>

      {data.alerts.length > 0 && (<div className="mb-6 space-y-2">
          {(data.alerts || []).slice(0, 3).map((a) => (<AlertBanner key={a.id} tone={a.severity === 'critical' ? 'danger' : a.severity === 'warning' ? 'warning' : 'info'} title={a.title}>
              {a.message}
              {a.batchNumber && (<span className="mt-1 block">
                  Batch{' '}
                  <Link className="font-semibold underline" to={`/manufacturer/batch/${encodeURIComponent(a.batchNumber)}`}>
                    {a.batchNumber}
                  </Link>
                </span>)}
            </AlertBanner>))}
        </div>)}

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Recent Returns" subtitle="Latest reverse-logistics handoffs" action={<Link to="/manufacturer/returns" className="text-sm font-semibold text-brand-800 hover:underline">
                View all
              </Link>}/>
          {data.recentReturns.length === 0 ? (<EmptyState title="No returns" text="Inbound returns will appear here."/>) : (<DataTable headers={['Return', 'Product', 'Batch', 'Status', 'Updated']}>
              {(data.recentReturns || []).map((r) => (<tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.returnCode}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.productName} {r.strength}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/manufacturer/batch/${encodeURIComponent(r.batchNumber)}`} className="font-medium text-brand-800 hover:underline">
                      {r.batchNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(r.status)}>{prettyStatus(r.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(r.updatedAt)}</td>
                </tr>))}
            </DataTable>)}
        </Card>

        <Card>
          <CardHeader title="AI Risk Snapshot" subtitle="Top model signals" action={<Link to="/manufacturer/ai" className="text-sm font-semibold text-brand-800 hover:underline">
                Open
              </Link>}/>
          <div className="space-y-3 p-5">
            {(data.aiInsights || []).length === 0 && (<p className="text-sm text-slate-500">No insights available.</p>)}
            {(data.aiInsights || []).map((i) => (<div key={i.id} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-sm font-semibold text-slate-800">{i.title}</p>
                  <Badge tone="brand">{Math.round(i.confidence * 100)}%</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">{i.summary}</p>
              </div>))}
          </div>
        </Card>
      </div>
    </div>);
}
