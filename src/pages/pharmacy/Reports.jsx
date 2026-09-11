import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { AlertBanner, Card, CardHeader, KpiCard, LoadingScreen, PageHeader, } from '../../components/ui';
import { formatInr } from './format';
export default function PharmacyReports() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        api('/api/pharmacy/dashboard')
            .then(setData)
            .catch((e) => setError(e.message || 'Failed to load reports'))
            .finally(() => setLoading(false));
    }, []);
    if (loading)
        return <LoadingScreen label="Loading reports…"/>;
    if (error)
        return <AlertBanner tone="danger" title="Unable to load reports">{error}</AlertBanner>;
    if (!data)
        return null;
    const { kpis } = data;
    return (<div>
      <PageHeader title="Reports" subtitle="Operational summary derived from pharmacy dashboard metrics"/>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Units on hand" value={kpis.unitsOnHand.toLocaleString('en-IN')}/>
        <KpiCard label="Not-for-sale units" value={kpis.notForSaleUnits} accent="danger"/>
        <KpiCard label="Expiring soon" value={kpis.expiringSoon} accent="warning"/>
        <KpiCard label="Expired SKUs" value={kpis.expiredSkuCount} accent="danger"/>
        <KpiCard label="Open returns" value={kpis.openReturns} accent="warning"/>
        <KpiCard label="Closed returns" value={kpis.closedReturns} accent="success"/>
        <KpiCard label="Pending settlements" value={kpis.pendingSettlements} accent="warning"/>
        <KpiCard label="Paid settlement value" value={formatInr(kpis.paidSettlementAmount)} accent="success"/>
      </div>

      <Card>
        <CardHeader title="Quick links" subtitle="Drill into operational queues"/>
        <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { to: '/pharmacy/inventory', label: 'Inventory ledger' },
            { to: '/pharmacy/expiry', label: 'Expiry risk board' },
            { to: '/pharmacy/returns', label: 'Return tracking' },
            { to: '/pharmacy/settlement', label: 'Settlement ledger' },
            { to: '/pharmacy/scan', label: 'Scan & passport' },
            { to: '/pharmacy/reports', label: 'Reports' },
        ].map((l) => (<Link key={l.to} to={l.to} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50">
              {l.label} →
            </Link>))}
        </div>
      </Card>
    </div>);
}
