import { AlertTriangle, Brain, ClipboardCheck, FileBarChart, FileCheck2, LayoutDashboard, PackagePlus, PackageSearch, Scale, ShieldAlert, Trash2, UserRound, Wallet, Warehouse, Boxes } from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
export const manufacturerNav = [
    { to: '/manufacturer', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/manufacturer/add-medicine', label: 'Add Medicine', icon: PackagePlus },
    { to: '/manufacturer/stock', label: 'Warehouse & Sell', icon: Boxes },
    { to: '/manufacturer/returns', label: 'Return Management', icon: ClipboardCheck },
    { to: '/manufacturer/batch', label: 'Batch Passport', icon: PackageSearch },
    { to: '/manufacturer/reconciliation', label: 'Quantity Reconciliation', icon: Scale },
    { to: '/manufacturer/quarantine', label: 'Quarantine', icon: Warehouse },
    { to: '/manufacturer/disposal', label: 'Disposal Management', icon: Trash2 },
    { to: '/manufacturer/disposal-verification', label: 'Disposal Verification', icon: ShieldAlert },
    { to: '/manufacturer/settlement', label: 'Settlement', icon: Wallet },
    { to: '/manufacturer/ai', label: 'AI Insights', icon: Brain },
    { to: '/manufacturer/alerts', label: 'Alerts & Investigations', icon: AlertTriangle },
    { to: '/manufacturer/certificates', label: 'Certificates', icon: FileCheck2 },
    { to: '/manufacturer/reports', label: 'Reports', icon: FileBarChart },
    { to: '/manufacturer/profile', label: 'Profile', icon: UserRound },
];
export default function ManufacturerLayout() {
    return <DashboardLayout title="Manufacturer" nav={manufacturerNav}/>;
}
