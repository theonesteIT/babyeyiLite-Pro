import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowDownUp, ClipboardList, Building2 } from 'lucide-react';

const BottomNav = () => {
  const navItems = [
    { icon: LayoutDashboard, name: 'Home',        path: '/storekeeper',  exact: true },
    { icon: Package,         name: 'Inventory',   path: '/inventory'                },
    { icon: ArrowDownUp,     name: 'Movements',   path: '/movements'                },
    { icon: ClipboardList,   name: 'Requests',    path: '/requisitions'             },
    { icon: Building2,       name: 'Suppliers',   path: '/suppliers'                },
  ];
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-black/5 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.exact}
            className={({ isActive }) => `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive ? 'text-re-navy' : 'text-gray-400'}`}>
            <item.icon size={20} strokeWidth={2} />
            <span className="text-[9px] font-bold uppercase tracking-wider">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default BottomNav;
