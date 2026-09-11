import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Card, CardHeader, LoadingScreen, PageHeader, Timeline, statusTone, } from '../../components/ui';
import { formatDate, formatDateTime } from './format';
export default function BatchPassport() {
    const { batchNumber = '' } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        if (!batchNumber)
            return;
        setLoading(true);
        api(`/api/batches/${encodeURIComponent(batchNumber)}`)
            .then(setData)
            .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load passport'))
            .finally(() => setLoading(false));
    }, [batchNumber]);
    if (loading)
        return <LoadingScreen label="Loading digital passport…"/>;
    if (error)
        return <AlertBanner tone="danger" title="Passport unavailable">{error}</AlertBanner>;
    if (!data)
        return null;
    const p = data.passport;
    const steps = (p.passport || []).map((t, idx, arr) => ({
        label: t.status.replaceAll('_', ' '),
        done: idx < arr.length - 1 || p.closed,
        current: idx === arr.length - 1 && !p.closed,
        note: `${t.actor} · ${t.org} · ${formatDateTime(t.at)}${t.note ? ` — ${t.note}` : ''}`,
    }));
    return (<div>
      <PageHeader title="Digital Batch Passport" subtitle={p.batchNumber} actions={<Link to="/pharmacy/inventory" className="text-sm font-semibold text-brand-800 hover:underline">
            ← Inventory
          </Link>}/>

      {data.reEntryAlert && (<div className="mb-4">
          <AlertBanner tone="danger" title="Re-entry alert">
            {data.reEntryAlert.message}
          </AlertBanner>
        </div>)}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader title={p.productName} subtitle={`${p.strength} · ${p.form}`} action={<Badge tone={statusTone(p.status)}>{p.status.replaceAll('_', ' ')}</Badge>}/>
          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
            <Field label="Manufacturer" value={p.manufacturer}/>
            <Field label="Batch" value={p.batchNumber}/>
            <Field label="Manufactured" value={formatDate(p.manufacturingDate)}/>
            <Field label="Expiry" value={formatDate(p.expiryDate)}/>
            <Field label="Original qty" value={String(p.quantities.originalQty)}/>
            <Field label="Distributed" value={String(p.quantities.distributed)}/>
            <Field label="Returned" value={String(p.quantities.returned)}/>
            <Field label="Received" value={String(p.quantities.received)}/>
            <Field label="Disposed" value={String(p.quantities.disposed)}/>
            <Field label="Verified" value={String(p.quantities.verified)}/>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
            {p.notForSale && <Badge tone="danger">NOT FOR SALE</Badge>}
            {p.closed && <Badge tone="success">CLOSED</Badge>}
            {p.discrepancy && <Badge tone="warning">DISCREPANCY</Badge>}
            {p.forSale && <Badge tone="success">FOR SALE</Badge>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Chain of custody" subtitle="Passport timeline"/>
          <div className="px-5 py-4">
            {steps.length === 0 ? (<p className="text-sm text-slate-500">No passport events.</p>) : (<Timeline steps={steps}/>)}
          </div>
        </Card>
      </div>

      {(p.returns?.length || p.alerts?.length || p.certificates?.length) && (<div className="mt-6 grid gap-4 lg:grid-cols-3">
          {!!p.returns?.length && (<Card>
              <CardHeader title="Related returns"/>
              <ul className="divide-y divide-slate-100 px-5 py-2">
                {p.returns.map((r) => (<li key={r.returnCode} className="py-3 text-sm">
                    <p className="font-semibold text-slate-800">{r.returnCode}</p>
                    <p className="text-slate-500">
                      {r.pharmacyName} · {r.status.replaceAll('_', ' ')}
                    </p>
                  </li>))}
              </ul>
            </Card>)}
          {!!p.alerts?.length && (<Card>
              <CardHeader title="Alerts"/>
              <ul className="divide-y divide-slate-100 px-5 py-2">
                {p.alerts.map((a) => (<li key={a.id} className="py-3 text-sm">
                    <p className="font-semibold text-slate-800">{a.title}</p>
                    <p className="text-slate-500">{a.message}</p>
                  </li>))}
              </ul>
            </Card>)}
          {!!p.certificates?.length && (<Card>
              <CardHeader title="Certificates"/>
              <ul className="divide-y divide-slate-100 px-5 py-2">
                {p.certificates.map((c) => (<li key={c.certificateNo} className="py-3 text-sm">
                    <p className="font-semibold text-slate-800">{c.certificateNo}</p>
                    <p className="text-slate-500">
                      {c.status} · {formatDate(c.issuedAt)}
                    </p>
                  </li>))}
              </ul>
            </Card>)}
        </div>)}
    </div>);
}
function Field({ label, value }) {
    return (<div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>);
}
