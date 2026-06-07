import {
  TAX_REGISTER_HEADERS,
  BANK_REGISTER_HEADERS,
  taxRowToValues,
  bankRowToValues,
  taxTotalRowToValues,
  bankTotalRowToValues,
} from '../utils/payrollReportTables';

const COL_MIN = 72;

function fmtCell(v) {
  if (v === '-' || v === '') return v === '-' ? '-' : '';
  const n = Number(v);
  if (Number.isFinite(n) && String(v).trim() !== '') return n.toLocaleString();
  return v;
}

export default function PayrollReportRegisterTable({
  variant = 'tax',
  rows = [],
  totalRow = null,
  maxHeight = 520,
  fillHeight = false,
}) {
  const headers = variant === 'bank' ? BANK_REGISTER_HEADERS : TAX_REGISTER_HEADERS;
  const rowMapper = variant === 'bank' ? bankRowToValues : taxRowToValues;
  const totalMapper = variant === 'bank' ? bankTotalRowToValues : taxTotalRowToValues;

  const scrollStyle = fillHeight || maxHeight === 'none'
    ? undefined
    : { maxHeight };

  return (
    <div className={`rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden ${fillHeight ? 'h-full' : ''}`}>
      <div
        className={`overflow-x-auto ${fillHeight ? 'h-full overflow-y-visible' : 'overflow-y-auto'}`}
        style={scrollStyle}
      >
        <table className="border-collapse text-[11px] min-w-[2200px] w-full">
          <thead>
            <tr className="bg-[#000435] text-white sticky top-0 z-10">
              {headers.map((h, i) => (
                <th
                  key={`${h}-${i}`}
                  className="py-2.5 px-2.5 text-left font-bold whitespace-nowrap text-[10px] tracking-wide"
                  style={{ minWidth: COL_MIN }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={row.staffUserId || row.registerRow?.nationalId || `${ri}`}
                className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}
              >
                {rowMapper(row).map((val, ci) => (
                  <td
                    key={ci}
                    className={`py-2 px-2.5 whitespace-nowrap tabular-nums border-b border-slate-100
                      ${ci >= 11 && ci <= 20 ? 'text-red-600' : ci >= 24 ? 'text-[#000435] font-medium' : 'text-slate-700'}
                      ${headers[ci] === 'STATUS' ? 'font-bold uppercase text-[10px]' : ''}
                    `}
                  >
                    {headers[ci] === 'STATUS' ? (
                      <span className={`inline-flex px-2 py-0.5 rounded-full ${
                        String(val).toLowerCase() === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                      >
                        {val}
                      </span>
                    ) : fmtCell(val)}
                  </td>
                ))}
              </tr>
            ))}
            {totalRow ? (
              <tr className="bg-amber-50 font-bold border-t-2 border-amber-400">
                {totalMapper(totalRow).map((val, ci) => (
                  <td key={ci} className="py-2.5 px-2.5 whitespace-nowrap tabular-nums">
                    {fmtCell(val)}
                  </td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
