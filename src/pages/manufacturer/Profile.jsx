import { Card, CardHeader, Badge, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
export default function Profile() {
    const { user } = useAuth();
    return (<div>
      <PageHeader title="Profile" subtitle="Signed-in manufacturer workspace identity"/>

      <Card className="max-w-xl">
        <CardHeader title="Account" subtitle="From authenticated session"/>
        <div className="space-y-4 p-5">
          <Row label="Name" value={user?.name || '—'}/>
          <Row label="Email" value={user?.email || '—'}/>
          <Row label="Role" value={<Badge tone="brand">{user?.role || 'Manufacturer'}</Badge>}/>
          <Row label="Organization" value={user?.org || '—'}/>
          <Row label="Org ID" value={user?.orgId || '—'}/>
        </div>
      </Card>
    </div>);
}
function Row({ label, value }) {
    return (<div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>);
}
