import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, Input, LoadingScreen, PageHeader, Select, Textarea, statusTone, } from '../../components/ui';
import { formatDiff } from './types';
export default function Verify() {
    const [params] = useSearchParams();
    const [returns, setReturns] = useState([]);
    const [returnId, setReturnId] = useState(params.get('returnId') || '');
    const [verifiedQty, setVerifiedQty] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const load = () => api('/api/distributor/returns')
        .then((r) => {
        const all = r.returns || [];
        setReturns(all);
        const pending = all.filter((x) => x.status === 'RETURN_REQUESTED');
        const initial = params.get('returnId') || pending[0]?.id || '';
        setReturnId((prev) => prev || initial);
        const selected = all.find((x) => x.id === (params.get('returnId') || pending[0]?.id));
        if (selected)
            setVerifiedQty(String(selected.quantities.requested));
    })
        .finally(() => setLoading(false));
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const pending = useMemo(() => returns.filter((r) => r.status === 'RETURN_REQUESTED'), [returns]);
    const selected = returns.find((r) => r.id === returnId);
    useEffect(() => {
        if (selected)
            setVerifiedQty(String(selected.quantities.requested));
    }, [selected?.id]);
    const expected = selected?.quantities.requested ?? 0;
    const received = Number(verifiedQty) || 0;
    const difference = received - expected;
    const mismatch = selected != null && verifiedQty !== '' && difference !== 0;
    const submit = async (asDiscrepancy) => {
        if (!returnId || verifiedQty === '') {
            setMessage({ tone: 'danger', text: 'Select a return and enter verified quantity.' });
            return;
        }
        setSubmitting(true);
        setMessage(null);
        try {
            const qty = Number(verifiedQty);
            const body = {
                returnId,
                verifiedQty: qty,
            };
            if (asDiscrepancy || mismatch) {
                body.note =
                    note ||
                        `Discrepancy noted: expected ${expected}, received ${qty} (${formatDiff(difference)})`;
            }
            else if (note) {
                body.note = note;
            }
            await api('/api/distributor/verify', {
                method: 'POST',
                body: JSON.stringify(body),
            });
            setMessage({
                tone: mismatch || asDiscrepancy ? 'warning' : 'success',
                text: mismatch || asDiscrepancy
                    ? `Verified with discrepancy note. Expected ${expected}, received ${qty}.`
                    : `Accepted — verified ${qty} units.`,
            });
            setNote('');
            await load();
            setReturnId('');
        }
        catch (e) {
            setMessage({
                tone: 'danger',
                text: e instanceof ApiError ? e.message : 'Verification failed',
            });
        }
        finally {
            setSubmitting(false);
        }
    };
    if (loading)
        return <LoadingScreen label="Loading returns to verify…"/>;
    return (<div>
      <PageHeader title="Scan & Verify" subtitle="Confirm quantities at pharmacy pickup before staging for consolidation"/>

      {message && (<div className="mb-4">
          <AlertBanner tone={message.tone} title={message.text}/>
        </div>)}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Select return" subtitle="RETURN_REQUESTED only"/>
          <div className="space-y-4 p-5">
            <Select label="Return request" value={returnId} onChange={(e) => setReturnId(e.target.value)}>
              <option value="">Select a return…</option>
              {pending.map((r) => (<option key={r.id} value={r.id}>
                  {r.returnCode} — {r.pharmacyName} ({r.batchNumber})
                </option>))}
            </Select>

            {pending.length === 0 && (<p className="text-sm text-slate-500">No returns awaiting verification.</p>)}

            <Input label="Verified quantity (received)" type="number" min={0} value={verifiedQty} onChange={(e) => setVerifiedQty(e.target.value)} disabled={!selected}/>

            <Textarea label="Verification note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for timeline / discrepancy" disabled={!selected}/>
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Quantity reconciliation" subtitle="Expected vs received at distributor"/>
          <div className="space-y-4 p-5">
            {!selected ? (<p className="text-sm text-slate-500">Select a RETURN_REQUESTED return to begin.</p>) : (<>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(selected.status)}>
                    {selected.status.replaceAll('_', ' ')}
                  </Badge>
                  <span className="text-sm text-slate-600">
                    {selected.returnCode} · {selected.pharmacyName}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Expected</p>
                    <p className="mt-1 font-display text-2xl font-bold text-slate-900">{expected}</p>
                    <p className="text-xs text-slate-400">Requested by pharmacy</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Received</p>
                    <p className="mt-1 font-display text-2xl font-bold text-brand-900">{received}</p>
                    <p className="text-xs text-slate-400">Verified at scan</p>
                  </div>
                  <div className={`rounded-xl border p-4 ${mismatch ? 'border-orange-200 bg-orange-50' : 'border-slate-200 bg-slate-50'}`}>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Difference</p>
                    <p className={`mt-1 font-display text-2xl font-bold ${mismatch ? 'text-orange-700' : 'text-verify-700'}`}>
                      {formatDiff(difference)}
                    </p>
                    <p className="text-xs text-slate-400">Received − expected</p>
                  </div>
                </div>

                {mismatch && (<AlertBanner tone="danger" title="DISCREPANCY">
                    Expected {expected} units but verified quantity is {received} (
                    {formatDiff(difference)}). Accept to record with a discrepancy note, or adjust the
                    count.
                  </AlertBanner>)}

                <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-600">
                  <p>
                    <span className="font-medium text-slate-800">Batch:</span> {selected.batchNumber} —{' '}
                    {selected.productName} {selected.strength}
                  </p>
                  <p className="mt-1">
                    <span className="font-medium text-slate-800">Reason:</span> {selected.reason}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button loading={submitting} disabled={!selected} onClick={() => submit(false)} variant={mismatch ? 'secondary' : 'primary'}>
                    Accept
                  </Button>
                  <Button loading={submitting} disabled={!selected} variant="danger" onClick={() => submit(true)}>
                    Note discrepancy
                  </Button>
                </div>
              </>)}
          </div>
        </Card>
      </div>
    </div>);
}
