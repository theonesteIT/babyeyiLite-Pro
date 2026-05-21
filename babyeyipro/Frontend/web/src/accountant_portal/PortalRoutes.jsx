import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './frontend/src/context/AuthContext'
import Layout from './frontend/src/components/Layout'
import Dashboard from './frontend/src/pages/Dashboard'
import Fees from './frontend/src/pages/Fees'
import Invoices from './frontend/src/pages/Invoices'
import InvoiceSettings from './frontend/src/pages/InvoiceSettings'
import Expenses from './frontend/src/pages/Expenses'
import Requisitions from './frontend/src/pages/Requisitions'
import PayrollHistory from './frontend/src/pages/PayrollHistory'
import PayrollConfig from './frontend/src/pages/PayrollConfig'
import StaffPayroll from './frontend/src/pages/StaffPayroll'
import ShuleAvance from './frontend/src/pages/ShuleAvance'
import PersonalShuleAvance from './frontend/src/pages/PersonalShuleAvance'
import {
  TichaDeals,
  TichaDealDetails,
  TichaDealPayments,
  TrackingTichaDeals,
} from './frontend/src/pages/staffTichaDeals'
import FeaturePlaceholders from './frontend/src/pages/FeaturePlaceholders'
import BabyeyiFees from './frontend/src/pages/BabyeyiFees'
import ExaminationList from './frontend/src/pages/ExaminationList'
import SchoolBudget from './frontend/src/pages/schoolBugdet'
import ActionPlanManagement from './frontend/src/pages/actionPlan/ActionPlanManagement'
import SalaryPayment from './frontend/src/pages/SalaryPayment'
import ChatCenter from '../shared/pages/ChatCenter'
import SchoolCalendarPage from '../shared/pages/SchoolCalendarPage'
import AccountantOchreHero from './frontend/src/components/AccountantOchreHero'
import accountantApi from './frontend/src/services/api'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-re-bg flex flex-col items-center justify-center gap-4 font-sans">
      <div className="w-12 h-12 rounded-2xl animate-pulse" style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)' }} />
      <p className="text-re-text-muted text-sm font-bold uppercase tracking-widest animate-pulse">
        Loading Accountant Portal...
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

function AccountantRoutesInner() {
  return (
    <Routes>
      <Route path="" element={<ProtectedRoute title="Dashboard"><Dashboard /></ProtectedRoute>} />
      <Route path="shule-avance" element={<ProtectedRoute title="Avance approvals"><ShuleAvance /></ProtectedRoute>} />
      <Route
        path="my-shule-avance"
        element={<ProtectedRoute title="My Shule Avance"><PersonalShuleAvance /></ProtectedRoute>}
      />
      <Route path="ticha-deals/tracking" element={<ProtectedRoute title="Deal tracking"><TrackingTichaDeals /></ProtectedRoute>} />
      <Route path="ticha-deals/pay" element={<ProtectedRoute title="Pay deal"><TichaDealPayments /></ProtectedRoute>} />
      <Route path="ticha-deals/:id" element={<ProtectedRoute title="Deal details"><TichaDealDetails /></ProtectedRoute>} />
      <Route path="ticha-deals" element={<ProtectedRoute title="Ticha Deals"><TichaDeals /></ProtectedRoute>} />

      <Route path="fees" element={<ProtectedRoute title="Student Fees"><Fees /></ProtectedRoute>} />
      <Route
        path="fees/babyeyi-fees"
        element={<ProtectedRoute title="Babyeyi fee cards"><BabyeyiFees /></ProtectedRoute>}
      />
      <Route
        path="examination-list"
        element={<ProtectedRoute title="Examination list"><ExaminationList /></ProtectedRoute>}
      />
      <Route
        path="examination_list"
        element={<ProtectedRoute title="Examination list"><ExaminationList /></ProtectedRoute>}
      />
      <Route path="invoices" element={<ProtectedRoute title="Invoices"><Invoices /></ProtectedRoute>} />
      <Route path="invoices/settings" element={<ProtectedRoute title="Configure Invoices"><InvoiceSettings /></ProtectedRoute>} />
      <Route path="expenses" element={<ProtectedRoute title="School Expenses"><Expenses /></ProtectedRoute>} />
      <Route path="requisitions" element={<ProtectedRoute title="Requisitions"><Requisitions /></ProtectedRoute>} />
      <Route
        path="school-budget"
        element={<ProtectedRoute title="School Budget"><SchoolBudget /></ProtectedRoute>}
      />
      <Route
        path="action-plan"
        element={<ProtectedRoute title="School Action Plan"><ActionPlanManagement /></ProtectedRoute>}
      />
      <Route path="payroll" element={<Navigate to="payroll/history" replace />} />
      <Route path="payroll/history" element={<ProtectedRoute title="Payroll History"><PayrollHistory /></ProtectedRoute>} />
      <Route path="payroll/config" element={<ProtectedRoute title="Configure Payroll"><PayrollConfig /></ProtectedRoute>} />
      <Route path="payroll/salary-payment" element={<ProtectedRoute title="Salary Payment"><SalaryPayment /></ProtectedRoute>} />
      <Route path="my-payroll" element={<ProtectedRoute title="My Payroll"><StaffPayroll /></ProtectedRoute>} />
      <Route path="school-calendar" element={<ProtectedRoute title="School Calendar"><SchoolCalendarPage api={accountantApi} HeroComponent={AccountantOchreHero} heroProps={{ eyebrow: 'School', titleLine: 'School', titleAccent: 'Calendar', subtitle: 'View school events, holidays, exams, and important dates.' }} /></ProtectedRoute>} />
      <Route path="chat" element={<ProtectedRoute title="Chat center"><ChatCenter /></ProtectedRoute>} />

      <Route path="settings" element={<ProtectedRoute title="Settings"><FeaturePlaceholders feature="Settings" icon="⚙️" /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/accountant" replace />} />
    </Routes>
  )
}

export default function AccountantPortalRoutes() {
  return (
    <AuthProvider>
      <AccountantRoutesInner />
    </AuthProvider>
  )
}
