import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, ArrowDownUp, ClipboardList, Building2,
  Wallet, User, LogOut, Wifi, WifiOff, RefreshCw, Store,
} from 'lucide-react';

const statusConfig = {
  online:  { label: 'Online',  dot: 'bg-[#FEBF10]', text: 'text-re-navy', ring: 'ring-[#FEBF10]/35', bg: 'bg-[#FEBF10]/12',  Icon: Wifi },
  offline: { label: 'Offline', dot: 'bg-red-400',     text: 'text-red-500',     ring: 'ring-red-100',     bg: 'bg-red-50',      Icon: WifiOff },
  syncing: { label: 'Syncing', dot: 'bg-amber-400',   text: 'text-amber-600',   ring: 'ring-amber-100',   bg: 'bg-amber-50',    Icon: RefreshCw },
};

const AppStatusBadge = ({ status = 'online' }) => {
  const s = statusConfig[status];
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${s.bg} ring-1 ${s.ring}`}>
      <span className="relative flex h-1.5 w-1.5">
        {status !== 'offline' && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${s.dot} opacity-60`} />}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${s.dot}`} />
      </span>
      <s.Icon size={9} className={`${s.text} ${status === 'syncing' ? 'animate-spin' : ''}`} />
      <span className={`text-[9px] font-bold ${s.text}`}>{s.label}</span>
    </div>
  );
};

const NavItem = ({ icon: Icon, name, path, exact, onClose }) => (
  <NavLink to={path} end={exact} onClick={onClose}
    className={({ isActive }) =>
      `relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all duration-200 group text-[11px] font-bold
      ${isActive ? 'text-white shadow-sm' : 'text-re-text-muted hover:bg-re-navy/5 hover:text-re-navy'}`}
    style={({ isActive }) => isActive ? { background: 'linear-gradient(135deg,#1E3A5F,#3D5A80)', boxShadow: '0 3px 10px rgba(30,58,95,0.25)' } : {}}>
    {({ isActive }) => (
      <>
        <Icon size={13} className={isActive ? 'text-white' : 'text-re-text-muted/50 group-hover:text-re-navy transition-colors'} />
        <span>{name}</span>
      </>
    )}
  </NavLink>
);

const SectionLabel = ({ label }) => (
  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-re-text-muted/35 px-2.5 pt-2 pb-0.5">{label}</p>
);

const Sidebar = ({ onClose }) => {
  const { staff, logout } = useAuth();
  return (
    <div className="flex flex-col h-full bg-white border-r border-black/5 shadow-sm">
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <div className="p-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <div className="rounded-2xl bg-re-bg shadow-inner p-3 space-y-1">
          <div className="flex items-center gap-3">
            <div className="bg-re-navy/10 p-2.5 rounded-2xl shadow-inner">
              <Store size={22} className="text-re-navy" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight leading-none block"
                style={{ background: 'linear-gradient(135deg,#1E3A5F,#3D5A80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Store
              </span>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mt-0.5" style={{ color: '#FEBF10' }}>Storekeeper Portal</p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-1 overflow-y-auto space-y-0.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <NavItem icon={LayoutDashboard} name="Dashboard"       path="/"             exact onClose={onClose} />

        <SectionLabel label="Store" />
        <NavItem icon={Package}        name="Inventory"        path="/inventory"         onClose={onClose} />
        <NavItem icon={ArrowDownUp}    name="Stock Movements"  path="/movements"         onClose={onClose} />
        <NavItem icon={ClipboardList}  name="Requisitions"     path="/requisitions"      onClose={onClose} />
        <NavItem icon={Building2}      name="Suppliers"        path="/suppliers"         onClose={onClose} />

        <SectionLabel label="Services" />
        <NavItem icon={Wallet}         name="Shule Avance"     path="/shule-avance"      onClose={onClose} />
      </nav>

      <div className="p-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <div className="rounded-2xl border border-black/5 bg-re-bg shadow-inner p-2 space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-re-text-muted/40">Status</p>
            <AppStatusBadge status="online" />
          </div>
          <div className="h-px bg-black/5 mx-1" />
          <div className="flex items-center gap-2.5 px-2 py-1.5 bg-white rounded-xl border border-black/5 shadow-sm">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-re-navy/10 flex items-center justify-center shrink-0">
              {staff?.photo ? <img src={staff.photo} alt={staff.first_name} className="w-full h-full object-cover" /> : <User size={16} className="text-re-navy" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate text-re-navy uppercase tracking-tight">{staff?.first_name || 'Storekeeper'}</p>
              <p className="text-[9px] text-re-text-muted truncate font-bold uppercase tracking-wider opacity-50 mt-0.5">{staff?.role_name || 'Storekeeper'}</p>
            </div>
            <button onClick={logout} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><LogOut size={12} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
