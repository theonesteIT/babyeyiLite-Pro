import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
   getShuleAvancePushState,
   subscribeShuleAvancePush,
   unsubscribeShuleAvancePush,
   isWebPushEnvironmentSupported,
} from '../../shared/webPushShuleAvance';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import DosOchreHero from '../components/DosOchreHero';
import {
   Wallet,
   Zap,
   Smartphone,
   Gift,
   Package,
   Banknote,
   Loader2,
   X,
   Filter,
   Pencil,
   Trash2,
   Eye,
   EyeOff,
   RefreshCw,
   ChevronRight,
   AlertCircle,
   CheckCircle2,
   Send,
   XCircle,
   Plus,
   Clock,
   CheckCircle,
   ArrowRight,
   TrendingUp,
   Users,
   Droplet,
   ShoppingCart,
   GraduationCap,
   Home,
   Wifi,
   Stethoscope,
   ReceiptText,
   Upload,
   ChevronDown,
   AlertTriangle,
   User,
   ArrowLeft,
   Bell,
} from 'lucide-react';

const UPLOADS_BASE = (import.meta.env.VITE_UPLOADS_BASE || import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/$/, '');

function toAssetUrl(pathLike) {
   if (!pathLike || typeof pathLike !== 'string') return null;
   if (pathLike.startsWith('http://') || pathLike.startsWith('https://')) return pathLike;
   const clean = pathLike.replace(/\\/g, '/');
   return `${UPLOADS_BASE}${clean.startsWith('/') ? clean : `/${clean}`}`;
}

function pickServiceIcon(slug) {
   const s = String(slug || '').toLowerCase();
   if (s.includes('power') || s.includes('elect')) return Zap;
   if (s.includes('water')) return Droplet;
   if (s.includes('grocer')) return ShoppingCart;
   if (s.includes('school')) return GraduationCap;
   if (s.includes('rent') || s.includes('home')) return Home;
   if (s.includes('internet') || s.includes('wifi')) return Wifi;
   if (s.includes('medical') || s.includes('health')) return Stethoscope;
   if (s.includes('air') || s.includes('data') || s.includes('smart')) return Smartphone;
   if (s.includes('deal')) return Gift;
   return Wallet;
}

const REPAYMENT_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 1);

const STATUS_MAP = {
   pending_accountant: {
      label: 'Pending — Finance Review',
      short: 'Pending',
      className: 'bg-amber-100 text-amber-900 border-amber-200',
   },
   sent_to_manager: {
      label: 'Sent to School Manager',
      short: 'With Manager',
      className: 'bg-sky-100 text-sky-900 border-sky-200',
   },
   approved: {
      label: 'Approved',
      short: 'Approved',
      className: 'bg-emerald-100 text-emerald-900 border-emerald-200',
   },
   rejected_by_accountant: {
      label: 'Rejected by Finance',
      short: 'Rejected',
      className: 'bg-red-100 text-red-900 border-red-200',
   },
   rejected_by_manager: {
      label: 'Rejected by Manager',
      short: 'Rejected',
      className: 'bg-red-100 text-red-900 border-red-200',
   },
};

const INVOICE_STEPS = [
   { id: 1, label: 'Document', icon: Upload },
   { id: 2, label: 'Breakdown', icon: Plus },
   { id: 3, label: 'Terms', icon: Clock },
];

const DIRECT_STEPS = [
   { id: 1, label: 'Details', icon: Wallet },
   { id: 2, label: 'Repayment', icon: Clock },
];

function formatMoney(n) {
   const v = Number(n);
   if (!Number.isFinite(v)) return '—';
   return `${Math.round(v).toLocaleString()} RWF`;
}

const STATUS_SNAPSHOT_KEY_PREFIX = 'shule_avance_req_status';

function readStatusSnapshot(userId) {
   if (userId == null || userId === '') return {};
   try {
      const raw = sessionStorage.getItem(`${STATUS_SNAPSHOT_KEY_PREFIX}_${userId}`);
      return raw ? JSON.parse(raw) : {};
   } catch {
      return {};
   }
}

function writeStatusSnapshot(userId, map) {
   if (userId == null || userId === '') return;
   try {
      sessionStorage.setItem(`${STATUS_SNAPSHOT_KEY_PREFIX}_${userId}`, JSON.stringify(map));
   } catch {
      /* quota / private mode */
   }
}

/** Emit in-app alerts when a request moves through accountant → manager → approval */
function computeStatusTransitionAlerts(prevMap, rows) {
   const alerts = [];
   for (const r of rows) {
      const id = String(r.id);
      const was = prevMap[id];
      const now = r.status;
      if (was === undefined || was === now) continue;

      if (was === 'pending_accountant' && now === 'sent_to_manager') {
         alerts.push({
            key: `${id}-pending_to_manager`,
            variant: 'info',
            title: 'Sent to school manager',
            message: `Finance reviewed and forwarded your request (#${id}) to your school manager for final approval.`,
         });
      } else if (was === 'sent_to_manager' && now === 'approved') {
         alerts.push({
            key: `${id}-manager_approved`,
            variant: 'success',
            title: 'Request approved ✓',
            message: `Your school manager approved Shule Avance request #${id}.`,
         });
      } else if (was === 'sent_to_manager' && now === 'rejected_by_manager') {
         alerts.push({
            key: `${id}-manager_rejected`,
            variant: 'reject',
            title: 'Request not approved',
            message: `Your school manager did not approve Shule Avance request #${id}.`,
         });
      } else if (was === 'pending_accountant' && now === 'approved') {
         // Cashout was auto-approved on a background refresh (edge case: tab was open during processing)
         alerts.push({
            key: `${id}-auto_approved`,
            variant: 'success',
            title: 'Cashout approved ✓',
            message: `Your cashout request #${id} was automatically approved and will be deducted from your next payroll.`,
         });
      } else if (
         (was === 'pending_accountant' || was === 'sent_to_manager') &&
         now === 'rejected_by_accountant'
      ) {
         alerts.push({
            key: `${id}-accountant_rejected`,
            variant: 'reject',
            title: 'Request declined by Finance',
            message: `Your Shule Avance request #${id} was declined by the finance team.`,
         });
      }
   }
   return alerts;
}

export default function ShuleAvance() {
   const { teacher } = useAuth();
   const [rows, setRows] = useState([]);
   const [loading, setLoading] = useState(true);
   const [refreshing, setRefreshing] = useState(false);
   const [error, setError] = useState(null);
   const [filter, setFilter] = useState('all');

   const [catalog, setCatalog] = useState({ services: [], cashouts: [] });
   const [dealProducts, setDealProducts] = useState([]);
   const [selectedDealProductIds, setSelectedDealProductIds] = useState([]);
   const [dealPreview, setDealPreview] = useState(null);
   const [teacherDealsStep, setTeacherDealsStep] = useState('products');

   // New UI States
   const [showApplyModal, setShowApplyModal] = useState(false);
   const [applyMode, setApplyMode] = useState('direct'); // 'direct' | 'invoice'
   const [selectedBillKey, setSelectedBillKey] = useState(null);
   const [wizardStep, setWizardStep] = useState(1);
   /** Eye toggle: false masks amounts as ****** (for shared screens); default true so payroll loads visible */
   const [showBalances, setShowBalances] = useState(true);

   /** From HR / staff payroll (manager-configured); drives Payroll Balance card */
   const [payrollSalary, setPayrollSalary] = useState(null);
   const [payrollLoading, setPayrollLoading] = useState(true);

   // Form State
   const [amount, setAmount] = useState('');
   const [repayment, setRepayment] = useState(6);
   const [description, setDescription] = useState('');
   const [cashoutReason, setCashoutReason] = useState('');
   const [submitting, setSubmitting] = useState(false);
   const [purpose, setPurpose] = useState('');

   // Invoice Wizard State
   const [invoiceVendor, setInvoiceVendor] = useState('');
   const [invoiceFile, setInvoiceFile] = useState(null);
   const [invoiceItems, setInvoiceItems] = useState([{ id: 1, name: '', qty: 1, unit: '' }]);

   const [detailRow, setDetailRow] = useState(null);
   const [editRow, setEditRow] = useState(null);
   const [statusAlerts, setStatusAlerts] = useState([]);
   const [pushUi, setPushUi] = useState({
      supported: false,
      permission: 'default',
      subscribed: false,
   });
   const [pushBusy, setPushBusy] = useState(false);
   const [pushHint, setPushHint] = useState(null);

   const refreshPushState = useCallback(async () => {
      const s = await getShuleAvancePushState();
      setPushUi({
         supported: s.supported,
         permission: s.permission,
         subscribed: s.subscribed,
      });
   }, []);

   useEffect(() => {
      refreshPushState();
   }, [refreshPushState]);

   const selectedDealProducts = useMemo(
      () => dealProducts.filter((p) => selectedDealProductIds.includes(Number(p.id))),
      [dealProducts, selectedDealProductIds]
   );
   const teacherDealsTotal = useMemo(
      () => selectedDealProducts.reduce((sum, p) => sum + Number(p.price_rwf || 0), 0),
      [selectedDealProducts]
   );

   const loadCatalog = useCallback(async () => {
      try {
         const res = await api.get('/services/shule-avance/catalog');
         if (res.data?.success && res.data.data) {
            setCatalog({
               services: Array.isArray(res.data.data.services) ? res.data.data.services : [],
               cashouts: Array.isArray(res.data.data.cashouts) ? res.data.data.cashouts : [],
            });
         }
      } catch { /* non-fatal */ }
   }, []);

   const loadTeacherDealProducts = useCallback(async () => {
      try {
         const res = await api.get('/services/shule-avance/teacher-deal-products');
         if (res.data?.success) {
            setDealProducts(Array.isArray(res.data.data) ? res.data.data : []);
         } else {
            setDealProducts([]);
         }
      } catch {
         setDealProducts([]);
      }
   }, []);

   const load = useCallback(async (silent) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);
      setPayrollLoading(true);
      try {
         const [reqRes, payrollRes] = await Promise.all([
            api.get('/services/shule-avance/applicant/my-requests'),
            api.get('/staff/payroll/my').catch(() => ({ data: { success: false } })),
            loadCatalog(),
            loadTeacherDealProducts(),
         ]);
         const reqOk = reqRes.data?.success === true;
         const rawList = reqRes.data?.data;
         const rowsData = reqOk && Array.isArray(rawList) ? rawList : [];
         if (reqOk) {
            const uid = teacher?.id;
            const prevMap = readStatusSnapshot(uid);
            const nextMap = Object.fromEntries(rowsData.map((r) => [String(r.id), r.status]));
            const newAlerts = computeStatusTransitionAlerts(prevMap, rowsData);
            writeStatusSnapshot(uid, nextMap);
            setRows(rowsData);
            if (newAlerts.length) {
               setStatusAlerts((prev) => {
                  const seen = new Set(prev.map((a) => a.key));
                  const merged = [...prev];
                  for (const a of newAlerts) {
                     if (!seen.has(a.key)) {
                        seen.add(a.key);
                        merged.unshift(a);
                     }
                  }
                  return merged.slice(0, 8);
               });
            }
         } else {
            setRows([]);
         }

         const cs = payrollRes?.data?.success ? payrollRes.data?.data?.currentSalary : null;
         if (cs && typeof cs === 'object') {
            const basic = Number(cs.basic) || 0;
            const allowances = Number(cs.allowances) || 0;
            const gross = basic + allowances;
            const net = Number(cs.net) || 0;
            const deductionsTotal = Math.max(0, gross - net);
            setPayrollSalary({ net, gross, allowancesTotal: allowances, basic });
         } else {
            setPayrollSalary(null);
         }
      } catch (e) {
         setError(e.response?.data?.message || 'Could not load ShuleAvance requests.');
         setRows([]);
         setPayrollSalary(null);
      } finally {
         setLoading(false);
         setRefreshing(false);
         setPayrollLoading(false);
      }
   }, [loadCatalog, loadTeacherDealProducts, teacher?.id]);

   useEffect(() => {
      load(false);
   }, [load]);

   useEffect(() => {
      const hasWorkflow =
         rows.length > 0 &&
         rows.some(
            (r) => r.status === 'pending_accountant' || r.status === 'sent_to_manager'
         );
      const ms = hasWorkflow ? 45000 : 120000;
      const id = window.setInterval(() => load(true), ms);
      return () => window.clearInterval(id);
   }, [load, rows]);

   const filtered = useMemo(() => {
      return rows.filter((r) => {
         if (filter === 'all') return true;
         if (filter === 'rejected') {
            return r.status === 'rejected_by_accountant' || r.status === 'rejected_by_manager';
         }
         return r.status === filter;
      });
   }, [rows, filter]);

   const activeApplications = useMemo(() => {
      return rows.filter(r => r.status === 'pending_accountant' || r.status === 'sent_to_manager');
   }, [rows]);

   const cashoutRequests = useMemo(() =>
      rows.filter(r => String(r.request_type || '').toLowerCase() === 'cashout'),
   [rows]);

   const dealRequests = useMemo(() =>
      rows.filter(r => String(r.request_type || '').toLowerCase() !== 'cashout'),
   [rows]);

   const [activeTab, setActiveTab] = useState('cashout');

   const resetForm = () => {
      setAmount('');
      setRepayment(6);
      setDescription('');
      setCashoutReason('');
      setSelectedDealProductIds([]);
      setDealPreview(null);
      setTeacherDealsStep('products');
      setWizardStep(1);
      setInvoiceVendor('');
      setInvoiceFile(null);
      setInvoiceItems([{ id: 1, name: '', qty: 1, unit: '' }]);
      setError(null);
   };

   const closeFlow = () => {
      setShowApplyModal(false);
      setSelectedBillKey(null);
      setApplyMode('direct');
      resetForm();
   };

   const submitRequest = async ({ customAmount, customPurpose, customTerm, isDeals = false }) => {
      setSubmitting(true);
      setError(null);
      try {
         const amt = isDeals ? Number(teacherDealsTotal) : Number(String(customAmount || amount).replace(/[^\d.]/g, ''));
         if (!amt || amt <= 0) {
            setError('Enter a valid amount.');
            setSubmitting(false);
            return;
         }

         const isCashout = selectedBillKey === 'cashout';
         
         const body = !isCashout 
           ? {
               request_type: 'service',
               service_category: selectedBillKey === 'invoice' ? 'invoice_payment' : selectedBillKey,
               description: String(customPurpose || description || '').trim(),
               amount_requested: amt,
               repayment_term_months: Number(customTerm || repayment),
               selected_deal_product_ids: isDeals ? selectedDealProductIds : undefined,
            }
           : {
               request_type: 'cashout',
               cashout_category: 'emergency_fund', // Default if not specified
               reason: String(customPurpose || cashoutReason || description || '').trim(),
               description: String(description || '').trim() || undefined,
               amount_requested: amt,
               repayment_term_months: Number(customTerm || repayment),
            };

         const res = await api.post('/services/shule-avance/applicant/requests', body);
         if (res.data?.success) {
            if (res.data.auto_approved) {
               setStatusAlerts((prev) => {
                  const key = `auto-approved-${Date.now()}`;
                  return [{
                     key,
                     variant: 'success',
                     title: 'Cashout auto-approved!',
                     message: `Your cashout of ${formatMoney(amt)} was instantly approved (≤ 40 % of your net salary) and will be deducted from your next payroll.`,
                  }, ...prev].slice(0, 8);
               });
            }
            closeFlow();
            await load(true);
         } else {
            setError(res.data?.message || 'Submit failed.');
         }
      } catch (e) {
         setError(e.response?.data?.message || 'Submit failed.');
      } finally {
         setSubmitting(false);
      }
   };

   const submitUpdate = async () => {
      if (!editRow?.id) return;
      setSubmitting(true);
      setError(null);
      try {
         const amt = Number(String(amount).replace(/[^\d.]/g, ''));
         const kind = String(editRow.request_type || 'service').toLowerCase();
         const body = kind === 'service'
           ? {
               request_type: 'service',
               service_category: editRow.service_category,
               description: String(description || '').trim(),
               amount_requested: amt,
               repayment_term_months: Number(repayment),
            }
           : {
               request_type: 'cashout',
               cashout_category: editRow.cashout_category_slug,
               reason: String(cashoutReason || '').trim(),
               description: String(description || '').trim() || undefined,
               amount_requested: amt,
               repayment_term_months: 1, // cashouts are always single-deduction
            };

         const res = await api.put(`/services/shule-avance/applicant/requests/${editRow.id}`, body);
         if (res.data?.success) {
            setEditRow(null);
            resetForm();
            await load(true);
         } else {
            setError(res.data?.message || 'Update failed.');
         }
      } catch (e) {
         setError(e.response?.data?.message || 'Update failed.');
      } finally {
         setSubmitting(false);
      }
   };

   const handleCancel = async (id) => {
      if (!window.confirm('Cancel this request?')) return;
      try {
         await api.delete(`/services/shule-avance/applicant/requests/${id}`);
         await load(true);
         setDetailRow(null);
      } catch (e) {
         alert(e.response?.data?.message || 'Could not cancel.');
      }
   };

   const openEdit = (row) => {
      setEditRow(row);
      setAmount(String(row.amount_rwf ?? ''));
      setRepayment(Number(row.repayment_term_months) || 6);
      if (String(row.request_type).toLowerCase() === 'cashout') {
         setCashoutReason(String(row.cashout_reason || row.purpose || ''));
         setDescription(String(row.details || ''));
      } else {
         setDescription(String(row.purpose || ''));
      }
   };

   const invoiceTotal = invoiceItems.reduce((sum, it) => {
      const qty = Number(it.qty) || 0;
      const unit = Number(String(it.unit || '').replace(/[^\d.]/g, '')) || 0;
      return sum + qty * unit;
   }, 0);

   const addInvoiceItem = () => setInvoiceItems(prev => [...prev, { id: Date.now(), name: '', qty: 1, unit: '' }]);
   const removeInvoiceItem = (id) => setInvoiceItems(prev => prev.length <= 1 ? prev : prev.filter(x => x.id !== id));
   const updateInvoiceItem = (id, patch) => setInvoiceItems(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x));

   const submitInvoiceWizard = async () => {
      const validItems = invoiceItems.filter(it => it.name && it.qty > 0 && it.unit > 0);
      if (!invoiceFile) return setError('Upload an invoice document.');
      if (!validItems.length) return setError('Add at least one item.');

      const purposeText = `Invoice: ${invoiceVendor}. Items: ${validItems.map(i => `${i.name} x${i.qty}`).join(', ')}`;
      return submitRequest({ customAmount: Math.round(invoiceTotal), customPurpose: purposeText, customTerm: repayment });
   };

   const renderBalanceCard = () => {
      const nextPayroll = (() => {
         const d = new Date();
         d.setMonth(d.getMonth() + 1);
         d.setDate(1);
         return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
      })();

      const { net, gross, deductionsTotal } = payrollSalary || {};
      const fmt = (n) => {
         if (payrollLoading) return '…';
         if (!Number.isFinite(n)) return '—';
         return Math.round(n).toLocaleString();
      };

      return (
         <div className="relative -mx-4 rounded-none sm:rounded-[24px] overflow-hidden border-y sm:border border-white/10 bg-[linear-gradient(145deg,#0E1F35,#1B3354)] text-white p-5 shadow-none md:shadow-[0_18px_45px_-22px_rgba(14,31,53,0.9)]">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-re-orange/20" />
            <div className="absolute -bottom-8 left-6 w-24 h-24 rounded-full bg-white/5" />
 
            <div className="flex justify-between items-start relative z-10 mb-1">
               <p className="text-sm font-semibold text-white">Payroll Balance</p>
               <button type="button" onClick={() => setShowBalances(!showBalances)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/40" aria-label={showBalances ? 'Hide amounts' : 'Show amounts'}>
                  {showBalances ? <EyeOff size={14} /> : <Eye size={14} />}
               </button>
            </div>
            <p className="text-3xl font-black tracking-tight mt-1 relative z-10 min-h-[2.25rem] flex items-baseline gap-1 flex-wrap">
               {payrollLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-white/50" aria-hidden />
               ) : (
                  <>
                     <span>{showBalances ? fmt(net) : '******'}</span>
                     <span className="font-black">RWF</span>
                  </>
               )}
            </p>

            <div className="mt-5 pt-4 border-t border-white/10 flex relative z-10">
               <div className="flex-1 pr-4 border-r border-white/10">
                  <p className="text-sm font-semibold text-white">Actual Payroll</p>
                  <p className="text-sm font-semibold text-white">
                     {payrollLoading ? '…' : (showBalances ? fmt(gross) : '******')} {!payrollLoading && <span className="text-sm font-black">RWF</span>}
                  </p>
                  {!payrollLoading && payrollSalary != null && Number.isFinite(payrollSalary.allowancesTotal) && payrollSalary.allowancesTotal > 0 && (
                     <p className="text-[10px] font-semibold text-white/45 mt-0.5">incl. {Math.round(payrollSalary.allowancesTotal).toLocaleString()} RWF allowances</p>
                  )}
               </div>
               <div className="flex-1 pl-4">
                  <p className="text-sm font-semibold text-white">Deduction</p>
                  <p className="text-sm font-semibold text-white">
                     {payrollLoading ? '…' : (showBalances ? fmt(deductionsTotal) : '******')} {!payrollLoading && <span className="text-sm font-black text-white">RWF</span>}
                  </p>
               </div>
            </div>
            <div className="mt-3 hidden md:flex items-center gap-1.5 relative z-10 opacity-40">
               <Clock size={10} className="text-re-orange" />
               <p className="text-sm font-semibold text-white">Next Payroll: {nextPayroll}</p>
            </div>
         </div>
      );
   };

   if (loading && !rows.length) return (
      <div className="animate-in fade-in duration-500 bg-white min-h-screen font-sans">
         <DosOchreHero
            eyebrow="Financial services"
            titleLine="Shule"
            titleAccent="Avance"
            subtitle="Cashouts, staff deals, and payroll-backed advances — track requests and repayment in one place."
            icon={Wallet}
         />
         <div className="flex justify-center py-24 relative z-20 -mt-6">
            <Loader2 className="h-10 w-10 animate-spin text-re-orange" aria-hidden />
         </div>
      </div>
   );

   const renderRequestButton = (isMobile) => {
      const trigger = () => { setSelectedBillKey('cashout'); setApplyMode('direct'); setShowApplyModal(true); setCashoutReason('Emergency Cashout'); };
      
      if (isMobile) return (
         <div className="px-0 md:py-4">
            <button onClick={trigger} className="w-full bg-white border border-re-orange/20 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all group active:scale-[0.98]">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-re-orange/10 flex items-center justify-center text-re-orange">
                     <Plus size={24} strokeWidth={3} />
                  </div>
                  <div className="text-left">
                     <p className="text-sm font-black text-re-text uppercase tracking-tight">Request Cashout</p>
                     <p className="text-[10px] font-bold text-re-text-muted opacity-60 uppercase">
                        {payrollSalary?.net
                           ? `≤ ${formatMoney(Math.floor(payrollSalary.net * 0.4))} auto-approved instantly`
                           : 'Instant approval available for ≤ 40% of net salary'}
                     </p>
                  </div>
               </div>
               <ChevronRight size={18} className="text-re-orange group-hover:translate-x-1 transition-transform" />
            </button>
         </div>
      );

      return (
         <button onClick={trigger} className="w-full py-4 bg-re-orange text-white rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-re-orange/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2">
            <Plus size={16} />
            <span>Request Cashout</span>
         </button>
      );
   };
   const dismissStatusAlert = (key) => {
      setStatusAlerts((prev) => prev.filter((a) => a.key !== key));
   };

   const handleEnablePush = async () => {
      setPushBusy(true);
      setPushHint(null);
      try {
         await subscribeShuleAvancePush(api);
         await refreshPushState();
      } catch (e) {
         setPushHint(e.response?.data?.message || e.message || 'Could not enable notifications.');
      } finally {
         setPushBusy(false);
      }
   };

   const handleDisablePush = async () => {
      setPushBusy(true);
      setPushHint(null);
      try {
         await unsubscribeShuleAvancePush(api);
         await refreshPushState();
      } catch (e) {
         setPushHint(e.response?.data?.message || e.message || 'Could not turn off notifications.');
      } finally {
         setPushBusy(false);
      }
   };

   const renderWebPushCard = () => {
      if (!isWebPushEnvironmentSupported()) {
         return (
            <div className="rounded-2xl border border-black/5 bg-white/90 p-4 text-xs font-semibold text-re-text-muted">
               Browser push notifications are not supported on this device.
            </div>
         );
      }
      const denied = pushUi.permission === 'denied';
      const subscribed = pushUi.subscribed;

      return (
         <div className="rounded-2xl border border-re-orange/15 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
               <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-re-orange/10 text-re-orange">
                  <Bell size={18} aria-hidden />
               </div>
               <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-wide text-re-text">Browser alerts</p>
                  <p className="mt-1 text-[11px] font-semibold leading-snug text-re-text-muted">
                     {denied
                        ? 'Notifications are blocked for this site. Enable them in your browser settings to receive Shule Avance updates.'
                        : subscribed
                          ? 'Active on this device. You will be notified when your cashout is auto-approved, when finance forwards your request, or when your manager decides.'
                          : 'Turn on to get notified the moment your cashout is auto-approved, or when your manager approves/rejects — works even when this tab is closed, on any device.'}
                  </p>
                  {pushHint ? (
                     <p className="mt-2 text-[11px] font-semibold text-amber-700">{pushHint}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                     {!denied && subscribed ? (
                        <button
                           type="button"
                           disabled={pushBusy}
                           onClick={handleDisablePush}
                           className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-re-text hover:bg-re-bg disabled:opacity-50"
                        >
                           {pushBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                           Turn off
                        </button>
                     ) : null}
                     {!denied && !subscribed ? (
                        <button
                           type="button"
                           disabled={pushBusy}
                           onClick={handleEnablePush}
                           className="inline-flex items-center gap-1.5 rounded-xl bg-re-orange px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white shadow-sm hover:opacity-95 disabled:opacity-50"
                        >
                           {pushBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" aria-hidden /> : null}
                           Enable notifications
                        </button>
                     ) : null}
                  </div>
               </div>
            </div>
         </div>
      );
   };

   return (
      <div className="animate-in fade-in duration-700 bg-white min-h-screen font-sans">
         <DosOchreHero
            eyebrow="Financial services"
            titleLine="Shule"
            titleAccent="Avance"
            subtitle="Cashouts, staff deals, and payroll-backed advances — track requests and repayment in one place."
            icon={Wallet}
         />
         {/* ── Status alert toasts — portalled to body so CSS stacking contexts can't clip them ── */}
         {statusAlerts.length > 0 && createPortal(
            <div
               className="fixed top-16 left-4 right-4 z-[9999] flex flex-col gap-2 max-w-lg mx-auto md:left-auto md:right-6 md:mx-0 pointer-events-none"
               role="region"
               aria-label="Shule Avance updates"
            >
               {statusAlerts.map((a) => {
                  const isSuccess = a.variant === 'success';
                  const isReject = a.variant === 'reject';
                  return (
                     <div
                        key={a.key}
                        className={`pointer-events-auto flex gap-3 rounded-2xl border p-4 shadow-[0_14px_40px_-12px_rgba(14,31,53,0.35)] animate-in slide-in-from-top-2 duration-300 ${
                           isSuccess
                              ? 'border-emerald-200 bg-emerald-50/98 backdrop-blur-sm'
                              : isReject
                                ? 'border-red-200 bg-red-50/98 backdrop-blur-sm'
                                : 'border-sky-200 bg-sky-50/98 backdrop-blur-sm'
                        }`}
                     >
                        <div
                           className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              isSuccess
                                 ? 'bg-emerald-100 text-emerald-700'
                                 : isReject
                                   ? 'bg-red-100 text-red-700'
                                   : 'bg-sky-100 text-sky-700'
                           }`}
                        >
                           {isSuccess ? <CheckCircle2 size={20} /> : isReject ? <XCircle size={20} /> : <Send size={20} />}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                           <p className="text-sm font-black text-re-text leading-tight">{a.title}</p>
                           <p className="mt-0.5 text-xs font-semibold text-re-text-muted leading-snug">{a.message}</p>
                        </div>
                        <button
                           type="button"
                           onClick={() => dismissStatusAlert(a.key)}
                           className="shrink-0 rounded-lg p-1.5 text-re-text-muted hover:bg-black/5 hover:text-re-text transition-colors"
                           aria-label="Dismiss notification"
                        >
                           <X size={16} />
                        </button>
                     </div>
                  );
               })}
            </div>,
            document.body
         )}
         {/* ── Main Content Grid ── */}
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 md:px-12 -mt-4 sm:-mt-5 md:-mt-6 pt-2 md:pt-4 pb-20 relative z-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

               {/* ── Left Column (Financial Dashboard) ── */}
                <div className="lg:col-span-2 space-y-4 md:space-y-8">
                   <div className="lg:hidden space-y-4">
                      {renderBalanceCard()}
                      {renderRequestButton(true)}
                      {renderWebPushCard()}
                   </div>

                   {/* ── Tabbed History Card ── */}
                   <div className="bg-white rounded-2xl md:rounded-[32px] md:shadow-xl border-y md:border border-black/5 overflow-hidden">

                     {/* Tab switcher */}
                     <div className="px-4 pt-4 pb-0 md:px-6 md:pt-5">
                        <div className="flex gap-2 p-1 bg-re-bg rounded-2xl">
                           <button
                              onClick={() => setActiveTab('cashout')}
                              className={`flex flex-1 items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-black text-[11px] uppercase tracking-wide transition-all duration-200 ${
                                 activeTab === 'cashout'
                                    ? 'bg-re-orange text-white shadow-md shadow-re-orange/30'
                                    : 'text-re-text-muted hover:text-re-text'
                              }`}
                           >
                              <Banknote size={13} className="shrink-0" />
                              <span>Cashouts</span>
                              {cashoutRequests.length > 0 && (
                                 <span className={`inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9px] font-black ${
                                    activeTab === 'cashout' ? 'bg-white/25 text-white' : 'bg-re-orange/15 text-re-orange'
                                 }`}>{cashoutRequests.length}</span>
                              )}
                           </button>
                           <button
                              onClick={() => setActiveTab('deals')}
                              className={`flex flex-1 items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-black text-[11px] uppercase tracking-wide transition-all duration-200 ${
                                 activeTab === 'deals'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                    : 'text-re-text-muted hover:text-re-text'
                              }`}
                           >
                              <Package size={13} className="shrink-0" />
                              <span>Deals</span>
                              {dealRequests.length > 0 && (
                                 <span className={`inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9px] font-black ${
                                    activeTab === 'deals' ? 'bg-white/25 text-white' : 'bg-indigo-500/15 text-indigo-600'
                                 }`}>{dealRequests.length}</span>
                              )}
                           </button>
                        </div>
                     </div>

                     {/* ── Cashout Tab ── */}
                     {activeTab === 'cashout' && (
                        <div className="animate-in fade-in duration-200">
                           <div className="flex items-center justify-between px-4 pt-4 pb-2 md:px-6">
                              <p className="text-[10px] font-black uppercase text-re-text-muted tracking-widest opacity-60">
                                 {cashoutRequests.length} request{cashoutRequests.length !== 1 ? 's' : ''}
                                 {cashoutRequests.length > 0 && ` · ${formatMoney(cashoutRequests.reduce((s, r) => s + (Number(r.amount_rwf) || 0), 0))} total`}
                              </p>
                              <button
                                 onClick={() => { setSelectedBillKey('cashout'); setApplyMode('direct'); setShowApplyModal(true); setCashoutReason('Emergency Cashout'); }}
                                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-re-orange text-white text-[10px] font-black uppercase tracking-wide hover:opacity-90 transition-opacity shadow-sm"
                              >
                                 <Plus size={11} /> New Cashout
                              </button>
                           </div>

                           {cashoutRequests.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-14 gap-3">
                                 <div className="w-14 h-14 rounded-2xl bg-re-bg flex items-center justify-center">
                                    <Banknote size={24} className="text-re-text-muted/30" />
                                 </div>
                                 <div className="text-center">
                                    <p className="text-xs font-black text-re-text-muted opacity-40 uppercase tracking-wide">No cashout requests yet</p>
                                    <p className="text-[10px] text-re-text-muted opacity-30 mt-1">Tap "New Cashout" to request funds</p>
                                 </div>
                              </div>
                           ) : (
                              <div className="overflow-x-auto pb-2">
                                 <table className="w-full min-w-[360px]">
                                    <thead>
                                       <tr className="border-b border-black/5 bg-re-bg/40">
                                          <th className="px-4 md:px-6 py-2.5 text-left text-[10px] font-black uppercase text-re-text-muted/70 tracking-wider">Date & Reason</th>
                                          <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase text-re-text-muted/70 tracking-wider">Amount</th>
                                          <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase text-re-text-muted/70 tracking-wider">Status</th>
                                          <th className="px-3 py-2.5 w-8"></th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/[0.04]">
                                       {cashoutRequests.map((r) => (
                                          <tr key={r.id} onClick={() => setDetailRow(r)} className="group hover:bg-re-bg/40 transition-colors cursor-pointer active:bg-re-bg/60">
                                             <td className="px-4 md:px-6 py-3.5">
                                                <div className="text-xs font-bold text-re-text">{new Date(r.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                                {r.cashout_reason && (
                                                   <div className="text-[10px] text-re-text-muted mt-0.5 max-w-[180px] truncate opacity-50">{r.cashout_reason}</div>
                                                )}
                                             </td>
                                             <td className="px-3 py-3.5 whitespace-nowrap">
                                                <span className="text-sm font-black text-re-text">{formatMoney(r.amount_rwf)}</span>
                                             </td>
                                             <td className="px-3 py-3.5 whitespace-nowrap">
                                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold ${STATUS_MAP[r.status]?.className || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                                   {STATUS_MAP[r.status]?.short || r.status}
                                                </span>
                                             </td>
                                             <td className="px-3 py-3.5 text-right">
                                                <ChevronRight size={14} className="text-re-text-muted/40 group-hover:translate-x-0.5 transition-transform inline-block" />
                                             </td>
                                          </tr>
                                       ))}
                                    </tbody>
                                 </table>
                              </div>
                           )}
                        </div>
                     )}

                     {/* ── Deals Tab ── */}
                     {activeTab === 'deals' && (
                        <div className="animate-in fade-in duration-200">
                           <div className="flex items-center justify-between px-4 pt-4 pb-2 md:px-6">
                              <p className="text-[10px] font-black uppercase text-re-text-muted tracking-widest opacity-60">
                                 {dealRequests.length} request{dealRequests.length !== 1 ? 's' : ''}
                                 {dealRequests.length > 0 && ` · ${formatMoney(dealRequests.reduce((s, r) => s + (Number(r.amount_rwf) || 0), 0))} total`}
                              </p>
                           </div>

                           {dealRequests.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-14 gap-3">
                                 <div className="w-14 h-14 rounded-2xl bg-re-bg flex items-center justify-center">
                                    <Package size={24} className="text-re-text-muted/30" />
                                 </div>
                                 <div className="text-center">
                                    <p className="text-xs font-black text-re-text-muted opacity-40 uppercase tracking-wide">No deal requests yet</p>
                                    <p className="text-[10px] text-re-text-muted opacity-30 mt-1">Browse staff deals when your school enables them</p>
                                 </div>
                              </div>
                           ) : (
                              <div className="overflow-x-auto pb-2">
                                 <table className="w-full min-w-[380px]">
                                    <thead>
                                       <tr className="border-b border-black/5 bg-re-bg/40">
                                          <th className="px-4 md:px-6 py-2.5 text-left text-[10px] font-black uppercase text-re-text-muted/70 tracking-wider">Service / Deal</th>
                                          <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase text-re-text-muted/70 tracking-wider">Amount</th>
                                          <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase text-re-text-muted/70 tracking-wider hidden sm:table-cell">Term</th>
                                          <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase text-re-text-muted/70 tracking-wider">Status</th>
                                          <th className="px-3 py-2.5 w-8"></th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/[0.04]">
                                       {dealRequests.map((r) => {
                                          const label = r.service_category
                                             ? r.service_category.replace(/_/g, ' ')
                                             : r.vendor_label || 'Service';
                                          return (
                                             <tr key={r.id} onClick={() => setDetailRow(r)} className="group hover:bg-re-bg/40 transition-colors cursor-pointer active:bg-re-bg/60">
                                                <td className="px-4 md:px-6 py-3.5">
                                                   <div className="text-xs font-bold text-re-text capitalize">{label}</div>
                                                   <div className="text-[10px] text-re-text-muted mt-0.5 opacity-50">{new Date(r.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                                </td>
                                                <td className="px-3 py-3.5 whitespace-nowrap">
                                                   <span className="text-sm font-black text-re-text">{formatMoney(r.amount_rwf)}</span>
                                                </td>
                                                <td className="px-3 py-3.5 whitespace-nowrap hidden sm:table-cell">
                                                   <span className="text-xs font-semibold text-re-text-muted/60">{r.repayment_term_months || 1}mo</span>
                                                </td>
                                                <td className="px-3 py-3.5 whitespace-nowrap">
                                                   <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold ${STATUS_MAP[r.status]?.className || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                                      {STATUS_MAP[r.status]?.short || r.status}
                                                   </span>
                                                </td>
                                                <td className="px-3 py-3.5 text-right">
                                                   <ChevronRight size={14} className="text-re-text-muted/40 group-hover:translate-x-0.5 transition-transform inline-block" />
                                                </td>
                                             </tr>
                                          );
                                       })}
                                    </tbody>
                                 </table>
                              </div>
                           )}
                        </div>
                     )}
                   </div>
               </div>

               {/* ── Right Column (Sidebar) ── */}
                <div className="md:space-y-4 lg:sticky lg:top-20 h-fit">
                   <div className="hidden lg:block space-y-2">
                      {renderBalanceCard()}
                      {renderRequestButton(false)}
                      {renderWebPushCard()}
                   </div>

                   <div className="md:space-y-2">
                      <div className="hidden md:flex bg-white md:rounded-2xl border border-emerald-500/10 p-5 items-start gap-4 shadow-sm">
                         <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shadow-inner border border-emerald-100/50 shrink-0"><User size={18} /></div>
                         <div className="pt-0.5">
                            <div className="flex items-center gap-1.5">
                               <h3 className="text-[11px] font-black text-re-text uppercase">KYC Verified</h3>
                               <CheckCircle size={10} className="text-emerald-500" />
                            </div>
                            <p className="text-[9px] text-re-text-muted font-bold mt-1 opacity-70">Your profile matches school records for check-offs.</p>
                         </div>
                      </div>

                      <div className="hidden md:flex relative md:rounded-[24px] p-6 text-white shadow-2xl overflow-hidden group cursor-pointer active:scale-95 transition-all bg-[linear-gradient(145deg,#0E1F35,#1F3554)] min-h-[160px] border border-white/10 flex-col justify-center">
                         <div className="absolute inset-0 opacity-10 grayscale mix-blend-overlay"><img src="/teacher.jpg" alt="" className="w-full h-full object-cover" /></div>
                         <div className="relative z-10 space-y-4">
                            <div className="w-9 h-9 bg-re-orange/20 rounded-xl flex items-center justify-center border border-re-orange/30"><Users size={18} className="text-re-orange" /></div>
                            <div>
                               <h4 className="font-black text-[10px] uppercase tracking-widest">Emergency Assistance?</h4>
                               <p className="text-[9px] text-white/60 font-bold mt-2 leading-relaxed">Contact our support desk for priority processing of urgent medical or family needs.</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-re-orange">Talk to Agent <ArrowRight size={10} /></div>
                         </div>
                      </div>
                   </div>
                </div>
            </div>
         </div>

         {/* ── Modals ── */}
         {showApplyModal && (() => {
            const applyCanAdvance =
               (applyMode === 'invoice' && wizardStep < 2) || (applyMode === 'direct' && wizardStep < 2);
            const handleApplyBack = () => (wizardStep === 1 ? closeFlow() : setWizardStep(wizardStep - 1));
            const handleApplyPrimary = () => {
               if (applyCanAdvance) setWizardStep(wizardStep + 1);
               else if (applyMode === 'invoice') submitInvoiceWizard();
               else submitRequest({ customTerm: 1 });
            };
            return createPortal(
            <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4">
               <div className="w-full sm:max-w-[500px] rounded-t-[28px] sm:rounded-[24px] shadow-2xl max-h-[min(96svh,100dvh)] sm:max-h-[92vh] flex flex-col min-h-0 overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">

                  {/* ── Header ── */}
                  <div className="bg-[linear-gradient(145deg,#0E1F35,#1B3354)] px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-6 pb-4 shrink-0 border-b border-white/5">
                     <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />
                     <div className="flex items-center gap-3">
                        {/* Back button — always visible in header */}
                        <button
                           type="button"
                           onClick={handleApplyBack}
                           className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15 text-white shadow-sm hover:bg-white/20 active:scale-[0.97] transition-all"
                           aria-label={wizardStep === 1 ? 'Close' : 'Back'}
                        >
                           <ArrowLeft size={18} strokeWidth={2.25} />
                        </button>
                        <div className="min-w-0 flex-1">
                           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/90 mb-0.5">
                              Step {wizardStep} of 2 · {applyMode === 'invoice' ? 'Invoice' : 'Cashout'}
                           </p>
                           <h1 className="text-base sm:text-lg font-black text-white leading-snug break-words">
                              {applyMode === 'invoice' ? 'Pay Invoice' : 'New Cashout Request'}
                           </h1>
                        </div>
                        <button
                           type="button"
                           onClick={closeFlow}
                           className="h-10 w-10 shrink-0 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl text-white/70 transition-all"
                           aria-label="Close"
                        >
                           <X size={18} />
                        </button>
                     </div>
                     {/* Step dots */}
                     <div className="flex gap-1.5 mt-3 ml-[52px]">
                        {[1, 2].map(s => (
                           <div key={s} className={`rounded-full transition-all duration-300 ${s === wizardStep ? 'w-5 h-1.5 bg-amber-400' : s < wizardStep ? 'w-1.5 h-1.5 bg-amber-400/60' : 'w-1.5 h-1.5 bg-white/20'}`} />
                        ))}
                     </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5 sm:py-6 bg-white space-y-6 [-webkit-overflow-scrolling:touch]">
                     {error && <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-4 animate-in fade-in"><AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" /><p className="text-xs font-bold text-red-800">{error}</p></div>}
                     
                     {applyMode === 'invoice' ? (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                           {wizardStep === 1 && (
                              <div className="space-y-6">
                                 <div className="space-y-1.5"><label className="text-[10px] font-black text-re-text-muted uppercase tracking-widest opacity-40">Vendor / Biller Name</label>
                                    <input value={invoiceVendor} onChange={e => setInvoiceVendor(e.target.value)} placeholder="Ex: Rwanda Energy Group / Water Co." className="w-full h-12 bg-re-bg rounded-xl px-4 font-bold text-sm outline-none border border-transparent focus:border-re-orange/20" />
                                 </div>
                                 <div className="space-y-1.5"><label className="text-[10px] font-black text-re-text-muted uppercase tracking-widest opacity-40">Upload Document</label>
                                    <label className="group relative w-full h-40 rounded-[24px] bg-re-bg border border-dashed border-black/10 transition-all flex items-center justify-center overflow-hidden cursor-pointer hover:bg-re-orange/5 hover:border-re-orange/30 shadow-inner">
                                       <input type="file" className="hidden" accept="application/pdf,image/*" onChange={e => setInvoiceFile(e.target.files?.[0] || null)} />
                                       <div className="text-center">
                                          <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center transition-all ${invoiceFile ? 'bg-emerald-50 text-emerald-500' : 'bg-white text-re-text-muted shadow-sm group-hover:scale-110'}`}>{invoiceFile ? <CheckCircle size={24} /> : <Upload size={24} />}</div>
                                          <p className="mt-3 text-[11px] font-black text-re-text">{invoiceFile ? invoiceFile.name : 'Tap to Upload Invoice'}</p>
                                          <p className="text-[10px] font-bold text-re-text-muted opacity-50 uppercase mt-1">PDF or Image (Max 5MB)</p>
                                       </div>
                                    </label>
                                 </div>
                              </div>
                           )}
                           {wizardStep === 2 && (
                              <div className="space-y-4 animate-in slide-in-from-right-4">
                                 <div className="divide-y divide-black/5 bg-re-bg rounded-2xl border border-black/5 overflow-hidden">
                                    {invoiceItems.map(it => (
                                       <div key={it.id} className="p-3 grid grid-cols-12 gap-2 items-center">
                                          <input value={it.name} onChange={e => updateInvoiceItem(it.id, { name: e.target.value })} placeholder="Item description" className="col-span-6 h-10 bg-white rounded-lg px-3 font-bold text-xs outline-none shadow-sm" />
                                          <input type="number" value={it.qty} onChange={e => updateInvoiceItem(it.id, { qty: Number(e.target.value) })} className="col-span-2 h-10 bg-white rounded-lg text-center font-bold text-xs outline-none shadow-sm" />
                                          <input value={it.unit} onChange={e => updateInvoiceItem(it.id, { unit: e.target.value })} placeholder="Price" className="col-span-3 h-10 bg-white rounded-lg px-3 text-right font-black text-xs outline-none shadow-sm" />
                                          <button onClick={() => removeInvoiceItem(it.id)} className="col-span-1 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                       </div>
                                    ))}
                                 </div>
                                 <button onClick={addInvoiceItem} className="w-full py-3 rounded-2xl border border-dashed border-black/10 text-[10px] font-black uppercase text-re-text-muted hover:bg-re-bg hover:text-re-orange transition-all">Add Line Item</button>
                                 <div className="flex justify-between items-center px-4 py-4 bg-orange-50 rounded-2xl border border-re-orange/10">
                                    <span className="text-[10px] font-black uppercase text-re-orange/70">Estimated Total</span>
                                    <span className="text-xl font-black text-re-orange">{formatMoney(invoiceTotal)}</span>
                                 </div>
                              </div>
                           )}
                        </div>
                     ) : (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                           {wizardStep === 1 && (
                              <div className="space-y-6 py-4">
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-re-text-muted uppercase tracking-widest opacity-40 ml-1">Amount Requested (RWF)</label>
                                    <input type="number" value={amount} onChange={e => { setAmount(e.target.value); }} placeholder="Enter amount..." className="w-full h-16 bg-re-bg rounded-2xl px-6 font-black text-2xl outline-none border border-transparent focus:border-re-orange/20 shadow-inner" />
                                    {/* 40% threshold badge */}
                                    {(() => {
                                       const netSal = payrollSalary?.net || 0;
                                       const threshold = Math.floor(netSal * 0.4);
                                       const enteredAmt = Number(amount) || 0;
                                       if (!netSal || !enteredAmt) return null;
                                       const isAuto = enteredAmt <= threshold;
                                       return (
                                          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold mt-1 ${isAuto ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                                             {isAuto ? <CheckCircle size={13} className="shrink-0 text-emerald-600" /> : <AlertCircle size={13} className="shrink-0 text-amber-600" />}
                                             {isAuto
                                                ? `Auto-approved — within 40% of your net salary (${formatMoney(threshold)} limit)`
                                                : `Requires review — exceeds 40% limit (${formatMoney(threshold)}). Will go to accountant → manager.`
                                             }
                                          </div>
                                       );
                                    })()}
                                 </div>
                                 <div className="p-5 rounded-2xl bg-re-bg/50 border border-black/5 flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-re-orange shrink-0 shadow-sm transition-transform hover:rotate-12"><Zap size={20} /></div>
                                    <div>
                                       <p className="text-[10px] font-black text-re-text uppercase tracking-tight">Auto-Deduction Notice</p>
                                       <p className="text-[10px] font-semibold text-re-text-muted opacity-60 mt-1 leading-relaxed">This advance will be deducted in full from your upcoming payroll payout.</p>
                                    </div>
                                 </div>
                              </div>
                           )}
                           {wizardStep === 2 && (
                              <div className="space-y-4 py-2">
                                 {/* Approval path indicator */}
                                 {(() => {
                                    const netSal = payrollSalary?.net || 0;
                                    const threshold = Math.floor(netSal * 0.4);
                                    const enteredAmt = Number(amount) || 0;
                                    const isAuto = netSal > 0 && enteredAmt > 0 && enteredAmt <= threshold;
                                    return (
                                       <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-[10px] font-bold ${isAuto ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                                          {isAuto ? <CheckCircle size={14} className="shrink-0 text-emerald-600" /> : <Send size={14} className="shrink-0 text-amber-600" />}
                                          <span>
                                             {isAuto
                                                ? 'Instant approval — money will be available immediately, deducted from next payroll.'
                                                : 'This request will be sent to your accountant, then to your school manager for approval.'}
                                          </span>
                                       </div>
                                    );
                                 })()}
                                 <div className="bg-re-bg p-6 rounded-[28px] border border-black/5 space-y-5">
                                    <div className="flex justify-between items-center">
                                       <span className="text-[10px] font-black uppercase text-re-text-muted/60">Amount to Receive</span>
                                       <span className="text-xl font-black text-re-text">{formatMoney(amount)}</span>
                                    </div>
                                    <div className="border-t border-dashed border-black/10 pt-5 flex justify-between items-center">
                                       <div className="space-y-0.5">
                                          <span className="text-[10px] font-black uppercase text-re-orange tracking-widest">Est. Salary Balance</span>
                                          <p className="text-[9px] font-bold text-re-text-muted opacity-50 uppercase">After next deduction</p>
                                       </div>
                                       <span className="text-xl font-black text-re-orange">{formatMoney((payrollSalary?.net || 0) - Number(amount))}</span>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-2 p-3 bg-re-orange/5 border border-re-orange/10 rounded-xl">
                                    <AlertCircle size={14} className="text-re-orange shrink-0" />
                                    <p className="text-[9px] font-bold text-re-orange opacity-80 uppercase leading-relaxed">Please check the details above before proceeding.</p>
                                 </div>
                              </div>
                           )}
                        </div>
                     )}
                  </div>

                  {/* ── Mobile sticky footer (Next / Confirm at bottom-right) ── */}
                  <div className="lg:hidden shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-white border-t border-black/5 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))]">
                     <p className="text-[10px] font-bold text-re-text-muted opacity-50 uppercase">
                        {wizardStep === 1 ? 'Fill in the details' : 'Review your request'}
                     </p>
                     {applyCanAdvance ? (
                        <button
                           type="button"
                           onClick={() => setWizardStep(wizardStep + 1)}
                           className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-[#0E1F35] text-white font-black text-[11px] uppercase tracking-wide shadow-lg active:scale-95 transition-all"
                        >
                           Next <ChevronRight size={14} strokeWidth={2.5} />
                        </button>
                     ) : (
                        <button
                           type="button"
                           onClick={handleApplyPrimary}
                           disabled={submitting}
                           className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-re-orange text-white font-black text-[11px] uppercase tracking-wide shadow-lg shadow-re-orange/25 active:scale-95 transition-all disabled:opacity-50"
                        >
                           {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                           {submitting ? 'Submitting…' : 'Confirm'}
                        </button>
                     )}
                  </div>

                  {/* ── Desktop footer ── */}
                  <div className="hidden lg:flex p-6 border-t border-black/5 items-center justify-between gap-4 shrink-0 bg-white">
                     <button
                        type="button"
                        onClick={handleApplyBack}
                        className="px-6 py-2.5 rounded-xl border border-black/5 font-black text-[11px] uppercase tracking-widest hover:bg-re-bg transition-all text-re-text-muted"
                     >
                        Back
                     </button>
                     {applyCanAdvance ? (
                        <button
                           type="button"
                           onClick={() => setWizardStep(wizardStep + 1)}
                           className="flex-1 px-8 py-3 rounded-xl bg-[#0E1F35] text-white font-black text-[11px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
                        >
                           Review Request
                        </button>
                     ) : (
                        <button
                           type="button"
                           onClick={handleApplyPrimary}
                           disabled={submitting}
                           className="flex-1 px-8 py-3 rounded-xl bg-re-orange text-white font-black text-[11px] uppercase tracking-widest shadow-xl shadow-re-orange/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                           {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                           {submitting ? 'Submitting...' : 'Confirm & Request'}
                        </button>
                     )}
                  </div>
               </div>
            </div>,
            document.body
            );
         })()}

         {/* Edit Modal (Standard) */}
         {editRow && createPortal(
            <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
               <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
                  <div className="flex items-center justify-between"><h2 className="text-lg font-black text-re-text uppercase tracking-tight">Update Request</h2><button onClick={() => setEditRow(null)} className="p-2 hover:bg-re-bg rounded-xl"><X size={20} /></button></div>
                  <div className="space-y-4">
                     <div><label className="text-[10px] font-black text-re-text-muted uppercase">Amount (RWF)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full h-12 bg-re-bg rounded-xl px-4 font-black mt-1" /></div>
                     {String(editRow.request_type).toLowerCase() !== 'cashout' && (
                        <div><label className="text-[10px] font-black text-re-text-muted uppercase">Repayment Months</label><select value={repayment} onChange={e => setRepayment(Number(e.target.value))} className="w-full h-12 bg-re-bg rounded-xl px-4 font-black mt-1">{REPAYMENT_OPTIONS.map(m => <option key={m} value={m}>{m} Months</option>)}</select></div>
                     )}
                     {String(editRow.request_type).toLowerCase() === 'cashout' ? (
                        <>
                           <div><label className="text-[10px] font-black text-re-text-muted uppercase">Reason</label><textarea value={cashoutReason} onChange={e => setCashoutReason(e.target.value)} className="w-full h-24 bg-re-bg rounded-xl p-4 font-bold mt-1" /></div>
                           <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 border border-sky-100 text-[10px] font-bold text-sky-800">
                              <Zap size={12} className="shrink-0 text-sky-500" />
                              Cashout is deducted in full from your next payroll — no repayment schedule needed.
                           </div>
                        </>
                     ) : (
                        <div><label className="text-[10px] font-black text-re-text-muted uppercase">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full h-24 bg-re-bg rounded-xl p-4 font-bold mt-1" /></div>
                     )}
                     <button onClick={submitUpdate} disabled={submitting} className="w-full py-4 rounded-2xl bg-re-grad-orange text-white font-black uppercase tracking-widest shadow-re-glow">{submitting ? 'Saving…' : 'Save Changes'}</button>
                  </div>
               </div>
            </div>,
            document.body
         )}

         {/* Detail Modal */}
         <Modal open={!!detailRow} onClose={() => setDetailRow(null)} wide
            title={detailRow ? `${String(detailRow.request_type || 'service').toLowerCase() === 'cashout' ? 'Cashout' : 'Deal'} Request #${detailRow.id}` : ''}>
            {detailRow && (() => {
               const isCashout = String(detailRow.request_type || '').toLowerCase() === 'cashout';
               const isPending = detailRow.status === 'pending_accountant';
               const amt = Number(detailRow.amount_rwf) || 0;
               const months = Number(detailRow.repayment_term_months) || 1;
               const interest = amt * 0.03 * months;
               return (
                  <div className="space-y-5">

                     {/* Type badge + status */}
                     <div className="flex items-center justify-between gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide ${isCashout ? 'bg-re-orange/10 text-re-orange' : 'bg-indigo-50 text-indigo-700'}`}>
                           {isCashout ? <Banknote size={12} /> : <Package size={12} />}
                           {isCashout ? 'Cashout' : (detailRow.service_category?.replace(/_/g, ' ') || detailRow.vendor_label || 'Service')}
                        </span>
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold ${STATUS_MAP[detailRow.status]?.className || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                           {STATUS_MAP[detailRow.status]?.label || detailRow.status}
                        </span>
                     </div>

                     {/* Key figures */}
                     <div className="grid grid-cols-2 gap-3">
                        <div className="bg-re-bg rounded-2xl p-4 space-y-1">
                           <p className="text-[9px] font-black uppercase text-re-text-muted opacity-50 tracking-widest">Amount</p>
                           <p className="text-xl font-black text-re-text">{formatMoney(amt)}</p>
                        </div>
                        <div className="bg-re-bg rounded-2xl p-4 space-y-1">
                           <p className="text-[9px] font-black uppercase text-re-text-muted opacity-50 tracking-widest">Date</p>
                           <p className="text-sm font-black text-re-text">{new Date(detailRow.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                     </div>

                     {/* Reason / Purpose */}
                     {(detailRow.cashout_reason || detailRow.purpose) && (
                        <div className="bg-re-bg rounded-2xl p-4 space-y-1">
                           <p className="text-[9px] font-black uppercase text-re-text-muted opacity-50 tracking-widest">{isCashout ? 'Reason' : 'Purpose'}</p>
                           <p className="text-sm font-semibold text-re-text leading-relaxed">{detailRow.cashout_reason || detailRow.purpose}</p>
                        </div>
                     )}

                     {/* Deduction / Repayment block */}
                     {isCashout ? (
                        <div className="bg-sky-50 rounded-2xl p-5 border border-sky-100 space-y-3">
                           <div className="flex items-center gap-2">
                              <Zap size={14} className="text-sky-600 shrink-0" />
                              <h4 className="text-xs font-black text-sky-900 uppercase tracking-tight">Single Payroll Deduction</h4>
                           </div>
                           <p className="text-[11px] font-semibold text-sky-800 leading-relaxed">
                              Deducted in full from your next payroll — no interest, no instalment schedule.
                           </p>
                           <div className="flex items-center justify-between pt-2 border-t border-sky-200">
                              <span className="text-[10px] font-black text-sky-700 uppercase">Full deduction</span>
                              <span className="text-sm font-black text-sky-900">{formatMoney(amt)}</span>
                           </div>
                        </div>
                     ) : (
                        <div className="bg-re-bg rounded-2xl p-5 border border-black/5 space-y-4">
                           <div className="flex justify-between items-center">
                              <h4 className="text-xs font-black text-re-text uppercase">Repayment</h4>
                              <span className="text-[10px] font-semibold text-re-text-muted">3.00% / mo · {months} mo</span>
                           </div>
                           <div className="space-y-3 pt-1 border-t border-black/5">
                              {[
                                 { label: 'Principal', val: formatMoney(amt) },
                                 { label: 'Est. interest', val: formatMoney(interest) },
                                 { label: 'Total to repay', val: formatMoney(amt + interest) },
                                 { label: 'Monthly instalment', val: formatMoney((amt + interest) / months), highlight: true },
                              ].map(({ label, val, highlight }) => (
                                 <div key={label} className="flex items-center justify-between gap-3">
                                    <span className={`text-xs font-semibold ${highlight ? 'text-re-orange' : 'text-re-text-muted'}`}>{label}</span>
                                    <div className="flex-1 border-b border-dashed border-black/5" />
                                    <span className={`text-sm font-black ${highlight ? 'text-re-orange' : 'text-re-text'}`}>{val}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     {/* Finance / manager feedback */}
                     {detailRow.accountant_note && (
                        <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl">
                           <p className="text-[9px] font-black uppercase text-sky-800/50">Finance Note</p>
                           <p className="text-sm font-bold text-sky-900 mt-1">{detailRow.accountant_note}</p>
                        </div>
                     )}
                     {detailRow.manager_feedback && (
                        <div className={`p-4 rounded-2xl border ${detailRow.status === 'approved' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                           <p className={`text-[9px] font-black uppercase ${detailRow.status === 'approved' ? 'text-emerald-800/50' : 'text-red-800/50'}`}>Manager Feedback</p>
                           <p className={`text-sm font-bold mt-1 ${detailRow.status === 'approved' ? 'text-emerald-900' : 'text-red-900'}`}>{detailRow.manager_feedback}</p>
                        </div>
                     )}

                     {/* Actions */}
                     {isPending && (
                        <div className="flex gap-3 pt-1">
                           <button
                              onClick={() => { setDetailRow(null); openEdit(detailRow); }}
                              className="flex-1 py-3 rounded-xl border border-black/10 bg-white text-re-text font-black text-[10px] uppercase tracking-widest hover:bg-re-bg transition-colors flex items-center justify-center gap-1.5"
                           >
                              <Pencil size={12} /> Edit
                           </button>
                           <button
                              onClick={() => handleCancel(detailRow.id)}
                              className="flex-1 py-3 rounded-xl bg-red-50 text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
                           >
                              <Trash2 size={12} /> Cancel
                           </button>
                        </div>
                     )}
                  </div>
               );
            })()}
         </Modal>

         {/* Product Preview Modal */}
         <Modal open={!!dealPreview} onClose={() => setDealPreview(null)} title="Staff Deal Preview">
            {dealPreview && (
               <div className="space-y-4">
                  <div className="aspect-square rounded-3xl bg-re-bg border border-black/5 overflow-hidden flex items-center justify-center">
                     {dealPreview.image_url ? <img src={toAssetUrl(dealPreview.image_url)} className="w-full h-full object-cover" alt="" /> : <Package size={40} className="text-re-text-muted/20" />}
                  </div>
                  <div>
                     <h3 className="text-lg font-black text-re-text uppercase tracking-tight">{dealPreview.name}</h3>
                     <p className="text-xl font-black text-re-orange mt-1">{formatMoney(dealPreview.price_rwf)}</p>
                     <p className="text-sm font-medium text-re-text-muted mt-3 leading-relaxed">{dealPreview.description || 'No detailed description provided.'}</p>
                  </div>
               </div>
            )}
         </Modal>

      </div>
   );
}

function Modal({ open, onClose, title, children, wide }) {
   if (!open) return null;
   return createPortal(
      <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
         <div className={`bg-white rounded-[32px] shadow-2xl border border-black/5 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
            <div className="px-8 py-6 border-b border-black/5 flex items-center justify-between shrink-0">
               <h2 className="text-lg font-black text-re-text uppercase tracking-tight">{title}</h2>
               <button onClick={onClose} className="p-2 hover:bg-re-bg rounded-xl transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 overflow-y-auto">
               {children}
            </div>
         </div>
      </div>,
      document.body
   );
}

