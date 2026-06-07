import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccountantAppRoutes } from '../../PortalRoutes';
import Login from './pages/Login';
import { PORTAL } from './config/portal';
import './index.css';

const ACCOUNTANT_BASENAME =
  typeof window !== 'undefined' && window.location.pathname.startsWith('/accountant')
    ? '/accountant'
    : '/';

const LoadingScreen = () => (
  <div className="min-h-screen bg-re-bg flex flex-col items-center justify-center gap-4 font-sans">
    <div
      className="w-12 h-12 rounded-2xl animate-pulse"
      style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)' }}
    />
    <p className="text-re-text-muted text-sm font-medium animate-pulse tracking-tight">
      {PORTAL.loadingMessage}
    </p>
  </div>
);

function AuthenticatedRoutes() {
  const { staff, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!staff) return <Navigate to="/login" replace />;
  return <AccountantAppRoutes />;
}

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<AuthenticatedRoutes />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router basename={ACCOUNTANT_BASENAME}>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
