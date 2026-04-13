import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Building2, Landmark,
    UserCog, Users
} from 'lucide-react';
import { h } from '../utils/href';

const BottomNav = () => {
    const navItems = [
        { icon: LayoutDashboard, name: 'Home', path: '/', exact: true },
        { icon: Building2, name: 'Registry', path: '/registry' },
        { icon: Landmark, name: 'Finance', path: '/finance' },
        { icon: UserCog, name: 'HR', path: '/hr' },
        { icon: Users, name: 'Students', path: '/students' },
    ];

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-black/5 pb-safe">
            <div className="flex items-center justify-around h-16">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={h(item.path)}
                        end={item.exact}
                        className={({ isActive }) => `
              flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors
              ${isActive ? 'text-re-navy' : 'text-gray-400'}
            `}
                    >
                        <item.icon size={20} strokeWidth={2} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">
                            {item.name}
                        </span>
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default BottomNav;
