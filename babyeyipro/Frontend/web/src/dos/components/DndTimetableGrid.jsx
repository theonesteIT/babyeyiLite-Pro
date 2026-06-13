import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, pointerWithin,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  AlertTriangle, BookOpen, Clock, Edit3, Copy, Lock, Trash2, UserPlus, X, GripVertical, Check, Layers, Sparkles,
} from 'lucide-react';
import { EXTRA_ACTIVITY_STYLE } from '../utils/extraActivityUtils';
import { resolveTimetableRowId, timetableLessonDragId } from '../utils/timetableRowUtils';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const SUBJECT_PALETTES = [
  { bg: '#fff1f2', border: '#fecdd3', title: '#9f1239', meta: '#881337' },
  { bg: '#eff6ff', border: '#bfdbfe', title: '#1d4ed8', meta: '#1e40af' },
  { bg: '#ecfdf5', border: '#bbf7d0', title: '#047857', meta: '#065f46' },
  { bg: '#fff7ed', border: '#fed7aa', title: '#c2410c', meta: '#9a3412' },
  { bg: '#f5f3ff', border: '#ddd6fe', title: '#6d28d9', meta: '#5b21b6' },
  { bg: '#f0fdfa', border: '#99f6e4', title: '#0f766e', meta: '#115e59' },
  { bg: '#fefce8', border: '#fde68a', title: '#a16207', meta: '#854d0e' },
  { bg: '#eef2ff', border: '#c7d2fe', title: '#3730a3', meta: '#312e81' },
];

const paletteForSubject = (subject = '') => {
  const value = String(subject || '').trim().toLowerCase();
  if (!value) return SUBJECT_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return SUBJECT_PALETTES[hash % SUBJECT_PALETTES.length];
};

const normalizeTime = (v) => { const r = String(v || '').trim(); if (!r) return ''; const p = r.split(':'); return p.length < 2 ? r : `${p[0].padStart(2, '0')}:${p[1].padStart(2, '0')}`; };
const fmt12 = (t) => { if (!t) return '—'; const [h, m] = t.split(':').map(Number); return `${((h % 12) || 12)}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const timeToMins = (t) => { const [h, m] = String(t || '00:00').slice(0, 5).split(':').map(Number); return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0); };
const timesOverlap = (startA, endA, startB, endB) => timeToMins(startA) < timeToMins(endB) && timeToMins(startB) < timeToMins(endA);

function LessonActionModal({ lesson, onClose, onEdit, onDelete, onDuplicate, onLock }) {
  const pal = paletteForSubject(lesson.subject_name);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-black/5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with lesson info */}
        <div className="p-5 border-b border-black/5" style={{ background: `linear-gradient(135deg, ${pal.bg}, white)` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-lg font-black uppercase tracking-tight" style={{ color: pal.title }}>{lesson.subject_name}</p>
              <div className="flex items-center gap-3 mt-2">
                {lesson.teacher_name && (
                  <span className="text-xs font-semibold text-[#64748b] flex items-center gap-1.5">
                    <UserPlus size={12} className="text-[#94a3b8]" />{lesson.teacher_name}
                  </span>
                )}
                {lesson.room && (
                  <span className="text-xs font-semibold text-[#64748b] flex items-center gap-1.5">
                    <BookOpen size={12} className="text-[#94a3b8]" />{lesson.room}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <Clock size={12} className="text-[#94a3b8]" />
                <span className="text-xs font-bold text-[#0f172a]">{lesson.day_of_week} · {fmt12(normalizeTime(lesson.start_time))} – {fmt12(normalizeTime(lesson.end_time))}</span>
              </div>
              {lesson.is_locked && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200">
                  <Lock size={10} className="text-amber-600" />
                  <span className="text-[10px] font-bold text-amber-700 uppercase">Locked</span>
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 transition">
              <X size={18} className="text-[#94a3b8]" />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => { onClose(); onEdit(lesson); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-[#0f172a] hover:bg-[#f8fafc] border border-transparent hover:border-black/5 transition group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition">
              <Edit3 size={16} className="text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-bold">Edit Lesson</p>
              <p className="text-[10px] text-[#94a3b8] font-medium">Modify subject, teacher, time or room</p>
            </div>
          </button>

          <button
            onClick={() => { onClose(); onDuplicate(lesson); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-[#0f172a] hover:bg-[#f8fafc] border border-transparent hover:border-black/5 transition group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition">
              <Copy size={16} className="text-purple-600" />
            </div>
            <div className="text-left">
              <p className="font-bold">Duplicate</p>
              <p className="text-[10px] text-[#94a3b8] font-medium">Create a copy of this lesson</p>
            </div>
          </button>

          <button
            onClick={() => { onClose(); onLock(lesson); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-[#0f172a] hover:bg-[#f8fafc] border border-transparent hover:border-black/5 transition group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition">
              <Lock size={16} className="text-amber-600" />
            </div>
            <div className="text-left">
              <p className="font-bold">{lesson.is_locked ? 'Unlock Lesson' : 'Lock Lesson'}</p>
              <p className="text-[10px] text-[#94a3b8] font-medium">{lesson.is_locked ? 'Allow dragging and regeneration' : 'Prevent moving during regeneration'}</p>
            </div>
          </button>

          <div className="border-t border-black/5 my-2" />

          <button
            onClick={() => { onClose(); onDelete(lesson.id); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition group"
          >
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition">
              <Trash2 size={16} className="text-red-500" />
            </div>
            <div className="text-left">
              <p className="font-bold">Delete</p>
              <p className="text-[10px] text-red-400 font-medium">Remove this lesson permanently</p>
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DraggableLesson({ lesson, period, onEdit, onDelete, onDuplicate, onLock, isDragging, onShowModal }) {
  const isExtra = Boolean(lesson.extra_activity_id);
  const pal = isExtra
    ? { bg: EXTRA_ACTIVITY_STYLE.bg, border: EXTRA_ACTIVITY_STYLE.border, title: EXTRA_ACTIVITY_STYLE.title, meta: EXTRA_ACTIVITY_STYLE.abbr }
    : paletteForSubject(lesson.subject_name);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: timetableLessonDragId(lesson),
    data: { lesson, period },
    disabled: isExtra,
  });

  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 100 } : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={{ ...style, backgroundColor: pal.bg, borderColor: pal.border }}
      className={`relative rounded-xl border-2 p-2.5 transition-all group ${isExtra ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} ${isDragging ? 'opacity-40 scale-95' : 'hover:shadow-lg hover:scale-[1.02]'} ${lesson.is_locked ? 'ring-2 ring-amber-400/50' : ''}`}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onContextMenu={(e) => { e.preventDefault(); onShowModal(lesson); }}
      {...(isExtra ? {} : attributes)}
      {...(isExtra ? {} : listeners)}
    >
      {isExtra && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-fuchsia-500 flex items-center justify-center shadow-sm">
          <Sparkles size={9} className="text-white" />
        </div>
      )}
      {lesson.is_locked && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
          <Lock size={9} className="text-white" />
        </div>
      )}
      {Boolean(lesson.is_double_period || lesson.double_block_part) && (
        <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-sm" title="Followed period (back-to-back with same subject)">
          <Layers size={9} className="text-white" />
        </div>
      )}

      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black uppercase tracking-tight truncate leading-tight" style={{ color: pal.title }}>{lesson.subject_name}</p>
          {lesson.teacher_name && <p className="text-[9px] text-[#64748b] font-semibold mt-0.5 truncate">{lesson.teacher_name}</p>}
          {lesson.room && <p className="text-[8px] text-[#94a3b8] font-bold mt-0.5 flex items-center gap-0.5"><BookOpen size={7} />{lesson.room}</p>}
        </div>
        <GripVertical size={12} className="text-[#c1c7d0] opacity-0 group-hover:opacity-100 transition shrink-0 mt-0.5" />
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <Clock size={8} className="text-[#94a3b8]" />
        <span className="text-[8px] font-bold text-[#94a3b8]">{fmt12(normalizeTime(lesson.start_time))} – {fmt12(normalizeTime(lesson.end_time))}</span>
      </div>
    </motion.div>
  );
}

function DroppableSlot({ day, period, children, isOver, isHighlighted }) {
  const id = `slot-${day}-${normalizeTime(period.start_time)}`;
  const { setNodeRef, isOver: dndIsOver } = useDroppable({ id, data: { day, period } });
  const active = isOver || dndIsOver || isHighlighted;

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[70px] rounded-xl border-2 border-dashed p-1.5 transition-all duration-200 ${active ? 'border-[#FF8C00]/60 bg-[#FF8C00]/5 scale-[1.01]' : 'border-transparent hover:border-[#e2e8f0]'}`}
    >
      {children}
    </div>
  );
}

function ConflictNotification({ conflict, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 z-[3000] bg-white rounded-2xl border border-red-100 shadow-2xl p-4 max-w-sm"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
          <AlertTriangle size={16} className="text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-[#0f172a]">Conflict Detected</p>
          <p className="text-xs text-[#64748b] mt-0.5">{conflict}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#f8fafc]"><X size={14} className="text-[#94a3b8]" /></button>
      </div>
    </motion.div>
  );
}

function SaveNotification({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-[3000] bg-white rounded-2xl border border-emerald-100 shadow-2xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Check size={16} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-black text-[#0f172a]">Timetable saved</p>
              <p className="text-[10px] text-[#94a3b8] font-bold">Changes saved automatically</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function DndTimetableGrid({
  rows, periods, activeDays, filterClassName: filterClass, teachers, onUpdate, onDelete, onEdit, onDuplicate, onCreateAt, flash,
  extraActivityLookup = new Map(),
}) {
  const [activeId, setActiveId] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [showSaved, setShowSaved] = useState(false);
  const [highlightedSlots, setHighlightedSlots] = useState(new Set());
  const [modalLesson, setModalLesson] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const filteredRows = useMemo(() => rows.filter(r => r.class_name === filterClass), [rows, filterClass]);
  const allRows = rows;

  const lessonMap = useMemo(() => {
    const m = new Map();
    const addLesson = (day, periodStart, lesson) => {
      const k = `${day}__${normalizeTime(periodStart)}`;
      const c = m.get(k) || [];
      if (!c.some((x) => x === lesson || (x.id && x.id === lesson.id && normalizeTime(x.start_time) === normalizeTime(lesson.start_time)))) {
        c.push(lesson);
        m.set(k, c);
      }
    };
    for (const r of filteredRows) {
      addLesson(r.day_of_week, r.start_time, r);
    }
    for (const p of periods) {
      const pStart = normalizeTime(p.start_time);
      const pEnd = normalizeTime(p.end_time);
      for (const r of filteredRows) {
        if (!timesOverlap(pStart, pEnd, r.start_time, r.end_time)) continue;
        if (normalizeTime(r.start_time) === pStart) continue;
        addLesson(r.day_of_week, p.start_time, r);
      }
    }
    return m;
  }, [filteredRows, periods]);

  const displayDays = useMemo(() =>
    (activeDays?.length ? activeDays.filter(d => WEEK_DAYS.includes(d)) : WEEK_DAYS),
    [activeDays]
  );

  const activeLesson = useMemo(() => {
    if (!activeId) return null;
    return filteredRows.find((r) => timetableLessonDragId(r) === activeId) || null;
  }, [activeId, filteredRows]);

  const checkConflicts = useCallback((lesson, targetDay, targetPeriod) => {
    const targetStart = normalizeTime(targetPeriod.start_time);
    const targetEnd = normalizeTime(targetPeriod.end_time);
    const lessonTerm = String(lesson.term || '').trim();
    const lessonYear = String(lesson.academic_year || '').trim();

    for (const r of allRows) {
      if (r.id === lesson.id) continue;
      if (r.day_of_week !== targetDay) continue;
      if (lessonTerm && String(r.term || '').trim() && String(r.term || '').trim() !== lessonTerm) continue;
      if (lessonYear && String(r.academic_year || '').trim() && String(r.academic_year || '').trim() !== lessonYear) continue;
      if (!timesOverlap(targetStart, targetEnd, r.start_time, r.end_time)) continue;

      if (r.staff_id === lesson.staff_id && r.class_name !== lesson.class_name) {
        return `Teacher "${lesson.teacher_name || 'Unknown'}" already teaches ${r.subject_name} in ${r.class_name} at ${fmt12(normalizeTime(r.start_time))} (${lessonTerm || 'this term'})`;
      }
      if (r.room && r.room === lesson.room && r.class_name !== lesson.class_name) {
        return `Room "${r.room}" is already occupied by ${r.class_name} - ${r.subject_name} at ${fmt12(normalizeTime(r.start_time))}`;
      }
    }
    return null;
  }, [allRows]);

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
    const lesson = event.active.data.current?.lesson;
    if (lesson) {
      const available = new Set();
      for (const day of displayDays) {
        for (const period of periods) {
          const key = `slot-${day}-${normalizeTime(period.start_time)}`;
          available.add(key);
        }
      }
      setHighlightedSlots(available);
    }
  }, [displayDays, periods]);

  const handleDragEnd = useCallback(async (event) => {
    setActiveId(null);
    setHighlightedSlots(new Set());

    const { active, over } = event;
    if (!over || !active) return;

    const lesson = active.data.current?.lesson;
    if (!lesson) return;
    if (!resolveTimetableRowId(lesson.id)) {
      setConflict('This lesson is not saved yet. Add it with Add Slot before moving it.');
      setTimeout(() => setConflict(null), 4000);
      return;
    }
    if (lesson.is_locked) {
      setConflict('This lesson is locked and cannot be moved.');
      setTimeout(() => setConflict(null), 3000);
      return;
    }

    const { day, period } = over.data.current || {};
    if (!day || !period) return;

    const targetStart = normalizeTime(period.start_time);
    const targetEnd = normalizeTime(period.end_time);
    const currentStart = normalizeTime(lesson.start_time);

    if (day === lesson.day_of_week && targetStart === currentStart) return;

    const conflictMsg = checkConflicts(lesson, day, period);
    if (conflictMsg) {
      setConflict(conflictMsg);
      setTimeout(() => setConflict(null), 4000);
      return;
    }

    const existingLesson = filteredRows.find(r =>
      r.id !== lesson.id && r.day_of_week === day && normalizeTime(r.start_time) === targetStart
    );

    if (existingLesson && !existingLesson.is_locked && resolveTimetableRowId(existingLesson.id)) {
      const swapConflict = checkConflicts(existingLesson, lesson.day_of_week, { start_time: lesson.start_time, end_time: lesson.end_time });
      if (swapConflict) {
        setConflict(swapConflict);
        setTimeout(() => setConflict(null), 4000);
        return;
      }

      await onUpdate(existingLesson.id, {
        ...existingLesson,
        day_of_week: lesson.day_of_week,
        start_time: lesson.start_time,
        end_time: lesson.end_time,
      });
    }

    await onUpdate(lesson.id, {
      ...lesson,
      day_of_week: day,
      start_time: period.start_time,
      end_time: targetEnd,
    });

    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2500);
  }, [checkConflicts, filteredRows, onUpdate]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setHighlightedSlots(new Set());
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Sticky Header */}
            <div className="grid border-b border-black/5 bg-[#f8fafc] sticky top-0 z-10" style={{ gridTemplateColumns: `80px repeat(${displayDays.length}, 1fr)` }}>
              <div className="p-3 flex items-center justify-center border-r border-black/5">
                <Clock size={14} className="text-[#94a3b8]" />
              </div>
              {displayDays.map(day => (
                <div key={day} className="p-3 text-center border-r last:border-r-0 border-black/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#0f172a]">{day}</p>
                </div>
              ))}
            </div>

            {/* Time Rows */}
            {periods.map(period => {
              const isBreak = Boolean(period.is_break) || String(period.period_name || '').toLowerCase().match(/break|lunch|free/);

              if (isBreak) {
                return (
                  <div key={period.id || period.start_time} className="grid border-b border-black/5 bg-[#fafbfc]" style={{ gridTemplateColumns: `80px repeat(${displayDays.length}, 1fr)` }}>
                    <div className="p-2 flex items-center justify-center border-r border-black/5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-[#c1c7d0]">{period.period_name}</span>
                    </div>
                    <div className="col-span-full p-2 flex items-center justify-center" style={{ gridColumn: `2 / -1` }}>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">{period.period_name} · {fmt12(normalizeTime(period.start_time))} – {fmt12(normalizeTime(period.end_time))}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={period.id || period.start_time} className="grid border-b border-black/5 hover:bg-[#fafbfc]/50 transition" style={{ gridTemplateColumns: `80px repeat(${displayDays.length}, 1fr)` }}>
                  {/* Time Column (sticky left) */}
                  <div className="p-2 flex flex-col items-center justify-center border-r border-black/5 bg-[#f8fafc] sticky left-0 z-[5]">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#94a3b8] mb-0.5">{period.period_name}</span>
                    <span className="text-[10px] font-black text-[#0f172a]">{fmt12(normalizeTime(period.start_time))}</span>
                    <span className="text-[8px] text-[#c1c7d0] font-bold">{fmt12(normalizeTime(period.end_time))}</span>
                  </div>

                  {/* Day Cells */}
                  {displayDays.map(day => {
                    const key = `${day}__${normalizeTime(period.start_time)}`;
                    const lessons = lessonMap.get(key) || [];
                    const extras = extraActivityLookup.get(key) || [];
                    const slotId = `slot-${day}-${normalizeTime(period.start_time)}`;

                    return (
                      <DroppableSlot
                        key={slotId}
                        day={day}
                        period={period}
                        isHighlighted={highlightedSlots.has(slotId)}
                      >
                        <AnimatePresence mode="popLayout">
                          {lessons.length > 0 ? (
                            lessons.map(lesson => (
                              <DraggableLesson
                                key={lesson.id}
                                lesson={lesson}
                                period={period}
                                isDragging={activeId === timetableLessonDragId(lesson)}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onDuplicate={onDuplicate}
                                onLock={(l) => onUpdate(l.id, { ...l, is_locked: !l.is_locked })}
                                onShowModal={setModalLesson}
                              />
                            ))
                          ) : extras.length > 0 ? (
                            <div
                              className="w-full min-h-[60px] rounded-xl border-2 px-2 py-2 flex flex-col items-center justify-center text-center"
                              style={{ backgroundColor: EXTRA_ACTIVITY_STYLE.bg, borderColor: EXTRA_ACTIVITY_STYLE.border }}
                              title={`${extras[0].activity_name} · ${fmt12(normalizeTime(extras[0].start_time))}–${fmt12(normalizeTime(extras[0].end_time))}`}
                            >
                              <Sparkles size={12} style={{ color: EXTRA_ACTIVITY_STYLE.title }} className="mb-0.5" />
                              <p className="text-[10px] font-black uppercase leading-tight" style={{ color: EXTRA_ACTIVITY_STYLE.title }}>
                                {extras[0].activity_name}
                              </p>
                              <p className="text-[8px] font-bold opacity-70" style={{ color: EXTRA_ACTIVITY_STYLE.abbr }}>Extra activity</p>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onCreateAt(day, period.start_time, period.end_time)}
                              className="w-full h-full min-h-[60px] rounded-xl border border-dashed border-[#e8ecf2] hover:border-[#FF8C00]/40 hover:bg-[#FF8C00]/5 flex items-center justify-center transition-all group/empty"
                            >
                              <span className="w-6 h-6 rounded-lg bg-[#f1f5f9] group-hover/empty:bg-[#FF8C00]/10 flex items-center justify-center transition">
                                <span className="text-[#c1c7d0] group-hover/empty:text-[#FF8C00] text-lg font-bold leading-none">+</span>
                              </span>
                            </button>
                          )}
                        </AnimatePresence>
                      </DroppableSlot>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeLesson && (() => {
          const pal = paletteForSubject(activeLesson.subject_name);
          return (
            <motion.div
              className="rounded-xl border-2 p-3 shadow-2xl cursor-grabbing"
              style={{ backgroundColor: pal.bg, borderColor: pal.title, minWidth: 140 }}
              initial={{ scale: 1 }}
              animate={{ scale: 1.08, rotate: 1 }}
            >
              <p className="text-[12px] font-black uppercase tracking-tight" style={{ color: pal.title }}>{activeLesson.subject_name}</p>
              {activeLesson.teacher_name && <p className="text-[10px] text-[#64748b] font-semibold mt-0.5">{activeLesson.teacher_name}</p>}
              <p className="text-[9px] text-[#94a3b8] font-bold mt-1">{fmt12(normalizeTime(activeLesson.start_time))} – {fmt12(normalizeTime(activeLesson.end_time))}</p>
            </motion.div>
          );
        })()}
      </DragOverlay>

      {/* Notifications */}
      <AnimatePresence>
        {conflict && <ConflictNotification conflict={conflict} onClose={() => setConflict(null)} />}
      </AnimatePresence>
      <SaveNotification show={showSaved} />

      {/* Right-click Action Modal */}
      <AnimatePresence>
        {modalLesson && (
          <LessonActionModal
            lesson={modalLesson}
            onClose={() => setModalLesson(null)}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onLock={(l) => onUpdate(l.id, { ...l, is_locked: !l.is_locked })}
          />
        )}
      </AnimatePresence>
    </DndContext>
  );
}
