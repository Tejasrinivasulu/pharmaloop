import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
import { formatDiff, qtyDiff } from './types';
export default function Returns() {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        api('/api/distributor/returns')
            .then((r) => setReturns(r.returns || []))
            .catch((e) => setError(e.message || 'Failed to load returns'))
            .finally(() => setLoading(false));
    }, []);
    if (loading)
        return <LoadingScreen label="Loading pharmacy returns…"/>;
    return (<div>
      <PageHeader title="Pharmacy Returns" subtitle="Inbound return requests awaiting verification, pickup, or consolidation"/>

      {error && (<p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>)}

      <Card>
        <CardHeader title="All returns" subtitle={`${returns.length} records`}/>
        {returns.length === 0 ? (<EmptyState title="No returns" text="No pharmacy returns are assigned to this distributor."/>) : (<DataTable headers={['Pharmacy', 'Batch', 'Expected / Requested', 'Verified', 'Difference', 'Status', 'Action']}>
            {returns.map((r) => {
                const expected = r.quantities.requested;
                const verified = r.quantities.verified;
                const diff = r.receivedQty != null
                    ? (r.receivedQty || 0) - (r.expectedQty || expected)
                    : verified
                        ? verified - expected
                        : qtyDiff(r);
                const hasDisc = r.discrepancy || (verified > 0 && verified !== expected) || (r.receivedQty != null && diff !== 0);
                return (<tr key={r.id} className={hasDisc ? 'bg-orange-50/70 ring-1 ring-inset ring-orange-100' : undefined}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{r.pharmacyName}</p>
                    <p className="text-xs text-slate-400">{r.returnCode}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/distributor/batch/${encodeURIComponent(r.batchNumber)}`} className="font-medium text-brand-800 hover:underline">
                      {r.batchNumber}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {r.productName} {r.strength}
                    </p>
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium">{expected}</td>
                  <td className="px-4 py-3 tabular-nums">{verified || '—'}</td>
                  <td className="px-4 py-3">
                    {hasDisc ? (<span className="font-semibold text-orange-700">{formatDiff(diff)}</span>) : (<span className="text-slate-400">0</span>)}
                    {r.discrepancyNote && (<p className="mt-0.5 max-w-[12rem] text-xs text-orange-600">{r.discrepancyNote}</p>)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={statusTone(r.status)}>{r.status.replaceAll('_', ' ')}</Badge>
                      {r.discrepancy && <Badge tone="warning">Discrepancy</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'RETURN_REQUESTED' ? (<Link to={`/distributor/verify?returnId=${r.id}`}>
                        <Button size="sm">Verify</Button>
                      </Link>) : r.status === 'DISTRIBUTOR_VERIFIED' ? (<Link to="/distributor/pickup">
                        <Button size="sm" variant="secondary">
                          Pickup
                        </Button>
                      </Link>) : (<Link to={`/distributor/batch/${encodeURIComponent(r.batchNumber)}`}>
                        <Button size="sm" variant="ghost">
                          Passport
                        </Button>
                      </Link>)}
                  </td>
                </tr>);
            })}
          </DataTable>)}
      </Card>
    </div>);
}
