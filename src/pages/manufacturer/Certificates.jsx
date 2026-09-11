import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Card, CardHeader, DataTable, EmptyState, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
import { formatDate, prettyStatus } from './format';
export default function Certificates() {
    const [returns, setReturns] = useState([]);
    const [issuedCount, setIssuedCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        Promise.all([
            api('/api/manufacturer/returns'),
            api('/api/manufacturer/dashboard'),
        ])
            .then(([ret, dash]) => {
            setReturns(ret.returns || []);
            setIssuedCount(dash.kpis?.certificatesIssued ?? 0);
        })
            .catch((e) => setError(e.message || 'Failed to load certificates'))
            .finally(() => setLoading(false));
    }, []);
    const certificates = useMemo(() => {
        const map = new Map();
        for (const r of returns) {
            if (r.certificate) {
                map.set(r.certificate.id, {
                    ...r.certificate,
                    returnCode: r.returnCode,
                    verified: r.destructionVerified || r.closed,
                });
            }
        }
        return [...map.values()].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
    }, [returns]);
    if (loading)
        return <LoadingScreen label="Loading certificates…"/>;
    if (error)
        return <AlertBanner tone="danger" title="Unable to load">{error}</AlertBanner>;
    return (<div>
      <PageHeader title="Certificates" subtitle={`${issuedCount || certificates.length} destruction / disposal certificates`}/>

      <Card>
        <CardHeader title="Issued certificates" subtitle="Linked from returns & evidence packs"/>
        {certificates.length === 0 ? (<EmptyState title="No certificates yet" text="Certificates are created when evidence is submitted."/>) : (<DataTable headers={['Certificate', 'Return', 'Batch', 'Product', 'Qty', 'Method', 'Verified by', 'Status']}>
            {certificates.map((c) => (<tr key={c.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-800">{c.certificateNo}</td>
                <td className="px-4 py-3">{c.returnCode}</td>
                <td className="px-4 py-3">
                  <Link to={`/manufacturer/batch/${encodeURIComponent(c.batchNumber)}`} className="font-medium text-brand-800 hover:underline">
                    {c.batchNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{c.productName}</td>
                <td className="px-4 py-3">{c.qty}</td>
                <td className="px-4 py-3">
                  <p>{c.method}</p>
                  <p className="text-xs text-slate-500">{c.facility}</p>
                </td>
                <td className="px-4 py-3">{c.verifiedBy}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(c.status)}>{prettyStatus(c.status)}</Badge>
                  {c.verified && (<p className="mt-1 text-xs font-semibold text-verify-700">Destruction verified</p>)}
                  <p className="mt-0.5 text-xs text-slate-400">{formatDate(c.issuedAt)}</p>
                </td>
              </tr>))}
          </DataTable>)}
      </Card>
    </div>);
}
