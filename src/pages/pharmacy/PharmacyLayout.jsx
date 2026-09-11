import { ClipboardList, FileBarChart, LayoutDashboard, Package, RefreshCcw, ScanLine, Timer, UserRound, Wallet, } from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
export const pharmacyNav = [
    { to: '/pharmacy', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/pharmacy/inventory', label: 'Inventory', icon: Package },
    { to: '/pharmacy/scan', label: 'Scan Medicine', icon: ScanLine },
    { to: '/pharmacy/expiry', label: 'Expiry Alerts', icon: Timer },
    { to: '/pharmacy/returns/new', label: 'Return Requests', icon: ClipboardList },
    { to: '/pharmacy/returns', label: 'Return Tracking', icon: RefreshCcw, end: true },
    { to: '/pharmacy/settlement', label: 'Settlement', icon: Wallet },
    { to: '/pharmacy/reports', label: 'Reports', icon: FileBarChart },
    { to: '/pharmacy/profile', label: 'Profile', icon: UserRound },
];
export default function PharmacyLayout() {
    return <DashboardLayout title="Pharmacy" nav={pharmacyNav}/>;
}
