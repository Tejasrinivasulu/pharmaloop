import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, DataTable, EmptyState, KpiCard, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
import { manifestLabel } from './types';
const PIPELINE = [
    { key: 'DRAFT', label: 'Prepared' },
    { key: 'IN_TRANSIT', label: 'In Transit' },
    { key: 'DELIVERED', label: 'Received' },
];
export default function Manifests() {
    const [manifests, setManifests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [busyId, setBusyId] = useState(null);
    const load = () => api('/api/distributor/manifests')
        .then((r) => setManifests(r.manifests || []))
        .catch((e) => setError(e.message || 'Failed to load manifests'))
        .finally(() => setLoading(false));
    useEffect(() => {
        load();
    }, []);
    const counts = useMemo(() => {
        const c = { Prepared: 0, 'In Transit': 0, Received: 0, Closed: 0 };
        for (const m of manifests) {
            const label = manifestLabel(m.status);
            if (label === 'Prepared')
                c.Prepared++;
            else if (label === 'In Transit' || label === 'Dispatched')
                c['In Transit']++;
            else if (label === 'Received')
                c.Received++;
            else if (label === 'Closed')
                c.Closed++;
            else
                c['In Transit']++;
        }
        return c;
    }, [manifests]);
    async function dispatch(id) {
        setBusyId(id);
        setError('');
        setMsg('');
        try {
            await api(`/api/distributor/manifests/${id}/dispatch`, { method: 'POST' });
            setMsg('Manifest dispatched to manufacturer');
            await load();
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : 'Dispatch failed');
        }
        finally {
            setBusyId(null);
        }
    }
    if (loading)
        return <LoadingScreen label="Loading manufacturer manifests…"/>;
    return (<div>
      <PageHeader title="Manufacturer Returns" subtitle="Outbound consolidated manifests to manufacturers"/>

      {error && (<AlertBanner tone="danger" title="Error">
          {error}
        </AlertBanner>)}
      {msg && (<AlertBanner tone="success" title="Updated">
          {msg}
        </AlertBanner>)}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Prepared" value={counts.Prepared}/>
        <KpiCard label="In transit" value={counts['In Transit']} accent="warning"/>
        <KpiCard label="Received" value={counts.Received} accent="success"/>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PIPELINE.map((p) => (<span key={p.key} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            {p.label}
          </span>))}
      </div>

      <Card className="mt-6">
        <CardHeader title="All manifests" subtitle={`${manifests.length} shipments`}/>
        {manifests.length === 0 ? (<EmptyState title="No manifests" text="Create a manufacturer manifest from Return Consolidation."/>) : (<DataTable headers={['Manifest', 'Manufacturer', 'Returns', 'Units', 'Status', 'Pickup', 'Action']}>
            {manifests.map((m) => (<tr key={m.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{m.manifestNo}</td>
                <td className="px-4 py-3 text-slate-600">{m.manufacturerName}</td>
                <td className="px-4 py-3 tabular-nums">
                  {m.returnIds?.length || m.returns?.length || 0}
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold">{m.totalUnits}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(m.status)}>{manifestLabel(m.status)}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {m.pickupAt ? new Date(m.pickupAt).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3">
                  {m.status === 'DRAFT' && (<Button size="sm" loading={busyId === m.id} onClick={() => dispatch(m.id)}>
                      Dispatch
                    </Button>)}
                </td>
              </tr>))}
          </DataTable>)}
      </Card>
    </div>);
}
