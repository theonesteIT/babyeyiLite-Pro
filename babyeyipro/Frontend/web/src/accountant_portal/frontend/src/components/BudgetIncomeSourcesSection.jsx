import { useMemo, useState } from 'react';
import { Plus, Wallet, ChevronDown } from 'lucide-react';
import BudgetIncomeSourceCard from './BudgetIncomeSourceCard';
import IncomeSourceIcon from './IncomeSourceIcon';
import {
  computeBudgetIncomeSummary,
  emptyIncomeSource,
  fmtRwf,
  INCOME_SOURCE_PRESETS,
  incomeSourceDisplayName,
  newIncomeUid,
  syncIncomeExpectedAmount,
} from '../utils/budgetIncomeConfig';

const C = {
  navy: '#000435',
  amber: '#F59E0B',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray600: '#4B5563',
  green: '#10B981',
  red: '#EF4444',
};

export default function BudgetIncomeSourcesSection({
  incomes,
  onIncomesChange,
  academicYear,
  term,
  budgetType,
  frequencyList = [],
  categoryList = [],
  incomeSourceOptions = [],
  disabled,
  isMobile,
  fmt,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const summary = useMemo(() => computeBudgetIncomeSummary(incomes), [incomes]);

  const updateIncome = (idx, patch) => {
    const next = incomes.map((row, i) => {
      if (i !== idx) return row;
      return syncIncomeExpectedAmount({ ...row, ...patch });
    });
    onIncomesChange(next);
  };

  const addSource = (presetKey) => {
    const row = emptyIncomeSource(presetKey);
    onIncomesChange([...incomes, syncIncomeExpectedAmount(row)]);
    setPickerOpen(false);
  };

  const duplicateSource = (idx) => {
    const src = incomes[idx];
    if (!src) return;
    const copy = syncIncomeExpectedAmount({
      ...src,
      uid: newIncomeUid(),
      deductions: (src.deductions || []).map((d) => ({ ...d, id: newIncomeUid() })),
    });
    const next = [...incomes];
    next.splice(idx + 1, 0, copy);
    onIncomesChange(next);
  };

  const removeSource = (idx) => {
    onIncomesChange(incomes.filter((_, i) => i !== idx));
  };

  const usedKeys = new Set(
    incomes.map((r) => String(r.incomeSource || '').trim()).filter((k) => k && k.toLowerCase() !== 'other')
  );

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wallet size={18} color={C.navy} />
          <span style={{ fontWeight: 700, color: C.navy, fontSize: 15 }}>Income Sources</span>
          <span
            style={{
              background: C.amber,
              color: C.navy,
              borderRadius: 999,
              padding: '2px 10px',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {summary.sourceCount}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
        {incomes.map((row, idx) => (
          <BudgetIncomeSourceCard
            key={row.uid || idx}
            source={row}
            index={idx}
            onChange={updateIncome}
            onDuplicate={duplicateSource}
            onDelete={removeSource}
            canDelete={incomes.length > 0}
            academicYear={academicYear}
            term={term}
            budgetType={budgetType}
            frequencyList={frequencyList}
            categoryList={categoryList}
            incomeSourceOptions={incomeSourceOptions}
            disabled={disabled}
            isMobile={isMobile}
          />
        ))}
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setPickerOpen((v) => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '14px 20px',
            borderRadius: 12,
            border: `2px dashed ${C.amber}`,
            background: `${C.amber}12`,
            color: C.navy,
            fontWeight: 700,
            fontSize: 13,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <Plus size={18} color={C.amber} />
          Add Income Source
          <ChevronDown
            size={16}
            style={{ transform: pickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </button>

        {pickerOpen && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '100%',
              marginTop: 8,
              zIndex: 50,
              background: C.white,
              borderRadius: 14,
              border: `1px solid ${C.gray200}`,
              boxShadow: '0 12px 32px rgba(0,4,53,0.12)',
              padding: 12,
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
              gap: 8,
            }}
          >
            {INCOME_SOURCE_PRESETS.map((preset) => {
              const taken = preset.key !== '__custom__' && preset.key !== 'Other' && usedKeys.has(preset.key);
              return (
                <button
                  key={preset.key}
                  type="button"
                  disabled={disabled || taken}
                  onClick={() => addSource(preset.key)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: `1px solid ${taken ? C.gray200 : `${C.navy}18`}`,
                    background: taken ? C.gray50 : C.white,
                    cursor: taken || disabled ? 'not-allowed' : 'pointer',
                    opacity: taken ? 0.5 : 1,
                    textAlign: 'left',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${C.amber}18`,
                    }}
                  >
                    <IncomeSourceIcon name={preset.icon} size={18} color={C.navy} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{preset.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {summary.rows.length > 0 && (
        <div
          style={{
            borderRadius: 14,
            overflow: 'hidden',
            border: `1px solid ${C.gray200}`,
            background: C.white,
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              background: C.navy,
              color: C.amber,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Budget Income Summary
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.gray50 }}>
                  {['Income source', 'Gross amount', 'Deductions', 'Net amount'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 14px',
                        textAlign: h === 'Income source' ? 'left' : 'right',
                        fontSize: 10,
                        fontWeight: 700,
                        color: C.gray400,
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.gray200}` }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: C.navy }}>
                      {row.name || incomeSourceDisplayName(row.source)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: C.gray600 }}>
                      {fmt ? fmt(row.grossAmount) : fmtRwf(row.grossAmount)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: C.red, fontWeight: 600 }}>
                      {fmt ? fmt(row.totalDeductions) : fmtRwf(row.totalDeductions)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: C.amber }}>
                      {fmt ? fmt(row.netAmount) : fmtRwf(row.netAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: `${C.navy}06` }}>
                  <td colSpan={4} style={{ padding: '16px' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                        gap: 14,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 10, color: C.gray400, fontWeight: 700, textTransform: 'uppercase' }}>
                          Total gross income
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginTop: 4 }}>
                          {fmt ? fmt(summary.grossIncome) : fmtRwf(summary.grossIncome)} RWF
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: C.gray400, fontWeight: 700, textTransform: 'uppercase' }}>
                          Total deductions
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: C.red, marginTop: 4 }}>
                          {fmt ? fmt(summary.totalDeductionsImpact) : fmtRwf(summary.totalDeductionsImpact)} RWF
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: C.gray400, fontWeight: 700, textTransform: 'uppercase' }}>
                          Total net budget income
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: C.green, marginTop: 4 }}>
                          {fmt ? fmt(summary.netIncome) : fmtRwf(summary.netIncome)} RWF
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
