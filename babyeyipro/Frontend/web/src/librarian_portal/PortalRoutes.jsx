import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './frontend/src/context/AuthContext'
import Layout from './frontend/src/components/Layout'
import Dashboard from './frontend/src/pages/Dashboard'
import Books from './frontend/src/pages/Books'
import Borrowing from './frontend/src/pages/Borrowing'
import Returns from './frontend/src/pages/Returns'
import Reports from './frontend/src/pages/Reports'
import StaffPayroll from './frontend/src/pages/StaffPayroll'
import ShuleAvance from './frontend/src/pages/ShuleAvance'
import {
  TichaDeals,
  TichaDealDetails,
  TichaDealPayments,
  TrackingTichaDeals,
} from './frontend/src/pages/staffTichaDeals'
import TichaAI from './frontend/src/pages/TichaAI'
import FeaturePlaceholders from './frontend/src/pages/FeaturePlaceholders'
import ChatCenter from '../shared/pages/ChatCenter'
import SchoolCalendarPage from '../shared/pages/SchoolCalendarPage'
import librarianApi from './frontend/src/services/api'
import { LibrarianRequestOrder } from '../shared/procurement/portalWrappers'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-re-bg flex flex-col items-center justify-center gap-4 font-sans">
      <div className="w-12 h-12 rounded-2xl animate-pulse" style={{ background: 'linear-gradient(135deg,#1E3A5F,#3D5A80)' }} />
      <p className="text-re-text-muted text-sm font-bold uppercase tracking-widest animate-pulse">
        Loading Librarian Portal...
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

function LibrarianRoutesInner() {
  return (
    <Routes>
      <Route path="" element={<ProtectedRoute title="Library Overview"><Dashboard /></ProtectedRoute>} />
      <Route path="books" element={<ProtectedRoute title="Book Collection"><Books /></ProtectedRoute>} />
      <Route path="borrowing" element={<ProtectedRoute title="Active Loans"><Borrowing /></ProtectedRoute>} />
      <Route path="returns" element={<ProtectedRoute title="Returns History"><Returns /></ProtectedRoute>} />
      <Route path="reports/*" element={<ProtectedRoute title="Library Reports"><Reports /></ProtectedRoute>} />
      <Route path="report/*" element={<Navigate to="/librarian/reports" replace />} />
      <Route path="my-payroll" element={<ProtectedRoute title="My Payroll"><StaffPayroll /></ProtectedRoute>} />
      <Route path="payroll" element={<Navigate to="my-payroll" replace />} />
      <Route path="shule-avance" element={<ProtectedRoute title="Shule Avance"><ShuleAvance /></ProtectedRoute>} />
      <Route path="ticha-deals/tracking" element={<ProtectedRoute title="Deal tracking"><TrackingTichaDeals /></ProtectedRoute>} />
      <Route path="ticha-deals/pay" element={<ProtectedRoute title="Pay deal"><TichaDealPayments /></ProtectedRoute>} />
      <Route path="ticha-deals/:id" element={<ProtectedRoute title="Deal details"><TichaDealDetails /></ProtectedRoute>} />
      <Route path="ticha-deals" element={<ProtectedRoute title="Ticha Deals"><TichaDeals /></ProtectedRoute>} />
      <Route path="ticha-ai" element={<ProtectedRoute title="TichaAI"><TichaAI /></ProtectedRoute>} />
      <Route path="school-calendar" element={<ProtectedRoute title="School Calendar"><SchoolCalendarPage api={librarianApi} /></ProtectedRoute>} />
      <Route path="purchase-requests" element={<ProtectedRoute title="Purchase Requests"><LibrarianRequestOrder /></ProtectedRoute>} />
      <Route path="chat" element={<ProtectedRoute title="Chat center"><ChatCenter /></ProtectedRoute>} />
      <Route path="settings" element={<ProtectedRoute title="Settings"><FeaturePlaceholders feature="Library Settings" icon="⚙️" /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/librarian" replace />} />
    </Routes>
  )
}

export default function LibrarianPortalRoutes() {
  return (
    <AuthProvider>
      <LibrarianRoutesInner />
    </AuthProvider>
  )
}
