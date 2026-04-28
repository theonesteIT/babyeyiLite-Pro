import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
   Wallet,
   Plus,
   Clock,
   CheckCircle,
   AlertCircle,
   Trash2,
   ArrowRight,
   TrendingUp,
   CreditCard,
   Users,
   Eye,
   Package,
   X
} from 'lucide-react';
import ShuleAvanceRepaymentCalculator from '../components/ShuleAvanceRepaymentCalculator';

const UPLOADS_BASE = (import.meta.env.VITE_UPLOADS_BASE || import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/$/, '');
const REQUEST_STATUS_META = {
   pending_accountant: { label: 'Pending for Accountant', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
   sent_to_manager: { label: 'Sent to Manager', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
   approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
   rejected_by_accountant: { label: 'Rejected by Accountant', cls: 'bg-red-50 text-red-700 border-red-200' },
   rejected_by_manager: { label: 'Rejected by Manager', cls: 'bg-red-50 text-red-700 border-red-200' },
};

function fmtMoney(v) {
   return `${Number(v || 0).toLocaleString()} RWF`;
}

function toAssetUrl(pathLike) {
   if (!pathLike || typeof pathLike !== 'string') return null;
   if (pathLike.startsWith('http://') || pathLike.startsWith('https://')) return pathLike;
   const clean = pathLike.replace(/\\/g, '/');
   return `${UPLOADS_BASE}${clean.startsWith('/') ? clean : `/${clean}`}`;
}

function normalizeList(value) {
   if (Array.isArray(value)) return value;
   if (typeof value !== 'string' || !value.trim()) return [];
   try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
   } catch {
      return [];
   }
}

const ShuleAvance = () => {
   const [loanStatus, setLoanStatus] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [showApply, setShowApply] = useState(false);

   const [catalog, setCatalog] = useState({ services: [], cashouts: [] });
   const [dealProducts, setDealProducts] = useState([]);
   const [allRequests, setAllRequests] = useState([]);
   const [requestFilter, setRequestFilter] = useState('all');
   const [selectedStatementId, setSelectedStatementId] = useState(null);
   const [statementModalOpen, setStatementModalOpen] = useState(false);
   const [requestType, setRequestType] = useState('cashout');
   const [serviceCategory, setServiceCategory] = useState('');
   const [selectedDealProductIds, setSelectedDealProductIds] = useState([]);
   const [dealPreview, setDealPreview] = useState(null);
   const [teacherDealsStep, setTeacherDealsStep] = useState('products');
   const [cashoutCategory, setCashoutCategory] = useState('');

   // Form State
   const [amount, setAmount] = useState('');
   const [purpose, setPurpose] = useState('');
   const [term, setTerm] = useState(6);
   const [submitting, setSubmitting] = useState(false);

   const activeServiceSlug = serviceCategory || catalog.services?.[0]?.slug || '';
   const isTeacherDealsMode = requestType === 'service' && activeServiceSlug === 'teacher_deals';

   const selectedRate = useMemo(() => {
      const slug = requestType === 'cashout'
         ? (cashoutCategory || catalog.cashouts?.[0]?.slug)
         : (serviceCategory || catalog.services?.[0]?.slug);
      const row = requestType === 'cashout'
         ? catalog.cashouts?.find((c) => c.slug === slug)
         : catalog.services?.find((s) => s.slug === slug);
      return row?.income_rate_percent ?? null;
   }, [catalog, cashoutCategory, requestType, serviceCategory]);

   const resolveRateForRow = (row) => {
      if (!row) return 0;
      if (String(row.request_type || '').toLowerCase() === 'cashout') {
         return Number(catalog.cashouts?.find((c) => c.slug === row.cashout_category_slug)?.income_rate_percent || 0);
      }
      return Number(catalog.services?.find((s) => s.slug === row.service_category)?.income_rate_percent || 0);
   };

   const estimatedMonthly = (principal, months, ratePercent) => {
      const p = Number(principal || 0);
      const m = Math.max(1, Number(months || 1));
      const r = Number(ratePercent || 0) / 100;
      const total = p + (p * r * m);
      return total / m;
   };

   const visibleRequests = useMemo(() => {
      return allRequests.filter((r) => {
         if (requestFilter === 'all') return true;
         if (requestFilter === 'rejected') {
            return r.status === 'rejected_by_accountant' || r.status === 'rejected_by_manager';
         }
         return r.status === requestFilter;
      });
   }, [allRequests, requestFilter]);

   const selectedStatement = useMemo(() => {
      const history = Array.isArray(loanStatus?.history) ? loanStatus.history : [];
      if (!history.length) return null;
      const activeId = selectedStatementId ?? history[0]?.id ?? null;
      const historyRow = history.find((x) => Number(x.id) === Number(activeId)) || history[0];
      if (!historyRow) return null;
      const full = allRequests.find((x) => Number(x.id) === Number(historyRow.id));
      return full ? { ...historyRow, ...full } : historyRow;
   }, [allRequests, loanStatus, selectedStatementId]);

   const selectedDealProducts = useMemo(() => (
      dealProducts.filter((p) => selectedDealProductIds.includes(Number(p.id)))
   ), [dealProducts, selectedDealProductIds]);

   const teacherDealsTotal = useMemo(
      () => selectedDealProducts.reduce((sum, p) => sum + Number(p.price_rwf || 0), 0),
      [selectedDealProducts]
   );

   const principalAmount = useMemo(() => {
      if (isTeacherDealsMode) return Number(teacherDealsTotal || 0);
      return Number(String(amount).replace(/[^\d.]/g, ''));
   }, [amount, isTeacherDealsMode, teacherDealsTotal]);

   useEffect(() => {
      if (isTeacherDealsMode) {
         setTeacherDealsStep('products');
      }
   }, [isTeacherDealsMode]);

   useEffect(() => {
      if (!loanStatus?.history?.length) {
         setSelectedStatementId(null);
      }
   }, [loanStatus]);

   const fetchLoanStatus = async () => {
      try {
         const res = await api.get('/services/shule-avance/status');
         if (res.data.success) {
            setLoanStatus(res.data);
         }
      } catch (err) {
         setError('Could not load loan information.');
      }
   };

   const fetchAllRequests = async () => {
      try {
         const res = await api.get('/services/shule-avance/applicant/my-requests');
         if (res.data?.success) {
            setAllRequests(Array.isArray(res.data.data) ? res.data.data : []);
         } else {
            setAllRequests([]);
         }
      } catch {
         setAllRequests([]);
      }
   };

   const loadCatalog = async () => {
      try {
         const res = await api.get('/services/shule-avance/catalog');
         if (res.data?.success && res.data.data) {
            const cashouts = Array.isArray(res.data.data.cashouts) ? res.data.data.cashouts : [];
            setCatalog({
               services: Array.isArray(res.data.data.services) ? res.data.data.services : [],
               cashouts,
            });
            setCashoutCategory((prev) => prev || (cashouts[0]?.slug ?? ''));
            setServiceCategory((prev) => prev || (res.data.data.services?.[0]?.slug ?? ''));
         }
      } catch {
         /* optional */
      }
   };

   const loadTeacherDealProducts = async () => {
      try {
         const res = await api.get('/services/shule-avance/teacher-deal-products');
         if (res.data?.success) {
            const list = Array.isArray(res.data.data) ? res.data.data : [];
            setDealProducts(list);
         }
      } catch {
         /* optional */
      }
   };

   useEffect(() => {
      (async () => {
         setLoading(true);
         try {
            await Promise.all([fetchLoanStatus(), fetchAllRequests(), loadCatalog(), loadTeacherDealProducts()]);
         } finally {
            setLoading(false);
         }
      })();
   }, []);

   const handleApply = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      setError(null);
      try {
         let payload = null;
         if (requestType === 'cashout') {
            const slug = cashoutCategory || catalog.cashouts?.[0]?.slug;
            if (!slug) {
               setError('Cashout programs are not configured yet.');
               setSubmitting(false);
               return;
            }
            payload = {
               request_type: 'cashout',
               cashout_category: slug,
               reason: purpose,
               amount_requested: principalAmount,
               repayment_term_months: Math.min(12, Math.max(1, Number(term))),
            };
         } else {
            const serviceSlug = serviceCategory || catalog.services?.[0]?.slug;
            if (!serviceSlug) {
               setError('Service categories are not configured yet.');
               setSubmitting(false);
               return;
            }
            if (serviceSlug === 'teacher_deals' && selectedDealProductIds.length === 0) {
               setError('Select at least one Teacher Deal product.');
               setSubmitting(false);
               return;
            }
            payload = {
               request_type: 'service',
               service_category: serviceSlug,
               description: purpose,
               amount_requested: principalAmount,
               repayment_term_months: Math.min(12, Math.max(1, Number(term))),
               selected_deal_product_ids: serviceSlug === 'teacher_deals' ? selectedDealProductIds : undefined,
            };
         }
         if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
            setError('Enter a valid amount greater than zero.');
            setSubmitting(false);
            return;
         }
         const res = await api.post('/services/shule-avance/applicant/requests', payload);
         if (res.data.success) {
            setShowApply(false);
            setSelectedDealProductIds([]);
            setTeacherDealsStep('products');
            await Promise.all([fetchLoanStatus(), fetchAllRequests()]);
         }
      } catch (err) {
         setError(err.response?.data?.message || 'Application failed.');
      } finally {
         setSubmitting(false);
      }
   };

   const handleCancel = async (id) => {
      if (!window.confirm('Are you sure you want to cancel this application?')) return;
      try {
         const res = await api.delete(`/services/shule-avance/cancel/${id}`);
         if (res.data.success) {
            Promise.all([fetchLoanStatus(), fetchAllRequests()]);
         }
      } catch (err) {
         alert('Could not cancel application.');
      }
   };

   if (loading) return (
      <div className="flex h-screen items-center justify-center">
         <div className="w-10 h-10 border-4 border-re-orange/20 border-t-re-orange rounded-full animate-spin"></div>
      </div>
   );

   return (
      <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">
         {/* ── High-Fidelity Hero Section ── */}
         <div className="relative w-full min-h-[280px] overflow-hidden">
            <div className="absolute inset-0 bg-orange-950/70 z-10 backdrop-blur-[2px]"></div>
            <img src="/teacher.jpg" alt="Hero" className="absolute inset-0 w-full h-full object-cover scale-105" />

            <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24">
               <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                     <span className="w-6 h-1 bg-re-orange rounded-full"></span>
                     <p className="text-[10px] font-black text-re-orange uppercase tracking-[0.3em]">Financial Portal</p>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-2 mt-2">Shule<span className="text-re-orange">Avance</span></h1>
               </div>
            </div>
         </div>

         {/* ── Main Content Grid ── */}
         <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-24 relative z-20 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

               {/* ── Left Column (Financial Dashboard) ── */}
               <div className="lg:col-span-2 space-y-8">

                  {/* Main Financial State Card */}
                  <div className="bg-white rounded-[32px] shadow-2xl border border-black/5 p-6 md:p-8 relative overflow-hidden flex flex-col justify-between">
                     {showApply ? (
                        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                           <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                 <h3 className="text-lg font-black text-re-text tracking-tight uppercase">Credit Application</h3>
                                 <p className="text-[9px] text-re-text-muted font-bold uppercase tracking-widest opacity-40">
                                    {isTeacherDealsMode
                                       ? (teacherDealsStep === 'products' ? 'Step 1: Products' : 'Step 2: Repayment')
                                       : 'Step 1 of 2: Basic Details'}
                                 </p>
                              </div>
                              <button onClick={() => setShowApply(false)} className="text-[9px] font-black text-re-text-muted hover:text-re-orange transition-colors uppercase tracking-widest">Cancel Application</button>
                           </div>
                           {isTeacherDealsMode ? (
                              <div className="flex items-center gap-2">
                                 <span
                                    className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                                       teacherDealsStep === 'products'
                                          ? 'bg-re-orange text-white border-re-orange'
                                          : 'bg-white text-slate-500 border-slate-200'
                                    }`}
                                 >
                                    Step 1: Products
                                 </span>
                                 <span
                                    className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                                       teacherDealsStep === 'financing'
                                          ? 'bg-re-orange text-white border-re-orange'
                                          : 'bg-white text-slate-500 border-slate-200'
                                    }`}
                                 >
                                    Step 2: Repayment
                                 </span>
                              </div>
                           ) : null}

                           <form onSubmit={handleApply} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div className="space-y-1.5 md:col-span-2">
                                 <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">Request Type</label>
                                 <div className="grid grid-cols-2 gap-2">
                                    <button
                                       type="button"
                                       onClick={() => setRequestType('cashout')}
                                       className={`h-11 rounded-lg border text-[10px] font-black uppercase tracking-widest ${
                                          requestType === 'cashout'
                                             ? 'bg-re-orange text-white border-re-orange'
                                             : 'bg-re-bg text-re-text border-transparent'
                                       }`}
                                    >
                                       Cashout
                                    </button>
                                    <button
                                       type="button"
                                       onClick={() => {
                                          setRequestType('service');
                                          if ((serviceCategory || catalog.services?.[0]?.slug) === 'teacher_deals') {
                                             setTeacherDealsStep('products');
                                          }
                                       }}
                                       className={`h-11 rounded-lg border text-[10px] font-black uppercase tracking-widest ${
                                          requestType === 'service'
                                             ? 'bg-re-orange text-white border-re-orange'
                                             : 'bg-re-bg text-re-text border-transparent'
                                       }`}
                                    >
                                       Service
                                    </button>
                                 </div>
                              </div>
                              <div className="space-y-1.5 md:col-span-2">
                                 {requestType === 'cashout' ? (
                                    <>
                                       <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">Cashout program</label>
                                       <select
                                          className="w-full h-11 bg-re-bg rounded-lg px-4 font-bold outline-none border border-transparent focus:border-re-orange/20 focus:bg-white transition-all text-xs appearance-none"
                                          value={cashoutCategory}
                                          onChange={(e) => setCashoutCategory(e.target.value)}
                                       >
                                          {(catalog.cashouts || []).map((c) => (
                                             <option key={c.slug} value={c.slug}>{c.label}</option>
                                          ))}
                                       </select>
                                    </>
                                 ) : (
                                    <>
                                       <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">Service category</label>
                                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {(catalog.services || []).map((s) => {
                                             const isActive = (serviceCategory || catalog.services?.[0]?.slug) === s.slug;
                                             return (
                                                <button
                                                   key={s.slug}
                                                   type="button"
                                                   onClick={() => {
                                                      setServiceCategory(s.slug);
                                                      if (s.slug === 'teacher_deals') {
                                                         setTeacherDealsStep('products');
                                                      } else {
                                                         setSelectedDealProductIds([]);
                                                      }
                                                   }}
                                                   className={`rounded-xl border p-3 text-left transition-all ${
                                                      isActive ? 'border-re-orange bg-orange-50/50' : 'border-black/10 bg-white hover:border-black/20'
                                                   }`}
                                                >
                                                   <p className="text-[11px] font-black text-re-text uppercase tracking-wide">{s.label}</p>
                                                   <p className="text-[10px] font-bold text-re-orange mt-0.5">
                                                      {Number(s.income_rate_percent || 0).toFixed(2)}% / month
                                                   </p>
                                                   {s.description ? (
                                                      <p className="text-[10px] font-semibold text-slate-500 mt-1 line-clamp-2">{s.description}</p>
                                                   ) : null}
                                                </button>
                                             );
                                          })}
                                       </div>
                                    </>
                                 )}
                              </div>
                              {isTeacherDealsMode && teacherDealsStep === 'products' ? (
                                 <div className="space-y-2 md:col-span-2">
                                    <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">
                                       Teacher Deal products (select one or more)
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                                       {dealProducts.map((p) => {
                                          const isChecked = selectedDealProductIds.includes(Number(p.id));
                                          return (
                                             <div
                                                key={p.id}
                                                onClick={() => {
                                                   const id = Number(p.id);
                                                   setSelectedDealProductIds((prev) => (
                                                      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                                                   ));
                                                }}
                                                onKeyDown={(ev) => {
                                                   if (ev.key === 'Enter' || ev.key === ' ') {
                                                      ev.preventDefault();
                                                      const id = Number(p.id);
                                                      setSelectedDealProductIds((prev) => (
                                                         prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                                                      ));
                                                   }
                                                }}
                                                role="button"
                                                tabIndex={0}
                                                className={`rounded-xl border p-3 flex gap-3 items-start cursor-pointer transition-all text-left ${
                                                   isChecked ? 'border-re-orange bg-orange-50/40 shadow-sm' : 'border-black/10 bg-white'
                                                }`}
                                             >
                                                <div className="relative w-16 h-16 rounded-lg border border-black/10 bg-re-bg overflow-hidden shrink-0 flex items-center justify-center">
                                                   {p.image_url ? (
                                                      <img src={toAssetUrl(p.image_url)} alt={p.name} className="w-full h-full object-cover" />
                                                   ) : (
                                                      <Package size={14} className="text-slate-400" />
                                                   )}
                                                   <button
                                                      type="button"
                                                      onClick={(ev) => {
                                                         ev.stopPropagation();
                                                         setDealPreview(p);
                                                      }}
                                                      className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/60 text-white inline-flex items-center justify-center hover:bg-black/75"
                                                   >
                                                      <Eye size={12} />
                                                   </button>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                   <p className="text-[11px] font-black text-re-text truncate">{p.name}</p>
                                                   <p className="text-[10px] font-bold text-re-orange">{fmtMoney(p.price_rwf)}</p>
                                                   <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                                      {isChecked ? 'Selected' : 'Tap to select'}
                                                   </p>
                                                </div>
                                             </div>
                                          );
                                       })}
                                       {!dealProducts.length ? (
                                          <div className="col-span-full rounded-lg border border-dashed border-black/10 p-3 text-[10px] font-bold text-slate-500">
                                             No Teacher Deal products available yet.
                                          </div>
                                       ) : null}
                                    </div>
                                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 flex flex-wrap items-center justify-between gap-3">
                                       <div>
                                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                                             Selected: {selectedDealProductIds.length} product(s)
                                          </p>
                                          <p className="text-sm font-black text-re-text mt-0.5">
                                             Total products: {fmtMoney(teacherDealsTotal)}
                                          </p>
                                       </div>
                                       <button
                                          type="button"
                                          disabled={!selectedDealProductIds.length}
                                          onClick={() => setTeacherDealsStep('financing')}
                                          className="bg-re-grad-orange text-white px-5 py-2.5 rounded-lg font-black shadow-re-glow hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50"
                                       >
                                          Continue to repayment
                                       </button>
                                    </div>
                                 </div>
                              ) : null}
                              {(!isTeacherDealsMode || teacherDealsStep === 'financing') ? (
                                 <>
                                    <div className="space-y-1.5">
                                       <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">
                                          {isTeacherDealsMode ? 'Products Total (RWF)' : 'Desired Amount (RWF)'}
                                       </label>
                                       <input
                                          type="number"
                                          className="w-full h-11 bg-re-bg rounded-lg px-4 font-bold outline-none border border-transparent focus:border-re-orange/20 focus:bg-white transition-all text-xs"
                                          placeholder="Ex: 500,000"
                                          value={isTeacherDealsMode ? teacherDealsTotal : amount}
                                          onChange={(e) => setAmount(e.target.value)}
                                          readOnly={isTeacherDealsMode}
                                          required
                                       />
                                    </div>
                                    <div className="space-y-1.5">
                                       <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">Repayment Period</label>
                                       <select
                                          className="w-full h-11 bg-re-bg rounded-lg px-4 font-bold outline-none border border-transparent focus:border-re-orange/20 focus:bg-white transition-all text-xs appearance-none"
                                          value={term}
                                          onChange={(e) => setTerm(Number(e.target.value))}
                                       >
                                          {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                                             <option key={m} value={m}>{m} months</option>
                                          ))}
                                       </select>
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                       <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">Purpose of Credit</label>
                                       <textarea
                                          className="w-full h-20 bg-re-bg rounded-lg p-4 font-bold outline-none border border-transparent focus:border-re-orange/20 focus:bg-white transition-all text-xs resize-none"
                                          placeholder="Ex: Improving housing, tuition fees..."
                                          value={purpose}
                                          onChange={(e) => setPurpose(e.target.value)}
                                          required
                                       ></textarea>
                                    </div>
                                    {isTeacherDealsMode ? (
                                       <div className="md:col-span-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50/50 p-3">
                                          <p className="text-[10px] font-black uppercase tracking-widest text-fuchsia-700">
                                             Teacher Deals rate
                                          </p>
                                          <p className="text-sm font-black text-re-text mt-1">
                                             {Number(selectedRate || 0).toFixed(2)}% / month applied on selected products total.
                                          </p>
                                          <button
                                             type="button"
                                             onClick={() => setTeacherDealsStep('products')}
                                             className="mt-2 text-[10px] font-black uppercase tracking-widest text-fuchsia-700 hover:text-fuchsia-800"
                                          >
                                             Back to product selection
                                          </button>
                                       </div>
                                    ) : null}
                                    <div className="md:col-span-2">
                                       <ShuleAvanceRepaymentCalculator
                                          principal={principalAmount}
                                          monthlyRatePercent={selectedRate}
                                          months={term}
                                          title="Repayment estimate"
                                       />
                                    </div>
                                    <div className="md:col-span-2 flex justify-between items-center bg-re-bg/50 p-4 rounded-lg border border-dashed border-gray-200">
                                       <p className="text-[9px] text-re-text-muted font-bold italic max-w-[55%] leading-snug">
                                          Uses platform monthly rate for the selected program. Not a binding offer.
                                       </p>
                                       <button
                                          type="submit"
                                          disabled={submitting}
                                          className="bg-re-grad-orange text-white px-6 py-2.5 rounded-lg font-black shadow-re-glow hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50"
                                       >
                                          {submitting ? 'Submitting...' : 'Submit Request'}
                                       </button>
                                    </div>
                                 </>
                              ) : null}
                           </form>
                        </div>
                     ) : (
                        <>
                           {loanStatus?.has_active_application ? (
                              <div className="space-y-8 w-full animate-in zoom-in-95 duration-500">
                                 {/* Progress Stepper */}
                                 <div className="flex items-center justify-between max-w-md mx-auto relative px-4 pt-2">
                                    {['pending', 'reviewed', 'disbursed'].map((step, idx) => {
                                       const currentStatus = loanStatus.active_loan.status;
                                       const isPast = idx === 0 || (idx === 1 && currentStatus !== 'pending');
                                       const isCurrent = (idx === 0 && currentStatus === 'pending') || (idx === 1 && currentStatus === 'reviewed') || (idx === 2 && currentStatus === 'disbursed');

                                       return (
                                          <div key={step} className="flex flex-col items-center gap-1.5 relative z-10 group">
                                             <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all border-4 
                                         ${isPast || isCurrent ? 'bg-re-orange border-re-orange/20 text-white shadow-re-glow' : 'bg-white border-re-bg text-re-text-muted/40 shadow-inner'}`}>
                                                {isPast && !isCurrent ? <CheckCircle size={12} /> : <span className="text-[9px] font-black">{idx + 1}</span>}
                                             </div>
                                             <span className={`text-[8px] font-black uppercase tracking-widest ${isCurrent ? 'text-re-orange' : 'text-gray-400 opacity-40'}`}>{step}</span>
                                          </div>
                                       );
                                    })}
                                    {/* Step Connector Line */}
                                    <div className="absolute top-[13.5px] left-8 right-8 h-0.5 bg-re-bg -z-0">
                                       <div className={`h-full bg-re-orange transition-all duration-1000`}
                                          style={{ width: loanStatus.active_loan.status === 'pending' ? '0%' : loanStatus.active_loan.status === 'reviewed' ? '50%' : '100%' }}></div>
                                    </div>
                                 </div>

                                 {/* Status Breakdown */}
                                 <div className="bg-re-bg/40 rounded-2xl p-5 border border-black/5 flex flex-col md:flex-row items-center justify-between gap-5">
                                    <div className="space-y-3 text-center md:text-left">
                                       <div>
                                          <p className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">Credit Value</p>
                                          <h4 className="text-2xl font-black text-re-text tracking-tighter mt-0.5">{Number(loanStatus.active_loan.amount_requested).toLocaleString()} <span className="text-xs opacity-30">RWF</span></h4>
                                       </div>
                                       <div className="flex items-center gap-4 justify-center md:justify-start">
                                          <div className="flex flex-col">
                                             <span className="text-[8px] font-black text-re-text-muted opacity-30 tracking-widest uppercase">Repayment</span>
                                             <span className="text-[10px] font-black text-re-text leading-tight">{loanStatus.active_loan.repayment_term_months} Mo</span>
                                          </div>
                                          <div className="w-px h-5 bg-gray-200"></div>
                                          <div className="flex flex-col">
                                             <span className="text-[8px] font-black text-re-text-muted opacity-30 tracking-widest uppercase">Lodged On</span>
                                             <span className="text-[10px] font-black text-re-text leading-tight uppercase font-mono">{new Date(loanStatus.active_loan.created_at).toLocaleDateString()}</span>
                                          </div>
                                       </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5 w-full md:w-auto">
                                       <button className="px-6 py-2.5 bg-white border border-black/5 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-re-bg transition-all">Download Contract</button>
                                       {loanStatus.active_loan.status === 'pending' && (
                                          <button onClick={() => handleCancel(loanStatus.active_loan.id)} className="px-6 py-2.5 bg-red-50 text-red-500 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-red-100 transition-all">Revoke Request</button>
                                       )}
                                    </div>
                                 </div>
                              </div>
                           ) : (
                              <div className="flex flex-col md:flex-row items-center justify-between gap-8 py-2">
                                 <div className="space-y-4 max-w-sm">
                                    <div className="space-y-2">
                                       <div className="flex items-center gap-2">
                                          <span className="w-4 h-1 bg-re-orange rounded-full"></span>
                                          <p className="text-[9px] font-black text-re-orange uppercase tracking-[0.2em]">Available Credit</p>
                                       </div>
                                       <h4 className="text-2xl font-black text-re-text tracking-tight uppercase leading-tight">Empowering Your Academic Ambitions</h4>
                                       <p className="text-[11px] text-re-text-muted font-bold opacity-70 leading-relaxed uppercase tracking-widest">
                                          Unlock bridge financing for your personal goals. Quick approval (48hrs) for verified educators.
                                       </p>
                                    </div>
                                    <button
                                       onClick={() => setShowApply(true)}
                                       className="bg-re-grad-orange text-white px-8 py-3.5 rounded-xl font-black shadow-re-glow hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-widest inline-flex items-center gap-3"
                                    >
                                       Start application <ArrowRight size={14} />
                                    </button>
                                 </div>

                                 {/* Credit Limit Illustration */}
                                 <div className="relative group perspective-1000 hidden md:block">
                                    <div className="w-48 h-32 bg-re-grad-purple shadow-re-premium-purple rounded-[24px] p-5 text-white transform transition-all duration-700 hover:rotate-y-12">
                                       <div className="flex justify-between items-start">
                                          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-md">
                                             <Wallet size={16} />
                                          </div>
                                          <p className="text-[7px] font-black uppercase tracking-[0.2em] opacity-50">Tier: Platinum</p>
                                       </div>
                                       <div className="mt-6 space-y-0.5">
                                          <p className="text-[8px] font-black opacity-50 uppercase tracking-[0.1em]">Max Potential</p>
                                          <p className="text-base font-black tracking-tight">1,200,000 <span className="text-[9px] opacity-30">RWF</span></p>
                                       </div>
                                    </div>
                                    <div className="absolute -inset-1 bg-white/10 blur-xl rounded-full -z-10 animate-pulse"></div>
                                 </div>
                              </div>
                           )}
                        </>
                     )}
                  </div>

                  {/* Transaction History Section */}
                  <div className="space-y-4">
                     <div className="bg-white rounded-[24px] shadow-sm border border-black/5 overflow-hidden">
                        <div className="p-4 pb-1.5 flex items-center gap-2">
                           <span className="w-0.5 h-3 bg-re-purple rounded-full"></span>
                           <h3 className="text-[9px] font-black text-re-text uppercase tracking-widest opacity-40">Statement History</h3>
                        </div>
                        <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between bg-re-bg/30">
                           <span className="text-[8px] font-black text-re-text-muted tracking-widest uppercase opacity-30">Withdrawal Details</span>
                           <span className="text-[8px] font-black text-re-text-muted tracking-widest uppercase opacity-30">Sum / Status</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                           {loanStatus?.history?.length > 0 ? loanStatus.history.map((loan) => (
                              <div
                                 key={loan.id}
                                 onClick={() => {
                                    setSelectedStatementId(loan.id);
                                    setStatementModalOpen(true);
                                 }}
                                 className={`px-5 py-3.5 flex items-center justify-between group transition-all cursor-pointer ${
                                    Number(selectedStatementId) === Number(loan.id)
                                       ? 'bg-orange-50/60'
                                       : 'hover:bg-re-bg/30'
                                 }`}
                              >
                                 <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-re-bg flex items-center justify-center group-hover:bg-white transition-all shadow-inner border border-black/5">
                                       <CreditCard size={14} className="text-re-orange/40" />
                                    </div>
                                    <div>
                                       <p className="text-xs font-black text-re-text tracking-tight uppercase">Credit #{loan.id}</p>
                                       <p className="text-[8px] text-re-text-muted font-black uppercase tracking-[0.1em] mt-0.5 opacity-40 font-mono italic">{new Date(loan.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</p>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-xs font-black text-re-text tracking-tight">{Number(loan.amount_requested).toLocaleString()} <span className="text-[8px] opacity-30 uppercase">RWF</span></p>
                                    <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                       REQUEST_STATUS_META[loan.status]
                                          ? REQUEST_STATUS_META[loan.status].cls
                                          : (loan.status === 'completed'
                                             ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                             : 'bg-amber-50 text-amber-600 border border-amber-100')
                                    }`}>
                                       {loan.status}
                                    </span>
                                 </div>
                              </div>
                           )) : (
                              <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                                 <div className="relative w-32 h-32 opacity-20 group-hover:opacity-30 transition-opacity">
                                    <img
                                       src="/undraw_no-data_ig65 (1).svg"
                                       alt="EmptyState"
                                       className="w-full h-full object-contain grayscale"
                                    />
                                 </div>
                                 <p className="text-[8px] font-black text-re-text-muted opacity-30 uppercase tracking-[0.4em]">Zero trace of activity</p>
                              </div>
                           )}
                        </div>
                        {loanStatus?.history?.length > 0 && (
                           <div className="p-3 bg-re-bg/20 text-center border-t border-black/5">
                              <button className="text-[8px] font-black text-re-orange uppercase tracking-widest hover:underline opacity-60">Fetch Archive Records</button>
                           </div>
                        )}
                     </div>
                  </div>

               </div>

               {/* ── Right Column (Sidebar) ── */}
               <div className="space-y-4 lg:sticky lg:top-20 h-fit">

                  <div className="bg-white rounded-[24px] shadow-sm border border-black/5 p-5 pt-4 space-y-4">
                     <div className="flex items-center gap-2 mb-1">
                        <span className="w-0.5 h-3 bg-blue-500 rounded-full"></span>
                        <h3 className="text-[9px] font-black text-re-text uppercase tracking-widest opacity-40">Directives & Thresholds</h3>
                     </div>

                     <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/20 border border-blue-100/50">
                        <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-blue-500 shrink-0">
                           <TrendingUp size={16} />
                        </div>
                        <div>
                           <h4 className="text-[10px] font-black text-re-text uppercase tracking-tight">Credit ceiling</h4>
                           <p className="text-[9px] text-re-text-muted font-bold pt-0.5 opacity-60 inline-block">Capped at 70% of Net Salary.</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/20 border border-amber-100/50">
                        <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-amber-500 shrink-0">
                           <Clock size={16} />
                        </div>
                        <div>
                           <h4 className="text-[10px] font-black text-re-text uppercase tracking-tight">Fast Decision</h4>
                           <p className="text-[9px] text-re-text-muted font-bold pt-0.5 opacity-60 inline-block">Processing timeframe: 24–48hrs.</p>
                        </div>
                     </div>
                  </div>

                  {/* Quick Support Card (Optimized Height) */}
                  <div className="relative rounded-[24px] p-5 text-white shadow-re-premium-purple overflow-hidden group cursor-pointer active:scale-95 transition-all bg-re-grad-purple min-h-[140px] flex flex-col justify-center">

                     {/* Texture Overlay */}
                     <div className="absolute inset-0 opacity-10 mix-blend-overlay">
                        <img src="/teacher.jpg" alt="" className="w-full h-full object-cover grayscale" />
                     </div>

                     <div className="relative z-10 flex flex-col gap-3">
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-md shadow-inner">
                           <Users size={16} className="text-white" />
                        </div>
                        <div>
                           <h4 className="font-black text-[10px] tracking-widest uppercase leading-none opacity-90">Emergency Priority?</h4>
                           <p className="text-[9px] text-white font-bold leading-snug mt-1.5 opacity-70">
                              For urgent medical or family needs, please contact our support desk for priority processing.
                           </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest group-hover:gap-2.5 transition-all outline outline-white/20 px-3 py-1.5 rounded-lg w-fit mt-0.5">
                           Connect to Agent <ArrowRight size={10} />
                        </div>
                     </div>

                     {/* Premium Glows */}
                     <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                  </div>
               </div>
            </div>
         </div>
         {dealPreview ? (
            <div className="fixed inset-0 z-[260] p-4 flex items-center justify-center">
               <div className="absolute inset-0 bg-black/45" onClick={() => setDealPreview(null)} />
               <div className="relative w-full max-w-md bg-white rounded-2xl border border-black/10 shadow-2xl overflow-hidden">
                  <div className="h-56 bg-re-bg border-b border-black/5 overflow-hidden flex items-center justify-center">
                     {dealPreview.image_url ? (
                        <img src={toAssetUrl(dealPreview.image_url)} alt={dealPreview.name} className="w-full h-full object-cover" />
                     ) : (
                        <Package size={22} className="text-slate-400" />
                     )}
                  </div>
                  <div className="p-4">
                     <p className="text-lg font-black text-re-text">{dealPreview.name}</p>
                     <p className="text-sm font-black text-re-orange mt-1">{fmtMoney(dealPreview.price_rwf)}</p>
                     <p className="text-sm text-slate-600 mt-2">{dealPreview.description || 'No description.'}</p>
                  </div>
               </div>
            </div>
         ) : null}
         {statementModalOpen && selectedStatement ? (
            <div className="fixed inset-0 z-[270] p-4 flex items-center justify-center">
               <button
                  type="button"
                  aria-label="Close statement details"
                  className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
                  onClick={() => setStatementModalOpen(false)}
               />
               {(() => {
                  const rate = resolveRateForRow(selectedStatement);
                  const months = Math.max(1, Number(selectedStatement.repayment_term_months || selectedStatement.term || 1));
                  const monthly = estimatedMonthly(selectedStatement.amount_requested || selectedStatement.amount_rwf, months, rate);
                  const total = monthly * months;
                  const statusCfg = REQUEST_STATUS_META[selectedStatement.status] || { label: selectedStatement.status, cls: 'bg-slate-50 text-slate-700 border-slate-200' };
                  const dealNames = normalizeList(selectedStatement.details_json?.selected_deal_products).map((p) => p?.name).filter(Boolean).join(', ');
                  return (
                     <div className="relative w-full max-w-2xl bg-white rounded-[28px] border border-black/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 bg-gradient-to-r from-[#fff6ea] to-white">
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-re-text-muted opacity-60">Statement Details</p>
                              <h3 className="text-lg font-black text-re-text">Credit #{selectedStatement.id}</h3>
                           </div>
                           <button
                              type="button"
                              onClick={() => setStatementModalOpen(false)}
                              className="h-9 w-9 rounded-xl border border-black/10 bg-white inline-flex items-center justify-center hover:bg-re-bg/60 transition-colors"
                              aria-label="Close statement modal"
                           >
                              <X size={16} />
                           </button>
                        </div>
                        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div className="rounded-xl border border-black/10 bg-re-bg/40 p-3">
                                 <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted opacity-50">Amount</p>
                                 <p className="text-[11px] font-black text-re-text">{fmtMoney(selectedStatement.amount_requested || selectedStatement.amount_rwf)}</p>
                              </div>
                              <div className="rounded-xl border border-black/10 bg-re-bg/40 p-3">
                                 <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted opacity-50">Income Rate</p>
                                 <p className="text-[11px] font-black text-re-text">{Number(rate || 0).toFixed(2)}% / month</p>
                              </div>
                              <div className="rounded-xl border border-black/10 bg-re-bg/40 p-3">
                                 <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted opacity-50">Months Selected</p>
                                 <p className="text-[11px] font-black text-re-text">{months} months</p>
                              </div>
                              <div className="rounded-xl border border-black/10 bg-re-bg/40 p-3">
                                 <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted opacity-50">Expected Monthly</p>
                                 <p className="text-[11px] font-black text-re-text">{fmtMoney(monthly)}</p>
                              </div>
                           </div>
                           <div className="rounded-xl border border-black/10 bg-white p-3 flex items-center justify-between">
                              <div>
                                 <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted opacity-50">Expected Total To Pay</p>
                                 <p className="text-sm font-black text-re-text mt-0.5">{fmtMoney(total)}</p>
                              </div>
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-widest ${statusCfg.cls}`}>
                                 {statusCfg.label}
                              </span>
                           </div>
                           <div className="rounded-xl border border-black/10 bg-white p-3">
                              <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted opacity-50">Submitted On</p>
                              <p className="text-[11px] font-black text-re-text mt-1">
                                 {new Date(selectedStatement.created_at || selectedStatement.submitted_at).toLocaleString()}
                              </p>
                           </div>
                           {dealNames ? (
                              <div className="rounded-xl border border-black/10 bg-white p-3">
                                 <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted opacity-50">Teacher Deals</p>
                                 <p className="text-[11px] font-black text-re-text mt-1">{dealNames}</p>
                              </div>
                           ) : null}
                           <div className="flex justify-end">
                              <button
                                 type="button"
                                 onClick={() => setStatementModalOpen(false)}
                                 className="rounded-xl border border-black/10 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-re-bg/60"
                              >
                                 Cancel
                              </button>
                           </div>
                        </div>
                     </div>
                  );
               })()}
            </div>
         ) : null}
      </div>
   );
};

export default ShuleAvance;
