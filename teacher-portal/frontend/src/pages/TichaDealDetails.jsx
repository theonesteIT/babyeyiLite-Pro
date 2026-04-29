import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Package, Loader2, ArrowLeft, Send, AlertCircle, CheckCircle2, ShoppingBag, X, ChevronRight } from 'lucide-react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';

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
  
  const showMobileCheckout = location.hash === '#checkout';

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
      <div className="min-h-screen bg-re-bg flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-600" />
        <p className="text-re-text-muted text-xs font-medium animate-pulse">Loading Details...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-re-bg flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-[32px] p-8 shadow-2xl max-w-md w-full text-center border border-black/5 animate-in fade-in zoom-in-95">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-re-text mb-2">Request Submitted!</h2>
          <p className="text-sm font-bold text-re-text-muted mb-8 leading-relaxed">
            Your application for <span className="text-re-text">{product?.name}</span> has been securely sent to school finance for approval.
          </p>
          <div className="space-y-3">
            <button onClick={() => navigate('/shule-avance')} className="w-full py-4 rounded-2xl bg-amber-600 text-white font-bold text-sm shadow-xl hover:bg-amber-700 transition-colors">
              Track Status in Shule Avance
            </button>
            <button onClick={() => navigate('/ticha-deals')} className="w-full py-4 rounded-2xl border border-black/10 text-re-text-muted font-bold text-sm hover:bg-re-bg transition-colors">
              Back to Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error && !product) {
     return (
       <div className="min-h-screen bg-re-bg flex flex-col items-center justify-center p-6 text-center">
         <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={32} />
         </div>
         <p className="text-sm font-bold text-re-text-muted mb-6">{error}</p>
         <button onClick={() => navigate('/ticha-deals')} className="px-6 py-3 rounded-2xl bg-white border border-black/10 text-re-text-muted font-bold text-sm shadow-sm hover:bg-re-bg transition-colors">
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
    <div className="min-h-screen bg-re-bg animate-in fade-in duration-500 pb-28 lg:pb-20">
      <div className="max-w-[1200px] mx-auto px-4 lg:px-6 mt-4 lg:mt-10">
        {error && (
          <div className="mb-0 lg:mb-6 mx-4 lg:mx-0 mt-4 lg:mt-0 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 shadow-sm animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-12">
          {/* Product Image & Details */}
          <div className={`lg:col-span-7 space-y-4 lg:space-y-8 ${showMobileCheckout ? 'hidden lg:block' : 'block'}`}>
            {/* Image Card (Slideshow) */}
            <div className="bg-white rounded-2xl lg:rounded-[22px] border border-black/5 overflow-hidden shadow-sm relative group">
               <div className="aspect-[3/2] lg:aspect-[4/3] bg-re-bg relative flex items-center justify-center p-6 md:p-12 overflow-hidden">
                  {product.media && product.media.length > 0 ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={toAssetUrl(product.media[activeImageIdx]?.url || product.image_url)} 
                        alt={product.name} 
                        className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-500" 
                      />
                      
                      {product.media.length > 1 && (
                        <>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 p-2 rounded-full bg-black/10 backdrop-blur-md z-10">
                            {product.media.map((_, i) => (
                              <button 
                                key={i} 
                                onClick={() => setActiveImageIdx(i)}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImageIdx ? 'bg-amber-600 w-4' : 'bg-white/50 hover:bg-white'}`} 
                              />
                            ))}
                          </div>
                          
                          {/* Navigation Arrows */}
                          <button 
                            onClick={() => setActiveImageIdx(prev => (prev > 0 ? prev - 1 : product.media.length - 1))}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-re-text opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ArrowLeft size={20} />
                          </button>
                          <button 
                            onClick={() => setActiveImageIdx(prev => (prev < product.media.length - 1 ? prev + 1 : 0))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-re-text opacity-0 group-hover:opacity-100 transition-opacity"
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
                    <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm border border-black/5 text-[10px] font-black text-re-text uppercase tracking-wider shadow-sm">
                      {product.category}
                    </span>
                  )}
                  {product.product_code && (
                    <span className="px-3 py-1 rounded-full bg-[#0E1F35] text-white text-[10px] font-bold tracking-wider shadow-sm">
                      {product.product_code}
                    </span>
                  )}
               </div>
            </div>

            {/* Partner Card */}
            {product.partner_org_name && (
               <div className="bg-white rounded-2xl lg:rounded-[22px] border border-black/5 overflow-hidden shadow-sm p-4 lg:p-6 flex items-center gap-4 lg:gap-6 group hover:shadow-md transition-shadow">
                  <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-full bg-re-bg border border-black/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                     {product.partner_org_logo ? (
                        <img src={toAssetUrl(product.partner_org_logo)} alt={product.partner_org_name} className="w-full h-full object-cover" />
                     ) : (
                        <ShoppingBag className="w-6 h-6 lg:w-10 lg:h-10 text-re-text-muted/30" />
                     )}
                  </div>
                  <div className="flex-1">
                     <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <CheckCircle2 size={10} />
                          <span className="text-[10px] font-black uppercase tracking-tight">Verified Supplier</span>
                        </div>
                        <div className="h-1 flex-1 border-b border-dashed border-black/5"></div>
                     </div>
                     <h3 className="text-sm lg:text-lg font-black text-re-text mt-1">{product.partner_org_name}</h3>
                     {product.partner_org_login && <p className="text-[10px] lg:text-xs font-bold text-re-text-muted mt-0.5 opacity-60 italic">@{product.partner_org_login}</p>}
                  </div>
                  <ChevronRight size={20} className="text-re-text-muted/40 group-hover:translate-x-1 transition-transform" />
               </div>
            )}

            {/* Details Card */}
            <div className="bg-white rounded-2xl lg:rounded-[22px] border border-black/5 overflow-hidden shadow-sm p-6 lg:p-10">
               <h1 className="text-xl lg:text-3xl font-bold text-re-text leading-tight mb-2 lg:mb-4">{product.name}</h1>
               <p className="text-xl lg:text-2xl font-bold text-amber-600 mb-6 lg:mb-8">{formatMoney(product.price_rwf)}</p>
               
                <div>
                  <h3 className="text-[10px] lg:text-xs font-semibold text-re-text-muted mb-2 lg:mb-3 border-b border-black/5 pb-2 lg:pb-3 uppercase tracking-wider">Product Description</h3>
                  <p className="text-sm font-medium text-re-text/80 leading-relaxed whitespace-pre-wrap">
                     {product.description || 'No detailed description provided by the vendor.'}
                  </p>
               </div>
            </div>
          </div>

          {/* Checkout Panel */}
          <div className={`lg:col-span-5 ${showMobileCheckout ? 'block' : 'hidden lg:block'}`} id="checkout-panel">
            <div className="bg-white rounded-2xl lg:rounded-[22px] p-6 lg:p-8 shadow-sm lg:shadow-xl border border-black/5 lg:sticky lg:top-24 min-h-screen lg:min-h-0">
              <div className="hidden lg:flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-re-text flex items-center gap-2">
                   Checkout Details
                </h3>
              </div>
              
              <div className="space-y-6">
                {/* Quantity Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-re-text-muted">Quantity</label>
                    {product.max_quantity && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        Limit: {product.max_quantity}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 bg-re-bg p-2 rounded-2xl border border-black/5 w-fit">
                    <button 
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-xl bg-white border border-black/10 flex items-center justify-center text-re-text hover:bg-gray-50 active:scale-90 transition-all"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-black text-re-text">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(q => product.max_quantity ? Math.min(product.max_quantity, q + 1) : q + 1)}
                      className="w-10 h-10 rounded-xl bg-white border border-black/10 flex items-center justify-center text-re-text hover:bg-gray-50 active:scale-90 transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-re-text-muted">Payment Method</label>
                  <div className="flex flex-col gap-2">
                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'direct' ? 'border-emerald-500 bg-emerald-50' : 'border-black/10 hover:border-black/20'}`}>
                      <input type="radio" name="payment_method" value="direct" checked={paymentMethod === 'direct'} onChange={() => setPaymentMethod('direct')} className="accent-emerald-600" />
                      <div>
                        <p className="text-xs font-bold text-emerald-800">Pay Directly (Mobile Money)</p>
                        <p className="text-[10px] font-medium text-emerald-600/70">Pay full amount instantly</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'ticha_avance' ? 'border-amber-500 bg-amber-50' : 'border-black/10 hover:border-black/20'}`}>
                      <input type="radio" name="payment_method" value="ticha_avance" checked={paymentMethod === 'ticha_avance'} onChange={() => setPaymentMethod('ticha_avance')} className="accent-amber-600" />
                      <div>
                        <p className="text-xs font-bold text-amber-800">Ticha Avance Financing</p>
                        <p className="text-[10px] font-medium text-amber-600/70">Pay in monthly installments</p>
                      </div>
                    </label>
                  </div>
                </div>

                {paymentMethod === 'direct' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-300">
                    <label className="text-xs font-semibold text-re-text-muted">Mobile Money Number</label>
                    <input 
                       type="tel"
                       placeholder="e.g. 0780000000"
                       value={paymentPhone}
                       onChange={(e) => setPaymentPhone(e.target.value)}
                       className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm font-semibold outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                )}

                {paymentMethod === 'ticha_avance' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-300">
                    <label className="text-xs font-semibold text-re-text-muted">Repayment Plan</label>
                    <select
                      className="w-full rounded-2xl border border-black/10 bg-re-bg px-4 py-3.5 text-sm font-semibold outline-none focus:border-amber-500/30 transition-colors"
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
                  <label className="text-xs font-semibold text-re-text-muted">Delivery Option</label>
                  <div className="flex flex-col gap-2">
                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${deliveryMethod === 'agent_station' ? 'border-[#0E1F35] bg-[#0E1F35]/5' : 'border-black/10 hover:border-black/20'}`}>
                      <input type="radio" name="delivery_method" value="agent_station" checked={deliveryMethod === 'agent_station'} onChange={() => setDeliveryMethod('agent_station')} className="accent-[#0E1F35]" />
                      <span className="text-xs font-bold text-re-text">Pick up at Agent Station</span>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${deliveryMethod === 'school' ? 'border-[#0E1F35] bg-[#0E1F35]/5' : 'border-black/10 hover:border-black/20'}`}>
                      <input type="radio" name="delivery_method" value="school" checked={deliveryMethod === 'school'} onChange={() => setDeliveryMethod('school')} className="accent-[#0E1F35]" />
                      <span className="text-xs font-bold text-re-text">Deliver to my School</span>
                    </label>
                  </div>
                </div>

                <div className="bg-re-bg rounded-[20px] p-5 border border-black/5 space-y-4">
                   <h4 className="text-xs font-semibold text-re-text-muted text-center mb-2">Financial Preview</h4>
                   
                   <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-bold text-re-text-muted">Item Price {quantity > 1 && `(x${quantity})`}</span>
                      <div className="flex-1 border-b border-dashed border-black/10 mt-1"></div>
                      <span className="text-sm font-bold text-re-text">{formatMoney(principal)}</span>
                   </div>
                   
                   {paymentMethod === 'ticha_avance' ? (
                     <>
                       <div className="flex items-center justify-between gap-4">
                          <span className="text-[10px] font-bold text-re-text-muted">Est. Interest ({monthlyRatePercent}%/mo)</span>
                          <div className="flex-1 border-b border-dashed border-black/10 mt-1"></div>
                          <span className="text-sm font-bold text-re-orange">{formatMoney(estTotalInterest)}</span>
                       </div>
                       
                       <div className="pt-4 mt-2 border-t border-black/5">
                          <div className="flex items-center justify-between gap-4">
                             <span className="text-sm font-semibold text-amber-600">Est. Monthly Deduction</span>
                             <span className="text-lg font-bold text-amber-600">{formatMoney(estMonthly)}</span>
                          </div>
                       </div>
                     </>
                   ) : (
                     <div className="pt-4 mt-2 border-t border-black/5">
                        <div className="flex items-center justify-between gap-4">
                           <span className="text-sm font-semibold text-emerald-600">Total Due</span>
                           <span className="text-lg font-bold text-emerald-600">{formatMoney(principal)}</span>
                        </div>
                     </div>
                   )}
                </div>

                  <button
                    disabled={submitting}
                    onClick={submitRequest}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#0E1F35] text-white font-bold text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {submitting ? 'Processing...' : 'Apply for this Deal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Button */}
      {!showMobileCheckout && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-black/5 z-50 lg:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-full duration-300">
          <button 
            onClick={() => {
              navigate('#checkout');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0E1F35] text-white font-medium text-xs shadow-xl active:scale-95 transition-all"
          >
            Continue to Checkout
            <ChevronRight size={16} />

          </button>
        </div>
      )}
    </div>
  );
}
