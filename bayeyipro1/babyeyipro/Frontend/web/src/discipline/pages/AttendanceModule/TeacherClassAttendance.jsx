import React, { useState } from 'react';

export default function TeacherClassAttendance({ date, rows = [], summary = [], onSimulateScan, onOverride }) {
  const [overrideStatus, setOverrideStatus] = useState({});

  return (
    <div className="space-y-4">
      <div className="overflow-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-re-bg/40">
            <tr>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Teacher</th>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Class</th>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Period</th>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Course</th>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Time</th>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Status</th>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Action</th>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">DOS Override</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={`${r.teacher_id}-${r.class_id}-${r.period}-${idx}`} className="border-t border-black/5">
                <td className="px-3 py-2 font-semibold">{r.teacher_name}</td>
                <td className="px-3 py-2">{r.class_id}</td>
                <td className="px-3 py-2">{r.period}</td>
                <td className="px-3 py-2">{r.course || '--'}</td>
                <td className="px-3 py-2">{r.check_time ? new Date(r.check_time).toLocaleTimeString() : '--'}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-black ${r.status === 'Present' ? 'bg-emerald-50 text-emerald-700' : r.status === 'Late' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onSimulateScan?.({ teacher_id: r.teacher_id, class_id: r.class_id, period: r.period, date })}
                    className="rounded-lg bg-re-grad-orange px-2 py-1 text-[11px] font-black uppercase text-white"
                  >
                    Simulate Tap
                  </button>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={overrideStatus[`${r.teacher_id}-${r.class_id}-${r.period}`] || r.status}
                      onChange={(e) =>
                        setOverrideStatus((prev) => ({
                          ...prev,
                          [`${r.teacher_id}-${r.class_id}-${r.period}`]: e.target.value,
                        }))
                      }
                      className="h-8 rounded-lg border border-black/10 px-2 text-[11px] font-semibold"
                    >
                      <option>Present</option>
                      <option>Late</option>
                      <option>Missed</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        onOverride?.({
                          teacher_id: r.teacher_id,
                          class_id: r.class_id,
                          period: r.period,
                          date,
                          course: r.course,
                          status: overrideStatus[`${r.teacher_id}-${r.class_id}-${r.period}`] || r.status,
                        })
                      }
                      className="rounded-lg border border-re-orange px-2 py-1 text-[11px] font-black uppercase text-re-orange"
                    >
                      Override
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s, i) => (
          <div key={`${s.teacher_name}-${i}`} className="rounded-xl border border-black/10 bg-white p-3">
            <div className="text-xs font-black">{s.teacher_name}</div>
            <div className="mt-1 text-[11px] font-bold text-re-text-muted">
              Total {s.total} | Attended {s.attended} | Missed {s.missed} | Late {s.late}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
