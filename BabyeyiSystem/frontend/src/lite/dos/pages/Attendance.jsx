import React, { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import ClassAttendance from './AttendanceModule/ClassAttendance';
import StudentAttendance from './AttendanceModule/StudentAttendance';
import TeacherAttendance from './AttendanceModule/TeacherAttendance';
import GateAttendance from './AttendanceModule/GateAttendance';
import AllGateLogs from './AttendanceModule/AllGateLogs';
import DosOchreHero from '../components/DosOchreHero';

export default function Attendance() {
  const [tab, setTab] = useState('class');

  return (
    <div className="min-h-screen bg-white pb-10 font-sans">
      <DosOchreHero
        eyebrow="Attendance module"
        titleLine="Smart attendance"
        titleAccent="dashboard"
        subtitle="Class period attendance, student entry and exit, teacher check-in, and gate logs — aligned in one workspace."
        icon={ClipboardCheck}
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-20 pb-10 space-y-4">
        <div className="bg-white rounded-t-[32px] shadow-sm border border-black/10 overflow-hidden p-4 sm:p-6">
          <div className="flex flex-wrap gap-2 rounded-2xl border border-black/5 bg-re-bg/50 p-2">
            {[
              { id: 'class', label: 'Class attendance' },
              { id: 'student', label: 'Student entry / exit' },
              { id: 'teacher', label: 'Teacher attendance' },
              { id: 'gate', label: 'Gate attendance' },
              { id: 'gate_logs', label: 'All gate logs' },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`h-10 rounded-xl px-4 text-xs font-medium capitalize tracking-tight transition-colors ${
                  tab === id ? 'bg-[#1e3a5f] text-white shadow-sm' : 'bg-white text-re-text border border-transparent hover:bg-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4">
            {tab === 'class' && <ClassAttendance />}
            {tab === 'student' && <StudentAttendance />}
            {tab === 'teacher' && <TeacherAttendance />}
            {tab === 'gate' && <GateAttendance />}
            {tab === 'gate_logs' && <AllGateLogs />}
          </div>
        </div>
      </div>
    </div>
  );
}
