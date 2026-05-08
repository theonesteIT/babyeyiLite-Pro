import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import GateKeeperLayout from './GateKeeperLayout'
import GateKeeperDashboard from './GateKeeperDashboard'
import GateScanner from './GateScanner'
import DateLogs from './DateLogs'

export default function GateKeeperPortalRoutes() {
  return (
    <Routes>
      <Route element={<GateKeeperLayout />}>
        <Route index element={<GateKeeperDashboard />} />
        <Route path="scanner" element={<GateScanner />} />
        <Route path="logs" element={<DateLogs />} />
        <Route path="*" element={<Navigate to="/gatekeeper" replace />} />
      </Route>
    </Routes>
  )
}

