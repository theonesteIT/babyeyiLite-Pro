import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import BottomNav from './BottomNav';

const DashboardLayout = ({ children, title }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const isChatFocused = location.pathname.endsWith('/chat');

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      {/* Sidebar — Desktop */}
      {!isChatFocused && (
        <div className="hidden lg:flex w-[304px] shrink-0 min-h-0 h-full flex-col overflow-hidden bg-[#000435]">
          <Sidebar />
        </div>
      )}

      {/* Sidebar — Mobile overlay */}
      {!isChatFocused && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-gray-900/40 backdrop-blur-md"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {!isChatFocused && (
        <div
          className={`fixed inset-y-0 left-0 z-50 w-[304px] max-w-[88vw] flex flex-col min-h-0 overflow-hidden bg-[#000435] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:hidden ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {!isChatFocused && <TopNav title={title} onMenuClick={() => setIsSidebarOpen(true)} />}

        <main className={`flex-1 overflow-y-auto relative ${isChatFocused ? 'pb-0' : 'pb-20 lg:pb-0'}`}>
          <div className="relative max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        {!isChatFocused && <BottomNav />}
      </div>
    </div>
  );
};

export default DashboardLayout;
