import React, { useState } from 'react';
import { DoorOpen } from 'lucide-react';
import GateAttendance from './AttendanceModule/GateAttendance';
import AllGateLogs from './AttendanceModule/AllGateLogs';
import DisciplineOchreHero from '../components/DisciplineOchreHero';

/**
 * Discipline portal: gate-focused attendance (same AttendanceModule components as DOS).
 * Tabs — Gate Attendance (live RFID / today) and All Gate Logs (historical API).
 */
export default function Attendance() {
  const [tab, setTab] = useState('gate');

  return (
    <div className="min-h-screen space-y-4 bg-re-bg pb-10" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <DisciplineOchreHero
        eyebrow="Attendance module"
        titleLine="Gate attendance"
        titleAccent="& logs"
        subtitle="Monitor school gate check-ins and full scan history in the same clean manager-style shell."
        icon={DoorOpen}
      />

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-20">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-black/10 bg-white p-2">
          <button
            type="button"
            onClick={() => setTab('gate')}
            className={`h-10 rounded-xl px-4 text-xs font-medium uppercase tracking-wide transition-colors ${
              tab === 'gate' ? 'bg-re-grad-orange text-white' : 'bg-re-bg text-re-text'
            }`}
          >
            Gate Attendance
          </button>
          <button
            type="button"
            onClick={() => setTab('gate_logs')}
            className={`h-10 rounded-xl px-4 text-xs font-medium uppercase tracking-wide transition-colors ${
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
