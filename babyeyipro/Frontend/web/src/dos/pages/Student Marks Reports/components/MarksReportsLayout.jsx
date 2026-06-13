import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import '../studentMarksReports.css';

export default function MarksReportsLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="marks-reports-module flex h-screen bg-[#f0f2f9] font-sans overflow-hidden">
      <div className="hidden lg:flex w-[304px] shrink-0 min-h-0 h-full flex-col overflow-hidden bg-[#000435]">
        <Sidebar />
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-gray-900/40 backdrop-blur-md"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[304px] max-w-[88vw] flex flex-col min-h-0 overflow-hidden bg-[#000435] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto relative">
          <div className="relative max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
