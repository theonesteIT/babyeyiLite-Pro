import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Package, Loader2, ArrowRight, ShoppingBag, Tag, Star, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { createHref } from '../../lib/hrefFactory'
import TeacherOrangeHero from '../components/TeacherOrangeHero'

const UPLOADS_BASE = (import.meta.env.VITE_UPLOADS_BASE || import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/$/, '')

function toAssetUrl(pathLike) {
  if (!pathLike || typeof pathLike !== 'string') return null
  if (pathLike.startsWith('http://') || pathLike.startsWith('https://')) return pathLike
  const clean = pathLike.replace(/\\/g, '/')
  return `${UPLOADS_BASE}${clean.startsWith('/') ? clean : `/${clean}`}`
}

function formatMoney(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return `${Math.round(v).toLocaleString()} RWF`
}

export default function TichaDeals({ api, basePath, dealsHeroVariant = 'legacy', staffUser }) {
  const navigate = useNavigate()
  const h = useMemo(() => createHref(basePath || ''), [basePath])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dealProducts, setDealProducts] = useState([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const prodRes = await api.get('/services/shule-avance/teacher-deal-products')
      if (prodRes.data?.success) {
        setDealProducts(Array.isArray(prodRes.data.data) ? prodRes.data.data : [])
      }
    } catch (e) {
      setError('Could not load deals catalog. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    window.scrollTo(0, 0)
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f9] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#f59e0b]" />
        <p className="text-[#000435]/60 text-[10px] font-black uppercase tracking-widest animate-pulse">Loading Catalog...</p>
      </div>
    )
  }

  const featuredProduct = dealProducts[0] || null
  const popularDeals = dealProducts.slice(1)

  const heroFirst =
    staffUser?.first_name ||
    (typeof staffUser?.name === 'string' ? staffUser.name.split(/\s+/)[0] : null) ||
    'Teacher'

  return (
    <div className="min-h-screen bg-[#f0f2f9] pb-28 font-sans">

      {dealsHeroVariant === 'orange' ? (
        <TeacherOrangeHero
          title={`Welcome back, ${heroFirst}`}
          subtitle="Exclusive products — pay monthly from your payroll."
        >
          <button
            type="button"
            onClick={() => navigate(h('/ticha-deals/tracking'))}
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white border border-white/40 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 transition-all"
          >
            <ArrowRight size={11} /> Track my requests
          </button>
        </TeacherOrangeHero>
      ) : (
      <div className="relative overflow-hidden bg-gradient-to-br from-[#000435] to-[#0a116b] px-5 pt-10 pb-16 rounded-b-[36px] shadow-[0_12px_40px_rgba(0,4,53,0.18)]">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 15% 60%, #f59e0b 0%, transparent 55%), radial-gradient(circle at 85% 15%, #ffffff 0%, transparent 45%)' }} />

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner mb-4">
            <ShoppingBag size={26} className="text-[#f59e0b]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">TichaDeals</h1>
          <p className="text-white/65 text-xs md:text-sm font-semibold max-w-xs">
            Exclusive products — pay monthly from your payroll.
          </p>
          <button
            type="button"
            onClick={() => navigate(h('/ticha-deals/tracking'))}
            className="mt-5 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-300 hover:text-white border border-amber-400/30 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
          >
            <ArrowRight size={11} /> Track my requests
          </button>
        </div>
      </div>
      )}

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 -mt-8 relative z-20">

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-white p-4 flex items-center gap-3 text-red-600 shadow-lg">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <p className="font-bold text-xs">{error}</p>
          </div>
        )}

        {featuredProduct && (
          <div
            onClick={() => navigate(h(`/ticha-deals/${featuredProduct.id}`))}
            className="bg-white rounded-[22px] overflow-hidden cursor-pointer shadow-xl hover:shadow-2xl transition-all mb-6 border border-black/5 group active:scale-[0.99]"
          >
            <div className="flex flex-col sm:flex-row">
              <div className="w-full sm:w-[220px] h-[200px] sm:h-[220px] bg-slate-50 flex items-center justify-center relative overflow-hidden shrink-0">
                <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-[#f59e0b] to-[#ff7b00] text-white text-[10px] font-black px-2.5 py-1 rounded-lg tracking-widest uppercase shadow-md flex items-center gap-1">
                  <Star size={9} className="fill-white" /> Featured
                </div>
                {featuredProduct.image_url ? (
                  <img src={toAssetUrl(featuredProduct.image_url)} alt={featuredProduct.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700 p-6" />
                ) : (
                  <Package className="h-12 w-12 text-slate-300" />
                )}
              </div>
              <div className="flex-1 p-5 flex flex-col justify-between">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-[#000435] mb-2 line-clamp-2 leading-tight">
                    {featuredProduct.name}
                  </h2>
                  <p className="text-[12px] text-slate-500 font-semibold line-clamp-2 leading-relaxed">
                    {featuredProduct.description || 'Premium quality product available for you.'}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Price</p>
                    <span className="text-xl font-black text-[#f59e0b]">{formatMoney(featuredProduct.price_rwf)}</span>
                  </div>
                  <button type="button" className="flex items-center gap-2 px-5 py-3 bg-[#000435] text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-[#000435]/20 group-hover:bg-[#0a116b] transition-colors whitespace-nowrap active:scale-[0.97]">
                    View Deal <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {popularDeals.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4 px-1 mt-8">
              <h2 className="text-sm font-black text-[#000435] flex items-center gap-2 uppercase tracking-wider">
                <Tag size={15} className="text-[#f59e0b]" /> All Deals
              </h2>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{popularDeals.length} products</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {popularDeals.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(h(`/ticha-deals/${p.id}`))}
                  className="bg-white rounded-[18px] overflow-hidden cursor-pointer group shadow-sm hover:shadow-lg transition-all duration-300 border border-black/5 flex flex-col active:scale-[0.97]"
                >
                  <div className="aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center p-3">
                    {p.image_url ? (
                      <img src={toAssetUrl(p.image_url)} alt={p.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <Package className="h-10 w-10 text-slate-200" />
                    )}
                  </div>

                  <div className="p-3 flex-1 flex flex-col border-t border-slate-50/80">
                    <h3 className="text-xs font-black text-[#000435] leading-snug mb-2 line-clamp-2">{p.name}</h3>
                    <div className="mt-auto flex items-center justify-between gap-1">
                      <span className="text-sm font-black text-[#f59e0b] truncate">{formatMoney(p.price_rwf)}</span>
                      <div className="w-7 h-7 rounded-lg bg-[#000435]/5 text-[#000435] flex items-center justify-center shrink-0 group-hover:bg-[#f59e0b] group-hover:text-white transition-colors">
                        <ArrowRight size={13} />
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
  )
}
