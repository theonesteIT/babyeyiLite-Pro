import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ShuleAvance from './pages/ShuleAvance'
import TichaAI from './pages/TichaAI'
import EnglishClub from './pages/EnglishClub'
import Students from './pages/Students'
import AcademicPlanner from './pages/AcademicPlanner'
import RegistryOperations from './pages/RegistryOperations'
import Attendance from './pages/Attendance'
import GateAttendance from '../dos/pages/AttendanceModule/GateAttendance'
import AllGateLogs from './pages/AllGateLogs'
import RecordMarks from './pages/RecordMarks'
import ViewMarks from './pages/ViewMarks'
import Registry from './pages/Registry'
import FinanceCenter from './pages/FinanceCenter'
import FeePayments from './pages/FeePayments'
import BabyeyiWizard from './pages/BabyeyiWizard'
import HRCentral from './pages/HRCentral'
import Payroll from './pages/Payroll'
import StaffPayroll from './pages/StaffPayroll'
import AcademicReports from './pages/AcademicReports'
import ClassAcademicReport from './pages/ClassAcademicReport'
import StudentAttendanceReports from './pages/StudentAttendanceReports'
import StaffAttendanceReports from './pages/StaffAttendanceReports'
import DisciplineReports from './pages/DisciplineReports'
import SystemConfiguration from './pages/SystemConfiguration'
import PermissionsManager from './pages/PermissionsManager'
import SchoolLiteSuite from './pages/SchoolLiteSuite'
import SmartSchoolHardwarePage from './pages/SmartSchoolHardwarePage'
import StaffSmartAccessPage from './pages/StaffSmartAccessPage'
import ChatCenter from '../shared/pages/ChatCenter'
import { PORTAL } from './config/portal'
import { h } from './utils/href'

const LoadingScreen = () => (
  <div className="min-h-screen bg-re-bg flex flex-col items-center justify-center gap-4 font-sans">
    <div
      className="w-12 h-12 rounded-2xl animate-spin"
      style={{ background: 'linear-gradient(135deg,#1E3A5F,#FEBF10)' }}
    />
    <p className="text-re-text-muted text-sm font-bold uppercase tracking-widest animate-pulse">
      {PORTAL.loadingMessage}
    </p>
  </div>
)

const ProtectedRoute = ({ children, title }) => {
  const { manager, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!manager) return <Navigate to="/" replace />
  return <Layout title={title}>{children}</Layout>
}

/** Full school console: Pro school or explicit `pro.school_console.access` permission. */
function SchoolConsoleGate({ children }) {
  const { canAccessSchoolConsole } = useAuth()
  if (!canAccessSchoolConsole) return <Navigate to={h('/')} replace />
  return children
}

function ManagerRoutesInner() {
  return (
    <Routes>
      <Route index element={<ProtectedRoute title="Dashboard"><Dashboard /></ProtectedRoute>} />
      <Route
        path="school-console"
        element={
          <ProtectedRoute title="Full school console">
            <SchoolConsoleGate>
              <SchoolLiteSuite />
            </SchoolConsoleGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="smart-access"
        element={
          <ProtectedRoute title="Smart School Access">
            <SchoolConsoleGate>
              <SmartSchoolHardwarePage portalBase={PORTAL.basePath} accent="manager" />
            </SchoolConsoleGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="staff-smart-access"
        element={
          <ProtectedRoute title="Staff smart access">
            <SchoolConsoleGate>
              <StaffSmartAccessPage portalBase={PORTAL.basePath} accent="manager" />
            </SchoolConsoleGate>
          </ProtectedRoute>
        }
      />
      <Route path="avance" element={<ProtectedRoute title="Infrastructure Avance"><ShuleAvance /></ProtectedRoute>} />
      <Route path="manager-ai" element={<ProtectedRoute title="ManagerAI"><TichaAI /></ProtectedRoute>} />
      <Route path="english-club" element={<ProtectedRoute title="English Club"><EnglishClub /></ProtectedRoute>} />

      <Route path="students" element={<ProtectedRoute title="Students"><Students /></ProtectedRoute>} />
      <Route path="timetable" element={<ProtectedRoute title="Academic Planner"><AcademicPlanner /></ProtectedRoute>} />
      <Route path="operations" element={<ProtectedRoute title="School Operations"><RegistryOperations /></ProtectedRoute>} />
      <Route path="attendance" element={<ProtectedRoute title="Attendance"><Attendance /></ProtectedRoute>} />
      <Route path="attendance/gate" element={<ProtectedRoute title="Gate Attendance"><GateAttendance /></ProtectedRoute>} />
      <Route path="attendance/gate-logs" element={<ProtectedRoute title="All Gate Logs"><AllGateLogs /></ProtectedRoute>} />
      <Route path="registry" element={<ProtectedRoute title="School Registry"><Registry /></ProtectedRoute>} />
      <Route path="marks/view" element={<ProtectedRoute title="View Student Marks"><ViewMarks /></ProtectedRoute>} />
      <Route path="marks/record" element={<ProtectedRoute title="Record Marks"><RecordMarks /></ProtectedRoute>} />
      <Route path="finance" element={<ProtectedRoute title="Finance Center"><FinanceCenter /></ProtectedRoute>} />
      <Route path="hr" element={<ProtectedRoute title="HRCentral"><HRCentral /></ProtectedRoute>} />
      <Route path="payroll" element={<ProtectedRoute title="Payroll"><Payroll /></ProtectedRoute>} />
      <Route path="my-payroll" element={<ProtectedRoute title="My Payroll"><StaffPayroll /></ProtectedRoute>} />
      <Route path="finance/payments" element={<ProtectedRoute title="Student Fee Payments"><FeePayments /></ProtectedRoute>} />
      <Route path="finance/wizard" element={<ProtectedRoute title="Babyeyi Wizard"><BabyeyiWizard /></ProtectedRoute>} />

      <Route path="reports/academic" element={<ProtectedRoute title="Academic Reports"><AcademicReports /></ProtectedRoute>} />
      <Route path="reports/academic/class/:className" element={<ProtectedRoute title="Class Academic Report"><ClassAcademicReport /></ProtectedRoute>} />
      <Route path="reports/attendance/students" element={<ProtectedRoute title="Student Attendance Reports"><StudentAttendanceReports /></ProtectedRoute>} />
      <Route path="reports/attendance/staff" element={<ProtectedRoute title="Staff Attendance Reports"><StaffAttendanceReports /></ProtectedRoute>} />
      <Route path="reports/attendance" element={<Navigate to={h('/reports/attendance/students')} replace />} />
      <Route path="reports/discipline" element={<ProtectedRoute title="Student Discipline"><DisciplineReports /></ProtectedRoute>} />

      <Route path="settings" element={<ProtectedRoute title="System Configuration"><SystemConfiguration /></ProtectedRoute>} />
      <Route path="settings/gradebook" element={<Navigate to={h('/operations?tab=gradebook')} replace />} />
      <Route path="permissions" element={<ProtectedRoute title="Student Permissions"><PermissionsManager /></ProtectedRoute>} />
      <Route path="chat" element={<ProtectedRoute title="Chat center"><ChatCenter /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to={PORTAL.basePath} replace />} />
    </Routes>
  )
}

export default function ManagerPortalRoutes() {
  return (
    <AuthProvider>
      <ManagerRoutesInner />
    </AuthProvider>
  )
}
