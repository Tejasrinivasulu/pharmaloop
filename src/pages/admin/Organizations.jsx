import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, DataTable, EmptyState, LoadingScreen, PageHeader, statusTone, } from '../../components/ui';
import { formatDate } from './format';
export default function Organizations() {
    const [orgs, setOrgs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [msg, setMsg] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const load = () => api('/api/admin/organizations')
        .then((r) => setOrgs(r.organizations || []))
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
        .finally(() => setLoading(false));
    useEffect(() => {
        load();
    }, []);
    async function setStatus(id, status) {
        setBusyId(id);
        setError(null);
        setMsg(null);
        try {
            await api(`/api/admin/organizations/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            });
            setMsg(`Organization marked ${status}`);
            await load();
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : 'Update failed');
        }
        finally {
            setBusyId(null);
        }
    }
    if (loading)
        return <LoadingScreen label="Loading organizations…"/>;
    return (<div>
      <PageHeader title="Organizations" subtitle="Licensed pharmacies, distributors, manufacturers, and monitors on PharmaLoop"/>
      {error && (<div className="mb-4">
          <AlertBanner tone="danger" title="Error">
            {error}
          </AlertBanner>
        </div>)}
      {msg && (<div className="mb-4">
          <AlertBanner tone="success" title="Updated">
            {msg}
          </AlertBanner>
        </div>)}
      <Card>
        {orgs.length === 0 ? (<EmptyState title="No organizations registered"/>) : (<DataTable headers={[
                'Name',
                'Type',
                'License',
                'Region',
                'Status',
                'Users',
                'Returns',
                'Open alerts',
                'Registered',
                'Actions',
            ]}>
            {orgs.map((o) => (<tr key={o.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{o.name}</p>
                  <p className="text-xs text-slate-500">{o.contactEmail}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge tone="brand">{o.type}</Badge>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{o.licenseNo}</td>
                <td className="px-4 py-3 text-slate-700">{o.region}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-700">{o.userCount}</td>
                <td className="px-4 py-3 text-slate-700">{o.returnCount}</td>
                <td className="px-4 py-3">
                  {o.openAlerts > 0 ? (<Badge tone="danger">{o.openAlerts}</Badge>) : (<span className="text-slate-400">0</span>)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDate(o.registeredAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {o.status !== 'ACTIVE' && (<Button size="sm" variant="secondary" loading={busyId === o.id} onClick={() => setStatus(o.id, 'ACTIVE')}>
                        Activate
                      </Button>)}
                    {o.status !== 'UNDER_REVIEW' && (<Button size="sm" variant="secondary" loading={busyId === o.id} onClick={() => setStatus(o.id, 'UNDER_REVIEW')}>
                        Review
                      </Button>)}
                    {o.status !== 'SUSPENDED' && (<Button size="sm" variant="danger" loading={busyId === o.id} onClick={() => setStatus(o.id, 'SUSPENDED')}>
                        Suspend
                      </Button>)}
                  </div>
                </td>
              </tr>))}
          </DataTable>)}
      </Card>
    </div>);
}
