import React, { useState, useEffect } from 'react';
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
   Users
} from 'lucide-react';
import DosOchreHero from '../components/DosOchreHero';

const ShuleAvance = () => {
   const [loanStatus, setLoanStatus] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [showApply, setShowApply] = useState(false);

   // Form State
   const [amount, setAmount] = useState('');
   const [purpose, setPurpose] = useState('');
   const [term, setTerm] = useState(6);
   const [submitting, setSubmitting] = useState(false);

   const fetchLoanStatus = async () => {
      try {
         const res = await api.get('/services/shule-avance/status');
         if (res.data.success) {
            setLoanStatus(res.data);
         }
      } catch (err) {
         setError('Could not load loan information.');
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchLoanStatus();
   }, []);

   const handleApply = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      try {
         const res = await api.post('/services/shule-avance/apply', {
            amount_requested: amount,
            purpose,
            repayment_term_months: term
         });
         if (res.data.success) {
            setShowApply(false);
            fetchLoanStatus();
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
            fetchLoanStatus();
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
      <div className="animate-in fade-in duration-500 bg-re-bg min-h-screen font-sans">
         <DosOchreHero
            eyebrow="Financial services"
            titleLine="Shule"
            titleAccent="Avance"
            subtitle="Staff financial services — apply for credit, track repayments, and manage your loan status."
            icon={Wallet}
         />

         {/* ── Main Content Grid ── */}
         <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-20 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

               {/* ── Left Column (Financial Dashboard) ── */}
               <div className="lg:col-span-2 space-y-8">

                  {/* Main Financial State Card */}
                  <div className="bg-white rounded-[32px] shadow-sm border border-black/5 p-6 md:p-8 relative overflow-hidden flex flex-col justify-between">
                     {showApply ? (
                        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                           <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                 <h3 className="text-lg font-black text-re-text tracking-tight uppercase">Credit Application</h3>
                                 <p className="text-[9px] text-re-text-muted font-bold uppercase tracking-widest opacity-40">Step 1 of 2: Basic Details</p>
                              </div>
                              <button onClick={() => setShowApply(false)} className="text-[9px] font-black text-re-text-muted hover:text-re-orange transition-colors uppercase tracking-widest">Cancel Application</button>
                           </div>

                           <form onSubmit={handleApply} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div className="space-y-1.5">
                                 <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">Desired Amount (RWF)</label>
                                 <input
                                    type="number"
                                    className="w-full h-11 bg-re-bg rounded-lg px-4 font-bold outline-none border border-transparent focus:border-re-orange/20 focus:bg-white transition-all text-xs"
                                    placeholder="Ex: 500,000"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
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
                                    <option value={3}>3 Months Plan</option>
                                    <option value={6}>6 Months Plan</option>
                                    <option value={12}>12 Months Plan</option>
                                    <option value={18}>18 Months Plan</option>
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
                              <div className="md:col-span-2 flex justify-between items-center bg-re-bg/50 p-4 rounded-lg border border-dashed border-gray-200">
                                 <p className="text-[9px] text-re-text-muted font-bold italic">Est. Deduction: <span className="text-re-text font-black text-xs">{(Number(amount) / term || 0).toLocaleString()} RWF/mo</span></p>
                                 <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-re-grad-orange text-white px-6 py-2.5 rounded-lg font-black shadow-re-glow hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50"
                                 >
                                    {submitting ? 'Submitting...' : 'Submit Request'}
                                 </button>
                              </div>
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
                                          Unlock bridge financing for your academic or personal goals. Quick approval (48hrs) for verified educators.
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
                              <div key={loan.id} className="px-5 py-3.5 flex items-center justify-between group hover:bg-re-bg/30 transition-all cursor-default">
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
                                    <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mt-0.5 ${loan.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
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
      </div>
   );
};

export default ShuleAvance;
