import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, DataTable, EmptyState, KpiCard, LoadingScreen, PageHeader, Select, statusTone, } from '../../components/ui';
import { formatDateTime, prettyStatus } from './format';
export default function AiRiskAlerts() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [type, setType] = useState('ALL');
    const [severity, setSeverity] = useState('ALL');
    const [busyId, setBusyId] = useState(null);
    const load = () => api('/api/admin/alerts')
        .then((r) => setAlerts(r.alerts || []))
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
        .finally(() => setLoading(false));
    useEffect(() => {
        load();
    }, []);
    async function setStatus(id, status) {
        setBusyId(id);
        setError(null);
        try {
            await api(`/api/admin/alerts/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            });
            await load();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Update failed');
        }
        finally {
            setBusyId(null);
        }
    }
    const filtered = useMemo(() => {
        return alerts.filter((a) => {
            if (type !== 'ALL' && a.type !== type)
                return false;
            if (severity !== 'ALL' && a.severity !== severity)
                return false;
            return true;
        });
    }, [alerts, type, severity]);
    const types = useMemo(() => Array.from(new Set(alerts.map((a) => a.type))).sort(), [alerts]);
    if (loading)
        return <LoadingScreen label="Loading AI risk alerts…"/>;
    if (error)
        return <AlertBanner tone="danger" title="Unable to load alerts">{error}</AlertBanner>;
    const critical = alerts.filter((a) => a.severity === 'critical' && a.status === 'OPEN').length;
    const reEntry = alerts.filter((a) => a.type === 'POSSIBLE_RE_ENTRY').length;
    const withInv = alerts.filter((a) => a.investigation).length;
    return (<div className="space-y-6">
      <PageHeader title="AI risk alerts" subtitle="Regulator view of risk signals (admin uses /api/admin/alerts — manufacturer AI endpoint may be role-gated)"/>

      <AlertBanner tone="info" title="Possible re-entry is a risk signal">
        Model / rule scores flag custody anomalies. Human investigation decides outcome. No automatic
        fraud label or penalty from an alert alone.
      </AlertBanner>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Critical open" value={critical} accent="danger"/>
        <KpiCard label="Re-entry signals" value={reEntry} accent="danger"/>
        <KpiCard label="Linked to investigation" value={withInv} accent="success"/>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="ALL">All types</option>
          {types.map((t) => (<option key={t} value={t}>
              {prettyStatus(t)}
            </option>))}
        </Select>
        <Select label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="ALL">All severities</option>
          <option value="critical">critical</option>
          <option value="warning">warning</option>
          <option value="info">info</option>
        </Select>
      </div>

      <Card>
        <CardHeader title="Risk register"/>
        {filtered.length === 0 ? (<EmptyState title="No alerts for filters"/>) : (<DataTable headers={['Alert', 'Type', 'Severity', 'Batch', 'Org', 'Investigation', 'Status', 'When', 'Action']}>
            {filtered.map((a) => (<tr key={a.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{a.title}</p>
                  <p className="max-w-sm text-xs text-slate-500">{a.message}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={a.type === 'POSSIBLE_RE_ENTRY' ? 'danger' : 'info'}>
                    {prettyStatus(a.type)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(a.severity)}>{a.severity}</Badge>
                </td>
                <td className="px-4 py-3">
                  {a.batchNumber ? (<Link to={`/admin/batch-search?q=${encodeURIComponent(a.batchNumber)}`} className="font-mono text-xs text-brand-700 hover:underline">
                      {a.batchNumber}
                    </Link>) : ('—')}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{a.orgName || '—'}</td>
                <td className="px-4 py-3 text-sm">
                  {a.investigation ? (<Badge tone="brand">{a.investigation.caseNo}</Badge>) : (<span className="text-slate-400">None</span>)}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(a.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {!a.investigation && a.type === 'POSSIBLE_RE_ENTRY' && (<Link to={`/admin/investigations?alertId=${encodeURIComponent(a.id)}&batch=${encodeURIComponent(a.batchNumber || '')}`}>
                        <Button size="sm" variant="secondary">
                          Investigate
                        </Button>
                      </Link>)}
                    {a.status === 'OPEN' && (<Button size="sm" variant="secondary" loading={busyId === a.id} onClick={() => setStatus(a.id, 'ACKNOWLEDGED')}>
                        Ack
                      </Button>)}
                    {a.status !== 'RESOLVED' && (<Button size="sm" loading={busyId === a.id} onClick={() => setStatus(a.id, 'RESOLVED')}>
                        Resolve
                      </Button>)}
                  </div>
                </td>
              </tr>))}
          </DataTable>)}
      </Card>
    </div>);
}
