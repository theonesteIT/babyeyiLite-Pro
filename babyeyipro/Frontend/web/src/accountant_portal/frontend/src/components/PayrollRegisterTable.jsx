import { Pencil } from 'lucide-react';
import {
  PAYROLL_REGISTER_HEADERS,
  registerRowToValues,
  formatPayrollRegisterCell,
} from '../utils/payrollRegister';

const COL_MIN = [
  120, 100, 90, 100, 40, 90, 100, 70, 70, 70, 90, 80, 90,
  80, 90, 90, 80, 80, 70, 80, 100, 80, 80, 90, 90, 90, 70, 90,
];

function fmtCell(v, columnIndex) {
  return formatPayrollRegisterCell(v, columnIndex);
}

export default function PayrollRegisterTable({
  rows = [],
  totalRow = null,
  compact = false,
  maxHeight = 480,
  onEditRow = null,
}) {
  const showActions = typeof onEditRow === 'function';
  const pad = compact ? '6px 8px' : '8px 10px';
  const fontSize = compact ? 10 : 11;

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight }}>
      <table style={{ borderCollapse: 'collapse', fontSize, minWidth: 2400, width: '100%' }}>
        <thead>
          <tr style={{ background: '#000435', color: '#fff', position: 'sticky', top: 0, zIndex: 1 }}>
            {PAYROLL_REGISTER_HEADERS.map((h, i) => (
              <th
                key={`${h}-${i}`}
                style={{
                  padding: pad,
                  textAlign: 'left',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  minWidth: COL_MIN[i] || 70,
                  fontSize: compact ? 9 : 10,
                  letterSpacing: '0.02em',
                }}
              >
                {h}
              </th>
            ))}
            {showActions ? (
              <th
                style={{
                  padding: pad,
                  textAlign: 'center',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  minWidth: 72,
                  fontSize: compact ? 9 : 10,
                  position: 'sticky',
                  right: 0,
                  background: '#000435',
                }}
              >
                Edit
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={row.rssbNumber || row.nationalId || `${row.firstName}-${ri}`}
              style={{ background: ri % 2 === 0 ? '#fff' : '#F7F8FC', borderBottom: '1px solid #E4E8F0' }}
            >
              {registerRowToValues(row).map((val, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: pad,
                    whiteSpace: 'nowrap',
                    color: ci >= 11 && ci <= 20 ? '#DC2626' : ci >= 24 ? '#000435' : '#374151',
                    fontWeight: ci === 27 ? 700 : 400,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {fmtCell(val, ci)}
                </td>
              ))}
              {showActions ? (
                <td
                  style={{
                    padding: pad,
                    textAlign: 'center',
                    position: 'sticky',
                    right: 0,
                    background: ri % 2 === 0 ? '#fff' : '#F7F8FC',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onEditRow(row)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600 hover:border-[#F59E0B] hover:text-[#000435]"
                    title="Edit allowances & deductions for this employee"
                  >
                    <Pencil size={12} />
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
          {totalRow ? (
            <tr style={{ background: '#FEF3C7', fontWeight: 800, borderTop: '2px solid #F59E0B' }}>
              {registerRowToValues(totalRow).map((val, ci) => (
                <td key={ci} style={{ padding: pad, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtCell(val, ci)}
                </td>
              ))}
              {showActions ? <td style={{ padding: pad }} /> : null}
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
