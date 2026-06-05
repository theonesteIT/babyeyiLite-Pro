import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'

const SIDEBAR_WIDTH = 280
const SIDEBAR_COLLAPSED_WIDTH = 72

function isUniformInventoryPath(pathname) {
  return /\/uniform-inventory\/?$/.test(pathname) || pathname.includes('/uniform-inventory')
}

export default function Layout({ children, basePath }) {
  const location = useLocation()
  const uniformFocus = isUniformInventoryPath(location.pathname)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const desktopWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH

  useEffect(() => {
    if (uniformFocus) setCollapsed(true)
  }, [uniformFocus])

  return (
    <div
      className="flex h-screen bg-re-bg font-sans overflow-hidden"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      <div
        className="hidden lg:flex shrink-0 min-h-0 h-full flex-col overflow-hidden bg-[#000435] transition-[width] duration-300 ease-out"
        style={{ width: desktopWidth }}
      >
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          basePath={basePath}
        />
      </div>

      {uniformFocus && collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="hidden lg:flex fixed left-[72px] top-[4.25rem] z-30 items-center gap-1.5 pl-2 pr-3 py-2 rounded-r-xl bg-[#000435] text-white shadow-lg shadow-[#000435]/30 border border-white/10 hover:bg-[#0a116b] transition-all group"
          aria-label="Expand sidebar"
          title="Expand menu"
        >
          <ChevronRight size={16} className="text-[#FEBF10] group-hover:translate-x-0.5 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">Menu</span>
        </button>
      )}

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
        <Sidebar
          collapsed={false}
          onClose={() => setMobileOpen(false)}
          basePath={basePath}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header setMobileOpen={setMobileOpen} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">{children}</main>
      </div>
    </div>
  )
}
