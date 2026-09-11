import { useAuth } from '../../context/AuthContext';
import { Badge, Card, CardHeader, PageHeader } from '../../components/ui';
export default function PharmacyProfile() {
    const { user } = useAuth();
    if (!user) {
        return (<div>
        <PageHeader title="Profile"/>
        <p className="text-sm text-slate-500">Not signed in.</p>
      </div>);
    }
    return (<div>
      <PageHeader title="Profile" subtitle="Signed-in pharmacy operator"/>

      <Card className="max-w-lg">
        <CardHeader title={user.name} subtitle={user.email} action={<Badge tone="brand">{user.role}</Badge>}/>
        <dl className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Organization</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">{user.org}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Org ID</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">{user.orgId}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">User ID</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">{user.id}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Role</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">{user.role}</dd>
          </div>
        </dl>
      </Card>
    </div>);
}
