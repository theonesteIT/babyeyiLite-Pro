import { useState, useRef, useEffect } from 'react';
import { Menu, Search, Bell, ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { h } from '../utils/href';
import { resolveUserPhotoUrl } from '../../shared/utils/userPhotoUrl';

const TopNav = ({ title, onMenuClick }) => {
    const navigate = useNavigate();
    const { manager, logout } = useAuth();
    const [userOpen, setUserOpen] = useState(false);
    const [search, setSearch] = useState('');
    const userRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Initials from manager name
    const initials = manager
        ? `${(manager.first_name || '')[0] || ''}${(manager.last_name || '')[0] || ''}`.toUpperCase()
        : '?';
    const avatarPhoto = manager?.photo ? resolveUserPhotoUrl(manager.photo) : null;

    return (
    <>
        <header className="h-14 sm:h-[3.75rem] flex items-center gap-3 sm:gap-4 px-3 sm:px-5 md:px-7 bg-white border-b border-slate-200/90 shadow-[0_1px_0_rgba(15,23,42,0.06)] sticky top-0 z-20 font-sans transition-all duration-300">

            {/* Left — gold menu + page title */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
                <button
                    type="button"
                    onClick={onMenuClick}
                    className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-re-gold text-re-navy shadow-sm border border-[#d4a20a]/30 hover:bg-re-gold-light active:scale-[0.97] transition-all lg:hidden"
                    aria-label="Open menu"
                >
                    <Menu size={20} strokeWidth={2.25} />
                </button>
                <h1 className="text-[15px] sm:text-base font-bold text-slate-800 tracking-tight truncate">
                    {title || 'Dashboard'}
                </h1>
            </div>

            {/* Search — wide centered like reference */}
            <div className="flex-1 min-w-0 flex justify-center max-md:hidden">
                <div className="relative w-full max-w-2xl group">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-re-navy transition-colors">
                        <Search size={18} strokeWidth={2} />
                    </span>
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200/90 rounded-full py-2.5 pl-11 pr-4 text-[13px] font-medium outline-none shadow-inner focus:bg-white focus:border-re-gold/50 focus:ring-2 focus:ring-re-gold/20 transition-all text-slate-800 placeholder:text-slate-400"
                        placeholder="Search anything (students, fees, reports...)"
                    />
                </div>
            </div>

            {/* Compact search icon on small screens */}
            <div className="md:hidden flex-1 flex justify-end min-w-0">
                <div className="relative w-full max-w-[140px] group">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                        <Search size={16} />
                    </span>
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-2 text-xs font-medium outline-none focus:border-re-gold/40 text-slate-800 placeholder:text-slate-400"
                        placeholder="Search..."
                    />
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">

                {/* Notification bell */}
                <button
                    type="button"
                    className="relative p-2.5 text-slate-500 hover:bg-slate-100 hover:text-re-navy rounded-xl transition-all"
                    aria-label="Notifications"
                >
                    <Bell size={20} strokeWidth={1.75} />
                    <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
                        3
                    </span>
                </button>

                <div className="hidden sm:block h-8 w-px bg-slate-200" />

                {/* User dropdown */}
                <div className="relative" ref={userRef}>
                    <button
                        type="button"
                        onClick={() => setUserOpen(!userOpen)}
                        className="flex items-center gap-2 sm:gap-2.5 hover:bg-slate-50 rounded-xl px-1.5 sm:px-2 py-1.5 transition-all group"
                    >
                        <div className="relative">
                            <div
                                className="w-9 h-9 rounded-full bg-gradient-to-br from-re-navy to-re-navy-dark text-re-gold flex items-center justify-center font-semibold text-xs border-2 border-white shadow-md transition-transform overflow-hidden"
                            >
                                {avatarPhoto ? (
                                    <img src={avatarPhoto} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    initials
                                )}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                        </div>
                        <div className="hidden sm:block text-left max-w-[160px] md:max-w-[220px]">
                            <p className="text-xs font-medium text-slate-800 leading-tight uppercase tracking-tight truncate">
                                {manager?.first_name || 'Manager'}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium leading-tight uppercase tracking-wide truncate">
                                {manager?.school?.name || 'School'}
                            </p>
                        </div>
                        <ChevronDown
                            size={14}
                            className={`text-slate-400 hidden sm:block transition-transform shrink-0 ${userOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {userOpen && (
                        <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-2xl shadow-sm border border-black/10 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                            {/* Header */}
                            <div className="px-4 py-3 border-b border-black/5">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-medium text-sm shadow-sm border border-white/20 shrink-0 overflow-hidden"
                                        style={{ background: 'linear-gradient(135deg,#FEBF10,#D9A400)' }}
                                    >
                                        {avatarPhoto ? (
                                            <img src={avatarPhoto} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            initials
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-re-navy uppercase tracking-tight">
                                            {manager?.first_name} {manager?.last_name}
                                        </p>
                                        <p className="text-[10px] text-re-text-muted/60 truncate max-w-[120px]">
                                            {manager?.email}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Menu */}
                            <div className="py-1">
                                <button
                                    onClick={() => { navigate(h('/profile')); setUserOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-re-text-muted hover:bg-navy-50 hover:text-re-navy transition-all"
                                >
                                    <User size={13} /> My Profile
                                </button>
                                <button
                                    onClick={() => { navigate(h('/settings')); setUserOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-re-text-muted hover:bg-navy-50 hover:text-re-navy transition-all"
                                >
                                    <Settings size={13} /> Settings
                                </button>
                            </div>

                            <div className="border-t border-black/5 py-1">
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-all"
                                >
                                    <LogOut size={13} /> Sign out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    </>
    );
};

export default TopNav;
