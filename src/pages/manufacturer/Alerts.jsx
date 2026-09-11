import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, EmptyState, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
import { formatDateTime, prettyStatus } from './format';
export default function AlertsInvestigations() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState(null);
    const load = () => api('/api/manufacturer/alerts')
        .then((r) => setAlerts(r.alerts || []))
        .catch((e) => setError(e.message || 'Failed to load alerts'))
        .finally(() => setLoading(false));
    useEffect(() => {
        load();
    }, []);
    const reEntry = useMemo(() => alerts.filter((a) => a.type === 'POSSIBLE_RE_ENTRY'), [alerts]);
    const others = useMemo(() => alerts.filter((a) => a.type !== 'POSSIBLE_RE_ENTRY'), [alerts]);
    async function setStatus(id, status) {
        setBusyId(id);
        setError('');
        try {
            await api(`/api/manufacturer/alerts/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            });
            await load();
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : 'Update failed');
        }
        finally {
            setBusyId(null);
        }
    }
    if (loading)
        return <LoadingScreen label="Loading alerts…"/>;
    return (<div>
      <PageHeader title="Alerts & Investigations" subtitle="Open signals including possible re-entry — not auto-fraud"/>

      {error && (<div className="mb-4">
          <AlertBanner tone="danger" title="Error">
            {error}
          </AlertBanner>
        </div>)}

      {reEntry.length > 0 && (<div className="mb-6 space-y-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-red-700">
            POSSIBLE_RE_ENTRY
          </h2>
          {reEntry.map((a) => (<Card key={a.id} className="border-red-200 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="danger">POSSIBLE_RE_ENTRY</Badge>
                    <Badge tone={statusTone(a.severity)}>{a.severity}</Badge>
                    <Badge tone={a.status === 'OPEN' ? 'warning' : 'neutral'}>{a.status}</Badge>
                  </div>
                  <h3 className="mt-2 font-display text-lg font-bold text-slate-900">{a.title}</h3>
                  <p className="mt-1 text-sm text-slate-700">{a.message}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    Investigate chain of custody — do not auto-mark fraud. {formatDateTime(a.createdAt)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {a.status === 'OPEN' && (<Button size="sm" variant="secondary" loading={busyId === a.id} onClick={() => setStatus(a.id, 'ACKNOWLEDGED')}>
                        Acknowledge
                      </Button>)}
                    {a.status !== 'RESOLVED' && (<Button size="sm" loading={busyId === a.id} onClick={() => setStatus(a.id, 'RESOLVED')}>
                        Resolve
                      </Button>)}
                  </div>
                </div>
                {a.batchNumber && (<Link to={`/manufacturer/batch/${encodeURIComponent(a.batchNumber)}`} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                    Open passport {a.batchNumber}
                  </Link>)}
              </div>
            </Card>))}
        </div>)}

      <Card>
        <CardHeader title="Other alerts" subtitle={`${others.length} signals`}/>
        {others.length === 0 ? (<EmptyState title="No other alerts"/>) : (<div className="divide-y divide-slate-100">
            {others.map((a) => (<div key={a.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info">{prettyStatus(a.type)}</Badge>
                    <Badge tone={statusTone(a.severity)}>{a.severity}</Badge>
                    <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                  </div>
                  <p className="mt-1 font-medium text-slate-900">{a.title}</p>
                  <p className="text-sm text-slate-600">{a.message}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.status === 'OPEN' && (<Button size="sm" variant="secondary" loading={busyId === a.id} onClick={() => setStatus(a.id, 'ACKNOWLEDGED')}>
                      Acknowledge
                    </Button>)}
                  {a.batchNumber && (<Link to={`/manufacturer/batch/${encodeURIComponent(a.batchNumber)}`} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-brand-800 hover:bg-brand-50">
                      Passport
                    </Link>)}
                </div>
              </div>))}
          </div>)}
      </Card>
    </div>);
}
