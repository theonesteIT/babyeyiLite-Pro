import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import StockMovements from './pages/StockMovements';
import Requisitions from './pages/Requisitions';
import Suppliers from './pages/Suppliers';
import ShuleAvance from './pages/ShuleAvance';
import TichaAI from './pages/TichaAI';
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
      <Route path="/"             element={<ProtectedRoute title="Store Overview">    <Dashboard />      </ProtectedRoute>} />
      <Route path="/inventory"    element={<ProtectedRoute title="Inventory">         <Inventory />      </ProtectedRoute>} />
      <Route path="/movements"    element={<ProtectedRoute title="Stock Movements">   <StockMovements /> </ProtectedRoute>} />
      <Route path="/requisitions" element={<ProtectedRoute title="Requisitions">      <Requisitions />   </ProtectedRoute>} />
      <Route path="/suppliers"    element={<ProtectedRoute title="Suppliers">         <Suppliers />      </ProtectedRoute>} />
      <Route path="/shule-avance" element={<ProtectedRoute title="Shule Avance">      <ShuleAvance />    </ProtectedRoute>} />
      <Route path="/ticha-ai"     element={<ProtectedRoute title="TichaAI">           <TichaAI />        </ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider><Router><AppContent /></Router></AuthProvider>
  );
}

export default App;
