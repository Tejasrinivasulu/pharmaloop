import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, DataTable, EmptyState, Input, LoadingScreen, PageHeader, Select, Textarea, Timeline, statusTone, } from '../../components/ui';
import { prettyStatus } from './format';
const WORKFLOW = [
    { label: 'Alert', note: 'POSSIBLE_RE_ENTRY or discrepancy raised' },
    { label: 'Review', note: 'Regulator triages severity & custody chain' },
    { label: 'Evidence', note: 'Collect docs, scans, certificates' },
    { label: 'Audit', note: 'Append-only trail of WHO / WHAT / WHEN' },
    { label: 'Open', note: 'Formal case opened — no auto penalty' },
    { label: 'Resolution', note: 'Findings recorded; close or escalate' },
];
export default function Investigations() {
    const [params] = useSearchParams();
    const [items, setItems] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [orgs, setOrgs] = useState([]);
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [ok, setOk] = useState(null);
    const [title, setTitle] = useState('');
    const [batchNumber, setBatchNumber] = useState(params.get('batch') || '');
    const [returnId, setReturnId] = useState('');
    const [alertId, setAlertId] = useState(params.get('alertId') || '');
    const [orgId, setOrgId] = useState('');
    const [priority, setPriority] = useState('MEDIUM');
    const [findings, setFindings] = useState('');
    async function refresh() {
        const [inv, al, org, ret] = await Promise.all([
            api('/api/admin/investigations'),
            api('/api/admin/alerts'),
            api('/api/admin/organizations'),
            api('/api/admin/returns'),
        ]);
        setItems(inv.investigations || []);
        setAlerts(al.alerts || []);
        setOrgs(org.organizations || []);
        setReturns(ret.returns || []);
    }
    useEffect(() => {
        refresh()
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
            .finally(() => setLoading(false));
    }, []);
    const openReEntry = useMemo(() => alerts.filter((a) => a.type === 'POSSIBLE_RE_ENTRY' && a.status === 'OPEN'), [alerts]);
    async function onCreate(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setOk(null);
        try {
            await api('/api/admin/investigations', {
                method: 'POST',
                body: JSON.stringify({
                    title: title.trim(),
                    batchNumber: batchNumber.trim() || undefined,
                    returnId: returnId.trim() || undefined,
                    alertId: alertId.trim() || undefined,
                    orgId: orgId || undefined,
                    priority,
                    findings: findings.trim() || undefined,
                }),
            });
            setOk('Investigation opened. No automatic penalty applied.');
            setTitle('');
            setFindings('');
            setReturnId('');
            await refresh();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Create failed');
        }
        finally {
            setSaving(false);
        }
    }
    function prefillsFromAlert(a) {
        setAlertId(a.id);
        setBatchNumber(a.batchNumber || '');
        setReturnId(a.returnId || '');
        setOrgId(a.orgId || '');
        setTitle(a.title);
        setFindings(`Linked from ${a.type}. ${a.message} Treating as possible issue pending evidence — not auto-fraud.`);
        setPriority(a.severity === 'critical' ? 'CRITICAL' : 'HIGH');
    }
    async function updateCase(id, status) {
        setError(null);
        setOk(null);
        try {
            await api(`/api/admin/investigations/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            });
            setOk(`Case updated to ${status}`);
            await refresh();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed');
        }
    }
    if (loading)
        return <LoadingScreen label="Loading investigations…"/>;
    return (<div className="space-y-6">
      <PageHeader title="Investigations" subtitle="Manual case workflow from alert to resolution — penalties are never auto-imposed"/>

      <AlertBanner tone="warning" title="Possible re-entry → Investigation">
        A closed-batch scan creates a POSSIBLE_RE_ENTRY alert. Open a case, gather evidence, and resolve
        through audit. Do not treat the scan alone as proven fraud.
      </AlertBanner>

      <Card>
        <CardHeader title="Investigation workflow" subtitle="Alert → Review → Evidence → Audit → Open → Resolution"/>
        <div className="p-5">
          <Timeline steps={WORKFLOW.map((s, i) => ({
            label: s.label,
            done: i < 4,
            current: i === 4,
            note: s.note,
        }))}/>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader title="Open investigation" subtitle="Creates a case for review — never auto-penalties"/>
          <form onSubmit={onCreate} className="space-y-3 p-5">
            {error && (<AlertBanner tone="danger" title="Error">
                {error}
              </AlertBanner>)}
            {ok && (<AlertBanner tone="success" title="Case created">
                {ok}
              </AlertBanner>)}
            <Input label="Title *" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Closed-batch POS scan review"/>
            <Input label="Batch number" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="PCM-2026-001"/>
            <Select label="Linked return" value={returnId} onChange={(e) => {
            const id = e.target.value;
            setReturnId(id);
            const match = returns.find((r) => r.id === id);
            if (match && !batchNumber)
                setBatchNumber(match.batchNumber);
        }}>
              <option value="">None</option>
              {returns.map((r) => (<option key={r.id} value={r.id}>
                  {r.returnCode} · {r.batchNumber}
                </option>))}
            </Select>
            <Select label="Linked alert" value={alertId} onChange={(e) => setAlertId(e.target.value)}>
              <option value="">None</option>
              {alerts.map((a) => (<option key={a.id} value={a.id}>
                  {a.title}
                </option>))}
            </Select>
            <Select label="Organization" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              <option value="">Unassigned</option>
              {orgs.map((o) => (<option key={o.id} value={o.id}>
                  {o.name}
                </option>))}
            </Select>
            <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </Select>
            <Textarea label="Findings / notes" rows={4} value={findings} onChange={(e) => setFindings(e.target.value)} placeholder="Evidence checklist, interviews, custody notes…"/>
            <Button type="submit" loading={saving} className="w-full">
              Open case (no auto penalty)
            </Button>
          </form>

          {openReEntry.length > 0 && (<div className="border-t border-slate-100 p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Quick-fill from re-entry alerts
              </p>
              <ul className="space-y-2">
                {openReEntry.map((a) => (<li key={a.id}>
                    <button type="button" onClick={() => prefillsFromAlert(a)} className="w-full rounded-xl border border-red-100 bg-red-50/50 px-3 py-2 text-left text-sm hover:bg-red-50">
                      <span className="font-medium text-red-900">{a.title}</span>
                      <span className="mt-0.5 block text-xs text-red-700/80">
                        {a.batchNumber} · {a.orgName}
                      </span>
                    </button>
                  </li>))}
              </ul>
            </div>)}
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader title="Case register" subtitle={`${items.length} investigations`}/>
          {items.length === 0 ? (<EmptyState title="No investigations yet"/>) : (<DataTable headers={['Case', 'Title', 'Batch', 'Org', 'Priority', 'Status', 'Assigned', 'Actions']}>
              {items.map((inv) => (<tr key={inv.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-800">
                    {inv.caseNo}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{inv.title}</p>
                    {inv.findings && (<p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">{inv.findings}</p>)}
                  </td>
                  <td className="px-4 py-3">
                    {inv.batchNumber ? (<Link to={`/admin/batch-search?q=${encodeURIComponent(inv.batchNumber)}`} className="font-mono text-xs text-brand-700 hover:underline">
                        {inv.batchNumber}
                      </Link>) : ('—')}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{inv.orgName || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={inv.priority === 'CRITICAL' || inv.priority === 'HIGH' ? 'danger' : 'warning'}>
                      {inv.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(inv.status)}>{prettyStatus(inv.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{inv.assignedTo}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {inv.status === 'OPEN' && (<Button size="sm" variant="secondary" onClick={() => updateCase(inv.id, 'IN_PROGRESS')}>
                          Start
                        </Button>)}
                      {(inv.status === 'OPEN' || inv.status === 'IN_PROGRESS') && (<Button size="sm" variant="secondary" onClick={() => updateCase(inv.id, 'ESCALATED')}>
                          Escalate
                        </Button>)}
                      {inv.status !== 'CLOSED' && (<Button size="sm" onClick={() => updateCase(inv.id, 'CLOSED')}>
                          Close
                        </Button>)}
                    </div>
                  </td>
                </tr>))}
            </DataTable>)}
        </Card>
      </div>
    </div>);
}
