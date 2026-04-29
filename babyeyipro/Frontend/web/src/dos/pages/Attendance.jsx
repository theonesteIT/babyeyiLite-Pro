import React, { useState } from 'react';
import ClassAttendance from './AttendanceModule/ClassAttendance';
import StudentAttendance from './AttendanceModule/StudentAttendance';
import TeacherAttendance from './AttendanceModule/TeacherAttendance';
import GateAttendance from './AttendanceModule/GateAttendance';
import AllGateLogs from './AttendanceModule/AllGateLogs';

export default function Attendance() {
  const [tab, setTab] = useState('class');

  return (
    <div className="min-h-screen space-y-4 bg-re-bg pb-10">
      <div className="relative overflow-hidden rounded-3xl border border-black/5 bg-white">
        <img src={import.meta.env.BASE_URL + "teacher.jpg"} alt="Attendance banner" className="h-44 w-full object-cover" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 p-6 text-white">
          <p className="text-[11px] font-black uppercase tracking-[0.2em]">Attendance Module</p>
          <h1 className="mt-2 text-2xl font-black md:text-4xl">DOS Smart Attendance Dashboard</h1>
          <p className="mt-2 max-w-2xl text-xs font-semibold text-white/85 md:text-sm">
            Class period attendance, student entry/exit, and teacher manual + RFID + class check-in in one workflow.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-black/10 bg-white p-2">
        <button type="button" onClick={() => setTab('class')} className={`h-10 rounded-xl px-4 text-xs font-black uppercase tracking-widest ${tab === 'class' ? 'bg-re-grad-orange text-white' : 'bg-re-bg text-re-text'}`}>
          Class Attendance
        </button>
        <button type="button" onClick={() => setTab('student')} className={`h-10 rounded-xl px-4 text-xs font-black uppercase tracking-widest ${tab === 'student' ? 'bg-re-grad-orange text-white' : 'bg-re-bg text-re-text'}`}>
          Student Entry / Exit
        </button>
        <button type="button" onClick={() => setTab('teacher')} className={`h-10 rounded-xl px-4 text-xs font-black uppercase tracking-widest ${tab === 'teacher' ? 'bg-re-grad-orange text-white' : 'bg-re-bg text-re-text'}`}>
          Teacher Attendance
        </button>
        <button type="button" onClick={() => setTab('gate')} className={`h-10 rounded-xl px-4 text-xs font-black uppercase tracking-widest ${tab === 'gate' ? 'bg-re-grad-orange text-white' : 'bg-re-bg text-re-text'}`}>
          Gate Attendance
        </button>
        <button type="button" onClick={() => setTab('gate_logs')} className={`h-10 rounded-xl px-4 text-xs font-black uppercase tracking-widest ${tab === 'gate_logs' ? 'bg-re-grad-orange text-white' : 'bg-re-bg text-re-text'}`}>
          All Gate Logs
        </button>
      </div>

      {tab === 'class' && <ClassAttendance />}
      {tab === 'student' && <StudentAttendance />}
      {tab === 'teacher' && <TeacherAttendance />}
      {tab === 'gate' && <GateAttendance />}
      {tab === 'gate_logs' && <AllGateLogs />}
    </div>
  );
}
