import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Loader2, RefreshCw, Users } from 'lucide-react';
import api from '../../manager/services/api';
import { bankItemAmountForColumn } from './payrollTemplateChannels';

const fmt = (v) => new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Number(v) || 0);

function CellAmount({ amount, kind }) {
  if (!amount) return <span className="text-slate-300">—</span>;
  const isAllowance = kind === 'allowance';
  return (
    <span className={`tabular-nums font-semibold ${isAllowance ? 'text-emerald-700' : 'text-red-600'}`}>
      {isAllowance ? '+' : '−'}{fmt(amount)}
    </span>
  );
}

export default function PayrollBankRegisterPanel({
  month = 'All',
  term = 'All',
  year = 'All',
  academicYear = '',
}) {
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [run, setRun] = useState(null);
  const [error, setError] = useState('');

  const fetchRegister = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (month && month !== 'All') params.month = month;
      if (term && term !== 'All') params.term = term;
      if (year && year !== 'All') params.year = year;
      if (academicYear) params.academic_year = academicYear;
      const res = await api.get('/manager/payroll/bank-register', { params });
      const data = res.data?.data || {};
      setColumns(Array.isArray(data.columns) ? data.columns : []);
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setRun(data.run || null);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load bank payroll register.');
      setColumns([]);
      setRows([]);
      setRun(null);
    } finally {
      setLoading(false);
    }
  }, [month, term, year, academicYear]);

  useEffect(() => {
    fetchRegister();
  }, [fetchRegister]);

  const totals = useMemo(() => {
    const bankNet = rows.reduce((s, r) => s + Number(r.bankNetPay || 0), 0);
    const colTotals = columns.map((col) => ({
      ...col,
      total: rows.reduce((s, row) => s + bankItemAmountForColumn(row.bankPayrollItems, col), 0),
    }));
    return { bankNet, colTotals };
  }, [rows, columns]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Bank payroll register</p>
          <p className="text-sm font-semibold text-[#000435]">
            {run?.period || run?.monthLabel || 'Latest run'}
            {run?.statusLabel ? ` · ${run.statusLabel}` : ''}
          </p>
          {columns.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {columns.map((col) => (
                <span
                  key={col.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${
                    col.kind === 'allowance'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {col.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-1">Set allowances/deductions to Bank Payroll on Salary Template to add columns here.</p>
          )}
        </div>
        <button
          type="button"
          onClick={fetchRegister}
          disabled={loading}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-[#000435] hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-semibold">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[720px]">
            <thead>
              <tr className="bg-[#000435] text-white text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">Staff</th>
                <th className="px-4 py-3 font-bold hidden md:table-cell">Bank</th>
                {columns.map((col) => (
                  <th key={col.id} className="px-3 py-3 font-bold whitespace-nowrap bg-[#0f1f5c] border-l border-white/10">
                    {col.name}
                  </th>
                ))}
                <th className="px-4 py-3 font-bold">Tax net</th>
                <th className="px-4 py-3 font-bold text-amber-300">Bank net</th>
                <th className="px-4 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5 + columns.length} className="px-4 py-12 text-center text-slate-400">
                    <Loader2 size={22} className="animate-spin mx-auto mb-2" />
                    Loading bank register…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5 + columns.length} className="px-4 py-12 text-center text-slate-400">
                    <Building2 size={28} className="mx-auto mb-2 opacity-30" />
                    No payroll run found for the selected period.
                  </td>
                </tr>
              ) : rows.map((row) => (
                <tr key={row.staffUserId || row.staffCode} className="hover:bg-amber-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-[#000435] text-xs">{row.staffName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{row.staffCode}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs font-semibold text-slate-700">{row.bankName || '—'}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{row.bankAccount || '—'}</p>
                  </td>
                  {columns.map((col) => (
                    <td key={`${row.staffUserId}-${col.id}`} className="px-3 py-3 border-l border-slate-100 bg-slate-50/40">
                      <CellAmount amount={bankItemAmountForColumn(row.bankPayrollItems, col)} kind={col.kind} />
                    </td>
                  ))}
                  <td className="px-4 py-3 tabular-nums text-slate-700">{fmt(row.taxNetPay)}</td>
                  <td className="px-4 py-3 tabular-nums font-bold text-[#000435]">{fmt(row.bankNetPay)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      String(row.status).toLowerCase() === 'paid'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                    >
                      {row.status || 'Processing'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 ? (
              <tfoot>
                <tr className="bg-amber-50 font-bold border-t-2 border-amber-300">
                  <td className="px-4 py-3 text-[#000435]">
                    <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider">
                      <Users size={14} /> Totals ({rows.length})
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell" />
                  {totals.colTotals.map((col) => (
                    <td key={`total-${col.id}`} className="px-3 py-3 border-l border-amber-200">
                      <CellAmount amount={col.total} kind={col.kind} />
                    </td>
                  ))}
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 tabular-nums text-[#000435]">{fmt(totals.bankNet)}</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
    </div>
  );
}
