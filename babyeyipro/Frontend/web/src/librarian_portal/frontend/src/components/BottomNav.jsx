import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, BookMarked, RotateCcw, Users } from 'lucide-react';

const BottomNav = () => {
  const navItems = [
    { icon: LayoutDashboard, name: 'Home',      path: '/',          exact: true },
    { icon: BookOpen,        name: 'Books',     path: '/books'                  },
    { icon: BookMarked,      name: 'Borrow',    path: '/borrowing'              },
    { icon: RotateCcw,       name: 'Returns',   path: '/returns'                },
    { icon: Users,           name: 'Members',   path: '/members'                },
  ];
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-black/5 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map(item => (
          <NavLink key={item.path} to={item.path} end={item.exact}
            className={({ isActive }) => `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive ? 'text-re-orange' : 'text-gray-400'}`}>
            <item.icon size={20} strokeWidth={2} />
            <span className="text-[9px] font-bold uppercase tracking-wider">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default BottomNav;
