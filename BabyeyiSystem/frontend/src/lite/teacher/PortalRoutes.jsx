import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LiteTeacherRouteGuard from './components/LiteTeacherRouteGuard';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ShuleAvance from './pages/ShuleAvance';
import TichaDeals from './pages/TichaDeals';
import TichaDealDetails from './pages/TichaDealDetails';
import TichaDealPayments from './pages/TichaDealPayments';
import TrackingTichaDeals from './pages/TrackingTichaDeals';
import TichaAI from './pages/TichaAI';
import EnglishClub from './pages/EnglishClub';
import Students from './pages/Students';
import Timetable from './pages/Timetable';
import Attendance from './pages/Attendance';
import RoundRollCall from './pages/RoundRollCall';
import ExaminationEligibility from './pages/ExaminationEligibility';
import TeacherAttendanceView from './pages/TeacherAttendanceView';
import RecordMarks from './pages/RecordMarks';
import ViewMarks from './pages/ViewMarks';
import Requisitions from './pages/Requisitions';
import RequisitionsRes from './pages/RequisitionsRes';
import ChatCenter from './pages/ChatCenter';
import StaffPayroll from './pages/StaffPayroll';
import Permissions from './pages/Permissions';
import SchoolCalendar from './pages/SchoolCalendar';
import { PORTAL } from './config/portal';
import { h } from './utils/href';
import './index.css';

const LITE_LOGIN = '/login/lite';

const LoadingScreen = () => (
  <div className="min-h-screen bg-re-bg flex flex-col items-center justify-center gap-4 font-sans">
    <div
      className="w-12 h-12 rounded-2xl animate-pulse"
      style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)' }}
    />
    <p className="text-re-text-muted text-sm font-bold uppercase tracking-widest animate-pulse">
      Loading Shule Teacher...
    </p>
  </div>
);

const ProtectedRoute = ({ children, title }) => {
  const { teacher, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!teacher) return <Navigate to={LITE_LOGIN} replace />;
  return (
    <LiteTeacherRouteGuard>
      <Layout title={title}>{children}</Layout>
    </LiteTeacherRouteGuard>
  );
};

const HomeRoute = () => (
  <ProtectedRoute title="Dashboard">
    <Dashboard />
  </ProtectedRoute>
);

function TeacherRoutesInner() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route index element={<HomeRoute />} />
      <Route path="shule-avance" element={<ProtectedRoute title="Shule Avance"><ShuleAvance /></ProtectedRoute>} />
      <Route path="ticha-deals" element={<ProtectedRoute title="Ticha Deals"><TichaDeals /></ProtectedRoute>} />
      <Route path="ticha-deals/tracking" element={<ProtectedRoute title="Deal tracking"><TrackingTichaDeals /></ProtectedRoute>} />
      <Route path="ticha-deals/pay" element={<ProtectedRoute title="Pay deal"><TichaDealPayments /></ProtectedRoute>} />
      <Route path="ticha-deals/:id" element={<ProtectedRoute title="Deal Details"><TichaDealDetails /></ProtectedRoute>} />
      <Route path="ticha-ai" element={<ProtectedRoute title="TichaAI"><TichaAI /></ProtectedRoute>} />
      <Route path="english-club" element={<ProtectedRoute title="English Club"><EnglishClub /></ProtectedRoute>} />
      <Route path="students" element={<ProtectedRoute title="Students"><Students /></ProtectedRoute>} />
      <Route path="timetable" element={<ProtectedRoute title="Timetable"><Timetable /></ProtectedRoute>} />
      <Route path="attendance" element={<ProtectedRoute title="Attendance"><Attendance /></ProtectedRoute>} />
      <Route path="round-roll-call" element={<ProtectedRoute title="Round Roll Call"><RoundRollCall /></ProtectedRoute>} />
      <Route path="teacher-attendance" element={<ProtectedRoute title="Teacher Attendance"><TeacherAttendanceView /></ProtectedRoute>} />
      <Route path="requisitions" element={<ProtectedRoute title="Requisitions"><Requisitions /></ProtectedRoute>} />
      <Route path="requisitionsRes" element={<ProtectedRoute title="Requisitions"><RequisitionsRes /></ProtectedRoute>} />
      <Route path="chat" element={<ProtectedRoute title="Chat center"><ChatCenter /></ProtectedRoute>} />
      <Route path="payroll" element={<ProtectedRoute title="My Payroll"><StaffPayroll /></ProtectedRoute>} />
      <Route path="marks/view" element={<ProtectedRoute title="View Student Marks"><ViewMarks /></ProtectedRoute>} />
      <Route path="marks/record" element={<ProtectedRoute title="Record Marks"><RecordMarks /></ProtectedRoute>} />
      <Route path="exam-eligibility" element={<ProtectedRoute title="Examination list"><ExaminationEligibility /></ProtectedRoute>} />
      <Route path="permissions" element={<ProtectedRoute title="Permissions"><Permissions /></ProtectedRoute>} />
      <Route path="school-calendar" element={<ProtectedRoute title="School Calendar"><SchoolCalendar /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={PORTAL.basePath} replace />} />
    </Routes>
  );
}

export default function TeacherLitePortalRoutes() {
  return (
    <AuthProvider>
      <TeacherRoutesInner />
    </AuthProvider>
  );
}

export { h, PORTAL };
