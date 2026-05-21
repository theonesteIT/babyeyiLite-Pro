import { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  Loader2,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  CircleAlert,
  ArrowRight,
  GraduationCap,
  Users,
} from 'lucide-react';
import {
  fetchBabyeyiFeeCardsForBudget,
  periodLabel,
  asMoney,
} from '../utils/babyeyiFeesBudget';

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

const fmtN = (n) =>
  new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(asMoney(n));

function classLabel(card) {
  const name = String(card.class_name || '').trim();
  if (name) return name;
  const names = Array.isArray(card.classNames) ? card.classNames.filter(Boolean) : [];
  if (names.length) return names.join(', ');
  return '—';
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 12,
        padding: '12px 14px',
        border: `1px solid ${C.gray200}`,
        borderTop: `3px solid ${accent || C.amber}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: C.gray400,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginTop: 4 }}>{value}</div>
      {sub ? <div style={{ fontSize: 10, color: C.gray400, marginTop: 2 }}>{sub}</div> : null}
    </div>
  );
}

export default function TuitionFeesBudgetPanel({
  academicYear,
  term,
  budgetType,
  expectedAmount,
  onApplyAmount,
  disabled,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cards, setCards] = useState([]);
  const [summary, setSummary] = useState(null);
  const [aggregateAll, setAggregateAll] = useState(false);

  const year = String(academicYear || '').trim();
  const expected = asMoney(expectedAmount);
  const projectedTotal = asMoney(summary?.projectedTotalDue);
  const projectedTuition = asMoney(summary?.projectedTuitionTotal);
  const amountDiffers =
    summary &&
    expected > 0 &&
    Math.round(expected) !== Math.round(projectedTotal);

  const load = useCallback(async () => {
    if (!year) {
      setCards([]);
      setSummary(null);
      setAggregateAll(false);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await fetchBabyeyiFeeCardsForBudget({
        academicYear: year,
        term,
        budgetType,
      });
      setCards(data.cards || []);
      setSummary(data.summary || null);
      setAggregateAll(Boolean(data.aggregateAll));
    } catch (err) {
      setCards([]);
      setSummary(null);
      setAggregateAll(false);
      setError(err?.message || 'Failed to load Babyeyi fee cards');
    } finally {
      setLoading(false);
    }
  }, [year, term, budgetType]);

  useEffect(() => {
    load();
  }, [load]);

  const period = periodLabel(academicYear, term, budgetType, aggregateAll);
  const tableStudents = cards.reduce((s, c) => s + Number(c.studentCount || 0), 0);
  const tableProjected = cards.reduce((s, c) => s + asMoney(c.projectedTotalDue), 0);

  const applyBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    border: 'none',
  };

  if (!year) {
    return (
      <div
        style={{
          marginTop: 12,
          padding: '16px 18px',
          borderRadius: 14,
          border: `1px dashed ${C.gray200}`,
          background: C.gray50,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <FileSpreadsheet size={18} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.navy }}>
            Babyeyi Fee Cards — Tuition Analysis
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: C.gray600 }}>
            Select an academic year to load fee card tuition rates and projected income.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 12,
        marginBottom: 4,
        borderRadius: 14,
        overflow: 'hidden',
        border: `1px solid ${C.amber}40`,
        background: `linear-gradient(135deg, ${C.navy}08 0%, ${C.amber}12 100%)`,
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          background: C.navy,
          color: C.white,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
          <GraduationCap size={22} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>
              Babyeyi Fee Cards — Tuition Analysis
            </div>
            <div style={{ fontSize: 11, color: C.amberLight, marginTop: 4, fontWeight: 600 }}>
              {period}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={disabled || loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            borderRadius: 8,
            border: `1px solid ${C.amber}66`,
            background: 'rgba(255,255,255,0.08)',
            color: C.white,
            fontSize: 11,
            fontWeight: 700,
            cursor: disabled || loading ? 'not-allowed' : 'pointer',
            opacity: disabled || loading ? 0.6 : 1,
          }}
        >
          {loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
          <span>Refresh</span>
        </button>
      </div>

      <div style={{ padding: '14px 16px 16px' }}>
        {error ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 10,
              background: '#FEF2F2',
              border: `1px solid ${C.red}33`,
              marginBottom: 12,
            }}
          >
            <CircleAlert size={18} color={C.red} style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.red }}>{error}</p>
              <button
                type="button"
                onClick={load}
                disabled={disabled}
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.navy,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Try again
              </button>
            </div>
          </div>
        ) : null}

        {loading && !summary ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '28px 0',
              color: C.gray600,
              fontSize: 13,
            }}
          >
            <Loader2 size={18} color={C.amber} />
            <span>Loading fee cards…</span>
          </div>
        ) : null}

        {summary ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 10,
                marginBottom: aggregateAll && summary.byTerm?.length ? 12 : 14,
              }}
            >
              <KpiCard label="Fee cards" value={fmtN(summary.cardCount)} />
              <KpiCard
                label="Total students"
                value={fmtN(summary.totalStudents)}
                sub={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Users size={11} color={C.gray400} />
                    <span>Enrolled across cards</span>
                  </span>
                }
              />
              <KpiCard
                label="Tuition / student"
                value={`${fmtN(summary.tuitionTotal)} RWF`}
                sub="Per-card rate sum"
              />
              <KpiCard
                label="Paid at school / student"
                value={`${fmtN(summary.paidAtSchoolTotal)} RWF`}
                sub="Per-card rate sum"
              />
              <KpiCard
                label="Projected tuition"
                value={`${fmtN(summary.projectedTuitionTotal)} RWF`}
                sub="All students"
                accent={C.green}
              />
              <KpiCard
                label="Projected total"
                value={`${fmtN(summary.projectedTotalDue)} RWF`}
                sub="All students"
                accent={C.green}
              />
            </div>

            {aggregateAll && summary.byTerm?.length > 0 ? (
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: C.gray400,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 8,
                  }}
                >
                  By term
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {summary.byTerm.map((t) => (
                    <span
                      key={t.term}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 10px',
                        borderRadius: 999,
                        background: C.white,
                        border: `1px solid ${C.gray200}`,
                        fontSize: 11,
                        color: C.navy,
                        fontWeight: 600,
                      }}
                    >
                      <strong style={{ fontWeight: 800 }}>{t.term}</strong>
                      <span style={{ color: C.gray400 }}>·</span>
                      <span>{fmtN(t.cardCount)} cards</span>
                      <span style={{ color: C.gray400 }}>·</span>
                      <span>{fmtN(t.studentCount)} students</span>
                      <span style={{ color: C.gray400 }}>·</span>
                      <span style={{ color: C.green, fontWeight: 700 }}>
                        {fmtN(t.projectedTotalDue)} RWF
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div
              style={{
                borderRadius: 12,
                border: `1px solid ${C.gray200}`,
                background: C.white,
                overflow: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.gray50, borderBottom: `1px solid ${C.gray200}` }}>
                    {[
                      'Class',
                      'Term',
                      'Students',
                      'Tuition / student',
                      'Paid at school / student',
                      'Per-student due',
                      'Projected total (all students)',
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '10px 12px',
                          textAlign: h === 'Class' || h === 'Term' ? 'left' : 'right',
                          fontWeight: 700,
                          color: C.gray600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cards.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          padding: '20px 12px',
                          textAlign: 'center',
                          color: C.gray400,
                        }}
                      >
                        No fee cards found for this period.
                      </td>
                    </tr>
                  ) : (
                    cards.map((card, idx) => (
                      <tr
                        key={`${card.class_name || ''}-${card.term || ''}-${idx}`}
                        style={{ borderBottom: `1px solid ${C.gray100}` }}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: C.navy }}>
                          {classLabel(card)}
                        </td>
                        <td style={{ padding: '10px 12px', color: C.gray600 }}>
                          {card.term || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          {fmtN(card.studentCount)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          {fmtN(card.tuition_total)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          {fmtN(card.paid_at_school_total)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                          {fmtN(card.perStudentDue ?? card.total_due)}
                        </td>
                        <td
                          style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: C.green,
                          }}
                        >
                          {fmtN(card.projectedTotalDue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {cards.length > 0 ? (
                  <tfoot>
                    <tr style={{ background: C.gray50, borderTop: `2px solid ${C.gray200}` }}>
                      <td
                        colSpan={2}
                        style={{
                          padding: '10px 12px',
                          fontWeight: 800,
                          color: C.navy,
                        }}
                      >
                        Totals
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800 }}>
                        {fmtN(tableStudents)}
                      </td>
                      <td colSpan={3} />
                      <td
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          fontWeight: 800,
                          color: C.green,
                        }}
                      >
                        {fmtN(tableProjected)} RWF
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: '14px 16px',
                borderRadius: 12,
                background: C.white,
                border: `1px solid ${C.amber}55`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <Sparkles size={18} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.navy }}>
                    Suggested expected amount
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: C.gray600, lineHeight: 1.5 }}>
                    Apply a projected total from Babyeyi fee cards, or keep editing the amount field
                    below manually.
                  </p>
                </div>
              </div>

              {amountDiffers ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: `${C.amber}18`,
                    marginBottom: 10,
                    fontSize: 11,
                    color: C.navy,
                  }}
                >
                  <CircleAlert size={14} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>
                    Your expected amount (<strong>{fmtN(expected)} RWF</strong>) differs from the
                    projected total (<strong>{fmtN(projectedTotal)} RWF</strong>).
                  </span>
                </div>
              ) : null}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onApplyAmount?.(projectedTotal)}
                  style={{
                    ...applyBtn,
                    background: C.green,
                    color: C.white,
                  }}
                >
                  <Banknote size={14} />
                  <span>Apply projected total (all students)</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onApplyAmount?.(projectedTuition)}
                  style={{
                    ...applyBtn,
                    background: C.gray100,
                    color: C.navy,
                    border: `1px solid ${C.gray200}`,
                  }}
                >
                  <span>Tuition only (all students)</span>
                  <span style={{ color: C.gray400, fontWeight: 600 }}>
                    {fmtN(projectedTuition)} RWF
                  </span>
                </button>
              </div>

              <p style={{ margin: '10px 0 0', fontSize: 10, color: C.gray400, lineHeight: 1.5 }}>
                The expected amount field remains editable after applying a suggestion. Per-card
                rates are per student; projected columns multiply by enrolled student counts.
              </p>
            </div>
          </>
        ) : !loading && !error ? (
          <p style={{ margin: 0, fontSize: 12, color: C.gray400, textAlign: 'center', padding: 16 }}>
            No summary data available.
          </p>
        ) : null}
      </div>
    </div>
  );
}
