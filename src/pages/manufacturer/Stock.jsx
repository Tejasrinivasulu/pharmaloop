import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, Input, PageHeader, Select, statusTone } from '../../components/ui';

export default function ManufacturerStock() {
  const [inventory, setInventory] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selling, setSelling] = useState(null);
  const [qty, setQty] = useState('');
  const [distributorOrgId, setDistributorOrgId] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setError('');
    try {
      const [inv, dist] = await Promise.all([
        api('/api/manufacturer/inventory'),
        api('/api/manufacturer/distributors'),
      ]);
      setInventory(inv.inventory || []);
      setDistributors(dist.distributors || []);
      if (!distributorOrgId && dist.distributors?.[0]) setDistributorOrgId(dist.distributors[0].id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load stock');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const sell = async (e) => {
    e.preventDefault();
    if (!selling) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api('/api/manufacturer/sell', {
        method: 'POST',
        body: JSON.stringify({
          batchNumber: selling.batchNumber,
          qty: Number(qty),
          distributorOrgId,
        }),
      });
      setSuccess(`Sold ${res.soldQty} of ${res.batchNumber} to ${res.buyer.name}`);
      setSelling(null);
      setQty('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sale failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Warehouse & Sell"
        subtitle="Manufacturer stock → sell to distributors"
        actions={
          <Link to="/manufacturer/add-medicine" className="inline-flex items-center rounded-xl bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900">
            Add medicine
          </Link>
        }
      />
      {error && <AlertBanner tone="danger" title="Error">{error}</AlertBanner>}
      {success && <AlertBanner tone="success" title="Sold">{success}</AlertBanner>}

      {selling && (
        <Card className="max-w-lg">
          <CardHeader title={`Sell ${selling.batchNumber}`} subtitle={`${selling.productName} · available ${selling.qty}`} />
          <form className="space-y-3 px-5 py-5" onSubmit={sell}>
            <Select label="Distributor" value={distributorOrgId} onChange={(e) => setDistributorOrgId(e.target.value)} required>
              {distributors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
            <Input label="Quantity" type="number" min={1} max={selling.qty} value={qty} onChange={(e) => setQty(e.target.value)} required />
            <div className="flex gap-2">
              <Button type="submit" loading={loading}>Confirm sale</Button>
              <Button type="button" variant="secondary" onClick={() => setSelling(null)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader title="Warehouse inventory" subtitle="Stock available to sell downstream" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {inventory.map((i) => (
                <tr key={i.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 font-medium text-brand-800">{i.batchNumber}</td>
                  <td className="px-4 py-3">{i.productName} {i.strength}</td>
                  <td className="px-4 py-3">{i.qty}</td>
                  <td className="px-4 py-3">{i.expiryDate}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone(i.status)}>{i.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {!i.notForSale && i.qty > 0 && (
                      <Button size="sm" onClick={() => { setSelling(i); setQty(''); setSuccess(''); }}>
                        Sell to distributor
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {inventory.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No warehouse stock. Add a medicine first.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
