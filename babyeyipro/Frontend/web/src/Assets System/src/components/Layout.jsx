import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const SIDEBAR_WIDTH = 280
const SIDEBAR_COLLAPSED_WIDTH = 72

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const desktopWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH

  return (
    <div
      className="flex h-screen bg-re-bg font-sans overflow-hidden"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      <div
        className="hidden lg:flex shrink-0 min-h-0 h-full flex-col overflow-hidden bg-[#000435] transition-[width] duration-300 ease-out"
        style={{ width: desktopWidth }}
      >
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 lg:hidden bg-gray-900/40 backdrop-blur-md"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 flex flex-col min-h-0 overflow-hidden bg-[#000435] transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:hidden w-[min(280px,88vw)] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar collapsed={false} onClose={() => setMobileOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header setMobileOpen={setMobileOpen} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 relative bg-re-bg">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
