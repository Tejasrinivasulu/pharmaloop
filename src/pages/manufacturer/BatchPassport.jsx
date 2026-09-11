import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, EmptyState, Input, LoadingScreen, PageHeader, Timeline, statusTone, } from '../../components/ui';
import { formatDate, formatDateTime, prettyStatus } from './format';
export default function BatchPassport() {
    const { batchNumber: paramBatch } = useParams();
    const navigate = useNavigate();
    const [query, setQuery] = useState(paramBatch || '');
    const [batch, setBatch] = useState(null);
    const [reEntry, setReEntry] = useState(null);
    const [scanUnit, setScanUnit] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    async function load(batchNumber, scan) {
        if (!batchNumber.trim())
            return;
        setLoading(true);
        setError('');
        setReEntry(null);
        try {
            const qs = scan ? `?scan=${encodeURIComponent(scan)}` : '';
            const res = await api(`/api/batches/${encodeURIComponent(batchNumber.trim())}${qs}`);
            setBatch(res.passport);
            setReEntry(res.reEntryAlert);
            if (paramBatch !== batchNumber.trim()) {
                navigate(`/manufacturer/batch/${encodeURIComponent(batchNumber.trim())}`, { replace: true });
            }
        }
        catch (e) {
            setBatch(null);
            setError(e instanceof Error ? e.message : 'Batch not found');
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        if (paramBatch) {
            setQuery(paramBatch);
            load(paramBatch);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paramBatch]);
    function onSearch(e) {
        e.preventDefault();
        load(query);
    }
    return (<div>
      <PageHeader title="Batch Passport" subtitle="Immutable lifecycle trail — closed / disposed batches stay auditable"/>

      <Card className="mb-6 p-5">
        <form onSubmit={onSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input label="Batch number" placeholder="e.g. PCM-2026-001" value={query} onChange={(e) => setQuery(e.target.value)}/>
          </div>
          <Button type="submit" loading={loading}>
            Open passport
          </Button>
        </form>
        {batch && (batch.closed || batch.status === 'VERIFIED_DISPOSAL' || batch.status === 'CLOSED') && (<form className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-end" onSubmit={(e) => {
                e.preventDefault();
                load(batch.batchNumber, scanUnit);
            }}>
            <div className="flex-1">
              <Input label="Simulate unit scan (closed batch)" placeholder="Unit code" value={scanUnit} onChange={(e) => setScanUnit(e.target.value)}/>
            </div>
            <Button type="submit" variant="secondary" loading={loading}>
              Scan unit
            </Button>
          </form>)}
      </Card>

      {error && (<div className="mb-4">
          <AlertBanner tone="danger" title="Lookup failed">
            {error}
          </AlertBanner>
        </div>)}
      {reEntry && (<div className="mb-4">
          <AlertBanner tone="danger" title={reEntry.title || 'POSSIBLE_RE_ENTRY'}>
            {reEntry.message}
          </AlertBanner>
        </div>)}

      {loading && !batch && <LoadingScreen label="Loading passport…"/>}

      {batch && (<div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title={batch.batchNumber} subtitle={`${batch.productName} ${batch.strength} · ${batch.form}`} action={<Badge tone={statusTone(batch.status)}>{prettyStatus(batch.status)}</Badge>}/>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Meta label="Manufacturer" value={batch.manufacturer}/>
              <Meta label="Manufactured" value={formatDate(batch.manufacturingDate)}/>
              <Meta label="Expiry" value={formatDate(batch.expiryDate)}/>
              <Meta label="Sale status" value={batch.notForSale || batch.closed ? 'QUARANTINED / NOT FOR SALE' : 'Trackable'}/>
              {batch.discrepancy && (<div className="sm:col-span-2">
                  <AlertBanner tone="danger" title="Quantity discrepancy flagged on this batch"/>
                </div>)}
            </div>
            <div className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-3">
              {[
                ['Original', batch.quantities.originalQty],
                ['Distributed', batch.quantities.distributed],
                ['Returned', batch.quantities.returned],
                ['Received', batch.quantities.received],
                ['Disposed', batch.quantities.disposed],
                ['Verified', batch.quantities.verified],
            ].map(([label, value]) => (<div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="font-display text-lg font-bold text-slate-900">{value.toLocaleString('en-IN')}</p>
                </div>))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Lifecycle passport" subtitle="Chronological custody events"/>
            <div className="p-5">
              {batch.passport?.length ? (<Timeline steps={batch.passport.map((p, i) => ({
                    label: prettyStatus(p.status),
                    done: i < batch.passport.length - 1 || batch.closed,
                    current: i === batch.passport.length - 1 && !batch.closed,
                    note: `${p.actor} · ${p.org} · ${formatDateTime(p.at)}${p.note ? ` — ${p.note}` : ''}`,
                }))}/>) : (<EmptyState title="No passport events"/>)}
            </div>
          </Card>

          {batch.returns && batch.returns.length > 0 && (<Card className="lg:col-span-3">
              <CardHeader title="Linked returns"/>
              <div className="divide-y divide-slate-100">
                {batch.returns.map((r) => (<div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="font-medium text-slate-800">{r.returnCode}</p>
                      <p className="text-xs text-slate-500">Requested qty {r.quantities?.requested ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={statusTone(r.status)}>{prettyStatus(r.status)}</Badge>
                      <Link to="/manufacturer/returns" className="text-sm font-semibold text-brand-800 hover:underline">
                        Manage
                      </Link>
                    </div>
                  </div>))}
              </div>
            </Card>)}
        </div>)}

      {!loading && !batch && !error && !paramBatch && (<EmptyState title="Search a batch" text="Enter a batch number to open its passport."/>)}
    </div>);
}
function Meta({ label, value }) {
    return (<div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 font-medium text-slate-800">{value}</p>
    </div>);
}
