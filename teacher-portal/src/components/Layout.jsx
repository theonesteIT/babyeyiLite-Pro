import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import MobileChatFab from './MobileChatFab';
import PeriodReminderBanner from './PeriodReminderBanner';

const DashboardLayout = ({ children, title }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const isChatPage = location.pathname.endsWith('/chat');
  const mainRef = useRef(null);
  
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="tp-root flex h-screen bg-[#f0f2f9] font-sans overflow-hidden">
      {/* Sidebar — Desktop */}
      {!isChatPage && (
        <div className="hidden lg:flex w-[304px] shrink-0 min-h-0 h-full flex-col overflow-hidden bg-[#000435] z-20">
          <Sidebar />
        </div>
      )}

      {/* Sidebar — Mobile overlay */}
      {!isChatPage && (
        <>
          <div
            className={`fixed inset-0 z-[110] lg:hidden bg-gray-900/40 backdrop-blur-md transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsSidebarOpen(false)}
          />
          <div
            className={`fixed inset-y-0 left-0 z-[120] w-[304px] max-w-[88vw] flex flex-col min-h-0 overflow-hidden bg-[#000435] transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <Sidebar onClose={() => setIsSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopNav title={title} onMenuClick={() => setIsSidebarOpen(true)} showMenuButton={!isChatPage} />
        {!isChatPage && <PeriodReminderBanner />}

        <main ref={mainRef} className={`flex-1 overflow-y-auto relative scroll-smooth ${!isChatPage ? 'pb-[84px] lg:pb-0' : ''}`}>
          <div className="relative z-10 w-full animate-[fadeIn_.3s_ease-out]">
            {children}
          </div>
        </main>
        
        {/* Bottom Nav + floating chat — Mobile */}
        {!isChatPage && (
          <>
            <MobileChatFab />
            <BottomNav />
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardLayout;
