import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Books from './pages/Books';
import Borrowing from './pages/Borrowing';
import Returns from './pages/Returns';
import Members from './pages/Members';
import Reports from './pages/Reports';
import ShuleAvance from './pages/ShuleAvance';
import TichaAI from './pages/TichaAI';
import FeaturePlaceholders from './pages/FeaturePlaceholders';
import './index.css';
import { PORTAL } from './config/portal';

const LoadingScreen = () => (
  <div className="min-h-screen bg-re-bg flex flex-col items-center justify-center gap-4 font-sans">
    <div className="w-12 h-12 rounded-2xl animate-pulse" style={{ background: 'linear-gradient(135deg,#1E3A5F,#3D5A80)' }} />
    <p className="text-re-text-muted text-sm font-bold uppercase tracking-widest animate-pulse">{PORTAL.loadingMessage}</p>
  </div>
);

const ProtectedRoute = ({ children, title }) => {
  const { staff, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!staff) return <Navigate to="/login" />;
  return <Layout title={title}>{children}</Layout>;
};

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/"             element={<ProtectedRoute title="Library Overview">   <Dashboard />  </ProtectedRoute>} />
      <Route path="/books"        element={<ProtectedRoute title="Book Collection">    <Books />      </ProtectedRoute>} />
      <Route path="/borrowing"    element={<ProtectedRoute title="Active Loans">       <Borrowing />  </ProtectedRoute>} />
      <Route path="/returns"      element={<ProtectedRoute title="Returns History">    <Returns />    </ProtectedRoute>} />
      <Route path="/members"      element={<ProtectedRoute title="Library Members">    <Members />    </ProtectedRoute>} />
      <Route path="/reports"      element={<ProtectedRoute title="Library Reports">    <Reports />    </ProtectedRoute>} />
      <Route path="/shule-avance" element={<ProtectedRoute title="Shule Avance">       <ShuleAvance /></ProtectedRoute>} />
      <Route path="/ticha-ai"     element={<ProtectedRoute title="TichaAI">            <TichaAI />    </ProtectedRoute>} />
      <Route path="/settings"     element={<ProtectedRoute title="Settings">           <FeaturePlaceholders feature="Library Settings" icon="⚙️" /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return <AuthProvider><Router><AppContent /></Router></AuthProvider>;
}

export default App;
