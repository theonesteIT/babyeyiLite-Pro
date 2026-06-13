import { COLORS } from '../utils/budgetLineConstants';

/**
 * Expense line usage bar (used ÷ planned). Min visible width when usage > 0.
 */
export default function ExpenseUsageBar({ pct, height = 8, showLabel = true, compact }) {
  const n = Math.max(0, Math.min(100, Number(pct) || 0));
  const color = n >= 100 ? COLORS.red : n >= 80 ? COLORS.amber : COLORS.green;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 6 : 8, minWidth: compact ? 80 : 100 }}>
      <div
        style={{
          flex: 1,
          background: COLORS.gray200,
          borderRadius: 99,
          height,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${n}%`,
            minWidth: n > 0 ? Math.max(height, 6) : 0,
            height: '100%',
            background: `linear-gradient(90deg, ${color}, ${color}dd)`,
            borderRadius: 99,
            transition: 'width 0.35s ease',
          }}
        />
      </div>
      {showLabel && (
        <span
          style={{
            fontSize: compact ? 11 : 12,
            fontWeight: 500,
            color: n >= 100 ? COLORS.red : COLORS.navy,
            minWidth: 36,
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {n}%
        </span>
      )}
    </div>
  );
}
