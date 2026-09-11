import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, Input, PageHeader, Select, statusTone } from '../../components/ui';

export default function DistributorStock() {
  const [inventory, setInventory] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selling, setSelling] = useState(null);
  const [qty, setQty] = useState('');
  const [pharmacyOrgId, setPharmacyOrgId] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setError('');
    try {
      const [inv, ph] = await Promise.all([
        api('/api/distributor/inventory'),
        api('/api/distributor/pharmacies'),
      ]);
      setInventory(inv.inventory || []);
      setPharmacies(ph.pharmacies || []);
      if (!pharmacyOrgId && ph.pharmacies?.[0]) setPharmacyOrgId(ph.pharmacies[0].id);
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
      const res = await api('/api/distributor/sell', {
        method: 'POST',
        body: JSON.stringify({
          batchNumber: selling.batchNumber,
          qty: Number(qty),
          pharmacyOrgId,
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
      <PageHeader title="Stock & Sell" subtitle="Distributor warehouse → sell to pharmacies" />
      {error && <AlertBanner tone="danger" title="Error">{error}</AlertBanner>}
      {success && <AlertBanner tone="success" title="Sold">{success}</AlertBanner>}

      {selling && (
        <Card className="max-w-lg">
          <CardHeader title={`Sell ${selling.batchNumber}`} subtitle={`${selling.productName} · available ${selling.qty}`} />
          <form className="space-y-3 px-5 py-5" onSubmit={sell}>
            <Select label="Pharmacy" value={pharmacyOrgId} onChange={(e) => setPharmacyOrgId(e.target.value)} required>
              {pharmacies.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
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
        <CardHeader title="Distributor inventory" subtitle="Received from manufacturers — sell downstream" />
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
                        Sell to pharmacy
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {inventory.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No stock yet. Wait for manufacturer sales.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
