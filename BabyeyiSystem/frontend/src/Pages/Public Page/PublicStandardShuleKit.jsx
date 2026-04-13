import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Package,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { getApiBase, getApiOrigin } from '../../utils/apiBase';

const API = getApiBase();
const UPLOADS_BASE = import.meta.env.VITE_UPLOADS_BASE || getApiOrigin();

function toAssetUrl(p) {
  if (!p || typeof p !== 'string') return null;
  const path = p.replace(/\\/g, '/').trim();
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = UPLOADS_BASE.replace(/\/$/, '');
  return base + (path.startsWith('/') ? path : `/${path}`);
}

function formatFrw(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${Number(n).toLocaleString('en-RW')} Frw`;
}

export default function PublicStandardShuleKit() {
  const [loading, setLoading] = useState(true);
  const [kits, setKits] = useState([]);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API}/standard-shule-kits/public/kits`);
      const j = await r.json();
      if (!j?.success) { setError(j?.message || 'Could not load kits'); setKits([]); return; }
      setKits(Array.isArray(j.data) ? j.data : []);
    } catch { setError('Network error. Please try again.'); setKits([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="bg-[#000435] border-b-4 border-amber-400">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/80 hover:bg-white/10 min-h-[44px] mb-8"
          >
            <ArrowLeft size={16} /> All services
          </Link>

          <div className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 mb-4">
            <Sparkles size={14} className="text-amber-400" />
            <span className="text-xs font-black uppercase tracking-widest text-amber-400">Standard ShuleKit</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight max-w-2xl">
            Pre-determined kits<br />that fit your <span className="text-amber-400">grade.</span>
          </h1>
          <p className="mt-4 text-white/60 text-sm sm:text-base leading-relaxed max-w-xl">
            Browse Babyeyi standard kits by level. Line items and totals are set by Babyeyi — consistent pricing for Nursery through A-Level.
          </p>

          <div className="mt-6">
            <Link
              to="/pay-by-school?intent=classkit"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-amber-400/40 bg-amber-400/10 px-5 py-3 text-sm font-black text-amber-400 hover:border-amber-400 hover:bg-amber-400/20 min-h-[48px] transition"
            >
              Custom ShuleKit (school code) →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-800">{error}</div>
        ) : kits.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 px-6 py-14 text-center">
            <Package className="w-12 h-12 text-amber-300 mx-auto mb-3" />
            <p className="text-base font-black text-[#000435]">Standard kits are not published yet</p>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
              When Super Admin sets kits to <strong>active</strong>, they will appear here. You can still use{' '}
              <Link to="/pay-by-school?intent=classkit" className="font-bold text-amber-600 underline">Custom ShuleKit</Link>{' '}
              with your school code.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {kits.map((k) => {
              const expanded = openId === k.id;
              return (
                <article
                  key={k.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col transition hover:border-amber-400 hover:shadow-md"
                >
                  {/* Card top */}
                  <div className="flex flex-col sm:flex-row sm:items-stretch">
                    {/* Image */}
                    <div className="h-44 sm:w-40 sm:h-auto bg-[#000435] shrink-0 relative">
                      {k.cover_image_url || k.image_url ? (
                        <img
                          src={toAssetUrl(k.cover_image_url || k.image_url)}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ImageIcon className="w-10 h-10 text-amber-400/40" />
                        </div>
                      )}
                      {/* Grade badge overlay */}
                      <div className="absolute top-3 left-3 rounded-lg bg-amber-400 px-2.5 py-1">
                        <span className="text-[10px] font-black uppercase tracking-wide text-[#000435]">Kit</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-5 flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-lg font-black text-[#000435]">{k.grade_level}</h2>
                        <span className="text-sm font-black text-amber-600 whitespace-nowrap shrink-0">
                          {formatFrw(k.total_frw)}
                        </span>
                      </div>
                      {k.description && (
                        <p className="mt-2 text-sm text-slate-500 leading-relaxed line-clamp-3">{k.description}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => setOpenId(expanded ? null : k.id)}
                        className="mt-auto pt-4 inline-flex items-center gap-2 text-sm font-bold text-[#000435] hover:text-amber-600 min-h-[44px] self-start transition"
                      >
                        {expanded ? (
                          <><ChevronUp size={17} className="text-amber-500" /> Hide items</>
                        ) : (
                          <><ChevronDown size={17} className="text-amber-500" /> What's included</>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded items */}
                  {expanded && (
                    <div className="border-t-2 border-amber-400 bg-amber-50/50 px-5 py-5">
                      <ul className="space-y-3">
                        {(k.requirements || []).map((r) => {
                          const qty = r.quantity != null ? Math.max(1, Number(r.quantity)) : 1;
                          const unit = Number(r.amount_frw);
                          const line = r.line_total_frw != null ? Number(r.line_total_frw) : unit * qty;
                          return (
                            <li
                              key={r.id}
                              className="flex gap-3 border-b border-amber-100 pb-3 last:border-0 last:pb-0"
                            >
                              {r.image_url ? (
                                <img
                                  src={toAssetUrl(r.image_url)}
                                  alt=""
                                  className="h-14 w-14 rounded-xl object-cover border-2 border-amber-100 shrink-0"
                                />
                              ) : (
                                <div className="h-14 w-14 rounded-xl bg-[#000435] border-2 border-amber-100 shrink-0 flex items-center justify-center">
                                  <ImageIcon className="w-5 h-5 text-amber-400/60" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="font-bold text-[#000435] text-sm block">{r.title}</span>
                                <span className="text-xs text-slate-400 mt-0.5 block">{formatFrw(unit)} × {qty}</span>
                              </div>
                              <span className="font-black text-[#000435] text-sm shrink-0 self-start">{formatFrw(line)}</span>
                            </li>
                          );
                        })}
                      </ul>

                      {/* Total row */}
                      <div className="mt-4 flex justify-between items-center rounded-xl bg-[#000435] px-4 py-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-white/60">Total</span>
                        <span className="text-base font-black text-amber-400">{formatFrw(k.total_frw)}</span>
                      </div>
                      <Link
                        to={`/standard-kit/request/${k.id}`}
                        className="mt-3 inline-flex items-center justify-center rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-[#000435] hover:bg-amber-300 min-h-[44px]"
                      >
                        Select this kit
                      </Link>

                      <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                        For school-specific class kits, use{' '}
                        <Link to="/pay-by-school?intent=classkit" className="font-bold text-amber-600 underline">Custom ShuleKit</Link>{' '}
                        with your school code.
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}