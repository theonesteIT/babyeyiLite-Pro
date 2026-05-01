import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Package, Loader2, ArrowLeft, Send, AlertCircle, CheckCircle2, ShoppingBag, ChevronRight } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

const UPLOADS_BASE = (import.meta.env.VITE_UPLOADS_BASE || import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/$/, '');

function toAssetUrl(pathLike) {
  if (!pathLike || typeof pathLike !== 'string') return null;
  if (pathLike.startsWith('http://') || pathLike.startsWith('https://')) return pathLike;
  const clean = pathLike.replace(/\\/g, '/');
  return `${UPLOADS_BASE}${clean.startsWith('/') ? clean : `/${clean}`}`;
}

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${Math.round(v).toLocaleString()} RWF`;
}

const REPAYMENT_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function TichaDealDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [product, setProduct] = useState(null);
  const [monthlyRatePercent, setMonthlyRatePercent] = useState(3.00);

  const [repayment, setRepayment] = useState(6);
  const [paymentMethod, setPaymentMethod] = useState('direct');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('agent_station');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        api.get('/services/shule-avance/catalog'),
        api.get('/services/shule-avance/teacher-deal-products'),
      ]);
      
      if (catRes.data?.success && catRes.data.data) {
        const services = Array.isArray(catRes.data.data.services) ? catRes.data.data.services : [];
        const dealService = services.find(s => s.slug === 'teacher_deals');
        if (dealService?.income_rate_percent) {
           setMonthlyRatePercent(Number(dealService.income_rate_percent));
        }
      }
      
      if (prodRes.data?.success) {
        const products = Array.isArray(prodRes.data.data) ? prodRes.data.data : [];
        const found = products.find(p => String(p.id) === String(id));
        if (found) {
           setProduct(found);
        } else {
           setError('Product not found.');
        }
      } else {
         setError('Failed to load products.');
      }
    } catch (e) {
      setError('Could not load deal details. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submitRequest = async () => {
    if (!product) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        request_type: 'service',
        service_category: 'teacher_deals',
        amount_requested: Number(product.price_rwf) * quantity,
        repayment_term_months: paymentMethod === 'direct' ? 1 : Number(repayment),
        selected_deal_product_ids: [Number(product.id)],
        metadata: {
          payment_method: paymentMethod,
          payment_phone: paymentMethod === 'direct' ? paymentPhone : null,
          delivery_method: deliveryMethod,
          quantity: quantity,
          unit_price: Number(product.price_rwf)
        }
      };

      const res = await api.post('/services/shule-avance/applicant/requests', body);
      if (res.data?.success) {
        setSuccess(true);
      } else {
        setError(res.data?.message || 'Submit failed.');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f9] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#f59e0b]" />
        <p className="text-[#000435]/60 text-[10px] font-black uppercase tracking-widest animate-pulse">Loading Details...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f0f2f9] flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-[32px] p-8 shadow-2xl max-w-md w-full text-center border border-black/5 animate-in fade-in zoom-in-95">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-emerald-100">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-[#000435] mb-2 uppercase tracking-tight">Request Submitted!</h2>
          <p className="text-xs font-bold text-slate-500 mb-8 leading-relaxed">
            Your application for <span className="text-[#000435] font-black">{product?.name}</span> has been securely sent to school finance for approval.
          </p>
          <div className="space-y-3">
            <button onClick={() => navigate('/shule-avance')} className="w-full py-4 rounded-xl bg-[#f59e0b] text-white font-black text-[11px] uppercase tracking-widest shadow-xl shadow-[#f59e0b]/20 hover:scale-[1.02] transition-transform">
              Track Status
            </button>
            <button onClick={() => navigate('/ticha-deals')} className="w-full py-4 rounded-xl border border-black/10 text-slate-500 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-colors">
              Back to Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error && !product) {
     return (
       <div className="min-h-screen bg-[#f0f2f9] flex flex-col items-center justify-center p-6 text-center">
         <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={32} />
         </div>
         <p className="text-xs font-bold text-slate-500 mb-6 uppercase tracking-wider">{error}</p>
         <button onClick={() => navigate('/ticha-deals')} className="px-6 py-3 rounded-xl bg-white border border-black/10 text-slate-500 font-black text-[11px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-colors">
            Return to Catalog
         </button>
       </div>
     );
  }

  const principal = Number(product?.price_rwf || 0) * quantity;
  const rate = monthlyRatePercent / 100;
  const estTotalInterest = principal * rate * repayment;
  const estTotalRepay = principal + estTotalInterest;
  const estMonthly = estTotalRepay / repayment;

  return (
    <div className="min-h-screen bg-[#f0f2f9] animate-in fade-in duration-500 pb-12 font-sans">
      <div className="max-w-[1200px] mx-auto px-4 lg:px-6 mt-4 lg:mt-10">
        
        {/* Navigation Bar */}
        <div className="mb-6 flex items-center">
           <button onClick={() => navigate('/ticha-deals')} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#000435] hover:scale-105 transition-transform border border-black/5">
             <ArrowLeft size={20} />
           </button>
        </div>

        {error && (
          <div className="mb-0 lg:mb-6 mx-4 lg:mx-0 mt-4 lg:mt-0 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 shadow-sm animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12">
          {/* Product Image & Details */}
          <div className="lg:col-span-7 space-y-4 lg:space-y-8">
            {/* Image Card (Slideshow) */}
            <div className="bg-white rounded-2xl lg:rounded-[22px] border border-black/5 overflow-hidden shadow-sm relative group">
               <div className="aspect-[3/2] lg:aspect-[4/3] bg-slate-50 relative flex items-center justify-center p-6 md:p-12 overflow-hidden">
                  {product.media && product.media.length > 0 ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={toAssetUrl(product.media[activeImageIdx]?.url || product.image_url)} 
                        alt={product.name} 
                        className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-500 mix-blend-multiply" 
                      />
                      
                      {product.media.length > 1 && (
                        <>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 p-2 rounded-full bg-black/10 backdrop-blur-md z-10">
                            {product.media.map((_, i) => (
                              <button 
                                key={i} 
                                onClick={() => setActiveImageIdx(i)}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImageIdx ? 'bg-[#f59e0b] w-4' : 'bg-white/50 hover:bg-white'}`} 
                              />
                            ))}
                          </div>
                          
                          {/* Navigation Arrows */}
                          <button 
                            onClick={() => setActiveImageIdx(prev => (prev > 0 ? prev - 1 : product.media.length - 1))}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-[#000435] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ArrowLeft size={20} />
                          </button>
                          <button 
                            onClick={() => setActiveImageIdx(prev => (prev < product.media.length - 1 ? prev + 1 : 0))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-[#000435] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <Package className="h-20 w-20 text-slate-300" />
                  )}
               </div>
               
               {/* Metadata Badges */}
               <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  {product.category && (
                    <span className="px-3 py-1 rounded-lg bg-white/90 backdrop-blur-sm border border-black/5 text-[10px] font-black text-[#000435] uppercase tracking-wider shadow-sm">
                      {product.category}
                    </span>
                  )}
                  {product.product_code && (
                    <span className="px-3 py-1 rounded-lg bg-[#000435] text-white text-[10px] font-bold tracking-wider shadow-sm">
                      {product.product_code}
                    </span>
                  )}
               </div>
            </div>

            {/* Partner Card */}
            {product.partner_org_name && (
               <div className="bg-white rounded-2xl lg:rounded-[22px] border border-black/5 overflow-hidden shadow-sm p-4 lg:p-6 flex items-center gap-4 lg:gap-6 group hover:shadow-md transition-shadow">
                  <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-full bg-slate-50 border border-black/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                     {product.partner_org_logo ? (
                        <img src={toAssetUrl(product.partner_org_logo)} alt={product.partner_org_name} className="w-full h-full object-cover" />
                     ) : (
                        <ShoppingBag className="w-6 h-6 lg:w-10 lg:h-10 text-slate-300" />
                     )}
                  </div>
                  <div className="flex-1">
                     <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <CheckCircle2 size={10} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
                        </div>
                     </div>
                     <h3 className="text-sm lg:text-lg font-black text-[#000435] mt-1">{product.partner_org_name}</h3>
                     {product.partner_org_login && <p className="text-[10px] lg:text-xs font-bold text-slate-400 mt-0.5 opacity-80 italic">@{product.partner_org_login}</p>}
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
               </div>
            )}

            {/* Details Card */}
            <div className="bg-white rounded-2xl lg:rounded-[22px] border border-black/5 overflow-hidden shadow-sm p-6 lg:p-10">
               <h1 className="text-xl lg:text-3xl font-black text-[#000435] leading-tight mb-2 lg:mb-4">{product.name}</h1>
               <p className="text-2xl lg:text-3xl font-black text-[#f59e0b] mb-6 lg:mb-8">{formatMoney(product.price_rwf)}</p>
               
                <div>
                  <h3 className="text-[10px] lg:text-xs font-black text-slate-400 mb-2 lg:mb-3 border-b border-black/5 pb-2 lg:pb-3 uppercase tracking-widest">Product Description</h3>
                  <p className="text-sm font-medium text-[#000435]/80 leading-relaxed whitespace-pre-wrap">
                     {product.description || 'No detailed description provided by the vendor.'}
                  </p>
               </div>
            </div>
          </div>

          {/* Checkout Panel */}
          <div className="lg:col-span-5" id="checkout-panel">
            <div className="bg-white rounded-2xl lg:rounded-[22px] p-6 lg:p-8 shadow-sm lg:shadow-xl border border-black/5 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-[#000435] flex items-center gap-2 uppercase tracking-widest">
                   Checkout
                </h3>
              </div>
              
              <div className="space-y-6">
                {/* Quantity Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Quantity</label>
                    {product.max_quantity && (
                      <span className="text-[10px] font-black text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded-lg border border-[#f59e0b]/20">
                        Limit: {product.max_quantity}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-black/5 w-fit">
                    <button 
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-xl bg-white border border-black/10 flex items-center justify-center text-[#000435] hover:bg-gray-100 active:scale-90 transition-all font-black text-lg shadow-sm"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-black text-[#000435]">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(q => product.max_quantity ? Math.min(product.max_quantity, q + 1) : q + 1)}
                      className="w-10 h-10 rounded-xl bg-white border border-black/10 flex items-center justify-center text-[#000435] hover:bg-gray-100 active:scale-90 transition-all font-black text-lg shadow-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Payment Method</label>
                  <div className="flex flex-col gap-2">
                    <label className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${paymentMethod === 'direct' ? 'border-[#000435] bg-[#000435]/5 ring-1 ring-[#000435]' : 'border-black/10 hover:border-black/20'}`}>
                      <input type="radio" name="payment_method" value="direct" checked={paymentMethod === 'direct'} onChange={() => setPaymentMethod('direct')} className="accent-[#000435]" />
                      <div>
                        <p className="text-xs font-black text-[#000435]">Pay Directly (Mobile Money)</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">Pay full amount instantly</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${paymentMethod === 'ticha_avance' ? 'border-[#f59e0b] bg-[#f59e0b]/5 ring-1 ring-[#f59e0b]' : 'border-black/10 hover:border-black/20'}`}>
                      <input type="radio" name="payment_method" value="ticha_avance" checked={paymentMethod === 'ticha_avance'} onChange={() => setPaymentMethod('ticha_avance')} className="accent-[#f59e0b]" />
                      <div>
                        <p className="text-xs font-black text-[#000435]">Ticha Avance Financing</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">Pay in monthly installments</p>
                      </div>
                    </label>
                  </div>
                </div>

                {paymentMethod === 'direct' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Mobile Money Number</label>
                    <input 
                       type="tel"
                       placeholder="e.g. 0780000000"
                       value={paymentPhone}
                       onChange={(e) => setPaymentPhone(e.target.value)}
                       className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-4 text-sm font-bold outline-none focus:border-[#000435]/50 focus:bg-white transition-colors"
                    />
                  </div>
                )}

                {paymentMethod === 'ticha_avance' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Repayment Plan</label>
                    <select
                      className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-4 text-sm font-bold outline-none focus:border-[#f59e0b]/50 focus:bg-white transition-colors"
                      value={repayment}
                      onChange={(e) => setRepayment(Number(e.target.value))}
                    >
                      {REPAYMENT_OPTIONS.map((m) => (
                        <option key={m} value={m}>{m} Months Plan</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Delivery Option</label>
                  <div className="flex flex-col gap-2">
                    <label className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${deliveryMethod === 'agent_station' ? 'border-[#000435] bg-[#000435]/5' : 'border-black/10 hover:border-black/20'}`}>
                      <input type="radio" name="delivery_method" value="agent_station" checked={deliveryMethod === 'agent_station'} onChange={() => setDeliveryMethod('agent_station')} className="accent-[#000435]" />
                      <span className="text-xs font-black text-[#000435]">Pick up at Agent Station</span>
                    </label>
                    <label className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${deliveryMethod === 'school' ? 'border-[#000435] bg-[#000435]/5' : 'border-black/10 hover:border-black/20'}`}>
                      <input type="radio" name="delivery_method" value="school" checked={deliveryMethod === 'school'} onChange={() => setDeliveryMethod('school')} className="accent-[#000435]" />
                      <span className="text-xs font-black text-[#000435]">Deliver to my School</span>
                    </label>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-[24px] p-6 border border-black/5 space-y-4">
                   <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Financial Summary</h4>
                   
                   <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-bold text-slate-600">Item Price {quantity > 1 && `(x${quantity})`}</span>
                      <div className="flex-1 border-b border-dashed border-black/10 mt-1"></div>
                      <span className="text-sm font-black text-[#000435]">{formatMoney(principal)}</span>
                   </div>
                   
                   {paymentMethod === 'ticha_avance' ? (
                     <>
                       <div className="flex items-center justify-between gap-4">
                          <span className="text-xs font-bold text-slate-600">Est. Interest ({monthlyRatePercent}%/mo)</span>
                          <div className="flex-1 border-b border-dashed border-black/10 mt-1"></div>
                          <span className="text-sm font-black text-[#f59e0b]">{formatMoney(estTotalInterest)}</span>
                       </div>
                       
                       <div className="pt-4 mt-4 border-t border-black/5">
                          <div className="flex items-center justify-between gap-4">
                             <span className="text-xs font-black uppercase tracking-widest text-[#000435]">Monthly Payment</span>
                             <span className="text-lg font-black text-[#f59e0b]">{formatMoney(estMonthly)}</span>
                          </div>
                       </div>
                     </>
                   ) : (
                     <div className="pt-4 mt-4 border-t border-black/5">
                        <div className="flex items-center justify-between gap-4">
                           <span className="text-xs font-black uppercase tracking-widest text-[#000435]">Total Due</span>
                           <span className="text-lg font-black text-[#000435]">{formatMoney(principal)}</span>
                        </div>
                     </div>
                   )}
                </div>

                  <button
                    disabled={submitting}
                    onClick={submitRequest}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#0E1F35] text-white font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {submitting ? 'Processing...' : 'Complete Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
