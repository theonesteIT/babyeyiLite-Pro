import React from 'react';

const STATUS_STYLE = {
  Present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Absent: 'bg-red-50 text-red-700 border-red-200',
  Late: 'bg-amber-50 text-amber-700 border-amber-200',
  Excused: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function AttendanceTable({
  periods = [],
  rows = [],
  currentPeriod = '',
  onToggleCell,
  onRemarksChange,
}) {
  return (
    <div className="overflow-auto rounded-2xl border border-black/10 bg-white">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-re-bg/40">
          <tr>
            <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Student ID</th>
            <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Student Name</th>
            {periods.map((p) => (
              <th
                key={p.period}
                className={`px-2 py-3 text-center text-[11px] font-black uppercase ${
                  currentPeriod === p.period ? 'bg-re-orange/10 text-re-orange' : ''
                }`}
              >
                <div>{p.period}</div>
                <div className="text-[10px] font-bold normal-case">{p.subject}</div>
              </th>
            ))}
            <th className="px-3 py-3 text-center text-[11px] font-black uppercase">Total Present</th>
            <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const presentCount = periods.reduce(
              (acc, p) => acc + (row.period_statuses?.[p.period] === 'Present' ? 1 : 0),
              0
            );
            return (
              <tr key={row.student_id} className="border-t border-black/5">
                <td className="px-3 py-2 font-bold">{row.student_uid}</td>
                <td className="px-3 py-2 font-semibold">{row.student_name}</td>
                {periods.map((p) => {
                  const value = row.period_statuses?.[p.period] || 'Present';
                  return (
                    <td key={`${row.student_id}-${p.period}`} className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => onToggleCell?.(row.student_id, p.period)}
                        className={`min-w-[84px] rounded-lg border px-2 py-1 text-[11px] font-black ${
                          STATUS_STYLE[value] || STATUS_STYLE.Present
                        }`}
                      >
                        {value}
                      </button>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center font-black">{presentCount}</td>
                <td className="px-3 py-2">
                  <input
                    value={row.remarks || ''}
                    onChange={(e) => onRemarksChange?.(row.student_id, e.target.value)}
                    className="h-9 w-full rounded-lg border border-black/10 px-2 text-xs"
                    placeholder="Optional remark"
                  />
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={periods.length + 4} className="px-3 py-8 text-center font-bold text-re-text-muted">
                No students loaded for the selected class and filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
