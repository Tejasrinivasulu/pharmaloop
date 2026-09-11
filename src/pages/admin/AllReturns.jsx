import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Card, DataTable, EmptyState, Input, LoadingScreen, PageHeader, Select, statusTone, } from '../../components/ui';
import { formatDate, prettyStatus } from './format';
export default function AllReturns() {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [q, setQ] = useState('');
    const [status, setStatus] = useState('ALL');
    useEffect(() => {
        api('/api/admin/returns')
            .then((r) => setReturns(r.returns || []))
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
            .finally(() => setLoading(false));
    }, []);
    const statuses = useMemo(() => Array.from(new Set(returns.map((r) => r.status))).sort(), [returns]);
    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return returns.filter((r) => {
            if (status !== 'ALL' && r.status !== status)
                return false;
            if (!needle)
                return true;
            return (r.returnCode.toLowerCase().includes(needle) ||
                r.batchNumber.toLowerCase().includes(needle) ||
                r.productName.toLowerCase().includes(needle) ||
                r.pharmacyName.toLowerCase().includes(needle));
        });
    }, [returns, q, status]);
    if (loading)
        return <LoadingScreen label="Loading returns…"/>;
    if (error)
        return <AlertBanner tone="danger" title="Unable to load returns">{error}</AlertBanner>;
    return (<div>
      <PageHeader title="All returns" subtitle="Cross-organization reverse-logistics cases visible to the regulator"/>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Search" placeholder="Return code, batch, pharmacy…" value={q} onChange={(e) => setQ(e.target.value)}/>
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All statuses</option>
          {statuses.map((s) => (<option key={s} value={s}>
              {prettyStatus(s)}
            </option>))}
        </Select>
      </div>
      <Card>
        {filtered.length === 0 ? (<EmptyState title="No returns match filters"/>) : (<DataTable headers={[
                'Return',
                'Batch',
                'Product',
                'Pharmacy',
                'Qty',
                'Status',
                'Flags',
                'Updated',
            ]}>
            {filtered.map((r) => (<tr key={r.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{r.returnCode}</td>
                <td className="px-4 py-3">
                  <Link to={`/admin/batch-search?q=${encodeURIComponent(r.batchNumber)}`} className="font-mono text-xs text-brand-700 hover:underline">
                    {r.batchNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {r.productName}
                  <span className="block text-xs text-slate-400">{r.strength}</span>
                </td>
                <td className="px-4 py-3 text-slate-700">{r.pharmacyName}</td>
                <td className="px-4 py-3 text-slate-700">
                  {r.quantities.requested}
                  {r.receivedQty != null && (<span className="block text-xs text-slate-400">recv {r.receivedQty}</span>)}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(r.status)}>{prettyStatus(r.status)}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {r.discrepancy && <Badge tone="warning">Discrepancy</Badge>}
                    {r.closed && <Badge tone="success">Closed</Badge>}
                    {!r.certificate && r.disposalCompleted && (<Badge tone="warning">No cert</Badge>)}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDate(r.updatedAt)}</td>
              </tr>))}
          </DataTable>)}
      </Card>
    </div>);
}
