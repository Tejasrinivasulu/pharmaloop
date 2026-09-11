import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Button, Card, CardHeader, Input, PageHeader, Select } from '../../components/ui';

export default function AddMedicine() {
  const [batchNumber, setBatchNumber] = useState('');
  const [productName, setProductName] = useState('');
  const [strength, setStrength] = useState('');
  const [form, setForm] = useState('Tablet');
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [qty, setQty] = useState('');
  const [location, setLocation] = useState('Warehouse A');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCreated('');
    const n = Number(qty);
    if (!batchNumber.trim() || !productName.trim() || !strength.trim() || !manufacturingDate || !expiryDate || !Number.isFinite(n) || n <= 0) {
      setError('Fill all required fields with a positive quantity.');
      return;
    }
    setLoading(true);
    try {
      const res = await api('/api/manufacturer/batches', {
        method: 'POST',
        body: JSON.stringify({
          batchNumber: batchNumber.trim(),
          productName: productName.trim(),
          strength: strength.trim(),
          form,
          manufacturingDate,
          expiryDate,
          qty: n,
          location: location.trim() || 'Warehouse A',
        }),
      });
      setCreated(res.batch.batchNumber);
      setBatchNumber('');
      setProductName('');
      setStrength('');
      setQty('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create medicine batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Add Medicine" subtitle="Create a batch number and stock it in your warehouse for sale to distributors" />
      <Card className="max-w-xl">
        <CardHeader title="New batch" subtitle="Batch number must be unique across the platform" />
        <form className="space-y-4 px-5 py-5" onSubmit={onSubmit}>
          {error && <AlertBanner tone="danger" title="Unable to create">{error}</AlertBanner>}
          {created && (
            <AlertBanner tone="success" title="Batch created">
              {created} is in warehouse.{' '}
              <Link to="/manufacturer/stock" className="font-semibold underline">View stock / sell</Link>
            </AlertBanner>
          )}
          <Input label="Batch number" placeholder="e.g. IBU-2026-C03" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} required />
          <Input label="Product name" placeholder="e.g. Ibuprofen" value={productName} onChange={(e) => setProductName(e.target.value)} required />
          <Input label="Strength" placeholder="e.g. 400mg" value={strength} onChange={(e) => setStrength(e.target.value)} required />
          <Select label="Form" value={form} onChange={(e) => setForm(e.target.value)}>
            <option>Tablet</option>
            <option>Capsule</option>
            <option>Syrup</option>
            <option>Injection</option>
            <option>Cream</option>
            <option>Other</option>
          </Select>
          <Input label="Manufacturing date" type="date" value={manufacturingDate} onChange={(e) => setManufacturingDate(e.target.value)} required />
          <Input label="Expiry date" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
          <Input label="Quantity (units)" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} required />
          <Input label="Warehouse location" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Button type="submit" loading={loading} className="w-full">Create batch & store</Button>
        </form>
      </Card>
    </div>
  );
}
