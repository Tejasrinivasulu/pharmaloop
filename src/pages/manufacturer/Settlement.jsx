import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, DataTable, EmptyState, KpiCard, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
import { formatInr, prettyStatus } from './format';
export default function Settlement() {
    const [settlements, setSettlements] = useState([]);
    const [totals, setTotals] = useState({ pending: 0, approved: 0, paid: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [busyId, setBusyId] = useState(null);
    const load = () => {
        setLoading(true);
        api('/api/manufacturer/settlements')
            .then((r) => {
            setSettlements(r.settlements || []);
            setTotals(r.totals || { pending: 0, approved: 0, paid: 0 });
        })
            .catch((e) => setError(e.message || 'Failed to load'))
            .finally(() => setLoading(false));
    };
    useEffect(() => {
        load();
    }, []);
    const recoveryRate = useMemo(() => {
        const total = totals.pending + totals.approved + totals.paid;
        return total ? Math.round((totals.paid / total) * 100) : 0;
    }, [totals]);
    async function setStatus(id, status) {
        setBusyId(id);
        setError('');
        setMsg('');
        try {
            await api(`/api/manufacturer/settlements/${id}/status`, {
                method: 'POST',
                body: JSON.stringify({ status }),
            });
            setMsg(`Settlement marked ${status}`);
            load();
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : 'Update failed');
        }
        finally {
            setBusyId(null);
        }
    }
    if (loading)
        return <LoadingScreen label="Loading settlement…"/>;
    return (<div>
      <PageHeader title="Settlement" subtitle="Pharmacy credit notes from verified disposals"/>

      {error && (<AlertBanner tone="danger" title="Unable to update">
          {error}
        </AlertBanner>)}
      {msg && (<AlertBanner tone="success" title="Updated">
          {msg}
        </AlertBanner>)}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pending liability" value={formatInr(totals.pending)} accent="warning"/>
        <KpiCard label="Approved" value={formatInr(totals.approved)}/>
        <KpiCard label="Paid / released" value={formatInr(totals.paid)} accent="success"/>
        <KpiCard label="Paid recovery" value={`${recoveryRate}%`} hint="Of ledger total"/>
      </div>

      <Card>
        <CardHeader title="Credit notes" subtitle={`${settlements.length} settlement lines`}/>
        {settlements.length === 0 ? (<EmptyState title="No settlement lines" text="Closing a verified disposal creates a pending pharmacy credit."/>) : (<DataTable headers={['Credit', 'Pharmacy', 'Return', 'Batch', 'Qty', 'Amount', 'Status', 'Actions']}>
            {settlements.map((s) => (<tr key={s.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-800">
                  {s.creditNoteNo || '—'}
                </td>
                <td className="px-4 py-3">{s.pharmacyName}</td>
                <td className="px-4 py-3 font-medium">{s.returnCode}</td>
                <td className="px-4 py-3">{s.batchNumber}</td>
                <td className="px-4 py-3 tabular-nums">{s.qty}</td>
                <td className="px-4 py-3 font-display font-semibold">{formatInr(s.amount)}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(s.status)}>{prettyStatus(s.status)}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {s.status === 'PENDING' && (<Button size="sm" variant="secondary" loading={busyId === s.id} onClick={() => setStatus(s.id, 'APPROVED')}>
                        Approve
                      </Button>)}
                    {(s.status === 'PENDING' || s.status === 'APPROVED') && (<Button size="sm" loading={busyId === s.id} onClick={() => setStatus(s.id, 'PAID')}>
                        Mark paid
                      </Button>)}
                  </div>
                </td>
              </tr>))}
          </DataTable>)}
      </Card>
    </div>);
}
