import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, DataTable, EmptyState, Input, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
import { formatDate, prettyStatus } from './format';
export default function ReturnManagement() {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [busyId, setBusyId] = useState(null);
    const [qtyDraft, setQtyDraft] = useState({});
    const load = useCallback(() => {
        setLoading(true);
        api('/api/manufacturer/returns')
            .then((r) => {
            setReturns(r.returns || []);
            const drafts = {};
            for (const item of r.returns || []) {
                drafts[item.id] = String(item.expectedQty || item.quantities.verified || item.quantities.requested || '');
            }
            setQtyDraft(drafts);
        })
            .catch((e) => setError(e.message || 'Failed to load returns'))
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => {
        load();
    }, [load]);
    async function act(returnId, path, body, okMsg) {
        setBusyId(returnId);
        setMsg('');
        setError('');
        try {
            await api(path, { method: 'POST', body: JSON.stringify(body) });
            setMsg(okMsg);
            load();
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : 'Action failed');
        }
        finally {
            setBusyId(null);
        }
    }
    if (loading)
        return <LoadingScreen label="Loading returns…"/>;
    return (<div>
      <PageHeader title="Return Management" subtitle="Receive distributor-verified returns, quarantine, and advance disposal workflow"/>

      {error && (<div className="mb-4">
          <AlertBanner tone="danger" title="Action failed">
            {error}
          </AlertBanner>
        </div>)}
      {msg && (<div className="mb-4">
          <AlertBanner tone="success" title="Updated">
            {msg}
          </AlertBanner>
        </div>)}

      <Card>
        <CardHeader title="Inbound returns" subtitle={`${returns.length} records`}/>
        {returns.length === 0 ? (<EmptyState title="No returns"/>) : (<DataTable headers={['Return', 'Product', 'Batch', 'Expected', 'Received', 'Status', 'Actions']}>
            {returns.map((r) => (<tr key={r.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{r.returnCode}</p>
                  <p className="text-xs text-slate-500">{r.pharmacyName}</p>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {r.productName} {r.strength}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/manufacturer/batch/${encodeURIComponent(r.batchNumber)}`} className="font-medium text-brand-800 hover:underline">
                    {r.batchNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.expectedQty || r.quantities.verified || r.quantities.requested}</td>
                <td className="px-4 py-3">{r.receivedQty ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(r.status)}>{prettyStatus(r.status)}</Badge>
                  {r.discrepancy && (<p className="mt-1 text-xs font-semibold text-red-600">Discrepancy</p>)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex min-w-[220px] flex-col gap-2">
                    {r.status === 'DISTRIBUTOR_VERIFIED' && (<>
                        <Input label="Received qty" type="number" min={0} value={qtyDraft[r.id] ?? ''} onChange={(e) => setQtyDraft((d) => ({ ...d, [r.id]: e.target.value }))}/>
                        <Button size="sm" loading={busyId === r.id} onClick={() => act(r.id, '/api/manufacturer/receive', {
                        returnId: r.id,
                        receivedQty: Number(qtyDraft[r.id]),
                    }, `Received ${r.returnCode}`)}>
                          Receive
                        </Button>
                      </>)}
                    {r.status === 'MANUFACTURER_RECEIVED' && (<Button size="sm" variant="secondary" loading={busyId === r.id} onClick={() => act(r.id, '/api/manufacturer/quarantine', { returnId: r.id, bay: 'Q-A1' }, `Quarantined ${r.returnCode}`)}>
                        Move to Quarantine
                      </Button>)}
                    {r.status === 'QUARANTINED' && (<Button size="sm" variant="secondary" loading={busyId === r.id} onClick={() => act(r.id, '/api/manufacturer/disposal/request', { returnId: r.id }, `Disposal requested for ${r.returnCode}`)}>
                        Request Disposal
                      </Button>)}
                    {!['DISTRIBUTOR_VERIFIED', 'MANUFACTURER_RECEIVED', 'QUARANTINED'].includes(r.status) && (<span className="text-xs text-slate-400">
                        {formatDate(r.updatedAt)} · manage in Disposal
                      </span>)}
                  </div>
                </td>
              </tr>))}
          </DataTable>)}
      </Card>
    </div>);
}
