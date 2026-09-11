import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Card, CardHeader, DataTable, EmptyState, KpiCard, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
import { formatDateTime, prettyStatus } from './format';
const PIE_COLORS = ['#0f4c5c', '#e36414', '#c1121f', '#1d3557', '#2a9d8f', '#457b9d'];
export default function Compliance() {
    const [dash, setDash] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        Promise.all([
            api('/api/admin/dashboard'),
            api('/api/admin/alerts'),
        ])
            .then(([d, a]) => {
            setDash(d);
            setAlerts(a.alerts || []);
        })
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
            .finally(() => setLoading(false));
    }, []);
    const statusChart = useMemo(() => {
        if (!dash)
            return [];
        return Object.entries(dash.returnsByStatus).map(([status, count]) => ({
            status: prettyStatus(status),
            count,
        }));
    }, [dash]);
    const alertDist = useMemo(() => {
        const map = new Map();
        for (const a of alerts) {
            map.set(a.type, (map.get(a.type) || 0) + 1);
        }
        return Array.from(map.entries()).map(([name, value]) => ({
            name: prettyStatus(name),
            value,
        }));
    }, [alerts]);
    if (loading)
        return <LoadingScreen label="Loading compliance monitor…"/>;
    if (error || !dash) {
        return <AlertBanner tone="danger" title="Compliance data unavailable">{error}</AlertBanner>;
    }
    const open = alerts.filter((a) => a.status === 'OPEN').length;
    const reEntry = alerts.filter((a) => a.type === 'POSSIBLE_RE_ENTRY' && a.status === 'OPEN').length;
    return (<div className="space-y-6">
      <PageHeader title="Compliance monitoring" subtitle="Alert posture and national return-status distribution"/>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Open alerts" value={open} accent="warning"/>
        <KpiCard label="Possible re-entry" value={reEntry} accent="danger" hint="Investigate, do not auto-penalize"/>
        <KpiCard label="Open discrepancies" value={dash.kpis.openDiscrepancies} accent="warning"/>
        <KpiCard label="Certificates on file" value={dash.kpis.certificates} accent="success"/>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Return status distribution"/>
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                <XAxis dataKey="status" hide/>
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }}/>
                <Tooltip />
                <Bar dataKey="count" fill="#1d3557" radius={[4, 4, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Alert type mix"/>
          <div className="h-72 p-4">
            {alertDist.length === 0 ? (<EmptyState title="No alerts"/>) : (<ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={alertDist} dataKey="value" nameKey="name" outerRadius={100} label>
                    {alertDist.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>)}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Active compliance alerts" action={<Link to="/admin/investigations" className="text-xs font-semibold text-brand-700 hover:underline">
              Open investigations
            </Link>}/>
        {alerts.length === 0 ? (<EmptyState title="No alerts"/>) : (<DataTable headers={['Alert', 'Type', 'Org', 'Batch', 'Severity', 'Status', 'When']}>
            {alerts.map((a) => (<tr key={a.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{a.title}</p>
                  <p className="max-w-md text-xs text-slate-500">{a.message}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={a.type === 'POSSIBLE_RE_ENTRY' ? 'danger' : 'info'}>
                    {prettyStatus(a.type)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-700">{a.orgName || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs">{a.batchNumber || '—'}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(a.severity)}>{a.severity}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(a.createdAt)}</td>
              </tr>))}
          </DataTable>)}
      </Card>
    </div>);
}
