import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Fees from './pages/Fees';
import Invoices from './pages/Invoices';
import InvoiceSettings from './pages/InvoiceSettings';
import Expenses from './pages/Expenses';
import Requisitions from './pages/Requisitions';
import PayrollHistory from './pages/PayrollHistory';
import PayrollConfig from './pages/PayrollConfig';
import ShuleAvance from './pages/ShuleAvance';
import FeaturePlaceholders from './pages/FeaturePlaceholders';
import './index.css';
import { PORTAL } from './config/portal';

// ── Loading screen ────────────────────────────────────────────
const LoadingScreen = () => (
  <div className="min-h-screen bg-re-bg flex flex-col items-center justify-center gap-4 font-sans">
    <div className="w-12 h-12 rounded-2xl animate-pulse"
      style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)' }} />
    <p className="text-re-text-muted text-sm font-bold uppercase tracking-widest animate-pulse">
      {PORTAL.loadingMessage}
    </p>
  </div>
);

// ── Protected Route ───────────────────────────────────────────
const ProtectedRoute = ({ children, title }) => {
  const { staff, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!staff) return <Navigate to="/login" />;
  return <Layout title={title}>{children}</Layout>;
};

// ── Routes ────────────────────────────────────────────────────
function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Core pages */}
      <Route path="/" element={<ProtectedRoute title="Dashboard">         <Dashboard />                                                    </ProtectedRoute>} />
      <Route path="/shule-avance" element={<ProtectedRoute title="Shule Avance">    <ShuleAvance />                                                  </ProtectedRoute>} />

      {/* Accountant modules */}
      <Route path="/fees" element={<ProtectedRoute title="Student Fees"><Fees /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute title="Invoices"><Invoices /></ProtectedRoute>} />
      <Route path="/invoices/settings" element={<ProtectedRoute title="Configure Invoices"><InvoiceSettings /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute title="School Expenses"><Expenses /></ProtectedRoute>} />
      <Route path="/requisitions" element={<ProtectedRoute title="Requisitions"><Requisitions /></ProtectedRoute>} />
      <Route path="/payroll" element={<Navigate to="/payroll/history" replace />} />
      <Route path="/payroll/history" element={<ProtectedRoute title="Payroll History"><PayrollHistory /></ProtectedRoute>} />
      <Route path="/payroll/config" element={<ProtectedRoute title="Configure Payroll"><PayrollConfig /></ProtectedRoute>} />

      {/* Keep settings route but use a placeholder until wired */}
      <Route path="/settings" element={<ProtectedRoute title="Settings"><FeaturePlaceholders feature="Settings" icon="⚙️" /></ProtectedRoute>} />


      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
