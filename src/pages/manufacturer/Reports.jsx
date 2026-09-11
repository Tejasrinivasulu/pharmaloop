import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';
import { api } from '../../lib/api';
import { AlertBanner, Card, CardHeader, KpiCard, LoadingScreen, PageHeader, } from '../../components/ui';
export default function Reports() {
    const [returns, setReturns] = useState([]);
    const [kpis, setKpis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        Promise.all([
            api('/api/manufacturer/returns'),
            api('/api/manufacturer/dashboard'),
        ])
            .then(([ret, dash]) => {
            setReturns(ret.returns || []);
            setKpis(dash.kpis);
        })
            .catch((e) => setError(e.message || 'Failed to load reports'))
            .finally(() => setLoading(false));
    }, []);
    const byStatus = useMemo(() => {
        const counts = {};
        for (const r of returns) {
            counts[r.status] = (counts[r.status] || 0) + 1;
        }
        return Object.entries(counts).map(([status, count]) => ({
            status: status.replaceAll('_', ' '),
            count,
        }));
    }, [returns]);
    if (loading)
        return <LoadingScreen label="Building reports…"/>;
    if (error)
        return <AlertBanner tone="danger" title="Unable to load">{error}</AlertBanner>;
    return (<div>
      <PageHeader title="Reports" subtitle="Operational throughput and compliance posture"/>

      {kpis && (<div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Closed" value={kpis.closed} accent="success"/>
          <KpiCard label="Discrepancies" value={kpis.openDiscrepancies} accent="danger"/>
          <KpiCard label="Quarantine" value={kpis.inQuarantine} accent="warning"/>
          <KpiCard label="Certificates" value={kpis.certificatesIssued}/>
        </div>)}

      <Card>
        <CardHeader title="Returns by status" subtitle="Current pipeline distribution"/>
        <div className="h-80 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byStatus} layout="vertical" margin={{ left: 24, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }}/>
              <YAxis type="category" dataKey="status" width={140} tick={{ fontSize: 10 }}/>
              <Tooltip />
              <Bar dataKey="count" fill="#0f5c4c" radius={[0, 8, 8, 0]} name="Returns"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>);
}
