import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, Input, PageHeader, statusTone, } from '../../components/ui';
import { formatDate } from './format';
export default function PharmacyScan() {
    const [batchNumber, setBatchNumber] = useState('');
    const [unitCode, setUnitCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const onScan = async (e) => {
        e.preventDefault();
        const batch = batchNumber.trim();
        if (!batch) {
            setError('Enter a batch number or scan a barcode.');
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const unit = unitCode.trim();
            const qs = unit ? `?scan=${encodeURIComponent(unit)}` : '';
            const data = await api(`/api/batches/${encodeURIComponent(batch)}${qs}`);
            setResult(data);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : 'Scan failed');
        }
        finally {
            setLoading(false);
        }
    };
    const p = result?.passport;
    return (<div>
      <PageHeader title="Scan Medicine" subtitle="Verify batch passport and detect possible re-entry after disposal"/>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="p-5">
          <div className="mb-4 flex h-28 items-center justify-center rounded-2xl border border-dashed border-brand-300 bg-brand-50/60">
            <div className="text-center">
              <ScanLine className="mx-auto h-8 w-8 text-brand-700"/>
              <p className="mt-2 text-sm font-medium text-brand-800">Scanner mock</p>
              <p className="text-xs text-slate-500">Enter batch / unit code manually</p>
            </div>
          </div>
          <form className="space-y-3" onSubmit={onScan}>
            <Input label="Batch number" placeholder="e.g. PCM-2026-001" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} required/>
            <Input label="Unit code (optional)" placeholder="e.g. PCM-2026-001-U0488" value={unitCode} onChange={(e) => setUnitCode(e.target.value)}/>
            <Button type="submit" loading={loading} className="w-full">
              Scan &amp; verify
            </Button>
          </form>
          {error && (<div className="mt-4">
              <AlertBanner tone="danger" title="Scan error">
                {error}
              </AlertBanner>
            </div>)}
        </Card>

        <div className="space-y-4">
          {result?.reEntryAlert && (<AlertBanner tone="danger" title="Possible re-entry alert">
              {result.reEntryAlert.message}
            </AlertBanner>)}

          {!p && !loading && (<Card>
              <CardHeader title="Digital passport" subtitle="Results appear after a successful scan"/>
              <p className="px-5 pb-5 text-sm text-slate-500">
                Scanning a closed or disposed unit with a unit code will raise a re-entry check.
              </p>
            </Card>)}

          {p && (<Card>
              <CardHeader title={p.productName} subtitle={`${p.strength} · ${p.form}`} action={<Badge tone={statusTone(p.status)}>{p.status.replaceAll('_', ' ')}</Badge>}/>
              <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
                <Field label="Batch" value={p.batchNumber}/>
                <Field label="Manufacturer" value={p.manufacturer}/>
                <Field label="Mfg date" value={formatDate(p.manufacturingDate)}/>
                <Field label="Expiry" value={formatDate(p.expiryDate)}/>
                <Field label="Original qty" value={String(p.quantities.originalQty)}/>
                <Field label="Returned" value={String(p.quantities.returned)}/>
                <Field label="Disposed" value={String(p.quantities.disposed)}/>
                <Field label="Sale status" value={p.notForSale || p.closed ? 'NOT FOR SALE' : p.forSale ? 'Eligible' : 'Restricted'}/>
              </div>
              <div className="border-t border-slate-100 px-5 py-4">
                <Link to={`/pharmacy/batch/${encodeURIComponent(p.batchNumber)}`} className="text-sm font-semibold text-brand-800 hover:underline">
                  Open full passport →
                </Link>
              </div>
            </Card>)}
        </div>
      </div>
    </div>);
}
function Field({ label, value }) {
    return (<div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>);
}
