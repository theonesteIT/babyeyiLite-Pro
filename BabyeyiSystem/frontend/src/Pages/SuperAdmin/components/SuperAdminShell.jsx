/**
 * SuperAdminShell — shared layout for dashboard + routed Super Admin pages
 */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { BABYEYI_FONT_STACK, BABYEYI_PAGE_BG } from '../../../theme/babyeyiDashboardTheme';
import SuperAdminSidebar from './SuperAdminSidebar';
import SuperAdminHeader from './SuperAdminHeader';
import {
  findSuperAdminNavLabel,
  getActiveSuperAdminPage,
} from './superAdminNavConfig';

export default function SuperAdminShell({
  title: titleProp,
  children,
  showSidebar = true,
}) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const activePage = getActiveSuperAdminPage(pathname, search);
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const title = titleProp || findSuperAdminNavLabel(activePage);
  const mainMargin = sidebarCollapsed ? 'lg:ml-[80px]' : 'lg:ml-[260px]';

  return (
    <div
      className="min-h-screen flex text-[#000435] babyeyi-dash-shell"
      style={{ background: BABYEYI_PAGE_BG, fontFamily: BABYEYI_FONT_STACK }}
    >
      <style>{`
        @keyframes saFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .sa-anim,.anim{animation:saFadeIn .25s ease-out}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-thumb{background:#fbbf24;border-radius:99px}
        ::-webkit-scrollbar-track{background:#f1f5f9}
      `}</style>

      {showSidebar && (
        <SuperAdminSidebar
          navigate={navigate}
          online={online}
          user={user}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          onCollapsedChange={setSidebarCollapsed}
        />
      )}

      <div className={`flex min-h-screen flex-1 flex-col ${showSidebar ? mainMargin : ''}`}>
        <SuperAdminHeader
          title={title}
          online={online}
          user={user}
          setMobileOpen={setMobileOpen}
        />
        <main className="sa-anim anim flex-1 p-4 sm:p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
