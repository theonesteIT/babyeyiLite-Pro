import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Receipt,
    Banknote,
    ClipboardCheck,
    Wallet,
    DollarSign,
    MessageSquare,
} from 'lucide-react';
import useChatUnread from '../../../../shared/hooks/useChatUnread';
import { h } from '../utils/href';

const BottomNav = () => {
    const unreadCount = useChatUnread();
    const navItems = [
        { icon: LayoutDashboard, name: 'Home', path: '/', exact: true },
        { icon: Receipt, name: 'Fees', path: '/fees' },
        { icon: Banknote, name: 'Expenses', path: '/expenses' },
        { icon: ClipboardCheck, name: 'Payroll', path: '/payroll/history' },
        { icon: DollarSign, name: 'My Payroll', path: '/my-payroll' },
        { icon: Wallet, name: 'Avance', path: '/shule-avance' },
        { icon: MessageSquare, name: 'Chat', path: '/chat', badgeCount: unreadCount },
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
              ${isActive ? 'text-re-gold' : 'text-gray-400'}
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
                        <span className="text-[10px] font-medium text-gray-500 tracking-tight">
                            {item.name}
                        </span>
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default BottomNav;
