import { AlertTriangle, ClipboardCheck, FileBarChart2, LayoutDashboard, PackageSearch, Layers, Truck, UserRound, Wallet, Warehouse, Boxes } from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
const nav = [
    { to: '/distributor', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/distributor/stock', label: 'Stock & Sell', icon: Boxes },
    { to: '/distributor/returns', label: 'Pharmacy Returns', icon: PackageSearch },
    { to: '/distributor/verify', label: 'Scan & Verify', icon: ClipboardCheck },
    { to: '/distributor/pickup', label: 'Pickup Management', icon: Truck },
    { to: '/distributor/discrepancies', label: 'Discrepancies', icon: AlertTriangle },
    { to: '/distributor/consolidate', label: 'Return Consolidation', icon: Layers },
    { to: '/distributor/manifests', label: 'Manufacturer Returns', icon: Warehouse },
    { to: '/distributor/settlement', label: 'Settlement', icon: Wallet },
    { to: '/distributor/reports', label: 'Reports', icon: FileBarChart2 },
    { to: '/distributor/profile', label: 'Profile', icon: UserRound },
];
export default function DistributorLayout() {
    return <DashboardLayout title="Distributor Ops" nav={nav}/>;
}
