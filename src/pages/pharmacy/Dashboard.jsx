import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Card, CardHeader, DataTable, EmptyState, KpiCard, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
import { formatDate, formatInr } from './format';
export default function PharmacyDashboard() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api('/api/pharmacy/dashboard')
            .then(setData)
            .catch((e) => setError(e.message || 'Failed to load dashboard'))
            .finally(() => setLoading(false));
    }, []);
    if (loading)
        return <LoadingScreen label="Loading pharmacy dashboard…"/>;
    if (error)
        return <AlertBanner tone="danger" title="Unable to load dashboard">{error}</AlertBanner>;
    if (!data)
        return null;
    const { kpis } = data;
    const alerts = data.alerts || [];
    const recentReturns = data.recentReturns || [];
    return (<div>
      <PageHeader title="Pharmacy Dashboard" subtitle="Inventory health, returns pipeline, and settlement overview"/>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Total Inventory" value={kpis.unitsOnHand.toLocaleString('en-IN')} hint="Units on hand"/>
        <KpiCard label="Expiring Soon" value={kpis.expiringSoon} accent="warning" hint="SKUs near expiry"/>
        <KpiCard label="Expired Stock" value={kpis.expiredSkuCount} accent="danger" hint="SKUs expired"/>
        <KpiCard label="Active Returns" value={kpis.openReturns} accent="warning" hint="Open reverse logistics"/>
        <KpiCard label="Accepted Returns" value={kpis.closedReturns} accent="success" hint="Closed returns"/>
        <KpiCard label="Pending Settlement" value={kpis.pendingSettlements} accent="warning" hint={`Paid to date ${formatInr(kpis.paidSettlementAmount)}`}/>
      </div>

      {alerts.length > 0 && (<div className="mb-6 space-y-2">
          {alerts.slice(0, 3).map((a) => (<AlertBanner key={a.id} tone={a.severity === 'critical' ? 'danger' : a.severity === 'warning' ? 'warning' : 'info'} title={a.title}>
              {a.message}
              {a.batchNumber && (<span className="mt-1 block">
                  Batch{' '}
                  <Link className="font-semibold underline" to={`/pharmacy/batch/${encodeURIComponent(a.batchNumber)}`}>
                    {a.batchNumber}
                  </Link>
                </span>)}
            </AlertBanner>))}
        </div>)}

      <Card>
        <CardHeader title="Recent Returns" subtitle="Latest reverse-logistics activity" action={<Link to="/pharmacy/returns" className="text-sm font-semibold text-brand-800 hover:underline">
              View all
            </Link>}/>
        {recentReturns.length === 0 ? (<EmptyState title="No returns yet" text="Create a return request from near-expiry or expired stock."/>) : (<DataTable headers={['Return', 'Medicine', 'Batch', 'Qty', 'Status', 'Updated']}>
            {recentReturns.map((r) => (<tr key={r.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-800">{r.returnCode}</td>
                <td className="px-4 py-3 text-slate-700">{r.productName}</td>
                <td className="px-4 py-3">
                  <Link to={`/pharmacy/batch/${encodeURIComponent(r.batchNumber)}`} className="font-medium text-brand-800 hover:underline">
                    {r.batchNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.quantities.requested}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(r.status)}>{r.status.replaceAll('_', ' ')}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(r.updatedAt)}</td>
              </tr>))}
          </DataTable>)}
      </Card>
    </div>);
}
