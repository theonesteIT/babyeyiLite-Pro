import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import RFIDScanner from './RFIDScanner';
import TeacherClassAttendance from './TeacherClassAttendance';

export default function TeacherAttendance() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([]);
  const [classRows, setClassRows] = useState([]);
  const [classSummary, setClassSummary] = useState([]);
  const [monthlyGrid, setMonthlyGrid] = useState([]);
  const [draft, setDraft] = useState({});

  const loadTeachers = async () => {
    const res = await api.get('/teacher-portal/attendance-module/teacher', { params: { date } });
    if (res.data?.success) setRows(res.data.data || []);
  };

  const loadClassCheckIns = async () => {
    const res = await api.get('/teacher-portal/attendance-module/teacher-class-checkin', { params: { date } });
    if (res.data?.success) {
      setClassRows(res.data.data?.rows || []);
      setClassSummary(res.data.data?.summary || []);
    }
  };

  const loadMonthlyGrid = async () => {
    const res = await api.get('/teacher-portal/attendance-module/teacher/monthly-grid', {
      params: { month, year },
    });
    if (res.data?.success) setMonthlyGrid(res.data.data?.grid || []);
  };

  useEffect(() => {
    loadTeachers();
    loadClassCheckIns();
  }, [date]);

  useEffect(() => {
    loadMonthlyGrid();
  }, [month, year]);

  const saveManual = async (teacher_id) => {
    const rowDraft = draft[teacher_id] || {};
    await api.post('/teacher-portal/attendance-module/teacher/manual', {
      teacher_id,
      date,
      status_in: rowDraft.status_in || 'Present',
      remarks: rowDraft.remarks || '',
    });
    await loadTeachers();
  };

  const simulateGateScan = async ({ entityId }) => {
    await api.post('/teacher-portal/attendance-module/teacher/simulate-scan', {
      teacher_id: entityId,
      date,
    });
    await loadTeachers();
  };

  const simulateClassScan = async (payload) => {
    await api.post('/teacher-portal/attendance-module/teacher-class-checkin/simulate-scan', payload);
    await loadClassCheckIns();
  };

  const overrideClassCheckIn = async (payload) => {
    await api.post('/teacher-portal/attendance-module/teacher-class-checkin/override', payload);
    await loadClassCheckIns();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/10 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-xl border border-black/10 px-3 text-xs font-semibold" />
          <div className="rounded-xl bg-re-bg px-3 py-2 text-xs font-black text-re-text">
            Auto-absent rule: no RFID scan by 09:00
          </div>
          <div className="rounded-xl bg-re-bg px-3 py-2 text-xs font-black text-re-text">
            Device status: <span className="text-emerald-600">RFID online (simulated)</span>
          </div>
        </div>
      </div>

      <RFIDScanner title="Teacher Gate RFID (Simulation)" entityLabel="Teacher ID" onSimulate={simulateGateScan} />

      <div className="overflow-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-re-bg/40">
            <tr>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Teacher</th>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Status</th>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Time</th>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Remarks</th>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Save</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.teacher_id} className="border-t border-black/5">
                <td className="px-3 py-2 font-semibold">{r.teacher_name}</td>
                <td className="px-3 py-2">
                  <select
                    value={draft[r.teacher_id]?.status_in || r.status_in || 'Present'}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [r.teacher_id]: { ...(d[r.teacher_id] || {}), status_in: e.target.value } }))
                    }
                    className="h-9 rounded-lg border border-black/10 px-2 text-xs font-semibold"
                  >
                    <option>Present</option>
                    <option>Absent</option>
                    <option>Late</option>
                    <option>Excused</option>
                  </select>
                </td>
                <td className="px-3 py-2">{r.check_in ? new Date(r.check_in).toLocaleTimeString() : '--'}</td>
                <td className="px-3 py-2">
                  <input
                    value={draft[r.teacher_id]?.remarks ?? r.remarks ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [r.teacher_id]: { ...(d[r.teacher_id] || {}), remarks: e.target.value } }))
                    }
                    className="h-9 w-full rounded-lg border border-black/10 px-2 text-xs"
                    placeholder="Remarks"
                  />
                </td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => saveManual(r.teacher_id)} className="rounded-lg bg-re-grad-orange px-3 py-2 text-[11px] font-black uppercase text-white">
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TeacherClassAttendance
        date={date}
        rows={classRows}
        summary={classSummary}
        onSimulateScan={simulateClassScan}
        onOverride={overrideClassCheckIn}
      />

      <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(Number(e.target.value || 1))} className="h-10 rounded-xl border border-black/10 px-3 text-xs font-semibold" />
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value || new Date().getFullYear()))} className="h-10 rounded-xl border border-black/10 px-3 text-xs font-semibold" />
          <button type="button" onClick={loadMonthlyGrid} className="h-10 rounded-xl bg-re-grad-orange text-xs font-black uppercase tracking-widest text-white">Reload Monthly Grid</button>
        </div>

        <div className="overflow-auto rounded-xl border border-black/10">
          <table className="w-full min-w-[1450px] text-xs">
            <thead className="bg-re-bg/40">
              <tr>
                <th className="px-2 py-2 text-left font-black uppercase">Teacher</th>
                {Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => (
                  <th key={d} className="px-2 py-2 text-center font-black uppercase">{d}</th>
                ))}
                <th className="px-2 py-2 text-center font-black uppercase">Present</th>
                <th className="px-2 py-2 text-center font-black uppercase">Late</th>
                <th className="px-2 py-2 text-center font-black uppercase">Absent</th>
              </tr>
            </thead>
            <tbody>
              {monthlyGrid.map((r) => (
                <tr key={r.teacher_id} className="border-t border-black/5">
                  <td className="px-2 py-2 font-semibold">{r.teacher_name}</td>
                  {Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => {
                    const v = r.days?.[d] || 'Absent';
                    const bg = v === 'Present' ? 'bg-emerald-50 text-emerald-700' : v === 'Late' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
                    return <td key={`${r.teacher_id}-${d}`} className={`px-1 py-1 text-center font-black ${bg}`}>{v === 'Present' ? 'P' : v === 'Late' ? 'L' : 'A'}</td>;
                  })}
                  <td className="px-2 py-2 text-center font-black">{r.present_days}</td>
                  <td className="px-2 py-2 text-center font-black">{r.late_days}</td>
                  <td className="px-2 py-2 text-center font-black">{r.absent_days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
