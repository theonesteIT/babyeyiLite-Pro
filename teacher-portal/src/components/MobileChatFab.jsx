import { NavLink } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import useChatUnread from '../hooks/useChatUnread';

/**
 * Compact chat entry — mobile only, sits above the tab bar (bottom-right).
 */
const MobileChatFab = () => {
    const unreadCount = useChatUnread();

    return (
        <div
            className="lg:hidden fixed z-[95] pointer-events-none"
            style={{ bottom: 'calc(5.25rem + env(safe-area-inset-bottom, 0px))', right: '1rem' }}
            aria-hidden
        >
            <NavLink
                to="/chat"
                className={({ isActive }) =>
                    `pointer-events-auto relative flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg shadow-amber-900/20 ring-1 ring-amber-400/45 transition-all active:scale-95 ${
                        isActive
                            ? 'bg-amber-600 text-white ring-amber-500/50'
                            : 'bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 hover:from-amber-300 hover:to-amber-400'
                    }`
                }
                aria-label="Open chat"
            >
                <MessageSquare className="h-5 w-5" strokeWidth={2.25} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-amber-100 bg-red-500 px-0.5 text-[9px] font-black leading-none text-white shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </NavLink>
        </div>
    );
};

export default MobileChatFab;
