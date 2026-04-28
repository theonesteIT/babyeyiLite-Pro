import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ShuleAvance from './pages/ShuleAvance';
import TichaAI from './pages/TichaAI';
import EnglishClub from './pages/EnglishClub';
import Timetable from './pages/Timetable';
import Attendance from './pages/Attendance';
import ViewMarks from './pages/ViewMarks';
import DisciplineConfig from './pages/DisciplineConfig';
import LearnersConduct from './pages/LearnersConduct';
import ConductReports from './pages/ConductReports';
import StudentPermissions from './pages/StudentPermissions';
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
      <Route path="/ticha-ai" element={<ProtectedRoute title="TichaAI">           <TichaAI />                                                      </ProtectedRoute>} />
      <Route path="/english-club" element={<ProtectedRoute title="English Club">      <EnglishClub />                                                  </ProtectedRoute>} />

      {/* New sidebar pages */}
      <Route path="/students" element={<ProtectedRoute title="Learners & discipline"><LearnersConduct /></ProtectedRoute>} />
      <Route path="/timetable" element={<ProtectedRoute title="School schedule"><Timetable /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute title="Attendance">        <Attendance />                                                   </ProtectedRoute>} />
      <Route path="/marks/view" element={<ProtectedRoute title="Academic marks (view)"><ViewMarks /></ProtectedRoute>} />
      <Route path="/marks/record" element={<Navigate to="/students" replace />} />
      <Route path="/conduct/reports" element={<ProtectedRoute title="Conduct reports"><ConductReports /></ProtectedRoute>} />
      <Route path="/permissions" element={<ProtectedRoute title="Student permissions"><StudentPermissions /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute title="Discipline Config"><DisciplineConfig /></ProtectedRoute>} />


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
