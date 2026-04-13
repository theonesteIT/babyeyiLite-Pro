import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MasterAuthProvider } from './context/MasterAuthContext'
import ProGate from './components/ProGate'
import ProHome from './pages/ProHome'
import DosPortalRoutes from './dos/PortalRoutes'
import ManagerPortalRoutes from './manager/PortalRoutes'
import TeacherPortalRoutes from './teacher/PortalRoutes'
import DisciplinePortalRoutes from './discipline/PortalRoutes'

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
            path="/teacher/*"
            element={
              <ProGate portal="teacher">
                <TeacherPortalRoutes />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MasterAuthProvider>
    </BrowserRouter>
  )
}
