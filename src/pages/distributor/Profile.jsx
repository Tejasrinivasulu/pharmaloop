import { useAuth } from '../../context/AuthContext';
import { Badge, Card, CardHeader, PageHeader } from '../../components/ui';
export default function Profile() {
    const { user } = useAuth();
    return (<div>
      <PageHeader title="Profile" subtitle="Distributor organization account"/>

      <Card className="max-w-xl">
        <CardHeader title="Signed-in user" subtitle="From session /api/auth/me"/>
        <dl className="space-y-4 px-5 py-5 text-sm">
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
            <dt className="text-slate-500">Name</dt>
            <dd className="font-semibold text-slate-900">{user?.name || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-800">{user?.email || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
            <dt className="text-slate-500">Role</dt>
            <dd>
              <Badge tone="brand">{user?.role || 'Distributor'}</Badge>
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
            <dt className="text-slate-500">Organization</dt>
            <dd className="text-right font-semibold text-slate-900">{user?.org || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Org ID</dt>
            <dd className="font-mono text-xs text-slate-600">{user?.orgId || '—'}</dd>
          </div>
        </dl>
      </Card>
    </div>);
}
