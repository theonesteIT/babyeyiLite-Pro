import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { MasterAuthProvider } from './context/MasterAuthContext'
import { useMasterAuth } from './context/MasterAuthContext'
import ProGate from './components/ProGate'
import ProHome from './pages/ProHome'
import DosPortalRoutes from './dos/PortalRoutes'
import ManagerPortalRoutes from './manager/PortalRoutes'
import AccountantPortalRoutes from './accountant_portal/PortalRoutes'
import StorekeeperPortalRoutes from './storekeeper_portal/PortalRoutes'
import LibrarianPortalRoutes from './librarian_portal/PortalRoutes'
import DisciplineStaffPortalRoutes from './displine_staff_portal/PortalRoutes'
import TeacherPortalRoutes from './teacher/PortalRoutes'
import DisciplinePortalRoutes from './discipline/PortalRoutes'
import GateKeeperPortalRoutes from './GateKeeper/PortalRoutes'
import RepresentativePortalRoutes from './Representative/PortalRoutes'

const PRO_BASENAME = (() => {
  const raw = String(import.meta.env.VITE_APP_BASENAME || '').trim()
  if (raw) {
    const normalized = raw.startsWith('/') ? raw : `/${raw}`
    return normalized.endsWith('/') && normalized !== '/' ? normalized.slice(0, -1) : normalized
  }
  if (typeof window !== 'undefined') {
    const p = window.location.pathname || ''
    if (p === '/pro' || p.startsWith('/pro/')) return '/pro'
  }
  return ''
})()

const ROLE_HOME_PORTAL = {
  DOS: 'dos',
  SCHOOL_REPRESENTATIVE: 'representative',
  NETWORK_REPRESENTATIVE: 'representative',
  SCHOOL_ADMIN: 'manager',
  SCHOOL_MANAGER: 'manager',
  ACCOUNTANT: 'accountant',
  STOREKEEPER: 'storekeeper',
  STORE_MANAGER: 'storekeeper',
  LIBRARIAN: 'librarian',
  DISCIPLINE_STAFF: 'discipline',
  DISCIPLINE: 'discipline',
  TEACHER: 'teacher',
  HOD: 'discipline',
  GATE_KEEPER: 'gatekeeper',
  GATE_OFFICER: 'gatekeeper',
}

const KNOWN_ROOTS = [
  '/dos',
  '/representative',
  '/manager',
  '/accountant',
  '/storekeeper',
  '/librarian',
  '/gatekeeper',
  '/discipline-staff',
  '/teacher',
  '/discipline',
]

function RoleAwareFallback() {
  const location = useLocation()
  const { user, roleCode } = useMasterAuth()
  const home = ROLE_HOME_PORTAL[roleCode] || ''
  const path = location.pathname || '/'
  const alreadyKnown = KNOWN_ROOTS.some((root) => path === root || path.startsWith(`${root}/`))

  // If legacy absolute links like /fees or /inventory are clicked, rewrite to role portal base.
  if (user && home && path !== '/' && !alreadyKnown) {
    return <Navigate to={`/${home}${path}${location.search || ''}`} replace />
  }

  return <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter basename={PRO_BASENAME || undefined}>
      <MasterAuthProvider>
        <Routes>
          <Route path="/" element={<ProHome />} />
          <Route
            path="/dos/*"
            element={
              <ProGate portal="dos">
                <DosPortalRoutes />
              </ProGate>
            }
          />
          <Route
            path="/representative/*"
            element={
              <ProGate portal="representative">
                <RepresentativePortalRoutes />
              </ProGate>
            }
          />
          <Route
            path="/manager/*"
            element={
              <ProGate portal="manager">
                <ManagerPortalRoutes />
              </ProGate>
            }
          />
          <Route
            path="/accountant/*"
            element={
              <ProGate portal="accountant">
                <AccountantPortalRoutes />
              </ProGate>
            }
          />
          <Route
            path="/teacher/*"
            element={
              <ProGate portal="teacher">
                <TeacherPortalRoutes />
              </ProGate>
            }
          />
          <Route
            path="/storekeeper/*"
            element={
              <ProGate portal="storekeeper">
                <StorekeeperPortalRoutes />
              </ProGate>
            }
          />
          <Route
            path="/librarian/*"
            element={
              <ProGate portal="librarian">
                <LibrarianPortalRoutes />
              </ProGate>
            }
          />
          <Route
            path="/discipline-staff/*"
            element={
              <ProGate portal="discipline-staff">
                <DisciplineStaffPortalRoutes />
              </ProGate>
            }
          />
          <Route
            path="/discipline/*"
            element={
              <ProGate portal="discipline">
                <DisciplinePortalRoutes />
              </ProGate>
            }
          />
          <Route
            path="/gatekeeper/*"
            element={
              <ProGate portal="gatekeeper">
                <GateKeeperPortalRoutes />
              </ProGate>
            }
          />
          <Route path="*" element={<RoleAwareFallback />} />
        </Routes>
      </MasterAuthProvider>
    </BrowserRouter>
  )
}
