import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import RFIDScanner from './RFIDScanner';

export default function StudentAttendance() {
  const [meta, setMeta] = useState({ classes: [] });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [className, setClassName] = useState('');
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthlyGrid, setMonthlyGrid] = useState([]);
  const [queueRows, setQueueRows] = useState([]);

  const loadMeta = async () => {
    const res = await api.get('/teacher-portal/attendance-module/meta');
    if (res.data?.success) {
      const classes = res.data.data?.classes || [];
      setMeta({ classes });
      setClassName((prev) => prev || classes[0] || '');
    }
  };

  const loadRows = async () => {
    if (!className) return;
    const res = await api.get('/teacher-portal/attendance-module/student-entry-exit', {
      params: { class_name: className, date },
    });
    if (res.data?.success) {
      setRows(res.data.data?.rows || []);
      setTotals(res.data.data?.totals || {});
    }
  };

  const loadMonthlyGrid = async () => {
    if (!className) return;
    const res = await api.get('/teacher-portal/attendance-module/student-entry-exit/monthly-grid', {
      params: { class_name: className, month, year },
    });
    if (res.data?.success) setMonthlyGrid(res.data.data?.grid || []);
  };

  const loadQueue = async () => {
    const res = await api.get('/teacher-portal/attendance-module/parent-notifications', { params: { date } });
    if (res.data?.success) setQueueRows(res.data.data || []);
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadRows();
    loadQueue();
  }, [className, date]);

  useEffect(() => {
    loadMonthlyGrid();
  }, [className, month, year]);

  const lateTrend = useMemo(() => `${totals.late || 0} late today`, [totals.late]);
  const attendanceRate = useMemo(() => {
    const total = Number(totals.total_students || 0);
    if (!total) return 0;
    const presentLike = Number(totals.on_time || 0) + Number(totals.late || 0);
    return Math.round((presentLike / total) * 100);
  }, [totals]);

  const simulateScan = async ({ entityId, direction }) => {
    await api.post('/teacher-portal/attendance-module/student-entry-exit/simulate-scan', {
      student_id: entityId,
      direction,
      date,
    });
    await loadRows();
    await loadQueue();
  };

  const enqueueNotification = async (studentId, category, channel) => {
    await api.post('/teacher-portal/attendance-module/parent-notifications/enqueue', {
      student_id: studentId,
      attendance_date: date,
      channel,
      category,
      title: category === 'ABSENT' ? 'Attendance absence alert' : category === 'LATE' ? 'Late arrival alert' : 'Missing check-out alert',
      body: category === 'ABSENT'
        ? 'Your student is marked absent today.'
        : category === 'LATE'
          ? 'Your student arrived late today.'
          : 'Your student has not checked out yet.',
    });
    await loadQueue();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 sm:grid-cols-3">
        <select value={className} onChange={(e) => setClassName(e.target.value)} className="h-10 rounded-xl border border-black/10 px-3 text-xs font-semibold">
          {meta.classes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-xl border border-black/10 px-3 text-xs font-semibold" />
        <div className="rounded-xl bg-re-bg px-3 py-2 text-xs font-black text-re-text">Daily attendance rate: {attendanceRate}%</div>
      </div>

      <RFIDScanner title="Student Gate RFID (Simulation)" entityLabel="Student ID" onSimulate={simulateScan} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-black/10 bg-white p-3 text-sm font-bold">Late arrivals trend: {lateTrend}</div>
        <div className="rounded-xl border border-black/10 bg-white p-3 text-sm font-bold">Missing checkout: {totals.missing || 0}</div>
      </div>

      <div className="overflow-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-re-bg/40">
            <tr>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Student</th>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Check-in</th>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Status In</th>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Check-out</th>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Status Out</th>
              <th className="px-3 py-3 text-left text-[11px] font-black uppercase">Notify Parent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.student_id} className="border-t border-black/5">
                <td className="px-3 py-2 font-semibold">{r.student_name}</td>
                <td className="px-3 py-2">{r.check_in ? new Date(r.check_in).toLocaleTimeString() : '--'}</td>
                <td className="px-3 py-2">{r.status_in || 'Absent'}</td>
                <td className="px-3 py-2">{r.check_out ? new Date(r.check_out).toLocaleTimeString() : '--'}</td>
                <td className="px-3 py-2">{r.status_out || 'Missing'}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <button type="button" onClick={() => enqueueNotification(r.student_id, 'ABSENT', 'IN_APP')} className="rounded-md border border-black/10 px-2 py-1 text-[10px] font-black">In-app Absent</button>
                    <button type="button" onClick={() => enqueueNotification(r.student_id, 'LATE', 'WEB')} className="rounded-md border border-black/10 px-2 py-1 text-[10px] font-black">Web Late</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center font-bold text-re-text-muted">No student rows available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
                <th className="px-2 py-2 text-left font-black uppercase">Student</th>
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
                <tr key={r.student_id} className="border-t border-black/5">
                  <td className="px-2 py-2 font-semibold">{r.student_name}</td>
                  {Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => {
                    const v = r.days?.[d] || 'Absent';
                    const bg = v === 'Present' ? 'bg-emerald-50 text-emerald-700' : v === 'Late' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
                    return <td key={`${r.student_id}-${d}`} className={`px-1 py-1 text-center font-black ${bg}`}>{v === 'Present' ? 'P' : v === 'Late' ? 'L' : 'A'}</td>;
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

      <div className="space-y-2 rounded-2xl border border-black/10 bg-white p-4">
        <h4 className="text-xs font-black uppercase tracking-widest">Parent Notification Queue (Stub)</h4>
        <div className="overflow-auto rounded-xl border border-black/10">
          <table className="w-full min-w-[760px] text-xs">
            <thead className="bg-re-bg/40">
              <tr>
                <th className="px-2 py-2 text-left font-black uppercase">Student</th>
                <th className="px-2 py-2 text-left font-black uppercase">Channel</th>
                <th className="px-2 py-2 text-left font-black uppercase">Category</th>
                <th className="px-2 py-2 text-left font-black uppercase">Title</th>
                <th className="px-2 py-2 text-left font-black uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {queueRows.map((q) => (
                <tr key={q.id} className="border-t border-black/5">
                  <td className="px-2 py-2 font-semibold">{q.student_name || q.student_id}</td>
                  <td className="px-2 py-2">{q.channel}</td>
                  <td className="px-2 py-2">{q.category}</td>
                  <td className="px-2 py-2">{q.title}</td>
                  <td className="px-2 py-2">{q.status}</td>
                </tr>
              ))}
              {!queueRows.length && (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center font-bold text-re-text-muted">No queued notifications for this date.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
