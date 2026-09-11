import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, Input, LoadingScreen, PageHeader, Timeline, statusTone, } from '../../components/ui';
export default function BatchPassport() {
    const { batchNumber: paramBatch } = useParams();
    const navigate = useNavigate();
    const [query, setQuery] = useState(paramBatch || '');
    const [passport, setPassport] = useState(null);
    const [reEntryAlert, setReEntryAlert] = useState(null);
    const [loading, setLoading] = useState(Boolean(paramBatch));
    const [error, setError] = useState('');
    const fetchBatch = async (batch) => {
        if (!batch.trim())
            return;
        setLoading(true);
        setError('');
        setReEntryAlert(null);
        try {
            const res = await api(`/api/batches/${encodeURIComponent(batch.trim())}`);
            setPassport(res.passport);
            setReEntryAlert(res.reEntryAlert);
            if (paramBatch !== batch.trim()) {
                navigate(`/distributor/batch/${encodeURIComponent(batch.trim())}`, { replace: true });
            }
        }
        catch (e) {
            setPassport(null);
            setError(e instanceof ApiError ? e.message : 'Batch not found');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (paramBatch) {
            setQuery(paramBatch);
            fetchBatch(paramBatch);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paramBatch]);
    return (<div>
      <PageHeader title="Batch Passport" subtitle="Full lifecycle identity for a medicine batch"/>

      <Card className="mb-6 max-w-xl">
        <CardHeader title="Lookup" subtitle="GET /api/batches/:batchNumber"/>
        <form className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end" onSubmit={(e) => {
            e.preventDefault();
            fetchBatch(query);
        }}>
          <div className="flex-1">
            <Input label="Batch number" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. PCM-2026-001"/>
          </div>
          <Button type="submit" loading={loading}>
            Open passport
          </Button>
        </form>
      </Card>

      {error && (<div className="mb-4">
          <AlertBanner tone="danger" title={error}/>
        </div>)}

      {loading && !passport && <LoadingScreen label="Loading batch passport…"/>}

      {passport && (<div className="space-y-6">
          {reEntryAlert && (<AlertBanner tone="danger" title="Possible re-entry">
              {reEntryAlert.message}
            </AlertBanner>)}

          <Card>
            <CardHeader title={passport.batchNumber} subtitle={`${passport.productName} ${passport.strength}`} action={<Badge tone={statusTone(passport.status)}>{passport.status}</Badge>}/>
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Expiry</p>
                <p className="mt-1 font-semibold text-slate-800">{passport.expiryDate}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Manufacturer</p>
                <p className="mt-1 font-semibold text-slate-800">{passport.manufacturer || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Flags</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {passport.closed && <Badge tone="neutral">Closed</Badge>}
                  {passport.notForSale && <Badge tone="danger">Not for sale</Badge>}
                  {passport.discrepancy && <Badge tone="warning">Discrepancy</Badge>}
                  {!passport.closed && !passport.notForSale && !passport.discrepancy && (<Badge tone="success">Clear</Badge>)}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Form</p>
                <p className="mt-1 font-semibold text-slate-800">{passport.form || '—'}</p>
              </div>
            </div>
          </Card>

          {passport.quantities && (<Card>
              <CardHeader title="Quantities"/>
              <div className="grid gap-3 p-5 sm:grid-cols-3 lg:grid-cols-5">
                {Object.entries(passport.quantities).map(([k, v]) => (<div key={k} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{k}</p>
                    <p className="mt-1 font-display text-xl font-bold text-slate-900">{v}</p>
                  </div>))}
              </div>
            </Card>)}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Related returns"/>
              <div className="p-5">
                {!passport.returns?.length ? (<p className="text-sm text-slate-500">No returns linked.</p>) : (<Timeline steps={passport.returns.map((r, i) => ({
                    label: `${r.returnCode} · ${r.status.replaceAll('_', ' ')}`,
                    note: `${r.pharmacyName || ''} · ${new Date(r.createdAt).toLocaleDateString()}`,
                    done: r.status === 'CLOSED',
                    current: i === 0 && r.status !== 'CLOSED',
                }))}/>)}
              </div>
            </Card>

            <Card>
              <CardHeader title="Alerts & certificates"/>
              <div className="space-y-4 p-5">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Alerts
                  </p>
                  {!passport.alerts?.length ? (<p className="text-sm text-slate-500">None</p>) : (<ul className="space-y-2">
                      {passport.alerts.map((a) => (<li key={a.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                          <Badge tone={statusTone(a.severity)}>{a.severity}</Badge>
                          <p className="mt-1 font-medium text-slate-800">{a.title}</p>
                          {a.message && <p className="text-xs text-slate-500">{a.message}</p>}
                        </li>))}
                    </ul>)}
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Certificates
                  </p>
                  {!passport.certificates?.length ? (<p className="text-sm text-slate-500">None</p>) : (<ul className="space-y-1 text-sm text-slate-700">
                      {passport.certificates.map((c) => (<li key={c.id}>
                          {c.certificateNo || c.id}
                          {c.type ? ` · ${c.type}` : ''}
                        </li>))}
                    </ul>)}
                </div>
              </div>
            </Card>
          </div>
        </div>)}
    </div>);
}
