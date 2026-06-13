import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Pencil,
  Download,
  FileSpreadsheet,
  CalendarDays,
  User,
  Wallet,
  TrendingDown,
  TrendingUp,
  Loader2,
  CircleAlert,
} from 'lucide-react';
import { fetchSchoolBudget } from '../services/schoolBudgetApi';
import IncomeSourceIcon, { BudgetCodeBadge } from './IncomeSourceIcon';
import { getPresetForSource } from '../utils/budgetIncomeConfig';
import { budgetTotals, exportBudgetExcel, exportBudgetPdf, incomeDeductions, incomeGross, incomeLabel, incomeNet } from '../utils/budgetViewExport';
import { formatBudgetDateTime, formatBudgetPeriod } from '../utils/budgetReportFormat';

const C = {
  navy: '#000435',
  amber: '#F59E0B',
  amberLight: '#FDE68A',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray600: '#4B5563',
  green: '#10B981',
  red: '#EF4444',
};

function statusBadgeStyle(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return { bg: '#D1FAE5', color: '#065F46' };
  if (s === 'pending_approval') return { bg: '#FEF3C7', color: '#92400E' };
  if (s === 'rejected') return { bg: '#FEE2E2', color: '#991B1B' };
  if (s === 'closed') return { bg: C.gray100, color: C.gray600 };
  return { bg: '#EFF6FF', color: '#1E40AF' };
}

function InfoCard({ label, value, icon: Icon }) {
  return (
    <div style={{ background: C.white, borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.gray200}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {Icon ? <Icon size={14} color={C.amber} /> : null}
        <span style={{ fontSize: 10, fontWeight: 500, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: C.navy }}>{value ?? '—'}</div>
    </div>
  );
}

function KpiTile({ label, value, color }) {
  return (
    <div style={{ background: C.gray50, borderRadius: 12, padding: '16px 18px', border: `1px solid ${C.gray200}` }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: C.gray400, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 500, color: color || C.navy }}>{value}</div>
    </div>
  );
}

export default function BudgetViewModal({
  open,
  onClose,
  budgetId,
  fmt,
  onEdit,
  isMobile,
  fetchBudget,
  showEdit = true,
}) {
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !budgetId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    setBudget(null);
    const load = fetchBudget || fetchSchoolBudget;
    load(budgetId)
      .then((data) => { if (!cancelled) setBudget(data); })
      .catch((e) => { if (!cancelled) setError(e.message || 'Failed to load budget'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, budgetId, fetchBudget]);

  const incomes = budget?.incomeSources || [];
  const totals = useMemo(() => budgetTotals(incomes), [incomes]);
  const badge = budget ? statusBadgeStyle(budget.status) : null;
  const statusKey = String(budget?.status || '').toLowerCase();
  const canEdit = ['draft', 'rejected'].includes(statusKey);
  const usagePct = budget?.budgetUsagePct ?? (budget?.totalExpectedIncome > 0
    ? Math.round((Number(budget?.totalAllocated || 0) / Number(budget.totalExpectedIncome)) * 100)
    : 0);

  if (!open) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: C.gray50, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.white, height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            background: C.navy,
            padding: isMobile ? '12px 16px' : '14px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexShrink: 0,
            borderBottom: `3px solid ${C.amber}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 500, color: C.amber }}>Budget Details</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
              {budget?.budgetCode ? <BudgetCodeBadge code={budget.budgetCode} /> : null}
              {budget?.title ? <span style={{ fontSize: 13, color: C.amberLight }}>{budget.title}</span> : null}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {budget && !loading && (
              <>
                <button
                  type="button"
                  onClick={() => exportBudgetPdf(budget, fmt)}
                  style={exportBtnStyle}
                  title="Export PDF"
                >
                  <Download size={15} />
                  {!isMobile && 'PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => exportBudgetExcel(budget, fmt)}
                  style={exportBtnStyle}
                  title="Export Excel"
                >
                  <FileSpreadsheet size={15} />
                  {!isMobile && 'Excel'}
                </button>
              </>
            )}
            <button type="button" onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: C.white }}>
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', background: C.gray50 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '16px' : '24px 28px' }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: 48, color: C.gray400 }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: C.amber }} />
                Loading budget details…
              </div>
            )}
            {error && (
              <div style={{ padding: '12px 14px', background: '#FEE2E2', borderRadius: 10, display: 'flex', gap: 8, marginBottom: 16 }}>
                <CircleAlert size={18} color={C.red} />
                <span style={{ fontSize: 13, color: '#991B1B' }}>{error}</span>
              </div>
            )}

            {budget && !loading && (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ background: badge.bg, color: badge.color, borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 500 }}>
                    {budget.statusLabel || budget.status}
                  </span>
                  <span style={{ fontSize: 12, color: C.gray600, background: C.white, padding: '4px 12px', borderRadius: 20, border: `1px solid ${C.gray200}` }}>
                    {budget.budgetType}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                  <InfoCard label="Academic year" value={budget.academicYear} icon={CalendarDays} />
                  <InfoCard label="Term" value={budget.term} icon={CalendarDays} />
                  <InfoCard label="Prepared by" value={budget.preparedByName} icon={User} />
                  <InfoCard label="Period" value={formatBudgetPeriod(budget.startDate, budget.endDate)} icon={CalendarDays} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                  <KpiTile label="Total gross income" value={`${fmt(totals.gross)} RWF`} color={C.navy} />
                  <KpiTile label="Total deductions" value={`${fmt(totals.deductions)} RWF`} color={C.red} />
                  <KpiTile label="Net budget income" value={`${fmt(totals.net)} RWF`} color={C.green} />
                  <KpiTile label="Budget usage" value={`${usagePct}%`} color={usagePct > 90 ? C.red : C.amber} />
                </div>

                {budget.description && (
                  <div style={{ background: C.white, borderRadius: 12, padding: 16, border: `1px solid ${C.gray200}`, marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: C.gray400, textTransform: 'uppercase', marginBottom: 8 }}>Description</div>
                    <p style={{ margin: 0, fontSize: 14, color: C.gray600, lineHeight: 1.6 }}>{budget.description}</p>
                  </div>
                )}

                <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ padding: '14px 18px', background: C.navy, color: C.amber, fontWeight: 500, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Wallet size={18} />
                    Income Sources ({incomes.length})
                  </div>
                  {incomes.length === 0 ? (
                    <p style={{ padding: 20, color: C.gray400, margin: 0 }}>No income sources recorded.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: C.gray50 }}>
                            {['Source', 'Gross (RWF)', 'Deductions (RWF)', 'Net (RWF)', 'Frequency'].map((h) => (
                              <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Source' ? 'left' : 'right', fontSize: 10, fontWeight: 500, color: C.gray400, textTransform: 'uppercase' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {incomes.map((row, i) => {
                            const preset = getPresetForSource(row.incomeSource || row.incomeSourceKey);
                            return (
                              <tr key={row.id || i} style={{ borderTop: `1px solid ${C.gray100}` }}>
                                <td style={{ padding: '12px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ display: 'inline-flex', padding: 6, borderRadius: 8, background: `${C.amber}18` }}>
                                      <IncomeSourceIcon name={preset?.icon || 'CircleDollarSign'} size={16} color={C.navy} />
                                    </span>
                                    <span style={{ fontWeight: 500, color: C.navy }}>{incomeLabel(row)}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'right', color: C.gray600 }}>{fmt(incomeGross(row))}</td>
                                <td style={{ padding: '12px 14px', textAlign: 'right', color: C.red, fontWeight: 500 }}>{fmt(incomeDeductions(row))}</td>
                                <td style={{ padding: '12px 14px', textAlign: 'right', color: C.amber, fontWeight: 500 }}>{fmt(incomeNet(row))}</td>
                                <td style={{ padding: '12px 14px', textAlign: 'right', color: C.gray600 }}>{row.collectionFrequency || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: C.gray50, borderTop: `2px solid ${C.gray200}` }}>
                            <td style={{ padding: '12px 14px', fontWeight: 500, color: C.navy }}>Totals</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 500 }}>{fmt(totals.gross)}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 500, color: C.red }}>{fmt(totals.deductions)}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 500, color: C.green }}>{fmt(totals.net)}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Deductions detail */}
                {incomes.some((r) => (r.config?.deductions || []).length > 0) && (
                  <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`, overflow: 'hidden', marginBottom: 20 }}>
                    <div style={{ padding: '14px 18px', background: C.gray50, fontWeight: 500, fontSize: 14, color: C.navy, display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${C.gray200}` }}>
                      <TrendingDown size={18} color={C.red} />
                      Income Deductions Detail
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: C.gray50 }}>
                            {['Income source', 'Category', 'Qty', 'Unit (RWF)', 'Amount (RWF)', 'Notes'].map((h) => (
                              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 500, color: C.gray400, textTransform: 'uppercase' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {incomes.flatMap((row) =>
                            (row.config?.deductions || []).map((d, di) => (
                              <tr key={`${row.id}-${d.id || di}`} style={{ borderTop: `1px solid ${C.gray100}` }}>
                                <td style={{ padding: '10px 12px', fontWeight: 500, color: C.navy }}>{incomeLabel(row)}</td>
                                <td style={{ padding: '10px 12px' }}>{d.category || d.name || '—'}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>{d.quantity ?? '—'}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{d.unitAmount ? fmt(d.unitAmount) : '—'}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 500, color: C.red }}>{fmt(d.amount ?? d.value ?? 0)}</td>
                                <td style={{ padding: '10px 12px', color: C.gray600 }}>{d.description || '—'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 8 }}>
                  <InfoCard label="Submitted" value={formatBudgetDateTime(budget.submittedAt)} icon={TrendingUp} />
                  <InfoCard label="Last updated" value={formatBudgetDateTime(budget.updatedAt)} icon={CalendarDays} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${C.gray200}`, padding: isMobile ? '12px 16px' : '14px 28px', display: 'flex', justifyContent: 'flex-end', gap: 10, background: C.white, flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ padding: '10px 20px', border: `2px solid ${C.navy}`, borderRadius: 8, background: C.white, color: C.navy, fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
            Close
          </button>
          {showEdit && canEdit && budget && onEdit && (
            <button
              type="button"
              onClick={() => { onEdit(budget); onClose(); }}
              style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: C.amber, color: C.navy, fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Pencil size={16} />
              {statusKey === 'draft' ? 'Continue draft' : 'Continue editing'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

const exportBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 12px',
  borderRadius: 8,
  border: '1px solid rgba(245,158,11,0.4)',
  background: 'rgba(245,158,11,0.12)',
  color: '#FDE68A',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
};
