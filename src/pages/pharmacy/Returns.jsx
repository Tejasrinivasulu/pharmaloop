import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Card, CardHeader, DataTable, EmptyState, LoadingScreen, PageHeader, Timeline, statusTone, } from '../../components/ui';
import { formatDate, formatDateTime } from './format';
export default function PharmacyReturns() {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState(null);
    useEffect(() => {
        api('/api/pharmacy/returns')
            .then((r) => setReturns(r.returns || []))
            .catch((e) => setError(e.message || 'Failed to load returns'))
            .finally(() => setLoading(false));
    }, []);
    if (loading)
        return <LoadingScreen label="Loading returns…"/>;
    if (error)
        return <AlertBanner tone="danger" title="Unable to load returns">{error}</AlertBanner>;
    return (<div>
      <PageHeader title="Return Tracking" subtitle="Lifecycle status from request through verified disposal" actions={<Link to="/pharmacy/returns/new" className="inline-flex items-center rounded-xl bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900">
            New return
          </Link>}/>

      <Card>
        <CardHeader title="Active & historical returns" subtitle={`${returns.length} total`}/>
        {returns.length === 0 ? (<EmptyState title="No returns" text="Submit a return request to start tracking."/>) : (<DataTable headers={['', 'Return', 'Medicine', 'Batch', 'Qty', 'Status', 'Updated']}>
            {returns.map((r) => {
                const open = expanded === r.id;
                const steps = (r.timeline || []).map((t, idx, arr) => ({
                    label: t.status.replaceAll('_', ' '),
                    done: idx < arr.length - 1 || r.closed,
                    current: idx === arr.length - 1 && !r.closed,
                    note: `${t.actor} · ${t.org} · ${formatDateTime(t.at)}${t.note ? ` — ${t.note}` : ''}`,
                }));
                return (<Fragment key={r.id}>
                  <tr className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <button type="button" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" onClick={() => setExpanded(open ? null : r.id)} aria-label={open ? 'Collapse' : 'Expand timeline'}>
                        {open ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.returnCode}</td>
                    <td className="px-4 py-3">
                      {r.productName} {r.strength}
                      {r.discrepancy && (<span className="ml-2">
                          <Badge tone="warning">Discrepancy</Badge>
                        </span>)}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/pharmacy/batch/${encodeURIComponent(r.batchNumber)}`} className="font-medium text-brand-800 hover:underline">
                        {r.batchNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{r.quantities.requested}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(r.status)}>{r.status.replaceAll('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(r.updatedAt)}</td>
                  </tr>
                  {open && (<tr className="bg-slate-50/60">
                      <td colSpan={7} className="px-6 py-4">
                        <p className="mb-3 text-sm text-slate-600">
                          Reason: {r.reason}
                        </p>
                        {steps.length === 0 ? (<p className="text-sm text-slate-500">No timeline events yet.</p>) : (<Timeline steps={steps}/>)}
                      </td>
                    </tr>)}
                </Fragment>);
            })}
          </DataTable>)}
      </Card>
    </div>);
}
