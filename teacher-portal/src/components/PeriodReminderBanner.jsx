import { useEffect, useRef, useState } from 'react';
import { Bell, Clock, MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function PeriodReminderBanner() {
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const lastKey = useRef('');

  useEffect(() => {
    const poll = () => {
      api.get('/teacher-portal/upcoming-lesson')
        .then((r) => {
          const d = r.data?.data;
          if (!d?.has_lesson || !d.warn_soon) {
            setLesson(null);
            return;
          }
          const key = `${d.lesson?.class_name}-${d.lesson?.start_time}`;
          if (key !== lastKey.current) {
            lastKey.current = key;
            setDismissed(false);
          }
          setLesson(d);
        })
        .catch(() => {});
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, []);

  if (!lesson?.warn_soon || dismissed) return null;

  const mins = lesson.minutes_until;
  const l = lesson.lesson;

  return (
    <div className="fixed top-[72px] left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-1.5rem)] max-w-lg animate-[slideDown_.35s_ease-out]">
      <style>{`@keyframes slideDown{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
      <div className="rounded-2xl shadow-2xl border border-orange-200 bg-gradient-to-r from-[#fff7ed] to-white overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="p-2.5 rounded-xl bg-orange-500 text-white shrink-0">
            <Bell size={20} className="animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-1">Period starting soon</p>
            <p className="text-sm font-black text-[#000435] leading-snug">
              {mins <= 0 ? 'Your lesson is starting now' : `${mins} minute${mins === 1 ? '' : 's'} until ${l?.subject_name}`}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1"><MapPin size={12} className="text-orange-500" />{l?.class_name}</span>
              <span className="flex items-center gap-1"><Clock size={12} className="text-orange-500" />{l?.start_time} – {l?.end_time}</span>
            </div>
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={() => navigate('/class-room-scan')}
                className="px-3 py-1.5 rounded-lg bg-[#000435] text-white text-[11px] font-black uppercase tracking-wider hover:bg-[#0a116b]">
                Scan classroom QR
              </button>
              <button type="button" onClick={() => navigate('/attendance')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600 hover:border-orange-300">
                Mark attendance
              </button>
            </div>
          </div>
          <button type="button" onClick={() => setDismissed(true)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 shrink-0">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
