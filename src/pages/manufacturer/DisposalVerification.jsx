import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, EmptyState, LoadingScreen, PageHeader, Textarea, Timeline, statusTone, } from '../../components/ui';
import { prettyStatus } from './format';
import { DISPOSAL_WORKFLOW, verificationGateLabel, workflowStepIndex, } from './types';
/**
 * CRITICAL PRODUCT RULE:
 * Never offer a simple "Mark Destroyed → Closed" control.
 * Close is only enabled after DESTRUCTION VERIFIED (full chain).
 */
export default function DisposalVerification() {
    const [returns, setReturns] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [blockers, setBlockers] = useState([]);
    const [msg, setMsg] = useState('');
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState('');
    const load = useCallback(() => {
        setLoading(true);
        api('/api/manufacturer/returns')
            .then((r) => {
            const list = r.returns || [];
            setReturns(list);
            setSelectedId((prev) => {
                if (prev && list.some((x) => x.id === prev))
                    return prev;
                const prefer = list.find((x) => x.status === 'QUANTITY_RECONCILED') ||
                    list.find((x) => x.status === 'DESTRUCTION_VERIFIED') ||
                    list.find((x) => x.disposalCompleted && !x.closed) ||
                    list[0];
                return prefer?.id || '';
            });
        })
            .catch((e) => setError(e.message || 'Failed to load'))
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => {
        load();
    }, [load]);
    const queue = useMemo(() => returns.filter((r) => r.disposalCompleted ||
        [
            'DISPOSAL_COMPLETED',
            'EVIDENCE_SUBMITTED',
            'QUANTITY_RECONCILED',
            'DESTRUCTION_VERIFIED',
            'CLOSED',
        ].includes(r.status)), [returns]);
    const selected = useMemo(() => returns.find((r) => r.id === selectedId) || null, [returns, selectedId]);
    async function verify() {
        if (!selected)
            return;
        setBusy(true);
        setError('');
        setBlockers([]);
        setMsg('');
        try {
            const res = await api('/api/manufacturer/verify-disposal', {
                method: 'POST',
                body: JSON.stringify({ returnId: selected.id, note: note || undefined }),
            });
            setMsg(res.nextStep || 'Destruction verified');
            setNote('');
            load();
        }
        catch (e) {
            if (e instanceof ApiError) {
                setError(e.message);
                const data = e.data;
                setBlockers(data?.blockers || []);
            }
            else {
                setError('Verification failed');
            }
        }
        finally {
            setBusy(false);
        }
    }
    async function closeReturn() {
        if (!selected)
            return;
        setBusy(true);
        setError('');
        setBlockers([]);
        setMsg('');
        try {
            await api('/api/manufacturer/disposal/close', {
                method: 'POST',
                body: JSON.stringify({ returnId: selected.id }),
            });
            setMsg('Return closed after full compliance chain');
            load();
        }
        catch (e) {
            if (e instanceof ApiError) {
                setError(e.message);
                const data = e.data;
                setBlockers(data?.blockers || []);
                if (data?.hint)
                    setMsg(data.hint);
            }
            else {
                setError('Close failed');
            }
        }
        finally {
            setBusy(false);
        }
    }
    if (loading)
        return <LoadingScreen label="Loading verification gate…"/>;
    const gate = selected ? verificationGateLabel(selected) : null;
    const stepIdx = selected ? workflowStepIndex(selected) : -1;
    const canVerify = selected &&
        selected.status === 'QUANTITY_RECONCILED' &&
        selected.disposalCompleted &&
        !!selected.evidence &&
        selected.quantityReconciled &&
        !selected.discrepancy &&
        !selected.closed;
    const canClose = selected &&
        selected.status === 'DESTRUCTION_VERIFIED' &&
        selected.destructionVerified &&
        !selected.discrepancy &&
        !selected.closed &&
        (selected.compliance?.canClose ?? false);
    return (<div>
      <PageHeader title="Disposal Verification" subtitle="Gatekeeping close — evidence + reconcile + verification required"/>

      <div className="mb-4">
        <AlertBanner tone="info" title="Required workflow">
          Disposal Completed → Evidence Submitted → Quantity Reconciled → Certificate Linked → Verification →{' '}
          <strong>DESTRUCTION VERIFIED</strong> → CLOSED
        </AlertBanner>
      </div>

      {error && (<div className="mb-4">
          <AlertBanner tone="danger" title={error}>
            {blockers.length > 0 && (<ul className="mt-1 list-disc pl-4">
                {blockers.map((b) => (<li key={b}>{b}</li>))}
              </ul>)}
          </AlertBanner>
        </div>)}
      {msg && !error && (<div className="mb-4">
          <AlertBanner tone="success" title="Status">
            {msg}
          </AlertBanner>
        </div>)}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Verification queue" subtitle={`${queue.length} disposal claims`}/>
          <div className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
            {queue.length === 0 ? (<EmptyState title="No claims to verify"/>) : (queue.map((r) => {
            const g = verificationGateLabel(r);
            return (<button key={r.id} type="button" onClick={() => {
                    setSelectedId(r.id);
                    setError('');
                    setBlockers([]);
                    setMsg('');
                }} className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${selectedId === r.id ? 'bg-brand-50/60' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-800">{r.returnCode}</p>
                      <Badge tone={statusTone(r.status)}>{prettyStatus(r.status)}</Badge>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-600">{g.label}</p>
                    <p className="text-xs text-slate-500">
                      {r.batchNumber} · disposed {r.quantities.disposed || 0}
                    </p>
                  </button>);
        }))}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          {!selected ? (<EmptyState title="Select a return to verify"/>) : (<>
              <CardHeader title={selected.returnCode} subtitle={`${selected.productName} ${selected.strength}`} action={gate && (<Badge tone={gate.tone === 'danger'
                    ? 'danger'
                    : gate.tone === 'warning'
                        ? 'warning'
                        : gate.tone === 'success'
                            ? 'success'
                            : 'info'}>
                      {gate.label}
                    </Badge>)}/>

              <div className="space-y-5 p-5">
                {selected.disposalCompleted && !selected.evidence && (<AlertBanner tone="warning" title="Disposal Claimed — Verification Pending">
                    Disposal was claimed without an evidence pack. Submit evidence before verification or close.
                  </AlertBanner>)}

                {selected.discrepancy && (<AlertBanner tone="danger" title="Discrepancy — Cannot Close">
                    {selected.discrepancyNote ||
                    'Quantity mismatch detected. Resolve discrepancy and investigation before closure.'}
                  </AlertBanner>)}

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="mb-3 font-display text-sm font-semibold">Compliance stepper</p>
                    <Timeline steps={DISPOSAL_WORKFLOW.map((label, i) => ({
                label,
                done: stepIdx > i || selected.closed,
                current: stepIdx === i && !selected.closed,
                note: i === 3
                    ? selected.certificate?.certificateNo ||
                        (selected.evidence ? 'Certificate pending link' : 'No certificate')
                    : undefined,
            }))}/>
                  </div>

                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <CheckRow label="Disposal completed" ok={!!selected.disposalCompleted}/>
                    <CheckRow label="Evidence submitted" ok={!!selected.evidence}/>
                    <CheckRow label="Quantity reconciled" ok={!!selected.quantityReconciled}/>
                    <CheckRow label="Certificate linked" ok={!!selected.certificate || !!selected.evidence}/>
                    <CheckRow label="Destruction verified" ok={!!selected.destructionVerified}/>
                    <CheckRow label="Closed" ok={!!selected.closed}/>

                    {selected.evidence && (<div className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-800">Method:</span> {selected.evidence.method}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Facility:</span>{' '}
                          {selected.evidence.facility}
                        </p>
                        {selected.certificate && (<p>
                            <span className="font-semibold text-slate-800">Certificate:</span>{' '}
                            {selected.certificate.certificateNo}
                          </p>)}
                      </div>)}

                    <p className="pt-2 text-xs text-slate-500">
                      Batch{' '}
                      <Link className="font-semibold text-brand-800 hover:underline" to={`/manufacturer/batch/${encodeURIComponent(selected.batchNumber)}`}>
                        {selected.batchNumber}
                      </Link>
                    </p>
                  </div>
                </div>

                {/* Intentionally NO "Mark Destroyed → Closed" button */}
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
                  <p className="font-display text-sm font-semibold text-slate-800">Allowed actions</p>
                  <p className="mt-1 text-xs text-slate-500">
                    One-click “destroyed / closed” shortcuts are disabled by product policy.
                  </p>

                  {canVerify && (<div className="mt-4 space-y-3">
                      <Textarea label="Verifier note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Confirm evidence matches reconciled quantities…"/>
                      <Button loading={busy} onClick={verify}>
                        Verify destruction
                      </Button>
                    </div>)}

                  {canClose && (<div className="mt-4">
                      <Button variant="success" loading={busy} onClick={closeReturn}>
                        Close after DESTRUCTION VERIFIED
                      </Button>
                    </div>)}

                  {!canVerify && !canClose && !selected.closed && (<p className="mt-4 text-sm text-slate-600">
                      {gate?.label === 'Disposal Claimed — Verification Pending'
                    ? 'Submit evidence from Disposal Management before verification.'
                    : gate?.label === 'Discrepancy — Cannot Close'
                        ? 'Resolve quantity discrepancy — close remains locked.'
                        : 'Advance the compliance chain before verification or close.'}
                    </p>)}

                  {selected.closed && (<div className="mt-4">
                      <Badge tone="success">CLOSED — verified disposal on record</Badge>
                    </div>)}
                </div>
              </div>
            </>)}
        </Card>
      </div>
    </div>);
}
function CheckRow({ label, ok }) {
    return (<div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-slate-700">{label}</span>
      <Badge tone={ok ? 'success' : 'warning'}>{ok ? 'Yes' : 'Missing'}</Badge>
    </div>);
}
