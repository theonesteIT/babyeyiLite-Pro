import { useState, useRef, useEffect } from 'react';
import { Menu, Search, Bell, ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PORTAL } from '../config/portal';

const TopNav = ({ title, onMenuClick }) => {
    const navigate = useNavigate();
    const { staff, logout } = useAuth();
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

    const initials = staff
        ? `${(staff.first_name || '')[0] || ''}${(staff.last_name || '')[0] || ''}`.toUpperCase()
        : '?';

    return (
        <header className="h-14 flex items-center justify-between px-4 md:px-6 bg-white/80 backdrop-blur-xl border-b border-black/5 sticky top-0 z-30 gap-3 font-sans">

            {/* Left — hamburger + page title */}
            <div className="flex items-center gap-3 shrink-0">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 text-re-text-muted hover:bg-re-navy/5 hover:text-re-navy rounded-xl transition-all"
                >
                    <Menu size={18} />
                </button>
                <h1 className="hidden lg:block text-sm font-black text-re-text tracking-tight uppercase">
                    {title || 'Dashboard'}
                </h1>
            </div>

            {/* Search */}
            <div className="flex flex-1 max-w-sm">
                <div className="relative w-full group">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-re-text-muted/40 group-focus-within:text-re-navy transition-colors">
                        <Search size={16} />
                    </span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-re-bg border border-black/5 rounded-2xl py-2 pl-10 pr-4 text-xs font-bold outline-none shadow-inner focus:ring-2 transition-all text-re-text"
                        style={{ '--tw-ring-color': 'rgba(254,191,16,0.25)' }}
                        placeholder={PORTAL.searchPlaceholder}
                    />
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0">

                {/* Notification bell */}
                <button className="relative p-2 text-re-text-muted hover:bg-re-navy/5 hover:text-re-navy rounded-xl transition-all group">
                    <Bell size={17} />
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 border border-white rounded-full" />
                </button>

                <div className="h-6 w-px bg-black/5" />

                {/* User dropdown */}
                <div className="relative" ref={userRef}>
                    <button
                        onClick={() => setUserOpen(!userOpen)}
                        className="flex items-center gap-2.5 hover:bg-re-navy/5 rounded-xl px-2 py-1.5 transition-all group"
                    >
                        <div className="relative">
                            <div
                                className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-black text-xs shadow-sm group-hover:scale-105 transition-transform"
                                style={{ background: 'linear-gradient(135deg,#1E3A5F,#3D5A80)' }}
                            >
                                {initials}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
                        </div>
                        <div className="hidden sm:block text-left">
                            <p className="text-xs font-black text-re-text leading-tight group-hover:text-re-navy transition-colors uppercase tracking-tight">
                                {staff?.first_name || PORTAL.profileFallback}
                            </p>
                            <p className="text-[10px] text-re-text-muted/60 font-bold leading-tight uppercase tracking-widest">
                                {staff?.school?.name || PORTAL.roleLabel}
                            </p>
                        </div>
                        <ChevronDown
                            size={13}
                            className={`text-re-text-muted/40 hidden sm:block transition-transform ${userOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {userOpen && (
                        <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-2xl shadow-2xl border border-black/5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                            {/* Header */}
                            <div className="px-4 py-3 border-b border-black/5">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0"
                                        style={{ background: 'linear-gradient(135deg,#1E3A5F,#3D5A80)' }}
                                    >
                                        {initials}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-re-text uppercase tracking-tight">
                                            {staff?.first_name} {staff?.last_name}
                                        </p>
                                        <p className="text-[10px] text-re-text-muted/60 truncate max-w-[120px]">
                                            {staff?.email}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Menu */}
                            <div className="py-1">
                                <button
                                    onClick={() => { navigate('/profile'); setUserOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-re-text-muted hover:bg-re-navy/5 hover:text-re-navy transition-all"
                                >
                                    <User size={13} /> My Profile
                                </button>
                                <button
                                    onClick={() => { navigate('/settings'); setUserOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-re-text-muted hover:bg-re-navy/5 hover:text-re-navy transition-all"
                                >
                                    <Settings size={13} /> Settings
                                </button>
                            </div>

                            <div className="border-t border-black/5 py-1">
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition-all"
                                >
                                    <LogOut size={13} /> Sign out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default TopNav;
