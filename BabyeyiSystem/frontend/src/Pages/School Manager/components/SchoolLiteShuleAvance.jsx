import { useState } from 'react';

import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { isLiteDisciplineStaff, LITE_DISCIPLINE_HOME } from '../../../utils/liteStaffEntry';

import { Menu, ShoppingBag, Wallet } from 'lucide-react';

import { useAuth } from '../../../context/AuthContext';

import { BABYEYI_FONT_STACK } from '../../../theme/babyeyiDashboardTheme';

import LiteShuleAvanceSidebar from './LiteShuleAvanceSidebar';

import LiteTichaAvancePage from '../pages/lite/LiteTichaAvancePage';

import LiteTichaDealsPage from '../pages/lite/LiteTichaDealsPage';

import LiteTichaDealDetailPage from '../pages/lite/LiteTichaDealDetailPage';

import LiteTichaDealPaymentsPage from '../pages/lite/LiteTichaDealPaymentsPage';



function LiteTichaBottomNav() {

  const location = useLocation();

  const onDeals = location.pathname.includes('/deals');



  return (

    <nav

      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 bg-white/95 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))]"

      aria-label="Ticha portal"

    >

      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1">

        <NavLink

          to="/lite/shule-avance"

          end

          className={({ isActive }) =>

            `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-black uppercase tracking-wide transition-colors ${

              isActive && !onDeals ? 'text-re-orange' : 'text-slate-400'

            }`

          }

        >

          <Wallet size={20} strokeWidth={2.2} />

          <span>Ticha Avance</span>

        </NavLink>

        <NavLink

          to="/lite/shule-avance/deals"

          className={({ isActive }) =>

            `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-black uppercase tracking-wide transition-colors ${

              isActive || onDeals ? 'text-re-orange' : 'text-slate-400'

            }`

          }

        >

          <ShoppingBag size={20} strokeWidth={2.2} />

          <span>TichaDeals</span>

        </NavLink>

      </div>

    </nav>

  );

}



function LiteShuleAvanceHeader({ title, subtitle, onMenuClick, showMenu }) {

  const auth = useAuth();

  const user = auth.user && auth.user !== false ? auth.user : null;

  const name = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '';



  return (

    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">

      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">

        <div className="flex items-center gap-3 min-w-0">

          {showMenu ? (

            <button

              type="button"

              onClick={onMenuClick}

              className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#000435] shadow-sm hover:bg-slate-50"

              aria-label="Open menu"

            >

              <Menu size={20} />

            </button>

          ) : null}

          <div className="min-w-0">

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Babyeyi Lite</p>

            <h1 className="text-base font-black text-[#000435] truncate sm:text-lg">{title || 'Shule Avance'}</h1>

            {subtitle ? <p className="text-[11px] text-slate-500 truncate">{subtitle}</p> : null}

          </div>

        </div>

        {name ? (

          <p className="hidden sm:block text-xs font-bold text-slate-600 truncate max-w-[140px]">{name}</p>

        ) : null}

      </div>

    </header>

  );

}



/**

 * Lite staff portal — teacher-portal style Ticha Avance + TichaDeals (LoginLite).

 */

export default function SchoolLiteShuleAvance() {
  const auth = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!auth.loading && auth.user && auth.user !== false && isLiteDisciplineStaff(auth.user)) {
    return <Navigate to={LITE_DISCIPLINE_HOME} replace />;
  }

  const location = useLocation();

  const path = location.pathname;

  const onDealDetail = /\/deals\/[^/]+$/.test(path);

  const onPay = path.includes('/pay');

  const hideBottomNav = onDealDetail || onPay;



  const title = onPay ? 'Pay deal' : onDealDetail ? 'TichaDeals' : 'Shule Avance';

  const subtitle = onPay || onDealDetail ? undefined : 'Cashout, services & exclusive deals';



  return (

    <div

      className="min-h-screen bg-[#FFFBF0] text-slate-800"

      style={{ fontFamily: BABYEYI_FONT_STACK }}

    >

      <LiteShuleAvanceSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />



      <div className="flex min-h-screen flex-col lg:pl-[240px] xl:pl-[256px]">

        <LiteShuleAvanceHeader

          title={title}

          subtitle={subtitle}

          showMenu

          onMenuClick={() => setMobileOpen(true)}

        />



        <main className={`flex-1 ${hideBottomNav ? '' : 'pb-20 lg:pb-6'}`}>

          <Routes>

            <Route index element={<LiteTichaAvancePage />} />

            <Route path="deals" element={<LiteTichaDealsPage />} />

            <Route path="deals/:id" element={<LiteTichaDealDetailPage />} />

            <Route path="pay" element={<LiteTichaDealPaymentsPage />} />

            <Route path="*" element={<Navigate to="/lite/shule-avance" replace />} />

          </Routes>

        </main>



        {!hideBottomNav ? <LiteTichaBottomNav /> : null}

      </div>

    </div>

  );

}


