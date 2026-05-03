import React, { useState } from 'react';
import GateAttendance from './AttendanceModule/GateAttendance';
import AllGateLogs from './AttendanceModule/AllGateLogs';

/**
 * Discipline portal: gate-focused attendance (same AttendanceModule components as DOS).
 * Tabs — Gate Attendance (live RFID / today) and All Gate Logs (historical API).
 */
export default function Attendance() {
  const [tab, setTab] = useState('gate');

  return (
    <div className="min-h-screen space-y-4 bg-re-bg pb-10" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <section className="relative p-7 md:p-10 text-white overflow-hidden min-h-[200px] flex items-center bg-[#000435]">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-5xl w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-0.5 w-6 rounded-full bg-[#FEBF10]" />
            <p className="text-[10px] font-black capitalize tracking-widest text-[#FEBF10]/80">Attendance Module · Gate</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Gate attendance & logs</h1>
          <p className="text-xs font-bold text-white/60 max-w-xl mt-2">
            Monitor school gate check-ins and full scan history — same Gate Attendance module and APIs as DOS.
          </p>
        </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-4 md:px-6">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-black/10 bg-white p-2">
          <button
            type="button"
            onClick={() => setTab('gate')}
            className={`h-10 rounded-xl px-4 text-xs font-black uppercase tracking-widest transition-colors ${
              tab === 'gate' ? 'bg-re-grad-orange text-white' : 'bg-re-bg text-re-text'
            }`}
          >
            Gate Attendance
          </button>
          <button
            type="button"
            onClick={() => setTab('gate_logs')}
            className={`h-10 rounded-xl px-4 text-xs font-black uppercase tracking-widest transition-colors ${
              tab === 'gate_logs' ? 'bg-re-grad-orange text-white' : 'bg-re-bg text-re-text'
            }`}
          >
            All Gate Logs
          </button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-6">
        {tab === 'gate' && <GateAttendance />}
        {tab === 'gate_logs' && <AllGateLogs />}
      </div>
    </div>
  );
}
