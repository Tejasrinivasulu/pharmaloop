import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { Card, CardHeader, DataTable, EmptyState, KpiCard, LoadingScreen, PageHeader, Badge, statusTone, } from '../../components/ui';
import { manifestLabel } from './types';
export default function Reports() {
    const [returns, setReturns] = useState([]);
    const [manifests, setManifests] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        Promise.all([
            api('/api/distributor/returns'),
            api('/api/distributor/manifests'),
        ])
            .then(([r, m]) => {
            setReturns(r.returns || []);
            setManifests(m.manifests || []);
        })
            .finally(() => setLoading(false));
    }, []);
    const stats = useMemo(() => {
        const discrepancies = returns.filter((x) => x.discrepancy).length;
        const verifiedUnits = returns.reduce((s, x) => s + (x.quantities.verified || 0), 0);
        const requestedUnits = returns.reduce((s, x) => s + x.quantities.requested, 0);
        const manifestUnits = manifests.reduce((s, x) => s + x.totalUnits, 0);
        return { discrepancies, verifiedUnits, requestedUnits, manifestUnits };
    }, [returns, manifests]);
    if (loading)
        return <LoadingScreen label="Building reports…"/>;
    return (<div>
      <PageHeader title="Reports" subtitle="Operational snapshot of return throughput and manufacturer manifests"/>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Return records" value={returns.length}/>
        <KpiCard label="Requested units" value={stats.requestedUnits}/>
        <KpiCard label="Verified units" value={stats.verifiedUnits} accent="success"/>
        <KpiCard label="Discrepancies" value={stats.discrepancies} accent="warning"/>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <KpiCard label="Manifests" value={manifests.length}/>
        <KpiCard label="Manifest units" value={stats.manifestUnits}/>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Status mix" subtitle="Return pipeline distribution"/>
          {returns.length === 0 ? (<EmptyState title="No data"/>) : (<DataTable headers={['Status', 'Count']}>
              {[...returns.reduce((m, r) => {
                    m.set(r.status, (m.get(r.status) || 0) + 1);
                    return m;
                }, new Map())]
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (<tr key={status}>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(status)}>{status.replaceAll('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums font-semibold">{count}</td>
                  </tr>))}
            </DataTable>)}
        </Card>

        <Card>
          <CardHeader title="Manifest pipeline" subtitle="Prepared → received"/>
          {manifests.length === 0 ? (<EmptyState title="No manifests"/>) : (<DataTable headers={['Manifest', 'Status', 'Units']}>
              {manifests.map((m) => (<tr key={m.id}>
                  <td className="px-4 py-3 font-medium">{m.manifestNo}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(m.status)}>{manifestLabel(m.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{m.totalUnits}</td>
                </tr>))}
            </DataTable>)}
        </Card>
      </div>
    </div>);
}
