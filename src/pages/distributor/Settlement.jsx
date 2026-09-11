import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Card, CardHeader, DataTable, EmptyState, KpiCard, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
function formatInr(n) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(n);
}
export default function Settlement() {
    const [settlements, setSettlements] = useState([]);
    const [totals, setTotals] = useState({ pending: 0, approved: 0, paid: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        api('/api/distributor/settlements')
            .then((r) => {
            setSettlements(r.settlements || []);
            setTotals(r.totals || { pending: 0, approved: 0, paid: 0 });
        })
            .catch((e) => setError(e.message || 'Failed to load settlements'))
            .finally(() => setLoading(false));
    }, []);
    if (loading)
        return <LoadingScreen label="Loading settlement ledger…"/>;
    if (error)
        return <AlertBanner tone="danger" title="Unable to load">{error}</AlertBanner>;
    return (<div>
      <PageHeader title="Settlement" subtitle="Pharmacy credit notes linked to returns you handled"/>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <KpiCard label="Pending" value={formatInr(totals.pending)} accent="warning"/>
        <KpiCard label="Approved" value={formatInr(totals.approved)}/>
        <KpiCard label="Paid" value={formatInr(totals.paid)} accent="success"/>
      </div>

      <Card>
        <CardHeader title="Settlement ledger" subtitle={`${settlements.length} credit lines`}/>
        {settlements.length === 0 ? (<EmptyState title="No settlements yet" text="Credits appear after manufacturer closes verified disposals."/>) : (<DataTable headers={['Credit', 'Pharmacy', 'Return', 'Batch', 'Qty', 'Amount', 'Status']}>
            {settlements.map((s) => (<tr key={s.id}>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-800">
                  {s.creditNoteNo || '—'}
                </td>
                <td className="px-4 py-3 text-slate-700">{s.pharmacyName}</td>
                <td className="px-4 py-3 font-medium">{s.returnCode}</td>
                <td className="px-4 py-3">
                  <Link to={`/distributor/batch/${encodeURIComponent(s.batchNumber)}`} className="text-brand-800 hover:underline">
                    {s.batchNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 tabular-nums">{s.qty}</td>
                <td className="px-4 py-3 font-semibold tabular-nums">{formatInr(s.amount)}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                </td>
              </tr>))}
          </DataTable>)}
      </Card>
    </div>);
}
