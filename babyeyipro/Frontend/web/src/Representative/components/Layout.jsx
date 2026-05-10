import { useState } from 'react';
import RepresentativeSidebar from './Sidebar';
import RepresentativeTopNav from './TopNav';
import RepresentativeBottomNav from './BottomNav';

export default function RepresentativeLayout({ children, title }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-re-bg font-sans overflow-hidden">
      <div className="hidden lg:flex w-[304px] shrink-0 min-h-0 h-full flex-col overflow-hidden bg-[#000435]">
        <RepresentativeSidebar />
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-[#000435]/50 backdrop-blur-md"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[304px] max-w-[88vw] flex flex-col min-h-0 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <RepresentativeSidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <RepresentativeTopNav title={title} onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto relative pb-[5.75rem] lg:pb-0">
          <div className="fixed bottom-0 right-0 w-96 h-96 bg-amber-400/8 blur-[120px] rounded-full pointer-events-none z-0" />
          <div className="fixed top-0 left-0 w-72 h-72 bg-[#000435]/12 blur-[100px] rounded-full pointer-events-none z-0" />

          <div className="relative max-w-[1600px] mx-auto">{children}</div>
        </main>

        <RepresentativeBottomNav />
      </div>
    </div>
  );
}
