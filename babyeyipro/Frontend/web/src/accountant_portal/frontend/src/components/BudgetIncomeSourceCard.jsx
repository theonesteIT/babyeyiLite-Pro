import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  X,
  TrendingDown,
  TrendingUp,
  Wallet,
  Calculator,
} from 'lucide-react';
import TuitionFeesBudgetPanel from './TuitionFeesBudgetPanel';
import IncomeSourceIcon from './IncomeSourceIcon';
import {
  CALC_FIXED_AMOUNT,
  CALC_PER_STUDENT,
  computeIncomeSource,
  computeDeductionTotal,
  DEDUCTION_CATEGORIES,
  fmtRwf,
  getPresetForSource,
  incomeSourceDisplayName,
  isTuitionFeesSource,
  newIncomeUid,
  normalizeDeduction,
  parseAmt,
  resolveIncomeUnitAmount,
} from '../utils/budgetIncomeConfig';

const C = {
  navy: '#000435',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray600: '#4B5563',
  green: '#10B981',
  red: '#EF4444',
};

const FLBL = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  color: C.gray400,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 6,
};

const FINP = {
  width: '100%',
  boxSizing: 'border-box',
  border: `1px solid ${C.gray200}`,
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 13,
  color: C.navy,
  background: C.white,
};

function SectionTitle({ children }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: C.navy,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 14,
        paddingBottom: 8,
        borderBottom: `2px solid ${C.amber}`,
      }}
    >
      {children}
    </div>
  );
}

function SummaryCard({ label, value, sub, valueColor, icon: Icon, iconColor }) {
  return (
    <div
      style={{
        background: C.gray50,
        borderRadius: 12,
        padding: '16px 18px',
        border: `1px solid ${C.gray200}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {Icon ? <Icon size={16} color={iconColor || C.navy} /> : null}
        <span style={{ fontSize: 10, fontWeight: 600, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: valueColor || C.navy }}>{value}</div>
      {sub ? <div style={{ fontSize: 10, color: C.green, marginTop: 4, fontWeight: 600 }}>{sub}</div> : null}
    </div>
  );
}

function AddDeductionModal({ open, onClose, onSave, disabled, defaultUnitAmount }) {
  const [form, setForm] = useState({ category: '', quantity: '', unitAmount: '', description: '' });

  useEffect(() => {
    if (open) {
      setForm({
        category: DEDUCTION_CATEGORIES[0],
        quantity: '',
        unitAmount: defaultUnitAmount > 0 ? String(defaultUnitAmount) : '',
        description: '',
      });
    }
  }, [open, defaultUnitAmount]);

  if (!open) return null;

  const qty = parseAmt(form.quantity);
  const unit = parseAmt(form.unitAmount);
  const computedTotal = computeDeductionTotal(
    { quantity: form.quantity, unitAmount: form.unitAmount, amount: '' },
    { incomeUnitAmount: defaultUnitAmount }
  );
  const useQuantityMode = qty > 0;

  const handleSave = () => {
    if (!form.category.trim() || computedTotal <= 0) return;
    onSave({
      id: newIncomeUid(),
      category: form.category.trim(),
      quantity: form.quantity,
      unitAmount: form.unitAmount,
      amount: String(computedTotal),
      description: form.description.trim(),
    });
    onClose();
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        background: 'rgba(0,4,53,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: C.white,
          borderRadius: 14,
          width: 'min(420px, 96vw)',
          boxShadow: '0 20px 48px rgba(0,4,53,0.2)',
          overflow: 'hidden',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: C.navy,
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: C.amber }}>Add Income Deduction</span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.white }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={FLBL}>Deduction category *</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              style={{ ...FINP, fontWeight: 600 }}
              disabled={disabled}
            >
              {DEDUCTION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={FLBL}>Quantity (optional)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              placeholder="e.g. 83 students"
              style={FINP}
              disabled={disabled}
            />
            <p style={{ fontSize: 10, color: C.gray400, margin: '4px 0 0' }}>
              Enter quantity to auto-calculate from unit amount. Leave blank for a flat deduction.
            </p>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={FLBL}>
              {useQuantityMode ? 'Unit amount (RWF) *' : 'Deduction amount (RWF) *'}
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={form.unitAmount}
              onChange={(e) => setForm((f) => ({ ...f, unitAmount: e.target.value }))}
              placeholder={useQuantityMode ? 'Per unit rate' : '300,000'}
              style={{ ...FINP, fontWeight: 700 }}
              disabled={disabled}
            />
            {useQuantityMode && defaultUnitAmount > 0 && unit <= 0 && (
              <p style={{ fontSize: 10, color: C.amber, margin: '4px 0 0', fontWeight: 600 }}>
                Will use income source rate: {fmtRwf(defaultUnitAmount)} RWF
              </p>
            )}
          </div>
          <div
            style={{
              marginBottom: 14,
              padding: '12px 14px',
              borderRadius: 10,
              background: `${C.navy}08`,
              border: `1px solid ${C.gray200}`,
            }}
          >
            <div style={{ fontSize: 10, color: C.gray400, fontWeight: 600, textTransform: 'uppercase' }}>
              Calculated total
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: computedTotal > 0 ? C.red : C.gray400, marginTop: 4 }}>
              {fmtRwf(computedTotal)} RWF
            </div>
            {useQuantityMode && computedTotal > 0 && (
              <div style={{ fontSize: 10, color: C.gray600, marginTop: 4 }}>
                {fmtRwf(qty)} × {fmtRwf(unit > 0 ? unit : defaultUnitAmount)} RWF
              </div>
            )}
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={FLBL}>Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Students under bursary program"
              rows={3}
              style={{ ...FINP, resize: 'vertical' }}
              disabled={disabled}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                border: `2px solid ${C.navy}`,
                background: C.white,
                color: C.navy,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={disabled || !form.category || computedTotal <= 0}
              onClick={handleSave}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                border: 'none',
                background: C.navy,
                color: C.white,
                fontWeight: 600,
                fontSize: 13,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled || computedTotal <= 0 ? 0.6 : 1,
              }}
            >
              Save Deduction
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function BudgetIncomeSourceCard({
  source,
  index,
  onChange,
  onDuplicate,
  onDelete,
  canDelete,
  academicYear,
  term,
  budgetType,
  frequencyList = [],
  categoryList = [],
  incomeSourceOptions = [],
  disabled,
  isMobile,
}) {
  const [deductionModalOpen, setDeductionModalOpen] = useState(false);
  const [perStudentOpen, setPerStudentOpen] = useState(false);

  const calc = useMemo(() => computeIncomeSource(source), [source]);
  const incomeUnitAmount = useMemo(() => resolveIncomeUnitAmount(source), [source]);
  const isTuition = isTuitionFeesSource(source.incomeSource);
  const isOther = !source.incomeSource || String(source.incomeSource).toLowerCase() === 'other';
  const preset = getPresetForSource(source.incomeSource);
  const displayName = incomeSourceDisplayName(source);
  const deductions = (source.deductions || []).map(normalizeDeduction);

  const sourceOptions = useMemo(() => {
    const presets = incomeSourceOptions.length
      ? incomeSourceOptions
      : ['Academic Fees', 'Tuition Fees', 'Registration Fees', 'Feeding Fees', 'Uniform Sales', 'Other'];
    return [...new Set(presets)];
  }, [incomeSourceOptions]);

  const patch = (p) => onChange(index, p);

  const applyTuitionFromBabyeyi = (amount, summary) => {
    const students = Number(summary?.totalStudents || 0);
    const gross = Math.round(parseAmt(amount));
    const unit = students > 0 ? Math.round(gross / students) : 0;
    patch({
      grossAmount: String(gross),
      unitAmount: unit > 0 ? String(unit) : source.unitAmount,
      expectedBeneficiaries: students > 0 ? String(students) : source.expectedBeneficiaries,
      tuitionAutoFilled: true,
      calculationType: CALC_PER_STUDENT,
    });
  };

  const saveDeduction = (ded) => {
    patch({ deductions: [...deductions, ded] });
  };

  const removeDeduction = (dedId) => {
    patch({ deductions: deductions.filter((d) => d.id !== dedId) });
  };

  const handleGrossChange = (val) => {
    patch({ grossAmount: val, tuitionAutoFilled: false });
  };

  const handlePerStudentChange = (field, val) => {
    const next = { ...source, [field]: val, tuitionAutoFilled: false };
    const unit = parseAmt(field === 'unitAmount' ? val : next.unitAmount);
    const ben = parseAmt(field === 'expectedBeneficiaries' ? val : next.expectedBeneficiaries);
    patch({
      [field]: val,
      tuitionAutoFilled: false,
      grossAmount: unit > 0 && ben > 0 ? String(Math.round(unit * ben)) : source.grossAmount,
    });
  };

  return (
    <>
      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${C.gray200}`,
          background: C.white,
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,4,53,0.06)',
        }}
      >
        {/* Card header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '12px 16px',
            background: C.gray50,
            borderBottom: `1px solid ${C.gray200}`,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              <IncomeSourceIcon name={preset?.icon || 'CircleDollarSign'} size={18} color={C.navy} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>
              {displayName}
              <span style={{ color: C.amber, marginLeft: 6, fontSize: 11 }}>#{index + 1}</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onDuplicate(index)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 10px',
                borderRadius: 8,
                border: `1px solid ${C.amber}`,
                background: C.amberLight,
                color: C.navy,
                fontSize: 11,
                fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              <Copy size={12} /> Duplicate
            </button>
          </div>
        </div>

        <div style={{ padding: '18px 16px' }}>
          {/* Income Source Details */}
          <SectionTitle>Income Source Details</SectionTitle>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {!isOther ? (
              <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
                <label style={FLBL}>Income source *</label>
                <select
                  value={source.incomeSource}
                  onChange={(e) => {
                    const key = e.target.value;
                    const p = getPresetForSource(key);
                    patch({
                      incomeSource: key,
                      incomeCategory: p?.category || source.incomeCategory,
                      calculationType: p?.calculationType || source.calculationType,
                    });
                  }}
                  style={{ ...FINP, fontWeight: 600 }}
                  disabled={disabled}
                >
                  {sourceOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {getPresetForSource(opt)?.label || opt}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label style={FLBL}>Income source name *</label>
                  <input
                    value={source.customSourceName}
                    onChange={(e) => patch({ customSourceName: e.target.value })}
                    placeholder="Enter custom income source"
                    style={FINP}
                    disabled={disabled}
                  />
                </div>
                <div>
                  <label style={FLBL}>Income category</label>
                  <select
                    value={source.incomeCategory}
                    onChange={(e) => patch({ incomeCategory: e.target.value })}
                    style={FINP}
                    disabled={disabled}
                  >
                    <option value="">Select category</option>
                    {categoryList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {calc.calculationType === CALC_PER_STUDENT && (
              <div style={{ gridColumn: '1 / -1' }}>
                <button
                  type="button"
                  onClick={() => setPerStudentOpen((v) => !v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.navy,
                  }}
                >
                  <Calculator size={14} color={C.amber} />
                  Per-student calculation
                  <ChevronDown size={14} style={{ transform: perStudentOpen ? 'rotate(180deg)' : 'none' }} />
                </button>
                {perStudentOpen && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                      gap: 12,
                      marginTop: 10,
                      padding: 12,
                      background: C.gray50,
                      borderRadius: 10,
                      border: `1px solid ${C.gray200}`,
                    }}
                  >
                    <div>
                      <label style={FLBL}>Unit amount (RWF)</label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={source.unitAmount}
                        onChange={(e) => handlePerStudentChange('unitAmount', e.target.value)}
                        style={FINP}
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <label style={FLBL}>Expected beneficiaries</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={source.expectedBeneficiaries}
                        onChange={(e) => handlePerStudentChange('expectedBeneficiaries', e.target.value)}
                        style={FINP}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ gridColumn: isMobile ? undefined : calc.calculationType === CALC_FIXED_AMOUNT ? '1 / -1' : undefined }}>
              <label style={FLBL}>Expected gross amount (RWF) *</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={source.grossAmount || (calc.grossAmount > 0 ? String(calc.grossAmount) : '')}
                onChange={(e) => handleGrossChange(e.target.value)}
                placeholder="4,000,000"
                style={{ ...FINP, fontWeight: 700, borderColor: isTuition && source.tuitionAutoFilled ? C.green : C.gray200 }}
                disabled={disabled}
              />
              {calc.calculationType === CALC_PER_STUDENT && calc.grossAmount > 0 && (
                <p style={{ fontSize: 10, color: C.gray400, marginTop: 4 }}>
                  Auto-calculated from unit × beneficiaries, or enter manually.
                </p>
              )}
            </div>

            <div>
              <label style={FLBL}>Collection frequency *</label>
              <select
                value={source.collectionFrequency}
                onChange={(e) => patch({ collectionFrequency: e.target.value })}
                style={FINP}
                disabled={disabled}
              >
                <option value="">Select frequency</option>
                {frequencyList.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={FLBL}>Description (optional)</label>
              <textarea
                value={source.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Optional notes for this income source"
                rows={2}
                style={{ ...FINP, resize: 'vertical' }}
                disabled={disabled}
              />
            </div>
          </div>

          {isTuition && (
            <div style={{ marginBottom: 16 }}>
              <TuitionFeesBudgetPanel
                academicYear={academicYear}
                term={term}
                budgetType={budgetType}
                expectedAmount={calc.grossAmount}
                disabled={disabled}
                onApplyAmount={(amount, summary) => applyTuitionFromBabyeyi(amount, summary)}
              />
            </div>
          )}

          {/* Income Deductions */}
          <SectionTitle>Income Deductions</SectionTitle>
          <p style={{ fontSize: 12, color: C.gray600, margin: '0 0 14px', lineHeight: 1.5 }}>
            Add any deductions that may reduce the expected income from this source.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setDeductionModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: C.navy,
                color: C.white,
                fontSize: 12,
                fontWeight: 700,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
              }}
            >
              <Plus size={14} />
              Add Deduction
            </button>
          </div>

          <div
            style={{
              borderRadius: 10,
              border: `1px solid ${C.gray200}`,
              overflow: 'auto',
              marginBottom: 16,
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.gray50 }}>
                  {['#', 'Deduction category', 'Qty', 'Unit (RWF)', 'Amount (RWF)', 'Description', 'Action'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 12px',
                        textAlign: ['Amount (RWF)', 'Unit (RWF)', 'Qty', '#', 'Action'].includes(h) ? 'center' : 'left',
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
                {deductions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '20px 12px', textAlign: 'center', color: C.gray400, fontStyle: 'italic' }}>
                      No deductions added yet.
                    </td>
                  </tr>
                ) : (
                  deductions.map((ded, i) => {
                    const lineTotal = computeDeductionTotal(ded, { incomeUnitAmount });
                    const qty = parseAmt(ded.quantity);
                    const unit = parseAmt(ded.unitAmount);
                    return (
                    <tr key={ded.id} style={{ borderTop: `1px solid ${C.gray100}` }}>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: C.gray600, fontWeight: 600 }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: C.navy }}>{ded.category || '—'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: C.gray600 }}>
                        {qty > 0 ? fmtRwf(qty) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: C.gray600 }}>
                        {qty > 0
                          ? fmtRwf(unit > 0 ? unit : incomeUnitAmount)
                          : unit > 0
                            ? fmtRwf(unit)
                            : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: C.red }}>
                        {fmtRwf(lineTotal)}
                      </td>
                      <td style={{ padding: '10px 12px', color: C.gray600, maxWidth: 160 }}>
                        {ded.description || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => removeDeduction(ded.id)}
                          title="Remove deduction"
                          style={{
                            background: '#FEF2F2',
                            border: `1px solid ${C.red}33`,
                            borderRadius: 6,
                            padding: 6,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            color: C.red,
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
              {deductions.length > 0 && (
                <tfoot>
                  <tr style={{ background: C.gray50, borderTop: `2px solid ${C.gray200}` }}>
                    <td colSpan={4} style={{ padding: '10px 12px', fontWeight: 700, color: C.navy, textAlign: 'right' }}>
                      Total deductions:
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: C.red, fontSize: 14 }}>
                      {fmtRwf(calc.totalDeductions)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Calculation summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <SummaryCard
              label="Expected gross income"
              value={`${fmtRwf(calc.grossAmount)} RWF`}
              icon={TrendingUp}
              iconColor={C.navy}
            />
            <SummaryCard
              label="Total deductions"
              value={`${fmtRwf(calc.totalDeductions)} RWF`}
              icon={TrendingDown}
              iconColor={C.red}
              valueColor={C.red}
            />
            <SummaryCard
              label="Net expected income"
              value={`${fmtRwf(calc.netAmount)} RWF`}
              sub="(Net amount)"
              icon={Wallet}
              iconColor={C.green}
              valueColor={C.green}
            />
          </div>

          <p style={{ fontSize: 11, color: C.gray400, margin: '0 0 14px', textAlign: 'center' }}>
            Net expected income = Expected gross income − Total deductions
          </p>

          {canDelete && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onDelete(index)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                border: `1px solid ${C.red}`,
                background: C.white,
                color: C.red,
                fontSize: 12,
                fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              <Trash2 size={14} />
              Delete Income Source
            </button>
          )}
        </div>
      </div>

      <AddDeductionModal
        open={deductionModalOpen}
        onClose={() => setDeductionModalOpen(false)}
        onSave={saveDeduction}
        disabled={disabled}
        defaultUnitAmount={incomeUnitAmount}
      />
    </>
  );
}
