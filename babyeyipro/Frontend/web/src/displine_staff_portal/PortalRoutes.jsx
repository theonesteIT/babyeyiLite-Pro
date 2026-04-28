import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './frontend/src/context/AuthContext'
import Layout from './frontend/src/components/Layout'
import Dashboard from './frontend/src/pages/Dashboard'
import ShuleAvance from './frontend/src/pages/ShuleAvance'
import TichaAI from './frontend/src/pages/TichaAI'
import EnglishClub from './frontend/src/pages/EnglishClub'
import Timetable from './frontend/src/pages/Timetable'
import Attendance from './frontend/src/pages/Attendance'
import ViewMarks from './frontend/src/pages/ViewMarks'
import DisciplineConfig from './frontend/src/pages/DisciplineConfig'
import LearnersConduct from './frontend/src/pages/LearnersConduct'
import ConductReports from './frontend/src/pages/ConductReports'
import StudentPermissions from './frontend/src/pages/StudentPermissions'
import StaffPayroll from './frontend/src/pages/StaffPayroll'
import ChatCenter from '../shared/pages/ChatCenter'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-re-bg flex flex-col items-center justify-center gap-4 font-sans">
      <div className="w-12 h-12 rounded-2xl animate-pulse" style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)' }} />
      <p className="text-re-text-muted text-sm font-bold uppercase tracking-widest animate-pulse">
        Loading Discipline Staff Portal...
      </p>
    </div>
  )
}

function ProtectedRoute({ children, title }) {
  const { staff, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!staff) return <LoadingScreen />
  return <Layout title={title}>{children}</Layout>
}

function DisciplineStaffRoutesInner() {
  return (
    <Routes>
      <Route path="" element={<ProtectedRoute title="Dashboard"><Dashboard /></ProtectedRoute>} />
      <Route path="shule-avance" element={<ProtectedRoute title="Shule Avance"><ShuleAvance /></ProtectedRoute>} />
      <Route path="ticha-ai" element={<ProtectedRoute title="TichaAI"><TichaAI /></ProtectedRoute>} />
      <Route path="english-club" element={<ProtectedRoute title="English Club"><EnglishClub /></ProtectedRoute>} />
      <Route path="students" element={<ProtectedRoute title="Learners & discipline"><LearnersConduct /></ProtectedRoute>} />
      <Route path="timetable" element={<ProtectedRoute title="School schedule"><Timetable /></ProtectedRoute>} />
      <Route path="attendance" element={<ProtectedRoute title="Attendance"><Attendance /></ProtectedRoute>} />
      <Route path="my-payroll" element={<ProtectedRoute title="My Payroll"><StaffPayroll /></ProtectedRoute>} />
      <Route path="payroll" element={<Navigate to="my-payroll" replace />} />
      <Route path="marks/view" element={<ProtectedRoute title="Academic marks (view)"><ViewMarks /></ProtectedRoute>} />
      <Route path="marks/record" element={<Navigate to="students" replace />} />
      <Route path="conduct/reports" element={<ProtectedRoute title="Conduct reports"><ConductReports /></ProtectedRoute>} />
      <Route path="permissions" element={<ProtectedRoute title="Student permissions"><StudentPermissions /></ProtectedRoute>} />
      <Route path="settings" element={<ProtectedRoute title="Discipline Config"><DisciplineConfig /></ProtectedRoute>} />
      <Route path="chat" element={<ProtectedRoute title="Chat center"><ChatCenter /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/discipline-staff" replace />} />
    </Routes>
  )
}

export default function DisciplineStaffPortalRoutes() {
  return (
    <AuthProvider>
      <DisciplineStaffRoutesInner />
    </AuthProvider>
  )
}
