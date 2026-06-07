import { formatRwfShort } from '../reportConfig';

function HealthStatusBadge({ value }) {
  const label = value || 'Used';
  const isUsed = label === 'Used';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${
      isUsed ? 'bg-emerald-100 text-emerald-800 ring-emerald-200' : 'bg-amber-100 text-amber-900 ring-amber-200'
    }`}
    >
      {label}
    </span>
  );
}

function formatCell(val, field) {
  if (val == null || val === '') return '—';
  if (typeof val === 'number' && /price|value|cost|balance|depreciation|dep/i.test(field)) {
    return formatRwfShort(val);
  }
  if (typeof val === 'string' && val.includes('T') && val.includes(':')) {
    try {
      return new Date(val).toLocaleDateString();
    } catch {
      return val;
    }
  }
  return String(val);
}

export default function ReportDataTable({ table, columns, tableId = 'report-table' }) {
  const cols = columns || [];
  const rows = table?.rows || [];

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 py-16 text-center text-sm text-slate-500">
        No records match the current filters.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table id={tableId} className="w-full text-left text-sm min-w-[640px]">
          <thead>
            <tr className="bg-[#000435] text-[#FFB300]">
              {cols.map((c) => (
                <th key={c.label} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50 hover:bg-amber-50/30'}>
                {cols.map((c) => (
                  <td key={c.label} className="px-4 py-2.5 text-[12px] text-slate-700 whitespace-nowrap tabular-nums">
                    {c.field === 'health_status' ? (
                      <HealthStatusBadge value={row[c.field]} />
                    ) : (
                      formatCell(row[c.field], c.field)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100">
        Showing {rows.length} record{rows.length === 1 ? '' : 's'}
      </p>
    </div>
  );
}
