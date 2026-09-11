import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, Input, LoadingScreen, PageHeader, Select, AlertBanner, statusTone } from '../../components/ui';
import { formatDate } from './format';

export default function PharmacyInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selling, setSelling] = useState(null);
  const [sellQty, setSellQty] = useState('');
  const [sellingBusy, setSellingBusy] = useState(false);

  const load = () =>
    api('/api/pharmacy/inventory')
      .then((r) => setItems(r.inventory || []))
      .catch((e) => setError(e.message || 'Failed to load inventory'));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) => {
      const matchStatus = status === 'ALL' || i.status === status;
      const matchQ =
        !term ||
        i.productName.toLowerCase().includes(term) ||
        i.batchNumber.toLowerCase().includes(term) ||
        i.strength.toLowerCase().includes(term);
      return matchStatus && matchQ;
    });
  }, [items, q, status]);

  const confirmSell = async (e) => {
    e.preventDefault();
    if (!selling) return;
    setSellingBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await api('/api/pharmacy/sell', {
        method: 'POST',
        body: JSON.stringify({ batchNumber: selling.batchNumber, qty: Number(sellQty) }),
      });
      setSuccess(`Sold ${res.soldQty} of ${res.batchNumber} to customer`);
      setSelling(null);
      setSellQty('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sale failed');
    } finally {
      setSellingBusy(false);
    }
  };

  if (loading) return <LoadingScreen label="Loading inventory…" />;
  const statuses = Array.from(new Set(items.map((i) => i.status))).sort();

  return (
    <div className="space-y-4">
      <PageHeader title="Inventory" subtitle="On-hand stock by batch — sell to customers or return near-expiry" />
      {error && <AlertBanner tone="danger" title="Error">{error}</AlertBanner>}
      {success && <AlertBanner tone="success" title="Sold">{success}</AlertBanner>}

      {selling && (
        <Card className="max-w-md">
          <CardHeader title={`Sell ${selling.batchNumber}`} subtitle={`${selling.productName} · available ${selling.qty}`} />
          <form className="space-y-3 px-5 py-5" onSubmit={confirmSell}>
            <Input label="Quantity" type="number" min={1} max={selling.qty} value={sellQty} onChange={(e) => setSellQty(e.target.value)} required />
            <div className="flex gap-2">
              <Button type="submit" loading={sellingBusy}>Confirm retail sale</Button>
              <Button type="button" variant="secondary" onClick={() => setSelling(null)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Stock ledger"
          subtitle={`${filtered.length} of ${items.length} SKUs`}
          action={
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Search medicine or batch…" value={q} onChange={(e) => setQ(e.target.value)} className="min-w-[180px]" />
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="min-w-[140px]">
                <option value="ALL">All statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll('_', ' ')}
                  </option>
                ))}
              </Select>
            </div>
          }
        />
        {filtered.length === 0 ? (
          <EmptyState title="No matching inventory" text="Adjust search or status filter." />
        ) : (
          <DataTable headers={['Medicine', 'Batch', 'Qty', 'EXP', 'Status', 'Action']}>
            {filtered.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">
                    {i.productName} {i.strength}
                  </p>
                  <p className="text-xs text-slate-500">{i.location}</p>
                  {i.notForSale && (
                    <span className="mt-1 inline-block">
                      <Badge tone="danger">NOT FOR SALE</Badge>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-brand-800">{i.batchNumber}</td>
                <td className="px-4 py-3">{i.qty.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(i.expiryDate)}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(i.status)}>{i.status.replaceAll('_', ' ')}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <Link to={`/pharmacy/batch/${encodeURIComponent(i.batchNumber)}`} className="text-sm font-semibold text-brand-800 hover:underline">
                      Passport
                    </Link>
                    {!i.notForSale && i.qty > 0 && (
                      <button
                        type="button"
                        className="text-left text-sm font-semibold text-verify-700 hover:underline"
                        onClick={() => {
                          setSelling(i);
                          setSellQty('');
                          setSuccess('');
                          setError('');
                        }}
                      >
                        Sell
                      </button>
                    )}
                    {(i.status === 'EXPIRING' || i.status === 'EXPIRED' || i.notForSale) && (
                      <Link to={`/pharmacy/returns/new?batch=${encodeURIComponent(i.batchNumber)}&qty=${i.qty}`} className="text-sm font-semibold text-orange-700 hover:underline">
                        Return
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </div>
  );
}
