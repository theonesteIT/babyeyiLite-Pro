import { useRef, useEffect, useState, useCallback } from 'react';
import {
  TAX_REGISTER_BASE_COUNT,
  BANK_REGISTER_BASE_COUNT,
  buildTaxRegisterHeaders,
  buildBankRegisterHeaders,
  taxRowToValues,
  bankRowToValues,
  taxTotalRowToValues,
  bankTotalRowToValues,
  buildRunRegisterHeaders,
  runRowToValues,
  runTotalRowToValues,
} from '../utils/payrollReportTables';
import { formatPayrollRegisterCell } from '../utils/payrollRegister';

const COL_MIN = 72;

function fmtCell(v, columnIndex, isDynamic = false) {
  if (isDynamic) {
    const n = Number(v);
    if (!n) return '0';
    if (n < 0) return `−${Math.abs(n).toLocaleString()}`;
    return n.toLocaleString();
  }
  const formatted = formatPayrollRegisterCell(v, columnIndex);
  const n = Number(v);
  if (Number.isFinite(n) && n < 0 && columnIndex != null && columnIndex >= 5) {
    return `−${Math.abs(n).toLocaleString()}`;
  }
  return formatted;
}

function signedClass(val, kind) {
  const n = Number(val);
  if (!n) return 'text-slate-400';
  if (kind === 'allowance' || n > 0) return 'text-emerald-700 font-semibold';
  return 'text-red-600 font-semibold';
}

function channelBadgeClass(channel) {
  if (channel === 'bank') return 'bg-blue-500/15 text-blue-200 border-blue-400/30';
  if (channel === 'both') return 'bg-amber-500/15 text-amber-200 border-amber-400/30';
  return 'bg-slate-500/15 text-slate-200 border-slate-400/30';
}

export default function PayrollReportRegisterTable({
  variant = 'tax',
  rows = [],
  totalRow = null,
  bankColumns = [],
  taxColumns = [],
  runColumns = [],
  runNetLabel = 'BANK NET',
  maxHeight = 520,
  fillHeight = false,
}) {
  const dynamicColumns = variant === 'run'
    ? (runColumns.length ? runColumns : (rows[0]?.runColumns || []))
    : variant === 'bank'
      ? (bankColumns.length ? bankColumns : (rows[0]?.dynamicColumns || []))
      : (taxColumns.length ? taxColumns : (rows[0]?.taxColumns || []));
  const headers = variant === 'run'
    ? buildRunRegisterHeaders(dynamicColumns, runNetLabel)
    : variant === 'bank'
      ? buildBankRegisterHeaders(dynamicColumns)
      : buildTaxRegisterHeaders(dynamicColumns);
  const baseColCount = variant === 'run'
    ? BANK_REGISTER_BASE_COUNT
    : variant === 'bank'
      ? BANK_REGISTER_BASE_COUNT
      : TAX_REGISTER_BASE_COUNT;
  const dynStart = baseColCount;
  const dynEnd = dynStart + dynamicColumns.length;
  const rowMapper = variant === 'run'
    ? (row) => runRowToValues(row, dynamicColumns)
    : variant === 'bank'
      ? (row) => bankRowToValues(row, dynamicColumns)
      : (row) => taxRowToValues(row, dynamicColumns);
  const totalMapper = variant === 'run'
    ? (total) => runTotalRowToValues(total, dynamicColumns)
    : variant === 'bank'
      ? (total) => bankTotalRowToValues(total, dynamicColumns)
      : (total) => taxTotalRowToValues(total, dynamicColumns);

  const scrollStyle = fillHeight || maxHeight === 'none'
    ? undefined
    : { maxHeight };

  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  const tableRef = useRef(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(2200);
  const isSyncingScroll = useRef(false);
  const showBottomScroll = variant === 'bank' || variant === 'run';

  const syncHorizontalScroll = useCallback((from, to) => {
    if (!from || !to || isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    to.scrollLeft = from.scrollLeft;
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, []);

  const handleTableWheel = useCallback((event) => {
    if (!showBottomScroll || !bottomScrollRef.current) return;
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    if (!horizontal && !event.shiftKey) return;
    event.preventDefault();
    const delta = horizontal ? event.deltaX : event.deltaY;
    bottomScrollRef.current.scrollLeft += delta;
    syncHorizontalScroll(bottomScrollRef.current, topScrollRef.current);
  }, [showBottomScroll, syncHorizontalScroll]);

  useEffect(() => {
    const table = tableRef.current;
    if (!table) return undefined;
    const updateWidth = () => setTableScrollWidth(table.scrollWidth || table.offsetWidth || 2200);
    updateWidth();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateWidth) : null;
    observer?.observe(table);
    return () => observer?.disconnect();
  }, [rows, headers, dynamicColumns, totalRow]);

  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(0,4,53,0.06)] overflow-hidden flex flex-col ${fillHeight ? 'h-full min-h-0' : ''}`}>
      {dynamicColumns.length > 0 ? (
        <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-[#000435] to-[#0a1460] flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
            {variant === 'run' ? 'Template columns' : variant === 'bank' ? 'Bank payroll columns' : 'Tax payroll columns'}
          </span>
          {dynamicColumns.map((col) => (
            <span
              key={col.id}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${channelBadgeClass(col.channel)}`}
            >
              {col.name}
              <span className="opacity-70">{col.kind === 'allowance' ? '+' : '−'}</span>
              {col.channel === 'both' ? <span className="opacity-60 text-[8px]">both</span> : null}
            </span>
          ))}
        </div>
      ) : null}

      <div
        ref={topScrollRef}
        onScroll={() => syncHorizontalScroll(topScrollRef.current, bottomScrollRef.current)}
        onWheel={showBottomScroll ? handleTableWheel : undefined}
        className={`flex-1 min-h-0 overflow-y-auto ${showBottomScroll ? 'overflow-x-hidden' : 'overflow-x-auto'} [scrollbar-gutter:stable]`}
        style={scrollStyle}
      >
        <table ref={tableRef} className="border-collapse text-[11px] min-w-[2200px] w-full">
          <thead>
            <tr className="bg-[#000435] text-white sticky top-0 z-10">
              {headers.map((h, i) => {
                const isDyn = i >= dynStart && i < dynEnd;
                const dynCol = isDyn ? dynamicColumns[i - dynStart] : null;
                return (
                  <th
                    key={`${h}-${i}`}
                    className={`py-2.5 px-2.5 text-left font-bold whitespace-nowrap text-[10px] tracking-wide ${
                      isDyn ? 'bg-[#0f1f5c] border-l border-white/10' : ''
                    }`}
                    style={{ minWidth: isDyn ? 96 : COL_MIN }}
                    title={dynCol ? `${dynCol.name} (${dynCol.channel || 'tax'})` : h}
                  >
                    {h}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const values = rowMapper(row);
              return (
                <tr
                  key={row.staffUserId || row.registerRow?.nationalId || `${ri}`}
                  className={`transition-colors ${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-amber-50/40`}
                >
                  {values.map((val, ci) => {
                    const isDyn = ci >= dynStart && ci < dynEnd;
                    const dynCol = isDyn ? dynamicColumns[ci - dynStart] : null;
                    const isStatus = headers[ci] === 'STATUS';
                    return (
                      <td
                        key={ci}
                        className={`py-2 px-2.5 whitespace-nowrap tabular-nums border-b border-slate-100/80
                          ${isDyn ? signedClass(val, dynCol?.kind) : ''}
                          ${!isDyn && ci >= 11 && ci <= 20 ? 'text-red-600' : ''}
                          ${!isDyn && ci >= 24 && ci < baseColCount ? 'text-[#000435] font-medium' : ''}
                          ${!isDyn && variant === 'bank' && ci >= dynEnd ? 'text-[#000435]' : ''}
                          ${!isDyn && variant === 'run' && ci >= dynEnd ? 'text-[#000435] font-semibold' : ''}
                          ${isStatus ? 'font-bold uppercase text-[10px]' : 'text-slate-700'}
                          ${isDyn ? 'border-l border-slate-100 bg-white/50' : ''}
                        `}
                      >
                        {isStatus ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full ${
                            String(val).toLowerCase() === 'paid'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                          >
                            {val}
                          </span>
                        ) : fmtCell(val, ci, isDyn)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {totalRow ? (
              <tr className="bg-gradient-to-r from-amber-50 to-amber-100/80 font-bold border-t-2 border-amber-400">
                {totalMapper(totalRow).map((val, ci) => (
                  <td key={ci} className="py-2.5 px-2.5 whitespace-nowrap tabular-nums text-[#000435]">
                    {fmtCell(val, ci, ci >= dynStart && ci < dynEnd)}
                  </td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {showBottomScroll ? (
        <div
          ref={bottomScrollRef}
          onScroll={() => syncHorizontalScroll(bottomScrollRef.current, topScrollRef.current)}
          className="shrink-0 overflow-x-auto overflow-y-hidden border-t-2 border-[#000435]/15 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100"
          aria-label="Scroll table horizontally"
          title="Scroll table horizontally"
        >
          <div style={{ width: tableScrollWidth, height: 14 }} aria-hidden="true" />
        </div>
      ) : null}
    </div>
  );
}
