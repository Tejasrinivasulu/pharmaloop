import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, DataTable, EmptyState, Input, LoadingScreen, PageHeader, Select, statusTone, } from '../../components/ui';
const CREATABLE_ROLES = ['Distributor', 'Manufacturer', 'Admin'];
export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [orgs, setOrgs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formError, setFormError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Distributor');
    const [orgId, setOrgId] = useState('');
    const [orgName, setOrgName] = useState('');
    const [licenseNo, setLicenseNo] = useState('');
    const [region, setRegion] = useState('');
    const load = useCallback(async () => {
        const [usersRes, orgsRes] = await Promise.all([
            api('/api/admin/users'),
            api('/api/admin/organizations'),
        ]);
        setUsers(usersRes.users || []);
        setOrgs(orgsRes.organizations || []);
    }, []);
    useEffect(() => {
        load()
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
            .finally(() => setLoading(false));
    }, [load]);
    const orgsForRole = useMemo(() => orgs.filter((o) => o.type === role), [orgs, role]);
    useEffect(() => {
        setOrgId('');
    }, [role]);
    async function onCreate(e) {
        e.preventDefault();
        setFormError(null);
        setSuccess(null);
        if (!orgId && !orgName.trim()) {
            setFormError('Select an existing organization or enter a new organization name.');
            return;
        }
        setSaving(true);
        try {
            await api('/api/admin/users', {
                method: 'POST',
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    password,
                    role,
                    orgId: orgId || undefined,
                    orgName: orgId ? undefined : orgName.trim(),
                    licenseNo: orgId ? undefined : licenseNo.trim() || undefined,
                    region: orgId ? undefined : region.trim() || undefined,
                }),
            });
            setSuccess(`${role} account created for ${email.trim()}. They can sign in on the login page.`);
            setName('');
            setEmail('');
            setPassword('');
            setOrgId('');
            setOrgName('');
            setLicenseNo('');
            setRegion('');
            await load();
        }
        catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to create account');
        }
        finally {
            setSaving(false);
        }
    }
    if (loading)
        return <LoadingScreen label="Loading user directory…"/>;
    if (error)
        return <AlertBanner tone="danger" title="Unable to load users">{error}</AlertBanner>;
    return (<div className="space-y-6">
      <PageHeader title="User management" subtitle="Pharmacies self-register. Create Distributor and Manufacturer login accounts here."/>

      <AlertBanner tone="info" title="Account rules">
        Public signup is Pharmacy only. Use this page to issue Distributor, Manufacturer, or Admin
        logins. Demo password: <strong>demo123</strong>. Accounts are stored in MongoDB.
      </AlertBanner>

      <Card className="p-5">
        <h2 className="font-display text-lg font-bold text-slate-900">Add login account</h2>
        <p className="mt-1 text-sm text-slate-500">
          Create credentials for distributor or manufacturer partners (and additional admins).
        </p>

        <form onSubmit={onCreate} className="mt-4 space-y-3">
          {formError && (<AlertBanner tone="danger" title="Could not create account">
              {formError}
            </AlertBanner>)}
          {success && (<AlertBanner tone="success" title="Account created">
              {success}
            </AlertBanner>)}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
              {CREATABLE_ROLES.map((r) => (<option key={r} value={r}>
                  {r}
                </option>))}
            </Select>
            <Input label="Full name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahul Mehta"/>
            <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="partner@org.com"/>
            <Input label="Temporary password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters"/>
            <Select label="Organization" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              <option value="">Create new organization…</option>
              {orgsForRole.map((o) => (<option key={o.id} value={o.id}>
                  {o.name} ({o.licenseNo})
                </option>))}
            </Select>
            {!orgId && (<>
                <Input label="New organization name" required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder={`${role} company name`}/>
                <Input label="License no. (optional)" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} placeholder="License / registration"/>
                <Input label="Region (optional)" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="North Zone"/>
              </>)}
          </div>

          <Button type="submit" loading={saving}>
            Create account
          </Button>
        </form>
      </Card>

      <Card>
        {users.length === 0 ? (<EmptyState title="No users"/>) : (<DataTable headers={['Name', 'Email', 'Role', 'Organization', 'Region', 'License', 'Status']}>
            {users.map((u) => (<tr key={u.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge tone="brand">{u.role}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-700">{u.orgName}</td>
                <td className="px-4 py-3 text-slate-600">{u.region}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.licenseNo}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(u.status)}>{u.status}</Badge>
                </td>
              </tr>))}
          </DataTable>)}
      </Card>
    </div>);
}
