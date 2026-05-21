import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ShuleAvance from './pages/ShuleAvance';
import {
  TichaDeals,
  TichaDealDetails,
  TichaDealPayments,
  TrackingTichaDeals,
} from './pages/staffTichaDeals';
import TichaAI from './pages/TichaAI';
import EnglishClub from './pages/EnglishClub';
import Students from './pages/Students';
import Timetable from './pages/Timetable';
import Attendance from './pages/Attendance';
import RecordMarks from './pages/RecordMarks';
import ViewMarks from './pages/ViewMarks';
import ConductOverview from './pages/ConductOverview';
import StaffPayroll from './pages/StaffPayroll';
import DisciplineSettings from './pages/DisciplineSettings';
import SetDisciplineMarks from './pages/SetDisciplineMarks';
import Permission from './pages/Permission';
import Requisitions from './pages/Requisitions';
import ChatCenter from '../../shared/pages/ChatCenter';
import { PORTAL } from './config/portal';

const LoadingScreen = () => (
  <div className="min-h-screen bg-[#FFFBF0] flex flex-col items-center justify-center gap-4 font-sans">
    <div
      className="w-12 h-12 rounded-2xl animate-pulse shadow-lg"
      style={{ background: 'linear-gradient(135deg,#FBBF24,#F59E0B)' }}
    />
    <p className="text-[#000435]/60 text-sm font-bold uppercase tracking-widest animate-pulse">
      {PORTAL.loadingMessage}
    </p>
  </div>
);

const LITE_LOGIN = '/login/lite';

const ProtectedRoute = ({ children, title }) => {
  const { teacher, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!teacher) return <Navigate to={LITE_LOGIN} replace />;
  return <Layout title={title}>{children}</Layout>;
};

function DisciplineRoutesInner() {
  return (
    <Routes>
      <Route index element={<ProtectedRoute title="Dashboard"><Dashboard /></ProtectedRoute>} />
      <Route path="shule-avance" element={<ProtectedRoute title="Shule Avance"><ShuleAvance /></ProtectedRoute>} />
      <Route path="ticha-deals/tracking" element={<ProtectedRoute title="Deal tracking"><TrackingTichaDeals /></ProtectedRoute>} />
      <Route path="ticha-deals/pay" element={<ProtectedRoute title="Pay deal"><TichaDealPayments /></ProtectedRoute>} />
      <Route path="ticha-deals/:id" element={<ProtectedRoute title="Deal details"><TichaDealDetails /></ProtectedRoute>} />
      <Route path="ticha-deals" element={<ProtectedRoute title="Ticha Deals"><TichaDeals /></ProtectedRoute>} />
      <Route path="ticha-ai" element={<ProtectedRoute title="TichaAI"><TichaAI /></ProtectedRoute>} />
      <Route path="english-club" element={<ProtectedRoute title="English Club"><EnglishClub /></ProtectedRoute>} />

      <Route path="students" element={<ProtectedRoute title="Students"><Students /></ProtectedRoute>} />
      <Route path="timetable" element={<ProtectedRoute title="Timetable"><Timetable /></ProtectedRoute>} />
      <Route path="attendance" element={<ProtectedRoute title="Attendance"><Attendance /></ProtectedRoute>} />
      <Route path="permission" element={<ProtectedRoute title="Permissions"><Permission /></ProtectedRoute>} />
      <Route path="requisitions" element={<ProtectedRoute title="Requisitions"><Requisitions /></ProtectedRoute>} />
      <Route path="my-payroll" element={<ProtectedRoute title="My Payroll"><StaffPayroll /></ProtectedRoute>} />
      <Route path="payroll" element={<Navigate to="my-payroll" replace />} />
      <Route path="marks/view" element={<ProtectedRoute title="View Student Marks"><ViewMarks /></ProtectedRoute>} />
      <Route path="marks/record" element={<ProtectedRoute title="Record Marks"><RecordMarks /></ProtectedRoute>} />
      <Route path="conduct" element={<ProtectedRoute title="Conduct overview"><ConductOverview /></ProtectedRoute>} />
      <Route path="discipline/settings" element={<ProtectedRoute title="Discipline Settings"><DisciplineSettings /></ProtectedRoute>} />
      <Route path="discipline/set-marks" element={<ProtectedRoute title="Set Discipline Marks"><SetDisciplineMarks /></ProtectedRoute>} />
      <Route path="chat" element={<ProtectedRoute title="Chat center"><ChatCenter /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to={PORTAL.basePath} replace />} />
    </Routes>
  );
}

export default function DisciplineLitePortalRoutes() {
  return (
    <AuthProvider>
      <DisciplineRoutesInner />
    </AuthProvider>
  );
}
