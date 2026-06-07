import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RepresentativeAuthProvider, useAuth } from './context/AuthContext';
import { RepresentativeDataProvider } from './context/RepresentativeContext';
import RepresentativeLayout from './components/Layout';
import RepresentativeDashboard from './pages/Dashboard';
import RepresentativeSchools from './pages/Schools';
import RepresentativeAnalytics from './pages/Analytics';
import RepresentativeFinance from './pages/Finance';
import FeesManagement from './pages/FeesManagement';
import StaffPayroll from './pages/StaffPayroll';
import FinancialAnalysis from './pages/FinancialAnalysis';
import Reports from './pages/Reports';
import BudgetAndExpense from './pages/BudgetAndExpense';
import RepresentativeAcademic from './pages/AcademicReports';
import RepresentativeDiscipline from './pages/Discipline';
import RepresentativeStoreInventory from './pages/StoreInventory';
import RepresentativeAttendance from './pages/Attendance';
import TeacherClassPeriodEntryExit from './pages/AttendanceModule/TeacherClassPeriodEntryExit';
import RepresentativeTransport from './pages/Transport';
import RepresentativeCommunication from './pages/Communication';
import RepresentativeInspections from './pages/Inspections';
import RepresentativeDocuments from './pages/Documents';
import RepresentativeSettings from './pages/Settings';
import RepresentativeInsights from './pages/Insights';
import { PORTAL } from './config/portal';
import { RepresentativeRequestOrder } from '../shared/procurement/portalWrappers';

const LoadingScreen = () => (
  <div className="min-h-screen bg-re-bg flex flex-col items-center justify-center gap-4 font-sans">
    <div
      className="w-12 h-12 rounded-2xl animate-spin border-4 border-amber-200 border-t-[#000435]"
      aria-hidden
    />
    <p className="text-re-text-muted text-sm font-bold uppercase tracking-widest animate-pulse">{PORTAL.loadingMessage}</p>
  </div>
);

const ProtectedRoute = ({ children, title }) => {
  const { manager, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!manager) return <Navigate to="/" replace />;
  return <RepresentativeLayout title={title}>{children}</RepresentativeLayout>;
};

function RepresentativeRoutesInner() {
  return (
    <Routes>
      <Route index element={<ProtectedRoute title="Dashboard"><RepresentativeDashboard /></ProtectedRoute>} />
      <Route path="schools" element={<ProtectedRoute title="Schools"><RepresentativeSchools /></ProtectedRoute>} />
      <Route path="analytics" element={<ProtectedRoute title="Analytics"><RepresentativeAnalytics /></ProtectedRoute>} />
      <Route path="insights" element={<ProtectedRoute title="AI insights"><RepresentativeInsights /></ProtectedRoute>} />
      <Route path="finance/fees" element={<ProtectedRoute title="Fees management"><FeesManagement /></ProtectedRoute>} />
      <Route path="finance/payroll" element={<ProtectedRoute title="Staff payroll"><StaffPayroll /></ProtectedRoute>} />
      <Route path="finance/analysis" element={<ProtectedRoute title="Financial analysis"><FinancialAnalysis /></ProtectedRoute>} />
      <Route path="finance/reports" element={<ProtectedRoute title="Reports & export"><Reports /></ProtectedRoute>} />
      <Route path="finance/budget" element={<ProtectedRoute title="Budget & expenses"><BudgetAndExpense /></ProtectedRoute>} />
      <Route path="finance" element={<ProtectedRoute title="Finance"><RepresentativeFinance /></ProtectedRoute>} />
      <Route path="academic" element={<ProtectedRoute title="Academic reports"><RepresentativeAcademic /></ProtectedRoute>} />
      <Route path="discipline" element={<ProtectedRoute title="Discipline"><RepresentativeDiscipline /></ProtectedRoute>} />
      <Route path="store" element={<ProtectedRoute title="Store & Inventory"><RepresentativeStoreInventory /></ProtectedRoute>} />
      <Route path="attendance" element={<ProtectedRoute title="Attendance"><RepresentativeAttendance /></ProtectedRoute>} />
      <Route path="attendance/teacher-period" element={<ProtectedRoute title="Teacher Period Attendance"><TeacherClassPeriodEntryExit /></ProtectedRoute>} />
      <Route path="transport" element={<ProtectedRoute title="Transport"><RepresentativeTransport /></ProtectedRoute>} />
      <Route path="communication" element={<ProtectedRoute title="Communication"><RepresentativeCommunication /></ProtectedRoute>} />
      <Route path="inspections" element={<ProtectedRoute title="Inspections"><RepresentativeInspections /></ProtectedRoute>} />
      <Route path="documents" element={<ProtectedRoute title="Documents"><RepresentativeDocuments /></ProtectedRoute>} />
      <Route path="settings" element={<ProtectedRoute title="Settings"><RepresentativeSettings /></ProtectedRoute>} />
      <Route path="purchase-requests" element={<ProtectedRoute title="Purchase Requests"><RepresentativeRequestOrder /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={PORTAL.basePath} replace />} />
    </Routes>
  );
}

export default function RepresentativePortalRoutes() {
  return (
    <RepresentativeAuthProvider>
      <RepresentativeDataProvider>
        <RepresentativeRoutesInner />
      </RepresentativeDataProvider>
    </RepresentativeAuthProvider>
  );
}
