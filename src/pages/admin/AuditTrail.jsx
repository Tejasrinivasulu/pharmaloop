import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Card, EmptyState, Input, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
import { formatDateTime, prettyStatus } from './format';
export default function AuditTrail() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [q, setQ] = useState('');
    useEffect(() => {
        api('/api/admin/audit')
            .then((r) => setRows(r.auditLog || []))
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
            .finally(() => setLoading(false));
    }, []);
    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle)
            return rows;
        return rows.filter((e) => [e.actorName, e.actorRole, e.action, e.entityType, e.entityId, e.details]
            .join(' ')
            .toLowerCase()
            .includes(needle));
    }, [rows, q]);
    if (loading)
        return <LoadingScreen label="Loading audit trail…"/>;
    if (error)
        return <AlertBanner tone="danger" title="Unable to load audit">{error}</AlertBanner>;
    return (<div className="space-y-6">
      <PageHeader title="Audit trail" subtitle="Append-only WHO · WHAT · WHEN · ENTITY record — regulators observe; entries are not rewritten"/>

      <AlertBanner tone="info" title="Immutable ledger">
        Audit events are append-only. Corrections create new events; prior custody history remains intact.
      </AlertBanner>

      <Input label="Search WHO / WHAT / ENTITY" placeholder="Actor, action, batch, return…" value={q} onChange={(e) => setQ(e.target.value)}/>

      <Card>
        {filtered.length === 0 ? (<EmptyState title="No audit events"/>) : (<ul className="divide-y divide-slate-100">
            {filtered.map((e) => (<li key={e.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[140px_1fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">When</p>
                  <p className="mt-1 text-sm text-slate-700">{formatDateTime(e.at)}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand">{e.actorRole}</Badge>
                    <Badge tone={statusTone(e.action)}>{prettyStatus(e.action)}</Badge>
                    <span className="text-xs text-slate-400">
                      {e.entityType} · {e.entityId}
                    </span>
                  </div>
                  <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">Who</dt>
                      <dd className="font-medium text-slate-900">{e.actorName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">What</dt>
                      <dd className="text-slate-800">{e.details}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">Batch / entity</dt>
                      <dd className="font-mono text-xs text-slate-700">
                        {e.entityType === 'Batch' ? e.entityId : `${e.entityType}:${e.entityId}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">Document / status</dt>
                      <dd className="text-slate-700">{prettyStatus(e.action)}</dd>
                    </div>
                  </dl>
                </div>
              </li>))}
          </ul>)}
      </Card>
    </div>);
}
