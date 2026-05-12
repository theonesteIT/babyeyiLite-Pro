import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import SmartSchoolHardwarePage from '../manager/pages/SmartSchoolHardwarePage'
import StaffSmartAccessPage from '../manager/pages/StaffSmartAccessPage'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ShuleAvance from './pages/ShuleAvance'
import TichaAI from './pages/TichaAI'
import EnglishClub from './pages/EnglishClub'
import Students from './pages/Students'
import Timetable from './pages/Timetable'
import Attendance from './pages/Attendance'
import TeacherClassPeriodEntryExit from './pages/AttendanceModule/TeacherClassPeriodEntryExit'
import RecordMarks from './pages/RecordMarks'
import ViewMarks from './pages/ViewMarks'
import AcademicPlanning from './pages/AcademicPlanning'
import DosAcademicProgressPage from './pages/DosAcademicProgressPage'
import DosSettingsPage from './pages/DosSettingsPage'
import DosReportsPage from './pages/DosReportsPage'
import TeacherRequisitionReports from './pages/TeacherRequisitionReports'
import PermissionsManager from '../manager/pages/PermissionsManager'
import DosStudentPermissions from './pages/DosStudentPermissions'
import DosTeacherStaffPermissions from './pages/DosTeacherStaffPermissions'
import LessonPlanReportsPage from './pages/LessonPlanReportsPage'
import SchoolCalendarPage from '../shared/pages/SchoolCalendarPage'
import DosOchreHero from './components/DosOchreHero'
import dosApi from './services/api'
import DosStudentRecordsPage from './pages/DosStudentRecordsPage'
import StaffPayroll from './pages/StaffPayroll'
import ChatCenter from '../shared/pages/ChatCenter'
import { PORTAL } from './config/portal'
import { h } from './utils/href'

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
)

const ProtectedRoute = ({ children, title }) => {
  const { teacher, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!teacher) return <Navigate to="/" replace />
  return <Layout title={title}>{children}</Layout>
}

function ProSchoolGate({ children }) {
  const { canAccessSchoolConsole } = useAuth()
  if (!canAccessSchoolConsole) return <Navigate to={h('/')} replace />
  return children
}

/** Babyeyi Lite–style DOS tools: require an active Pro school subscription. */
function ProDosGate({ children }) {
  const { proAccessEffective, teacher, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!teacher) return <Navigate to="/" replace />
  if (!proAccessEffective) return <Navigate to={h('/')} replace />
  return children
}

function DosRoutesInner() {
  return (
    <Routes>
      <Route index element={<ProtectedRoute title="Dashboard"><Dashboard /></ProtectedRoute>} />
      <Route path="shule-avance" element={<ProtectedRoute title="Shule Avance"><ShuleAvance /></ProtectedRoute>} />
      <Route path="ticha-ai" element={<ProtectedRoute title="TichaAI"><TichaAI /></ProtectedRoute>} />
      <Route path="english-club" element={<ProtectedRoute title="English Club"><EnglishClub /></ProtectedRoute>} />

      <Route path="students" element={<ProtectedRoute title="Students"><Students /></ProtectedRoute>} />
      <Route
        path="academic-setup"
        element={
          <ProtectedRoute title="Staff & timetable">
            <AcademicPlanning />
          </ProtectedRoute>
        }
      />
      <Route path="timetable" element={<ProtectedRoute title="Timetable"><Timetable /></ProtectedRoute>} />
      <Route path="attendance" element={<ProtectedRoute title="Attendance"><Attendance /></ProtectedRoute>} />
      <Route
        path="teacher-period-attendance"
        element={
          <ProtectedRoute title="TeacherPeriod Attendance">
            <TeacherClassPeriodEntryExit />
          </ProtectedRoute>
        }
      />
      <Route path="my-payroll" element={<ProtectedRoute title="My Payroll"><StaffPayroll /></ProtectedRoute>} />
      <Route path="payroll" element={<Navigate to="my-payroll" replace />} />
      <Route path="marks/view" element={<ProtectedRoute title="View Student Marks"><ViewMarks /></ProtectedRoute>} />
      <Route path="marks/record" element={<ProtectedRoute title="Record Marks"><RecordMarks /></ProtectedRoute>} />

      <Route
        path="smart-access"
        element={
          <ProtectedRoute title="Smart School Access">
            <ProSchoolGate>
              <SmartSchoolHardwarePage portalBase={PORTAL.basePath} accent="dos" />
            </ProSchoolGate>
          </ProtectedRoute>
        }
      />

      <Route
        path="staff-smart-access"
        element={
          <ProtectedRoute title="Staff smart access">
            <ProSchoolGate>
              <StaffSmartAccessPage portalBase={PORTAL.basePath} accent="dos" teachersOnly />
            </ProSchoolGate>
          </ProtectedRoute>
        }
      />

      <Route
        path="student-records"
        element={
          <ProtectedRoute title="Student registry">
            <ProDosGate>
              <DosStudentRecordsPage />
            </ProDosGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="progress"
        element={
          <ProtectedRoute title="Academic progress">
            <ProDosGate>
              <DosAcademicProgressPage />
            </ProDosGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="dos-settings"
        element={
          <ProtectedRoute title="DOS settings">
            <ProDosGate>
              <DosSettingsPage />
            </ProDosGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="reports"
        element={
          <ProtectedRoute title="DOS reports">
            <ProDosGate>
              <DosReportsPage />
            </ProDosGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="teacher-requisitions"
        element={
          <ProtectedRoute title="Teacher requisitions report">
            <TeacherRequisitionReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="teacher-permissions"
        element={
          <ProtectedRoute title="Student permissions">
            <DosStudentPermissions />
          </ProtectedRoute>
        }
      />
      <Route
        path="lesson-plan-reports"
        element={
          <ProtectedRoute title="Lesson plan reports">
            <LessonPlanReportsPage />
          </ProtectedRoute>
        }
      />
      <Route path="staff-permissions" element={<ProtectedRoute title="Staff permissions"><DosTeacherStaffPermissions /></ProtectedRoute>} />
      <Route path="school-calendar" element={<ProtectedRoute title="School calendar"><SchoolCalendarPage api={dosApi} HeroComponent={DosOchreHero} heroProps={{ eyebrow: 'Academic', titleLine: 'School', titleAccent: 'Calendar', subtitle: 'View school events, holidays, exams, and important dates.' }} /></ProtectedRoute>} />
      <Route path="chat" element={<ProtectedRoute title="Chat center"><ChatCenter /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to={PORTAL.basePath} replace />} />
    </Routes>
  )
}

export default function DosPortalRoutes() {
  return (
    <AuthProvider>
      <DosRoutesInner />
    </AuthProvider>
  )
}
