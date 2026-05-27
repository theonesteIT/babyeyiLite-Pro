import { NavLink } from 'react-router-dom';
import {
    GraduationCap,
    Landmark,
    LayoutDashboard,
    BriefcaseBusiness,
    DoorOpen,
    MessageSquare,
} from 'lucide-react';
import { h } from '../utils/href';
import useChatUnread from '../../shared/hooks/useChatUnread';

const BottomNav = () => {
    const unreadCount = useChatUnread();
    const navItems = [
        { icon: LayoutDashboard, name: 'Home', path: h('/'), exact: true },
        { icon: GraduationCap, name: 'Babyeyi', path: h('/babyeyi') },
        { icon: BriefcaseBusiness, name: 'Payroll', path: h('/my-payroll'), labelLines: ['My', 'Payroll'] },
        { icon: Landmark, name: 'Finance', path: h('/finance') },
        { icon: DoorOpen, name: 'Gate', path: h('/attendance/gate') },
    ];

    return (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-[100] pointer-events-none">
            {/* Floating chat — anchored above the bar, bottom-right */}
            <NavLink
                to={h('/chat')}
                className="pointer-events-auto absolute right-4 z-[110] flex h-14 min-w-[3.25rem] items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#0D2644] text-white shadow-[0_10px_30px_-8px_rgba(30,58,95,0.55),0_4px_14px_-4px_rgba(254,191,16,0.35)] ring-2 ring-[#FEBF10]/25 transition-transform active:scale-[0.97]"
                style={{
                    bottom: 'calc(4.25rem + env(safe-area-inset-bottom, 0px))',
                }}
                aria-label={unreadCount > 0 ? `Chat, ${unreadCount} unread` : 'Open chat'}
            >
                <MessageSquare size={22} strokeWidth={2} className="text-white" aria-hidden />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FEBF10] px-1 text-[10px] font-medium leading-none text-[#0b1530] ring-2 ring-white shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </NavLink>

            {/* Modern tab bar — floating “island” */}
            <div
                className="pointer-events-auto mx-3 mb-2 flex justify-center pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            >
                <nav
                    className="flex h-[3.25rem] w-full max-w-lg items-stretch gap-0.5 rounded-2xl bg-white/92 px-1.5 py-1 shadow-[0_8px_32px_-12px_rgba(15,34,66,0.28),0_2px_8px_-4px_rgba(0,0,0,0.06)] ring-1 ring-slate-200/90 backdrop-blur-md"
                    aria-label="Primary mobile navigation"
                >
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.exact}
                            className={({ isActive }) =>
                                `group flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-1 transition-all duration-200 ${
                                    isActive
                                        ? 'bg-[#1E3A5F] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon
                                        size={20}
                                        strokeWidth={isActive ? 2.25 : 1.85}
                                        className={`shrink-0 ${isActive ? 'text-[#FEBF10]' : 'text-current'}`}
                                        aria-hidden
                                    />
                                    {item.labelLines ? (
                                        <span className="mt-0.5 flex flex-col items-center leading-[1.05]">
                                            {item.labelLines.map((line) => (
                                                <span
                                                    key={line}
                                                    className={`text-[8px] font-extrabold uppercase tracking-wide ${isActive ? 'text-white/95' : ''}`}
                                                >
                                                    {line}
                                                </span>
                                            ))}
                                        </span>
                                    ) : (
                                        <span
                                            className={`mt-0.5 max-w-full truncate text-[8.5px] font-extrabold uppercase tracking-[0.06em] ${isActive ? 'text-white/90' : ''}`}
                                        >
                                            {item.name}
                                        </span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </div>
    );
};

export default BottomNav;
