import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Users, Calendar,
    ClipboardCheck, DollarSign, MessageSquare
} from 'lucide-react';
import useChatUnread from '../hooks/useChatUnread';

const BottomNav = () => {
    const unreadCount = useChatUnread();
    const navItems = [
        { icon: LayoutDashboard, name: 'Home', path: '/', exact: true },
        { icon: Users, name: 'Students', path: '/students' },
        { icon: Calendar, name: 'Timetable', path: '/timetable' },
        { icon: ClipboardCheck, name: 'Attendance', path: '/attendance' },
        { icon: DollarSign, name: 'Payroll', path: '/payroll' },
        { icon: MessageSquare, name: 'Chat', path: '/chat', badgeCount: unreadCount },
    ];

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-xl border-t border-black/5 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center justify-around h-[68px] px-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.exact}
                        className={({ isActive }) => `
              relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300
              ${isActive ? 'text-[#000435] scale-105' : 'text-slate-400 hover:text-slate-600'}
            `}
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full bg-[#f59e0b]" />
                                )}
                                <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? 'bg-[#000435]/5' : ''}`}>
                                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-[#000435]' : ''} />
                                    {item.badgeCount > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 border-2 border-white text-white text-[9px] font-black leading-none flex items-center justify-center shadow-sm">
                                            {item.badgeCount > 99 ? '99+' : item.badgeCount}
                                        </span>
                                    )}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-wider transition-all ${isActive ? 'text-[#f59e0b]' : 'text-slate-400'}`}>
                                    {item.name}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default BottomNav;
