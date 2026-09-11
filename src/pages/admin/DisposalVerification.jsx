import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Card, CardHeader, DataTable, EmptyState, KpiCard, LoadingScreen, PageHeader, Timeline, statusTone, } from '../../components/ui';
import { prettyStatus } from './format';
const PIPELINE = [
    'DISPOSAL_REQUESTED',
    'DISPOSAL_COMPLETED',
    'EVIDENCE_SUBMITTED',
    'QUANTITY_RECONCILED',
    'DESTRUCTION_VERIFIED',
    'CLOSED',
];
function stageLabel(r) {
    if (r.closed || r.status === 'CLOSED')
        return 'Closed';
    if (r.destructionVerified || r.status === 'DESTRUCTION_VERIFIED')
        return 'Destruction verified';
    if (r.quantityReconciled || r.status === 'QUANTITY_RECONCILED')
        return 'Quantity reconciled';
    if (r.evidence || r.status === 'EVIDENCE_SUBMITTED')
        return 'Evidence submitted';
    if (r.disposalCompleted || r.status === 'DISPOSAL_COMPLETED') {
        return r.evidence ? 'Disposal completed' : 'Disposal claimed — verification pending';
    }
    if (r.status === 'DISPOSAL_REQUESTED')
        return 'Disposal requested';
    return prettyStatus(r.status);
}
export default function DisposalVerification() {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        api('/api/admin/returns')
            .then((r) => setReturns(r.returns || []))
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
            .finally(() => setLoading(false));
    }, []);
    const disposalCases = useMemo(() => returns.filter((r) => PIPELINE.includes(r.status) ||
        r.disposalCompleted ||
        r.destructionVerified ||
        !!r.evidence), [returns]);
    const pendingEvidence = disposalCases.filter((r) => r.disposalCompleted && !r.evidence && !r.closed).length;
    const pendingVerify = disposalCases.filter((r) => r.evidence && !r.destructionVerified && !r.closed).length;
    const verified = disposalCases.filter((r) => r.destructionVerified || r.closed).length;
    const missingCert = disposalCases.filter((r) => r.disposalCompleted && !r.certificate).length;
    if (loading)
        return <LoadingScreen label="Loading disposal monitor…"/>;
    if (error)
        return <AlertBanner tone="danger" title="Unable to load">{error}</AlertBanner>;
    return (<div className="space-y-6">
      <PageHeader title="Disposal verification" subtitle="Monitor evidence → reconciliation → destruction verified → closed. Claims alone are not closure."/>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="In disposal pipeline" value={disposalCases.length}/>
        <KpiCard label="Disposal claimed — pending evidence" value={pendingEvidence} accent="warning"/>
        <KpiCard label="Awaiting verification" value={pendingVerify} accent="warning"/>
        <KpiCard label="Missing certificates" value={missingCert} accent="danger"/>
      </div>

      <Card>
        <CardHeader title="Required verification chain"/>
        <div className="p-5">
          <Timeline steps={[
            { label: 'Disposal completed', done: true, note: 'Vendor / facility marks completion' },
            { label: 'Evidence submitted', done: true, note: 'Photos, docs, certificate linked' },
            { label: 'Quantity reconciled', done: true, note: 'Disposed qty matches custody math' },
            { label: 'Destruction verified', current: true, note: 'Regulator / authorized sign-off' },
            { label: 'Closed', note: 'Only after full chain — never Mark Destroyed shortcut' },
        ]}/>
          <p className="mt-3 text-sm text-slate-500">
            Verified closed: <span className="font-semibold text-verify-700">{verified}</span>
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Disposal cases"/>
        {disposalCases.length === 0 ? (<EmptyState title="No disposal cases"/>) : (<DataTable headers={[
                'Return',
                'Batch',
                'Product',
                'Stage',
                'Evidence',
                'Certificate',
                'Reconciled',
                'Verified',
                'Status',
            ]}>
            {disposalCases.map((r) => (<tr key={r.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{r.returnCode}</td>
                <td className="px-4 py-3">
                  <Link to={`/admin/batch-search?q=${encodeURIComponent(r.batchNumber)}`} className="font-mono text-xs text-brand-700 hover:underline">
                    {r.batchNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">{r.productName}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{stageLabel(r)}</td>
                <td className="px-4 py-3">
                  <Badge tone={r.evidence ? 'success' : 'warning'}>
                    {r.evidence ? 'Submitted' : 'Missing'}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {r.certificate?.certificateNo || '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={r.quantityReconciled ? 'success' : 'neutral'}>
                    {r.quantityReconciled ? 'Yes' : 'No'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={r.destructionVerified ? 'success' : 'warning'}>
                    {r.destructionVerified ? 'Yes' : 'Pending'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(r.status)}>{prettyStatus(r.status)}</Badge>
                </td>
              </tr>))}
          </DataTable>)}
      </Card>
    </div>);
}
