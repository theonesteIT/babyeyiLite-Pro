import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Package, Loader2, ArrowLeft, Gift, Search } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-re-bg animate-in fade-in duration-500 pb-20">
      <div className="bg-[linear-gradient(135deg,#0E1F35,#1B3354)] border-b border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.15),transparent_50%)]" />
        <div className="max-w-[1200px] mx-auto px-6 py-12 relative z-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center shadow-inner border border-amber-500/30">
              <Gift size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-amber-500">Staff Benefit</p>
              <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Ticha <span className="text-amber-500">Deals</span></h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 md:px-6 mt-8">
        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700 shadow-sm animate-in fade-in">
            <p className="font-bold text-sm">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dealProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/ticha-deals/${p.id}`)}
                className="group rounded-xl border border-black/10 bg-white p-3 flex gap-3 items-start cursor-pointer transition-all hover:border-amber-500/40 hover:shadow-md"
              >
                <div className="relative w-16 h-16 rounded-lg border border-black/10 bg-re-bg overflow-hidden shrink-0 flex items-center justify-center">
                  {p.image_url ? (
                    <img src={toAssetUrl(p.image_url)} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <Package className="h-5 w-5 text-slate-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1 py-1">
                  <p className="text-sm font-semibold text-re-text leading-tight mb-0.5 line-clamp-2">{p.name}</p>
                  <p className="text-xs font-bold text-amber-600 mb-1.5">{formatMoney(p.price_rwf)}</p>
                  <span className="text-xs font-medium text-slate-500 group-hover:text-amber-600 transition-colors">
                    View Details
                  </span>
                </div>
              </div>
            ))}
            
            {!dealProducts.length && !loading && (
              <div className="col-span-full rounded-[24px] border border-dashed border-black/10 bg-white p-16 flex flex-col items-center justify-center text-center">
                <Package className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-sm font-bold text-re-text-muted">No products available at the moment.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
