import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, EmptyState, Input, LoadingScreen, PageHeader, Timeline, statusTone, } from '../../components/ui';
import { formatDate, formatDateTime, prettyStatus } from './format';
export default function BatchSearch() {
    const { batchNumber: routeBatch } = useParams();
    const [params, setParams] = useSearchParams();
    const initialQ = routeBatch || params.get('q') || '';
    const [query, setQuery] = useState(initialQ);
    const [batch, setBatch] = useState(null);
    const [reEntry, setReEntry] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [scanUnit, setScanUnit] = useState(params.get('scan') || '');
    const load = useCallback(async (batchNumber, scan) => {
        const bn = batchNumber.trim();
        if (!bn)
            return;
        setLoading(true);
        setError(null);
        setReEntry(null);
        try {
            const qs = scan ? `?scan=${encodeURIComponent(scan)}` : '';
            const res = await api(`/api/batches/${encodeURIComponent(bn)}${qs}`);
            setBatch(res.passport);
            setReEntry(res.reEntryAlert);
            const next = new URLSearchParams();
            next.set('q', bn);
            if (scan)
                next.set('scan', scan);
            setParams(next, { replace: true });
        }
        catch (e) {
            setBatch(null);
            setError(e instanceof Error ? e.message : 'Batch not found');
        }
        finally {
            setLoading(false);
        }
    }, [setParams]);
    useEffect(() => {
        const bn = routeBatch || params.get('q') || '';
        const scan = params.get('scan');
        setQuery(bn);
        if (scan)
            setScanUnit(scan);
        if (bn)
            void load(bn, scan);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeBatch]);
    function onSearch(e) {
        e.preventDefault();
        void load(query);
    }
    function simulateScan() {
        if (!query.trim() || !scanUnit.trim()) {
            setError('Enter batch number and unit code to simulate a scan');
            return;
        }
        void load(query, scanUnit);
    }
    return (<div className="space-y-6">
      <PageHeader title="Batch search" subtitle="Passport timeline and closed-batch re-entry check for regulator review"/>

      <Card className="p-5">
        <form onSubmit={onSearch} className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input label="Batch number" placeholder="e.g. PCM-2026-A01 or AMX-2025-B02" value={query} onChange={(e) => setQuery(e.target.value)}/>
          <div className="flex items-end">
            <Button type="submit" loading={loading}>
              Search passport
            </Button>
          </div>
        </form>

        <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/60 p-4">
          <p className="font-display text-sm font-semibold text-orange-900">
            Simulate post-disposal scan (re-entry check)
          </p>
          <p className="mt-1 text-xs text-orange-800/80">
            After a return is closed, scanning a unit raises POSSIBLE_RE_ENTRY — investigate, do not
            auto-label fraud. Try unit codes like PCM-2026-A01-U0001.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input label="Unit code" value={scanUnit} onChange={(e) => setScanUnit(e.target.value)} placeholder="PCM-2026-A01-U0001"/>
            <div className="flex items-end">
              <Button type="button" variant="danger" onClick={simulateScan} loading={loading}>
                Simulate scan
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {loading && !batch && <LoadingScreen label="Loading passport…"/>}
      {error && <AlertBanner tone="danger" title="Search failed">{error}</AlertBanner>}
      {reEntry && (<AlertBanner tone="warning" title="Possible re-entry">
          {reEntry.message}{' '}
          <Link to={`/admin/investigations?alertId=${reEntry.id}&batch=${reEntry.batchNumber || ''}`} className="font-semibold underline">
            Open investigation
          </Link>
        </AlertBanner>)}

      {batch && (<Card>
          <CardHeader title={`${batch.productName} ${batch.strength}`} subtitle={`Batch ${batch.batchNumber} · ${prettyStatus(batch.status)}`}/>
          <div className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-slate-500">Expiry</p>
              <p className="font-medium">{formatDate(batch.expiryDate)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Flags</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {batch.notForSale && <Badge tone="danger">NOT FOR SALE</Badge>}
                {batch.closed && <Badge tone="neutral">CLOSED</Badge>}
                {batch.discrepancy && <Badge tone="warning">DISCREPANCY</Badge>}
                <Badge tone={statusTone(batch.status)}>{prettyStatus(batch.status)}</Badge>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Quantities</p>
              <p className="text-sm text-slate-700">
                Orig {batch.quantities.originalQty} · Dist {batch.quantities.distributed} · Ret{' '}
                {batch.quantities.returned} · Disp {batch.quantities.disposed}
              </p>
            </div>
          </div>
          <div className="p-5">
            <h3 className="mb-3 font-display text-sm font-semibold text-slate-800">Passport timeline</h3>
            {batch.passport?.length ? (<Timeline steps={batch.passport.map((e, i) => ({
                    label: prettyStatus(e.status),
                    done: i < batch.passport.length - 1,
                    current: i === batch.passport.length - 1,
                    note: `${e.note} · ${e.actor} · ${formatDateTime(e.at)}`,
                }))}/>) : (<EmptyState title="No passport events"/>)}
          </div>
        </Card>)}
    </div>);
}
