import { Activity, AlertTriangle, Building2, ClipboardList, FileSearch, FileText, LayoutDashboard, PackageSearch, Recycle, Scale, Settings, ShieldAlert, Users, } from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
const nav = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/organizations', label: 'Organizations', icon: Building2 },
    { to: '/admin/batch-search', label: 'Batch Search', icon: PackageSearch },
    { to: '/admin/returns', label: 'All Returns', icon: ClipboardList },
    { to: '/admin/compliance', label: 'Compliance Monitoring', icon: Scale },
    { to: '/admin/discrepancies', label: 'Discrepancies', icon: AlertTriangle },
    { to: '/admin/investigations', label: 'Investigations', icon: FileSearch },
    { to: '/admin/disposal', label: 'Disposal Verification', icon: Recycle },
    { to: '/admin/ai-alerts', label: 'AI Risk Alerts', icon: ShieldAlert },
    { to: '/admin/reports', label: 'Reports', icon: FileText },
    { to: '/admin/audit', label: 'Audit Trail', icon: Activity },
    { to: '/admin/users', label: 'User Management', icon: Users },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
];
export default function AdminLayout() {
    return <DashboardLayout title="Regulator / Admin" nav={nav}/>;
}
