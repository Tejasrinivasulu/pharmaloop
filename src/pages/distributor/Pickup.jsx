import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, DataTable, EmptyState, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
export default function Pickup() {
    const [returns, setReturns] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const load = () => api('/api/distributor/returns')
        .then((r) => setReturns(r.returns || []))
        .finally(() => setLoading(false));
    useEffect(() => {
        load();
    }, []);
    const verified = useMemo(() => returns.filter((r) => r.status === 'DISTRIBUTOR_VERIFIED' && !r.closed && !r.pickedUpAt && !r.manifestId), [returns]);
    const byStatus = useMemo(() => {
        const map = new Map();
        for (const r of returns) {
            map.set(r.status, (map.get(r.status) || 0) + 1);
        }
        return [...map.entries()].sort((a, b) => b[1] - a[1]);
    }, [returns]);
    const toggle = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    };
    const toggleAll = () => {
        if (selected.size === verified.length)
            setSelected(new Set());
        else
            setSelected(new Set(verified.map((r) => r.id)));
    };
    const confirmPickup = async (ids) => {
        if (!ids.length)
            return;
        setSubmitting(true);
        setMessage(null);
        try {
            // Backend expects returnIds[]; single-id UX maps to array
            const res = await api('/api/distributor/pickup', {
                method: 'POST',
                body: JSON.stringify({ returnIds: ids, returnId: ids[0] }),
            });
            setMessage({
                tone: 'success',
                text: `Pickup confirmed for ${res.count} return${res.count === 1 ? '' : 's'}. Staged for consolidation.`,
            });
            setSelected(new Set());
            await load();
        }
        catch (e) {
            setMessage({
                tone: 'danger',
                text: e instanceof ApiError ? e.message : 'Pickup failed',
            });
        }
        finally {
            setSubmitting(false);
        }
    };
    if (loading)
        return <LoadingScreen label="Loading pickup queue…"/>;
    return (<div>
      <PageHeader title="Pickup Management" subtitle="Confirm collection of distributor-verified returns from pharmacies" actions={<Button loading={submitting} disabled={selected.size === 0} onClick={() => confirmPickup([...selected])}>
            Confirm pickup ({selected.size})
          </Button>}/>

      {message && (<div className="mb-4">
          <AlertBanner tone={message.tone} title={message.text}/>
        </div>)}

      <div className="mb-6 flex flex-wrap gap-2">
        {byStatus.map(([status, count]) => (<div key={status} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <Badge tone={statusTone(status)}>{status.replaceAll('_', ' ')}</Badge>
            <span className="font-display text-sm font-semibold text-slate-800">{count}</span>
          </div>))}
      </div>

      <Card>
        <CardHeader title="Verified — ready for pickup" subtitle={`${verified.length} returns in DISTRIBUTOR_VERIFIED`} action={verified.length > 0 && (<Button size="sm" variant="secondary" onClick={toggleAll}>
                {selected.size === verified.length ? 'Clear' : 'Select all'}
              </Button>)}/>
        {verified.length === 0 ? (<EmptyState title="Nothing to pick up" text="Verify pharmacy returns first, then confirm pickup here."/>) : (<DataTable headers={['', 'Return', 'Pharmacy', 'Batch', 'Verified qty', 'Action']}>
            {verified.map((r) => (<tr key={r.id}>
                <td className="px-4 py-3">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.returnCode}`}/>
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">{r.returnCode}</td>
                <td className="px-4 py-3 text-slate-600">{r.pharmacyName}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{r.batchNumber}</p>
                  <p className="text-xs text-slate-400">{r.productName}</p>
                </td>
                <td className="px-4 py-3 tabular-nums">{r.quantities.verified}</td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="secondary" loading={submitting} onClick={() => confirmPickup([r.id])}>
                    Pick up
                  </Button>
                </td>
              </tr>))}
          </DataTable>)}
      </Card>
    </div>);
}
