import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Package, Loader2, ArrowRight, Heart, ShoppingBag, ChevronRight, Tag, Star, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export default function TichaDeals() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dealProducts, setDealProducts] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const prodRes = await api.get('/services/shule-avance/teacher-deal-products');
      if (prodRes.data?.success) {
        setDealProducts(Array.isArray(prodRes.data.data) ? prodRes.data.data : []);
      }
    } catch (e) {
      setError('Could not load deals catalog. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f9] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#f59e0b]" />
        <p className="text-[#000435]/60 text-[10px] font-black uppercase tracking-widest animate-pulse">Loading Catalog...</p>
      </div>
    );
  }

  const featuredProduct = dealProducts[0] || null;
  const popularDeals = dealProducts.slice(1);

  return (
    <div className="min-h-screen bg-[#f0f2f9] pb-24 font-sans">
      
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#000435] to-[#0a116b] min-h-[260px] px-6 py-12 rounded-b-[40px] shadow-[0_10px_40px_rgba(0,4,53,0.15)]">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #f59e0b 0%, transparent 50%), radial-gradient(circle at 80% 20%, #ffffff 0%, transparent 40%)' }} />
        
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center mt-4">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner mb-4">
            <ShoppingBag size={28} className="text-[#f59e0b]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
            Teacher <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f59e0b] to-[#fbbf24]">Deals</span>
          </h1>
          <p className="text-white/70 text-xs md:text-sm font-bold max-w-sm px-4">
            Exclusive discounts and credit purchases directly from your payroll.
          </p>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 -mt-10 relative z-20">
        
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-white p-4 flex items-center gap-3 text-red-600 shadow-lg">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
               <AlertTriangle size={20} />
            </div>
            <p className="font-bold text-xs">{error}</p>
          </div>
        )}

        {/* ── Featured Deal ── */}
        {featuredProduct && (
          <div 
            onClick={() => navigate(`/ticha-deals/${featuredProduct.id}`)}
            className="bg-white rounded-[24px] p-2 flex flex-col sm:flex-row gap-4 items-center cursor-pointer shadow-xl hover:shadow-2xl transition-all mb-8 border border-black/5 group overflow-hidden"
          >
            <div className="w-full sm:w-[240px] h-[220px] sm:h-[240px] rounded-[20px] bg-slate-50 flex items-center justify-center relative overflow-hidden shrink-0">
               <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-[#f59e0b] to-[#ff7b00] text-white text-[10px] font-black px-3 py-1 rounded-lg tracking-widest uppercase shadow-md flex items-center gap-1">
                 <Star size={10} className="fill-white" /> Featured
               </div>
               {featuredProduct.image_url ? (
                 <img src={toAssetUrl(featuredProduct.image_url)} alt={featuredProduct.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700 p-6" />
               ) : (
                 <Package className="h-12 w-12 text-slate-300" />
               )}
            </div>
            
            <div className="flex-1 p-4 sm:p-2 text-center sm:text-left flex flex-col justify-center">
              <h2 className="text-xl md:text-3xl font-black text-[#000435] mb-2 line-clamp-2 leading-tight">
                {featuredProduct.name}
              </h2>
              <p className="text-[13px] text-slate-500 font-bold line-clamp-2 mb-6 max-w-md mx-auto sm:mx-0">
                {featuredProduct.description || 'Premium quality product available for you.'}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto border-t border-slate-100 pt-4">
                <div className="text-center sm:text-left">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Price</p>
                   <span className="text-2xl font-black text-[#f59e0b]">
                     {formatMoney(featuredProduct.price_rwf)}
                   </span>
                </div>
                
                <button className="w-full sm:w-auto px-8 py-3.5 bg-[#000435] text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-[#000435]/20 flex items-center justify-center gap-2 group-hover:bg-[#0a116b] transition-colors">
                   View Deal <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Popular Deals Grid ── */}
        {popularDeals.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6 px-2 mt-10">
              <h2 className="text-lg font-black text-[#000435] flex items-center gap-2 uppercase tracking-tight">
                 <Tag size={18} className="text-[#f59e0b]" /> All Deals
              </h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
              {popularDeals.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => navigate(`/ticha-deals/${p.id}`)}
                  className="bg-white rounded-[20px] overflow-hidden cursor-pointer group shadow-sm hover:shadow-xl transition-all border border-black/5 flex flex-col relative"
                >
                  <div className="absolute top-2 right-2 z-10 w-8 h-8 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                     <Heart size={14} />
                  </div>
                  
                  <div className="aspect-square bg-slate-50 relative p-4 flex items-center justify-center">
                    {p.image_url ? (
                      <img src={toAssetUrl(p.image_url)} alt={p.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <Package className="h-10 w-10 text-slate-300" />
                    )}
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col border-t border-slate-50">
                    <h3 className="text-[13px] font-black text-[#000435] leading-snug mb-3 line-clamp-2">
                      {p.name}
                    </h3>
                    
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-[13px] font-black text-[#f59e0b]">
                        {formatMoney(p.price_rwf)}
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-[#000435]/5 text-[#000435] flex items-center justify-center shrink-0 group-hover:bg-[#f59e0b] group-hover:text-white transition-colors">
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!dealProducts.length && !loading && !error && (
          <div className="rounded-[32px] border-2 border-dashed border-black/5 bg-white p-12 flex flex-col items-center justify-center text-center mt-10 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <Package className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-[#000435] mb-2">No Deals Yet</h3>
            <p className="text-xs font-bold text-slate-400 max-w-xs">Check back later for exclusive discounts and new product arrivals.</p>
          </div>
        )}

      </div>
    </div>
  );
}
