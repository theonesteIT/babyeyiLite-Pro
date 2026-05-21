import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Wallet,
  Filter,
  Search,
  Download,
  LayoutDashboard,
  ClipboardList,
  FileText,
  TrendingUp,
  Banknote,
  Package,
  AlertTriangle,
  ChevronDown,
  X,
} from 'lucide-react';
import { BABYEYI_FONT_STACK } from '../../../theme/babyeyiDashboardTheme';
import {
  STATUS_LABEL,
  STATUS_FILTERS,
  TYPE_FILTERS,
  SORT_OPTIONS,
  formatMoney,
  compactMoney,
  formatDate,
  monthLabel,
  buildQueryParams,
  downloadAdvancesCsv,
} from '../utils/shuleAvanceManagerUtils';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5100';
const BASE = `${API}/api/services`;
const FONT = BABYEYI_FONT_STACK;

const TABS = [
  { id: 'dashboard', label: 'Overview', Icon: LayoutDashboard },
  { id: 'registry', label: 'All advances', Icon: ClipboardList },
  { id: 'reports', label: 'Reports', Icon: FileText },
];

const DEFAULT_FILTERS = {
  status: 'all',
  request_type: 'all',
  q: '',
  date_from: '',
  date_to: '',
  exceeds_cap: 'all',
  sort: 'newest',
};

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export default function SchoolManagerShuleAvance({ toast }) {
  const [tab, setTab] = useState('dashboard');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [decisionModal, setDecisionModal] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const queryString = useMemo(() => buildQueryParams(filters), [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, summaryRes] = await Promise.all([
        jsonFetch(`${BASE}/shule-avance/manager/requests?${queryString}`),
        jsonFetch(`${BASE}/shule-avance/manager/reports/summary?${queryString}`),
      ]);
      if (listRes.res.ok && listRes.data.success) {
        setRows(Array.isArray(listRes.data.data) ? listRes.data.data : []);
      } else {
        setRows([]);
      }
      if (summaryRes.res.ok && summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      } else {
        setSummary(null);
      }
    } catch {
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(load, 45000);
    return () => window.clearInterval(id);
  }, [load]);

  const totals = summary?.totals || {};
  const pendingCount = Number(totals.pending_count) || 0;

  const patchFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const submitDecision = async (decision) => {
    if (!decisionModal?.id) return;
    setSubmitting(true);
    try {
      const { res, data } = await jsonFetch(
        `${BASE}/shule-avance/manager/invoice-requests/${decisionModal.id}/decision`,
        { method: 'PATCH', body: JSON.stringify({ decision, feedback }) }
      );
      if (!res.ok || !data.success) {
        toast?.(data.message || 'Could not save decision.', 'error');
        return;
      }
      toast?.(data.message || 'Saved.', 'success');
      setDecisionModal(null);
      setFeedback('');
      setDetail(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = () => {
    if (!rows.length) {
      toast?.('No rows to export for current filters.', 'error');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadAdvancesCsv(rows, `shule-avance-${stamp}.csv`);
    toast?.('Report downloaded.', 'success');
  };

  return (
    <div className="slide-up anim space-y-5 sm:space-y-6" style={{ fontFamily: FONT }}>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#000435] via-[#0a1654] to-[#000435] text-white p-5 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.22),transparent_50%)]" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-400/90">School Manager</p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              Shule <span className="text-amber-400">Avance</span>
            </h2>
            <p className="mt-2 text-sm text-white/70 max-w-xl">
              Full registry of staff advances — filter, review, approve, and export professional reports.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportCsv}
              disabled={!rows.length}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 text-[#000435] px-4 py-2.5 text-sm font-black hover:bg-amber-300 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-sm font-bold"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 overflow-x-auto">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              tab === id
                ? 'bg-white text-[#000435] shadow-md'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon size={16} className={tab === id ? 'text-amber-500' : ''} />
            {label}
            {id === 'dashboard' && pendingCount > 0 ? (
              <span className="ml-1 min-w-[20px] h-5 px-1.5 rounded-full bg-amber-400 text-[#000435] text-[10px] font-black flex items-center justify-center">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 sm:px-5 border-b border-slate-50"
        >
          <span className="flex items-center gap-2 text-sm font-black text-[#000435]">
            <Filter size={16} className="text-amber-500" />
            Filters & search
          </span>
          <ChevronDown size={18} className={`text-slate-400 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
        </button>
        {filtersOpen ? (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={filters.q}
                onChange={(e) => patchFilter('q', e.target.value)}
                placeholder="Search staff name, email, or request #…"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => patchFilter('status', s.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      filters.status === s.id
                        ? 'bg-[#000435] text-amber-400 border-[#000435]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="block">
                <span className="text-[10px] font-bold uppercase text-slate-400">Type</span>
                <select
                  value={filters.request_type}
                  onChange={(e) => patchFilter('request_type', e.target.value)}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-800"
                >
                  {TYPE_FILTERS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase text-slate-400">Over monthly limit</span>
                <select
                  value={filters.exceeds_cap}
                  onChange={(e) => patchFilter('exceeds_cap', e.target.value)}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-800"
                >
                  <option value="all">All</option>
                  <option value="1">Over limit only</option>
                  <option value="0">Within limit</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase text-slate-400">From date</span>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => patchFilter('date_from', e.target.value)}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase text-slate-400">To date</span>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => patchFilter('date_to', e.target.value)}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                Sort
                <select
                  value={filters.sort}
                  onChange={(e) => patchFilter('sort', e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 px-2 text-sm font-bold"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-bold text-slate-500 hover:text-amber-600 underline"
              >
                Reset filters
              </button>
              <span className="text-xs font-semibold text-slate-400 ml-auto">
                {loading ? 'Loading…' : `${rows.length} record${rows.length === 1 ? '' : 's'}`}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {loading && !rows.length && !summary ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
        </div>
      ) : (
        <>
          {tab === 'dashboard' && (
            <DashboardView summary={summary} pendingCount={pendingCount} onGoRegistry={() => setTab('registry')} />
          )}
          {tab === 'reports' && <ReportsView summary={summary} rows={rows} onExport={exportCsv} />}
          {tab === 'registry' && (
            <RegistryTable
              rows={rows}
              loading={loading}
              onView={setDetail}
              onDecision={setDecisionModal}
              setFeedback={setFeedback}
            />
          )}
          {tab === 'dashboard' && rows.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-sm font-black text-[#000435] uppercase tracking-wider">Recent requests</h3>
              <RegistryTable
                rows={rows.slice(0, 8)}
                loading={false}
                compact
                onView={setDetail}
                onDecision={setDecisionModal}
                setFeedback={setFeedback}
              />
              {rows.length > 8 ? (
                <button
                  type="button"
                  onClick={() => setTab('registry')}
                  className="w-full py-3 rounded-xl border border-dashed border-amber-300 text-sm font-bold text-amber-800 hover:bg-amber-50"
                >
                  View all {rows.length} advances →
                </button>
              ) : null}
            </section>
          ) : null}
        </>
      )}

      {detail && <DetailModal detail={detail} onClose={() => setDetail(null)} onDecision={setDecisionModal} setFeedback={setFeedback} />}
      {decisionModal && (
        <DecisionModal
          modal={decisionModal}
          feedback={feedback}
          setFeedback={setFeedback}
          submitting={submitting}
          onClose={() => setDecisionModal(null)}
          onConfirm={submitDecision}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, accent = '#000435', alert }) {
  return (
    <div className={`rounded-2xl border p-4 min-w-0 shadow-sm ${alert ? 'border-amber-200 bg-amber-50/50' : 'border-slate-100 bg-white'}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-xl sm:text-2xl font-black mt-1 truncate" style={{ color: accent }}>{value}</p>
      {sub ? <p className="text-[11px] text-slate-500 mt-1 font-semibold">{sub}</p> : null}
    </div>
  );
}

function DashboardView({ summary, pendingCount, onGoRegistry }) {
  const t = summary?.totals || {};
  const byMonth = summary?.by_month || [];
  const maxMonth = Math.max(...byMonth.map((m) => Number(m.amount_rwf) || 0), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total advances" value={t.total_count ?? 0} sub={formatMoney(t.total_amount_rwf)} />
        <StatCard
          label="Needs action"
          value={pendingCount}
          sub={formatMoney(t.pending_amount_rwf)}
          accent="#b45309"
          alert={pendingCount > 0}
        />
        <StatCard label="Approved" value={t.approved_count ?? 0} sub={formatMoney(t.approved_amount_rwf)} accent="#047857" />
        <StatCard label="Rejected" value={t.rejected_count ?? 0} sub={formatMoney(t.rejected_amount_rwf)} accent="#b91c1c" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat icon={Banknote} label="Cashouts" summary={summary} typeKey="cashout" />
        <MiniStat icon={Package} label="Services" summary={summary} typeKey="service" />
        <StatCard label="Over limit" value={t.over_limit_count ?? 0} sub="Exceeded monthly %" accent="#b45309" />
        <StatCard label="Auto-approved" value={t.auto_approved_count ?? 0} sub="Instant cashouts" accent="#0369a1" />
      </div>

      {byMonth.length > 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-[#000435] flex items-center gap-2">
              <TrendingUp size={16} className="text-amber-500" />
              Monthly volume
            </h3>
          </div>
          <div className="flex items-end gap-2 h-36">
            {byMonth.map((m) => {
              const amt = Number(m.amount_rwf) || 0;
              const h = Math.max(8, Math.round((amt / maxMonth) * 100));
              return (
                <div key={m.month_key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-[9px] font-bold text-slate-500">{compactMoney(amt)}</span>
                  <div
                    className="w-full max-w-[48px] rounded-t-lg bg-gradient-to-t from-[#000435] to-[#1e3a8a]"
                    style={{ height: `${h}%` }}
                    title={formatMoney(amt)}
                  />
                  <span className="text-[9px] font-bold text-slate-400 truncate w-full text-center">{monthLabel(m.month_key)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {pendingCount > 0 ? (
        <button
          type="button"
          onClick={onGoRegistry}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#000435] font-black text-sm shadow-lg shadow-amber-200/50"
        >
          <AlertTriangle size={18} />
          Review {pendingCount} pending advance{pendingCount === 1 ? '' : 's'}
        </button>
      ) : null}
    </div>
  );
}

function MiniStat({ icon: Icon, label, summary, typeKey }) {
  const row = (summary?.by_type || []).find((x) => x.request_type === typeKey);
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 flex items-center gap-3 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#000435]">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
        <p className="text-lg font-black text-[#000435]">{row?.count ?? 0}</p>
        <p className="text-[10px] font-semibold text-slate-500">{formatMoney(row?.amount_rwf)}</p>
      </div>
    </div>
  );
}

function ReportsView({ summary, rows, onExport }) {
  const byStatus = summary?.by_status || [];
  const byRole = summary?.by_role || [];
  const maxStatus = Math.max(...byStatus.map((s) => Number(s.amount_rwf) || 0), 1);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-black text-[#000435]">Advance report</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Generated {summary?.generated_at ? formatDate(summary.generated_at) : '—'} · {rows.length} rows (current filters)
            </p>
          </div>
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#000435] text-amber-400 px-4 py-2.5 text-sm font-bold"
          >
            <Download size={16} />
            Download CSV
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">By status</h4>
            <div className="space-y-2">
              {byStatus.length === 0 ? (
                <p className="text-sm text-slate-500">No data for filters.</p>
              ) : (
                byStatus.map((s) => {
                  const amt = Number(s.amount_rwf) || 0;
                  const pct = Math.round((amt / maxStatus) * 100);
                  const meta = STATUS_LABEL[s.status] || { label: s.status };
                  return (
                    <div key={s.status}>
                      <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                        <span>{meta.label}</span>
                        <span>{s.count} · {formatMoney(amt)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-[#000435]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">By staff role</h4>
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2 text-right">Count</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {byRole.length === 0 ? (
                    <tr><td colSpan={3} className="px-3 py-4 text-slate-500">No data</td></tr>
                  ) : (
                    byRole.map((r) => (
                      <tr key={r.role_code}>
                        <td className="px-3 py-2 font-semibold text-slate-800">{r.role_code}</td>
                        <td className="px-3 py-2 text-right font-bold">{r.count}</td>
                        <td className="px-3 py-2 text-right font-bold text-[#000435]">{formatMoney(r.amount_rwf)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegistryTable({ rows, loading, compact, onView, onDecision, setFeedback }) {
  if (loading && !rows.length) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center px-4">
        <Wallet className="mx-auto h-12 w-12 text-slate-300 mb-3" />
        <p className="font-bold text-slate-700">No advances match your filters</p>
        <p className="text-sm text-slate-500 mt-1">Try widening the date range or status filter.</p>
      </div>
    );
  }

  return (
    <>
      <div className={`hidden lg:block overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm ${compact ? 'max-h-[420px]' : ''}`}>
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-amber-50/40 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.id}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{r.staff_name?.trim() || '—'}</p>
                  <p className="text-[11px] text-slate-500">{r.submitter_role_code}</p>
                </td>
                <td className="px-4 py-3 capitalize font-semibold">{r.request_type}</td>
                <td className="px-4 py-3 font-black text-[#000435]">{formatMoney(r.amount_rwf)}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{formatDate(r.submitted_at || r.created_at)}</td>
                <td className="px-4 py-3">
                  <StatusBadges row={r} />
                </td>
                <td className="px-4 py-3 text-right">
                  <ActionButtons row={r} onView={onView} onDecision={onDecision} setFeedback={setFeedback} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden space-y-3">
        {rows.map((r) => (
          <article key={r.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">{r.staff_name?.trim() || 'Staff'}</p>
                <p className="text-[11px] text-slate-500">{r.submitter_role_code} · #{r.id}</p>
              </div>
              <StatusBadges row={r} compact />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">{r.request_type}</p>
                <p className="text-lg font-black text-[#000435]">{formatMoney(r.amount_rwf)}</p>
                <p className="text-[10px] text-slate-500">{formatDate(r.submitted_at || r.created_at)}</p>
              </div>
              <ActionButtons row={r} onView={onView} onDecision={onDecision} setFeedback={setFeedback} compact />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function StatusBadges({ row, compact }) {
  const meta = STATUS_LABEL[row.status] || { label: row.status, cls: 'bg-slate-100 text-slate-700 border-slate-200' };
  return (
    <div className={`flex flex-col gap-1 ${compact ? 'items-end' : 'items-start'}`}>
      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${meta.cls}`}>
        {compact ? meta.short || meta.label : meta.label}
      </span>
      {Number(row.exceeds_monthly_cap) === 1 ? (
        <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-900">
          Over limit
        </span>
      ) : null}
      {Number(row.auto_approved) === 1 ? (
        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] font-bold uppercase text-sky-800">
          Auto
        </span>
      ) : null}
    </div>
  );
}

function DetailModal({ detail, onClose, onDecision, setFeedback }) {
  const canDecide = detail.status === 'sent_to_manager' || detail.status === 'pending_accountant';
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
          <h3 className="text-lg font-black text-[#000435]">Advance #{detail.id}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <dl className="p-5 space-y-3 text-sm">
          <DetailRow label="Staff" value={`${detail.staff_name} (${detail.submitter_role_code})`} />
          <DetailRow label="Type" value={detail.request_type} />
          <DetailRow label="Amount" value={formatMoney(detail.amount_rwf)} />
          <DetailRow label="Repayment" value={`${detail.repayment_term_months} month(s)`} />
          <DetailRow label="Submitted" value={formatDate(detail.submitted_at || detail.created_at)} />
          <DetailRow label="Status" value={STATUS_LABEL[detail.status]?.label || detail.status} />
          <DetailRow label="Purpose" value={detail.purpose} />
          {detail.details ? <DetailRow label="Details" value={detail.details} /> : null}
          {Number(detail.exceeds_monthly_cap) === 1 ? (
            <DetailRow label="Monthly limit" value="Exceeds school % cap — manager approval required." />
          ) : null}
          {detail.accountant_note ? <DetailRow label="Finance note" value={detail.accountant_note} /> : null}
          {detail.manager_feedback ? <DetailRow label="Manager note" value={detail.manager_feedback} /> : null}
        </dl>
        {canDecide ? (
          <div className="p-5 pt-0 flex gap-2 border-t border-slate-50">
            <button
              type="button"
              onClick={() => { onDecision({ ...detail, _dec: 'approved' }); setFeedback(''); onClose(); }}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => { onDecision({ ...detail, _dec: 'rejected' }); setFeedback(''); onClose(); }}
              className="flex-1 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-bold"
            >
              Reject
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DecisionModal({ modal, feedback, setFeedback, submitting, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-base font-black text-[#000435]">
          {modal._dec === 'approved' ? 'Approve advance' : 'Reject advance'}
        </h3>
        <p className="mt-1 text-xs text-slate-600">#{modal.id} · {formatMoney(modal.amount_rwf)}</p>
        <textarea
          className="mt-3 min-h-[100px] w-full rounded-xl border border-slate-200 p-3 text-sm"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Optional comment for staff"
        />
        <div className="mt-4 flex gap-2">
          <button type="button" className="flex-1 py-2.5 rounded-xl border text-sm font-bold" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => onConfirm(modal._dec)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 ${
              modal._dec === 'approved' ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          >
            {submitting ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-800 mt-0.5">{value}</dd>
    </div>
  );
}

function ActionButtons({ row, onView, onDecision, setFeedback, compact }) {
  const canDecide = row.status === 'sent_to_manager' || row.status === 'pending_accountant';
  return (
    <div className={`flex flex-wrap gap-1 ${compact ? 'justify-end' : 'justify-end'}`}>
      <button
        type="button"
        onClick={() => onView(row)}
        className={`inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 ${compact ? 'px-2 py-1.5 text-[10px]' : 'px-2.5 py-1 text-[10px]'}`}
      >
        <Eye className="h-3 w-3" /> View
      </button>
      {canDecide && (
        <>
          <button
            type="button"
            onClick={() => { onDecision({ ...row, _dec: 'approved' }); setFeedback(''); }}
            className={`inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white font-bold ${compact ? 'px-2 py-1.5 text-[10px]' : 'px-2.5 py-1 text-[10px]'}`}
          >
            <CheckCircle2 className="h-3 w-3" /> Approve
          </button>
          <button
            type="button"
            onClick={() => { onDecision({ ...row, _dec: 'rejected' }); setFeedback(''); }}
            className={`inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 text-red-700 font-bold ${compact ? 'px-2 py-1.5 text-[10px]' : 'px-2.5 py-1 text-[10px]'}`}
          >
            <XCircle className="h-3 w-3" /> Reject
          </button>
        </>
      )}
    </div>
  );
}
