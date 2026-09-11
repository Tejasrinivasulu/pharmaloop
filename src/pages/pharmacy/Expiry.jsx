import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Card, CardHeader, DataTable, EmptyState, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
import { formatDate } from './format';
function daysUntil(expiryDate) {
    return (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
}
function riskInsight(item, category) {
    const days = daysUntil(item.expiryDate);
    if (item.status === 'RE_ENTRY_FLAGGED') {
        return {
            title: 'Re-entry signal',
            confidence: 0.9,
            summary: 'Closed-batch scan pattern — investigate before sale or return.',
        };
    }
    if (item.status === 'DISCREPANCY') {
        return {
            title: 'Quantity integrity',
            confidence: 0.84,
            summary: 'Expected vs received mismatch — reconcile before closure.',
        };
    }
    if (category === 'Expired' || days < 0) {
        return {
            title: 'Expired stock',
            confidence: 0.97,
            summary: 'Mark NOT FOR SALE and submit a return request immediately.',
        };
    }
    if (category === 'High Risk' || days <= 15) {
        return {
            title: 'Near-expiry surge',
            confidence: 0.91,
            summary: `~${Math.max(0, Math.ceil(days))} days to expiry — prioritize return.`,
        };
    }
    if (category === 'Expiring Soon' || days <= 45) {
        return {
            title: 'Expiring soon',
            confidence: 0.78,
            summary: 'Plan return before stock becomes unsaleable.',
        };
    }
    return null;
}
function categorize(item) {
    if (item.status === 'EXPIRED')
        return 'Expired';
    if (item.status === 'RE_ENTRY_FLAGGED' || item.status === 'DISCREPANCY')
        return 'High Risk';
    if (item.status === 'EXPIRING')
        return 'Expiring Soon';
    const days = daysUntil(item.expiryDate);
    if (days < 0)
        return 'Expired';
    if (days <= 15)
        return 'High Risk';
    if (days <= 45 || item.status === 'EXPIRING')
        return 'Expiring Soon';
    return 'Normal';
}
const categoryTone = {
    Normal: 'success',
    'Expiring Soon': 'warning',
    'High Risk': 'danger',
    Expired: 'danger',
};
export default function PharmacyExpiry() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('ALL');
    useEffect(() => {
        api('/api/pharmacy/inventory')
            .then((r) => {
            const relevant = (r.inventory || []).filter((i) => ['AVAILABLE', 'EXPIRING', 'EXPIRED', 'RE_ENTRY_FLAGGED', 'DISCREPANCY', 'NOT_FOR_SALE'].includes(i.status));
            setItems(relevant);
        })
            .catch((e) => setError(e.message || 'Failed to load expiry data'))
            .finally(() => setLoading(false));
    }, []);
    const enriched = useMemo(() => items.map((i) => {
        const category = categorize(i);
        return {
            ...i,
            category,
            ai: riskInsight(i, category),
        };
    }), [items]);
    const filtered = tab === 'ALL' ? enriched : enriched.filter((i) => i.category === tab);
    const counts = useMemo(() => {
        const c = {
            Normal: 0,
            'Expiring Soon': 0,
            'High Risk': 0,
            Expired: 0,
        };
        for (const i of enriched)
            c[i.category] += 1;
        return c;
    }, [enriched]);
    if (loading)
        return <LoadingScreen label="Loading expiry alerts…"/>;
    if (error)
        return <AlertBanner tone="danger" title="Unable to load expiry alerts">{error}</AlertBanner>;
    const tabs = ['ALL', 'Normal', 'Expiring Soon', 'High Risk', 'Expired'];
    return (<div>
      <PageHeader title="Expiry Alerts" subtitle="Categorized risk view for available, expiring, and expired stock"/>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.keys(counts).map((k) => (<button key={k} type="button" onClick={() => setTab(k)} className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${tab === k ? 'border-brand-600 ring-2 ring-brand-600/20' : 'border-slate-200 hover:border-slate-300'}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{k}</p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-900">{counts[k]}</p>
          </button>))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (<button key={t} type="button" onClick={() => setTab(t)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tab === t ? 'bg-brand-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {t}
          </button>))}
      </div>

      <Card>
        <CardHeader title="Expiry risk board" subtitle={`${filtered.length} SKUs in view`}/>
        {filtered.length === 0 ? (<EmptyState title="No items in this category"/>) : (<DataTable headers={['Medicine', 'Batch', 'Qty', 'EXP', 'Category', 'AI risk', 'Action']}>
            {filtered.map((i) => (<tr key={i.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">
                    {i.productName} {i.strength}
                  </p>
                  {i.notForSale && <Badge tone="danger">NOT FOR SALE</Badge>}
                </td>
                <td className="px-4 py-3 font-medium text-brand-800">{i.batchNumber}</td>
                <td className="px-4 py-3">{i.qty}</td>
                <td className="px-4 py-3">{formatDate(i.expiryDate)}</td>
                <td className="px-4 py-3">
                  <Badge tone={categoryTone[i.category]}>{i.category}</Badge>
                  <div className="mt-1">
                    <Badge tone={statusTone(i.status)}>{i.status.replaceAll('_', ' ')}</Badge>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {i.ai ? (<>
                      <p className="font-semibold text-slate-800">{i.ai.title}</p>
                      <p>{i.ai.summary}</p>
                      <p className="mt-0.5 text-slate-400">
                        Confidence {(i.ai.confidence * 100).toFixed(0)}%
                      </p>
                    </>) : (<span className="text-slate-400">—</span>)}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/pharmacy/returns/new?batch=${encodeURIComponent(i.batchNumber)}&qty=${i.qty}`} className="text-sm font-semibold text-orange-700 hover:underline">
                    Request return
                  </Link>
                </td>
              </tr>))}
          </DataTable>)}
      </Card>
    </div>);
}
