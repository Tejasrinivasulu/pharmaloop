import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, DataTable, EmptyState, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
export default function Consolidate() {
    const [returns, setReturns] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [created, setCreated] = useState(null);
    const [error, setError] = useState('');
    const load = () => api('/api/distributor/returns')
        .then((r) => setReturns(r.returns || []))
        .finally(() => setLoading(false));
    useEffect(() => {
        load();
    }, []);
    const consolidatable = useMemo(() => returns.filter((r) => !r.closed &&
        r.status === 'DISTRIBUTOR_VERIFIED' &&
        r.quantities.verified > 0 &&
        !!r.pickedUpAt &&
        !r.manifestId), [returns]);
    const selectedReturns = consolidatable.filter((r) => selected.has(r.id));
    const totalUnits = selectedReturns.reduce((s, r) => s + (r.quantities.verified || r.quantities.requested), 0);
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
    const createManifest = async () => {
        if (selected.size === 0)
            return;
        setSubmitting(true);
        setError('');
        setCreated(null);
        try {
            const res = await api('/api/distributor/consolidate', {
                method: 'POST',
                body: JSON.stringify({ returnIds: [...selected] }),
            });
            setCreated(res.manifest);
            setSelected(new Set());
            await load();
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : 'Consolidation failed');
        }
        finally {
            setSubmitting(false);
        }
    };
    if (loading)
        return <LoadingScreen label="Loading returns for consolidation…"/>;
    return (<div>
      <PageHeader title="Return Consolidation" subtitle="Multi-select verified returns and create a manufacturer outbound manifest" actions={<Button loading={submitting} disabled={selected.size === 0} onClick={createManifest}>
            Create manufacturer manifest
          </Button>}/>

      {error && (<div className="mb-4">
          <AlertBanner tone="danger" title={error}/>
        </div>)}

      {created && (<div className="mb-4">
          <AlertBanner tone="success" title={`Manifest ${created.manifestNo} created`}>
            {created.totalUnits} units · {created.returnIds?.length || selectedReturns.length} returns ·{' '}
            {created.manufacturerName} · status {created.status}
            {' · '}
            <Link to="/distributor/manifests" className="font-semibold underline">
              View manifests
            </Link>
          </AlertBanner>
        </div>)}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Selected returns</p>
          <p className="mt-1 font-display text-2xl font-bold text-brand-900">{selected.size}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sum of quantities</p>
          <p className="mt-1 font-display text-2xl font-bold text-brand-900">{totalUnits}</p>
          <p className="text-xs text-slate-400">Verified units across selection</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Eligible pool</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-800">{consolidatable.length}</p>
          <p className="text-xs text-slate-400">DISTRIBUTOR_VERIFIED</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Verified returns" subtitle="Select one or more to build an upstream manufacturer manifest"/>
        {consolidatable.length === 0 ? (<EmptyState title="Nothing to consolidate" text="Complete verification and pickup for pharmacy returns first."/>) : (<DataTable headers={['', 'Return', 'Pharmacy', 'Batch', 'Verified qty', 'Manufacturer', 'Status']}>
            {consolidatable.map((r) => (<tr key={r.id} className={selected.has(r.id) ? 'bg-brand-50/40' : undefined}>
                <td className="px-4 py-3">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.returnCode}`}/>
                </td>
                <td className="px-4 py-3 font-medium">{r.returnCode}</td>
                <td className="px-4 py-3 text-slate-600">{r.pharmacyName}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{r.batchNumber}</p>
                  <p className="text-xs text-slate-400">{r.productName}</p>
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold">{r.quantities.verified}</td>
                <td className="px-4 py-3 text-slate-600">{r.manufacturerName}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(r.status)}>{r.status.replaceAll('_', ' ')}</Badge>
                </td>
              </tr>))}
          </DataTable>)}
      </Card>
    </div>);
}
