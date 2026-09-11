import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Badge, Card, CardHeader, DataTable, EmptyState, KpiCard, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
import { formatDiff, qtyDiff } from './types';
export default function Dashboard() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api('/api/distributor/dashboard')
            .then(setData)
            .catch((e) => setError(e.message || 'Failed to load dashboard'))
            .finally(() => setLoading(false));
    }, []);
    if (loading)
        return <LoadingScreen label="Loading distributor dashboard…"/>;
    if (error || !data) {
        return (<PageHeader title="Distributor Dashboard" subtitle={error || 'Unable to load'}/>);
    }
    const { kpis } = data;
    return (<div>
      <PageHeader title="Distributor Dashboard" subtitle={data.org
            ? `${data.org.name}${data.org.region ? ` · ${data.org.region}` : ''} — inbound pharmacy returns & upstream manifests`
            : 'Inbound pharmacy returns & upstream manifests'}/>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pending verification" value={kpis.pendingVerification} accent="warning"/>
        <KpiCard label="Verified awaiting pickup" value={kpis.verifiedAwaitingPickup} accent="default"/>
        <KpiCard label="In-transit manifests" value={kpis.inTransitManifests} accent="default"/>
        <KpiCard label="Delivered manifests" value={kpis.deliveredManifests} accent="success"/>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total return units" value={kpis.totalReturnUnits}/>
        <KpiCard label="Warehouse SKUs" value={kpis.warehouseSkus}/>
        <KpiCard label="Not-for-sale units" value={kpis.notForSaleUnits} accent={kpis.notForSaleUnits > 0 ? 'danger' : 'default'}/>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Recent pharmacy returns" subtitle="Latest activity across your network" action={<Link to="/distributor/returns" className="text-sm font-semibold text-brand-800 hover:underline">
                View all
              </Link>}/>
          {data.recentReturns.length === 0 ? (<EmptyState title="No returns yet" text="Pharmacy return requests will appear here."/>) : (<DataTable headers={['Return', 'Pharmacy', 'Batch', 'Qty', 'Status', 'Δ']}>
              {(data.recentReturns || []).map((r) => {
                const diff = qtyDiff(r);
                return (<tr key={r.id} className={r.discrepancy ? 'bg-orange-50/60' : undefined}>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.returnCode}</td>
                    <td className="px-4 py-3 text-slate-600">{r.pharmacyName}</td>
                    <td className="px-4 py-3">
                      <Link to={`/distributor/batch/${encodeURIComponent(r.batchNumber)}`} className="font-medium text-brand-800 hover:underline">
                        {r.batchNumber}
                      </Link>
                      <p className="text-xs text-slate-400">{r.productName}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.quantities.requested}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(r.status)}>{r.status.replaceAll('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {r.discrepancy || diff !== 0 ? (<span className="font-semibold text-orange-700">{formatDiff(diff)}</span>) : (<span className="text-slate-400">—</span>)}
                    </td>
                  </tr>);
            })}
            </DataTable>)}
        </Card>

        <Card>
          <CardHeader title="Recent manifests" subtitle="Upstream manufacturer shipments" action={<Link to="/distributor/manifests" className="text-sm font-semibold text-brand-800 hover:underline">
                View all
              </Link>}/>
          {(data.manifests || []).length === 0 ? (<EmptyState title="No manifests" text="Consolidated manufacturer returns will list here."/>) : (<DataTable headers={['Manifest', 'Manufacturer', 'Units', 'Status']}>
              {(data.manifests || []).map((m) => (<tr key={m.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{m.manifestNo}</td>
                  <td className="px-4 py-3 text-slate-600">{m.manufacturerName}</td>
                  <td className="px-4 py-3 tabular-nums">{m.totalUnits}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(m.status)}>{m.status.replaceAll('_', ' ')}</Badge>
                  </td>
                </tr>))}
            </DataTable>)}
        </Card>
      </div>
    </div>);
}
