// ================================================================
// SuperAdminPage.jsx — SESSION-ONLY AUTH v3.0
// ✅ Zero localStorage — all user data from useAuth() / server session
// ✅ API base fixed → port 5100
// ✅ All axios calls have withCredentials: true
// ✅ Logout hits /api/session/logout then redirects to /login
// ✅ Session guard → redirects if not SUPER_ADMIN
// ✅ School Admin creation → routes to /add-school (AddSchool.jsx)
// ✅ School list → uses /api/schools (school-add.js)
// ✅ NESA / DEO → /api/auth/create-nesa-admin, /api/auth/create-deo
// ================================================================
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Users, UserPlus, Search, Mail, Phone, Building, MapPin,
  EyeOff, Eye, Lock, Save, X, Edit, Trash2, CheckCircle,
  AlertCircle, Shield, Calendar, Download, RefreshCw, Key,
  LayoutDashboard, School, Settings, LogOut, ChevronRight,
  TrendingUp, Globe, Bell, ChevronDown, Flag,
  Activity, UserCheck, AlertTriangle, Layers, Menu, ArrowLeft,
  Building2, Home, FileText, BarChart3, Wifi, WifiOff,
  ShieldCheck,   Star, Plus, Filter, Loader2, Info, PlusCircle, DollarSign, Radio, ShoppingBag, Package, Shirt,
  Sparkles,
  Percent,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LogoutButton from '../Auth/LogoutButton';
import { BABYEYI_FONT_STACK, BABYEYI_NAVY, BABYEYI_PAGE_BG } from '../../theme/babyeyiDashboardTheme';

// ── API base (port 5100) ──────────────────────────────────────
const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api`;
const UPLOADS_BASE = import.meta.env.VITE_UPLOADS_BASE || 'http://localhost:5100';

// ── Axios config: always send session cookie ──────────────────
const axCfg = { headers: { 'Content-Type': 'application/json' }, withCredentials: true };

// Resolve relative file path (from backend) into full URL
const toAssetUrl = (p) => {
  if (!p || typeof p !== 'string') return null;
  const path = p.replace(/\\/g, '/').trim();
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = UPLOADS_BASE.replace(/\/$/, '');
  return base + (path.startsWith('/') ? path : `/${path}`);
};

// ── Rwanda Provinces / Districts ──────────────────────────────
const PROVINCES = {
  'Kigali City':      ['Gasabo', 'Kicukiro', 'Nyarugenge'],
  'Eastern Province': ['Bugesera','Gatsibo','Kayonza','Kirehe','Ngoma','Nyagatare','Rwamagana'],
  'Northern Province':['Burera','Gakenke','Gicumbi','Musanze','Rulindo'],
  'Southern Province':['Gisagara','Huye','Kamonyi','Muhanga','Nyamagabe','Nyanza','Nyaruguru','Ruhango'],
  'Western Province': ['Karongi','Ngororero','Nyabihu','Nyamasheke','Rubavu','Rusizi','Rutsiro'],
};

// ── Gradient palette (district gold theme) ────────────────────
const GRAD = {
  primary: 'from-[#1F2937] to-[#111827]',   // dark slate
  blue:    'from-[#F59E0B] to-[#FBBF24]',   // amber gradient
  emerald: 'from-emerald-500 to-emerald-400',
  amber:   'from-[#F5B800] to-amber-400',
  red:     'from-red-500 to-red-400',
  violet:  'from-[#1F2937] to-[#111827]',   // map extra colors to dark
  cyan:    'from-[#1F2937] to-[#111827]',
  indigo:  'from-[#1F2937] to-[#111827]',
  teal:    'from-[#1F2937] to-[#111827]',
  green:   'from-[#F59E0B] to-[#FBBF24]',
};

const ACCENT = BABYEYI_NAVY;
const inp = `w-full bg-amber-50/80 border-2 border-amber-200 text-gray-900 rounded-xl px-4 py-3 text-sm font-medium
  focus:outline-none focus:border-[#FEBF10] focus:ring-2 focus:ring-amber-100
  placeholder-amber-400 transition-all`;

// ════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ════════════════════════════════════════════════════════════════
const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT }} />
  </div>
);

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center babyeyi-dash-shell"
    style={{ background: BABYEYI_PAGE_BG, fontFamily: BABYEYI_FONT_STACK }}>
    <div className="text-center">
      <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: ACCENT }} />
      <p className="text-amber-800 text-sm font-semibold">Verifying session…</p>
    </div>
  </div>
);

const Empty = ({ msg = 'No data found', Icon = Users }) => (
  <div className="text-center py-16 text-amber-600">
    <Icon className="w-10 h-10 mx-auto mb-3 opacity-40" style={{ color: ACCENT }} />
    <p className="text-sm font-medium">{msg}</p>
  </div>
);

const Toast = ({ toasts, remove }) => (
  <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[300] space-y-2 pointer-events-none">
    {toasts.map(t => (
      <div key={t.id} className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl shadow-2xl border w-full sm:w-80
        ${t.type==='success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
          t.type==='error'   ? 'bg-red-50 border-red-300 text-red-800' :
                               'bg-amber-50 border-amber-300 text-amber-900'}`}>
        {t.type==='success' ? <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"/> :
         t.type==='error'   ? <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0"/> :
                              <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0"/>}
        <p className="flex-1 text-xs font-medium leading-snug">{t.message}</p>
        <button onClick={() => remove(t.id)} className="opacity-40 hover:opacity-100 shrink-0">
          <X className="w-3.5 h-3.5"/>
        </button>
      </div>
    ))}
  </div>
);

const StatCard = ({ icon: Icon, label, value, sub, color = 'blue', alert, onClick }) => (
  <div onClick={onClick}
    className={`bg-gradient-to-br ${GRAD[color]} rounded-2xl p-4 shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer relative overflow-hidden select-none`}>
    <div className="absolute inset-0 opacity-10"
      style={{backgroundImage:'radial-gradient(circle at 80% 20%,white 0%,transparent 60%)'}}/>
    <div className="relative">
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 rounded-xl bg-white/20"><Icon className="w-5 h-5 text-white"/></div>
        {alert && <span className="text-[10px] font-black bg-white/30 text-white px-1.5 py-0.5 rounded-full animate-pulse">!</span>}
      </div>
      <div className="text-2xl font-black text-white mb-0.5">{value ?? '—'}</div>
      <div className="text-xs font-semibold text-white/80">{label}</div>
      {sub && <div className="text-[10px] text-white/60 mt-0.5">{sub}</div>}
    </div>
  </div>
);

const THead = ({ cols }) => (
  <thead>
    <tr className="border-b-2 border-amber-100 bg-amber-50/80">
      {cols.map((h, i) => (
        <th key={i} className="text-left py-3 px-4 text-[11px] font-bold text-amber-800 uppercase tracking-wider whitespace-nowrap">{h}</th>
      ))}
    </tr>
  </thead>
);

const FieldUI = ({ label, error, children, required }) => (
  <div>
    <label className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
        <AlertCircle className="w-3 h-3"/>{error}
      </p>
    )}
  </div>
);

const Modal = ({ title, onClose, children, size = 'max-w-2xl' }) => (
  <div className="fixed inset-0 z-[200] bg-gray-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div className={`bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full ${size} max-h-[92vh] flex flex-col border-2 border-amber-100`}>
      <div className="flex items-center justify-between px-5 py-4 border-b-2 border-amber-100 shrink-0">
        <h3 className="text-base font-black text-gray-900">{title}</h3>
        <button onClick={onClose} className="text-amber-600 hover:text-amber-800 p-1.5 rounded-xl hover:bg-amber-50">
          <X className="w-4 h-4"/>
        </button>
      </div>
      <div className="overflow-y-auto flex-1 p-5">{children}</div>
    </div>
  </div>
);

const RoleBadge = ({ role }) => {
  const map = {
    SCHOOL_ADMIN:   { cls: 'bg-amber-100 text-amber-800 border-amber-200',   label: 'School Admin' },
    school_manager: { cls: 'bg-amber-100 text-amber-800 border-amber-200',   label: 'School Manager' },
    NESA_ADMIN:     { cls: 'bg-[#1F2937] text-amber-300 border-amber-300',   label: 'NESA Admin' },
    DEO:            { cls: 'bg-[#111827] text-amber-200 border-amber-300',   label: ' DEO' },
    SUPER_ADMIN:    { cls: 'bg-amber-100 text-amber-700 border-amber-200',   label: ' Super Admin' },
  };
  const entry = map[role] || { cls: 'bg-gray-100 text-gray-600 border-gray-200', label: role };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${entry.cls}`}>
      {entry.label}
    </span>
  );
};

const ActiveBadge = ({ active }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border
    ${active ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-600 border-red-200'}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-400'}`}/>
    {active ? 'Active' : 'Inactive'}
  </span>
);

// ════════════════════════════════════════════════════════════════
// PASSWORD GENERATOR
// ════════════════════════════════════════════════════════════════
const genPassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ════════════════════════════════════════════════════════════════
// NAV CONFIG  — added "add-school" entry
// ════════════════════════════════════════════════════════════════
const NAV = [
  { id: 'dashboard',  icon: Home,       label: 'Dashboard' },
  { id: 'schools',    icon: School,     label: 'Schools' },
  { id: 'add-school', icon: PlusCircle, label: 'Add New School', highlight: true },
  { id: 'add-all-schools', icon: Layers, label: 'Quick add school' },
  { id: '_section_pricing', label: 'REQUIREMENT PRICING', section: true },
  { id: '_section_student_services', label: 'STUDENT SERVICES', section: true },
  { id: 'voucher-services', icon: ShoppingBag, label: 'Voucher Services' },
  { id: 'shoes-vouchers', icon: ShoppingBag, label: 'Shoes Voucher Mgmt' },
  { id: 'uniform-vouchers', icon: Shirt, label: 'Uniform Voucher Mgmt' },
  { id: 'shop-products', icon: ShoppingBag, label: 'Shop Products' },
  { id: 'standard-kit-requests', icon: Package, label: 'Standard Kit Requests' },
  { id: 'standard-shule-kits', icon: Package, label: 'Standard ShuleKit' },
  { id: 'requirements-prices', icon: DollarSign, label: 'Set Prices' },
  { id: 'prices-list', icon: FileText, label: 'View Prices List' },
  { id: 'invoices', icon: FileText, label: 'Invoices' },
  { id: 'admins',     icon: Users,      label: 'School Admins' },
  { id: '_section_parents_control', label: 'PARENTSCONTROLL', section: true },
  { id: 'parents-control-accounts', icon: UserCheck, label: 'Parents Account', parentControl: true },
  { id: 'parents-control-payments', icon: DollarSign, label: 'Payment', parentControl: true },
  { id: 'nesa',       icon: Flag,       label: 'NESA Admins' },
  { id: 'deo',        icon: MapPin,     label: 'DEO Officers' },
  { id: 'register-agents', icon: Radio, label: 'Field Agents' },
  { id: 'shule-avance-orgs', icon: Sparkles, label: 'ShuleAvance Orgs' },
  { id: 'shule-avance-teacher', icon: Percent, label: 'ShuleAvance Teacher' },
  { id: 'teacher-deal-products', icon: Package, label: 'Teacher Deal Products' },
  // { id: 'activity',   icon: Activity,   label: 'Activity Log' },
  { id: 'settings',   icon: Settings,   label: 'Settings' },
];

// ════════════════════════════════════════════════════════════════
// SIDEBAR — Montserrat, #FEBF10 accent, mobile-friendly
// ════════════════════════════════════════════════════════════════
function Sidebar({ page, onChange, online, user, navigate }) {
  const [parentsOpen, setParentsOpen] = useState(true);
  useEffect(() => {
    if (page === 'parents-control-accounts' || page === 'parents-control-payments') {
      setParentsOpen(true);
    }
  }, [page]);

  return (
    <aside
      className="hidden lg:flex flex-col w-60 xl:w-64 border-r border-amber-400/20 fixed left-0 top-0 h-full z-30 bg-[#000435] shadow-xl shadow-black/20"
      style={{ fontFamily: BABYEYI_FONT_STACK }}
    >
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="px-2 py-1 rounded-xl bg-[#1F2937] flex items-center justify-center border border-amber-300/50 shadow-lg">
            <img
              src="/1BABYEYI LOGO FINAL.png"
              alt="Babyeyi logo"
              className="h-7 w-auto object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black text-white truncate">Babyeyi</h1>
            <p className="text-[10px] text-amber-400/90 font-semibold">Super Admin Portal</p>
          </div>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold border ${
            online
              ? "bg-amber-400/15 border-amber-400/35 text-amber-300"
              : "bg-white/8 border-white/15 text-white/70"
          }`}
        >
          {online ? <Wifi className="w-3 h-3 shrink-0" /> : <WifiOff className="w-3 h-3 shrink-0" />}
          {online ? "Connected" : "Offline"}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(item => {
          if (item.section) {
            if (item.id === '_section_parents_control') {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setParentsOpen((v) => !v)}
                  className="w-full flex items-center justify-between pt-3 pb-1 px-3 text-left"
                >
                  <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest">{item.label}</p>
                  <ChevronDown className={`w-3.5 h-3.5 text-amber-400/70 transition-transform ${parentsOpen ? '' : '-rotate-90'}`} />
                </button>
              );
            }
            return (
              <div key={item.id} className="pt-3 pb-1 px-3">
                <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest">{item.label}</p>
              </div>
            );
          }
          if (item.parentControl && !parentsOpen) return null;
          const isAddSchool = item.id === 'add-school';
          const isAddAllSchools = item.id === 'add-all-schools';
          const isRequirementsPrices = item.id === 'requirements-prices';
          const isPricesList = item.id === 'prices-list';
          const isInvoices = item.id === 'invoices';
          const isRegisterAgents = item.id === 'register-agents';
          const isVoucherServices = item.id === 'voucher-services';
          const isShoesVouchers = item.id === 'shoes-vouchers';
          const isUniformVouchers = item.id === 'uniform-vouchers';
          const isShopProducts = item.id === 'shop-products';
          const isStandardKitRequests = item.id === 'standard-kit-requests';
          const isStandardShuleKits = item.id === 'standard-shule-kits';
          const isShuleAvanceOrgs = item.id === 'shule-avance-orgs';
          const isShuleAvanceTeacher = item.id === 'shule-avance-teacher';
          const isTeacherDealProducts = item.id === 'teacher-deal-products';
          return (
            <button key={item.id}
              onClick={() => {
                if (isAddSchool) {
                  navigate('/add-school');
                } else if (isAddAllSchools) {
                  navigate('/add-all-schools');
                } else if (isVoucherServices) {
                  navigate('/superadmin/voucher-services');
                } else if (isShoesVouchers) {
                  navigate('/superadmin/shoes-vouchers');
                } else if (isUniformVouchers) {
                  navigate('/superadmin/uniform-vouchers');
                } else if (isShopProducts) {
                  navigate('/superadmin/shop-products');
                } else if (isStandardKitRequests) {
                  navigate('/superadmin/standard-kit-requests');
                } else if (isStandardShuleKits) {
                  navigate('/superadmin/standard-shule-kits');
                } else if (isShuleAvanceOrgs) {
                  navigate('/superadmin/shule-avance-organizations');
                } else if (isShuleAvanceTeacher) {
                  navigate('/superadmin/shule-avance-teacher');
                } else if (isTeacherDealProducts) {
                  navigate('/superadmin/teacher-deal-products');
                } else if (isRequirementsPrices) {
                  navigate('/manage-requirements-prices');
                } else if (isPricesList) {
                  navigate('/requirement-prices-list');
                } else if (isInvoices) {
                  navigate('/invoices');
                } else if (isRegisterAgents) {
                  navigate('/superadmin/register-agents');
                } else {
                  onChange(item.id);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-left
                ${item.highlight
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-[#000435] shadow-md shadow-amber-900/20 hover:opacity-95"
                  : page === item.id
                    ? "bg-amber-400 text-[#000435] shadow-md"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
              <item.icon className="w-4 h-4 shrink-0"/>
              <span className={item.parentControl ? 'pl-2' : ''}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <div className="rounded-xl border border-amber-400/25 bg-white/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-black bg-amber-400 text-[#000435]"
            >
              {user?.first_name?.[0]?.toUpperCase() || "S"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.full_name || "Super Admin"}</p>
              <p className="text-[9px] text-amber-400/80 truncate">{user?.email || ""}</p>
            </div>
          </div>
          <p className="text-[9px] text-white/50">Full Access · All Districts</p>
        </div>
        <LogoutButton variant="sidebar" />
      </div>
    </aside>
  );
}

// ════════════════════════════════════════════════════════════════
// NESA ADMIN MODAL
// ════════════════════════════════════════════════════════════════
const EMPTY_NESA = { firstName:'', lastName:'', email:'', phone:'', password:'', confirmPassword:'' };

function NESAAdminModal({ mode, initial, onClose, onSaved }) {
  const [form,   setForm]   = useState(initial || EMPTY_NESA);
  const [errors, setErrors] = useState({});
  const [loading,setLoading]= useState(false);
  const [showPw, setShowPw] = useState(false);
  const isEdit = mode === 'edit';

  const set = (k,v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:null})); };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim())  e.lastName  = 'Required';
    if (!form.email.trim())     e.email     = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!isEdit) {
      if (!form.password)              e.password = 'Required';
      else if (form.password.length<8) e.password = 'Min 8 characters';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        first_name: form.firstName,
        last_name:  form.lastName,
        email:      form.email,
        phone:      form.phone || undefined,
        ...(form.password && { password: form.password }),
      };
      if (isEdit) {
        await axios.put(`${API}/auth/nesa-admin/${form.id}`, payload, axCfg);
        onSaved('NESA Admin updated!', 'success');
      } else {
        await axios.post(`${API}/auth/create-nesa-admin`, payload, axCfg);
        onSaved('NESA Admin created!', 'success');
      }
    } catch (err) {
      onSaved(err.response?.data?.message || 'Operation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit NESA Admin' : 'Create NESA Admin'} onClose={onClose} style={{ textAlign: 'center' }}>
      <div className="space-y-5">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
          <Flag className="w-4 h-4 shrink-0 mt-0.5 text-amber-600"/>
          <span>NESA Admins can access the national Babyeyi fee monitoring portal and review all district submissions.</span>
        </div>

        <div>
          <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-3">Personal Information</p>
          <div className="grid grid-cols-2 gap-3">
            <FieldUI label="First Name" required error={errors.firstName}>
              <input className={inp} value={form.firstName} onChange={e=>set('firstName',e.target.value)} placeholder="Jean"/>
            </FieldUI>
            <FieldUI label="Last Name" required error={errors.lastName}>
              <input className={inp} value={form.lastName} onChange={e=>set('lastName',e.target.value)} placeholder="Bosco"/>
            </FieldUI>
            <FieldUI label="Email" required error={errors.email}>
              <input className={inp} type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="admin@nesa.rw"/>
            </FieldUI>
            <FieldUI label="Phone">
              <input className={inp} value={form.phone||''} onChange={e=>set('phone',e.target.value)} placeholder="+250788000000"/>
            </FieldUI>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-3">
            {isEdit ? 'Change Password (optional)' : 'Set Password'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FieldUI label={isEdit?'New Password':'Password'} required={!isEdit} error={errors.password}>
              <div className="relative">
                <input className={`${inp} pr-20`} type={showPw?'text':'password'}
                  value={form.password||''} onChange={e=>set('password',e.target.value)}
                  placeholder={isEdit?'Leave blank to keep':'Min 8 characters'}/>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button type="button" onClick={()=>setShowPw(!showPw)} className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-600">
                    {showPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                  </button>
                  <button type="button" onClick={()=>{const pw=genPassword();set('password',pw);set('confirmPassword',pw);}}
                    className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-600" title="Generate">
                    <Key className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            </FieldUI>
            <FieldUI label="Confirm Password" error={errors.confirmPassword}>
              <input className={inp} type={showPw?'text':'password'}
                value={form.confirmPassword||''} onChange={e=>set('confirmPassword',e.target.value)}
                placeholder="Repeat password"/>
            </FieldUI>
          </div>
        </div>

        {form.firstName && form.password && !isEdit && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wider mb-2">📋 Credentials to Share</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-lg p-2.5 border border-emerald-100">
                <p className="text-[9px] text-emerald-500 font-bold uppercase">Name</p>
                <p className="font-bold text-emerald-800 text-sm">{form.firstName} {form.lastName}</p>
              </div>
              <div className="bg-white rounded-lg p-2.5 border border-emerald-100">
                <p className="text-[9px] text-emerald-500 font-bold uppercase">Password</p>
                <p className="font-mono font-black text-emerald-800 text-sm">{form.password}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border-2 border-amber-200 text-amber-700 font-semibold text-sm hover:bg-amber-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[#1F2937] hover:bg-[#111827] text-white font-bold text-sm shadow-lg shadow-slate-700/40 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Create NESA Admin'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// DEO MODAL
// ════════════════════════════════════════════════════════════════
const EMPTY_DEO = {
  firstName:'', lastName:'', email:'', phone:'',
  password:'', confirmPassword:'',
  district:'', province:'', sector:'',
};

function DEOModal({ mode, initial, onClose, onSaved }) {
  const [form,   setForm]   = useState(initial || EMPTY_DEO);
  const [errors, setErrors] = useState({});
  const [loading,setLoading]= useState(false);
  const [showPw, setShowPw] = useState(false);
  const isEdit = mode === 'edit';

  const set = (k,v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:null})); };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim())  e.lastName  = 'Required';
    if (!form.email.trim())     e.email     = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.district.trim())  e.district  = 'District is required';
    if (!isEdit) {
      if (!form.password)              e.password = 'Required';
      else if (form.password.length<8) e.password = 'Min 8 characters';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        first_name: form.firstName,
        last_name:  form.lastName,
        email:      form.email,
        phone:      form.phone || undefined,
        district:   form.district,
        province:   form.province || undefined,
        sector:     form.sector   || undefined,
        ...(form.password && { password: form.password }),
      };
      if (isEdit) {
        await axios.put(`${API}/auth/deo-admin/${form.id}`, payload, axCfg);
        onSaved('DEO updated!', 'success');
      } else {
        await axios.post(`${API}/auth/create-deo`, payload, axCfg);
        onSaved('DEO created successfully!', 'success');
      }
    } catch (err) {
      onSaved(err.response?.data?.message || 'Operation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit DEO Officer' : ' Create District Education Officer'} onClose={onClose}>
      <div className="space-y-5">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-amber-600"/>
          <span>DEO Officers can only access and review fee requests from schools within their assigned district.</span>
        </div>

        <div>
          <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-3">Personal Information</p>
          <div className="grid grid-cols-2 gap-3">
            <FieldUI label="First Name" required error={errors.firstName}>
              <input className={inp} value={form.firstName} onChange={e=>set('firstName',e.target.value)} placeholder="Jean"/>
            </FieldUI>
            <FieldUI label="Last Name" required error={errors.lastName}>
              <input className={inp} value={form.lastName} onChange={e=>set('lastName',e.target.value)} placeholder="Bosco"/>
            </FieldUI>
            <FieldUI label="Email" required error={errors.email}>
              <input className={inp} type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="deo@gasabo.gov.rw"/>
            </FieldUI>
            <FieldUI label="Phone">
              <input className={inp} value={form.phone||''} onChange={e=>set('phone',e.target.value)} placeholder="+250788000000"/>
            </FieldUI>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-600"/> District Assignment
          </p>
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 mb-3">
            <p className="text-xs text-amber-800 font-semibold">The DEO will ONLY see data from their assigned district</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldUI label="Province">
              <select className={inp} value={form.province||''} onChange={e=>{set('province',e.target.value); set('district','');}}>
                <option value="">Select Province…</option>
                {Object.keys(PROVINCES).map(p => <option key={p}>{p}</option>)}
              </select>
            </FieldUI>
            <FieldUI label="District" required error={errors.district}>
              <select className={inp} value={form.district} onChange={e=>set('district',e.target.value)} disabled={!form.province}>
                <option value="">Select District…</option>
                {(PROVINCES[form.province]||[]).map(d => <option key={d}>{d}</option>)}
              </select>
            </FieldUI>
          </div>
          {form.district && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600 shrink-0"/>
              <p className="text-sm font-bold text-[#1F2937]">
                Assigned: <span className="text-amber-700">{form.district}{form.province ? `, ${form.province}` : ''}</span>
              </p>
            </div>
          )}
        </div>

        <div>
          <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-3">
            {isEdit ? 'Change Password (optional)' : 'Set Password'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FieldUI label={isEdit?'New Password':'Password'} required={!isEdit} error={errors.password}>
              <div className="relative">
                <input className={`${inp} pr-20`} type={showPw?'text':'password'}
                  value={form.password||''} onChange={e=>set('password',e.target.value)}
                  placeholder={isEdit?'Leave blank to keep':'Min 8 characters'}/>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button type="button" onClick={()=>setShowPw(!showPw)} className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-600">
                    {showPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                  </button>
                  <button type="button" onClick={()=>{const pw=genPassword();set('password',pw);set('confirmPassword',pw);}}
                    className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-600" title="Generate">
                    <Key className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            </FieldUI>
            <FieldUI label="Confirm Password" error={errors.confirmPassword}>
              <input className={inp} type={showPw?'text':'password'}
                value={form.confirmPassword||''} onChange={e=>set('confirmPassword',e.target.value)}
                placeholder="Repeat password"/>
            </FieldUI>
          </div>
        </div>

        {form.firstName && form.password && form.district && !isEdit && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wider mb-2">📋 DEO Credentials to Share</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-lg p-2.5 border border-emerald-100">
                <p className="text-[9px] text-emerald-500 font-bold uppercase">District</p>
                <p className="font-bold text-emerald-800 text-sm">{form.district}</p>
              </div>
              <div className="bg-white rounded-lg p-2.5 border border-emerald-100">
                <p className="text-[9px] text-emerald-500 font-bold uppercase">Name</p>
                <p className="font-bold text-emerald-800 text-sm">{form.firstName} {form.lastName}</p>
              </div>
              <div className="bg-white rounded-lg p-2.5 border border-emerald-100">
                <p className="text-[9px] text-emerald-500 font-bold uppercase">Password</p>
                <p className="font-mono font-black text-emerald-800 text-sm">{form.password}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border-2 border-amber-200 text-amber-700 font-semibold text-sm hover:bg-amber-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[#1F2937] hover:bg-[#111827] text-white font-bold text-sm shadow-lg shadow-slate-700/40 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Create DEO'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// DELETE MODAL
// ════════════════════════════════════════════════════════════════
function DeleteModal({ user, endpoint, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);

  const doDelete = async () => {
    setLoading(true);
    try {
      await axios.delete(`${API}/${endpoint}/${user.id}`, axCfg);
      onDeleted('Deleted successfully', 'success');
    } catch (err) {
      onDeleted(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Confirm Delete" onClose={onClose} size="max-w-sm">
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-red-500"/>
        </div>
        <p className="text-gray-800 text-sm">
          Delete <strong>{user.full_name || `${user.first_name} ${user.last_name}`}</strong>?
          <br/>This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-amber-200 text-amber-700 font-semibold text-sm hover:bg-amber-50">
            Cancel
          </button>
          <button onClick={doDelete} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<Trash2 className="w-4 h-4"/>} Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// DASHBOARD HOME PAGE
// ════════════════════════════════════════════════════════════════
function DashboardPage({
  counts,
  setPage,
  user,
  navigate,
  parentUpgradeStats,
  webhookAlertRed = 0,
  unmatchedYellow = 0,
}) {
  return (
    <div className="space-y-5 anim">
      <div className="rounded-2xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #1F2937 50%, #1F2937 100%)` }}>
        <div className="absolute inset-0 opacity-10"
          style={{backgroundImage:'radial-gradient(circle at 80% 20%,white 0%,transparent 50%)'}}/>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse"/>
            <span className="text-amber-100 text-xs">
              {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mb-1">
             Welcome, {user?.first_name || 'Super Admin'}
          </h2>
          <p className="text-amber-100 text-xs">Edupoto Suite · Full System Access · Session-secured</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 border border-white/30 text-xs font-semibold">
              <Users className="w-3.5 h-3.5"/> {counts.total} Total Users
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 border border-white/30 text-xs font-semibold">
              <DollarSign className="w-3.5 h-3.5"/> Requirement Pricing
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/25 border border-emerald-400/30 text-xs font-semibold">
              <Flag className="w-3.5 h-3.5 text-emerald-300"/> {counts.nesa} NESA
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/25 border border-violet-400/30 text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5 text-violet-300"/> {counts.deo} DEO
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={School} label="Schools"       value={counts.schools} color="amber"  onClick={()=>setPage('schools')}/>
        <StatCard icon={Users}  label="School Admins" value={counts.admins}  color="teal"   onClick={()=>setPage('admins')}/>
        <StatCard icon={Flag}   label="NESA Admins"   value={counts.nesa}    color="indigo" onClick={()=>setPage('nesa')}/>
        <StatCard icon={MapPin} label="DEO Officers"  value={counts.deo}     color="violet" onClick={()=>setPage('deo')}/>
        <StatCard
          icon={AlertTriangle}
          label="Webhook Errors"
          value={webhookAlertRed}
          sub={webhookAlertRed > 0 ? 'Needs reconciliation' : 'Healthy'}
          color={webhookAlertRed > 0 ? 'red' : 'emerald'}
          alert={webhookAlertRed > 0}
          onClick={() => setPage('parents-control-payments')}
        />
        <StatCard
          icon={Bell}
          label="Unmatched Webhooks"
          value={unmatchedYellow}
          sub={unmatchedYellow > 0 ? 'Check references' : 'All matched'}
          color={unmatchedYellow > 0 ? 'amber' : 'blue'}
          alert={unmatchedYellow > 0}
          onClick={() => setPage('parents-control-payments')}
        />
      </div>

      <div className="bg-white border-2 border-amber-100 rounded-2xl shadow-lg p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <UserCheck className="w-4 h-4" style={{ color: ACCENT }}/> Parent portal upgrades
          </h3>
          <span className="text-xs font-semibold text-amber-700">
            {parentUpgradeStats.upgraded_accounts || 0} upgraded / {parentUpgradeStats.total_accounts || 0} total
          </span>
        </div>
        {!parentUpgradeStats.recent?.length ? (
          <p className="text-xs text-amber-700">No parent portal accounts yet.</p>
        ) : (
          <div className="space-y-2">
            {parentUpgradeStats.recent.slice(0, 6).map((p) => {
              const name = p.father_full_name || p.mother_full_name || "Parent";
              return (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{name}</p>
                    <p className="text-[10px] text-amber-700 font-mono">{p.phone}</p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold border ${
                      p.created_via_phone_only
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                    title={p.created_via_phone_only ? "Completed from phone-only login" : "Created directly"}
                  >
                    {p.created_via_phone_only ? "Completed" : "Direct"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white border-2 border-amber-100 rounded-2xl shadow-lg p-5">
        <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
          <Star className="w-4 h-4" style={{ color: ACCENT }}/> Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { icon: PlusCircle, label: 'Register School',      action: ()=>navigate('/add-school'), color: 'green' },
            { icon: DollarSign, label: 'Set Prices',           action: ()=>navigate('/manage-requirements-prices'), color: 'amber' },
            { icon: FileText,   label: 'Prices List',          action: ()=>navigate('/requirement-prices-list'), color: 'primary' },
            { icon: Flag,       label: 'Add NESA Admin',       action: ()=>setPage('nesa'),         color: 'indigo' },
            { icon: MapPin,     label: 'Add DEO Officer',      action: ()=>setPage('deo'),          color: 'violet' },
            { icon: BarChart3,  label: 'View Activity',        action: ()=>setPage('activity'),     color: 'cyan' },
          ].map(({ icon: Icon, label, action, color }) => (
            <button key={label} onClick={action}
              className={`p-4 bg-gradient-to-br ${GRAD[color]} rounded-2xl text-white text-center transition-all active:scale-95 hover:scale-[1.02] shadow-md`}>
              <Icon className="mx-auto mb-2 w-5 h-5"/>
              <p className="text-xs font-bold">{label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5"/>
        <div>
          <p className="text-sm font-bold text-emerald-800">Secure Session Active</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            Authenticated as <strong>{user?.email}</strong> via httpOnly cookie.
            No tokens stored in browser. Session expires after 8 hours of inactivity.
          </p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// USERS TABLE (reusable)
// ════════════════════════════════════════════════════════════════
function UsersTable({ users, loading, onEdit, onDelete, columns, emptyMsg }) {
  if (loading) return <Spinner/>;
  if (!users.length) return <Empty msg={emptyMsg || 'No users found'}/>;
  return (
    <div className="bg-white border-2 border-amber-100 rounded-2xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <THead cols={[...columns.map(c => c.label), 'Actions']}/>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id}
                className={`border-b border-amber-50 hover:bg-amber-50/60 transition-colors ${i%2 ? 'bg-amber-50/30' : ''} group`}>
                {columns.map(col => (
                  <td key={col.key} className="py-3 px-4">
                    {col.render ? col.render(u) : <span className="text-sm text-blue-800">{u[col.key] || '—'}</span>}
                  </td>
                ))}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => onEdit(u)}
                      className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200">
                      <Edit className="w-3.5 h-3.5"/>
                    </button>
                    <button onClick={() => onDelete(u)}
                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 border border-red-100">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ParentAccountsPage({
  mode = 'accounts',
  rows,
  loading,
  search,
  onSearchChange,
  page,
  total,
  totalPages,
  onPageChange,
  onExportCsv,
  onRefresh,
  paymentIntents,
  paymentIntentsLoading,
  paymentStatusDrafts,
  setPaymentStatusDraft,
  onSavePaymentStatus,
  savingPaymentIntentId,
  paymentStatusFilter,
  setPaymentStatusFilter,
  paymentDateFrom,
  setPaymentDateFrom,
  paymentDateTo,
  setPaymentDateTo,
  paymentDistrict,
  setPaymentDistrict,
  paymentSector,
  setPaymentSector,
  paymentSchoolId,
  setPaymentSchoolId,
  paymentChannelFilter,
  setPaymentChannelFilter,
  paymentFilterOptions,
  onApplyPaymentFilters,
  onViewPaymentDetail,
  paymentIntentPage,
  paymentIntentTotalPages,
  onPaymentIntentPageChange,
  onExportPaymentIntentsCsv,
  onReconcilePaymentIntent,
  onRetryCollection,
  webhookLogs,
  webhookLogsLoading,
  webhookLogStatusFilter,
  setWebhookLogStatusFilter,
  webhookLogMatchedFilter,
  setWebhookLogMatchedFilter,
  webhookLogDateFrom,
  setWebhookLogDateFrom,
  webhookLogDateTo,
  setWebhookLogDateTo,
  onApplyWebhookFilters,
  webhookLogPage,
  webhookLogTotalPages,
  onWebhookPageChange,
  onReconcileWebhookLog,
  reconcilingWebhookLogId,
  reconcilingIntentId,
  retryingIntentId,
  onExportWebhookLogsCsv,
  onViewWebhookLogDetail,
  webhookSummary,
}) {
  const statusPill = (statusRaw) => {
    const status = String(statusRaw || 'submitted').toLowerCase();
    const map = {
      submitted: 'bg-amber-100 text-amber-700 border-amber-200',
      paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      failed: 'bg-red-100 text-red-700 border-red-200',
      draft: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return map[status] || map.submitted;
  };

  const allSectors = paymentFilterOptions?.sectors || [];
  const allSchools = paymentFilterOptions?.schools || [];
  const schoolsByDistrict = paymentDistrict
    ? allSchools.filter((s) => String(s?.district || '') === paymentDistrict)
    : allSchools;
  const sectorsByDistrict = paymentDistrict
    ? Array.from(new Set(schoolsByDistrict.map((s) => String(s?.sector || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
    : allSectors;
  const schoolsBySector = paymentSector
    ? schoolsByDistrict.filter((s) => String(s?.sector || '') === paymentSector)
    : schoolsByDistrict;
  const isAccountsMode = mode === 'accounts';
  const isPaymentsMode = mode === 'payments';

  return (
    <div className="space-y-4 anim">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-black text-[#1F2937] text-lg">{isAccountsMode ? 'Parent Accounts' : 'Who is paying (recent intents)'}</h3>
          <p className="text-xs text-amber-700 mt-0.5">
            {isAccountsMode ? `${total} accounts found` : 'All Babyeyi Pay intents — including Babyeyi Finder (no login). Filter by channel or search student / payer.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          {isAccountsMode ? (
            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1F2937] text-white text-xs font-bold hover:bg-[#111827]"
            >
              <Download className="w-3.5 h-3.5" />
              Export Parents CSV
            </button>
          ) : (
            <button
              onClick={onExportPaymentIntentsCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 bg-white text-amber-700 text-xs font-bold hover:bg-amber-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export Paying CSV
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={isAccountsMode ? 'Search by phone, name, or email…' : 'Search payer, school, student name, code, UID…'}
          className={`${inp} pl-9`}
        />
      </div>

      {isAccountsMode && (loading ? (
        <Spinner />
      ) : !rows.length ? (
        <Empty msg="No parent accounts found." Icon={UserCheck} />
      ) : (
        <div className="bg-white border-2 border-amber-100 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <THead cols={['Parent', 'Contact', 'Account Type', 'Completed At', 'Created']} />
              <tbody>
                {rows.map((r, i) => {
                  const fullName = r.father_full_name || r.mother_full_name || 'Parent';
                  const email = r.father_email || r.mother_email || '—';
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-amber-50 hover:bg-amber-50/60 transition-colors ${i % 2 ? 'bg-amber-50/30' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#1F2937] text-sm">{fullName}</p>
                        <p className="text-[10px] text-amber-700">ID: {r.id}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs text-amber-800 font-mono">{r.phone}</p>
                        <p className="text-[10px] text-amber-700 truncate max-w-[18rem]">{email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold border ${
                            r.created_via_phone_only
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {r.created_via_phone_only ? 'Completed' : 'Direct'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-blue-500">
                        {r.completed_registration_at
                          ? new Date(r.completed_registration_at).toLocaleString()
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-blue-500">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {isPaymentsMode && (
      <div className="bg-white border-2 border-amber-100 rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-black text-[#1F2937] text-sm">Who is paying (recent intents)</h4>
          <span className="text-[11px] text-amber-700">Latest records</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 mb-3">
          <select
            value={paymentDistrict}
            onChange={(e) => {
              const d = e.target.value;
              setPaymentDistrict(d);
              setPaymentSector('');
              setPaymentSchoolId('');
            }}
            className="rounded-xl border border-amber-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-700"
          >
            <option value="">All districts</option>
            {(paymentFilterOptions?.districts || []).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={paymentSector}
            onChange={(e) => {
              const s = e.target.value;
              setPaymentSector(s);
              setPaymentSchoolId('');
            }}
            className="rounded-xl border border-amber-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-700"
          >
            <option value="">All sectors</option>
            {sectorsByDistrict.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={paymentSchoolId}
            onChange={(e) => setPaymentSchoolId(e.target.value)}
            className="rounded-xl border border-amber-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-700"
          >
            <option value="">All schools</option>
            {schoolsBySector.map((s) => (
              <option key={s.id} value={s.id}>{s.school_name}</option>
            ))}
          </select>
          <select
            value={paymentChannelFilter}
            onChange={(e) => setPaymentChannelFilter(e.target.value)}
            className="rounded-xl border border-amber-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-700"
            title="Babyeyi Finder guest = pay started without parent login"
          >
            <option value="all">All pay channels</option>
            <option value="guest_finder">Babyeyi Finder (guest)</option>
            <option value="other">Other (signed-in / legacy)</option>
          </select>
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="rounded-xl border border-amber-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-700"
          >
            <option value="all">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
          <input
            type="date"
            value={paymentDateFrom}
            onChange={(e) => setPaymentDateFrom(e.target.value)}
            className="rounded-xl border border-amber-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-700"
          />
          <input
            type="date"
            value={paymentDateTo}
            onChange={(e) => setPaymentDateTo(e.target.value)}
            className="rounded-xl border border-amber-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-700"
          />
          <button
            type="button"
            onClick={onApplyPaymentFilters}
            className="rounded-xl border border-amber-200 bg-[#1F2937] px-2.5 py-2 text-xs font-bold text-white hover:bg-[#111827]"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              setPaymentDistrict('');
              setPaymentSector('');
              setPaymentSchoolId('');
              setPaymentChannelFilter('all');
              setPaymentStatusFilter('all');
              setPaymentDateFrom('');
              setPaymentDateTo('');
              onApplyPaymentFilters?.(true);
            }}
            className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100"
          >
            Clear filters
          </button>
        </div>
        {paymentIntentsLoading ? (
          <Spinner />
        ) : !paymentIntents?.length ? (
          <p className="text-xs text-gray-500">No payment intents yet.</p>
        ) : (
          <div className="space-y-2">
            {paymentIntents.map((it) => (
              (() => {
                const providerCode = String(it.provider || '').toLowerCase();
                const hasProviderRef = !!String(it.provider_reference || it.provider_tid || '').trim();
                const canReconcile = providerCode === 'xentripay' && hasProviderRef;
                const canRetry = providerCode === 'xentripay' && ['failed', 'submitted'].includes(String(it.status || '').toLowerCase());
                return (
              <div key={it.id} className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    {(it.is_guest_finder || it.pay_channel === 'guest_finder') && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-violet-100 text-violet-800 border border-violet-200">
                        Finder guest
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-black text-[#1F2937] truncate">{it.payer_name || 'Parent'}</p>
                  <p className="text-[10px] text-amber-700 truncate">{it.payer_phone || 'No phone'} {it.payer_email ? `· ${it.payer_email}` : ''}</p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {it.school_name || 'School'} · {it.class_name || 'Class'} · {it.term || '-'} · {it.academic_year || '-'}
                  </p>
                </div>
                <div className="text-right shrink-0 min-w-[180px]">
                  <p className="text-xs font-black text-emerald-700">{Number(it.total_rwf || 0).toLocaleString()} RWF</p>
                  <p className="text-[10px] text-gray-500">{it.created_at ? new Date(it.created_at).toLocaleDateString() : ''}</p>
                  <div className="mt-1.5 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onViewPaymentDetail(it)}
                      className="text-[11px] rounded-lg border border-amber-200 bg-white text-amber-700 px-2.5 py-1 font-bold"
                    >
                      View
                    </button>
                    <select
                      value={paymentStatusDrafts[it.id] || String(it.status || 'submitted').toLowerCase()}
                      onChange={(e) => setPaymentStatusDraft(it.id, e.target.value)}
                      className="text-[11px] rounded-lg border border-amber-200 bg-white px-2 py-1 font-bold text-gray-700"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => onSavePaymentStatus(it.id)}
                      disabled={savingPaymentIntentId === it.id}
                      className="text-[11px] rounded-lg bg-[#1F2937] text-white px-2.5 py-1 font-bold disabled:opacity-60"
                    >
                      {savingPaymentIntentId === it.id ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onReconcilePaymentIntent?.(it.id)}
                      disabled={reconcilingIntentId === it.id || !canReconcile}
                      title={canReconcile ? 'Reconcile with XentriPay' : 'Available only for XentriPay intents with reference'}
                      className="text-[11px] rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-2.5 py-1 font-bold disabled:opacity-50"
                    >
                      {reconcilingIntentId === it.id ? 'Reconciling...' : 'Reconcile'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRetryCollection?.(it.id)}
                      disabled={retryingIntentId === it.id || !canRetry}
                      title={canRetry ? 'Retry XentriPay collection' : 'Retry is only for failed/submitted XentriPay intents'}
                      className="text-[11px] rounded-lg border border-amber-200 bg-amber-50 text-amber-700 px-2.5 py-1 font-bold disabled:opacity-50"
                    >
                      {retryingIntentId === it.id ? 'Retrying...' : 'Retry'}
                    </button>
                  </div>
                  <p className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusPill(paymentStatusDrafts[it.id] || it.status)}`}>
                      {String(paymentStatusDrafts[it.id] || it.status || 'submitted').toUpperCase()}
                    </span>
                  </p>
                  <p className="mt-1 text-[10px] text-gray-500">
                    {it.provider ? `${String(it.provider).toUpperCase()} · ${String(it.provider_status || 'N/A').toUpperCase()}` : 'No provider'}
                  </p>
                  <p className="mt-1 text-[10px] text-gray-500">
                    Retries: {Number(it.retry_count || 0)} · Last retry: {it.last_retry_at ? new Date(it.last_retry_at).toLocaleString() : '—'}
                  </p>
                  {it.provider_error_message ? (
                    <p className="mt-1 text-[10px] text-red-600 max-w-[220px] truncate" title={it.provider_error_message}>
                      Cause: {it.provider_error_message}
                    </p>
                  ) : null}
                </div>
              </div>
                );
              })()
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-100 bg-white px-3 py-2">
          <p className="text-xs text-amber-700">
            Payment page {paymentIntentPage} of {paymentIntentTotalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPaymentIntentPageChange(Math.max(1, paymentIntentPage - 1))}
              disabled={paymentIntentPage <= 1}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-200 text-amber-700 bg-amber-50 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => onPaymentIntentPageChange(Math.min(paymentIntentTotalPages, paymentIntentPage + 1))}
              disabled={paymentIntentPage >= paymentIntentTotalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-200 text-amber-700 bg-amber-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-100 bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-black text-[#1F2937] text-sm">Webhook Logs + Reconciliation</h4>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-amber-700">XentriPay events</span>
              <button
                type="button"
                onClick={onExportWebhookLogsCsv}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-white text-amber-700 text-[11px] font-bold hover:bg-amber-50"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>
          <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2">
              <p className="text-[10px] text-amber-700 font-bold uppercase">Total logs</p>
              <p className="text-sm font-black text-[#1F2937]">{Number(webhookSummary?.total_logs || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
              <p className="text-[10px] text-emerald-700 font-bold uppercase">Matched</p>
              <p className="text-sm font-black text-emerald-800">{Number(webhookSummary?.matched_logs || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50/60 px-3 py-2">
              <p className="text-[10px] text-red-700 font-bold uppercase">Problematic</p>
              <p className="text-sm font-black text-red-700">{Number(webhookSummary?.problematic_logs || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
            <select
              value={webhookLogStatusFilter}
              onChange={(e) => setWebhookLogStatusFilter?.(e.target.value)}
              className="rounded-xl border border-amber-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-700"
            >
              <option value="">All processing</option>
              <option value="processed">Processed</option>
              <option value="reconciled">Reconciled</option>
              <option value="no_match">No match</option>
              <option value="ignored">Ignored</option>
              <option value="error">Error</option>
            </select>
            <select
              value={webhookLogMatchedFilter}
              onChange={(e) => setWebhookLogMatchedFilter?.(e.target.value)}
              className="rounded-xl border border-amber-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-700"
            >
              <option value="">Matched + unmatched</option>
              <option value="yes">Matched</option>
              <option value="no">Unmatched</option>
            </select>
            <input
              type="date"
              value={webhookLogDateFrom}
              onChange={(e) => setWebhookLogDateFrom?.(e.target.value)}
              className="rounded-xl border border-amber-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-700"
            />
            <input
              type="date"
              value={webhookLogDateTo}
              onChange={(e) => setWebhookLogDateTo?.(e.target.value)}
              className="rounded-xl border border-amber-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-700"
            />
            <button
              type="button"
              onClick={() => onApplyWebhookFilters?.(false)}
              className="rounded-xl border border-amber-200 bg-[#1F2937] px-2.5 py-2 text-xs font-bold text-white hover:bg-[#111827]"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => onApplyWebhookFilters?.(true)}
              className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100"
            >
              Clear
            </button>
          </div>
          {webhookLogsLoading ? (
            <Spinner />
          ) : !(webhookLogs || []).length ? (
            <p className="text-xs text-gray-500">No webhook logs yet.</p>
          ) : (
            <div className="space-y-2">
              {(webhookLogs || []).map((log) => (
                <div key={log.id} className="rounded-lg border border-amber-100 bg-amber-50/40 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#1F2937] truncate">
                        {log.event_type || 'UNKNOWN_EVENT'} · {String(log.provider_status || 'N/A').toUpperCase()}
                      </p>
                      <p className="text-[10px] text-amber-700 truncate">
                        Ref: {log.reference_value || '—'} · Intent: {log.intent_id || '—'}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : '—'} · {String(log.processing_status || 'received').toUpperCase()} · {log.matched_intent ? 'MATCHED' : 'UNMATCHED'}
                      </p>
                      {log.error_message ? <p className="text-[10px] text-red-600 mt-0.5">{log.error_message}</p> : null}
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onViewWebhookLogDetail?.(log.id)}
                        className="text-[11px] rounded-lg border border-amber-200 bg-white text-amber-700 px-2.5 py-1 font-bold hover:bg-amber-50"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => onReconcileWebhookLog?.(log.id)}
                        disabled={reconcilingWebhookLogId === log.id}
                        className="text-[11px] rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-2.5 py-1 font-bold disabled:opacity-60"
                      >
                        {reconcilingWebhookLogId === log.id ? 'Reconciling...' : 'Reconcile'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-100 bg-white px-3 py-2">
            <p className="text-xs text-amber-700">
              Webhook page {webhookLogPage} of {webhookLogTotalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onWebhookPageChange?.(Math.max(1, webhookLogPage - 1))}
                disabled={webhookLogPage <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-200 text-amber-700 bg-amber-50 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => onWebhookPageChange?.(Math.min(webhookLogTotalPages, webhookLogPage + 1))}
                disabled={webhookLogPage >= webhookLogTotalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-200 text-amber-700 bg-amber-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {isAccountsMode && (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-100 bg-white px-3 py-2">
        <p className="text-xs text-amber-700">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-200 text-amber-700 bg-amber-50 disabled:opacity-50"
          >
            Prev
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-200 text-amber-700 bg-amber-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SCHOOLS PAGE  — uses /api/schools (school-add.js)
// ════════════════════════════════════════════════════════════════
function SchoolsPage({ navigate, addToast }) {
  const [schools,   setSchools]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [search,    setSearch]    = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | active | inactive
  const [districtFilter, setDistrictFilter] = useState('');
  const [districts, setDistricts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [page,      setPage]      = useState(1);
  const [limit]                 = useState(10);
  const [total,     setTotal]    = useState(0);
  const [modal,     setModal]     = useState(null);
  const [editing,   setEditing]   = useState(null);
  const [editForm,  setEditForm]  = useState({});
  const [saving,    setSaving]    = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState('');
  const selectAllRef = useRef(null);
  const [subscriptionSchool, setSubscriptionSchool] = useState(null);
  const [subForm, setSubForm] = useState({});
  const [savingSub, setSavingSub] = useState(false);
  const [showMgrPw, setShowMgrPw] = useState(false);

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));

  const toDateTimeLocal = (v) => {
    if (v == null || v === '') return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    const z = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
  };

  const openSubscription = (school) => {
    setSubscriptionSchool(school);
    setSubForm({
      subscription_plan: school.subscription_plan === 'pro' ? 'pro' : 'lite',
      pro_enabled: !!(school.pro_enabled === 1 || school.pro_enabled === true),
      pro_start_date: toDateTimeLocal(school.pro_start_date),
      pro_end_date: toDateTimeLocal(school.pro_end_date),
      school_status: school.school_status || 'active',
    });
    setModal({ type: 'subscription' });
  };

  const saveSubscription = async () => {
    if (!subscriptionSchool) return;
    setSavingSub(true);
    try {
      const payload = {
        subscription_plan: subForm.subscription_plan,
        pro_enabled: !!subForm.pro_enabled,
        school_status: subForm.school_status,
        pro_start_date: subForm.pro_start_date ? subForm.pro_start_date : null,
        pro_end_date: subForm.pro_end_date ? subForm.pro_end_date : null,
      };
      await axios.patch(
        `${API}/auth/schools/${subscriptionSchool.id}/subscription`,
        payload,
        axCfg
      );
      addToast('School plan & platform access updated', 'success');
      setModal(null);
      setSubscriptionSchool(null);
      fetchSchools(page);
    } catch (err) {
      addToast(err.response?.data?.message || err.response?.data?.error || 'Update failed', 'error');
    } finally {
      setSavingSub(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/schools/districts`, axCfg);
        if (res.data.success) setDistricts(res.data.data || []);
      } catch { /* ignore */ }
    })();
  }, []);

  const fetchSchools = async (p = 1) => {
    setLoading(true);
    try {
      const params = {
        page: p,
        limit,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        ...(districtFilter ? { district: districtFilter } : {}),
      };
      const res = await axios.get(`${API}/schools`, { ...axCfg, params });
      if (res.data.success) {
        setSchools(res.data.data || []);
        setTotal(res.data.total ?? 0);
        setPage(p);
        setSelectedIds([]);
      }
    } catch {
      addToast('Failed to load schools', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, districtFilter]);

  const filtered = schools;

  const pageIds = filtered.map(s => s.id);
  const selectedOnPage = pageIds.filter(id => selectedIds.includes(id)).length;
  const allOnPageSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedOnPage > 0 && !allOnPageSelected;
    }
  }, [selectedOnPage, allOnPageSelected, filtered.length]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleSelectAllOnPage = () => {
    const pageIds = filtered.map(s => s.id);
    const allOn = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
    if (allOn) setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    else setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    try {
      await axios.post(`${API}/schools/bulk-delete`, { ids: selectedIds }, axCfg);
      addToast(`Deleted ${selectedIds.length} school(s)`, 'success');
      setModal(null);
      fetchSchools(page);
    } catch (err) {
      addToast(err.response?.data?.message || 'Bulk delete failed', 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleDeleteAllSchools = async () => {
    if (deleteAllConfirm !== 'DELETE_ALL_SCHOOLS') {
      addToast('Type DELETE_ALL_SCHOOLS to confirm', 'error');
      return;
    }
    setBulkBusy(true);
    try {
      const res = await axios.post(
        `${API}/schools/bulk-delete`,
        { deleteAll: true, confirmPhrase: 'DELETE_ALL_SCHOOLS' },
        axCfg
      );
      addToast(res.data?.message || 'All schools deleted', 'success');
      setModal(null);
      setDeleteAllConfirm('');
      fetchSchools(1);
    } catch (err) {
      addToast(err.response?.data?.message || 'Delete all failed', 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleDelete = async (school) => {
    try {
      await axios.delete(`${API}/schools/${school.id}`, axCfg);
      addToast(`School "${school.school_name}" deleted`, 'success');
      fetchSchools(page);
    } catch (err) {
      addToast(err.response?.data?.message || 'Delete failed', 'error');
    }
    setModal(null);
  };

  const toggleStatus = async (school) => {
    const newStatus = school.status === 'active' ? 'inactive' : 'active';
    try {
      await axios.put(`${API}/schools/${school.id}/status`, { status: newStatus }, axCfg);
      addToast(`School status set to "${newStatus}"`, 'success');
      fetchSchools(page);
    } catch (err) {
      addToast(err.response?.data?.message || 'Status update failed', 'error');
    }
  };

  const openEdit = async (school) => {
    try {
      setSaving(false);
      setEditForm({
        id:          school.id,
        schoolName:  school.school_name || '',
        schoolCode:  school.school_code || '',
        province:    school.province || '',
        district:    school.district || '',
        sector:      school.sector || '',
        phone:       school.phone || '',
        email:       school.email || '',
        category:    school.school_category || '',
        ownership:   school.ownership_type || '',
        headName:    school.head_teacher_name || '',
        managerHasAccount: false,
        managerLoginEmail: '',
        originalManagerEmail: '',
        managerPassword: '',
        managerPasswordConfirm: '',
      });
      setEditing(school);
      setModal({ type: 'edit' });
      // Load full details in background to get any missing fields
      const res = await axios.get(`${API}/schools/${school.id}`, axCfg);
      if (res.data?.success && res.data.data) {
        const s = res.data.data;
        const mgrEmail = (s.manager_email || '').trim();
        setEditForm(f => ({
          ...f,
          province:   s.province || f.province,
          district:   s.district || f.district,
          sector:     s.sector   || f.sector,
          phone:      s.phone    || f.phone,
          email:      s.email    || f.email,
          headName:   s.head_teacher_name || f.headName,
          category:   s.school_category   || f.category,
          ownership:  s.ownership_type    || f.ownership,
          managerHasAccount: !!(mgrEmail || s.manager_uid),
          managerLoginEmail: mgrEmail || f.managerLoginEmail,
          originalManagerEmail: mgrEmail,
        }));
      }
    } catch {
      // Keep the modal open with row data, just warn the user
      addToast('Failed to load full school details. You can still edit basic fields.', 'error');
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editForm.schoolName.trim() || !editForm.schoolCode.trim()) {
      addToast('School name and code are required', 'error');
      return;
    }
    const mgrEmail = (editForm.managerLoginEmail || '').trim().toLowerCase();
    const origMgr = (editForm.originalManagerEmail || '').trim().toLowerCase();
    const pwd = (editForm.managerPassword || '').trim();
    const pwd2 = (editForm.managerPasswordConfirm || '').trim();
    if (editForm.managerHasAccount) {
      if (!mgrEmail) {
        addToast('School manager login email is required', 'error');
        return;
      }
      if (pwd || pwd2) {
        if (pwd !== pwd2) {
          addToast('Manager password fields do not match', 'error');
          return;
        }
        if (pwd.length < 8) {
          addToast('Manager password must be at least 8 characters', 'error');
          return;
        }
      }
    }
    setSaving(true);
    try {
      const payload = {
        schoolName: editForm.schoolName.trim(),
        schoolCode: editForm.schoolCode.trim().toUpperCase(),
        province:   editForm.province || null,
        district:   editForm.district || null,
        sector:     editForm.sector   || null,
        phone:      editForm.phone    || null,
        email:      editForm.email    || null,
        category:   editForm.category || null,
        ownership:  editForm.ownership || null,
        headName:   editForm.headName || null,
      };
      await axios.put(`${API}/schools/${editing.id}`, payload, {
        ...axCfg,
        headers: { ...axCfg.headers, 'Content-Type': 'application/json' },
      });
      if (editForm.managerHasAccount && (mgrEmail !== origMgr || pwd.length > 0)) {
        await axios.patch(
          `${API}/auth/schools/${editing.id}/manager-credentials`,
          {
            login_email: mgrEmail,
            ...(pwd.length > 0 ? { new_password: pwd } : {}),
          },
          axCfg
        );
      }
      addToast('School updated successfully', 'success');
      setModal(null);
      setEditing(null);
      setShowMgrPw(false);
      fetchSchools(page);
    } catch (err) {
      addToast(err.response?.data?.message || err.response?.data?.error || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 anim">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-black text-[#1F2937] text-lg">Schools</h3>
          <p className="text-xs text-amber-700 mt-0.5">
            Showing {filtered.length} of {total || 0} schools
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setModal({ type: 'bulk-delete' })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100"
            >
              <Trash2 className="w-3.5 h-3.5"/> Delete ({selectedIds.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => { setDeleteAllConfirm(''); setModal({ type: 'delete-all' }); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-red-300 text-red-700 text-xs font-bold hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5"/> Delete all
          </button>
          <button type="button" onClick={() => fetchSchools(page)} className="p-2 rounded-xl border-2 border-amber-200 text-amber-600 hover:bg-amber-50">
            <RefreshCw className="w-4 h-4"/>
          </button>
          <button type="button" onClick={() => navigate('/add-school')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#F5B800] to-amber-500 hover:opacity-90 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-200/60 active:scale-95 transition-all">
            <PlusCircle className="w-4 h-4"/> Register School
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, code, district…" className={`${inp} pl-9`}/>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1.5 text-amber-800">
          <Filter className="w-4 h-4 shrink-0"/>
          <span className="text-[11px] font-bold uppercase tracking-wide">Filters</span>
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className={`${inp} py-2.5 max-w-[200px] text-sm`}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active (approved)</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={districtFilter}
          onChange={e => setDistrictFilter(e.target.value)}
          className={`${inp} py-2.5 max-w-[220px] text-sm`}
        >
          <option value="">All districts</option>
          {districts.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {loading ? <Spinner/> : !filtered.length ? (
        <div className="text-center py-16">
          <School className="w-12 h-12 mx-auto mb-3 text-amber-200 opacity-60"/>
          <p className="font-semibold text-amber-700 text-sm">No schools found</p>
          <button onClick={() => navigate('/add-school')}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow">
            <PlusCircle className="w-4 h-4"/> Register First School
          </button>
        </div>
      ) : (
        <>
          {/* Desktop / tablet table view */}
          <div className="hidden md:block bg-white border border-amber-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-amber-100 bg-amber-50/80">
                    <th className="text-left py-3 px-2 w-10">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAllOnPage}
                        className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        aria-label="Select all on this page"
                      />
                    </th>
                    {['School','Code','Dist.','Location','Level(s)','Category','Plan','Status','Actions'].map((h, i) => (
                      <th key={i} className="text-left py-3 px-4 text-[11px] font-bold text-amber-800 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.id}
                      className={`border-b border-amber-50 hover:bg-amber-50/40 transition-colors group ${i%2 ? 'bg-amber-50/20' : ''}`}>
                      <td className="py-3 px-2 w-10 align-middle">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                          aria-label={`Select ${s.school_name}`}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                        {toAssetUrl(s.logo_url)
                          ? <img src={toAssetUrl(s.logo_url)} alt="" className="w-8 h-8 rounded-lg object-cover border border-amber-100"/>
                          : <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                <School className="w-4 h-4 text-amber-500"/>
                              </div>
                          }
                          <div>
                            <p className="font-semibold text-[#1F2937] text-sm">{s.school_name}</p>
                            <p className="text-[10px] text-amber-700">{s.head_teacher_name || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs bg-amber-50 text-[#1F2937] px-2 py-1 rounded-lg border border-amber-100">
                          {s.school_code}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-amber-900 font-bold">
                          {s.district_code || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-500 shrink-0"/>
                          <span className="text-xs text-[#1F2937]">{s.district}, {s.province}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-0.5">
                          {(Array.isArray(s.education_levels) ? s.education_levels : []).map(lv => (
                            <span key={lv} className="text-[9px] font-bold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                              {lv}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-amber-800 font-medium">{s.school_category || '—'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5 max-w-[120px]">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg w-fit ${
                              s.subscription_plan === 'pro' && (s.pro_enabled === 1 || s.pro_enabled === true)
                                ? 'bg-violet-100 text-violet-800 border border-violet-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {s.subscription_plan === 'pro' && (s.pro_enabled === 1 || s.pro_enabled === true) ? 'Pro' : 'Lite'}
                          </span>
                          {s.school_status && s.school_status !== 'active' && (
                            <span className="text-[9px] font-bold text-red-600 capitalize">{s.school_status}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => toggleStatus(s)}>
                          <ActiveBadge active={s.status === 'active'}/>
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => openSubscription(s)}
                            className="p-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200"
                            title="Plan & platform access (Pro)"
                          >
                            <Sparkles className="w-3.5 h-3.5"/>
                          </button>
                          <button
                            onClick={() => openEdit(s)}
                            className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-[#1F2937] border border-amber-200"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5"/>
                          </button>
                          <button
                            onClick={() => setModal({ type: 'delete', school: s })}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 border border-red-100"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-3">
            {filtered.map(s => (
              <div
                key={s.id}
                className="bg-white border border-amber-100 rounded-2xl shadow-sm p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2 pb-1 border-b border-amber-50">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="w-4 h-4 rounded border-amber-300 text-amber-600 shrink-0"
                    aria-label={`Select ${s.school_name}`}
                  />
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Select</span>
                </div>
                <div className="flex items-center gap-3">
                  {toAssetUrl(s.logo_url)
                    ? <img src={toAssetUrl(s.logo_url)} alt="" className="w-10 h-10 rounded-xl object-cover border border-amber-100"/>
                    : <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <School className="w-5 h-5 text-amber-500"/>
                      </div>
                  }
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1F2937] text-sm truncate">{s.school_name}</p>
                    <p className="text-[11px] text-amber-700 truncate">{s.head_teacher_name || '—'}</p>
                    <span className="inline-flex items-center mt-1 text-[11px] font-mono bg-amber-50 text-[#1F2937] px-2 py-0.5 rounded-lg border border-amber-100">
                      {s.school_code}
                    </span>
                    {s.district_code && (
                      <span className="inline-flex items-center ml-1 mt-1 text-[10px] font-mono font-bold text-amber-900 px-2 py-0.5 rounded-lg border border-amber-200">
                        Dist. {s.district_code}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1 text-[#1F2937]">
                    <MapPin className="w-3 h-3 text-amber-500"/>
                    <span>{s.district}, {s.province}</span>
                  </div>
                  {s.school_category && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-800 font-medium">
                      {s.school_category}
                    </span>
                  )}
                </div>

                {Array.isArray(s.education_levels) && s.education_levels.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.education_levels.map(lv => (
                      <span
                        key={lv}
                        className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded"
                      >
                        {lv}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${
                      s.subscription_plan === 'pro' && (s.pro_enabled === 1 || s.pro_enabled === true)
                        ? 'bg-violet-100 text-violet-800 border border-violet-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {s.subscription_plan === 'pro' && (s.pro_enabled === 1 || s.pro_enabled === true) ? 'Pro' : 'Lite'}
                  </span>
                  {s.school_status && s.school_status !== 'active' && (
                    <span className="text-[10px] font-bold text-red-600 capitalize">{s.school_status}</span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button onClick={() => toggleStatus(s)}>
                    <ActiveBadge active={s.status === 'active'}/>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openSubscription(s)}
                      className="p-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200"
                      title="Plan & platform access"
                    >
                      <Sparkles className="w-4 h-4"/>
                    </button>
                    <button
                      onClick={() => openEdit(s)}
                      className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-[#1F2937] border border-amber-200"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4"/>
                    </button>
                    <button
                      onClick={() => setModal({ type: 'delete', school: s })}
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 border border-red-100"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-4">
          <button
            onClick={() => fetchSchools(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl border border-amber-200 text-amber-700 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-50 transition-all"
          >
            Prev
          </button>
          <p className="text-xs text-amber-700 font-bold">
            Page {page} of {totalPages}
          </p>
          <button
            onClick={() => fetchSchools(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-xl border border-amber-200 text-amber-700 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-50 transition-all"
          >
            Next
          </button>
        </div>
      )}

      {/* Delete confirm modal */}
      {modal?.type === 'delete' && (
        <Modal title="Delete School" onClose={() => setModal(null)} size="max-w-sm">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-red-500"/>
            </div>
            <p className="text-blue-800 text-sm">
              Delete <strong>{modal.school.school_name}</strong>?<br/>
              This will also deactivate the linked manager account.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-blue-200 text-blue-600 font-semibold text-sm hover:bg-blue-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(modal.school)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4"/> Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal?.type === 'bulk-delete' && (
        <Modal title="Delete selected schools" onClose={() => setModal(null)} size="max-w-md">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-red-500"/>
            </div>
            <p className="text-center text-gray-800 text-sm">
              Permanently remove <strong>{selectedIds.length}</strong> school(s)? Linked manager accounts will be deactivated.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={bulkBusy}
                className="flex-1 py-2.5 rounded-xl border border-amber-200 text-amber-800 font-semibold text-sm hover:bg-amber-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkBusy}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4"/>}
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal?.type === 'delete-all' && (
        <Modal title="Delete all schools" onClose={() => { setModal(null); setDeleteAllConfirm(''); }} size="max-w-md">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-red-500"/>
            </div>
            <p className="text-center text-gray-800 text-sm">
              This will soft-delete <strong>every</strong> school in the system and deactivate all linked managers. Type{' '}
              <span className="font-mono font-bold text-red-700">DELETE_ALL_SCHOOLS</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteAllConfirm}
              onChange={e => setDeleteAllConfirm(e.target.value)}
              placeholder="DELETE_ALL_SCHOOLS"
              className={`${inp} font-mono text-sm`}
              autoComplete="off"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setModal(null); setDeleteAllConfirm(''); }}
                disabled={bulkBusy}
                className="flex-1 py-2.5 rounded-xl border border-amber-200 text-amber-800 font-semibold text-sm hover:bg-amber-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllSchools}
                disabled={bulkBusy || deleteAllConfirm !== 'DELETE_ALL_SCHOOLS'}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4"/>}
                Delete all
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit school modal */}
      {modal?.type === 'edit' && editing && (
        <Modal title="Edit School" onClose={() => { setModal(null); setEditing(null); setShowMgrPw(false); }} size="max-w-2xl">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldUI label="School Name" required>
                <input
                  className={inp}
                  value={editForm.schoolName || ''}
                  onChange={e => setEditForm(f => ({ ...f, schoolName: e.target.value }))}
                  placeholder="School name"
                />
              </FieldUI>
              <FieldUI label="School Code" required>
                <input
                  className={inp}
                  value={editForm.schoolCode || ''}
                  onChange={e => setEditForm(f => ({ ...f, schoolCode: e.target.value.toUpperCase() }))}
                  placeholder="Code"
                />
              </FieldUI>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FieldUI label="Province">
                <input
                  className={inp}
                  value={editForm.province || ''}
                  onChange={e => setEditForm(f => ({ ...f, province: e.target.value }))}
                  placeholder="Province"
                />
              </FieldUI>
              <FieldUI label="District">
                <input
                  className={inp}
                  value={editForm.district || ''}
                  onChange={e => setEditForm(f => ({ ...f, district: e.target.value }))}
                  placeholder="District"
                />
              </FieldUI>
              <FieldUI label="Sector">
                <input
                  className={inp}
                  value={editForm.sector || ''}
                  onChange={e => setEditForm(f => ({ ...f, sector: e.target.value }))}
                  placeholder="Sector"
                />
              </FieldUI>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldUI label="Phone">
                <input
                  className={inp}
                  value={editForm.phone || ''}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+250..."
                />
              </FieldUI>
              <FieldUI label="Email">
                <input
                  className={inp}
                  type="email"
                  value={editForm.email || ''}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="school@example.rw"
                />
              </FieldUI>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldUI label="Category">
                <input
                  className={inp}
                  value={editForm.category || ''}
                  onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="Day / Boarding..."
                />
              </FieldUI>
              <FieldUI label="Ownership">
                <input
                  className={inp}
                  value={editForm.ownership || ''}
                  onChange={e => setEditForm(f => ({ ...f, ownership: e.target.value }))}
                  placeholder="Government / Private..."
                />
              </FieldUI>
            </div>
            <FieldUI label="Head Teacher Name">
              <input
                className={inp}
                value={editForm.headName || ''}
                onChange={e => setEditForm(f => ({ ...f, headName: e.target.value }))}
                placeholder="Head teacher full name"
              />
            </FieldUI>

            <div className="rounded-2xl border-2 border-amber-100 bg-amber-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-900">
                <Key className="w-4 h-4 shrink-0" style={{ color: ACCENT }} />
                <span className="text-sm font-black">School manager login</span>
              </div>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                This is the <strong>email and password</strong> the school uses on the public login page (not the contact email above).
              </p>
              {!editForm.managerHasAccount ? (
                <p className="text-xs text-amber-700 font-medium">
                  No manager account is linked to this school yet — add one through school registration, then you can set login here.
                </p>
              ) : (
                <>
                  <FieldUI label="Manager login email" required>
                    <input
                      className={inp}
                      type="email"
                      autoComplete="off"
                      value={editForm.managerLoginEmail || ''}
                      onChange={e => setEditForm(f => ({ ...f, managerLoginEmail: e.target.value }))}
                      placeholder="manager@school.rw"
                    />
                  </FieldUI>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FieldUI label="New password (optional)">
                      <div className="relative">
                        <input
                          className={`${inp} pr-10`}
                          type={showMgrPw ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={editForm.managerPassword || ''}
                          onChange={e => setEditForm(f => ({ ...f, managerPassword: e.target.value }))}
                          placeholder="Leave blank to keep current"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-amber-600 hover:text-amber-900"
                          onClick={() => setShowMgrPw(v => !v)}
                          aria-label={showMgrPw ? 'Hide password' : 'Show password'}
                        >
                          {showMgrPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FieldUI>
                    <FieldUI label="Confirm new password">
                      <input
                        className={inp}
                        type={showMgrPw ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={editForm.managerPasswordConfirm || ''}
                        onChange={e => setEditForm(f => ({ ...f, managerPasswordConfirm: e.target.value }))}
                        placeholder="Repeat if changing password"
                      />
                    </FieldUI>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setModal(null); setEditing(null); setShowMgrPw(false); }}
                className="px-4 py-2.5 rounded-xl border-2 border-amber-200 text-amber-700 font-semibold text-sm hover:bg-amber-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#1F2937] hover:bg-[#111827] text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Plan & platform access (master DB) — PATCH /api/auth/schools/:id/subscription */}
      {modal?.type === 'subscription' && subscriptionSchool && (
        <Modal
          title="Plan & platform access"
          onClose={() => { setModal(null); setSubscriptionSchool(null); }}
          size="max-w-lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              <strong>{subscriptionSchool.school_name}</strong>
              <span className="text-amber-600"> — controls Lite vs Pro and platform suspension (separate from registration status in the table).</span>
            </p>
            <FieldUI label="Subscription plan">
              <select
                className={inp}
                value={subForm.subscription_plan || 'lite'}
                onChange={e => setSubForm(f => ({ ...f, subscription_plan: e.target.value }))}
              >
                <option value="lite">Lite</option>
                <option value="pro">Pro</option>
              </select>
            </FieldUI>
            <label className="flex items-center gap-3 cursor-pointer select-none rounded-xl border-2 border-amber-100 bg-amber-50/50 px-4 py-3">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-amber-300 text-violet-600 focus:ring-violet-500"
                checked={!!subForm.pro_enabled}
                onChange={e => setSubForm(f => ({ ...f, pro_enabled: e.target.checked }))}
              />
              <div>
                <p className="text-sm font-bold text-[#1F2937]">Pro enabled</p>
                <p className="text-[11px] text-amber-700">Must be on with plan Pro for Pro features (subject to dates).</p>
              </div>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldUI label="Pro start (optional)">
                <input
                  type="datetime-local"
                  className={inp}
                  value={subForm.pro_start_date || ''}
                  onChange={e => setSubForm(f => ({ ...f, pro_start_date: e.target.value }))}
                />
              </FieldUI>
              <FieldUI label="Pro end (optional)">
                <input
                  type="datetime-local"
                  className={inp}
                  value={subForm.pro_end_date || ''}
                  onChange={e => setSubForm(f => ({ ...f, pro_end_date: e.target.value }))}
                />
              </FieldUI>
            </div>
            <FieldUI label="Platform access">
              <select
                className={inp}
                value={subForm.school_status || 'active'}
                onChange={e => setSubForm(f => ({ ...f, school_status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </FieldUI>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSubForm(f => ({
                  ...f,
                  subscription_plan: 'pro',
                  pro_enabled: true,
                  pro_start_date: f.pro_start_date || toDateTimeLocal(new Date()),
                }))}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-violet-100 text-violet-800 border border-violet-200 hover:bg-violet-200"
              >
                Quick: enable Pro now
              </button>
              <button
                type="button"
                onClick={() => setSubForm(f => ({
                  ...f,
                  subscription_plan: 'lite',
                  pro_enabled: false,
                  pro_end_date: '',
                }))}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
              >
                Quick: Lite only
              </button>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-amber-100">
              <button
                type="button"
                onClick={() => { setModal(null); setSubscriptionSchool(null); }}
                className="px-4 py-2.5 rounded-xl border-2 border-amber-200 text-amber-700 font-semibold text-sm hover:bg-amber-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSubscription}
                disabled={savingSub}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60"
              >
                {savingSub ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Save access
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SCHOOL ADMINS PAGE  — uses /api/schools (school-add.js)
// ════════════════════════════════════════════════════════════════
function SchoolAdminsPage({ navigate, addToast }) {
  const [admins,  setAdmins]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState('');
  const [tabStatus, setTabStatus] = useState('active'); // active=approved, pending=waiting, inactive=deactivated
  const [page,      setPage]      = useState(1);
  const [limit]                  = useState(10);
  const [total,     setTotal]     = useState(0);
  const [modal,   setModal]   = useState(null);
  const [editSchool, setEditSchool] = useState(null);
  const [editForm,   setEditForm]   = useState({});
  const [saving,     setSaving]     = useState(false);

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));

  const fetchAdmins = async (p = 1, status = tabStatus) => {
    setLoading(true);
    try {
      // School admins are fetched from /api/schools which returns school+manager info
      const res = await axios.get(`${API}/schools`, {
        ...axCfg,
        params: {
          status,
          page:   p,
          limit,
          search: search.trim() ? search.trim() : undefined,
        },
      });
      if (res.data.success) {
        setAdmins(res.data.data || []);
        setTotal(res.data.total ?? 0);
        setPage(p);
      }
    } catch {
      addToast('Failed to load school admins', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins(1, tabStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabStatus, search]);

  const filtered = admins;

  const toggleManagerStatus = async (school) => {
    const newStatus = school.status === 'active' ? 'inactive' : 'active';
    try {
      await axios.put(
        `${API}/schools/${school.id}/status`,
        { status: newStatus },
        axCfg,
      );
      addToast(
        `Manager ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
        'success',
      );
      setTabStatus(newStatus);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update manager status', 'error');
    }
  };

  const adminColumns = [
    { key:'school_name', label:'School', render: u => (
      <div>
        <p className="font-semibold text-[#1F2937] text-sm">{u.school_name || '—'}</p>
        <p className="text-[10px] font-mono text-amber-700">{u.school_code}</p>
      </div>
    )},
    { key:'email', label:'Admin / Contact', render: u => (
      <div>
        <p className="font-semibold text-[#1F2937] text-sm">{u.head_teacher_name || '—'}</p>
        <p className="text-xs text-amber-800">{u.email}</p>
      </div>
    )},
    { key:'district', label:'Location', render: u => (
      <span className="text-xs text-amber-800">{u.district}, {u.province}</span>
    )},
    {
      key:'status',
      label:'Status',
      render: u => (
        <div className="flex items-center gap-2">
          <ActiveBadge active={u.status === 'active'}/>
          <button
            onClick={() => toggleManagerStatus(u)}
            className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition-all ${
              u.status === 'active'
                ? 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100'
                : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
            }`}
            type="button"
          >
            {u.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ),
    },
    { key:'role', label:'Role', render: () => <RoleBadge role="school_manager"/> },
  ];

  return (
    <div className="space-y-4 anim">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-black text-[#1F2937] text-lg"> School Admins</h3>
          <p className="text-xs text-amber-700 mt-0.5">
            {tabStatus === 'active'
              ? 'Approved'
              : tabStatus === 'pending'
                ? 'Pending'
                : 'Inactive'} school managers: {filtered.length} / {total || 0}
          </p>
        </div>
        <button onClick={() => navigate('/add-school')}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#F5B800] to-amber-500 hover:opacity-90 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-200/60 active:scale-95 transition-all">
          <PlusCircle className="w-4 h-4"/> Register New School
        </button>
      </div>

      {/* Approved / Pending tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTabStatus('active')}
          className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
            tabStatus === 'active'
              ? 'bg-emerald-500 text-white border-emerald-500'
              : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          Approved
        </button>
        <button
          type="button"
          onClick={() => setTabStatus('pending')}
          className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
            tabStatus === 'pending'
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
          }`}
        >
          Pending
        </button>
        <button
          type="button"
          onClick={() => setTabStatus('inactive')}
          className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
            tabStatus === 'inactive'
              ? 'bg-red-500 text-white border-red-500'
              : 'bg-white text-red-700 border-red-200 hover:bg-red-50'
          }`}
        >
          Inactive
        </button>
      </div>

      {/* Info banner: school admins are now created via /add-school */}
    

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search schools or admins…" className={`${inp} pl-9`}/>
      </div>

      <UsersTable
        users={filtered} loading={loading}
        onEdit={u => {
          // Open inline edit for the underlying school
          setSaving(false);
          setEditSchool(u);
          setEditForm({
            id:         u.id,
            schoolName: u.school_name || '',
            schoolCode: u.school_code || '',
            province:   u.province || '',
            district:   u.district || '',
            sector:     u.sector || '',
          });
          setModal({ type: 'edit-school' });
        }}
        onDelete={u => setModal({ type: 'delete', user: u })}
        columns={adminColumns} emptyMsg="No school admins yet. Register a school to create one."/>

      {/* Pagination */}
      {!loading && total > limit && (
        <div className="flex items-center justify-between gap-3 pt-4">
          <button
            onClick={() => fetchAdmins(Math.max(1, page - 1), tabStatus)}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl border border-amber-200 text-amber-700 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-50 transition-all"
          >
            Prev
          </button>
          <p className="text-xs text-amber-700 font-bold">
            Page {page} of {totalPages}
          </p>
          <button
            onClick={() => fetchAdmins(Math.min(totalPages, page + 1), tabStatus)}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-xl border border-amber-200 text-amber-700 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-50 transition-all"
          >
            Next
          </button>
        </div>
      )}

      {modal?.type === 'delete' && (
        <DeleteModal
          user={modal.user}
          endpoint="schools"
          onClose={() => setModal(null)}
          onDeleted={(msg, type) => { addToast(msg, type); setModal(null); if (type==='success') fetchAdmins(page, tabStatus); }}
        />
      )}

      {/* Edit school (from admins list) */}
      {modal?.type === 'edit-school' && editSchool && (
        <Modal title="Edit School (Admin View)" onClose={() => { setModal(null); setEditSchool(null); }} size="max-w-2xl">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldUI label="School Name" required>
                <input
                  className={inp}
                  value={editForm.schoolName || ''}
                  onChange={e => setEditForm(f => ({ ...f, schoolName: e.target.value }))}
                  placeholder="School name"
                />
              </FieldUI>
              <FieldUI label="School Code" required>
                <input
                  className={inp}
                  value={editForm.schoolCode || ''}
                  onChange={e => setEditForm(f => ({ ...f, schoolCode: e.target.value.toUpperCase() }))}
                  placeholder="Code"
                />
              </FieldUI>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FieldUI label="Province">
                <input
                  className={inp}
                  value={editForm.province || ''}
                  onChange={e => setEditForm(f => ({ ...f, province: e.target.value }))}
                  placeholder="Province"
                />
              </FieldUI>
              <FieldUI label="District">
                <input
                  className={inp}
                  value={editForm.district || ''}
                  onChange={e => setEditForm(f => ({ ...f, district: e.target.value }))}
                  placeholder="District"
                />
              </FieldUI>
              <FieldUI label="Sector">
                <input
                  className={inp}
                  value={editForm.sector || ''}
                  onChange={e => setEditForm(f => ({ ...f, sector: e.target.value }))}
                  placeholder="Sector"
                />
              </FieldUI>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setModal(null); setEditSchool(null); }}
                className="px-4 py-2.5 rounded-xl border-2 border-amber-200 text-amber-700 font-semibold text-sm hover:bg-amber-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!editForm.schoolName.trim() || !editForm.schoolCode.trim()) {
                    addToast('School name and code are required', 'error');
                    return;
                  }
                  setSaving(true);
                  try {
                    await axios.put(
                      `${API}/schools/${editSchool.id}`,
                      {
                        schoolName: editForm.schoolName.trim(),
                        schoolCode: editForm.schoolCode.trim().toUpperCase(),
                        province:   editForm.province || null,
                        district:   editForm.district || null,
                        sector:     editForm.sector   || null,
                      },
                      { ...axCfg, headers: { ...axCfg.headers, 'Content-Type': 'application/json' } },
                    );
                    addToast('School updated successfully', 'success');
                    setModal(null);
                    setEditSchool(null);
                    fetchAdmins(page, tabStatus);
                  } catch (err) {
                    addToast(err.response?.data?.message || 'Update failed', 'error');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#1F2937] hover:bg-[#111827] text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save changes
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ROOT COMPONENT
// ════════════════════════════════════════════════════════════════
export default function SuperAdminDashboard() {
  const auth     = useAuth();
  const navigate = useNavigate();

  // ── Session guard ────────────────────────────────────────────
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.isLoggedIn) { navigate('/login', { replace: true }); return; }
    if (auth.role !== 'SUPER_ADMIN') navigate('/unauthorized', { replace: true });
  }, [auth.loading, auth.isLoggedIn, auth.role, navigate]);

  // ── UI state ─────────────────────────────────────────────────
  const [page,       setPage]       = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileParentsOpen, setMobileParentsOpen] = useState(true);
  const [online,     setOnline]     = useState(navigator.onLine);

  // ── Data state ───────────────────────────────────────────────
  const [nesaAdmins,  setNesaAdmins]  = useState([]);
  const [deoOfficers, setDeoOfficers] = useState([]);
  const [schoolCount, setSchoolCount] = useState(0);
  const [parentAccounts, setParentAccounts] = useState([]);
  const [parentAccountsTotal, setParentAccountsTotal] = useState(0);
  const [parentAccountsPage, setParentAccountsPage] = useState(1);
  const [parentAccountsLimit] = useState(10);
  const [parentAccountsLoading, setParentAccountsLoading] = useState(false);
  const [parentAccountsSearch, setParentAccountsSearch] = useState('');
  const [paymentIntents, setPaymentIntents] = useState([]);
  const [paymentIntentsLoading, setPaymentIntentsLoading] = useState(false);
  const [paymentStatusDrafts, setPaymentStatusDrafts] = useState({});
  const [savingPaymentIntentId, setSavingPaymentIntentId] = useState(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentDateFrom, setPaymentDateFrom] = useState('');
  const [paymentDateTo, setPaymentDateTo] = useState('');
  const [paymentDistrict, setPaymentDistrict] = useState('');
  const [paymentSector, setPaymentSector] = useState('');
  const [paymentSchoolId, setPaymentSchoolId] = useState('');
  const [paymentChannelFilter, setPaymentChannelFilter] = useState('all');
  const [paymentFilterOptions, setPaymentFilterOptions] = useState({ districts: [], sectors: [], schools: [] });
  const [paymentIntentPage, setPaymentIntentPage] = useState(1);
  const [paymentIntentLimit] = useState(12);
  const [paymentIntentTotal, setPaymentIntentTotal] = useState(0);
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState(null);
  const [paymentDetailLoading, setPaymentDetailLoading] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [webhookLogsLoading, setWebhookLogsLoading] = useState(false);
  const [webhookLogStatusFilter, setWebhookLogStatusFilter] = useState('');
  const [webhookLogMatchedFilter, setWebhookLogMatchedFilter] = useState('');
  const [webhookLogDateFrom, setWebhookLogDateFrom] = useState('');
  const [webhookLogDateTo, setWebhookLogDateTo] = useState('');
  const [webhookLogPage, setWebhookLogPage] = useState(1);
  const [webhookLogLimit] = useState(12);
  const [webhookLogTotal, setWebhookLogTotal] = useState(0);
  const [reconcilingWebhookLogId, setReconcilingWebhookLogId] = useState(null);
  const [reconcilingIntentId, setReconcilingIntentId] = useState(null);
  const [retryingIntentId, setRetryingIntentId] = useState(null);
  const [selectedWebhookLogDetail, setSelectedWebhookLogDetail] = useState(null);
  const [webhookDetailLoading, setWebhookDetailLoading] = useState(false);
  const [webhookSummary, setWebhookSummary] = useState({ total_logs: 0, matched_logs: 0, problematic_logs: 0 });
  const [loadingNesa, setLoadingNesa] = useState(false);
  const [loadingDeo,  setLoadingDeo]  = useState(false);
  const [parentUpgradeStats, setParentUpgradeStats] = useState({
    total_accounts: 0,
    upgraded_accounts: 0,
    recent: [],
  });

  // ── Modal state ──────────────────────────────────────────────
  const [modal, setModal] = useState(null);

  // ── Toasts ───────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  };
  const removeToast = id => setToasts(p => p.filter(t => t.id !== id));

  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (page === 'parents-control-accounts' || page === 'parents-control-payments') {
      setMobileParentsOpen(true);
    }
  }, [page]);

  // ── Search state ─────────────────────────────────────────────
  const [nesaSearch, setNesaSearch] = useState('');
  const [deoSearch,  setDeoSearch]  = useState('');

  // ════════════════════════════════════════════════════════════
  // DATA FETCHERS
  // ════════════════════════════════════════════════════════════
  const fetchNesaAdmins = async () => {
    setLoadingNesa(true);
    try {
      const res = await axios.get(`${API}/auth/nesa-admins`, axCfg);
      if (res.data.success) setNesaAdmins(res.data.data || []);
      else setNesaAdmins([]);
    } catch { setNesaAdmins([]); }
    finally { setLoadingNesa(false); }
  };

  const fetchDeoOfficers = async () => {
    setLoadingDeo(true);
    try {
      const res = await axios.get(`${API}/auth/deo-admins`, axCfg);
      if (res.data.success) setDeoOfficers(res.data.data || []);
      else setDeoOfficers([]);
    } catch { setDeoOfficers([]); }
    finally { setLoadingDeo(false); }
  };

  const fetchSchoolCount = async () => {
    try {
      const res = await axios.get(`${API}/schools`, axCfg);
      if (res.data.success) setSchoolCount(res.data.total ?? (res.data.data?.length || 0));
    } catch { /* silent */ }
  };

  const fetchParentUpgradeStats = async () => {
    try {
      const res = await axios.get(`${API}/parent-portal/admin-upgrades`, axCfg);
      if (res.data?.success && res.data?.data) {
        setParentUpgradeStats({
          total_accounts: Number(res.data.data.total_accounts || 0),
          upgraded_accounts: Number(res.data.data.upgraded_accounts || 0),
          recent: Array.isArray(res.data.data.recent) ? res.data.data.recent : [],
        });
      }
    } catch {
      setParentUpgradeStats({ total_accounts: 0, upgraded_accounts: 0, recent: [] });
    }
  };

  const fetchParentAccounts = async (pageArg = 1, searchArg = parentAccountsSearch) => {
    setParentAccountsLoading(true);
    try {
      const params = {
        page: pageArg,
        limit: parentAccountsLimit,
        ...(searchArg?.trim() ? { search: searchArg.trim() } : {}),
      };
      const res = await axios.get(`${API}/parent-portal/admin-accounts`, { ...axCfg, params });
      if (res.data?.success) {
        setParentAccounts(res.data.data || []);
        setParentAccountsTotal(Number(res.data.total || 0));
        setParentAccountsPage(Number(res.data.page || pageArg));
      } else {
        setParentAccounts([]);
      }
    } catch {
      setParentAccounts([]);
      setParentAccountsTotal(0);
    } finally {
      setParentAccountsLoading(false);
    }
  };

  const fetchPaymentIntents = async (searchArg = parentAccountsSearch, filtersArg = {}, pageArg = paymentIntentPage) => {
    setPaymentIntentsLoading(true);
    try {
      const district = filtersArg.district ?? paymentDistrict;
      const sector = filtersArg.sector ?? paymentSector;
      const schoolId = filtersArg.school_id ?? paymentSchoolId;
      const status = filtersArg.status ?? paymentStatusFilter;
      const dateFrom = filtersArg.date_from ?? paymentDateFrom;
      const dateTo = filtersArg.date_to ?? paymentDateTo;
      const channel = filtersArg.channel !== undefined ? filtersArg.channel : paymentChannelFilter;
      const params = {
        page: pageArg,
        limit: paymentIntentLimit,
        ...(searchArg?.trim() ? { search: searchArg.trim() } : {}),
        ...(district ? { district } : {}),
        ...(sector ? { sector } : {}),
        ...(schoolId ? { school_id: schoolId } : {}),
        ...(status && status !== 'all' ? { status } : {}),
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
        ...(channel && channel !== 'all' ? { channel } : {}),
      };
      const res = await axios.get(`${API}/public/babyeyi-pay/admin-intents`, { ...axCfg, params });
      if (res.data?.success) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        setPaymentIntents(list);
        setPaymentIntentPage(Number(res.data.page || pageArg || 1));
        setPaymentIntentTotal(Number(res.data.total || 0));
        const drafts = {};
        list.forEach((it) => {
          drafts[it.id] = String(it.status || 'submitted').toLowerCase();
        });
        setPaymentStatusDrafts(drafts);
      } else {
        setPaymentIntents([]);
        setPaymentIntentTotal(0);
      }
    } catch {
      setPaymentIntents([]);
      setPaymentIntentTotal(0);
    } finally {
      setPaymentIntentsLoading(false);
    }
  };

  const fetchPaymentFilterOptions = async (districtArg = paymentDistrict, sectorArg = paymentSector) => {
    try {
      const params = {
        ...(districtArg ? { district: districtArg } : {}),
        ...(sectorArg ? { sector: sectorArg } : {}),
      };
      const res = await axios.get(`${API}/public/babyeyi-pay/admin-intents/filters`, { ...axCfg, params });
      if (res.data?.success) {
        setPaymentFilterOptions({
          districts: res.data?.data?.districts || [],
          sectors: res.data?.data?.sectors || [],
          schools: res.data?.data?.schools || [],
        });
      }
    } catch {
      setPaymentFilterOptions({ districts: [], sectors: [], schools: [] });
    }
  };

  const fetchWebhookLogs = async (pageArg = webhookLogPage, filtersArg = {}) => {
    setWebhookLogsLoading(true);
    try {
      const processing_status = filtersArg.processing_status ?? webhookLogStatusFilter;
      const matched = filtersArg.matched ?? webhookLogMatchedFilter;
      const date_from = filtersArg.date_from ?? webhookLogDateFrom;
      const date_to = filtersArg.date_to ?? webhookLogDateTo;
      const params = {
        page: pageArg,
        limit: webhookLogLimit,
        ...(parentAccountsSearch?.trim() ? { search: parentAccountsSearch.trim() } : {}),
        ...(processing_status ? { processing_status } : {}),
        ...(matched ? { matched } : {}),
        ...(date_from ? { date_from } : {}),
        ...(date_to ? { date_to } : {}),
      };
      const res = await axios.get(`${API}/public/babyeyi-pay/admin-webhook-logs`, { ...axCfg, params });
      if (res.data?.success) {
        setWebhookLogs(Array.isArray(res.data.data) ? res.data.data : []);
        setWebhookLogPage(Number(res.data.page || pageArg || 1));
        setWebhookLogTotal(Number(res.data.total || 0));
        setWebhookSummary({
          total_logs: Number(res.data?.summary?.total_logs || 0),
          matched_logs: Number(res.data?.summary?.matched_logs || 0),
          problematic_logs: Number(res.data?.summary?.problematic_logs || 0),
        });
      } else {
        setWebhookLogs([]);
        setWebhookLogTotal(0);
        setWebhookSummary({ total_logs: 0, matched_logs: 0, problematic_logs: 0 });
      }
    } catch {
      setWebhookLogs([]);
      setWebhookLogTotal(0);
      setWebhookSummary({ total_logs: 0, matched_logs: 0, problematic_logs: 0 });
    } finally {
      setWebhookLogsLoading(false);
    }
  };

  const applyPaymentFilters = (isClear = false) => {
    const nextSearch = parentAccountsSearch;
    if (isClear) {
      setPaymentChannelFilter('all');
      fetchPaymentIntents(nextSearch, {
        district: '',
        sector: '',
        school_id: '',
        status: 'all',
        date_from: '',
        date_to: '',
        channel: 'all',
      }, 1);
      setPaymentIntentPage(1);
      fetchPaymentFilterOptions('', '');
      return;
    }
    setPaymentIntentPage(1);
    fetchPaymentIntents(nextSearch, {}, 1);
  };

  const onPaymentIntentPageChange = (nextPage) => {
    fetchPaymentIntents(parentAccountsSearch, {}, nextPage);
  };

  const applyWebhookFilters = (isClear = false) => {
    if (isClear) {
      setWebhookLogStatusFilter('');
      setWebhookLogMatchedFilter('');
      setWebhookLogDateFrom('');
      setWebhookLogDateTo('');
      setWebhookLogPage(1);
      fetchWebhookLogs(1, {
        processing_status: '',
        matched: '',
        date_from: '',
        date_to: '',
      });
      return;
    }
    setWebhookLogPage(1);
    fetchWebhookLogs(1);
  };

  const onWebhookPageChange = (nextPage) => {
    fetchWebhookLogs(nextPage);
  };

  const openPaymentDetail = async (intent) => {
    if (!intent?.id) return;
    setPaymentDetailLoading(true);
    setSelectedPaymentDetail({ loading: true, intent });
    try {
      const res = await axios.get(`${API}/public/babyeyi-pay/admin-intents/${intent.id}/detail`, axCfg);
      if (res.data?.success && res.data?.data) {
        setSelectedPaymentDetail({ loading: false, data: res.data.data });
      } else {
        setSelectedPaymentDetail(null);
        addToast('Failed to load parent payment detail', 'error');
      }
    } catch {
      setSelectedPaymentDetail(null);
      addToast('Failed to load parent payment detail', 'error');
    } finally {
      setPaymentDetailLoading(false);
    }
  };

  const reviewLoanRepayment = async (repaymentId, status) => {
    if (!repaymentId) return;
    try {
      const res = await axios.put(
        `${API}/public/babyeyi-pay/admin-loan-repayments/${repaymentId}/review`,
        { status },
        axCfg
      );
      if (res.data?.success) {
        addToast(`Repayment ${status}`, 'success');
        const intentId = selectedPaymentDetail?.data?.intent?.id || null;
        if (intentId) {
          await openPaymentDetail({ id: intentId });
          fetchPaymentIntents(parentAccountsSearch, {}, paymentIntentPage);
        }
      } else {
        addToast('Failed to review repayment', 'error');
      }
    } catch (e) {
      addToast(e?.response?.data?.message || 'Failed to review repayment', 'error');
    }
  };

  const setLoanExtensionMonths = async (intentId, currentMonths = 0) => {
    if (!intentId) return;
    const raw = window.prompt('Set loan extension months', String(currentMonths || 0));
    if (raw == null) return;
    const ext = Math.max(0, Number(raw || 0));
    if (!Number.isFinite(ext)) {
      addToast('Invalid extension months', 'error');
      return;
    }
    try {
      const res = await axios.put(
        `${API}/public/babyeyi-pay/admin-intents/${intentId}/loan-extension`,
        { extension_months: ext },
        axCfg
      );
      if (res.data?.success) {
        addToast('Loan extension updated', 'success');
        await openPaymentDetail({ id: intentId });
        fetchPaymentIntents(parentAccountsSearch, {}, paymentIntentPage);
      } else addToast('Failed to update loan extension', 'error');
    } catch (e) {
      addToast(e?.response?.data?.message || 'Failed to update loan extension', 'error');
    }
  };

  const setPaymentStatusDraft = (intentId, status) => {
    setPaymentStatusDrafts((prev) => ({ ...prev, [intentId]: status }));
  };

  const savePaymentStatus = async (intentId) => {
    const next = String(paymentStatusDrafts[intentId] || '').toLowerCase();
    if (!next) return;
    setSavingPaymentIntentId(intentId);
    try {
      const res = await axios.put(`${API}/public/babyeyi-pay/admin-intents/${intentId}/status`, { status: next }, axCfg);
      if (res.data?.success) {
        setPaymentIntents((prev) =>
          prev.map((it) => (it.id === intentId ? { ...it, status: next } : it))
        );
        addToast(`Payment status updated to ${next.toUpperCase()}`, 'success');
      } else {
        addToast('Failed to update payment status', 'error');
      }
    } catch (e) {
      addToast(e?.response?.data?.message || 'Failed to update payment status', 'error');
    } finally {
      setSavingPaymentIntentId(null);
    }
  };

  const reconcilePaymentIntent = async (intentId) => {
    if (!intentId) return;
    setReconcilingIntentId(intentId);
    try {
      const res = await axios.post(`${API}/public/babyeyi-pay/admin-intents/${intentId}/reconcile-provider`, {}, axCfg);
      if (res.data?.success) {
        addToast('Intent reconciled with provider', 'success');
        fetchPaymentIntents(parentAccountsSearch, {}, paymentIntentPage);
        fetchWebhookLogs(webhookLogPage);
      } else {
        addToast('Failed to reconcile intent', 'error');
      }
    } catch (e) {
      addToast(e?.response?.data?.message || 'Failed to reconcile intent', 'error');
    } finally {
      setReconcilingIntentId(null);
    }
  };

  const retryCollection = async (intentId) => {
    if (!intentId) return;
    setRetryingIntentId(intentId);
    try {
      const res = await axios.post(`${API}/public/babyeyi-pay/admin-intents/${intentId}/retry-collection`, {}, axCfg);
      if (res.data?.success) {
        addToast(res.data?.message || 'Retry sent', 'success');
        fetchPaymentIntents(parentAccountsSearch, {}, paymentIntentPage);
        fetchWebhookLogs(webhookLogPage);
      } else {
        addToast('Retry failed', 'error');
      }
    } catch (e) {
      addToast(e?.response?.data?.message || 'Retry failed', 'error');
    } finally {
      setRetryingIntentId(null);
    }
  };

  const reconcileWebhookLog = async (logId) => {
    if (!logId) return;
    setReconcilingWebhookLogId(logId);
    try {
      const res = await axios.post(`${API}/public/babyeyi-pay/admin-webhook-logs/${logId}/reconcile`, {}, axCfg);
      if (res.data?.success) {
        addToast('Webhook log reconciled', 'success');
        fetchWebhookLogs(webhookLogPage);
        fetchPaymentIntents(parentAccountsSearch, {}, paymentIntentPage);
      } else {
        addToast('Failed to reconcile webhook log', 'error');
      }
    } catch (e) {
      addToast(e?.response?.data?.message || 'Failed to reconcile webhook log', 'error');
    } finally {
      setReconcilingWebhookLogId(null);
    }
  };

  const openWebhookLogDetail = async (logId) => {
    if (!logId) return;
    setWebhookDetailLoading(true);
    setSelectedWebhookLogDetail({ loading: true, id: logId });
    try {
      const res = await axios.get(`${API}/public/babyeyi-pay/admin-webhook-logs/${logId}`, axCfg);
      if (res.data?.success && res.data?.data) {
        setSelectedWebhookLogDetail({ loading: false, data: res.data.data });
      } else {
        setSelectedWebhookLogDetail(null);
        addToast('Failed to load webhook detail', 'error');
      }
    } catch {
      setSelectedWebhookLogDetail(null);
      addToast('Failed to load webhook detail', 'error');
    } finally {
      setWebhookDetailLoading(false);
    }
  };

  useEffect(() => {
    if (auth.isLoggedIn && auth.role === 'SUPER_ADMIN') {
      fetchNesaAdmins();
      fetchDeoOfficers();
      fetchSchoolCount();
      fetchParentUpgradeStats();
      fetchParentAccounts(1, '');
      fetchPaymentIntents('', {}, 1);
      fetchPaymentFilterOptions('', '');
      fetchWebhookLogs(1, {});
    }
  }, [auth.isLoggedIn, auth.role]);

  useEffect(() => {
    if (!(auth.isLoggedIn && auth.role === 'SUPER_ADMIN')) return;
    const t = setTimeout(() => {
      fetchParentAccounts(1, parentAccountsSearch);
      fetchPaymentIntents(parentAccountsSearch, {}, 1);
      fetchWebhookLogs(1);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentAccountsSearch, auth.isLoggedIn, auth.role]);

  const handleSaved = (msg, type) => {
    setModal(null);
    addToast(msg, type);
    if (type === 'success') { fetchNesaAdmins(); fetchDeoOfficers(); }
  };

  const handleDeleted = (msg, type) => {
    setModal(null);
    addToast(msg, type);
    if (type === 'success') { fetchNesaAdmins(); fetchDeoOfficers(); }
  };

  const counts = {
    total:   schoolCount + nesaAdmins.length + deoOfficers.length,
    admins:  schoolCount,
    nesa:    nesaAdmins.length,
    deo:     deoOfficers.length,
    schools: schoolCount,
  };
  const webhookAlertRed = Number(webhookSummary?.problematic_logs || 0);
  const unmatchedYellow = Math.max(0, Number(webhookSummary?.total_logs || 0) - Number(webhookSummary?.matched_logs || 0));

  const filteredNesa = nesaAdmins.filter(u =>
    !nesaSearch ||
    (u.full_name||`${u.first_name} ${u.last_name}`)?.toLowerCase().includes(nesaSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(nesaSearch.toLowerCase())
  );

  const filteredDeo = deoOfficers.filter(u =>
    !deoSearch ||
    (u.full_name||`${u.first_name} ${u.last_name}`)?.toLowerCase().includes(deoSearch.toLowerCase()) ||
    u.district?.toLowerCase().includes(deoSearch.toLowerCase())
  );

  const parentAccountsTotalPages = Math.max(1, Math.ceil(parentAccountsTotal / parentAccountsLimit));
  const paymentIntentTotalPages = Math.max(1, Math.ceil(paymentIntentTotal / paymentIntentLimit));
  const webhookLogTotalPages = Math.max(1, Math.ceil(webhookLogTotal / webhookLogLimit));

  const exportParentAccountsCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (parentAccountsSearch.trim()) params.set('search', parentAccountsSearch.trim());
      const qs = params.toString();
      const url = `${API}/parent-portal/admin-accounts/export.csv${qs ? `?${qs}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `parent-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      addToast('Parent accounts CSV downloaded', 'success');
    } catch {
      addToast('Failed to export parent accounts CSV', 'error');
    }
  };

  const exportPaymentIntentsCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (parentAccountsSearch.trim()) params.set('search', parentAccountsSearch.trim());
      if (paymentDistrict) params.set('district', paymentDistrict);
      if (paymentSector) params.set('sector', paymentSector);
      if (paymentSchoolId) params.set('school_id', paymentSchoolId);
      if (paymentStatusFilter !== 'all') params.set('status', paymentStatusFilter);
      if (paymentDateFrom) params.set('date_from', paymentDateFrom);
      if (paymentDateTo) params.set('date_to', paymentDateTo);
      if (paymentChannelFilter && paymentChannelFilter !== 'all') params.set('channel', paymentChannelFilter);
      const qs = params.toString();
      const url = `${API}/public/babyeyi-pay/admin-intents/export.csv${qs ? `?${qs}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `who-is-paying-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      addToast('Who is paying CSV downloaded', 'success');
    } catch {
      addToast('Failed to export paying CSV', 'error');
    }
  };

  const exportWebhookLogsCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (parentAccountsSearch.trim()) params.set('search', parentAccountsSearch.trim());
      if (webhookLogStatusFilter) params.set('processing_status', webhookLogStatusFilter);
      if (webhookLogMatchedFilter) params.set('matched', webhookLogMatchedFilter);
      if (webhookLogDateFrom) params.set('date_from', webhookLogDateFrom);
      if (webhookLogDateTo) params.set('date_to', webhookLogDateTo);
      const qs = params.toString();
      const url = `${API}/public/babyeyi-pay/admin-webhook-logs/export.csv${qs ? `?${qs}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Webhook logs CSV export failed');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `xentripay-webhook-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      addToast('Webhook logs CSV downloaded', 'success');
    } catch {
      addToast('Failed to export webhook logs CSV', 'error');
    }
  };

  useEffect(() => {
    if (!paymentDistrict) return;
    if (!paymentSector) {
      fetchPaymentFilterOptions(paymentDistrict, '');
      return;
    }
    fetchPaymentFilterOptions(paymentDistrict, paymentSector);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentDistrict, paymentSector]);

  const nesaColumns = [
    { key:'full_name', label:'NESA Admin', render: u => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
          <Flag className="w-4 h-4 text-amber-600"/>
        </div>
        <div>
          <p className="font-semibold text-[#1F2937] text-sm">{u.full_name || `${u.first_name} ${u.last_name}`}</p>
          <p className="text-[10px] text-amber-700">{u.user_uid}</p>
        </div>
      </div>
    )},
    { key:'email', label:'Contact', render: u => (
      <div>
        <p className="text-xs text-amber-800">{u.email}</p>
        <p className="text-[10px] text-amber-700">{u.phone || '—'}</p>
      </div>
    )},
    { key:'created_at', label:'Created', render: u => (
      <span className="text-xs text-blue-500">{new Date(u.created_at).toLocaleDateString()}</span>
    )},
    { key:'is_active', label:'Status', render: u => <ActiveBadge active={u.is_active}/> },
    { key:'role', label:'Role', render: () => <RoleBadge role="NESA_ADMIN"/> },
  ];

  const deoColumns = [
    { key:'full_name', label:'DEO Officer', render: u => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
          <MapPin className="w-4 h-4 text-amber-600"/>
        </div>
        <div>
          <p className="font-semibold text-[#1F2937] text-sm">{u.full_name || `${u.first_name} ${u.last_name}`}</p>
          <p className="text-[10px] text-amber-700">{u.user_uid}</p>
        </div>
      </div>
    )},
    { key:'district', label:'District', render: u => (
      <div className="flex items-center gap-1.5">
        <MapPin className="w-3 h-3 text-amber-600"/>
        <span className="font-bold text-[#1F2937] text-sm">{u.district}</span>
      </div>
    )},
    { key:'email', label:'Contact', render: u => (
      <div>
        <p className="text-xs text-amber-800">{u.email}</p>
        <p className="text-[10px] text-amber-700">{u.phone || '—'}</p>
      </div>
    )},
    { key:'is_active', label:'Status', render: u => <ActiveBadge active={u.is_active}/> },
    { key:'role', label:'Role', render: () => <RoleBadge role="DEO"/> },
  ];

  if (auth.loading) return <PageLoader/>;

  const currentPage = NAV.find(n => n.id === page);

  return (
    <div
      className="min-h-screen text-[#000435] flex babyeyi-dash-shell"
      style={{ background: BABYEYI_PAGE_BG, fontFamily: BABYEYI_FONT_STACK }}
    >
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .anim{animation:fadeIn .25s ease-out}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-thumb{background:#FEBF10;border-radius:99px}
        ::-webkit-scrollbar-track{background:#fef3c7}
        option{background:white;color:#1c1917}
      `}</style>

      {/* ── DESKTOP SIDEBAR ──────────────────────────────────── */}
      <Sidebar
        page={page}
        onChange={p => setPage(p)}
        online={online}
        user={auth.user}
        navigate={navigate}
      />

      {/* ── MOBILE SIDEBAR OVERLAY ───────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-[#000435]/60 backdrop-blur-sm z-50 flex"
          onClick={() => setMobileOpen(false)}>
          <div
            className="w-72 max-w-[85vw] h-full bg-[#000435] border-r border-amber-400/20 shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
            style={{ fontFamily: BABYEYI_FONT_STACK }}
          >
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="px-2 py-1 rounded-xl bg-[#1F2937] flex items-center justify-center border border-amber-300/50 shadow">
                <img
                  src="/1BABYEYI LOGO FINAL.png"
                  alt="Babyeyi logo"
                  className="h-6 w-auto object-contain"
                />
              </div>
              <h1 className="font-black text-white text-sm">Super Admin</h1>
            </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-xl hover:bg-white/10 text-amber-400">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
              {NAV.map(item => {
                if (item.section) {
                  if (item.id === '_section_parents_control') {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setMobileParentsOpen((v) => !v)}
                        className="w-full flex items-center justify-between pt-3 pb-1 px-3 text-left"
                      >
                        <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest">{item.label}</p>
                        <ChevronDown className={`w-3.5 h-3.5 text-amber-400/70 transition-transform ${mobileParentsOpen ? '' : '-rotate-90'}`} />
                      </button>
                    );
                  }
                  return (
                    <div key={item.id} className="pt-3 pb-1 px-3">
                      <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest">{item.label}</p>
                    </div>
                  );
                }
                if (item.parentControl && !mobileParentsOpen) return null;
                const isAddSchool = item.id === 'add-school';
                const isAddAllSchools = item.id === 'add-all-schools';
                const isRequirementsPrices = item.id === 'requirements-prices';
                const isPricesList = item.id === 'prices-list';
                const isInvoices = item.id === 'invoices';
                const isRegisterAgents = item.id === 'register-agents';
                const isVoucherServices = item.id === 'voucher-services';
                const isShoesVouchers = item.id === 'shoes-vouchers';
                const isUniformVouchers = item.id === 'uniform-vouchers';
                const isShopProducts = item.id === 'shop-products';
                const isStandardKitRequests = item.id === 'standard-kit-requests';
                const isStandardShuleKits = item.id === 'standard-shule-kits';
                const isShuleAvanceOrgs = item.id === 'shule-avance-orgs';
                const isShuleAvanceTeacher = item.id === 'shule-avance-teacher';
                const isTeacherDealProducts = item.id === 'teacher-deal-products';
                return (
                  <button key={item.id}
                    onClick={() => {
                      if (isAddSchool) { navigate('/add-school'); }
                      else if (isAddAllSchools) { navigate('/add-all-schools'); }
                      else if (isVoucherServices) { navigate('/superadmin/voucher-services'); }
                      else if (isShoesVouchers) { navigate('/superadmin/shoes-vouchers'); }
                      else if (isUniformVouchers) { navigate('/superadmin/uniform-vouchers'); }
                      else if (isShopProducts) { navigate('/superadmin/shop-products'); }
                      else if (isStandardKitRequests) { navigate('/superadmin/standard-kit-requests'); }
                      else if (isStandardShuleKits) { navigate('/superadmin/standard-shule-kits'); }
                      else if (isShuleAvanceOrgs) { navigate('/superadmin/shule-avance-organizations'); }
                      else if (isShuleAvanceTeacher) { navigate('/superadmin/shule-avance-teacher'); }
                      else if (isTeacherDealProducts) { navigate('/superadmin/teacher-deal-products'); }
                      else if (isRequirementsPrices) { navigate('/manage-requirements-prices'); }
                      else if (isPricesList) { navigate('/requirement-prices-list'); }
                      else if (isInvoices) { navigate('/invoices'); }
                      else if (isRegisterAgents) { navigate('/superadmin/register-agents'); }
                      else { setPage(item.id); }
                      setMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-left
                      ${item.highlight
                        ? "bg-gradient-to-r from-amber-400 to-amber-500 text-[#000435]"
                        : page === item.id
                          ? "bg-amber-400 text-[#000435]"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                    <item.icon className="w-4 h-4 shrink-0"/><span className={item.parentControl ? 'pl-2' : ''}>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-3 border-t border-white/10">
              <LogoutButton variant="sidebar" />
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <div className="flex-1 lg:ml-60 xl:ml-64 flex flex-col min-h-screen babyeyi-dash-main">

        {/* Header — match School Manager top bar */}
        <header className="sticky top-0 z-20 border-b-[3px] border-amber-400 px-4 sm:px-6 py-3 bg-[#000435]/97 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-white/8 border border-white/15 text-white/80 hover:bg-white/14 shrink-0"
                aria-label="Open menu">
                <Menu className="w-5 h-5"/>
              </button>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black text-white leading-tight truncate">
                  {currentPage?.label || 'Dashboard'}
                </h2>
                <p className="text-[10px] text-white/40 hidden sm:block font-semibold">
                  SuperAdmin · Rwanda Education System
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div
                className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                  online
                    ? "bg-amber-400/15 text-amber-300 border-amber-400/35"
                    : "bg-white/8 text-white/60 border-white/15"
                }`}
              >
                {online ? <Wifi className="w-3 h-3"/> : <WifiOff className="w-3 h-3"/>}
                {online ? 'Online' : 'Offline'}
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/8 border border-white/15">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-black bg-amber-400 text-[#000435]">
                  {auth.user?.first_name?.[0]?.toUpperCase() || 'S'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">{auth.user?.full_name || 'Super Admin'}</p>
                  <p className="text-[10px] text-amber-400/90">Full Access</p>
                </div>
              </div>

            <div className="hidden sm:flex">
              <LogoutButton
                variant="default"
                size="sm"
                className="flex items-center gap-1.5 rounded-xl text-xs px-3 py-1.5"
              />
            </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-5 lg:p-6">

          {page === 'dashboard' && (
            <DashboardPage
              counts={counts}
              setPage={setPage}
              user={auth.user}
              navigate={navigate}
              parentUpgradeStats={parentUpgradeStats}
              webhookAlertRed={webhookAlertRed}
              unmatchedYellow={unmatchedYellow}
            />
          )}

          {page === 'schools' && (
            <SchoolsPage navigate={navigate} addToast={addToast}/>
          )}

          {page === 'admins' && (
            <SchoolAdminsPage navigate={navigate} addToast={addToast}/>
          )}

          {page === 'parents-control-accounts' && (
            <ParentAccountsPage
              mode="accounts"
              rows={parentAccounts}
              loading={parentAccountsLoading}
              search={parentAccountsSearch}
              onSearchChange={setParentAccountsSearch}
              page={parentAccountsPage}
              total={parentAccountsTotal}
              totalPages={parentAccountsTotalPages}
              onPageChange={(nextPage) => fetchParentAccounts(nextPage, parentAccountsSearch)}
              onExportCsv={exportParentAccountsCsv}
              onExportPaymentIntentsCsv={exportPaymentIntentsCsv}
              onRefresh={() => { fetchParentAccounts(parentAccountsPage, parentAccountsSearch); }}
              paymentIntents={paymentIntents}
              paymentIntentsLoading={paymentIntentsLoading}
              paymentStatusDrafts={paymentStatusDrafts}
              setPaymentStatusDraft={setPaymentStatusDraft}
              onSavePaymentStatus={savePaymentStatus}
              savingPaymentIntentId={savingPaymentIntentId}
              paymentStatusFilter={paymentStatusFilter}
              setPaymentStatusFilter={setPaymentStatusFilter}
              paymentDateFrom={paymentDateFrom}
              setPaymentDateFrom={setPaymentDateFrom}
              paymentDateTo={paymentDateTo}
              setPaymentDateTo={setPaymentDateTo}
              paymentDistrict={paymentDistrict}
              setPaymentDistrict={setPaymentDistrict}
              paymentSector={paymentSector}
              setPaymentSector={setPaymentSector}
              paymentSchoolId={paymentSchoolId}
              setPaymentSchoolId={setPaymentSchoolId}
              paymentChannelFilter={paymentChannelFilter}
              setPaymentChannelFilter={setPaymentChannelFilter}
              paymentFilterOptions={paymentFilterOptions}
              onApplyPaymentFilters={applyPaymentFilters}
              onViewPaymentDetail={openPaymentDetail}
              paymentIntentPage={paymentIntentPage}
              paymentIntentTotalPages={paymentIntentTotalPages}
              onPaymentIntentPageChange={onPaymentIntentPageChange}
              onReconcilePaymentIntent={reconcilePaymentIntent}
              webhookLogs={webhookLogs}
              webhookLogsLoading={webhookLogsLoading}
              webhookLogStatusFilter={webhookLogStatusFilter}
              setWebhookLogStatusFilter={setWebhookLogStatusFilter}
              webhookLogMatchedFilter={webhookLogMatchedFilter}
              setWebhookLogMatchedFilter={setWebhookLogMatchedFilter}
              webhookLogDateFrom={webhookLogDateFrom}
              setWebhookLogDateFrom={setWebhookLogDateFrom}
              webhookLogDateTo={webhookLogDateTo}
              setWebhookLogDateTo={setWebhookLogDateTo}
              onApplyWebhookFilters={applyWebhookFilters}
              webhookLogPage={webhookLogPage}
              webhookLogTotalPages={webhookLogTotalPages}
              onWebhookPageChange={onWebhookPageChange}
              onReconcileWebhookLog={reconcileWebhookLog}
              reconcilingWebhookLogId={reconcilingWebhookLogId}
              reconcilingIntentId={reconcilingIntentId}
              onRetryCollection={retryCollection}
              retryingIntentId={retryingIntentId}
              onExportWebhookLogsCsv={exportWebhookLogsCsv}
              onViewWebhookLogDetail={openWebhookLogDetail}
              webhookSummary={webhookSummary}
            />
          )}

          {page === 'parents-control-payments' && (
            <ParentAccountsPage
              mode="payments"
              rows={parentAccounts}
              loading={parentAccountsLoading}
              search={parentAccountsSearch}
              onSearchChange={setParentAccountsSearch}
              page={parentAccountsPage}
              total={parentAccountsTotal}
              totalPages={parentAccountsTotalPages}
              onPageChange={(nextPage) => fetchParentAccounts(nextPage, parentAccountsSearch)}
              onExportCsv={exportParentAccountsCsv}
              onExportPaymentIntentsCsv={exportPaymentIntentsCsv}
              onRefresh={() => { fetchPaymentIntents(parentAccountsSearch); }}
              paymentIntents={paymentIntents}
              paymentIntentsLoading={paymentIntentsLoading}
              paymentStatusDrafts={paymentStatusDrafts}
              setPaymentStatusDraft={setPaymentStatusDraft}
              onSavePaymentStatus={savePaymentStatus}
              savingPaymentIntentId={savingPaymentIntentId}
              paymentStatusFilter={paymentStatusFilter}
              setPaymentStatusFilter={setPaymentStatusFilter}
              paymentDateFrom={paymentDateFrom}
              setPaymentDateFrom={setPaymentDateFrom}
              paymentDateTo={paymentDateTo}
              setPaymentDateTo={setPaymentDateTo}
              paymentDistrict={paymentDistrict}
              setPaymentDistrict={setPaymentDistrict}
              paymentSector={paymentSector}
              setPaymentSector={setPaymentSector}
              paymentSchoolId={paymentSchoolId}
              setPaymentSchoolId={setPaymentSchoolId}
              paymentChannelFilter={paymentChannelFilter}
              setPaymentChannelFilter={setPaymentChannelFilter}
              paymentFilterOptions={paymentFilterOptions}
              onApplyPaymentFilters={applyPaymentFilters}
              onViewPaymentDetail={openPaymentDetail}
              paymentIntentPage={paymentIntentPage}
              paymentIntentTotalPages={paymentIntentTotalPages}
              onPaymentIntentPageChange={onPaymentIntentPageChange}
              onReconcilePaymentIntent={reconcilePaymentIntent}
              webhookLogs={webhookLogs}
              webhookLogsLoading={webhookLogsLoading}
              webhookLogStatusFilter={webhookLogStatusFilter}
              setWebhookLogStatusFilter={setWebhookLogStatusFilter}
              webhookLogMatchedFilter={webhookLogMatchedFilter}
              setWebhookLogMatchedFilter={setWebhookLogMatchedFilter}
              webhookLogDateFrom={webhookLogDateFrom}
              setWebhookLogDateFrom={setWebhookLogDateFrom}
              webhookLogDateTo={webhookLogDateTo}
              setWebhookLogDateTo={setWebhookLogDateTo}
              onApplyWebhookFilters={applyWebhookFilters}
              webhookLogPage={webhookLogPage}
              webhookLogTotalPages={webhookLogTotalPages}
              onWebhookPageChange={onWebhookPageChange}
              onReconcileWebhookLog={reconcileWebhookLog}
              reconcilingWebhookLogId={reconcilingWebhookLogId}
              reconcilingIntentId={reconcilingIntentId}
              onRetryCollection={retryCollection}
              retryingIntentId={retryingIntentId}
              onExportWebhookLogsCsv={exportWebhookLogsCsv}
              onViewWebhookLogDetail={openWebhookLogDetail}
              webhookSummary={webhookSummary}
            />
          )}

          {page === 'nesa' && (
            <div className="space-y-4 anim">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-black text-[#1F2937] text-lg">NESA Admins</h3>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {filteredNesa.length} admins · National portal access
                  </p>
                </div>
                <button
                  onClick={() => setModal({ type: 'nesa_add' })}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1F2937] hover:bg-[#111827] text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-700/40 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add NESA Admin
                </button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500"/>
                <input value={nesaSearch} onChange={e => setNesaSearch(e.target.value)}
                  placeholder="Search NESA admins…" className={`${inp} pl-9`}/>
              </div>
              <UsersTable
                users={filteredNesa} loading={loadingNesa}
                onEdit={u => setModal({ type: 'nesa_edit', user: u })}
                onDelete={u => setModal({ type: 'delete', user: u, endpoint: 'auth/nesa-admin' })}
                columns={nesaColumns} emptyMsg="No NESA admins yet."/>
            </div>
          )}

      {selectedPaymentDetail && (
        <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border-2 border-amber-100 bg-white shadow-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-[#1F2937]">Parent Payment Detail</h3>
                <p className="text-xs text-amber-700">Student, requirements, totals, remaining, and loan profile</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPaymentDetail(null)}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700"
              >
                Close
              </button>
            </div>
            {paymentDetailLoading || selectedPaymentDetail?.loading ? (
              <div className="py-8"><Spinner /></div>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                  {(() => {
                    const st = selectedPaymentDetail?.data?.student || {};
                    const fullName = [
                      st.student_name,
                      st.name,
                      [st.first_name, st.last_name].filter(Boolean).join(' ').trim(),
                      st.childName,
                    ].find((v) => typeof v === 'string' && v.trim()) || null;
                    return (
                      <p className="text-xs text-gray-600 mt-1">
                        Student: {fullName || 'Not provided'}
                      </p>
                    );
                  })()}
                  <p className="font-bold text-[#1F2937]">{selectedPaymentDetail?.data?.intent?.payer_name || 'Parent'}</p>
                  <p className="text-xs text-amber-700">
                    {selectedPaymentDetail?.data?.intent?.payer_phone || 'No phone'}{selectedPaymentDetail?.data?.intent?.payer_email ? ` · ${selectedPaymentDetail.data.intent.payer_email}` : ''}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedPaymentDetail?.data?.intent?.school_name || 'School'} · {selectedPaymentDetail?.data?.intent?.district || '-'} / {selectedPaymentDetail?.data?.intent?.sector || '-'}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-amber-100 p-3">
                    <p className="text-xs font-bold text-amber-700 mb-1">Selected Requirements</p>
                    {(selectedPaymentDetail?.data?.selected_requirements || []).length ? (
                      <ul className="space-y-1 text-xs text-gray-700">
                        {selectedPaymentDetail.data.selected_requirements.map((r) => (
                          <li key={r.babyeyi_requirement_id}>{r.requirement_name} · {Number(r.quantity_value || 0)} x {Number(r.unit_price_rwf || 0).toLocaleString()} = {Number(r.line_total_rwf || 0).toLocaleString()} RWF</li>
                        ))}
                      </ul>
                    ) : <p className="text-xs text-gray-500">No requirements selected.</p>}
                  </div>
                  <div className="rounded-xl border border-amber-100 p-3">
                    <p className="text-xs font-bold text-amber-700 mb-1">Selected Fees</p>
                    {(selectedPaymentDetail?.data?.selected_fees || []).length ? (
                      <ul className="space-y-1 text-xs text-gray-700">
                        {selectedPaymentDetail.data.selected_fees.map((f) => (
                          <li key={f.id}>{f.name} · {Number(f.amount || 0).toLocaleString()} RWF</li>
                        ))}
                      </ul>
                    ) : <p className="text-xs text-gray-500">No fee lines selected.</p>}
                  </div>
                </div>
                <div className="rounded-xl border border-amber-100 p-3">
                  <p className="text-xs text-gray-600">Total</p>
                  <p className="text-base font-black text-emerald-700">{Number(selectedPaymentDetail?.data?.totals?.intent_total_rwf || 0).toLocaleString()} RWF</p>
                  <p className="text-xs text-gray-600 mt-1">Remaining: <span className="font-bold text-red-600">{Number(selectedPaymentDetail?.data?.totals?.remaining_rwf || 0).toLocaleString()} RWF</span></p>
                </div>
                <div className="rounded-xl border border-amber-100 p-3">
                  <p className="text-xs font-bold text-amber-700 mb-1">Gateway Diagnostics</p>
                  <div className="text-xs text-gray-700 space-y-1">
                    <p>Provider: {selectedPaymentDetail?.data?.intent?.provider || '—'}</p>
                    <p>Provider status: {String(selectedPaymentDetail?.data?.intent?.provider_status || 'N/A').toUpperCase()}</p>
                    <p>Reference: {selectedPaymentDetail?.data?.intent?.provider_reference || '—'}</p>
                    <p>TID: {selectedPaymentDetail?.data?.intent?.provider_tid || '—'}</p>
                    <p>Last check: {selectedPaymentDetail?.data?.intent?.last_provider_check_at ? new Date(selectedPaymentDetail.data.intent.last_provider_check_at).toLocaleString() : '—'}</p>
                    {selectedPaymentDetail?.data?.intent?.provider_error_message ? (
                      <p className="text-red-600">Cause: {selectedPaymentDetail.data.intent.provider_error_message}</p>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-xl border border-amber-100 p-3">
                  <p className="text-xs font-bold text-amber-700 mb-1">Loan Details</p>
                  {selectedPaymentDetail?.data?.loan ? (
                    <div className="text-xs text-gray-700 space-y-1">
                      <p>Type: Loan</p>
                      <p>Duration: {selectedPaymentDetail.data.loan.months || '-'} months</p>
                      <p>Frequency: {selectedPaymentDetail.data.loan.frequency || '-'}</p>
                      <p>Income bracket: {selectedPaymentDetail.data.loan.income_bracket || '-'}</p>
                      {selectedPaymentDetail?.data?.loan?.applicant ? (
                        <>
                          <p className="mt-2 font-bold text-amber-700">Applicant details</p>
                          <p>Bank: {selectedPaymentDetail.data.loan.applicant.bank_name || selectedPaymentDetail.data.loan.applicant.bank_code || '-'}</p>
                          <p>Account name: {selectedPaymentDetail.data.loan.applicant.account_name || '-'}</p>
                          <p>Account number: {selectedPaymentDetail.data.loan.applicant.account_number || '-'}</p>
                          <p>National ID: {selectedPaymentDetail.data.loan.applicant.national_id || '-'}</p>
                        </>
                      ) : null}
                      {typeof selectedPaymentDetail.data.loan.summary === 'object' && selectedPaymentDetail.data.loan.summary !== null ? (
                        <>
                          <p>Plan total due: {Number(selectedPaymentDetail.data.loan.summary.totalDue || 0).toLocaleString()} RWF</p>
                          <p>Plan interest: {Number(selectedPaymentDetail.data.loan.summary.interest || 0).toLocaleString()} RWF</p>
                          <p>Installments: {selectedPaymentDetail.data.loan.summary.installments || '-'}</p>
                          <p>Each installment: {Number(selectedPaymentDetail.data.loan.summary.each || 0).toLocaleString()} RWF</p>
                        </>
                      ) : (
                        <p>Plan summary: {selectedPaymentDetail.data.loan.summary || '-'}</p>
                      )}
                      <p className="mt-2">Loan due: {Number(selectedPaymentDetail.data.loan.total_due_rwf || 0).toLocaleString()} RWF</p>
                      <p>Loan paid: {Number(selectedPaymentDetail.data.loan.paid_rwf || 0).toLocaleString()} RWF</p>
                      <p>Loan pending approval: {Number(selectedPaymentDetail.data.loan.pending_rwf || 0).toLocaleString()} RWF</p>
                      <p>Loan remaining: {Number(selectedPaymentDetail.data.loan.remaining_rwf || 0).toLocaleString()} RWF</p>
                      <p>Due date: {selectedPaymentDetail.data.loan.due_date ? new Date(selectedPaymentDetail.data.loan.due_date).toLocaleDateString() : '-'}</p>
                      <p>Overdue months: {Number(selectedPaymentDetail.data.loan.overdue_months || 0)}</p>
                      <p>Overdue extra: {Number(selectedPaymentDetail.data.loan.overdue_extra_rwf || 0).toLocaleString()} RWF</p>
                      <p>Monthly installment: {Number(selectedPaymentDetail.data.loan.monthly_installment_rwf || 0).toLocaleString()} RWF</p>
                      <button
                        type="button"
                        onClick={() => setLoanExtensionMonths(selectedPaymentDetail?.data?.intent?.id, selectedPaymentDetail.data.loan.extension_months || 0)}
                        className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700"
                      >
                        Set Extension Months
                      </button>
                      <p>Repayment count: {Number(selectedPaymentDetail.data.loan.repayment_count || 0)}</p>
                      {(selectedPaymentDetail?.data?.loan?.repayments || []).length ? (
                        <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50/40 p-2">
                          <p className="font-bold text-amber-700 mb-1">Repayment history</p>
                          <ul className="space-y-1 max-h-32 overflow-auto">
                            {selectedPaymentDetail.data.loan.repayments.map((rp) => (
                              <li key={rp.id} className="rounded border border-amber-100 bg-white p-1.5 text-[11px]">
                                <div className="flex items-center justify-between gap-2">
                                  <span>{rp.created_at ? new Date(rp.created_at).toLocaleString() : '-'}</span>
                                  <span className="font-bold text-emerald-700">{Number(rp.amount_rwf || 0).toLocaleString()} RWF</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between gap-2">
                                  <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                                    String(rp.status || '').toLowerCase() === 'approved'
                                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                      : String(rp.status || '').toLowerCase() === 'rejected'
                                        ? 'bg-red-100 text-red-700 border-red-200'
                                        : 'bg-amber-100 text-amber-700 border-amber-200'
                                  }`}>
                                    {(rp.status || 'pending').toUpperCase()}
                                  </span>
                                  <span className="text-[10px] text-gray-500">{rp.receipt_no || '-'}</span>
                                </div>
                                {String(rp.status || '').toLowerCase() === 'pending' ? (
                                  <div className="mt-1 flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => reviewLoanRepayment(rp.id, 'approved')}
                                      className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => reviewLoanRepayment(rp.id, 'rejected')}
                                      className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">No repayment has started yet.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No loan selected for this payment intent.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

          {page === 'deo' && (
            <div className="space-y-4 anim">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-black text-[#1F2937] text-lg">District Education Officers</h3>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {filteredDeo.length} DEOs · District-level access
                  </p>
                </div>
                <button
                  onClick={() => setModal({ type: 'deo_add' })}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1F2937] hover:bg-[#111827] text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-700/40 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add DEO Officer
                </button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500"/>
                <input value={deoSearch} onChange={e => setDeoSearch(e.target.value)}
                  placeholder="Search DEO officers, districts…" className={`${inp} pl-9`}/>
              </div>
              <UsersTable
                users={filteredDeo} loading={loadingDeo}
                onEdit={u => setModal({ type: 'deo_edit', user: u })}
                onDelete={u => setModal({ type: 'delete', user: u, endpoint: 'auth/deo-admin' })}
                columns={deoColumns} emptyMsg="No DEO officers yet."/>
            </div>
          )}

          {/* {page === 'activity' && (
            <div className="text-center py-16 text-blue-300 anim">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-40"/>
              <p className="font-semibold">Activity Log</p>
              <p className="text-xs mt-1">Track all admin actions and system events</p>
            </div>
          )} */}

          {page === 'settings' && (
            <div className="space-y-4 anim">
              <h3 className="font-black text-gray-900 text-lg">⚙️ Settings</h3>
              <div className="bg-white border-2 border-amber-100 rounded-2xl shadow-lg p-5 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b-2 border-amber-100">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white text-lg font-black" style={{ backgroundColor: ACCENT }}>
                    {auth.user?.first_name?.[0]?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <p className="font-black text-gray-900">{auth.user?.full_name || '—'}</p>
                    <p className="text-xs text-amber-600">{auth.user?.email}</p>
                    <RoleBadge role={auth.user?.role?.code}/>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Role',     value: auth.user?.role?.name || 'Super Admin' },
                    { label: 'District', value: auth.user?.district   || 'All Rwanda' },
                    { label: 'Province', value: auth.user?.province   || 'National' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-amber-50 rounded-xl p-3 border-2 border-amber-100">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"/>
                  <div>
                    <p className="text-xs font-bold text-emerald-800">Session Security</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">
                      Authenticated via secure httpOnly session cookie. No sensitive data in browser. Auto-expires after 8 hours.
                    </p>
                  </div>
                </div>
                <LogoutButton
                  variant="default"
                  size="md"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm border border-red-200 transition-all"
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── MODALS ───────────────────────────────────────────── */}
      {selectedWebhookLogDetail && (
        <div className="fixed inset-0 z-[130] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-2xl border-2 border-amber-100 bg-white shadow-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-[#1F2937]">Webhook Detail</h3>
                <p className="text-xs text-amber-700">Full payload JSON and processing metadata</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWebhookLogDetail(null)}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700"
              >
                Close
              </button>
            </div>
            {webhookDetailLoading || selectedWebhookLogDetail?.loading ? (
              <div className="py-8"><Spinner /></div>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                  <p className="text-xs text-gray-600">
                    Event: <span className="font-bold text-[#1F2937]">{selectedWebhookLogDetail?.data?.event_type || '—'}</span>
                    {' · '}
                    Provider status: <span className="font-bold text-[#1F2937]">{String(selectedWebhookLogDetail?.data?.provider_status || 'N/A').toUpperCase()}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Reference: <span className="font-mono">{selectedWebhookLogDetail?.data?.reference_value || '—'}</span>
                    {' · '}
                    Intent: <span className="font-bold">{selectedWebhookLogDetail?.data?.intent_id || '—'}</span>
                    {' · '}
                    Processing: <span className="font-bold">{String(selectedWebhookLogDetail?.data?.processing_status || '').toUpperCase()}</span>
                  </p>
                  {selectedWebhookLogDetail?.data?.error_message ? (
                    <p className="text-xs text-red-600 mt-1">{selectedWebhookLogDetail.data.error_message}</p>
                  ) : null}
                </div>
                <div className="rounded-xl border border-amber-100 p-3">
                  <p className="text-xs font-bold text-amber-700 mb-1">Payload JSON</p>
                  <pre className="text-[11px] leading-5 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-[36vh]">
                    {JSON.stringify(selectedWebhookLogDetail?.data?.payload ?? null, null, 2)}
                  </pre>
                </div>
                <div className="rounded-xl border border-amber-100 p-3">
                  <p className="text-xs font-bold text-amber-700 mb-1">Headers JSON</p>
                  <pre className="text-[11px] leading-5 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-[20vh]">
                    {JSON.stringify(selectedWebhookLogDetail?.data?.headers ?? null, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {modal?.type === 'nesa_add'  && <NESAAdminModal mode="add"  onClose={()=>setModal(null)} onSaved={handleSaved}/>}
      {modal?.type === 'nesa_edit' && <NESAAdminModal mode="edit" initial={modal.user} onClose={()=>setModal(null)} onSaved={handleSaved}/>}
      {modal?.type === 'deo_add'   && <DEOModal mode="add"  onClose={()=>setModal(null)} onSaved={handleSaved}/>}
      {modal?.type === 'deo_edit'  && <DEOModal mode="edit" initial={modal.user} onClose={()=>setModal(null)} onSaved={handleSaved}/>}
      {modal?.type === 'delete'    && <DeleteModal user={modal.user} endpoint={modal.endpoint} onClose={()=>setModal(null)} onDeleted={handleDeleted}/>}

      <Toast toasts={toasts} remove={removeToast}/>
    </div>
  );
}