import QRCode from '../../../../../assets_portal/components/AssetQrCode';
import { buildAssetScanUrl } from '../../../../../assets_portal/utils/assetsQr';
import { formatRwfPlain } from '../../../../../assets_portal/utils/financialYearUtils';
import { ALL_ASSETS_REPORT_COLUMNS, NAVY } from '../reportConfig';

function fmtMoney(v) {
  if (v == null || v === '') return '—';
  return `RWF ${formatRwfPlain(v)}`;
}

function HealthBadge({ value }) {
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

function renderCell(row, col) {
  const val = row[col.field];
  if (col.field === 'asset_health_status') return <HealthBadge value={val} />;
  if (col.field === 'qr_code') {
    const qrValue = row.id ? buildAssetScanUrl({ id: row.id, asset_code: row.asset_code, qr_value: val }) : val;
    return (
      <div className="flex flex-col items-center gap-1 min-w-[52px]">
        <div className="bg-white p-0.5 rounded border border-gray-200">
          <QRCode value={qrValue || val || ''} size={36} level="M" />
        </div>
        <span className="text-[9px] font-mono text-slate-400 max-w-[80px] truncate" title={val}>
          {row.asset_code || ''}
        </span>
      </div>
    );
  }
  if (col.money) return fmtMoney(val);
  if (val == null || val === '') return '—';
  return String(val);
}

export default function AllAssetsReportTable({ rows = [], tableId = 'report-table' }) {
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
        <table id={tableId} className="w-full text-left text-sm min-w-[2400px]">
          <thead>
            <tr style={{ background: NAVY }} className="text-[#FFB300]">
              {ALL_ASSETS_REPORT_COLUMNS.map((col) => (
                <th
                  key={col.field}
                  className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => (
              <tr key={row.id ?? i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40 hover:bg-amber-50/30'}>
                {ALL_ASSETS_REPORT_COLUMNS.map((col) => (
                  <td
                    key={col.field}
                    className={`px-3 py-2.5 text-[11px] whitespace-nowrap ${
                      col.money ? 'font-mono tabular-nums' : ''
                    } ${col.field === 'asset_name' ? 'font-medium' : 'text-slate-700'}`}
                  >
                    {renderCell(row, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-[10px] text-gray-400 text-center border-t border-gray-50 bg-gray-50/50">
        Showing {rows.length} asset{rows.length === 1 ? '' : 's'} · Scroll horizontally →
      </p>
    </div>
  );
}

export { ALL_ASSETS_REPORT_COLUMNS };
