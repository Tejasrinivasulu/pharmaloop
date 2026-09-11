import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Card, CardHeader, EmptyState, KpiCard, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
import { formatDateTime, prettyStatus } from './format';
export default function Dashboard() {
    const [data, setData] = useState(null);
    const [orgs, setOrgs] = useState([]);
    const [returns, setReturns] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        Promise.all([
            api('/api/admin/dashboard'),
            api('/api/admin/organizations'),
            api('/api/admin/returns'),
            api('/api/admin/alerts'),
        ])
            .then(([dash, orgRes, retRes, alertRes]) => {
            if (cancelled)
                return;
            setData(dash);
            setOrgs(orgRes.organizations || []);
            setReturns(retRes.returns || []);
            setAlerts(alertRes.alerts || []);
        })
            .catch((e) => {
            if (!cancelled)
                setError(e instanceof Error ? e.message : 'Failed to load dashboard');
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    const chartData = useMemo(() => {
        if (!data?.returnsByStatus)
            return [];
        return Object.entries(data.returnsByStatus).map(([status, count]) => ({
            status: prettyStatus(status).replace(/DISTRIBUTOR |MANUFACTURER /g, ''),
            full: prettyStatus(status),
            count,
        }));
    }, [data]);
    const regionCards = useMemo(() => {
        const map = new Map();
        for (const o of orgs) {
            const cur = map.get(o.region) || { region: o.region, orgs: 0, returns: 0, alerts: 0 };
            cur.orgs += 1;
            cur.returns += o.returnCount;
            cur.alerts += o.openAlerts;
            map.set(o.region, cur);
        }
        return Array.from(map.values()).sort((a, b) => b.alerts - a.alerts);
    }, [orgs]);
    if (loading)
        return <LoadingScreen label="Loading regulator command center…"/>;
    if (error || !data) {
        return <AlertBanner tone="danger" title="Dashboard unavailable">{error}</AlertBanner>;
    }
    const { kpis, returnsByStatus } = data;
    const totalBatches = new Set(returns.map((r) => r.batchNumber)).size;
    const activeReturns = kpis.totalReturns - kpis.closedReturns;
    const pendingDisposal = (returnsByStatus.DISPOSAL_REQUESTED || 0) +
        (returnsByStatus.DISPOSAL_COMPLETED || 0) +
        (returnsByStatus.EVIDENCE_SUBMITTED || 0);
    const missingCerts = returns.filter((r) => (r.disposalCompleted || r.status === 'DISPOSAL_COMPLETED' || r.status === 'EVIDENCE_SUBMITTED') &&
        !r.certificate).length;
    const highRisk = alerts.filter((a) => a.severity === 'critical' && a.status === 'OPEN').length;
    return (<div className="space-y-6">
      <PageHeader title="Regulator command center" subtitle={`${data.org?.name || 'CDSCO Monitor'} · Possible re-entry routes to investigation — never auto-fraud`}/>

      <AlertBanner tone="info" title="Policy reminder">
        POSSIBLE_RE_ENTRY alerts open an investigation workflow. Penalties are never auto-imposed from a scan alone.
      </AlertBanner>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total batches" value={totalBatches} hint="Unique batches in returns"/>
        <KpiCard label="Active returns" value={activeReturns} hint={`${kpis.totalReturns} total`}/>
        <KpiCard label="Pending disposal" value={pendingDisposal} accent="warning" hint="Request → evidence stages"/>
        <KpiCard label="Open discrepancies" value={kpis.openDiscrepancies} accent="warning"/>
        <KpiCard label="Missing certificates" value={missingCerts} accent="warning" hint="Estimate from disposal returns"/>
        <KpiCard label="High-risk alerts" value={highRisk} accent="danger" hint="Critical + open"/>
        <KpiCard label="Possible re-entry" value={kpis.reEntryAlerts} accent="danger" hint="→ Investigation, not auto-fraud"/>
        <KpiCard label="Open investigations" value={kpis.openInvestigations} accent="danger"/>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Returns by status" subtitle="National pipeline distribution"/>
          <div className="h-80 p-4">
            {chartData.every((d) => d.count === 0) ? (<EmptyState title="No return status data"/>) : (<ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                  <XAxis dataKey="status" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-35} textAnchor="end" height={70}/>
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }}/>
                  <Tooltip formatter={(value) => [value, 'Returns']} labelFormatter={(_, payload) => payload?.[0]?.payload?.full || ''}/>
                  <Bar dataKey="count" fill="#0f4c5c" radius={[6, 6, 0, 0]}/>
                </BarChart>
              </ResponsiveContainer>)}
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Regional coverage" subtitle="Organizations by region"/>
          <div className="space-y-3 p-4">
            {regionCards.length === 0 && <EmptyState title="No organizations"/>}
            {regionCards.map((r) => (<div key={r.region} className="rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-sm font-semibold text-slate-900">{r.region}</p>
                  {r.alerts > 0 && <Badge tone="danger">{r.alerts} open</Badge>}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {r.orgs} orgs · {r.returns} returns
                </p>
              </div>))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Recent alerts" action={<Link to="/admin/ai-alerts" className="text-xs font-semibold text-brand-700 hover:underline">
                View all
              </Link>}/>
          <ul className="divide-y divide-slate-100">
            {data.recentAlerts.map((a) => (<li key={a.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">{a.title}</p>
                  <Badge tone={statusTone(a.severity)}>{a.severity}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {a.batchNumber || '—'} · {formatDateTime(a.createdAt)}
                </p>
              </li>))}
            {data.recentAlerts.length === 0 && <EmptyState title="No recent alerts"/>}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Investigations" action={<Link to="/admin/investigations" className="text-xs font-semibold text-brand-700 hover:underline">
                Manage
              </Link>}/>
          <ul className="divide-y divide-slate-100">
            {data.recentInvestigations.map((inv) => (<li key={inv.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">{inv.caseNo}</p>
                  <Badge tone={statusTone(inv.status)}>{prettyStatus(inv.status)}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{inv.title}</p>
              </li>))}
            {data.recentInvestigations.length === 0 && <EmptyState title="No investigations"/>}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Audit pulse" action={<Link to="/admin/audit" className="text-xs font-semibold text-brand-700 hover:underline">
                Trail
              </Link>}/>
          <ul className="divide-y divide-slate-100">
            {data.recentAudit.map((e) => (<li key={e.id} className="px-5 py-3">
                <p className="text-sm font-medium text-slate-800">
                  {e.actorName} · {prettyStatus(e.action)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatDateTime(e.at)} · {e.details}
                </p>
              </li>))}
            {data.recentAudit.length === 0 && <EmptyState title="No audit events"/>}
          </ul>
        </Card>
      </div>
    </div>);
}
