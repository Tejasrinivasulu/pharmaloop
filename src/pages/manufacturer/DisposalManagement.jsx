import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, EmptyState, Input, LoadingScreen, PageHeader, Select, Textarea, Timeline, statusTone, } from '../../components/ui';
import { prettyStatus } from './format';
import { DISPOSAL_WORKFLOW, verificationGateLabel, workflowStepIndex, } from './types';
export default function DisposalManagement() {
    const [returns, setReturns] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [busy, setBusy] = useState(false);
    const [completeForm, setCompleteForm] = useState({
        disposedQty: '',
        method: 'Incineration',
        facility: 'EcoSafe Waste Management',
        note: '',
    });
    const [evidenceForm, setEvidenceForm] = useState({
        method: 'Incineration',
        facility: 'EcoSafe Waste Management',
        documents: 'disposal-manifest.pdf',
        photoUrls: 'photo-1.jpg,photo-2.jpg',
        notes: '',
    });
    const load = useCallback(() => {
        setLoading(true);
        api('/api/manufacturer/returns')
            .then((r) => {
            const list = r.returns || [];
            setReturns(list);
            setSelectedId((prev) => prev || list.find((x) => !x.closed)?.id || list[0]?.id || '');
        })
            .catch((e) => setError(e.message || 'Failed to load'))
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => {
        load();
    }, [load]);
    const selected = useMemo(() => returns.find((r) => r.id === selectedId) || null, [returns, selectedId]);
    const pipeline = useMemo(() => returns.filter((r) => [
        'QUARANTINED',
        'DISPOSAL_REQUESTED',
        'DISPOSAL_COMPLETED',
        'EVIDENCE_SUBMITTED',
        'QUANTITY_RECONCILED',
        'DESTRUCTION_VERIFIED',
    ].includes(r.status)), [returns]);
    useEffect(() => {
        if (!selected)
            return;
        setCompleteForm((f) => ({
            ...f,
            disposedQty: String(selected.quantities.received || selected.expectedQty || ''),
        }));
        if (selected.evidence) {
            setEvidenceForm((f) => ({
                ...f,
                method: selected.evidence.method || f.method,
                facility: selected.evidence.facility || f.facility,
                notes: selected.evidence.notes || '',
            }));
        }
    }, [selected]);
    async function run(path, body, ok) {
        setBusy(true);
        setError('');
        setMsg('');
        try {
            const res = await api(path, {
                method: 'POST',
                body: JSON.stringify(body),
            });
            setMsg(res.notice || ok);
            load();
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : 'Action failed');
        }
        finally {
            setBusy(false);
        }
    }
    if (loading)
        return <LoadingScreen label="Loading disposal workflow…"/>;
    const stepIdx = selected ? workflowStepIndex(selected) : -1;
    const gate = selected ? verificationGateLabel(selected) : null;
    return (<div>
      <PageHeader title="Disposal Management" subtitle="Licensed destruction with mandatory evidence — never a one-click close"/>

      <div className="mb-4">
        <AlertBanner tone="info" title="Compliance chain required">
          Disposal Completed → Evidence Submitted → Quantity Reconciled → Certificate Linked → Verification →
          DESTRUCTION VERIFIED → CLOSED. There is no “Mark Destroyed → Closed” shortcut.
        </AlertBanner>
      </div>

      {error && (<div className="mb-4">
          <AlertBanner tone="danger" title="Blocked">
            {error}
          </AlertBanner>
        </div>)}
      {msg && (<div className="mb-4">
          <AlertBanner tone="success" title="Progress saved">
            {msg}
          </AlertBanner>
        </div>)}

      <div className="mb-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Pipeline" subtitle={`${pipeline.length} in disposal path`}/>
          <div className="max-h-[28rem] overflow-y-auto divide-y divide-slate-100">
            {pipeline.length === 0 ? (<EmptyState title="No disposal candidates" text="Quarantine returns first."/>) : (pipeline.map((r) => (<button key={r.id} type="button" onClick={() => setSelectedId(r.id)} className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${selectedId === r.id ? 'bg-brand-50/60' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-800">{r.returnCode}</p>
                    <Badge tone={statusTone(r.status)}>{prettyStatus(r.status)}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {r.productName} · {r.batchNumber}
                  </p>
                </button>)))}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          {!selected ? (<EmptyState title="Select a return"/>) : (<>
              <CardHeader title={selected.returnCode} subtitle={`${selected.productName} ${selected.strength}`} action={gate && (<Badge tone={gate.tone === 'danger'
                    ? 'danger'
                    : gate.tone === 'warning'
                        ? 'warning'
                        : gate.tone === 'success'
                            ? 'success'
                            : 'info'}>
                      {gate.label}
                    </Badge>)}/>
              <div className="grid gap-6 p-5 lg:grid-cols-2">
                <div>
                  <p className="mb-3 font-display text-sm font-semibold text-slate-800">Workflow stepper</p>
                  <Timeline steps={DISPOSAL_WORKFLOW.map((label, i) => ({
                label,
                done: stepIdx > i || (stepIdx === i && selected.closed && i === 6),
                current: stepIdx === i && !selected.closed,
                note: i === 3 && selected.certificate
                    ? selected.certificate.certificateNo
                    : i === 1 && !selected.evidence && selected.disposalCompleted
                        ? 'Evidence still required'
                        : undefined,
            }))}/>
                  <p className="mt-4 text-xs text-slate-500">
                    Batch{' '}
                    <Link className="font-semibold text-brand-800 hover:underline" to={`/manufacturer/batch/${encodeURIComponent(selected.batchNumber)}`}>
                      {selected.batchNumber}
                    </Link>
                  </p>
                </div>

                <div className="space-y-4">
                  {selected.status === 'QUARANTINED' && (<ActionBlock title="1. Request disposal">
                      <Button loading={busy} onClick={() => run('/api/manufacturer/disposal/request', { returnId: selected.id }, 'Disposal requested')}>
                        Raise disposal order
                      </Button>
                    </ActionBlock>)}

                  {selected.status === 'DISPOSAL_REQUESTED' && (<ActionBlock title="2. Complete disposal (vendor)">
                      <Input label="Disposed qty" type="number" min={0} value={completeForm.disposedQty} onChange={(e) => setCompleteForm((f) => ({ ...f, disposedQty: e.target.value }))}/>
                      <Select label="Method" value={completeForm.method} onChange={(e) => setCompleteForm((f) => ({ ...f, method: e.target.value }))}>
                        <option>Incineration</option>
                        <option>Autoclave + shred</option>
                        <option>Chemical neutralization</option>
                      </Select>
                      <Input label="Facility" value={completeForm.facility} onChange={(e) => setCompleteForm((f) => ({ ...f, facility: e.target.value }))}/>
                      <Textarea label="Note" rows={2} value={completeForm.note} onChange={(e) => setCompleteForm((f) => ({ ...f, note: e.target.value }))}/>
                      <Button loading={busy} onClick={() => run('/api/manufacturer/disposal/complete', {
                    returnId: selected.id,
                    disposedQty: Number(completeForm.disposedQty),
                    method: completeForm.method,
                    facility: completeForm.facility,
                    note: completeForm.note || undefined,
                }, 'Disposal completed — evidence still required before close')}>
                        Mark disposal completed
                      </Button>
                      <p className="text-xs text-orange-700">
                        Completing disposal does <strong>not</strong> close the return.
                      </p>
                    </ActionBlock>)}

                  {selected.status === 'DISPOSAL_COMPLETED' && (<ActionBlock title="3. Submit evidence pack">
                      <div className="mb-2">
                        <AlertBanner tone="warning" title="Disposal Claimed — Verification Pending">
                          Evidence, quantity reconciliation, and verification are still required.
                        </AlertBanner>
                      </div>
                      <Select label="Method" value={evidenceForm.method} onChange={(e) => setEvidenceForm((f) => ({ ...f, method: e.target.value }))}>
                        <option>Incineration</option>
                        <option>Autoclave + shred</option>
                        <option>Chemical neutralization</option>
                      </Select>
                      <Input label="Facility" value={evidenceForm.facility} onChange={(e) => setEvidenceForm((f) => ({ ...f, facility: e.target.value }))}/>
                      <Input label="Document refs (comma-separated)" value={evidenceForm.documents} onChange={(e) => setEvidenceForm((f) => ({ ...f, documents: e.target.value }))}/>
                      <Input label="Photo URLs / refs" value={evidenceForm.photoUrls} onChange={(e) => setEvidenceForm((f) => ({ ...f, photoUrls: e.target.value }))}/>
                      <Textarea label="Notes" rows={2} value={evidenceForm.notes} onChange={(e) => setEvidenceForm((f) => ({ ...f, notes: e.target.value }))}/>
                      <Button loading={busy} onClick={() => run('/api/manufacturer/disposal/evidence', {
                    returnId: selected.id,
                    method: evidenceForm.method,
                    facility: evidenceForm.facility,
                    documents: evidenceForm.documents
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    photoUrls: evidenceForm.photoUrls
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    notes: evidenceForm.notes || undefined,
                }, 'Evidence submitted — certificate issued')}>
                        Submit evidence
                      </Button>
                    </ActionBlock>)}

                  {selected.status === 'EVIDENCE_SUBMITTED' && (<ActionBlock title="4. Quantity reconcile">
                      <p className="text-sm text-slate-600">
                        Received {selected.quantities.received} · Disposed {selected.quantities.disposed}
                      </p>
                      <Button loading={busy} onClick={() => run('/api/manufacturer/disposal/reconcile', {
                    returnId: selected.id,
                    reconciledQty: selected.quantities.disposed || selected.quantities.received,
                }, 'Quantity reconciled')}>
                        Reconcile disposed qty
                      </Button>
                      <Link to="/manufacturer/reconciliation" className="text-sm font-semibold text-brand-800 hover:underline">
                        Open reconciliation desk →
                      </Link>
                    </ActionBlock>)}

                  {selected.status === 'QUANTITY_RECONCILED' && (<ActionBlock title="5. Verification gate">
                      <p className="text-sm text-slate-600">
                        Continue on Disposal Verification — close is only allowed after DESTRUCTION VERIFIED.
                      </p>
                      <Link to="/manufacturer/disposal-verification">
                        <Button>Open verification gate</Button>
                      </Link>
                    </ActionBlock>)}

                  {(selected.status === 'DESTRUCTION_VERIFIED' || selected.closed) && (<ActionBlock title="Compliance complete">
                      <Badge tone="success">
                        {selected.closed ? 'CLOSED' : 'DESTRUCTION VERIFIED'}
                      </Badge>
                      <Link to="/manufacturer/disposal-verification" className="text-sm font-semibold text-brand-800 hover:underline">
                        View verification record →
                      </Link>
                    </ActionBlock>)}
                </div>
              </div>
            </>)}
        </Card>
      </div>
    </div>);
}
function ActionBlock({ title, children }) {
    return (<div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="font-display text-sm font-semibold text-slate-900">{title}</p>
      {children}
    </div>);
}
