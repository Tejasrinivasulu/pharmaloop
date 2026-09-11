import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, DataTable, EmptyState, Input, LoadingScreen, PageHeader, Select, statusTone, } from '../../components/ui';
import { prettyStatus } from './format';
export default function Discrepancies() {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [msg, setMsg] = useState(null);
    const [q, setQ] = useState('');
    const [scope, setScope] = useState('OPEN');
    const [busyId, setBusyId] = useState(null);
    const load = () => api('/api/admin/returns')
        .then((r) => setReturns((r.returns || []).filter((x) => x.discrepancy)))
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
        .finally(() => setLoading(false));
    useEffect(() => {
        load();
    }, []);
    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return returns.filter((r) => {
            if (scope === 'OPEN' && r.closed)
                return false;
            if (scope === 'CLOSED' && !r.closed)
                return false;
            if (!needle)
                return true;
            return (r.returnCode.toLowerCase().includes(needle) ||
                r.batchNumber.toLowerCase().includes(needle) ||
                r.pharmacyName.toLowerCase().includes(needle) ||
                (r.discrepancyNote || '').toLowerCase().includes(needle));
        });
    }, [returns, q, scope]);
    async function clearDiscrepancy(id) {
        setBusyId(id);
        setError(null);
        setMsg(null);
        try {
            await api(`/api/admin/returns/${id}/clear-discrepancy`, {
                method: 'POST',
                body: JSON.stringify({ note: 'Discrepancy cleared after regulator review' }),
            });
            setMsg('Discrepancy cleared');
            await load();
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : 'Clear failed');
        }
        finally {
            setBusyId(null);
        }
    }
    if (loading)
        return <LoadingScreen label="Loading discrepancies…"/>;
    return (<div>
      <PageHeader title="Discrepancies" subtitle="Quantity and custody mismatches requiring regulator visibility"/>
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
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Filter" placeholder="Return, batch, pharmacy, note…" value={q} onChange={(e) => setQ(e.target.value)}/>
        <Select label="Scope" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="OPEN">Open only</option>
          <option value="CLOSED">Closed only</option>
          <option value="ALL">All discrepancies</option>
        </Select>
      </div>
      <Card>
        {filtered.length === 0 ? (<EmptyState title="No discrepancies in this filter" text="Quantity matches across selected scope."/>) : (<DataTable headers={[
                'Return',
                'Batch',
                'Pharmacy',
                'Expected',
                'Received',
                'Difference',
                'Note',
                'Status',
                'Action',
            ]}>
            {filtered.map((r) => {
                const expected = r.expectedQty || r.quantities.requested;
                const received = r.receivedQty ?? r.quantities.received;
                const diff = received - expected;
                return (<tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.returnCode}</td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/batch-search?q=${encodeURIComponent(r.batchNumber)}`} className="font-mono text-xs text-brand-700 hover:underline">
                      {r.batchNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.pharmacyName}</td>
                  <td className="px-4 py-3">{expected}</td>
                  <td className="px-4 py-3">{received}</td>
                  <td className="px-4 py-3">
                    <Badge tone={diff === 0 ? 'success' : 'warning'}>
                      {diff > 0 ? `+${diff}` : diff}
                    </Badge>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-xs text-slate-500">
                    {r.discrepancyNote || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(r.status)}>{prettyStatus(r.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {!r.closed && (<Button size="sm" variant="secondary" loading={busyId === r.id} onClick={() => clearDiscrepancy(r.id)}>
                        Clear flag
                      </Button>)}
                  </td>
                </tr>);
            })}
          </DataTable>)}
      </Card>
    </div>);
}
