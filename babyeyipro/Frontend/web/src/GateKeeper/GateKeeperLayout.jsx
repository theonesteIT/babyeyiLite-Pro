import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import GateKeeperSidebar from './GateKeeperSidebar'
import GateKeeperTopNav from './GateKeeperTopNav'

export default function GateKeeperLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div
      className="flex h-screen bg-slate-50 overflow-hidden"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col w-[240px] xl:w-[260px] flex-shrink-0">
        <GateKeeperSidebar />
      </div>

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-[#000435]/60 backdrop-blur-sm" />
        </div>
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[260px] transition-transform duration-300 ease-out lg:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <GateKeeperSidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <GateKeeperTopNav onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}