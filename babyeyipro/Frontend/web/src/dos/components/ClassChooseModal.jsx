import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Check, Search, X, Users } from 'lucide-react';
import { paletteForSubject } from '../utils/masterTimetableShared';

export default function ClassChooseModal({
  open,
  onClose,
  classOptions = [],
  classCounts = new Map(),
  selectedClass = '',
  onSelect,
  title = 'Choose Class',
  subtitle = 'Select a class to view its weekly timetable',
}) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const list = [...classOptions].sort();
    if (!q.trim()) return list;
    const needle = q.trim().toLowerCase();
    return list.filter((c) => c.toLowerCase().includes(needle));
  }, [classOptions, q]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2500] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-black/5 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 sm:px-6 py-5 border-b border-black/5 bg-gradient-to-r from-[#fff7ed] to-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#FF8C00]">{title}</p>
                <h3 className="text-lg font-black text-[#0f172a] mt-0.5">{subtitle}</h3>
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 transition">
                <X size={18} className="text-[#94a3b8]" />
              </button>
            </div>
            <div className="relative mt-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search class..."
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-black/10 text-sm font-semibold bg-white"
                autoFocus
              />
            </div>
          </div>

          <div className="p-4 sm:p-5 max-h-[min(60vh,520px)] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm font-bold text-[#94a3b8] text-center py-8">No classes match your search.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filtered.map((className, i) => {
                  const count = classCounts.get(className) || 0;
                  const pal = paletteForSubject(className);
                  const isSelected = selectedClass === className;
                  return (
                    <button
                      key={className}
                      type="button"
                      onClick={() => { onSelect(className); onClose(); }}
                      className={`relative text-left rounded-2xl border-2 p-4 transition hover:scale-[1.02] hover:shadow-lg ${isSelected ? 'ring-2 ring-[#FF8C00] ring-offset-2' : ''}`}
                      style={{ backgroundColor: pal.bg, borderColor: isSelected ? '#FF8C00' : pal.border }}
                    >
                      {isSelected && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#FF8C00] flex items-center justify-center">
                          <Check size={11} className="text-white" />
                        </span>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/70">
                          <Users size={14} style={{ color: pal.title }} />
                        </div>
                        <span className="text-sm font-black uppercase tracking-tight" style={{ color: pal.title }}>
                          {className}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#64748b]">
                        <Calendar size={10} />
                        {count > 0 ? `${count} timetable entries` : 'No entries yet'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
