// ================================================================
// src/App.jsx
//
// ROUTES:
//   /                          → PublicPage (landing)
//   /schools                   → AllSchools (browse all published schools)
//   /school/:slug              → SchoolPublicRoute (individual school mini-site)
//   /login                     → Login
//   /parents/login             → ParentLogin (phone + password)
//   /parents/register          → ParentRegister (new parent account)
//   /parents/reset-phone       → ParentResetPhone (email self-service phone reset)
//   /parents/*                 → Parent dashboard (Home, Shop, …) (PARENT session)
//   /register                  → AddSchool (public registration)
//   /signup/super-admin        → SuperAdminSignup
//   /superadmin/signup         → SuperAdministratorSignup (first Super Admin credentials)
//   /signup/super-controller   → SuperControllerSignup (first Full System Controller only)
//   /superadmin/control        → SuperAdministratorControl (FULL_SYSTEM_CONTROLLER only)
//   /system-controller/dashboard → redirects to /superadmin/control
//   /superadmin/dashboard      → SuperAdminDashboard (SUPER_ADMIN only)
//   /superadmin/voucher-services → SuperAdminVoucherServices (SUPER_ADMIN | FULL_SYSTEM_CONTROLLER)
//   /superadmin/standard-shule-kits → SuperAdminStandardShuleKits (SUPER_ADMIN | FULL_SYSTEM_CONTROLLER)
//   /services/standard-shulekit → PublicStandardShuleKit (public)
//   /superadmin/register-agents → RegisterAgents (SUPER_ADMIN | FULL_SYSTEM_CONTROLLER)
//   /agent/*                   → AgentLayout (AGENT)
//   /add-school                → AddSchool (SUPER_ADMIN | FULL_SYSTEM_CONTROLLER)
//   /manage-requirements-prices→ ManageRequirementsPrices (same)
//   /requirement-prices-list   → RequirementPricesList (same)
//   /nesa-babyeyi-dashboard    → NESABABYEYIDashboard (NESA_ADMIN)
//   /district-babyeyi-dashboard→ DistrictBABYEYIDashboard (DEO)
//   /school-babyeyi-dashboard  → SchoolBabyeyiDashboard (SCHOOL_ADMIN | SCHOOL_MANAGER)
//   /accountant/*                → AccountantLayout (ACCOUNTANT) — dashboard, payment, reports
//   /hod/*                       → HodLayout (HOD) — students, discipline marks settings, reports
//   /pay-by-school             → PublicPayBySchool (guest: student code → term/year → fees → pay)
//   /babyeyi/verify/:docId     → BabyeyiVerifyPage
//   /unauthorized              → 403 page
// ================================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// ── Public pages ────────────────────────────────────────────────
import PublicPage        from './Pages/Public Page/PublicPage';
import FeaturesPage      from './Pages/Public Page/FeaturesPage';
import AllSchools        from './Pages/Public Page/AllSchools';
import SchoolPublicRoute from './Pages/Public Page/SchoolPublicRoute';
import PublicBabyeyiFinder from './Pages/Public Page/PublicBabyeyiFinder';
import SearchStudent from './Pages/Public Page/SearchStudent';
import PaymentsPage from './Pages/Public Page/payments';
import PublicPayBySchool from './Pages/Public Page/PublicPayBySchool';
import ShuleKitPay from './Pages/Public Page/ShuleKitPay';
import InvoiceVerify from './Pages/Public Page/InvoiceVerify';
import ApplicationStatusTracker from "./Pages/Public Page/ApplicationStatusTracker";
import SchoolRegistration from './Pages/Public Page/SchoolRegistration';
import SchoolManagerLogin from './Pages/Public Page/schoolManagerLogin';
import ServicePage from './Pages/Public Page/Service';
import FindAgent from './Pages/Public Page/FindAgent';
import AgentShop from './Pages/Public Page/AgentShop';
import AgentShopCheckout from './Pages/Public Page/AgentShopCheckout';
import PublicStandardShuleKit from './Pages/Public Page/PublicStandardShuleKit';
import PublicShulePapeterie from './Pages/Public Page/PublicShulePapeterie';
import StandardKitRequestFlow from './Pages/Public Page/StandardKitRequestFlow';
import PublicServiceDetail from './Pages/Public Page/PublicServiceDetail';
import StudentServiceCheckout from './Pages/Public Page/StudentServiceCheckout';
import PublicShoesVoucherFlow from './Pages/Public Page/PublicShoesVoucherFlow';
import PublicUniformVoucherRequestFlow from './Pages/Public Page/PublicUniformVoucherRequestFlow';
import PublicUniformVoucherTrack from './Pages/Public Page/PublicUniformVoucherTrack';

// ── Auth pages ──────────────────────────────────────────────────
import Login           from './Pages/Auth/Login';
import SuperAdminSignup from './Pages/Auth/SuperAdminSignup';
import SuperAdministratorControl from './Pages/SuperAdmin/SuperAdministratorControl';
import SuperAdministratorSignup from './Pages/SuperAdmin/SuperAdministratorSignup';
import SuperControllerSignup from './Pages/Auth/SuperControllerSignup';
import FullSystemControllerDashboard from './Pages/FullSystemController/FullSystemControllerDashboard';

// ── Role-gated dashboards ───────────────────────────────────────
import SuperAdminDashboard      from './Pages/SuperAdmin/SuperAdminPage';
import NESABABYEYIDashboard     from './Pages/Nesa Page/NESAPages/BabyeyiDashboard';
import DistrictBABYEYIDashboard from './Pages/District Page/DistrictPage/DistrictBabyeyiDashboard';
import SchoolBabyeyiDashboard   from './Pages/School Manager/components/SchoolBabyeyi';
import AccountantLayout       from './Pages/Accountant/AccountantLayout';
import AccountantDashboard    from './Pages/Accountant/AccountantDashboard';
import AccountantPaymentPage  from './Pages/Accountant/AccountantPaymentPage';
import AccountantReports      from './Pages/Accountant/AccountantReports';
import HodLayout              from './Pages/HeadOfDiscipline/HodLayout';
import HodStudentsPage        from './Pages/HeadOfDiscipline/HodStudentsPage';
import HodSettingsPage        from './Pages/HeadOfDiscipline/HodSettingsPage';
import HodReportsPage         from './Pages/HeadOfDiscipline/HodReportsPage';
import DosLayout              from './Pages/Dos/DosLayout';
import DosStudentsPage        from './Pages/Dos/DosStudentsPage';
import DosAcademicProgressPage from './Pages/Dos/DosAcademicProgressPage';
import DosSettingsPage        from './Pages/Dos/DosSettingsPage';
import DosReportsPage         from './Pages/Dos/DosReportsPage';
import StaffRoleDashboard     from './Pages/StaffPortal/StaffRoleDashboard';
import LibrarianPortalPage    from './Pages/StaffPortal/LibrarianPortalPage';
import StoreManagerPortalPage from './Pages/StaffPortal/StoreManagerPortalPage';
import GateOfficerPortalPage  from './Pages/StaffPortal/GateOfficerPortalPage';
import AddSchool                from './Pages/SuperAdmin/AddSchool';
import AddAllSchools            from './Pages/SuperAdmin/AddAllSchools';
import ManageRequirementsPrices from './Pages/SuperAdmin/manage_requirements_prices';
import RequirementPricesList    from './Pages/SuperAdmin/requirement_prices_list';
import RegisterAgents           from './Pages/SuperAdmin/RegisterAgents';
import SuperAdminVoucherServices from './Pages/SuperAdmin/SuperAdminVoucherServices';
import SuperAdminShoesVoucherManagement from './Pages/SuperAdmin/SuperAdminShoesVoucherManagement';
import SuperAdminUniformVoucherManagement from './Pages/SuperAdmin/SuperAdminUniformVoucherManagement';
import SuperAdminStandardShuleKits from './Pages/SuperAdmin/SuperAdminStandardShuleKits';
import SuperAdminShopProducts from './Pages/SuperAdmin/SuperAdminShopProducts';
import AgentLayout              from './Pages/Agent/AgentLayout';
import AgentDashboard           from './Pages/Agent/AgentDashboard';
import AgentSchoolsPage         from './Pages/Agent/AgentSchoolsPage';
import AgentReportsPage         from './Pages/Agent/AgentReportsPage';
import AgentServicesPage        from './Pages/Agent/AgentServicesPage';
import AgentSchoolFeesPage      from './Pages/Agent/AgentSchoolFeesPage';
import AgentSupportRequestsPage from './Pages/Agent/AgentSupportRequestsPage';
import AgentShopProductsPage    from './Pages/Agent/AgentShopProductsPage';
import AgentShopOrdersPage      from './Pages/Agent/AgentShopOrdersPage';
import AgentStandardKitRequestsPage from './Pages/Agent/AgentStandardKitRequestsPage';
import AgentUniformVoucherOrdersPage from './Pages/Agent/AgentUniformVoucherOrdersPage';
import SuperAdminStandardKitRequestsPage from './Pages/SuperAdmin/SuperAdminStandardKitRequestsPage';
import SuperAdminShuleAvanceOrgs from './Pages/SuperAdmin/SuperAdminShuleAvanceOrgs';
import ShuleAvancePartnerDashboard from './Pages/ShuleAvance/ShuleAvancePartnerDashboard';
import BabyeyiVerifyPage        from './Pages/School Manager/components/BabyeyiVerifyPage';
import ParentLogin              from './Pages/Parents/ParentLogin';
import ParentRegister           from './Pages/Parents/ParentRegister';
import ParentResetPhone         from './Pages/Parents/ParentResetPhone';
import ParentDashboardLayout    from './Pages/Parents/ParentDashboardLayout';
import ParentHome               from './Pages/Parents/Home';
import ParentShop               from './Pages/Parents/Shop';
import ParentShulecard          from './Pages/Parents/Shulecard';
import ParentAccount            from './Pages/Parents/Account';
import ParentProfile            from './Pages/Parents/Profile';
import ParentServices           from './Pages/Parents/Services';
import ParentClasskitOrder      from './Pages/Parents/ClasskitOrderFlow';
import ParentOrders             from './Pages/Parents/Orders';
import QuickPayStudentSelect    from './Pages/Parents/QuickPayStudentSelect';
import ParentPaymentsReport     from './Pages/Parents/PaymentsReport';
import InvoicesListPage         from './Pages/Shared/InvoicesListPage';
import { ParentShellProvider } from './context/ParentShellContext';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* ── Landing / Home ────────────────────────────────── */}
          <Route path="/"       element={<PublicPage />} />
          <Route path="/home"   element={<PublicPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          {/* Legacy redirect — kept for backward-compat */}
          <Route path="/public" element={<Navigate to="/" replace />} />

          {/* ── Public school browsing ────────────────────────── */}
          {/*
            AllSchools: fetches /api/mini-websites?status=published
            Cards link to /school/:slug
          */}
          <Route path="/schools"      element={<AllSchools />} />
          <Route path="/school/:slug" element={<SchoolPublicRoute />} />
          <Route path="/babyeyi-finder" element={<PublicBabyeyiFinder />} />
          <Route path="/public-pay/search-student" element={<SearchStudent />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/pay-by-school" element={<PublicPayBySchool />} />
          <Route path="/invoice-verify/:id" element={<InvoiceVerify />} />
          <Route path="/services" element={<ServicePage />} />
          <Route path="/find-agent" element={<FindAgent />} />
          <Route path="/agent-shop" element={<AgentShop />} />
          <Route path="/agent-shop/checkout" element={<AgentShopCheckout />} />
          <Route path="/services/standard-shulekit" element={<PublicStandardShuleKit />} />
          <Route path="/services/shulekit-pay" element={<ShuleKitPay />} />
          <Route path="/services/shule-papeterie" element={<PublicShulePapeterie />} />
          <Route path="/services/shoes-voucher" element={<PublicShoesVoucherFlow />} />
          <Route path="/services/uniform-voucher" element={<Navigate to="/services/uniform-voucher/request" replace />} />
          <Route path="/services/uniform-voucher/request" element={<PublicUniformVoucherRequestFlow />} />
          <Route path="/services/uniform-voucher/track" element={<PublicUniformVoucherTrack />} />
          <Route path="/standard-kit/request/:kitId" element={<StandardKitRequestFlow />} />
          <Route path="/services/item/:idOrCode" element={<PublicServiceDetail />} />
          <Route path="/services/checkout" element={<StudentServiceCheckout />} />
          <Route path="/track" element={<ApplicationStatusTracker />} />

          {/* ── Auth ──────────────────────────────────────────── */}
          <Route path="/login"              element={<Login />} />
          <Route path="/school-manager/login" element={<SchoolManagerLogin />} />
          <Route path="/parents/login"      element={<ParentLogin />} />
          <Route path="/parents/register"   element={<ParentRegister />} />
          <Route path="/parents/reset-phone" element={<ParentResetPhone />} />
          <Route path="/parents" element={
            <ProtectedRoute role="PARENT" redirectTo="/parents/login">
              <ParentShellProvider>
                <ParentDashboardLayout />
              </ParentShellProvider>
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<ParentHome />} />
            <Route path="shop" element={<ParentShop />} />
            <Route path="shulecard" element={<ParentShulecard />} />
            <Route path="account" element={<ParentAccount />} />
            <Route path="profile" element={<ParentProfile />} />
            <Route path="services" element={<ParentServices />} />
            <Route path="quick-pay" element={<QuickPayStudentSelect />} />
            <Route path="classkit" element={<ParentClasskitOrder />} />
            <Route path="orders" element={<ParentOrders />} />
            <Route path="payments-report" element={<ParentPaymentsReport />} />
          </Route>
          {/* Public school registration (no auth required) */}
          <Route path="/register"           element={<SchoolRegistration />} />
          <Route path="/signup/super-admin" element={<SuperAdminSignup />} />
          <Route path="/superadmin/signup" element={<SuperAdministratorSignup />} />
          <Route path="/signup/super-controller" element={<SuperControllerSignup />} />

          {/* ── Super Admin portal vs Full System Controller control dashboard ─ */}
          <Route path="/superadmin/dashboard" element={
            <ProtectedRoute role="SUPER_ADMIN">
              <SuperAdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/system-controller/dashboard" element={<FullSystemControllerDashboard />} />

          <Route path="/superadmin/control" element={
            <ProtectedRoute role="FULL_SYSTEM_CONTROLLER">
              <SuperAdministratorControl />
            </ProtectedRoute>
          } />

          <Route path="/add-school" element={
            <ProtectedRoute role={['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER']}>
              <AddSchool />
            </ProtectedRoute>
          } />

          <Route path="/add-all-schools" element={
            <ProtectedRoute role={['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER']}>
              <AddAllSchools />
            </ProtectedRoute>
          } />

          <Route path="/manage-requirements-prices" element={
            <ProtectedRoute role={['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER']}>
              <ManageRequirementsPrices />
            </ProtectedRoute>
          } />

          <Route path="/requirement-prices-list" element={
            <ProtectedRoute role={['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER']}>
              <RequirementPricesList />
            </ProtectedRoute>
          } />

          <Route path="/superadmin/register-agents" element={
            <ProtectedRoute role={['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER']}>
              <RegisterAgents />
            </ProtectedRoute>
          } />

          <Route path="/superadmin/voucher-services" element={
            <ProtectedRoute role={['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER']}>
              <SuperAdminVoucherServices />
            </ProtectedRoute>
          } />
          <Route path="/superadmin/shoes-vouchers" element={
            <ProtectedRoute role={['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER']}>
              <SuperAdminShoesVoucherManagement />
            </ProtectedRoute>
          } />
          <Route path="/superadmin/uniform-vouchers" element={
            <ProtectedRoute role={['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER']}>
              <SuperAdminUniformVoucherManagement />
            </ProtectedRoute>
          } />

          <Route path="/superadmin/standard-shule-kits" element={
            <ProtectedRoute role={['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER']}>
              <SuperAdminStandardShuleKits />
            </ProtectedRoute>
          } />
          <Route path="/superadmin/shop-products" element={
            <ProtectedRoute role={['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER']}>
              <SuperAdminShopProducts />
            </ProtectedRoute>
          } />
          <Route path="/superadmin/standard-kit-requests" element={
            <ProtectedRoute role={['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER']}>
              <SuperAdminStandardKitRequestsPage />
            </ProtectedRoute>
          } />

          <Route path="/superadmin/shule-avance-organizations" element={
            <ProtectedRoute role={['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER']}>
              <SuperAdminShuleAvanceOrgs />
            </ProtectedRoute>
          } />

          <Route path="/shule-avance/dashboard" element={
            <ProtectedRoute role="SHULE_AVANCE_PARTNER">
              <ShuleAvancePartnerDashboard />
            </ProtectedRoute>
          } />

          <Route path="/agent" element={
            <ProtectedRoute role="AGENT">
              <AgentLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AgentDashboard />} />
            <Route path="schools" element={<AgentSchoolsPage />} />
            <Route path="reports" element={<AgentReportsPage />} />
            <Route path="services" element={<AgentServicesPage />} />
            <Route path="school-fees" element={<AgentSchoolFeesPage />} />
            <Route path="support-requests" element={<AgentSupportRequestsPage />} />
            <Route path="shop-products" element={<AgentShopProductsPage />} />
            <Route path="shop-orders" element={<AgentShopOrdersPage />} />
            <Route path="standard-kit-requests" element={<AgentStandardKitRequestsPage />} />
            <Route path="uniform-voucher-orders" element={<AgentUniformVoucherOrdersPage />} />
          </Route>

          {/* ── NESA Admin ─────────────────────────────────────── */}
          <Route path="/nesa-babyeyi-dashboard" element={
            <ProtectedRoute role="NESA_ADMIN">
              <NESABABYEYIDashboard />
            </ProtectedRoute>
          } />

          {/* ── District Education Officer ─────────────────────── */}
          <Route path="/district-babyeyi-dashboard" element={
            <ProtectedRoute role="DEO">
              <DistrictBABYEYIDashboard />
            </ProtectedRoute>
          } />

          {/* ── School Manager / Admin ─────────────────────────── */}
          <Route path="/school-babyeyi-dashboard" element={
            <ProtectedRoute role={['SCHOOL_ADMIN', 'SCHOOL_MANAGER']}>
              <SchoolBabyeyiDashboard />
            </ProtectedRoute>
          } />
          <Route path="/invoices" element={
            <ProtectedRoute role={['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT']}>
              <InvoicesListPage />
            </ProtectedRoute>
          } />

          <Route path="/accountant" element={
            <ProtectedRoute role="ACCOUNTANT">
              <AccountantLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AccountantDashboard />} />
            <Route path="payment" element={<AccountantPaymentPage />} />
            <Route path="reports" element={<AccountantReports />} />
          </Route>

          <Route path="/hod" element={
            <ProtectedRoute role="HOD">
              <HodLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="students" replace />} />
            <Route path="students" element={<HodStudentsPage />} />
            <Route path="settings" element={<HodSettingsPage />} />
            <Route path="reports" element={<HodReportsPage />} />
          </Route>

          <Route path="/dos" element={
            <ProtectedRoute role="DOS">
              <DosLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="students" replace />} />
            <Route path="students" element={<DosStudentsPage />} />
            <Route path="progress" element={<DosAcademicProgressPage />} />
            <Route path="settings" element={<DosSettingsPage />} />
            <Route path="reports" element={<DosReportsPage />} />
          </Route>

          <Route path="/teacher/dashboard" element={
            <ProtectedRoute role="TEACHER">
              <StaffRoleDashboard roleCode="TEACHER" />
            </ProtectedRoute>
          } />

          <Route path="/library/dashboard" element={
            <ProtectedRoute role="LIBRARIAN">
              <LibrarianPortalPage />
            </ProtectedRoute>
          } />

          <Route path="/store/dashboard" element={
            <ProtectedRoute role="STORE_MANAGER">
              <StoreManagerPortalPage />
            </ProtectedRoute>
          } />

          <Route path="/gate/scanner" element={
            <ProtectedRoute role="GATE_OFFICER">
              <GateOfficerPortalPage />
            </ProtectedRoute>
          } />

          {/* ── Document verification (public) ────────────────── */}
          <Route path="/babyeyi/verify/:docId" element={<BabyeyiVerifyPage />} />
 <Route path="/babyeyi/verify" element={<BabyeyiVerifyPage />} />
          {/* ── 403 Unauthorized ───────────────────────────────── */}
          <Route path="/unauthorized" element={
            <div style={{
              minHeight: '100vh', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: '#0B1D3A',
            }}>
              <div style={{ textAlign: 'center', color: 'white', fontFamily: 'sans-serif' }}>
                <h1 style={{ fontSize: 48, marginBottom: 8 }}>403</h1>
                <p style={{ color: 'rgba(148,163,184,.7)' }}>You don&apos;t have access to this page.</p>
                <a href="/login" style={{ color: '#60a5fa', marginTop: 16, display: 'block' }}>← Back to Login</a>
              </div>
            </div>
          } />

          {/* ── Catch-all ─────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}