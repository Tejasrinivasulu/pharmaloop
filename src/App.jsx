import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import GuidePage from './pages/GuidePage';
import PharmacyLayout from './pages/pharmacy/PharmacyLayout';
import PharmacyDashboard from './pages/pharmacy/Dashboard';
import PharmacyInventory from './pages/pharmacy/Inventory';
import PharmacyScan from './pages/pharmacy/Scan';
import PharmacyExpiry from './pages/pharmacy/Expiry';
import CreateReturn from './pages/pharmacy/CreateReturn';
import PharmacyReturns from './pages/pharmacy/Returns';
import PharmacySettlement from './pages/pharmacy/Settlement';
import PharmacyNotifications from './pages/pharmacy/Notifications';
import PharmacyReports from './pages/pharmacy/Reports';
import PharmacyProfile from './pages/pharmacy/Profile';
import PharmacyBatchPassport from './pages/pharmacy/BatchPassport';
import DistributorLayout from './pages/distributor/DistributorLayout';
import DistributorDashboard from './pages/distributor/Dashboard';
import DistributorReturns from './pages/distributor/Returns';
import DistributorVerify from './pages/distributor/Verify';
import DistributorPickup from './pages/distributor/Pickup';
import DistributorDiscrepancies from './pages/distributor/Discrepancies';
import DistributorConsolidate from './pages/distributor/Consolidate';
import DistributorManifests from './pages/distributor/Manifests';
import DistributorSettlement from './pages/distributor/Settlement';
import DistributorReports from './pages/distributor/Reports';
import DistributorNotifications from './pages/distributor/Notifications';
import DistributorProfile from './pages/distributor/Profile';
import DistributorBatchPassport from './pages/distributor/BatchPassport';
import ManufacturerLayout from './pages/manufacturer/ManufacturerLayout';
import ManufacturerDashboard from './pages/manufacturer/Dashboard';
import ManufacturerReturns from './pages/manufacturer/Returns';
import ManufacturerBatchPassport from './pages/manufacturer/BatchPassport';
import ManufacturerReconciliation from './pages/manufacturer/Reconciliation';
import ManufacturerQuarantine from './pages/manufacturer/Quarantine';
import ManufacturerDisposal from './pages/manufacturer/DisposalManagement';
import ManufacturerDisposalVerification from './pages/manufacturer/DisposalVerification';
import ManufacturerSettlement from './pages/manufacturer/Settlement';
import ManufacturerAI from './pages/manufacturer/AIInsights';
import ManufacturerAlerts from './pages/manufacturer/Alerts';
import ManufacturerCertificates from './pages/manufacturer/Certificates';
import ManufacturerReports from './pages/manufacturer/Reports';
import ManufacturerNotifications from './pages/manufacturer/Notifications';
import ManufacturerProfile from './pages/manufacturer/Profile';
import ManufacturerAddMedicine from './pages/manufacturer/AddMedicine';
import ManufacturerStock from './pages/manufacturer/Stock';
import DistributorStock from './pages/distributor/Stock';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminOrganizations from './pages/admin/Organizations';
import AdminBatchSearch from './pages/admin/BatchSearch';
import AdminAllReturns from './pages/admin/AllReturns';
import AdminCompliance from './pages/admin/Compliance';
import AdminDiscrepancies from './pages/admin/Discrepancies';
import AdminInvestigations from './pages/admin/Investigations';
import AdminDisposalVerification from './pages/admin/DisposalVerification';
import AdminAiRiskAlerts from './pages/admin/AiRiskAlerts';
import AdminReports from './pages/admin/Reports';
import AdminAuditTrail from './pages/admin/AuditTrail';
import AdminUserManagement from './pages/admin/UserManagement';
import AdminSettings from './pages/admin/Settings';
export default function App() {
    return (<BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />}/>
          <Route path="/login" element={<LoginPage />}/>
          <Route path="/signup" element={<SignupPage />}/>
          <Route path="/guide" element={<GuidePage />}/>
          <Route path="/get-started" element={<Navigate to="/signup" replace/>}/>

          <Route element={<ProtectedRoute roles={['Pharmacy']}/>}>
            <Route path="/pharmacy" element={<PharmacyLayout />}>
              <Route index element={<PharmacyDashboard />}/>
              <Route path="inventory" element={<PharmacyInventory />}/>
              <Route path="scan" element={<PharmacyScan />}/>
              <Route path="expiry" element={<PharmacyExpiry />}/>
              <Route path="returns/new" element={<CreateReturn />}/>
              <Route path="returns" element={<PharmacyReturns />}/>
              <Route path="settlement" element={<PharmacySettlement />}/>
              <Route path="settlements" element={<PharmacySettlement />}/>
              <Route path="notifications" element={<PharmacyNotifications />}/>
              <Route path="reports" element={<PharmacyReports />}/>
              <Route path="profile" element={<PharmacyProfile />}/>
              <Route path="batch/:batchNumber" element={<PharmacyBatchPassport />}/>
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['Distributor']}/>}>
            <Route path="/distributor" element={<DistributorLayout />}>
              <Route index element={<DistributorDashboard />}/>
              <Route path="returns" element={<DistributorReturns />}/>
              <Route path="verify" element={<DistributorVerify />}/>
              <Route path="pickup" element={<DistributorPickup />}/>
              <Route path="discrepancies" element={<DistributorDiscrepancies />}/>
              <Route path="consolidate" element={<DistributorConsolidate />}/>
              <Route path="manifests" element={<DistributorManifests />}/>
              <Route path="settlement" element={<DistributorSettlement />}/>
              <Route path="stock" element={<DistributorStock />}/>
              <Route path="reports" element={<DistributorReports />}/>
              <Route path="notifications" element={<DistributorNotifications />}/>
              <Route path="profile" element={<DistributorProfile />}/>
              <Route path="batch/:batchNumber" element={<DistributorBatchPassport />}/>
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['Manufacturer']}/>}>
            <Route path="/manufacturer" element={<ManufacturerLayout />}>
              <Route index element={<ManufacturerDashboard />}/>
              <Route path="add-medicine" element={<ManufacturerAddMedicine />}/>
              <Route path="stock" element={<ManufacturerStock />}/>
              <Route path="returns" element={<ManufacturerReturns />}/>
              <Route path="batch" element={<ManufacturerBatchPassport />}/>
              <Route path="batch/:batchNumber" element={<ManufacturerBatchPassport />}/>
              <Route path="reconciliation" element={<ManufacturerReconciliation />}/>
              <Route path="quarantine" element={<ManufacturerQuarantine />}/>
              <Route path="disposal" element={<ManufacturerDisposal />}/>
              <Route path="disposal-verification" element={<ManufacturerDisposalVerification />}/>
              <Route path="settlement" element={<ManufacturerSettlement />}/>
              <Route path="ai" element={<ManufacturerAI />}/>
              <Route path="alerts" element={<ManufacturerAlerts />}/>
              <Route path="certificates" element={<ManufacturerCertificates />}/>
              <Route path="reports" element={<ManufacturerReports />}/>
              <Route path="notifications" element={<ManufacturerNotifications />}/>
              <Route path="profile" element={<ManufacturerProfile />}/>
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['Admin']}/>}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />}/>
              <Route path="organizations" element={<AdminOrganizations />}/>
              <Route path="batch-search" element={<AdminBatchSearch />}/>
              <Route path="batch/:batchNumber" element={<AdminBatchSearch />}/>
              <Route path="returns" element={<AdminAllReturns />}/>
              <Route path="compliance" element={<AdminCompliance />}/>
              <Route path="discrepancies" element={<AdminDiscrepancies />}/>
              <Route path="investigations" element={<AdminInvestigations />}/>
              <Route path="disposal" element={<AdminDisposalVerification />}/>
              <Route path="ai-alerts" element={<AdminAiRiskAlerts />}/>
              <Route path="reports" element={<AdminReports />}/>
              <Route path="audit" element={<AdminAuditTrail />}/>
              <Route path="users" element={<AdminUserManagement />}/>
              <Route path="settings" element={<AdminSettings />}/>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </AuthProvider>
    </BrowserRouter>);
}
