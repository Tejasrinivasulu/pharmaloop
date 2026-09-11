import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, DataTable, EmptyState, Input, LoadingScreen, PageHeader, Textarea, statusTone, } from '../../components/ui';
import { prettyStatus } from './format';
export default function Reconciliation() {
    const [returns, setReturns] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [busyId, setBusyId] = useState(null);
    const [qtyDraft, setQtyDraft] = useState({});
    const [invForm, setInvForm] = useState({ returnId: '', title: '', findings: '' });
    const [savingNote, setSavingNote] = useState(false);
    const load = useCallback(() => {
        setLoading(true);
        Promise.all([
            api('/api/manufacturer/returns'),
            api('/api/manufacturer/investigations'),
        ])
            .then(([r, inv]) => {
            setReturns(r.returns || []);
            setNotes(inv.investigations || []);
            const drafts = {};
            for (const item of r.returns || []) {
                drafts[item.id] = String(item.quantities.disposed || item.quantities.received || '');
            }
            setQtyDraft(drafts);
        })
            .catch((e) => setError(e.message || 'Failed to load'))
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => {
        load();
    }, [load]);
    const candidates = useMemo(() => returns.filter((r) => ['EVIDENCE_SUBMITTED', 'QUANTITY_RECONCILED', 'DESTRUCTION_VERIFIED', 'CLOSED'].includes(r.status) || r.discrepancy), [returns]);
    const discrepancyRows = useMemo(() => returns.filter((r) => r.discrepancy && !r.closed), [returns]);
    async function reconcile(ret) {
        setBusyId(ret.id);
        setError('');
        setMsg('');
        try {
            await api('/api/manufacturer/disposal/reconcile', {
                method: 'POST',
                body: JSON.stringify({
                    returnId: ret.id,
                    reconciledQty: Number(qtyDraft[ret.id]),
                }),
            });
            setMsg(`Reconciled ${ret.returnCode}`);
            load();
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : 'Reconcile failed');
        }
        finally {
            setBusyId(null);
        }
    }
    async function createInvestigationNote() {
        const ret = returns.find((r) => r.id === invForm.returnId);
        if (!ret || !invForm.title.trim()) {
            setError('Select a return and enter an investigation title');
            return;
        }
        setSavingNote(true);
        setError('');
        setMsg('');
        try {
            const res = await api('/api/manufacturer/investigations', {
                method: 'POST',
                body: JSON.stringify({
                    title: invForm.title.trim(),
                    returnId: ret.id,
                    batchNumber: ret.batchNumber,
                    findings: invForm.findings.trim(),
                    priority: 'HIGH',
                }),
            });
            setMsg(`Investigation ${res.investigation.caseNo} opened on server`);
            setInvForm({ returnId: '', title: '', findings: '' });
            load();
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : 'Failed to create investigation');
        }
        finally {
            setSavingNote(false);
        }
    }
    if (loading)
        return <LoadingScreen label="Loading reconciliation…"/>;
    return (<div>
      <PageHeader title="Quantity Reconciliation" subtitle="Match disposed vs received quantities — mismatches block closure"/>

      {error && (<div className="mb-4">
          <AlertBanner tone="danger" title="Error">
            {error}
          </AlertBanner>
        </div>)}
      {msg && (<div className="mb-4">
          <AlertBanner tone="success" title="Saved">
            {msg}
          </AlertBanner>
        </div>)}

      {discrepancyRows.length > 0 && (<div className="mb-4">
          <AlertBanner tone="danger" title="Discrepancy — Cannot Close">
            {discrepancyRows.length} return(s) have quantity mismatches. Open an investigation before
            escalating. Simple destruction claims will not close these records.
          </AlertBanner>
        </div>)}

      <div className="mb-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Reconcile disposed quantity" subtitle="Evidence must be submitted first"/>
          {candidates.filter((r) => r.status === 'EVIDENCE_SUBMITTED').length === 0 ? (<EmptyState title="Nothing to reconcile" text="Submit disposal evidence first."/>) : (<DataTable headers={['Return', 'Received', 'Disposed', 'Reconcile qty', 'Action']}>
              {candidates
                .filter((r) => r.status === 'EVIDENCE_SUBMITTED')
                .map((r) => (<tr key={r.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.returnCode}</p>
                      <Link to={`/manufacturer/batch/${encodeURIComponent(r.batchNumber)}`} className="text-xs text-brand-800 hover:underline">
                        {r.batchNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{r.quantities.received}</td>
                    <td className="px-4 py-3">{r.quantities.disposed}</td>
                    <td className="px-4 py-3">
                      <Input type="number" min={0} value={qtyDraft[r.id] ?? ''} onChange={(e) => setQtyDraft((d) => ({ ...d, [r.id]: e.target.value }))}/>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" loading={busyId === r.id} onClick={() => reconcile(r)}>
                        Reconcile
                      </Button>
                    </td>
                  </tr>))}
            </DataTable>)}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Open investigation" subtitle="Saved to PharmaLoop case register"/>
          <div className="space-y-3 p-5">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Return</span>
              <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-600/20" value={invForm.returnId} onChange={(e) => setInvForm((f) => ({ ...f, returnId: e.target.value }))}>
                <option value="">Select return…</option>
                {(discrepancyRows.length ? discrepancyRows : returns).map((r) => (<option key={r.id} value={r.id}>
                    {r.returnCode} · {r.batchNumber}
                    {r.discrepancy ? ' (discrepancy)' : ''}
                  </option>))}
              </select>
            </label>
            <Input label="Title" value={invForm.title} onChange={(e) => setInvForm((f) => ({ ...f, title: e.target.value }))} placeholder="Short-receipt on handoff"/>
            <Textarea label="Findings" rows={4} value={invForm.findings} onChange={(e) => setInvForm((f) => ({ ...f, findings: e.target.value }))} placeholder="Seal integrity, courier logs, expected vs received…"/>
            <Button className="w-full" loading={savingNote} onClick={createInvestigationNote}>
              Open investigation
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader title="Investigations" subtitle={`${notes.length} cases`}/>
        {notes.length === 0 ? (<EmptyState title="No investigations yet"/>) : (<div className="divide-y divide-slate-100">
            {notes.map((n) => (<div key={n.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display font-semibold text-slate-900">{n.caseNo}</p>
                  <Badge tone={statusTone(n.status)}>{n.status}</Badge>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-800">{n.title}</p>
                <p className="mt-1 text-sm text-slate-600">{n.findings || '—'}</p>
                <p className="mt-2 text-xs text-slate-500">{n.batchNumber || '—'}</p>
              </div>))}
          </div>)}
      </Card>

      <Card>
        <CardHeader title="Quantity ledger" subtitle="All manufacturer returns"/>
        <DataTable headers={['Return', 'Status', 'Requested', 'Received', 'Disposed', 'Reconciled', 'Flag']}>
          {returns.map((r) => (<tr key={r.id} className="hover:bg-slate-50/80">
              <td className="px-4 py-3 font-medium">{r.returnCode}</td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(r.status)}>{prettyStatus(r.status)}</Badge>
              </td>
              <td className="px-4 py-3">{r.quantities.requested}</td>
              <td className="px-4 py-3">{r.quantities.received || '—'}</td>
              <td className="px-4 py-3">{r.quantities.disposed || '—'}</td>
              <td className="px-4 py-3">{r.quantities.reconciled || '—'}</td>
              <td className="px-4 py-3">
                {r.discrepancy ? (<Badge tone="danger">Discrepancy — Cannot Close</Badge>) : (<span className="text-slate-400">—</span>)}
              </td>
            </tr>))}
        </DataTable>
      </Card>
    </div>);
}
