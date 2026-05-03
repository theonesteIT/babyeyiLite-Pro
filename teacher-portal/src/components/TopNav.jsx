import { useState, useRef, useEffect } from 'react';
import { Menu, Search, Bell, ChevronDown, LogOut, Settings, User, ChevronLeft, History } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TopNav = ({ title, onMenuClick, showMenuButton = true }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { teacher, logout } = useAuth();
    const [userOpen, setUserOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [search, setSearch] = useState('');
    const userRef = useRef(null);

    const isHome = location.pathname === '/';

    useEffect(() => {
        const handler = (e) => {
            if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (!isHome) return;
        const mainContent = document.querySelector('main');
        if (!mainContent) return;

        const handleScroll = () => {
            if (mainContent.scrollTop > 20) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        mainContent.addEventListener('scroll', handleScroll);
        return () => mainContent.removeEventListener('scroll', handleScroll);
    }, [isHome]);

    // Initials from teacher name
    const initials = teacher
        ? `${(teacher.first_name || '')[0] || ''}${(teacher.last_name || '')[0] || ''}`.toUpperCase()
        : '?';

    const headerBaseCls = "flex items-center justify-between px-4 md:px-6 z-40 gap-3 font-sans transition-all duration-300 ease-in-out will-change-[height,background-color,padding]";
    
    // Logic for header appearance
    let headerStyle = "";
    let iconThemeCls = "";
    let menuBtnCls = "";

    if (isHome) {
        if (scrolled) {
            headerStyle = "sticky top-0 h-12 bg-white/95 backdrop-blur-md md:border-b md:border-black/5 shadow-sm py-1";
            iconThemeCls = "text-re-text-muted hover:bg-orange-50 hover:text-re-orange";
            menuBtnCls = "text-re-text-muted hover:bg-orange-50";
        } else {
            headerStyle = "absolute top-0 left-0 w-full h-14 bg-transparent border-transparent md:sticky md:bg-white/80 md:backdrop-blur-xl md:border-b md:border-black/5 py-2";
            iconThemeCls = "text-white md:text-re-text-muted hover:bg-white/10 md:hover:bg-orange-50";
            menuBtnCls = "text-white md:text-re-text-muted hover:bg-white/10 md:hover:bg-orange-50";
        }
    } else {
        headerStyle = "sticky top-0 h-14 bg-white/80 backdrop-blur-xl md:border-b md:border-black/5 py-2";
        iconThemeCls = "text-re-text-muted hover:bg-orange-50 hover:text-re-orange";
        menuBtnCls = "text-re-text-muted hover:bg-orange-50";
    }

    const titleThemeCls = isHome && !scrolled ? "hidden md:block md:text-re-text" : "text-re-text";

    return (
        <header className={`${headerBaseCls} ${headerStyle}`}>

            {/* Left — hamburger + page title / Back button */}
            <div className={`flex items-center gap-2 shrink-0 transition-all duration-300 ease-in-out ${scrolled ? 'scale-95 origin-left' : 'scale-100 origin-left'}`}>
                {!isHome ? (
                    <button
                        onClick={() => navigate(-1)}
                        className={`p-2 rounded-xl transition-all ${iconThemeCls}`}
                    >
                        <ChevronLeft size={20} />
                    </button>
                ) : (
                    showMenuButton && (
                        <button
                            onClick={onMenuClick}
                            className={`lg:hidden p-2 rounded-xl transition-all ${menuBtnCls}`}
                        >
                            <Menu size={18} />
                        </button>
                    )
                )}
                <h1 className={`text-sm font-bold transition-all duration-300 ${titleThemeCls}`}>
                    {(() => {
                        if (location.pathname === '/ticha-ai') return 'Ticha AI - Assistant Engine';
                        if (location.pathname === '/shule-avance') return 'Ticha Avance';
                        if (location.pathname === '/ticha-deals/tracking') return 'Deal tracking';
                        if (location.pathname === '/ticha-deals/pay') return 'Pay deal';
                        if (location.pathname.startsWith('/ticha-deals/') && location.hash === '#checkout') return 'Checkout Details';
                        return title || 'Dashboard';
                    })()}
                </h1>
            </div>

            {/* TichaAI History Mobile Action */}
            {location.pathname === '/ticha-ai' && (
                <div className="md:hidden flex-1 flex justify-end">
                    <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('toggle-ticha-history'))}
                        className="p-2 rounded-xl text-re-text-muted hover:bg-orange-50 active:scale-95 transition-all"
                    >
                        <History size={20} />
                    </button>
                </div>
            )}

            {/* Search - Hidden on mobile */}
            <div className={`flex-1 max-w-sm hidden md:flex transition-all duration-300 ease-in-out ${scrolled ? 'scale-95' : 'scale-100'}`}>
                <div className="relative w-full group">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-re-text-muted/40 group-focus-within:text-re-orange transition-colors">
                        <Search size={16} />
                    </span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-re-bg border border-black/5 rounded-2xl py-2 pl-10 pr-4 text-xs font-bold outline-none shadow-inner focus:ring-2 transition-all text-re-text"
                        style={{ '--tw-ring-color': 'rgba(255,140,0,0.2)' }}
                        placeholder="Search tools, classes..."
                    />
                </div>
            </div>

            {/* Right side — mobile always shows quick log out; md+ shows full controls */}
            <div className={`flex items-center gap-1.5 sm:gap-2 shrink-0 transition-all duration-300 ease-in-out ${scrolled ? 'scale-95 origin-right' : 'scale-100 origin-right'}`}>
                <button
                    type="button"
                    onClick={logout}
                    className={`lg:hidden inline-flex items-center gap-1 rounded-full border px-2 py-1.5 text-[11px] font-bold tracking-tight transition-all active:scale-[0.98] shrink-0 ${
                        isHome && !scrolled
                            ? 'border-white/30 bg-white/15 text-white hover:bg-white/25'
                            : 'border-slate-200/90 bg-white text-slate-700 shadow-sm hover:border-red-200 hover:bg-red-50 hover:text-red-600'
                    }`}
                    aria-label="Log out"
                >
                    <LogOut size={14} strokeWidth={2.5} className="shrink-0" />
                    <span className="hidden min-[380px]:inline">Log out</span>
                </button>

                <div className={`flex items-center gap-1 sm:gap-2 ${!isHome ? 'hidden md:flex' : 'flex'}`}>
                {/* Notification bell */}
                <button className={`relative p-2 rounded-xl transition-all group ${iconThemeCls}`}>
                    <Bell size={17} />
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 border border-white rounded-full" />
                </button>

                <div className={`h-6 w-px bg-black/5 ${isHome && !scrolled ? 'hidden md:block' : 'block'}`} />

                {/* User dropdown */}
                <div className="relative" ref={userRef}>
                    <button
                        onClick={() => setUserOpen(!userOpen)}
                        className={`flex items-center gap-2.5 rounded-full px-2 py-1.5 transition-all group ${isHome && !scrolled ? 'hover:bg-white/10 md:hover:bg-orange-50' : 'hover:bg-orange-50'}`}
                    >
                        <div className="relative">
                            <div
                                className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-105 transition-transform"
                                style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)' }}
                            >
                                {initials}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
                        </div>
                        <div className="hidden sm:block text-left">
                            <p className={`text-xs font-bold leading-tight group-hover:text-re-orange transition-colors ${isHome && !scrolled ? 'text-white md:text-re-text' : 'text-re-text'}`}>
                                {teacher?.first_name || 'Teacher'}
                            </p>
                            <p className={`text-[10px] font-medium leading-tight ${isHome && !scrolled ? 'text-white/70 md:text-re-text-muted/60' : 'text-re-text-muted/60'}`}>
                                {teacher?.school?.name || 'Academic Staff'}
                            </p>
                        </div>
                        <ChevronDown
                            size={13}
                            className={`hidden sm:block transition-transform ${userOpen ? 'rotate-180' : ''} ${isHome && !scrolled ? 'text-white/40 md:text-re-text-muted/40' : 'text-re-text-muted/40'}`}
                        />
                    </button>

                    {userOpen && (
                        <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-2xl shadow-2xl border border-black/5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                            {/* Header */}
                            <div className="px-4 py-3 border-b border-black/5">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-9 h-9 rounded-full text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0"
                                        style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)' }}
                                    >
                                        {initials}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-re-text">
                                            {teacher?.first_name} {teacher?.last_name}
                                        </p>
                                        <p className="text-[10px] text-re-text-muted/60 truncate max-w-[120px]">
                                            {teacher?.email}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Menu */}
                            <div className="py-1">
                                <button
                                    onClick={() => { navigate('/profile'); setUserOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-re-text-muted hover:bg-orange-50 hover:text-re-orange transition-all"
                                >
                                    <User size={13} /> My Profile
                                </button>
                                <button
                                    onClick={() => { navigate('/settings'); setUserOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-re-text-muted hover:bg-orange-50 hover:text-re-orange transition-all"
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
            </div>
        </header>
    );
};

export default TopNav;
