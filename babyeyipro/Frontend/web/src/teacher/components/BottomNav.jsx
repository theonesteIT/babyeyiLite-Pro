import { NavLink } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, Calendar,
    ClipboardCheck, ClipboardList, Package, MessageSquare
} from 'lucide-react';
import { h } from '../utils/href';
import useChatUnread from '../../shared/hooks/useChatUnread';

const BottomNav = () => {
    const unreadCount = useChatUnread();
    const location = useLocation();
    const isAttendancePage = location.pathname.endsWith('/attendance');
    const navItems = [
        { icon: LayoutDashboard, name: 'Home', path: '/', exact: true },
        { icon: Users, name: 'Students', path: '/students' },
        { icon: Calendar, name: 'Timetable', path: '/timetable' },
        { icon: ClipboardCheck, name: 'Attendance', path: '/attendance' },
        { icon: Package, name: 'Requests', path: '/equipment-requests' },
        { icon: ClipboardList, name: 'Marks', path: '/marks/record' },
        { icon: MessageSquare, name: 'Chat', path: '/chat', badgeCount: unreadCount },
    ];
    const visibleNavItems = isAttendancePage
        ? navItems.filter((item) => item.path !== '/marks/record')
        : navItems;

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-black/5 pb-safe">
            <div className="flex items-center justify-around h-16">
                {visibleNavItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={h(item.path)}
                        end={item.exact}
                        className={({ isActive }) => `
              flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors
              ${isActive ? 'text-re-orange' : 'text-gray-400'}
            `}
                    >
                        <div className="relative">
                            <item.icon size={20} strokeWidth={2} />
                            {item.badgeCount > 0 && (
                                <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] leading-4 text-center">
                                    {item.badgeCount > 99 ? '99+' : item.badgeCount}
                                </span>
                            )}
                        </div>
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
