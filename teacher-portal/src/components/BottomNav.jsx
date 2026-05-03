import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Users, Calendar,
    ClipboardCheck, DollarSign,
} from 'lucide-react';

const BottomNav = () => {
    const navItems = [
        { icon: LayoutDashboard, name: 'Home', path: '/', exact: true },
        { icon: Users, name: 'Students', path: '/students' },
        { icon: Calendar, name: 'Timetable', path: '/timetable' },
        { icon: ClipboardCheck, name: 'Attendance', path: '/attendance' },
        { icon: DollarSign, name: 'Payroll', path: '/payroll' },
    ];

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] flex flex-col bg-white/90 backdrop-blur-xl border-t border-black/5 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex h-[68px] items-stretch gap-x-1 px-1.5 sm:gap-x-1.5 sm:px-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.exact}
                        className={({ isActive }) => `
              relative flex min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-300
              ${isActive ? 'text-[#000435]' : 'text-slate-400 hover:text-slate-600'}
            `}
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full bg-[#f59e0b]" />
                                )}
                                <div className={`relative shrink-0 rounded-xl p-1 sm:p-1.5 transition-all ${isActive ? 'bg-[#000435]/5' : ''}`}>
                                    <item.icon
                                        className={`h-5 w-5 shrink-0 sm:h-[22px] sm:w-[22px] ${isActive ? 'text-[#000435]' : ''}`}
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />
                                </div>
                                <span
                                    className={`max-w-full text-center text-[7px] font-black uppercase leading-tight tracking-tight transition-all min-[400px]:text-[8px] sm:text-[9px] ${isActive ? 'text-[#f59e0b]' : 'text-slate-400'}`}
                                >
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
