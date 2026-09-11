import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, DataTable, EmptyState, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
import { formatDate, prettyStatus } from './format';
export default function Quarantine() {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [busyId, setBusyId] = useState(null);
    const load = useCallback(() => {
        setLoading(true);
        api('/api/manufacturer/returns')
            .then((r) => setReturns(r.returns || []))
            .catch((e) => setError(e.message || 'Failed to load'))
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => {
        load();
    }, [load]);
    const quarantined = useMemo(() => returns.filter((r) => r.status === 'QUARANTINED' || r.status === 'MANUFACTURER_RECEIVED'), [returns]);
    async function quarantine(returnId) {
        setBusyId(returnId);
        setError('');
        try {
            await api('/api/manufacturer/quarantine', {
                method: 'POST',
                body: JSON.stringify({ returnId, bay: 'Q-HOLD' }),
            });
            setMsg('Moved to quarantine hold');
            load();
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : 'Failed');
        }
        finally {
            setBusyId(null);
        }
    }
    async function requestDisposal(returnId) {
        setBusyId(returnId);
        setError('');
        try {
            await api('/api/manufacturer/disposal/request', {
                method: 'POST',
                body: JSON.stringify({ returnId }),
            });
            setMsg('Disposal order raised');
            load();
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : 'Failed');
        }
        finally {
            setBusyId(null);
        }
    }
    if (loading)
        return <LoadingScreen label="Loading quarantine…"/>;
    return (<div>
      <PageHeader title="Quarantine" subtitle="Segregated hold — stock is locked from commercial release"/>

      <div className="mb-4">
        <AlertBanner tone="warning" title="QUARANTINED — NOT FOR SALE">
          Units in this bay must not be redistributed, sold, or returned to forward inventory. Advance only via
          licensed disposal workflow with evidence and verification.
        </AlertBanner>
      </div>

      {error && (<div className="mb-4">
          <AlertBanner tone="danger" title="Error">
            {error}
          </AlertBanner>
        </div>)}
      {msg && (<div className="mb-4">
          <AlertBanner tone="success" title="Updated">
            {msg}
          </AlertBanner>
        </div>)}

      <Card>
        <CardHeader title="Quarantine bay" subtitle={`${quarantined.length} active hold records`}/>
        {quarantined.length === 0 ? (<EmptyState title="Quarantine empty" text="Received returns awaiting quarantine will appear here."/>) : (<DataTable headers={['Return', 'Product', 'Batch', 'Qty', 'Status', 'Hold', 'Actions']}>
            {quarantined.map((r) => (<tr key={r.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium">{r.returnCode}</td>
                <td className="px-4 py-3">
                  {r.productName} {r.strength}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/manufacturer/batch/${encodeURIComponent(r.batchNumber)}`} className="font-medium text-brand-800 hover:underline">
                    {r.batchNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.quantities.received || r.expectedQty}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(r.status)}>{prettyStatus(r.status)}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone="warning">QUARANTINED — NOT FOR SALE</Badge>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(r.updatedAt)}</p>
                </td>
                <td className="px-4 py-3">
                  {r.status === 'MANUFACTURER_RECEIVED' ? (<Button size="sm" loading={busyId === r.id} onClick={() => quarantine(r.id)}>
                      Quarantine
                    </Button>) : (<Button size="sm" variant="secondary" loading={busyId === r.id} onClick={() => requestDisposal(r.id)}>
                      Request disposal
                    </Button>)}
                </td>
              </tr>))}
          </DataTable>)}
      </Card>
    </div>);
}
