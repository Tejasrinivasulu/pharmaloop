import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Card, CardHeader, DataTable, EmptyState, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
import { formatDiff, qtyDiff } from './types';
export default function Discrepancies() {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        api('/api/distributor/returns')
            .then((r) => setReturns(r.returns || []))
            .catch((e) => setError(e.message || 'Failed to load'))
            .finally(() => setLoading(false));
    }, []);
    const flagged = useMemo(() => returns.filter((r) => {
        if (r.discrepancy)
            return true;
        const verified = r.quantities.verified;
        if (verified > 0 && verified !== r.quantities.requested)
            return true;
        if (r.receivedQty != null && r.receivedQty !== r.expectedQty)
            return true;
        return false;
    }), [returns]);
    if (loading)
        return <LoadingScreen label="Loading discrepancies…"/>;
    return (<div>
      <PageHeader title="Discrepancies" subtitle="Returns where expected and received quantities do not match"/>

      {error && (<div className="mb-4">
          <AlertBanner tone="danger" title={error}/>
        </div>)}

      <AlertBanner tone="warning" title={`${flagged.length} discrepancy record(s)`}>
        Investigate shortfalls and overages before consolidating upstream. Closed returns keep their
        discrepancy history permanently.
      </AlertBanner>

      <Card className="mt-6">
        <CardHeader title="Flagged returns" subtitle="Filtered by discrepancy flag or qty mismatch"/>
        {flagged.length === 0 ? (<EmptyState title="No discrepancies" text="All distributor returns currently reconcile."/>) : (<DataTable headers={['Return', 'Pharmacy', 'Batch', 'Expected', 'Verified / Received', 'Δ', 'Status', 'Note']}>
            {flagged.map((r) => {
                const diff = qtyDiff(r);
                return (<tr key={r.id} className="bg-orange-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.returnCode}</td>
                  <td className="px-4 py-3 text-slate-600">{r.pharmacyName}</td>
                  <td className="px-4 py-3">
                    <Link to={`/distributor/batch/${encodeURIComponent(r.batchNumber)}`} className="font-medium text-brand-800 hover:underline">
                      {r.batchNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{r.expectedQty || r.quantities.requested}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {r.quantities.verified || '—'}
                    {r.receivedQty != null ? ` / ${r.receivedQty}` : ''}
                  </td>
                  <td className="px-4 py-3 font-semibold text-orange-700">{formatDiff(diff)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(r.status)}>{r.status.replaceAll('_', ' ')}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-orange-700">
                    {r.discrepancyNote || 'Quantity mismatch'}
                  </td>
                </tr>);
            })}
          </DataTable>)}
      </Card>
    </div>);
}
