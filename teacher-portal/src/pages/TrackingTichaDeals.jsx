import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Loader2, ArrowLeft, Package, ChevronRight, Clock, CheckCircle2,
  AlertCircle, Truck, Shield, MapPin, School, Store, RefreshCw,
  ShoppingBag, TrendingUp, Calendar, Banknote, X, ChevronDown,
  ChevronUp, ExternalLink, Circle, ArrowRight, Sparkles, Tag,
} from 'lucide-react';

const UPLOADS_BASE = (
  import.meta.env.VITE_UPLOADS_BASE ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5100'
).replace(/\/$/, '');

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

/** Montserrat is linked in `teacher-portal/index.html` */
const PAGE_FONT_FAMILY = "'Montserrat', system-ui, sans-serif";

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/* ─────────────────────────────────────────
   STATUS PIPELINE CONFIG
   order matters — it's the timeline sequence
───────────────────────────────────────── */
const PIPELINE = [
  {
    key: 'pending_accountant',
    label: 'Submitted',
    short: 'Submitted',
    description: 'Your request has been received and is queued for finance review.',
    color: '#F59E0B',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-300',
    textClass: 'text-amber-700',
    Icon: Clock,
  },
  {
    key: 'sent_to_manager',
    label: 'With Manager',
    short: 'Manager',
    description: 'Finance forwarded your request to the school manager for sign-off.',
    color: '#3B82F6',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-300',
    textClass: 'text-blue-700',
    Icon: Shield,
  },
  {
    key: 'approved',
    label: 'Approved',
    short: 'Approved',
    description: 'Your request has been approved! Fulfilment / delivery is next.',
    color: '#10B981',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-300',
    textClass: 'text-emerald-700',
    Icon: CheckCircle2,
  },
  {
    key: 'dispatched',
    label: 'Dispatched',
    short: 'Dispatched',
    description: 'Your item is on its way to you.',
    color: '#8B5CF6',
    bgClass: 'bg-violet-50',
    borderClass: 'border-violet-300',
    textClass: 'text-violet-700',
    Icon: Truck,
  },
  {
    key: 'delivered',
    label: 'Delivered',
    short: 'Delivered',
    description: 'Your item has been delivered successfully.',
    color: '#10B981',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-300',
    textClass: 'text-emerald-700',
    Icon: CheckCircle2,
  },
];

const REJECTED_STATUSES = ['rejected_by_accountant', 'rejected_by_manager'];

/* Get the pipeline index for a status (0-based) */
function getPipelineIndex(status) {
  const idx = PIPELINE.findIndex(p => p.key === status);
  return idx; // -1 if not in pipeline (e.g. rejected)
}

/* Get config for any status (including rejected) */
function getStatusConfig(status) {
  const found = PIPELINE.find(p => p.key === status);
  if (found) return found;
  if (REJECTED_STATUSES.includes(status)) {
    return {
      key: status,
      label: status === 'rejected_by_accountant' ? 'Declined by Finance' : 'Declined by Manager',
      short: 'Declined',
      description: status === 'rejected_by_accountant'
        ? 'School finance did not approve this request. See notes below.'
        : 'The school manager declined this request. See feedback below.',
      color: '#EF4444',
      bgClass: 'bg-red-50',
      borderClass: 'border-red-300',
      textClass: 'text-red-700',
      Icon: AlertCircle,
    };
  }
  return PIPELINE[0];
}

function parseSnapshot(row) {
  try {
    if (!row?.deal_products_snapshot_json) return [];
    const j = JSON.parse(row.deal_products_snapshot_json);
    return Array.isArray(j) ? j : [];
  } catch { return []; }
}

function getDeliveryInfo(row) {
  const meta = row.metadata || {};
  const method = meta.delivery_method || row.delivery_method || null;
  return {
    method,
    agentName: meta.agent_name || row.agent_name || null,
    agentLocation: meta.agent_location || row.agent_location || null,
    schoolName: meta.school_name || row.school_name || null,
    schoolLocation: [meta.province, meta.district, meta.sector].filter(Boolean).join(' · ') || null,
  };
}

function getPaymentType(row) {
  const meta = row.metadata || {};
  return meta.payment_method || row.payment_method || 'direct';
}

/* ─────────────────────────────────────────
   PIPELINE PROGRESS BAR
───────────────────────────────────────── */
function PipelineBar({ currentStatus }) {
  const isRejected = REJECTED_STATUSES.includes(currentStatus);
  const currentIdx = getPipelineIndex(currentStatus);

  const steps = PIPELINE.slice(0, -1); // stop at 'dispatched', show delivered as end

  return (
    <div className="flex items-start gap-0 pt-1">
      {PIPELINE.map((step, i) => {
        const done = !isRejected && currentIdx > i;
        const active = !isRejected && currentIdx === i;
        const future = !done && !active;

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              {/* Circle */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all
                ${done
                  ? 'bg-amber-400 border-amber-400'
                  : active
                    ? 'bg-[#000435] border-amber-400'
                    : 'bg-white border-slate-200'
                }`}
                style={active ? { boxShadow: '0 0 0 3px rgba(245,158,11,0.2)' } : {}}
              >
                {done
                  ? <CheckCircle2 size={13} className="text-[#000435]" strokeWidth={2.5} />
                  : active
                    ? <step.Icon size={12} className="text-amber-400" />
                    : <Circle size={10} className="text-slate-300" />
                }
              </div>
              {/* Label — hidden on xs, shown sm+ */}
              <span className={`hidden sm:block text-[8px] font-black uppercase tracking-wider mt-1 text-center leading-none
                ${done ? 'text-amber-500' : active ? 'text-[#000435]' : 'text-slate-300'}`}>
                {step.short}
              </span>
            </div>
            {/* Connector */}
            {i < PIPELINE.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 rounded-full overflow-hidden bg-slate-200">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: done ? '100%' : active ? '50%' : '0%',
                    background: 'linear-gradient(90deg, #F59E0B, #D97706)',
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────
   DELIVERY ACTION CARD
───────────────────────────────────────── */
function DeliveryAction({ row, status }) {
  const delivery = getDeliveryInfo(row);
  const isApproved = ['approved', 'dispatched', 'delivered'].includes(status);
  const isDelivered = status === 'delivered';
  const isDispatched = status === 'dispatched';

  if (!isApproved) return null;

  if (delivery.method === 'agent_station') {
    return (
      <div className={`rounded-2xl border-2 overflow-hidden ${
        isDelivered ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'
      }`}>
        <div className={`px-4 py-2.5 flex items-center gap-2 ${
          isDelivered ? 'bg-emerald-500' : 'bg-[#000435]'
        }`}>
          <Store size={14} className="text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-white">
            {isDelivered ? 'Picked Up — Done!' : 'Action Required: Pick Up at Agent'}
          </span>
        </div>
        <div className="p-4">
          {delivery.agentName && (
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Store size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="font-black text-[#000435] text-sm">{delivery.agentName}</p>
                {delivery.agentLocation && <p className="text-xs text-slate-500 font-semibold mt-0.5">{delivery.agentLocation}</p>}
              </div>
            </div>
          )}
          {!isDelivered && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-100 border border-amber-200">
              <MapPin size={14} className="text-amber-700 flex-shrink-0" />
              <p className="text-xs font-bold text-amber-900">
                {isDispatched
                  ? 'Your item has been dispatched — please go to your chosen agent station to collect it.'
                  : 'Once approved and dispatched, go to your chosen agent station to collect your item.'}
              </p>
            </div>
          )}
          {isDelivered && (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <p className="text-sm font-black text-emerald-700">Item collected successfully.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (delivery.method === 'school') {
    return (
      <div className={`rounded-2xl border-2 overflow-hidden ${
        isDelivered ? 'border-emerald-300 bg-emerald-50' : 'border-blue-300 bg-blue-50'
      }`}>
        <div className={`px-4 py-2.5 flex items-center gap-2 ${
          isDelivered ? 'bg-emerald-500' : 'bg-blue-600'
        }`}>
          <School size={14} className="text-white" />
          <span className="text-[10px] font-black uppercase tracking-wider text-white">
            {isDelivered ? 'Delivered to School ✓' : 'Delivery to School'}
          </span>
        </div>
        <div className="p-4">
          {delivery.schoolName && (
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <School size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="font-black text-[#000435] text-sm">{delivery.schoolName}</p>
                {delivery.schoolLocation && <p className="text-xs text-slate-500 font-semibold mt-0.5">{delivery.schoolLocation}</p>}
              </div>
            </div>
          )}
          {!isDelivered && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-100 border border-blue-200">
              <Truck size={14} className="text-blue-700 flex-shrink-0" />
              <p className="text-xs font-bold text-blue-900">
                {isDispatched
                  ? 'Your item is on its way to your school. Your administrator will notify you on arrival.'
                  : 'Your item will be delivered to your school after dispatch. Your administrator will notify you.'}
              </p>
            </div>
          )}
          {isDelivered && (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <p className="text-sm font-black text-emerald-700">Item delivered to your school.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

/* ─────────────────────────────────────────
   SINGLE DEAL CARD
───────────────────────────────────────── */
function DealCard({ row, index, navigate }) {
  const [expanded, setExpanded] = useState(false);
  const products = parseSnapshot(row);
  const status = row.status || 'pending_accountant';
  const cfg = getStatusConfig(status);
  const isRejected = REJECTED_STATUSES.includes(status);
  const payType = getPaymentType(row);
  const delivery = getDeliveryInfo(row);
  const pipelineIdx = getPipelineIndex(status);
  const isApproved = ['approved', 'dispatched', 'delivered'].includes(status);
  const isDelivered = status === 'delivered';
  const firstProduct = products[0] || null;

  const dateStr = fmtDate(row.submitted_at || row.created_at);

  return (
    <div
      className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl"
      style={{ animationDelay: `${index * 80}ms`, animation: 'cardIn 0.4s cubic-bezier(.22,1,.36,1) both' }}
    >
      {/* Status accent bar */}
      <div
        className="h-1 w-full"
        style={{ background: isRejected ? '#EF4444' : cfg.color }}
      />

      {/* Main row */}
      <div className="p-5">
        <div className="flex items-start gap-4">

          {/* Product image */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
            {firstProduct?.image_url
              ? <img src={toAssetUrl(firstProduct.image_url)} alt="" className="w-full h-full object-contain p-1.5" />
              : <Package className="w-8 h-8 text-slate-300" />
            }
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Status badge */}
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider mb-2 ${cfg.bgClass} ${cfg.borderClass} ${cfg.textClass}`}>
              <cfg.Icon size={11} />
              {cfg.label}
              {isDelivered && <Sparkles size={10} />}
            </div>

            {/* Product names */}
            <p className="text-sm font-black text-[#000435] leading-snug line-clamp-2 mb-1">
              {products.map(p => p.name).filter(Boolean).join(' · ') || row.purpose || 'Teacher Deal'}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs font-black text-amber-500">{formatMoney(row.amount_rwf)}</span>
              <span className="text-slate-300 text-xs">·</span>
              <span className="text-[11px] text-slate-400 font-semibold">{dateStr}</span>
              {payType === 'ticha_avance' && (
                <>
                  <span className="text-slate-300 text-xs">·</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-[#000435]/6 text-[#000435] border border-[#000435]/10">
                    <TrendingUp size={9} /> Avance
                  </span>
                </>
              )}
              {delivery.method === 'agent_station' && (
                <>
                  <span className="text-slate-300 text-xs">·</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                    <Store size={9} /> Agent pickup
                  </span>
                </>
              )}
              {delivery.method === 'school' && (
                <>
                  <span className="text-slate-300 text-xs">·</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    <School size={9} /> School delivery
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-[#000435] transition-all flex-shrink-0"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Pipeline bar — always visible */}
        {!isRejected && (
          <div className="mt-4">
            <PipelineBar currentStatus={status} />
          </div>
        )}

        {/* Rejected bar */}
        {isRejected && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-xs font-bold text-red-700">{cfg.description}</p>
          </div>
        )}

        {/* Approved action shortcut — always visible when approved+ */}
        {isApproved && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className={`mt-3 w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-black transition-all
            ${status === 'delivered'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : delivery.method === 'agent_station'
                ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <div className="flex items-center gap-2">
              {status === 'delivered'
                ? <><CheckCircle2 size={16} /> Delivery complete</>
                : delivery.method === 'agent_station'
                  ? <><Store size={16} /> {status === 'dispatched' ? 'Go to agent to pick up' : 'View pickup details'}</>
                  : <><School size={16} /> {status === 'dispatched' ? 'Delivery in progress' : 'View delivery details'}</>
              }
            </div>
            <ChevronRight size={15} className="flex-shrink-0" />
          </button>
        )}
      </div>

      {/* ── Expanded details ── */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 p-5 space-y-4"
          style={{ animation: 'expandIn 0.25s ease both' }}>

          {/* Delivery action */}
          <DeliveryAction row={row} status={status} />

          {/* Finance notes */}
          {(row.accountant_note || row.manager_feedback) && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Finance Notes</p>
              {row.accountant_note && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-white border border-slate-200">
                  <Shield size={13} className="text-[#000435] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-[#000435] uppercase tracking-wider mb-0.5">Finance</p>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">{row.accountant_note}</p>
                  </div>
                </div>
              )}
              {row.manager_feedback && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-white border border-slate-200">
                  <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-[#000435] uppercase tracking-wider mb-0.5">Manager</p>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">{row.manager_feedback}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment info */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 bg-[#000435]">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-400/80">Payment Details</p>
            </div>
            <div className="p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-semibold">Amount</span>
                <span className="font-black text-amber-500">{formatMoney(row.amount_rwf)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-semibold">Method</span>
                <span className="font-black text-[#000435] capitalize">
                  {payType === 'ticha_avance' ? 'Ticha Avance (payroll)' : 'Direct Payment'}
                </span>
              </div>
              {payType === 'ticha_avance' && row.metadata?.repayment_term_months && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-semibold">Duration</span>
                    <span className="font-black text-[#000435]">{row.metadata.repayment_term_months} months</span>
                  </div>
                  {row.metadata?.monthly_payment && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-semibold">Monthly</span>
                      <span className="font-black text-amber-600">{formatMoney(row.metadata.monthly_payment)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-semibold">Submitted</span>
                <span className="font-semibold text-slate-600">{dateStr}</span>
              </div>
              {products.length > 1 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Items</p>
                  {products.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-slate-600 font-semibold truncate max-w-[65%]">{p.name}</span>
                      {p.price_rwf && <span className="font-black text-slate-700">{formatMoney(p.price_rwf)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CTA: View product */}
          {firstProduct?.id && (
            <button
              type="button"
              onClick={() => navigate(`/ticha-deals/${firstProduct.id}`)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#000435]/20
              text-[#000435] font-black text-sm hover:bg-[#000435]/4 transition-all"
            >
              <ExternalLink size={14} /> View Product
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   SUMMARY STATS BAR
───────────────────────────────────────── */
function StatsBar({ rows }) {
  const total = rows.length;
  const approved = rows.filter(r => ['approved', 'dispatched', 'delivered'].includes(r.status)).length;
  const pending = rows.filter(r => ['pending_accountant', 'sent_to_manager'].includes(r.status)).length;
  const delivered = rows.filter(r => r.status === 'delivered').length;
  const totalSpend = rows.reduce((s, r) => s + (Number(r.amount_rwf) || 0), 0);

  const stats = [
    { label: 'Total Requests', value: total, color: 'text-[#000435]', icon: ShoppingBag },
    { label: 'Pending', value: pending, color: 'text-amber-500', icon: Clock },
    { label: 'Approved', value: approved, color: 'text-emerald-500', icon: CheckCircle2 },
    { label: 'Delivered', value: delivered, color: 'text-violet-500', icon: Truck },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {stats.map(({ label, value, color, icon: Icon }) => (
        <div key={label} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
            <Icon size={16} className={color} />
          </div>
          <div className="min-w-0">
            <p className={`text-xl font-black leading-none ${color}`}>{value}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider leading-none">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   FILTER TABS
───────────────────────────────────────── */
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'approved', label: 'Approved' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'rejected', label: 'Declined' },
];

function filterRows(rows, filter) {
  if (filter === 'all') return rows;
  if (filter === 'active') return rows.filter(r => ['pending_accountant', 'sent_to_manager'].includes(r.status));
  if (filter === 'approved') return rows.filter(r => ['approved', 'dispatched'].includes(r.status));
  if (filter === 'delivered') return rows.filter(r => r.status === 'delivered');
  if (filter === 'rejected') return rows.filter(r => REJECTED_STATUSES.includes(r.status));
  return rows;
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function TrackingTichaDeals() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await api.get('/services/shule-avance/applicant/my-requests');
      const list = res.data?.success && Array.isArray(res.data.data) ? res.data.data : [];
      const onlyDeals = list.filter(r => String(r.service_category || '').toLowerCase() === 'teacher_deals');
      setRows(onlyDeals);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load your deals.');
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    load();
  }, [load]);

  const sorted = useMemo(() =>
    [...rows].sort((a, b) =>
      new Date(b.submitted_at || b.created_at || 0) -
      new Date(a.submitted_at || a.created_at || 0)
    ),
    [rows]
  );

  const filtered = useMemo(() => filterRows(sorted, filter), [sorted, filter]);

  const filterCounts = useMemo(() => ({
    all: sorted.length,
    active: sorted.filter(r => ['pending_accountant', 'sent_to_manager'].includes(r.status)).length,
    approved: sorted.filter(r => ['approved', 'dispatched'].includes(r.status)).length,
    delivered: sorted.filter(r => r.status === 'delivered').length,
    rejected: sorted.filter(r => REJECTED_STATUSES.includes(r.status)).length,
  }), [sorted]);

  return (
    <>
      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes expandIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroReveal {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin-anim { animation: spin 1s linear infinite; }
      `}</style>

      <div className="min-h-screen bg-[#f0f2f9] pb-20"
        style={{ fontFamily: PAGE_FONT_FAMILY }}>

        {/* ── HERO ── */}
        <div className="relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #000435 0%, #001080 60%, #000c55 100%)' }}>

          {/* Ambient glows */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)', filter: 'blur(60px)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-8 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)', filter: 'blur(50px)', transform: 'translate(-30%, 30%)' }} />

          {/* Dot grid pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #F59E0B 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }} />

          <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-16"
            style={{ animation: 'heroReveal 0.5s ease both' }}>

            {/* Back nav */}
            <button type="button" onClick={() => navigate('/ticha-deals')}
              className="inline-flex items-center gap-2 mb-6 text-white/60 hover:text-white text-xs font-black uppercase tracking-wider transition-colors">
              <ArrowLeft size={15} /> Back to Catalog
            </button>

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                {/* Eyebrow */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/25 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">
                    Deal Tracking
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white leading-none tracking-tight mb-3">
                  My <span className="text-amber-400">Deals</span>
                </h1>
                <p className="text-sm text-white/60 font-semibold max-w-sm leading-relaxed">
                  Track every request from submission through approval to delivery.
                </p>
              </div>

              {/* Refresh */}
              <button
                type="button"
                onClick={() => load(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white/70
                hover:bg-white/20 hover:text-white transition-all text-xs font-black uppercase tracking-wider flex-shrink-0"
              >
                <RefreshCw size={13} className={refreshing ? 'spin-anim' : ''} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">

          {/* Stats bar */}
          {!loading && rows.length > 0 && <StatsBar rows={sorted} />}

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-white border border-red-200 text-red-700 shadow-md">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-bold flex-1">{error}</p>
              <button onClick={() => load()} className="text-xs font-black text-red-600 hover:text-red-800 underline">Retry</button>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center border border-slate-200">
                <Loader2 className="w-8 h-8 text-amber-500 spin-anim" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Loading your deals…</p>
            </div>

          ) : sorted.length === 0 ? (
            /* Empty state */
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-10 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#000435]/6 flex items-center justify-center mb-5 border-2 border-[#000435]/10">
                <ShoppingBag className="w-9 h-9 text-[#000435]/30" />
              </div>
              <h2 className="text-xl font-black text-[#000435] mb-2">
                No deal requests yet
              </h2>
              <p className="text-sm text-slate-500 font-semibold mb-7 max-w-xs mx-auto leading-relaxed">
                Browse the Teacher Deals catalog and submit your first request. It will appear here with live status updates.
              </p>
              <button
                type="button"
                onClick={() => navigate('/ticha-deals')}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#000435] text-white text-sm font-black shadow-lg shadow-[#000435]/20 hover:bg-[#000c70] transition-all active:scale-[.97]"
              >
                <Tag size={16} /> Browse Deals <ChevronRight size={15} />
              </button>
            </div>

          ) : (
            <>
              {/* Filter tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
                {FILTERS.map(({ key, label }) => {
                  const count = filterCounts[key];
                  if (count === 0 && key !== 'all') return null;
                  return (
                    <button
                      key={key}
                      onClick={() => setFilter(key)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider
                      whitespace-nowrap border-2 transition-all flex-shrink-0 ${
                        filter === key
                          ? 'bg-[#000435] text-white border-[#000435] shadow-md'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {label}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                        filter === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Deal cards */}
              {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                  <p className="text-slate-400 font-bold text-sm">No deals match this filter.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filtered.map((row, i) => (
                    <DealCard key={row.id} row={row} index={i} navigate={navigate} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Footer info */}
          {!loading && sorted.length > 0 && (
            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-4 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Truck className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-black text-[#000435] mb-0.5">About Delivery</p>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                  After approval, agent pickup or school delivery is coordinated by your school's finance team.
                  Check back here for status updates — the page refreshes automatically.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}