import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowDownUp, ClipboardList, Building2, MessageSquare, DollarSign } from 'lucide-react';
import useChatUnread from '../../../../shared/hooks/useChatUnread';
import { h } from '../utils/href';

const BottomNav = () => {
  const unreadCount = useChatUnread();
  const navItems = [
    { icon: LayoutDashboard, name: 'Home', path: h('/'), exact: true },
    { icon: Package, name: 'Stock', path: h('/inventory') },
    { icon: ArrowDownUp, name: 'Moves', path: h('/movements') },
    { icon: ClipboardList, name: 'Requests', path: h('/requisitions') },
    { icon: Building2, name: 'Supply', path: h('/suppliers') },
    { icon: DollarSign, name: 'Pay', path: h('/payroll') },
    { icon: MessageSquare, name: 'Chat', path: h('/chat'), badgeCount: unreadCount },
  ];
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-black/5 pb-safe">
      <div className="flex items-center justify-around h-16 overflow-x-auto px-1">
        {navItems.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.exact}
            className={({ isActive }) => `flex flex-col items-center justify-center min-w-[3rem] h-full gap-1 transition-colors shrink-0 ${isActive ? 'text-re-gold' : 'text-gray-400'}`}>
            <div className="relative">
              <item.icon size={20} strokeWidth={2} />
              {item.badgeCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] leading-4 text-center">
                  {item.badgeCount > 99 ? '99+' : item.badgeCount}
                </span>
              )}
            </div>
            <span className="text-[8px] font-bold uppercase tracking-wider truncate max-w-[4rem] text-center">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default BottomNav;
