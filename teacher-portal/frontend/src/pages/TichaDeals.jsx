import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Package, Loader2, ArrowRight, Heart, Zap, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

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
  // formatting like 265K if desired, but sticking to standard RWF formatting
  return `RWF ${Math.round(v).toLocaleString()}`;
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
      <div className="min-h-screen bg-re-bg flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-600" />
        <p className="text-re-text-muted text-xs font-medium animate-pulse">Loading Deals...</p>
      </div>
    );
  }

  // Group products for UI demonstration
  const featuredProduct = dealProducts[0] || null;
  const flashDeals = dealProducts.slice(1, 4);
  const discoverProducts = dealProducts.slice(4);

  return (
    <div className="min-h-screen bg-re-bg animate-in fade-in duration-500 pb-24">
      <div className="max-w-[800px] mx-auto px-4 md:px-6 pt-6">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700 shadow-sm animate-in fade-in">
            <p className="font-bold text-sm">{error}</p>
          </div>
        )}

        {/* Featured Card */}
        {featuredProduct && (
          <div 
            onClick={() => navigate(`/ticha-deals/${featuredProduct.id}`)}
            className="bg-white rounded-[20px]  flex gap-4 items-center cursor-pointer shadow-xl hover:shadow-2xl transition-all mb-8 border border-black/5"
          >
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-l-[20px] bg-black/5 border border-black/5 shrink-0 flex items-center justify-center p-2 relative overflow-hidden">
               <div className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md tracking-wide">
                 SALE
               </div>
               {featuredProduct.image_url ? (
                 <img src={toAssetUrl(featuredProduct.image_url)} alt={featuredProduct.name} className="w-full h-full  object-contain mix-blend-multiply" />
               ) : (
                 <Package className="h-8 w-8 text-re-text-muted/50" />
               )}
            </div>
            <div className="flex-1 py-2 pr-2">
              <span className="inline-block bg-amber-100 text-amber-600 text-[10px] px-2 py-0.5 rounded-md tracking-wide mb-2 uppercase">
                FEATURED
              </span>
              <h2 className="text-lg md:text-xl  text-re-text  mb-3 line-clamp-2">
                {featuredProduct.name}
              </h2>
              <div className="flex items-center justify-between">
                <span className="text-base md:text-lg  text-emerald-600">
                  {formatMoney(featuredProduct.price_rwf)}
                </span>
                <ChevronRight className="text-re-text-muted w-5 h-5" />
              </div>
            </div>
          </div>
        )}

        {/* Flash Deals Section */}
        {flashDeals.length > 0 && (
          <div className="mb-10">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-md  text-re-text leading-tight mb-1">Latest Deals</h2>
              </div>
              <button className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1">
                See All <ChevronRight size={14} />
              </button>
            </div>
            
            {/* Horizontal scroll container */}
            <div className="flex flex-col">
              {flashDeals.map((p,i) => (
                <div 
                  key={p.id}
                  onClick={() => navigate(`/ticha-deals/${p.id}`)}
                  className= {`flex w-full bg-amber-50/30 ${i === 0 ? 'rounded-t-[20px]' : i === flashDeals.length - 1 ? 'rounded-b-[20px]' : ''}  border border-amber-400 overflow-hidden cursor-pointer snap-start group shadow-sm hover:shadow-md transition-all relative`}
                >
                  <div className="aspect-square bg-amber-50 relative p-3">
                    {p.image_url ? (
                      <img src={toAssetUrl(p.image_url)} alt={p.name} className="w-22 h-22 object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-amber-200" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-white flex-1 flex flex-col justify-between">
                    <h3 className="text-xs  text-re-text leading-tight mb-3 line-clamp-2 h-8">
                      {p.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm  text-amber-500">
                        {formatMoney(p.price_rwf)}
                      </span>
                      <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <ArrowRight size={12} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discover Section */}
        {discoverProducts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-re-text">Discover</h2>
              <button className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-[14px] hover:bg-blue-100 transition-colors">
                Join as a Seller
              </button>
            </div>

            {/* Mock Vendor Block */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#8B2323] border border-black/10 shadow-sm flex items-center justify-center shrink-0 overflow-hidden text-amber-500 font-black text-[10px] text-center leading-none">
                  IZERE
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-black text-re-text leading-tight mb-0.5">Izere Quincaillerie</h3>
                  <p className="text-xs font-medium text-re-text-muted line-clamp-1">Delivering quality materials built t...</p>
                </div>
                <button className="text-xs font-bold text-re-text bg-black/5 px-4 py-2 rounded-xl hover:bg-black/10 transition-colors">
                  Visit
                </button>
              </div>
              
              {/* Horizontal scroll container for vendor products */}
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                {discoverProducts.map((p) => (
                  <div 
                    key={p.id}
                    onClick={() => navigate(`/ticha-deals/${p.id}`)}
                    className="shrink-0 w-[180px] md:w-[200px] bg-white rounded-[24px] overflow-hidden cursor-pointer snap-start group shadow-sm hover:shadow-md transition-all border border-black/5 relative aspect-square"
                  >
                    <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-md text-white text-[11px] font-black px-2.5 py-1 rounded-lg">
                      {formatMoney(p.price_rwf)}
                    </div>
                    {p.image_url ? (
                      <img src={toAssetUrl(p.image_url)} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-black/5">
                        <Package className="h-10 w-10 text-re-text-muted/50" />
                      </div>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); }}
                      className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all"
                    >
                      <Heart size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {!dealProducts.length && !loading && !error && (
          <div className="rounded-[24px] border border-dashed border-black/10 bg-white p-16 flex flex-col items-center justify-center text-center">
            <Package className="h-12 w-12 text-re-text-muted/50 mb-4" />
            <p className="text-sm font-bold text-re-text-muted">No products available at the moment.</p>
          </div>
        )}

      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
