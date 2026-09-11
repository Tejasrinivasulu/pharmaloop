import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Card, CardHeader, DataTable, EmptyState, KpiCard, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
import { formatDate, formatInr } from './format';
export default function PharmacySettlement() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        api('/api/pharmacy/settlements')
            .then(setData)
            .catch((e) => setError(e.message || 'Failed to load settlements'))
            .finally(() => setLoading(false));
    }, []);
    if (loading)
        return <LoadingScreen label="Loading settlements…"/>;
    if (error)
        return <AlertBanner tone="danger" title="Unable to load settlements">{error}</AlertBanner>;
    if (!data)
        return null;
    return (<div>
      <PageHeader title="Settlement" subtitle="Credit notes and payment status for closed returns"/>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <KpiCard label="Pending" value={formatInr(data.totals.pending)} accent="warning"/>
        <KpiCard label="Approved" value={formatInr(data.totals.approved)} accent="default"/>
        <KpiCard label="Paid" value={formatInr(data.totals.paid)} accent="success"/>
      </div>

      <Card>
        <CardHeader title="Settlement ledger" subtitle={`${data.settlements.length} records`}/>
        {data.settlements.length === 0 ? (<EmptyState title="No settlements" text="Settlements appear after return verification."/>) : (<DataTable headers={['Return', 'Product', 'Qty', 'Amount', 'Type / Status', 'Credit note', 'Date']}>
            {data.settlements.map((s) => (<tr key={s.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-800">{s.returnCode}</td>
                <td className="px-4 py-3">
                  <p className="text-slate-800">{s.productName}</p>
                  <p className="text-xs text-slate-500">{s.batchNumber}</p>
                </td>
                <td className="px-4 py-3">{s.qty}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{formatInr(s.amount)}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                  <p className="mt-1 text-xs text-slate-500">Credit settlement</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{s.creditNoteNo || '—'}</td>
                <td className="px-4 py-3 text-slate-500">
                  {s.paidAt ? formatDate(s.paidAt) : formatDate(s.createdAt)}
                </td>
              </tr>))}
          </DataTable>)}
      </Card>
    </div>);
}
