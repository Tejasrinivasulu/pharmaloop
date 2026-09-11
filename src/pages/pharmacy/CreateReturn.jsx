import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Button, Card, CardHeader, Input, PageHeader, Select, Textarea, } from '../../components/ui';
export default function CreateReturn() {
    const [params] = useSearchParams();
    const [batchNumber, setBatchNumber] = useState(params.get('batch') || '');
    const [qty, setQty] = useState(params.get('qty') || '');
    const [reason, setReason] = useState('Near expiry / expired stock');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successCode, setSuccessCode] = useState('');
    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessCode('');
        const n = Number(qty);
        if (!batchNumber.trim() || !reason.trim() || !Number.isFinite(n) || n <= 0) {
            setError('Batch number, quantity (>0), and reason are required.');
            return;
        }
        setLoading(true);
        try {
            const res = await api('/api/pharmacy/returns', {
                method: 'POST',
                body: JSON.stringify({
                    batchNumber: batchNumber.trim(),
                    qty: n,
                    reason: notes.trim() ? `${reason.trim()} — ${notes.trim()}` : reason.trim(),
                }),
            });
            setSuccessCode(res.return.returnCode);
            setBatchNumber('');
            setQty('');
            setNotes('');
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to create return');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div>
      <PageHeader title="Return Request" subtitle="Submit expired or near-expiry stock into reverse logistics"/>

      <Card className="max-w-xl">
        <CardHeader title="New return" subtitle="Creates a RETURN_REQUESTED record for distributor verification"/>
        <form className="space-y-4 px-5 py-5" onSubmit={onSubmit}>
          {error && (<AlertBanner tone="danger" title="Unable to create return">
              {error}
            </AlertBanner>)}
          {successCode && (<AlertBanner tone="success" title="Return created">
              {successCode} is awaiting distributor verification.{' '}
              <Link to="/pharmacy/returns" className="font-semibold underline">
                View returns
              </Link>
            </AlertBanner>)}
          <Input label="Batch number" placeholder="e.g. IBU-2025-088" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} required/>
          <Input label="Quantity" type="number" min={1} placeholder="Units to return" value={qty} onChange={(e) => setQty(e.target.value)} required/>
          <Select label="Reason template" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>Near expiry / expired stock</option>
            <option>Damaged packaging</option>
            <option>Recall / quality hold</option>
            <option>Customer return — unused</option>
          </Select>
          <Textarea label="Additional notes (optional)" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Shelf location, partial carton details…"/>
          <Button type="submit" loading={loading} className="w-full">
            Submit return request
          </Button>
        </form>
      </Card>
    </div>);
}
