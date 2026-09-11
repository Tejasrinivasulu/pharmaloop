import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Card, CardHeader, EmptyState, LoadingScreen, PageHeader, } from '../../components/ui';
import { formatDate, formatPct } from './format';
export default function AIInsights() {
    const [insights, setInsights] = useState([]);
    const [model, setModel] = useState('');
    const [generatedAt, setGeneratedAt] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        api('/api/manufacturer/ai')
            .then((r) => {
            setInsights(r.insights || []);
            setModel(r.model || 'PharmaLoop-Risk-v1');
            setGeneratedAt(r.generatedAt || new Date().toISOString());
        })
            .catch((e) => setError(e.message || 'Failed to load AI insights'))
            .finally(() => setLoading(false));
    }, []);
    const barData = useMemo(() => insights.map((i) => ({
        name: i.category.length > 16 ? `${i.category.slice(0, 14)}…` : i.category,
        risk: Math.round(i.confidence * 100),
        full: i.title,
    })), [insights]);
    const lineData = useMemo(() => {
        const sorted = [...insights].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return sorted.map((i, idx) => ({
            day: formatDate(i.createdAt),
            confidence: Math.round(i.confidence * 100),
            idx: idx + 1,
            title: i.title,
        }));
    }, [insights]);
    if (loading)
        return <LoadingScreen label="Loading AI insights…"/>;
    if (error)
        return <AlertBanner tone="danger" title="Unable to load">{error}</AlertBanner>;
    return (<div>
      <PageHeader title="AI Insights" subtitle={`${model} · generated ${generatedAt ? formatDate(generatedAt) : '—'}`}/>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Risk confidence by category" subtitle="Bar — model confidence %"/>
          <div className="h-72 p-4">
            {barData.length === 0 ? (<EmptyState title="No chart data"/>) : (<ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }}/>
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }}/>
                  <Tooltip formatter={(value) => [`${value}%`, 'Risk']} labelFormatter={(_, payload) => payload?.[0]?.payload?.full || ''}/>
                  <Bar dataKey="risk" fill="#0f5c4c" radius={[8, 8, 0, 0]} name="Risk %"/>
                </BarChart>
              </ResponsiveContainer>)}
          </div>
        </Card>

        <Card>
          <CardHeader title="Confidence trend" subtitle="Line — insight chronology"/>
          <div className="h-72 p-4">
            {lineData.length === 0 ? (<EmptyState title="No trend data"/>) : (<ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }}/>
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }}/>
                  <Tooltip formatter={(value) => [`${value}%`, 'Confidence']}/>
                  <Legend />
                  <Line type="monotone" dataKey="confidence" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 4 }} name="Confidence %"/>
                </LineChart>
              </ResponsiveContainer>)}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((i) => (<Card key={i.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge tone="brand">{i.category}</Badge>
                <h3 className="mt-2 font-display text-base font-semibold text-slate-900">{i.title}</h3>
              </div>
              <div className="rounded-xl bg-brand-50 px-3 py-2 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-700">Risk</p>
                <p className="font-display text-xl font-bold text-brand-900">{formatPct(i.confidence)}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">{i.summary}</p>
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-semibold">Recommendation:</span> {i.recommendation}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
              {i.relatedBatch && (<Link className="font-semibold text-brand-800 hover:underline" to={`/manufacturer/batch/${encodeURIComponent(i.relatedBatch)}`}>
                  Batch {i.relatedBatch}
                </Link>)}
              <span>{formatDate(i.createdAt)}</span>
            </div>
          </Card>))}
        {insights.length === 0 && (<Card className="md:col-span-2">
            <EmptyState title="No insights"/>
          </Card>)}
      </div>
    </div>);
}
