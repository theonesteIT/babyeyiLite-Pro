import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Wallet,
  User, LogOut, Wifi, WifiOff, RefreshCw, ChevronDown,
  Settings,
  Receipt,
  Landmark,
  ClipboardCheck,
  Banknote,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

// ── Status Badge ──────────────────────────────────────────────
const statusConfig = {
  online: { label: 'Online', dot: 'bg-emerald-400', text: 'text-emerald-600', ring: 'ring-emerald-100', bg: 'bg-emerald-50', Icon: Wifi },
  offline: { label: 'Offline', dot: 'bg-red-400', text: 'text-red-500', ring: 'ring-red-100', bg: 'bg-red-50', Icon: WifiOff },
  syncing: { label: 'Syncing', dot: 'bg-amber-400', text: 'text-amber-600', ring: 'ring-amber-100', bg: 'bg-amber-50', Icon: RefreshCw },
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

// ── Single nav link ───────────────────────────────────────────
const NavItem = ({ icon, name, path, exact, onClose }) => {
  const ItemIcon = icon;

  return (
    <NavLink
      to={path}
      end={exact}
      onClick={onClose}
      className={({ isActive }) =>
        `relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all duration-200 group text-[11px] font-bold
        ${isActive ? 'text-white shadow-sm' : 'text-re-text-muted hover:bg-re-navy/5 hover:text-re-navy'}`
      }
      style={({ isActive }) =>
        isActive ? { background: 'linear-gradient(135deg,#1E3A5F,#3D5A80)', boxShadow: '0 3px 10px rgba(30,58,95,0.25)' } : {}
      }
    >
      {({ isActive }) => (
        <>
          <ItemIcon size={13} className={isActive ? 'text-white' : 'text-re-text-muted/50 group-hover:text-re-navy transition-colors'} />
          <span>{name}</span>
        </>
      )}
    </NavLink>
  );
};

// ── Expandable item ───────────────────────────────────────────
const ExpandableNavItem = ({ icon, name, subItems, onClose }) => {
  const location = useLocation();
  const ItemIcon = icon;
  const pathMatches = (path) => {
    if (!path) return false;
    return location.pathname === path;
  };
  const isAnyActive = subItems.some((s) => pathMatches(s.path));
  const [open, setOpen] = useState(isAnyActive);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all text-[11px] font-bold group
          ${isAnyActive ? 'text-re-navy bg-re-navy/10' : 'text-re-text-muted hover:bg-re-navy/5 hover:text-re-navy'}`}
      >
        <ItemIcon size={13} className={`${isAnyActive ? 'text-re-navy' : 'text-re-text-muted/50 group-hover:text-re-navy'} transition-colors`} />
        <span className="flex-1 text-left">{name}</span>
        <ChevronDown size={11} className={`transition-transform duration-300 opacity-40 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-re-navy/10 pl-2.5">
          {subItems.map(sub => {
            const subActive = pathMatches(sub.path);
            return (
              <NavLink
                key={sub.path}
                to={sub.path}
                onClick={onClose}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all
                  ${subActive ? 'text-re-navy bg-re-navy/10' : 'text-re-text-muted hover:text-re-navy hover:bg-re-navy/5'}`}
              >
                <sub.icon size={11} className={subActive ? 'text-re-navy' : 'text-re-text-muted/40'} />
                {sub.name}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Section label ──────────────────────────────────────────────
const SectionLabel = ({ label }) => (
  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-re-text-muted/35 px-2.5 pt-2 pb-0.5">
    {label}
  </p>
);

const Sidebar = ({ onClose }) => {
  const { staff, logout } = useAuth();

  return (
    <div className="flex flex-col h-full bg-white border-r border-black/5 shadow-sm">
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Brand card */}
      <div className="p-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <div className="rounded-2xl bg-re-bg shadow-inner p-3 space-y-1">
          <div className="flex items-center gap-3">
            <div className="bg-re-navy/10 p-2.5 rounded-2xl shadow-inner text-re-navy">
              <Landmark size={22} />
            </div>
            <div>
              <span
                className="text-xl font-black tracking-tight leading-none block"
                style={{ background: 'linear-gradient(135deg,#1E3A5F,#3D5A80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                Accounts
              </span>
              <p className="text-[9px] text-re-navy font-black uppercase tracking-[0.2em] opacity-60 mt-0.5">
                Staff Portal
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 overflow-y-auto space-y-0.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <NavItem icon={LayoutDashboard} name="Dashboard" path="/" exact onClose={onClose} />

        <SectionLabel label="Finance operations" />
        <NavItem icon={Receipt} name="Student Fees" path="/fees" onClose={onClose} />
        <ExpandableNavItem
          icon={FileText}
          name="Invoices"
          onClose={onClose}
          subItems={[
            { name: 'Invoice Registry', path: '/invoices', icon: FileText },
            { name: 'Configure Invoices', path: '/invoices/settings', icon: Settings },
          ]}
        />
        <NavItem icon={Banknote} name="Expenses" path="/expenses" onClose={onClose} />
        <NavItem icon={FileSpreadsheet} name="Requisitions" path="/requisitions" onClose={onClose} />
        <ExpandableNavItem
          icon={ClipboardCheck}
          name="Payroll"
          onClose={onClose}
          subItems={[
            { name: 'Payroll runs', path: '/payroll/history', icon: ClipboardCheck },
            { name: 'Configure Payroll', path: '/payroll/config', icon: Settings },
          ]}
        />


        <SectionLabel label="Services" />
        <NavItem icon={Wallet} name="Shule Avance" path="/shule-avance" onClose={onClose} />

        
      </nav>

      {/* Bottom Profile */}
      <div className="p-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <div className="rounded-2xl border border-black/5 bg-re-bg shadow-inner p-2 space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-re-text-muted/40">Status</p>
            <AppStatusBadge status="online" />
          </div>

          <div className="h-px bg-black/5 mx-1" />

          {/* User profile */}
          <div className="flex items-center gap-2.5 px-2 py-1.5 bg-white rounded-xl border border-black/5 shadow-sm">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-re-navy/10 flex items-center justify-center shrink-0">
              {staff?.photo
                ? <img src={staff.photo} alt={staff.first_name} className="w-full h-full object-cover" />
                : <User size={16} className="text-re-navy" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate text-re-navy uppercase tracking-tight">
                {staff?.first_name || 'Staff Member'}
              </p>
              <p className="text-[9px] text-re-text-muted truncate font-bold uppercase tracking-wider opacity-50 mt-0.5">
                {staff?.role_name || 'Accountant'}
              </p>
            </div>
            <button onClick={logout} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
