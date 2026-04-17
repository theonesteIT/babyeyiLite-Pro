import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import {
   Wallet,
   Plus,
   Clock,
   CheckCircle,
   CheckCircle2,
   ArrowRight,
   TrendingUp,
   Users,
   Zap,
   Droplet,
   ShoppingCart,
   GraduationCap,
   Home,
   Wifi,
   Stethoscope,
   ReceiptText,
   Upload,
   Trash2,
   X,
   ChevronRight,
   ChevronDown,
   AlertTriangle,
   Loader2,
   User,
   Eye,
   EyeOff
} from 'lucide-react';

const BILL_OPTIONS = [
   { key: 'electricity', label: 'Electricity', Icon: Zap, mode: 'direct' },
   { key: 'water', label: 'Water', Icon: Droplet, mode: 'direct' },
   { key: 'groceries', label: 'Groceries', Icon: ShoppingCart, mode: 'direct' },
   { key: 'school_fees', label: 'School Fees', Icon: GraduationCap, mode: 'direct' },
   { key: 'rent', label: 'Rent', Icon: Home, mode: 'direct' },
   { key: 'internet', label: 'Internet', Icon: Wifi, mode: 'direct' },
   { key: 'medical', label: 'Medical', Icon: Stethoscope, mode: 'direct' },
   { key: 'invoice', label: 'Upload Invoice', Icon: ReceiptText, mode: 'invoice' },
];

const INVOICE_STEPS = [
   { id: 1, label: 'Document', icon: Upload },
   { id: 2, label: 'Breakdown', icon: Plus },
   { id: 3, label: 'Terms', icon: Clock },
];

const DIRECT_STEPS = [
   { id: 1, label: 'Details', icon: Wallet },
   { id: 2, label: 'Repayment', icon: Clock },
];

const ShuleAvance = () => {
   const [loanStatus, setLoanStatus] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [showApplyInline] = useState(false);
   const [showApplyModal, setShowApplyModal] = useState(false);
   const [applyMode, setApplyMode] = useState('direct'); // 'direct' | 'invoice'
   const [selectedBillKey, setSelectedBillKey] = useState(null);

   // Form State
   const [amount, setAmount] = useState('');
   const [purpose, setPurpose] = useState('');
   const [term, setTerm] = useState(1);
   const [submitting, setSubmitting] = useState(false);

   // Invoice Wizard (2 steps)
   const [wizardStep, setWizardStep] = useState(1);
   const [invoiceVendor, setInvoiceVendor] = useState('');
   const [invoiceFile, setInvoiceFile] = useState(null);
   const [invoiceItems, setInvoiceItems] = useState([{ id: 1, name: '', qty: 1, unit: '' }]);
   const [showBalances, setShowBalances] = useState(false);

   const fetchLoanStatus = async () => {
      try {
         const res = await api.get('/services/shule-avance/status');
         if (res.data.success) {
            setLoanStatus(res.data);
         }
      } catch {
         setError('Could not load loan information.');
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchLoanStatus();
   }, []);

   const submitApplication = async ({ amountRequested, purposeText, termMonths }) => {
      setSubmitting(true);
      try {
         const res = await api.post('/services/shule-avance/apply', {
            amount_requested: amountRequested,
            purpose: purposeText,
            repayment_term_months: termMonths
         });
         if (res.data.success) {
            setShowApplyModal(false);
            setApplyMode('direct');
            setSelectedBillKey(null);
            setWizardStep(1);
            setInvoiceVendor('');
            setInvoiceFile(null);
            setInvoiceItems([{ id: 1, name: '', qty: 1, unit: '' }]);
            fetchLoanStatus();
         }
      } catch (err) {
         setError(err.response?.data?.message || 'Application failed.');
      } finally {
         setSubmitting(false);
      }
   };

   const handleApply = async (e) => {
      e.preventDefault();
      setError(null);
      return submitApplication({ amountRequested: amount, purposeText: purpose, termMonths: term });
   };

   const handleCancel = async (id) => {
      if (!window.confirm('Are you sure you want to cancel this application?')) return;
      try {
         const res = await api.delete(`/services/shule-avance/cancel/${id}`);
         if (res.data.success) {
            fetchLoanStatus();
         }
      } catch {
         alert('Could not cancel application.');
      }
   };

   const selectedBill = BILL_OPTIONS.find((b) => b.key === selectedBillKey) || null;

   const invoiceTotal = invoiceItems.reduce((sum, it) => {
      const qty = Number(it.qty) || 0;
      const unit = Number(String(it.unit || '').replace(/[^\d.]/g, '')) || 0;
      return sum + qty * unit;
   }, 0);

   const renderBalanceCard = () => {
      const active = loanStatus?.active_loan || null;
      const activeAmount = Number(active?.amount_requested) || 0;
      const activeTerm = Number(active?.repayment_term_months) || 0;
      const history = Array.isArray(loanStatus?.history) ? loanStatus.history : [];
      const totalDisbursed = history.reduce((s, r) => s + (Number(r?.amount_requested) || 0), 0) || activeAmount;
      const estTotalPayroll = activeAmount;
      const estMonthly = activeTerm ? Math.round(estTotalPayroll / activeTerm) : 0;
      const nextPayroll = (() => {
         const d = new Date();
         d.setMonth(d.getMonth() + 1);
         return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
      })();

      return (
         <div className="relative rounded-[24px] overflow-hidden border border-white/10 bg-[linear-gradient(145deg,#0E1F35,#1B3354)] text-white p-5 shadow-[0_18px_45px_-22px_rgba(14,31,53,0.9)]">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-re-orange/20" />
            <div className="absolute -bottom-8 left-6 w-24 h-24 rounded-full bg-white/5" />

            <div className="flex justify-between items-start relative z-10 mb-1">
               <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Balance</p>
               <button 
                  type="button"
                  onClick={() => setShowBalances(!showBalances)}
                  className="p-1 transition-opacity opacity-40 hover:opacity-100"
                  title={showBalances ? "Hide balances" : "Show balances"}
               >
                  {showBalances ? <EyeOff size={14} /> : <Eye size={14} />}
               </button>
            </div>
            <p className="text-3xl font-black tracking-tight mt-1">
               {showBalances ? (estTotalPayroll || 0).toLocaleString() : 'XXX'} <span className="text-[13px] opacity-40 font-black">RWF</span>
            </p>

            <div className="mt-5 pt-4 border-t border-white/10 flex relative z-10">
               <div className="flex-1 pr-4 border-r border-white/10">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">Total Disbursements</p>
                  <p className="text-sm font-black tracking-tight mt-1">
                     {showBalances ? totalDisbursed.toLocaleString() : 'XXX'} <span className="text-[10px] opacity-35 font-black">RWF</span>
                  </p>
                  <p className="text-[9px] text-white/30 mt-1">Lifetime (est.)</p>
               </div>
               <div className="flex-1 pl-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">Monthly Payroll</p>
                  <p className="text-sm font-black tracking-tight mt-1 text-re-orange">
                     {showBalances ? (estMonthly ? estMonthly.toLocaleString() : '—') : 'XXX'} <span className="text-[10px] opacity-45 font-black text-white">RWF</span>
                  </p>
                  <p className="text-[9px] text-white/30 mt-1">{activeAmount ? `Next payroll: ${nextPayroll}` : 'No active facility'}</p>
                  <div className="h-[3px] bg-white/10 rounded mt-2 overflow-hidden">
                     <div className="h-full bg-re-orange rounded" style={{ width: activeTerm ? '40%' : '0%' }} />
                  </div>
               </div>
            </div>
         </div>
      );
   };

   const addInvoiceItem = () => {
      setInvoiceItems((prev) => {
         const nextId = prev.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
         return [...prev, { id: nextId, name: '', qty: 1, unit: '' }];
      });
   };

   const removeInvoiceItem = (id) => {
      setInvoiceItems((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.id !== id)));
   };

   const updateInvoiceItem = (id, patch) => {
      setInvoiceItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
   };

   const submitInvoiceWizard = async () => {
      setError(null);
      const vendor = String(invoiceVendor || '').trim();
      const validItems = invoiceItems
         .map((it) => ({
            name: String(it.name || '').trim(),
            qty: Number(it.qty) || 0,
            unit: Number(String(it.unit || '').replace(/[^\d.]/g, '')) || 0,
         }))
         .filter((it) => it.name && it.qty > 0 && it.unit > 0);

      if (!invoiceFile) return setError('Upload an invoice (PDF or image).');
      if (validItems.length === 0) return setError('Add at least one invoice item (name, qty, unit price).');

      const purposeText = [
         'Invoice payment',
         invoiceFile?.name ? `File: ${invoiceFile.name}` : null,
         validItems.slice(0, 5).map((it) => `${it.name} x${it.qty}`).join(', '),
      ].filter(Boolean).join(' · ');

      return submitApplication({
         amountRequested: String(Math.round(invoiceTotal || 0)),
         purposeText,
         termMonths: term,
      });
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
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,17,31,0.92),rgba(18,35,58,0.84),rgba(33,49,74,0.78))] z-10 backdrop-blur-[2px]"></div>
            <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_top_right,rgba(255,140,0,0.20),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,184,0,0.10),transparent_24%)]"></div>
            <img src="/teacher.jpg" alt="Hero" className="absolute inset-0 w-full h-full object-cover scale-105" />

            <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24">
               <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                     <span className="w-6 h-1 rounded-full bg-re-orange"></span>
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Staff services</p>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-2 mt-2 uppercase">Shule <span className="text-re-orange">Avance</span></h1>
                  <p className="text-[8px] sm:text-[10px] md:text-sm font-bold text-white/55 max-w-lg leading-relaxed uppercase tracking-widest italic">Verified Institutional Credit & Staff Support</p>
               </div>
            </div>
         </div>

         {/* ── Main Content Grid ── */}
         <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-24 relative z-20 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

               {/* ── Left Column (Financial Dashboard) ── */}
               <div className="lg:col-span-2 space-y-8">
                  {/* Mobile: Balance first */}
                  <div className="lg:hidden">
                     {renderBalanceCard()}
                  </div>

                  {/* Main Financial State Card */}
                  <div className="bg-white rounded-[32px] shadow-2xl border border-black/5 p-6 md:p-8 relative overflow-hidden flex flex-col justify-between">
                     <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(255,140,0,0.07),transparent)]"></div>
                     {showApplyInline ? (
                        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                           <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                 <div className="flex items-center gap-2">
                                    <span className="w-4 h-1 rounded-full bg-re-orange"></span>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-re-text-muted/60">
                                       {applyMode === 'invoice' ? 'Invoice Payment' : 'Bill Payment'}
                                    </p>
                                 </div>
                                 <h3 className="text-lg font-black text-re-text tracking-tight uppercase">
                                    {applyMode === 'invoice'
                                       ? 'Upload Invoice'
                                       : (selectedBill?.label ? `${selectedBill.label} Bill` : 'Quick Bill Payment')}
                                 </h3>
                                 <p className="text-[9px] text-re-text-muted font-bold uppercase tracking-widest opacity-40">
                                    {applyMode === 'invoice' ? 'Wizard Flow' : 'Payroll check-off request'}
                                 </p>
                              </div>
                              <button
                                 type="button"
                                 onClick={() => {
                                     setShowApplyModal(false);
                                     setApplyMode('direct');
                                     setSelectedBillKey(null);
                                  }}
                                 className="p-2 rounded-xl bg-re-bg border border-black/5 text-re-text-muted hover:text-re-orange transition-colors shadow-inner"
                                 aria-label="Close"
                              >
                                 <X size={16} />
                              </button>
                           </div>

                           {error && (
                              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] font-bold text-red-700">
                                 {error}
                              </div>
                           )}

                           {applyMode === 'invoice' ? (
                              <div className="space-y-5">
                                 {wizardStep === 1 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                       <div className="space-y-1.5">
                                          <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">Biller / Vendor</label>
                                          <input
                                             value={invoiceVendor}
                                             onChange={(e) => setInvoiceVendor(e.target.value)}
                                             className="w-full h-11 bg-re-bg rounded-lg px-4 font-bold outline-none border border-transparent focus:border-re-orange/30 focus:bg-white focus:ring-4 focus:ring-re-orange/5 transition-all text-xs"
                                             placeholder="Ex: REG / Water utility / Supplier"
                                          />
                                       </div>

                                       <div className="space-y-1.5">
                                          <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">Invoice File</label>
                                          <label className="w-full h-11 flex items-center gap-2.5 bg-re-bg rounded-lg px-4 font-bold outline-none border border-transparent hover:border-re-orange/20 cursor-pointer transition-all text-xs">
                                             <Upload size={14} className="text-re-orange" />
                                             <span className="text-re-text-muted/70 truncate">{invoiceFile?.name || 'Upload PDF or image...'}</span>
                                             <input
                                                type="file"
                                                className="hidden"
                                                accept="application/pdf,image/*"
                                                onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                                             />
                                          </label>
                                       </div>

                                       <div className="md:col-span-2 flex items-center justify-between gap-3 bg-re-bg/50 p-4 rounded-lg border border-dashed border-gray-200">
                                          <p className="text-[9px] text-re-text-muted font-bold italic">Next: add invoice items and confirm total</p>
                                          <button
                                             type="button"
                                             onClick={() => setWizardStep(2)}
                                             className="text-white px-6 py-2.5 rounded-lg font-black hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-widest bg-re-grad-orange shadow-re-glow"
                                          >
                                             Continue <ArrowRight size={14} />
                                          </button>
                                       </div>
                                    </div>
                                 ) : (
                                    <div className="space-y-4">
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                          <div className="space-y-1.5">
                                             <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">Repayment Period</label>
                                             <select
                                                className="w-full h-11 bg-re-bg rounded-lg px-4 font-bold outline-none border border-transparent focus:border-re-orange/30 focus:bg-white focus:ring-4 focus:ring-re-orange/5 transition-all text-xs appearance-none"
                                                value={term}
                                                onChange={(e) => setTerm(Number(e.target.value))}
                                             >
                                                <option value={3}>3 Months Plan</option>
                                                <option value={6}>6 Months Plan</option>
                                                <option value={12}>12 Months Plan</option>
                                                <option value={18}>18 Months Plan</option>
                                             </select>
                                          </div>

                                          <div className="space-y-1.5">
                                             <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">Invoice Total (Auto)</label>
                                             <div className="w-full h-11 bg-re-bg rounded-lg px-4 font-black flex items-center border border-black/5 text-re-text text-xs">
                                                {Math.round(invoiceTotal || 0).toLocaleString()} <span className="ml-1 text-[10px] text-re-text-muted/50 font-black uppercase">RWF</span>
                                             </div>
                                          </div>
                                       </div>

                                       <div className="space-y-2">
                                          {invoiceItems.map((it) => (
                                             <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                                                <input
                                                   value={it.name}
                                                   onChange={(e) => updateInvoiceItem(it.id, { name: e.target.value })}
                                                   placeholder="Item name"
                                                   className="col-span-6 h-10 bg-re-bg rounded-lg px-3 font-bold outline-none border border-black/5 focus:border-re-orange/20 focus:bg-white transition-all text-xs"
                                                />
                                                <input
                                                   type="number"
                                                   value={it.qty}
                                                   onChange={(e) => updateInvoiceItem(it.id, { qty: Number(e.target.value) })}
                                                   placeholder="Qty"
                                                   className="col-span-2 h-10 bg-re-bg rounded-lg px-3 font-bold outline-none border border-black/5 focus:border-re-orange/20 focus:bg-white transition-all text-xs"
                                                />
                                                <input
                                                   inputMode="numeric"
                                                   value={it.unit}
                                                   onChange={(e) => updateInvoiceItem(it.id, { unit: e.target.value })}
                                                   placeholder="Unit price"
                                                   className="col-span-3 h-10 bg-re-bg rounded-lg px-3 font-bold outline-none border border-black/5 focus:border-re-orange/20 focus:bg-white transition-all text-xs"
                                                />
                                                <button
                                                   type="button"
                                                   onClick={() => removeInvoiceItem(it.id)}
                                                   className="col-span-1 h-10 rounded-lg bg-white border border-black/5 text-re-text-muted hover:text-red-500 hover:border-red-100 transition-all flex items-center justify-center"
                                                   title="Remove item"
                                                >
                                                   <Trash2 size={14} />
                                                </button>
                                             </div>
                                          ))}

                                          <div className="flex items-center justify-between gap-3">
                                             <button
                                                type="button"
                                                onClick={addInvoiceItem}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-black/5 text-re-text font-black text-[10px] uppercase tracking-widest hover:bg-re-bg transition-all"
                                             >
                                                <Plus size={14} className="text-re-orange" /> Add item
                                             </button>
                                             <button
                                                type="button"
                                                onClick={() => setWizardStep(1)}
                                                className="text-[9px] font-black uppercase tracking-widest text-re-text-muted hover:text-re-orange transition-colors"
                                             >
                                                Back to upload
                                             </button>
                                          </div>
                                       </div>

                                       <div className="flex justify-between items-center bg-re-bg/50 p-4 rounded-lg border border-dashed border-gray-200">
                                          <p className="text-[9px] text-re-text-muted font-bold italic">
                                             Est. payroll check-off: <span className="text-re-text font-black text-xs">{(Math.round(invoiceTotal || 0) / term || 0).toLocaleString()} RWF/mo</span>
                                          </p>
                                          <button
                                             type="button"
                                             disabled={submitting}
                                             onClick={submitInvoiceWizard}
                                             className="text-white px-6 py-2.5 rounded-lg font-black hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50 bg-re-grad-orange shadow-re-glow"
                                          >
                                             {submitting ? 'Submitting...' : 'Submit Request'}
                                          </button>
                                       </div>
                                    </div>
                                 )}
                              </div>
                           ) : (
                              <form onSubmit={handleApply} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                 <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">Amount (RWF)</label>
                                    <input
                                       type="number"
                                       className="w-full h-11 bg-re-bg rounded-lg px-4 font-bold outline-none border border-transparent focus:border-re-orange/30 focus:bg-white focus:ring-4 focus:ring-re-orange/5 transition-all text-xs"
                                       placeholder="Ex: 120,000"
                                       value={amount}
                                       onChange={(e) => setAmount(e.target.value)}
                                       required
                                    />
                                 </div>
                                 <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">Repayment Period</label>
                                    <select
                                       className="w-full h-11 bg-re-bg rounded-lg px-4 font-bold outline-none border border-transparent focus:border-re-orange/30 focus:bg-white focus:ring-4 focus:ring-re-orange/5 transition-all text-xs appearance-none"
                                       value={term}
                                       onChange={(e) => setTerm(Number(e.target.value))}
                                    >
                                       <option value={3}>3 Months Plan</option>
                                       <option value={6}>6 Months Plan</option>
                                       <option value={12}>12 Months Plan</option>
                                       <option value={18}>18 Months Plan</option>
                                    </select>
                                 </div>
                                 <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">Bill Note</label>
                                    <textarea
                                       className="w-full h-20 bg-re-bg rounded-lg p-4 font-bold outline-none border border-transparent focus:border-re-orange/30 focus:bg-white focus:ring-4 focus:ring-re-orange/5 transition-all text-xs resize-none"
                                       placeholder="Optional: account number, meter number, reference..."
                                       value={purpose}
                                       onChange={(e) => setPurpose(e.target.value)}
                                       required
                                    ></textarea>
                                 </div>
                                 <div className="md:col-span-2 flex justify-between items-center bg-re-bg/50 p-4 rounded-lg border border-dashed border-gray-200">
                                    <p className="text-[9px] text-re-text-muted font-bold italic">Est. payroll check-off: <span className="text-re-text font-black text-xs">{(Number(amount) / term || 0).toLocaleString()} RWF/mo</span></p>
                                    <button
                                       type="submit"
                                       disabled={submitting}
                                       className="text-white px-6 py-2.5 rounded-lg font-black hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50 bg-re-grad-orange shadow-re-glow"
                                    >
                                       {submitting ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                 </div>
                              </form>
                           )}
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
                                         ${isCurrent ? 'text-white shadow-[0_10px_25px_-10px_rgba(255,140,0,0.8)] bg-re-orange border-orange-100' : isPast ? 'text-white shadow-inner bg-re-text border-re-text/10' : 'bg-white border-re-bg text-re-text-muted/40 shadow-inner'}`}
                                         >
                                                {isPast && !isCurrent ? <CheckCircle size={12} /> : <span className="text-[9px] font-black">{idx + 1}</span>}
                                             </div>
                                             <span className={`text-[8px] font-black uppercase tracking-widest ${isCurrent ? 'text-re-orange' : isPast ? 'text-re-text/70' : 'text-gray-400 opacity-40'}`}>{step}</span>
                                          </div>
                                       );
                                    })}
                                    {/* Step Connector Line */}
                                    <div className="absolute top-[13.5px] left-8 right-8 h-0.5 bg-re-bg -z-0">
                                       <div className="h-full transition-all duration-1000 bg-[linear-gradient(90deg,#0E1F35,#FF8C00)]"
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
                                       <button className="px-6 py-2.5 bg-white border border-black/5 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-re-bg hover:border-re-orange/20 transition-all">Download Contract</button>
                                       {loanStatus.active_loan.status === 'pending' && (
                                          <button onClick={() => handleCancel(loanStatus.active_loan.id)} className="px-6 py-2.5 bg-red-50 text-red-500 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-red-100 transition-all">Revoke Request</button>
                                       )}
                                    </div>
                                 </div>
                              </div>
                           ) : (
                              <div className="space-y-6 w-full animate-in fade-in duration-500">
                                 <div className="flex items-center justify-between gap-4">
                                    <div>
                                       <div className="flex items-center gap-2">
                                          <span className="w-4 h-1 rounded-full bg-re-orange"></span>
                                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-re-text">Pay Bills Now</p>
                                       </div>
                                       <h4 className="text-2xl font-black text-re-text tracking-tight uppercase leading-tight mt-2">Choose a bill to pay</h4>
                                       <p className="text-[11px] text-re-text-muted font-bold opacity-70 leading-relaxed mt-2 max-w-xl">
                                          We pay your bill now. You repay effortlessly through payroll check-offs over the months you choose.
                                       </p>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 gap-2">
                                    {BILL_OPTIONS.map((b) => (
                                       <button
                                          key={b.key}
                                          type="button"
                                          onClick={() => {
                                             setError(null);
                                             setSelectedBillKey(b.key);
                                             if (b.mode === 'invoice') {
                                                setApplyMode('invoice');
                                                setShowApplyModal(true);
                                                setWizardStep(1);
                                                setInvoiceVendor('');
                                                setInvoiceFile(null);
                                                setInvoiceItems([{ id: 1, name: '', qty: 1, unit: '' }]);
                                                return;
                                             }
                                             setApplyMode('direct');
                                             setPurpose(`${b.label} bill`);
                                             setAmount('');
                                             setTerm(1);
                                             setShowApplyModal(true);
                                          }}
                                          className={`group border rounded-2xl px-2 py-3 text-center transition-all shadow-sm active:scale-[0.99]
                                          ${selectedBillKey === b.key ? 'border-re-orange bg-re-orange/10' : 'border-black/5 bg-white hover:bg-re-orange/5 hover:border-re-orange/30'}
                                          ${b.key === 'invoice' ? 'ring-1 ring-re-orange/25 shadow-[0_12px_28px_-18px_rgba(255,140,0,0.55)]' : ''}`}
                                       >
                                          <div className="flex flex-col items-center gap-1.5">
                                             <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-inner border transition-all
                                             ${b.key === 'invoice' ? 'bg-re-orange/15 border-re-orange/25 text-re-orange' : 'bg-re-bg border-black/5 text-re-orange group-hover:bg-white'}`}>
                                                <b.Icon size={17} />
                                             </div>
                                             <p className={`text-[9px] font-black uppercase tracking-widest leading-tight ${b.key === 'invoice' ? 'text-re-orange' : 'text-re-text'}`}>
                                                {b.label}
                                             </p>
                                          </div>
                                       </button>
                                    ))}
                                 </div>

                                 <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-re-bg/40 border border-black/5">
                                    <div className="flex items-center gap-3">
                                       <div className="w-9 h-9 rounded-xl bg-white border border-black/5 flex items-center justify-center text-re-orange shadow-inner">
                                          <Wallet size={16} />
                                       </div>
                                       <div>
                                          <p className="text-[9px] font-black uppercase tracking-widest text-re-text">Payroll Check-Off</p>
                                          <p className="text-[9px] font-bold text-re-text-muted opacity-70">Monthly deductions begin after approval.</p>
                                       </div>
                                    </div>
                                    <div className="hidden md:flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-re-orange">
                                       View terms <ArrowRight size={12} />
                                    </div>
                                 </div>
                              </div>
                           )}
                        </>
                     )}
                  </div>

               </div>

               {/* ── Right Column (Sidebar) ── */}
               <div className="space-y-4 lg:sticky lg:top-20 h-fit">
                  <div className="hidden lg:block">
                     {renderBalanceCard()}
                  </div>

                  <div className="hidden">
                     {(() => {
                     const active = loanStatus?.active_loan || null;
                     const activeAmount = Number(active?.amount_requested) || 0;
                     const activeTerm = Number(active?.repayment_term_months) || 0;
                     const history = Array.isArray(loanStatus?.history) ? loanStatus.history : [];
                     const totalDisbursed = history.reduce((s, r) => s + (Number(r?.amount_requested) || 0), 0) || activeAmount;
                     const estTotalPayroll = activeAmount;
                     const estMonthly = activeTerm ? Math.round(estTotalPayroll / activeTerm) : 0;
                     const nextPayroll = (() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() + 1);
                        return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
                     })();

                     return (
                        <div className="relative rounded-[24px] overflow-hidden border border-white/10 bg-[linear-gradient(145deg,#0E1F35,#1B3354)] text-white p-5 shadow-[0_18px_45px_-22px_rgba(14,31,53,0.9)]">
                           <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-re-orange/20" />
                           <div className="absolute -bottom-8 left-6 w-24 h-24 rounded-full bg-white/5" />

                           <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Balance</p>
                           <p className="text-3xl font-black tracking-tight mt-1">
                              {(estTotalPayroll || 0).toLocaleString()} <span className="text-[13px] opacity-40 font-black">RWF</span>
                           </p>

                           <div className="mt-5 pt-4 border-t border-white/10 flex">
                              <div className="flex-1 pr-4 border-r border-white/10">
                                 <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">Total Disbursements</p>
                                 <p className="text-sm font-black tracking-tight mt-1">{totalDisbursed.toLocaleString()} <span className="text-[10px] opacity-35 font-black">RWF</span></p>
                                 <p className="text-[9px] text-white/30 mt-1">Lifetime (est.)</p>
                              </div>
                              <div className="flex-1 pl-4">
                                 <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">Monthly Payroll</p>
                                 <p className="text-sm font-black tracking-tight mt-1 text-re-orange">{estMonthly ? estMonthly.toLocaleString() : '—'} <span className="text-[10px] opacity-45 font-black text-white">RWF</span></p>
                                 <p className="text-[9px] text-white/30 mt-1">{activeAmount ? `Next payroll: ${nextPayroll}` : 'No active facility'}</p>
                                 <div className="h-[3px] bg-white/10 rounded mt-2 overflow-hidden">
                                    <div className="h-full bg-re-orange rounded" style={{ width: activeTerm ? '40%' : '0%' }} />
                                 </div>
                              </div>
                           </div>
                        </div>
                     );
                     })()}
                  </div>

                  <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-emerald-500/10 p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
                     <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shadow-inner border border-emerald-100/50 shrink-0">
                        <User size={18} />
                     </div>
                     <div className="pt-0.5">
                        <div className="flex items-center gap-1.5">
                           <h3 className="text-[11px] font-black text-re-text uppercase tracking-tight">KYC Verified</h3>
                           <CheckCircle size={10} className="text-emerald-500" />
                        </div>
                        <p className="text-[9px] text-re-text-muted font-bold mt-1 opacity-70 leading-relaxed">
                           Your profile matches HR records for automated check-offs.
                        </p>
                     </div>
                  </div>

                  {/* Quick Support Card (Optimized Height) */}
                  <div className="relative rounded-[24px] p-5 text-white shadow-[0_18px_45px_-20px_rgba(14,31,53,0.8)] overflow-hidden group cursor-pointer active:scale-95 transition-all bg-[linear-gradient(145deg,#0E1F35,#1F3554)] min-h-[140px] flex flex-col justify-center border border-white/10">

                     {/* Texture Overlay */}
                     <div className="absolute inset-0 opacity-10 mix-blend-overlay">
                        <img src="/teacher.jpg" alt="" className="w-full h-full object-cover grayscale" />
                     </div>
                     <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,140,0,0.24),transparent_34%)]"></div>

                     <div className="relative z-10 flex flex-col gap-3">
                        <div className="w-8 h-8 bg-re-orange/15 rounded-lg flex items-center justify-center backdrop-blur-md shadow-inner border border-re-orange/20">
                           <Users size={16} className="text-re-orange" />
                        </div>
                        <div>
                           <h4 className="font-black text-[10px] tracking-widest uppercase leading-none opacity-90">Emergency Priority?</h4>
                           <p className="text-[9px] text-white/70 font-bold leading-snug mt-1.5">
                              For urgent medical or family needs, please contact our support desk for priority processing.
                           </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest group-hover:gap-2.5 transition-all bg-re-orange/10 text-re-orange border border-re-orange/20 px-3 py-1.5 rounded-lg w-fit mt-0.5">
                           Connect to Agent <ArrowRight size={10} />
                        </div>
                     </div>

                     {/* Premium Glows */}
                     <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                  </div>
               </div>
            </div>
         </div>

        {showApplyModal && createPortal(
  <div className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
    <div className="bg-white w-full sm:max-w-[560px] rounded-t-[28px] sm:rounded-[24px] shadow-2xl border border-black/5 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300">
      
      {/* Header with Steps - Premium Pattern */}
      <div className="relative z-10 bg-[linear-gradient(135deg,#FF8C00,#E67300)] px-5 py-4 shrink-0 overflow-hidden">
        {/* Abstract Glow in Header */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full mr-[-2rem] mt-[-2rem]"></div>
        <div className={`flex items-center justify-between relative z-10 ${applyMode === 'invoice' ? 'mb-4' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              {applyMode === 'invoice' ? <ReceiptText size={16} className="text-white" /> : <Wallet size={16} className="text-white" />}
            </div>
            <div>
              <h1 className="text-[11px] font-black text-white uppercase tracking-widest leading-none">
                {applyMode === 'invoice' ? 'Pay An Invoice' : (selectedBill?.label ? `${selectedBill.label} Bill` : 'Bill Payment')}
              </h1>
              <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">
                Financial Transaction · Wizard
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowApplyModal(false);
              setApplyMode('direct');
              setSelectedBillKey(null);
            }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-[12px] transition-all text-white/70 hover:text-white group disabled:opacity-50"
          >
            <X size={16} className="group-hover:rotate-90 transition-all duration-300" />
          </button>
        </div>

        {applyMode === 'invoice' && (
          <div className="relative flex items-center mt-2 px-1">
            <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-none pb-0.5 scroll-smooth w-full">
              {INVOICE_STEPS.map((s, idx) => (
                <div key={s.id} className="flex items-center shrink-0">
                  <button 
                    type="button"
                    onClick={() => !submitting && setWizardStep(s.id)} 
                    disabled={submitting}
                    className={`flex items-center gap-2 transition-all outline-none ${wizardStep === s.id ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                      wizardStep === s.id ? 'bg-white border-white text-re-orange shadow-lg scale-105' : 
                      wizardStep > s.id ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white/10 border-white/10 text-white'
                    }`}>
                      {wizardStep > s.id ? <CheckCircle2 size={14} /> : <s.icon size={12} />}
                    </div>
                    <div className="text-left">
                      <p className="text-[6px] font-black uppercase tracking-widest leading-none mb-0.5 text-white/40">Phase 0{s.id}</p>
                      <p className="text-[9px] font-black text-white tracking-tight">{s.label}</p>
                    </div>
                  </button>
                  {idx < INVOICE_STEPS.length - 1 && <div className="w-4 h-px bg-white/20 mx-2" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {applyMode === 'direct' && (
          <div className="relative flex items-center mt-2 px-1">
            <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-none pb-0.5 scroll-smooth w-full">
              {DIRECT_STEPS.map((s, idx) => (
                <div key={s.id} className="flex items-center shrink-0">
                  <button 
                    type="button"
                    onClick={() => !submitting && setWizardStep(s.id)} 
                    disabled={submitting}
                    className={`flex items-center gap-2 transition-all outline-none ${wizardStep === s.id ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                      wizardStep === s.id ? 'bg-white border-white text-re-orange shadow-lg scale-105' : 
                      wizardStep > s.id ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white/10 border-white/10 text-white'
                    }`}>
                      {wizardStep > s.id ? <CheckCircle2 size={14} /> : <s.icon size={12} />}
                    </div>
                    <div className="text-left">
                      <p className="text-[6px] font-black uppercase tracking-widest leading-none mb-0.5 text-white/40">Phase 0{s.id}</p>
                      <p className="text-[9px] font-black text-white tracking-tight">{s.label}</p>
                    </div>
                  </button>
                  {idx < DIRECT_STEPS.length - 1 && <div className="w-4 h-px bg-white/20 mx-2" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-white px-4 sm:px-5 py-4">
        <div className="w-full mx-auto space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm animate-in fade-in">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-red-800 tracking-tight leading-relaxed">{error}</p>
            </div>
          )}

          {applyMode === 'invoice' ? (
            <div className="bg-white rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-black/[0.03] p-4 sm:p-5 min-h-[250px]">
              {wizardStep === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="grid grid-cols-1 gap-5">
                    {/* Refined Upload Button */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-re-text-muted uppercase tracking-[0.15em] opacity-60">
                        Invoice Document <span className="text-red-400 ml-0.5">*</span>
                      </label>
                      <label className="group relative w-full h-40 rounded-[24px] bg-re-bg shadow-inner transition-all flex items-center justify-center overflow-hidden cursor-pointer hover:bg-white focus-within:bg-white focus-within:ring-2 focus-within:ring-re-orange/15 focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-transparent hover:border-re-orange/20">
                        <input
                          type="file"
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          accept="application/pdf,image/*"
                          onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                        />
                        
                        <div className="flex flex-col items-center justify-center gap-2.5 w-full px-5 z-20 pointer-events-none text-center mt-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${invoiceFile ? 'bg-emerald-50 text-emerald-500 scale-110 shadow-sm border border-emerald-100/50' : 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-re-text-muted group-hover:text-re-orange group-hover:-translate-y-1 group-hover:shadow-[0_8px_20px_rgba(255,140,0,0.15)] border border-black/5 group-hover:border-re-orange/30'}`}>
                            {invoiceFile ? <CheckCircle size={18} /> : <Upload size={18} />}
                          </div>
                          
                          <div className="flex flex-col">
                             {invoiceFile ? (
                               <>
                                 <p className="text-[11px] font-black text-re-text tracking-tight truncate max-w-[250px]">{invoiceFile.name}</p>
                                 <p className="text-[8px] font-bold text-emerald-600 mt-1 uppercase tracking-widest">{(invoiceFile.size / 1024).toFixed(1)} KB • Click to re-upload</p>
                               </>
                             ) : (
                               <>
                                 <p className="text-[11px] font-black text-re-text tracking-tight group-hover:text-re-orange transition-colors">Tap or Drop to Upload Document</p>
                                 <p className="text-[8px] font-bold text-re-text-muted/60 mt-1 uppercase tracking-widest">PDF or Image (Max 5MB)</p>
                               </>
                             )}
                          </div>

                          <div className="flex items-center gap-2 mt-1 pointer-events-auto">
                            {invoiceFile && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setInvoiceFile(null);
                                }}
                                className="h-7 px-4 rounded-lg bg-white flex items-center justify-center text-[8px] font-black uppercase tracking-widest text-red-500 hover:text-white hover:bg-red-500 shadow-sm border border-red-100/50 hover:border-transparent transition-all"
                              >
                                Remove
                              </button>
                            )}
                            <div className={`h-7 transition-all ${invoiceFile ? 'opacity-0 scale-95 absolute pointer-events-none' : 'px-4 rounded-lg flex items-center justify-center text-[8px] font-black uppercase tracking-widest bg-re-orange/10 text-re-orange border border-re-orange/20 group-hover:bg-re-orange group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(255,140,0,0.3)] group-hover:border-transparent'}`}>
                              Browse Files
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>

                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  {/* Items Table */}
                  <div className="rounded-[20px] border border-black/[0.04] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col mt-4">
                    <div className="grid grid-cols-12 gap-2 px-5 py-3.5 bg-[linear-gradient(180deg,#F8FAFC,#F1F5F9)] border-b border-black/[0.04] shadow-[inset_0_-1px_0_white]">
                      <p className="col-span-4 text-[9px] font-black uppercase tracking-[0.14em] text-[#1E3A5F]/70">Item Description</p>
                      <p className="col-span-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#1E3A5F]/70 text-center">Qty</p>
                      <p className="col-span-3 text-[9px] font-black uppercase tracking-[0.14em] text-[#1E3A5F]/70 pl-2">Unit Price (RWF)</p>
                      <p className="col-span-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#1E3A5F]/70 text-right pr-2">Total</p>
                      <span className="col-span-1" />
                    </div>

                    <div className="divide-y divide-black/5 max-h-[280px] overflow-y-auto custom-scrollbar">
                      {invoiceItems.map((it) => {
                        const qty = Number(it.qty) || 0;
                        const unit = Number(String(it.unit || '').replace(/[^\d.]/g, '')) || 0;
                        const rowTotal = qty * unit;
                        return (
                          <div key={it.id} className="px-4 py-3 hover:bg-[#1E3A5F]/[0.02] transition-colors group">
                            <div className="grid grid-cols-12 gap-2 items-center">
                              <input
                                value={it.name}
                                onChange={(e) => updateInvoiceItem(it.id, { name: e.target.value })}
                                placeholder="Item name"
                                className="col-span-4 w-full h-9 rounded-lg bg-re-bg px-3.5 font-bold text-[11px] outline-none border border-black/[0.07] shadow-[inset_0_2px_8px_rgba(15,23,42,0.11),inset_0_-1px_0_rgba(255,255,255,0.55)] focus:border-[#1E3A5F]/30 focus:bg-white focus:ring-2 focus:ring-[#1E3A5F]/12 transition-all placeholder:text-re-text-muted/40"
                              />
                              <div className="contents">
                                <input
                                  type="number"
                                  value={it.qty}
                                  onChange={(e) => updateInvoiceItem(it.id, { qty: Number(e.target.value) })}
                                  placeholder="0"
                                  className="col-span-2 w-full h-9 rounded-lg bg-white/95 text-center tabular-nums font-black text-[11px] tracking-tight outline-none border border-black/[0.07] shadow-[inset_0_2px_10px_rgba(15,23,42,0.11),inset_0_-1px_0_rgba(255,255,255,0.65)] focus:border-[#1E3A5F]/28 focus:ring-2 focus:ring-[#1E3A5F]/12 focus:bg-white placeholder:text-re-text-muted/35 transition-all"
                                />
                                <input
                                  inputMode="numeric"
                                  value={it.unit}
                                  onChange={(e) => updateInvoiceItem(it.id, { unit: e.target.value })}
                                  placeholder="0"
                                  className="col-span-3 w-full h-9 rounded-lg bg-white/95 px-3.5 text-right tabular-nums font-black text-[11px] tracking-tight outline-none border border-black/[0.07] shadow-[inset_0_2px_10px_rgba(15,23,42,0.11),inset_0_-1px_0_rgba(255,255,255,0.65)] focus:border-[#1E3A5F]/28 focus:ring-2 focus:ring-[#1E3A5F]/12 focus:bg-white placeholder:text-re-text-muted/35 transition-all"
                                />
                              </div>
                              <div className="col-span-2 flex justify-end items-center pr-2">
                                <span className="text-[12px] font-black text-[#1E3A5F] tabular-nums tracking-tight pt-0.5 truncate">
                                  {Math.round(rowTotal || 0).toLocaleString()}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeInvoiceItem(it.id)}
                                className="col-span-1 h-8 w-8 mx-auto rounded-lg bg-red-50 text-red-400 hover:text-white hover:bg-red-500 shadow-[inset_0_1px_4px_rgba(0,0,0,0.05)] border border-transparent hover:border-red-600 transition-all flex items-center justify-center opacity-50 group-hover:opacity-100"
                                title="Remove item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Item Button and Monthly Estimate */}
                  <div className="flex items-center justify-between gap-3 pt-3 px-3 border-t border-black/[0.04] mt-1 mb-2">
                    <button
                      type="button"
                      onClick={addInvoiceItem}
                      className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-[10px] bg-re-orange/10 border border-re-orange/20 text-re-orange font-black text-[9px] uppercase tracking-widest hover:bg-re-orange hover:text-white transition-all group shadow-sm"
                    >
                      <Plus size={12} className="group-hover:rotate-90 transition-transform" /> 
                      Add Line Item
                    </button>
                    <div className="text-right flex items-center gap-3">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-[#1E3A5F]/60">Invoice Total</p>
                      <div className="inline-flex shrink-0 items-center px-4 py-1.5 bg-[#F8FAFC] border border-black/[0.04] shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.7)] rounded-[12px] min-w-[120px] justify-center">
                        <p className="text-[14px] leading-none font-black text-[#1E3A5F] tabular-nums tracking-tight">
                          {Math.round(invoiceTotal || 0).toLocaleString()} 
                          <span className="text-[9px] opacity-40 font-black uppercase ml-1 tracking-widest">RWF</span>
                        </p>
                      </div>
                    </div>
                  </div>


                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 py-2">
                  <div className="max-w-md mx-auto space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.15em] opacity-60 ml-1">
                        Repayment Period <span className="text-red-400 ml-0.5">*</span>
                      </label>
                      <label className="relative block">
                        <select
                          className="cursor-pointer appearance-none w-full outline-none transition-all text-[#1E3A5F] font-black uppercase border border-black/[0.07] bg-re-bg shadow-[inset_0_2px_8px_rgba(15,23,42,0.11),inset_0_-1px_0_rgba(255,255,255,0.55)] focus:border-[#1E3A5F]/30 focus:bg-white focus:ring-2 focus:ring-[#1E3A5F]/12 h-12 px-5 rounded-2xl text-[11px] tracking-widest"
                          value={term}
                          onChange={(e) => setTerm(Number(e.target.value))}
                        >
                          <option value={3}>3 Months</option>
                          <option value={6}>6 Months</option>
                          <option value={12}>12 Months</option>
                          <option value={18}>18 Months</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none w-6 h-6 rounded-lg bg-black/5 flex items-center justify-center">
                           <ChevronDown size={14} className="text-[#1E3A5F]/60" />
                        </div>
                      </label>
                    </div>

                    <div className="bg-[#F8FAFC] rounded-[20px] p-5 border border-black/[0.04] shadow-[inset_0_2px_8px_rgba(15,23,42,0.02)] space-y-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(ellipse_at_top_right,rgba(255,140,0,0.06),transparent_70%)] pointer-events-none"></div>
                      
                      <div className="flex justify-between items-center relative z-10">
                        <span className="text-[10px] font-black uppercase text-[#1E3A5F]/50 tracking-[0.15em]">Total Invoice</span>
                        <span className="text-[15px] font-black text-[#1E3A5F] tabular-nums tracking-tight">{Math.round(invoiceTotal || 0).toLocaleString()} <span className="text-[10px] opacity-40 font-black tracking-widest pl-0.5">RWF</span></span>
                      </div>
                      
                      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#1E3A5F]/5 to-transparent relative z-10"></div>
                      
                      <div className="flex justify-between items-center relative z-10">
                        <span className="text-[10px] font-black uppercase text-re-orange tracking-[0.15em]">Est. Check-off</span>
                        <div className="text-right">
                           <span className="text-[20px] font-black text-re-orange tabular-nums leading-none block tracking-tight">{(Math.round(invoiceTotal || 0) / term || 0).toLocaleString()} <span className="text-[10px] opacity-40 font-black tracking-widest">RWF</span></span>
                           <span className="text-[9px] font-bold text-re-orange/50 uppercase tracking-widest">per month</span>
                        </div>
                      </div>
                    </div>


                  </div>
                </div>
              )}
            </div>
          ) : (
            // Direct bill payment form
            <div className="bg-white rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-black/[0.03] p-4 sm:p-5 min-h-[250px] relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-32 bg-[radial-gradient(ellipse_at_top,rgba(255,140,0,0.05),transparent_70%)] pointer-events-none"></div>
              
              {wizardStep === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 relative z-10">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.15em] opacity-60">
                        Amount (RWF) <span className="text-red-400 ml-0.5">*</span>
                      </label>
                      <input
                        type="number"
                        className="w-full h-11 rounded-[12px] bg-re-bg px-4 font-black text-sm outline-none border border-transparent shadow-inner focus:border-re-orange/30 focus:bg-white focus:ring-2 focus:ring-re-orange/15 transition-all font-mono"
                        placeholder="Ex: 120,000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.15em] opacity-60">
                        Bill Reference / Note <span className="text-red-400 ml-0.5">*</span>
                      </label>
                      <textarea
                        className="w-full h-20 rounded-[12px] bg-re-bg px-4 py-3 font-bold text-xs outline-none border border-transparent shadow-inner focus:border-re-orange/30 focus:bg-white focus:ring-2 focus:ring-re-orange/15 transition-all resize-none"
                        placeholder="Account #, meter #, reference..."
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        required
                      />
                    </div>


                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 relative z-10 py-2">
                  <div className="max-w-md mx-auto space-y-4">
                  
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.15em] opacity-60 ml-1">
                        Repayment Period <span className="text-red-400 ml-0.5">*</span>
                      </label>
                      <label className="relative block">
                        <select
                          className="cursor-pointer appearance-none w-full outline-none transition-all text-[#1E3A5F] font-black uppercase border border-black/[0.07] bg-re-bg shadow-[inset_0_2px_8px_rgba(15,23,42,0.11),inset_0_-1px_0_rgba(255,255,255,0.55)] focus:border-[#1E3A5F]/30 focus:bg-white focus:ring-2 focus:ring-[#1E3A5F]/12 h-12 px-5 rounded-2xl text-[11px] tracking-widest"
                          value={term}
                          onChange={(e) => setTerm(Number(e.target.value))}
                        >
                          <option value={1}>Upcoming Payroll</option>
                          <option value={3}>3 Months Plan</option>
                          <option value={6}>6 Months Plan</option>
                          <option value={12}>12 Months Plan</option>
                          <option value={18}>18 Months Plan</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none w-6 h-6 rounded-lg bg-black/5 flex items-center justify-center">
                           <ChevronDown size={14} className="text-[#1E3A5F]/60" />
                        </div>
                      </label>
                    </div>

                    <div className="bg-[#F8FAFC] rounded-[20px] p-5 border border-black/[0.04] shadow-[inset_0_2px_8px_rgba(15,23,42,0.02)] space-y-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(ellipse_at_top_right,rgba(255,140,0,0.06),transparent_70%)] pointer-events-none"></div>
                      
                      <div className="flex justify-between items-center relative z-10">
                        <span className="text-[10px] font-black uppercase text-[#1E3A5F]/50 tracking-[0.15em]">Principal Amount</span>
                        <span className="text-[15px] font-black text-[#1E3A5F] tabular-nums tracking-tight">{Math.round(Number(amount) || 0).toLocaleString()} <span className="text-[10px] opacity-40 font-black tracking-widest pl-0.5">RWF</span></span>
                      </div>
                      
                      <div className="h-[px] w-full bg-gradient-to-r from-transparent via-[#1E3A5F]/5 to-transparent relative z-10"></div>
                      
                      <div className="flex justify-between items-center relative z-10">
                        <span className="text-[10px] font-black uppercase text-re-orange tracking-[0.15em]">Est. Monthly Deduction</span>
                        <div className="text-right">
                           <span className="text-[20px] font-black text-re-orange tabular-nums leading-none block tracking-tight">{(Math.round(Number(amount) || 0) / term || 0).toLocaleString()} <span className="text-[10px] opacity-40 font-black tracking-widest">RWF</span></span>
                           <span className="text-[9px] font-bold text-re-orange/50 uppercase tracking-widest italic">deducted from payroll</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {(applyMode === 'invoice' || applyMode === 'direct') && (
        <div className="bg-white border-t border-black/5 px-5 py-3 shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <p className="text-[7px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-30 italic">
              Automated Validation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (wizardStep === 1) {
                  setShowApplyModal(false);
                  setApplyMode('direct');
                  setSelectedBillKey(null);
                  return;
                }
                setWizardStep(wizardStep - 1);
              }}
              className="h-9 px-4 rounded-lg bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all active:scale-95"
            >
              {wizardStep === 1 ? 'Cancel' : 'Back'}
            </button>

            {/* Navigation Logic for BOTH modes */}
            {(applyMode === 'invoice' && wizardStep < 3) || (applyMode === 'direct' && wizardStep < 2) ? (
              <button
                type="button"
                disabled={
                  applyMode === 'invoice' 
                    ? (wizardStep === 1 ? !invoiceFile : (invoiceItems.length === 0 || Math.round(invoiceTotal || 0) <= 0))
                    : (wizardStep === 1 ? (!amount || !purpose) : false)
                }
                onClick={() => setWizardStep(wizardStep + 1)}
                className="h-10 px-6 rounded-[10px] bg-re-grad-orange text-white text-[10px] font-black uppercase tracking-widest shadow-re-glow disabled:opacity-50 active:scale-95 transition-all inline-flex items-center gap-2 hover:shadow-lg"
              >
                Continue <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  submitting || 
                  (applyMode === 'invoice' && (!invoiceFile || Math.round(invoiceTotal || 0) <= 0)) ||
                  (applyMode === 'direct' && (!amount || !purpose))
                }
                onClick={applyMode === 'invoice' ? submitInvoiceWizard : () => submitApplication({ amountRequested: amount, purposeText: purpose, termMonths: term })}
                className="h-10 px-6 rounded-[10px] bg-re-grad-orange text-white text-[10px] font-black uppercase tracking-widest shadow-re-glow disabled:opacity-50 active:scale-95 transition-all inline-flex items-center gap-2 hover:shadow-lg"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  </div>,
  document.body
)}
      </div>
   );
};

export default ShuleAvance;
