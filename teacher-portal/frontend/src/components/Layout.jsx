import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

const DashboardLayout = ({ children, title }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';

  return (
    <div className="flex h-screen bg-re-bg font-sans overflow-hidden">
      {/* Sidebar — Desktop */}
      {!isChatPage && (
        <div className="hidden lg:block w-64 flex-shrink-0">
          <Sidebar />
        </div>
      )}

      {/* Sidebar — Mobile overlay */}
      {!isChatPage && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-gray-900/40 backdrop-blur-md"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {!isChatPage && (
        <div
          className={`fixed inset-y-0 left-0 z-50 w-72 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopNav title={title} onMenuClick={() => setIsSidebarOpen(true)} showMenuButton={!isChatPage} />

        <main className="flex-1 overflow-y-auto relative">
          {/* Background glows */}
          <div className="fixed bottom-0 right-0 w-96 h-96 bg-re-orange/5 blur-[120px] rounded-full pointer-events-none z-0" />
          <div className="fixed top-0 left-0 w-72 h-72 bg-re-purple/5 blur-[100px] rounded-full pointer-events-none z-0" />

          <div className="relative z-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
