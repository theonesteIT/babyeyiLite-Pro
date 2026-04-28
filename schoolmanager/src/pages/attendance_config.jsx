import React, { useState } from 'react';
import { Settings, Clock, BellRing, CalendarDays, Save } from 'lucide-react';

export default function AttendanceConfig() {
    const [graceMinutes, setGraceMinutes] = useState(10);
    const [notifyAbsences, setNotifyAbsences] = useState(true);
    const [notifyLate, setNotifyLate] = useState(false);
    const [trackTeachers, setTrackTeachers] = useState(true);
    const [lockAfterMins, setLockAfterMins] = useState(30);

    const Toggle = ({ value, onChange }) => (
        <button
            onClick={() => onChange(!value)}
            className={`relative w-10 h-5 rounded-full transition-all ${value ? 'bg-primary' : 'bg-slate-200'}`}
        >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? 'left-5' : 'left-0.5'}`} />
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-white border border-slate-200 overflow-hidden font-sans">
            {/* Action Bar */}
            <div className="flex items-center justify-between px-5 border-b border-slate-200 bg-white shrink-0 h-14">
                <div className="flex items-center gap-6">
                    <button className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-md text-sm font-semibold tracking-wide shadow-sm transition flex items-center gap-2">
                        <Save size={14} /> Save Settings
                    </button>
                    <h1 className="text-base font-semibold text-slate-800">Attendance Configuration</h1>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-8">
                <div className="max-w-2xl mx-auto space-y-6">

                    {/* Grace Period */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Clock size={14} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Grace Period</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Minutes allowed before marking a student late</p>
                            </div>
                        </div>
                        <div className="p-5 flex items-center gap-5">
                            <input
                                type="range" min={0} max={60} step={5}
                                value={graceMinutes}
                                onChange={e => setGraceMinutes(Number(e.target.value))}
                                className="flex-1 accent-primary"
                            />
                            <span className="text-primary font-black text-lg w-16 text-right">{graceMinutes} min</span>
                        </div>
                    </div>

                    {/* Register Lock */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-200">
                                <CalendarDays size={14} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Register Lock</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Lock attendance register after this many minutes</p>
                            </div>
                        </div>
                        <div className="p-5 flex items-center gap-5">
                            <input
                                type="range" min={0} max={120} step={10}
                                value={lockAfterMins}
                                onChange={e => setLockAfterMins(Number(e.target.value))}
                                className="flex-1 accent-primary"
                            />
                            <span className="text-primary font-black text-lg w-16 text-right">{lockAfterMins} min</span>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
                                <BellRing size={14} className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Notification Rules</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Automated alerts sent to parents and admins</p>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {[
                                { label: 'Notify parent on absence', value: notifyAbsences, onChange: setNotifyAbsences },
                                { label: 'Notify parent on late arrival', value: notifyLate, onChange: setNotifyLate },
                                { label: 'Track teacher attendance', value: trackTeachers, onChange: setTrackTeachers },
                            ].map(item => (
                                <div key={item.label} className="flex items-center justify-between px-5 py-3.5">
                                    <span className="text-xs font-bold text-slate-700">{item.label}</span>
                                    <Toggle value={item.value} onChange={item.onChange} />
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
