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

const ROLE_HOME_PORTAL = {
  DOS: 'dos',
  SCHOOL_ADMIN: 'manager',
  SCHOOL_MANAGER: 'manager',
  ACCOUNTANT: 'accountant',
  STOREKEEPER: 'storekeeper',
  STORE_MANAGER: 'storekeeper',
  LIBRARIAN: 'librarian',
  DISCIPLINE_STAFF: 'discipline-staff',
  TEACHER: 'teacher',
  HOD: 'teacher',
}

const KNOWN_ROOTS = [
  '/dos',
  '/manager',
  '/accountant',
  '/storekeeper',
  '/librarian',
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
    <BrowserRouter>
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
          <Route path="*" element={<RoleAwareFallback />} />
        </Routes>
      </MasterAuthProvider>
    </BrowserRouter>
  )
}
