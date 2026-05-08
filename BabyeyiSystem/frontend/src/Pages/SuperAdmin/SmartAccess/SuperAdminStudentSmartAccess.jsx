import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Cpu,
  Fingerprint,
  IdCard,
  Loader2,
  Radio,
  Search,
  Trash2,
  Usb,
  UserCheck,
  X,
  GraduationCap,
  ChevronDown,
  AlertCircle,
  ArrowRightLeft,
  CreditCard,
  Users,
  Shield,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import SmartAccessSchoolToolbar from './SmartAccessSchoolToolbar';
import { api } from './smartAccessApi';

const USB_FILTERS = [{ usbVendorId: 0x10c4 }, { usbVendorId: 0x1a86 }];
const ALL_STUDENTS = '__ALL__';

function formatCombination(combo) {
  if (combo == null || combo === '') return '';
  if (Array.isArray(combo)) return combo.map((x) => String(x).trim()).filter(Boolean).join(' ');
  if (typeof combo === 'object') {
    try {
      const vals = Object.values(combo).filter((v) => v != null && String(v).trim() !== '');
      if (vals.length) return vals.map((v) => String(v).trim()).join(' ');
    } catch (_) { /* noop */ }
    return '';
  }
  return String(combo).trim();
}

function schoolClassRowToLabel(c) {
  const stream = c.stream_name && String(c.stream_name).trim() !== '' ? c.stream_name : '';
  const combo = formatCombination(c.combination);
  const parts = [c.group_name, stream, combo].filter((p) => p != null && String(p).trim() !== '');
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function classLabel(s) {
  if (s.class_group_name) {
    return `${s.class_group_name} ${s.class_stream_name || ''} ${s.class_combination || ''}`.trim().toUpperCase();
  }
  return (s.class_name || '—').toString();
}

function studentDisplayName(s) {
  return `${s.first_name || ''} ${s.last_name || ''}`.trim() || '—';
}

function filterStudentsByQuery(students, q) {
  const t = String(q || '').trim().toLowerCase();
  if (!t) return students;
  return students.filter((s) => {
    const name = studentDisplayName(s).toLowerCase();
    const code = String(s.student_uid || s.student_code || '').toLowerCase();
    const sdm = String(s.sdm_code || '').toLowerCase();
    return name.includes(t) || code.includes(t) || sdm.includes(t);
  });
}

export default function SuperAdminStudentSmartAccess() {
  const [searchParams] = useSearchParams();
  const presetFromQuery = useMemo(() => {
    const n = Number(searchParams.get('school_id'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [searchParams]);

  const [scopedSchool, setScopedSchool] = useState(null);
  const schoolId = scopedSchool?.id || null;

  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState(ALL_STUDENTS);
  const [classOpen, setClassOpen] = useState(false);

  const [listLoading, setListLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const selectedRef = useRef(null);

  const [modalClassScope, setModalClassScope] = useState('');
  const [modalStudentQuery, setModalStudentQuery] = useState('');
  const [modalSearchLoading, setModalSearchLoading] = useState(false);
  const [modalSearchHits, setModalSearchHits] = useState([]);
  const [modalClassRoster, setModalClassRoster] = useState([]);
  const [modalRosterLoading, setModalRosterLoading] = useState(false);
  const [modalClassRosterFetched, setModalClassRosterFetched] = useState(false);
  const [identityConflict, setIdentityConflict] = useState(null);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const [serialStatus, setSerialStatus] = useState('idle');
  const [instruction, setInstruction] = useState('Connect a device, then scan or enroll.');
  const [cardUid, setCardUid] = useState('');
  const [fpId, setFpId] = useState('');
  const [rfidManual, setRfidManual] = useState('');
  const [fpManual, setFpManual] = useState('');
  const [port, setPort] = useState(null);
  const portRef = useRef(null);
  const readerRef = useRef(null);
  const lineBuf = useRef('');
  const [apiBusy, setApiBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    portRef.current = port;
  }, [port]);

  const navyBtn =
    'bg-gradient-to-br from-[#1E3A5F] to-[#0D2644] hover:from-[#234a73] hover:to-[#0f2038] shadow-lg shadow-[#1E3A5F]/25';

  useEffect(() => {
    if (!schoolId) return;
    setStudents([]);
    setSearch('');
    setSelectedClass(ALL_STUDENTS);
    setModalOpen(false);
    setBanner(null);
  }, [schoolId]);

  const loadClasses = useCallback(async () => {
    if (!schoolId) {
      setClassesLoading(false);
      setClasses([]);
      return;
    }
    setClassesLoading(true);
    try {
      const { data: res } = await api.get(`/schools/${schoolId}/classes`);
      let uniq = [];
      if (Array.isArray(res.class_name_options) && res.class_name_options.length > 0) {
        uniq = [...new Set(res.class_name_options.map((s) => String(s).trim()).filter(Boolean))].sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true })
        );
      } else if (Array.isArray(res.data) && res.data.length) {
        uniq = [...new Set(res.data.map((c) => schoolClassRowToLabel(c)).filter(Boolean))].sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true })
        );
      }
      uniq = uniq.filter(Boolean);
      setClasses([ALL_STUDENTS, ...uniq.filter((x) => x !== ALL_STUDENTS)]);
      setSelectedClass((prev) => (uniq.includes(prev) || prev === ALL_STUDENTS ? prev : ALL_STUDENTS));
    } catch (e) {
      console.error(e);
      setClasses([ALL_STUDENTS]);
      setSelectedClass(ALL_STUDENTS);
      setBanner({ type: 'error', text: 'Could not load classes.' });
    } finally {
      setClassesLoading(false);
    }
  }, [schoolId]);

  const loadStudents = useCallback(async () => {
    if (!schoolId || !selectedClass) return;
    setListLoading(true);
    try {
      const params = {
        school_id: schoolId,
        limit: 4000,
        page: 1,
        paginate: 'true',
      };
      if (selectedClass !== ALL_STUDENTS) params.class_name = selectedClass;
      const { data: res } = await api.get('/students', { params });
      if (res.success) setStudents(Array.isArray(res.data) ? res.data : []);
      else {
        setStudents([]);
        setBanner({ type: 'error', text: res.message || 'Failed to load students.' });
      }
    } catch (e) {
      console.error(e);
      setStudents([]);
      setBanner({ type: 'error', text: 'Could not load students.' });
    } finally {
      setListLoading(false);
    }
  }, [schoolId, selectedClass]);

  useEffect(() => {
    if (schoolId) loadClasses();
  }, [schoolId, loadClasses]);

  useEffect(() => {
    if (!schoolId || !selectedClass) return;
    loadStudents();
  }, [schoolId, selectedClass, loadStudents]);

  const filteredLocal = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = studentDisplayName(s).toLowerCase();
      const code = String(s.student_uid || s.student_code || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [students, search]);

  const patchStudent = useCallback(
    async (id, body) => {
      if (!schoolId) return false;
      setApiBusy(true);
      setIdentityConflict(null);
      try {
        const { data: res } = await api.put(`/students/${id}/identity`, body, {
          params: { school_id: schoolId },
        });
        if (res.success) {
          const row = res.data || {};
          setIdentityConflict(null);
          setStudents((prev) =>
            prev.map((s) =>
              s.id === id ? { ...s, rfid_uid: row.rfid_uid, fingerprint_id: row.fingerprint_id } : s
            )
          );
          setSelected((cur) =>
            cur && cur.id === id ? { ...cur, rfid_uid: row.rfid_uid, fingerprint_id: row.fingerprint_id } : cur
          );
          return true;
        }
        setBanner({ type: 'error', text: res.message || 'Update failed.' });
        return false;
      } catch (e) {
        const status = e.response?.status;
        const data = e.response?.data || {};
        const msg = data.message || 'Update failed.';
        const code = data.code || '';
        if (status === 409) {
          setIdentityConflict({
            kind: code === 'FINGERPRINT_DUPLICATE' ? 'fingerprint' : 'card',
            message: msg,
            code,
          });
          setInstruction('');
        } else {
          setBanner({ type: 'error', text: msg });
        }
        return false;
      } finally {
        setApiBusy(false);
      }
    },
    [schoolId]
  );

  const handleSerialLine = useCallback(
    async (text) => {
      const st = selectedRef.current;
      if (!st?.id) return;

      if (text.startsWith('CARD:')) {
        const uid = text.replace('CARD:', '').trim();
        setCardUid(uid);
        setRfidManual(uid);
        setInstruction(`Card scanned: ${uid}`);
        const ok = await patchStudent(st.id, { rfid_uid: uid });
        if (ok) setBanner({ type: 'ok', text: `RFID saved for ${studentDisplayName(st)}` });
        return;
      }
      if (text.startsWith('FPID:')) {
        const id = text.replace('FPID:', '').trim();
        setFpId(id);
        setFpManual(id);
        setInstruction(`Fingerprint registered (ID ${id})`);
        const ok = await patchStudent(st.id, { fingerprint_id: id });
        if (ok) setBanner({ type: 'ok', text: `Fingerprint ID saved for ${studentDisplayName(st)}` });
        return;
      }
      if (text.startsWith('EXIST:')) {
        const id = text.replace('EXIST:', '').trim();
        setFpId(id);
        setFpManual(id);
        setInstruction(`Already registered — ID ${id}`);
        const ok = await patchStudent(st.id, { fingerprint_id: id });
        if (ok) setBanner({ type: 'ok', text: `Fingerprint ID synced for ${studentDisplayName(st)}` });
        return;
      }
      if (text.startsWith('FPDEL:')) {
        const idDel = text.replace('FPDEL:', '').trim();
        setInstruction(`Deleted fingerprint ID ${idDel}`);
        setFpId('');
        const cur = selectedRef.current;
        if (cur?.fingerprint_id && String(cur.fingerprint_id) === String(idDel)) {
          const ok = await patchStudent(cur.id, { fingerprint_id: null });
          if (ok) setBanner({ type: 'ok', text: 'Fingerprint cleared for this student.' });
        }
        return;
      }
      if (text === 'STEP:PLACE_FINGER') setInstruction('Place finger on the sensor');
      else if (text === 'STEP:REMOVE_FINGER') setInstruction('Remove finger');
      else if (text === 'STEP:PLACE_AGAIN') setInstruction('Place the same finger again');
      else if (text === 'STEP:PROCESSING') setInstruction('Processing…');
      else if (text === 'STEP:FAILED') setInstruction('Enrollment failed — try again');
    },
    [patchStudent]
  );

  const stopReader = async () => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel().catch(() => {});
        readerRef.current = null;
      }
    } catch (_) { /* noop */ }
  };

  const disconnectSerial = async () => {
    await stopReader();
    const p = portRef.current;
    try {
      if (p?.readable) await p.readable.cancel().catch(() => {});
      await p?.close?.();
    } catch (_) { /* noop */ }
    portRef.current = null;
    setPort(null);
    setSerialStatus('idle');
    setInstruction('Disconnected.');
  };

  useEffect(() => {
    return () => {
      (async () => {
        try {
          if (readerRef.current) await readerRef.current.cancel().catch(() => {});
        } catch (_) { /* noop */ }
        try {
          const p = portRef.current;
          if (p) await p.close().catch(() => {});
        } catch (_) { /* noop */ }
        portRef.current = null;
      })();
    };
  }, []);

  const readLoop = async (serialPort) => {
    const decoder = new TextDecoder();
    lineBuf.current = '';
    const reader = serialPort.readable.getReader();
    readerRef.current = reader;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        lineBuf.current += decoder.decode(value, { stream: true });
        const parts = lineBuf.current.split(/\r?\n/);
        lineBuf.current = parts.pop() || '';
        for (const line of parts) {
          const t = line.trim();
          if (t) await handleSerialLine(t);
        }
      }
    } catch (e) {
      console.warn(e);
    } finally {
      try {
        reader.releaseLock();
      } catch (_) { /* noop */ }
      readerRef.current = null;
    }
  };

  const connectSerial = async () => {
    if (!navigator.serial) {
      setInstruction('Web Serial is not available. Use Chrome or Edge on desktop (HTTPS or localhost).');
      setSerialStatus('error');
      return;
    }
    try {
      await disconnectSerial();
      const p = await navigator.serial.requestPort({ filters: USB_FILTERS });
      await p.open({ baudRate: 115200 });
      portRef.current = p;
      setPort(p);
      setSerialStatus('connected');
      setInstruction('Connected — waiting for device…');
      readLoop(p);
    } catch (e) {
      console.warn(e);
      setSerialStatus('error');
      setInstruction('Connection cancelled or failed.');
    }
  };

  const sendCmd = async (cmd) => {
    const p = portRef.current;
    if (!p?.writable) {
      setInstruction('Not connected.');
      return;
    }
    const writer = p.writable.getWriter();
    await writer.write(new TextEncoder().encode(`${cmd}\n`));
    writer.releaseLock();
  };

  const openModal = (row) => {
    setSelected(row);
    setCardUid(row.rfid_uid || '');
    setFpId(row.fingerprint_id || '');
    setRfidManual(row.rfid_uid || '');
    setFpManual(row.fingerprint_id || '');
    setInstruction('Connect device, then scan card or enroll fingerprint.');
    setSerialStatus(portRef.current ? 'connected' : 'idle');
    setModalClassScope(selectedClass !== ALL_STUDENTS ? selectedClass : '');
    setModalStudentQuery('');
    setModalSearchHits([]);
    setModalClassRoster([]);
    setModalClassRosterFetched(false);
    setIdentityConflict(null);
    setBanner(null);
    setModalOpen(true);
  };

  const loadModalClassRoster = useCallback(async () => {
    if (!modalClassScope || !schoolId) return;
    setModalRosterLoading(true);
    setIdentityConflict(null);
    try {
      const { data: res } = await api.get('/students', {
        params: {
          school_id: schoolId,
          class_name: modalClassScope,
          limit: 3000,
          page: 1,
        },
      });
      if (res.success) {
        setModalClassRoster(Array.isArray(res.data) ? res.data : []);
        setModalClassRosterFetched(true);
      } else {
        setModalClassRoster([]);
        setModalClassRosterFetched(true);
      }
    } catch {
      setModalClassRoster([]);
      setModalClassRosterFetched(true);
    } finally {
      setModalRosterLoading(false);
    }
  }, [modalClassScope, schoolId]);

  const switchToStudent = useCallback((row) => {
    if (!row?.id) return;
    setSelected(row);
    setCardUid(row.rfid_uid || '');
    setFpId(row.fingerprint_id || '');
    setRfidManual(row.rfid_uid || '');
    setFpManual(row.fingerprint_id || '');
    setBanner(null);
    setIdentityConflict(null);
    const connected = !!portRef.current;
    setInstruction(
      connected
        ? 'Ready for this learner — scan a card or enroll a fingerprint.'
        : 'Connect the device, then scan or enroll for this learner.'
    );
  }, []);

  useEffect(() => {
    if (!modalOpen || !schoolId) return;
    if (modalClassScope) {
      setModalSearchHits([]);
      setModalSearchLoading(false);
      return;
    }
    const q = modalStudentQuery.trim();
    if (q.length < 1) {
      setModalSearchHits([]);
      setModalSearchLoading(false);
      return;
    }
    const t = setTimeout(async () => {
      setModalSearchLoading(true);
      try {
        const { data: res } = await api.get('/students', {
          params: { school_id: schoolId, q, limit: 40, page: 1 },
        });
        if (res.success) setModalSearchHits(Array.isArray(res.data) ? res.data : []);
        else setModalSearchHits([]);
      } catch {
        setModalSearchHits([]);
      } finally {
        setModalSearchLoading(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [modalStudentQuery, modalClassScope, modalOpen, schoolId]);

  const modalDisplayRows = useMemo(() => {
    if (modalClassScope) {
      return filterStudentsByQuery(modalClassRoster, modalStudentQuery);
    }
    return modalSearchHits;
  }, [modalClassScope, modalClassRoster, modalStudentQuery, modalSearchHits]);

  const modalListLoading = modalClassScope ? modalRosterLoading : modalSearchLoading;

  const closeModal = () => {
    setModalOpen(false);
    setModalStudentQuery('');
    setModalSearchHits([]);
    setModalClassRoster([]);
    setModalClassRosterFetched(false);
    setIdentityConflict(null);
    disconnectSerial();
  };

  const enrollFp = () => {
    setInstruction('Starting enrollment…');
    sendCmd('ENROLL');
  };

  const deleteFpHardware = () => {
    const id =
      window.prompt('Fingerprint ID to delete on device:', fpId || selected?.fingerprint_id || '') || '';
    if (!id.trim()) return;
    setInstruction('Deleting on device…');
    sendCmd(`DELETE:${id.trim()}`);
  };

  const clearFpRecord = async () => {
    if (!selected?.id) return;
    if (!window.confirm('Clear saved fingerprint ID for this student?')) return;
    const ok = await patchStudent(selected.id, { fingerprint_id: null });
    if (ok) {
      setFpId('');
      setFpManual('');
      setBanner({ type: 'ok', text: 'Fingerprint ID removed from student record.' });
    }
  };

  const clearRfidRecord = async () => {
    if (!selected?.id) return;
    if (!window.confirm('Remove assigned RFID card for this student?')) return;
    const ok = await patchStudent(selected.id, { rfid_uid: null });
    if (ok) {
      setCardUid('');
      setRfidManual('');
      setBanner({ type: 'ok', text: 'RFID card removed from student record.' });
    }
  };

  const saveManualIdentity = async () => {
    if (!selected?.id) return;
    const r = rfidManual.trim();
    const f = fpManual.trim();
    const ok = await patchStudent(selected.id, {
      rfid_uid: r || null,
      fingerprint_id: f || null,
    });
    if (ok) setBanner({ type: 'ok', text: 'Identity saved manually.' });
  };

  const classLabelUi = (c) => (c === ALL_STUDENTS ? 'All students' : c);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-16">
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-6 sm:p-8 text-white shadow-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-300/90 mb-1">Super Admin · Hardware</p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Student <span className="text-amber-300">Smart Access</span>
        </h1>
        <p className="text-sm text-white/65 font-medium mt-2 max-w-2xl leading-relaxed">
          Choose a school by location, then assign RFID cards and fingerprints via Web Serial — same workflow as the Manager / DOS portals.
        </p>
        <div className="flex flex-wrap gap-2 mt-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-black uppercase tracking-wider">
            <Usb size={12} /> Web Serial
          </span>
          <Link
            to="/superadmin/smart-access/staff"
            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-200 hover:text-amber-100 ml-auto"
          >
            Staff Smart Access →
          </Link>
        </div>
      </header>

      <SmartAccessSchoolToolbar
        selectedSchoolId={schoolId}
        onSchoolChange={setScopedSchool}
        presetSchoolId={presetFromQuery}
        activeSchool={scopedSchool}
      />

      {!schoolId && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 font-semibold">
          Select a school to load learners and assign cards.
        </div>
      )}

      {schoolId && banner && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-bold flex items-start gap-2 border ${
            banner.type === 'ok'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-900'
              : banner.type === 'error'
                ? 'bg-red-50 border-red-100 text-red-900'
                : 'bg-amber-50 border-amber-100 text-amber-900'
          }`}
        >
          {banner.type === 'error' ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> : <UserCheck size={18} className="shrink-0 mt-0.5" />}
          {banner.text}
          <button type="button" onClick={() => setBanner(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {schoolId && (
        <div className="bg-white rounded-[1.75rem] border border-slate-200 shadow-lg p-6 md:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end gap-6">
            <div className="flex-1 space-y-2 min-w-0">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Class</label>
              <div className="relative">
                <button
                  type="button"
                  disabled={classesLoading}
                  onClick={() => classes.length && setClassOpen((o) => !o)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 text-left font-black text-sm text-slate-900 hover:border-slate-300 transition-colors disabled:opacity-60"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <GraduationCap size={18} className="text-[#1E3A5F] shrink-0" />
                    <span className="truncate">
                      {classesLoading ? 'Loading classes…' : classLabelUi(selectedClass)}
                    </span>
                  </span>
                  <ChevronDown size={18} className="opacity-40 shrink-0" />
                </button>
                {classOpen && classes.length > 0 && (
                  <>
                    <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close" onClick={() => setClassOpen(false)} />
                    <div className="absolute z-50 mt-2 w-full max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl py-1">
                      {classes.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setSelectedClass(c);
                            setClassOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-slate-50 transition-colors ${
                            selectedClass === c ? 'text-[#1E3A5F] bg-slate-100' : 'text-slate-800'
                          }`}
                        >
                          {classLabelUi(c)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Search</label>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by name or code…"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-2 ring-amber-200"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 font-black text-[10px] uppercase tracking-wider text-slate-500">Student</th>
                    <th className="px-4 py-3 font-black text-[10px] uppercase tracking-wider text-slate-500">Code</th>
                    <th className="px-4 py-3 font-black text-[10px] uppercase tracking-wider text-slate-500 hidden sm:table-cell">RFID</th>
                    <th className="px-4 py-3 font-black text-[10px] uppercase tracking-wider text-slate-500 hidden md:table-cell">Fingerprint</th>
                    <th className="px-4 py-3 font-black text-[10px] uppercase tracking-wider text-slate-500 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {classesLoading || listLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500 font-bold">
                        <Loader2 className="inline w-6 h-6 animate-spin mr-2 align-middle" />
                        Loading…
                      </td>
                    </tr>
                  ) : filteredLocal.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500 font-bold">
                        No students for this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLocal.map((s) => (
                      <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-black text-slate-900">{studentDisplayName(s)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.student_uid || s.student_code || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs hidden sm:table-cell">{s.rfid_uid || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs hidden md:table-cell">{s.fingerprint_id || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openModal(s)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50"
                            >
                              Edit identity
                            </button>
                            <button
                              type="button"
                              onClick={() => openModal(s)}
                              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest ${navyBtn}`}
                            >
                              <IdCard size={14} />
                              Assign card
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {modalOpen && selected && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          <button type="button" className="absolute inset-0 bg-[#0A192F]/70 backdrop-blur-md" onClick={closeModal} aria-label="Close" />
          <div className="relative w-full max-w-lg bg-white rounded-[1.75rem] shadow-2xl border border-slate-100 overflow-hidden max-h-[min(92vh,880px)] flex flex-col">
            <div
              className="px-6 py-4 flex items-start justify-between gap-3 text-white shrink-0"
              style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80">Assign to</p>
                <p className="text-lg font-black truncate">{studentDisplayName(selected)}</p>
                <p className="text-[11px] font-mono opacity-80 mt-0.5">
                  {selected.student_uid || selected.student_code || '—'} · {classLabel(selected)}
                </p>
              </div>
              <button type="button" onClick={closeModal} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto min-h-0">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  <ArrowRightLeft size={14} className="text-[#1E3A5F]" />
                  Switch learner
                </p>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Class</label>
                    <select
                      value={modalClassScope}
                      onChange={(e) => {
                        setModalClassScope(e.target.value);
                        setModalStudentQuery('');
                        setModalClassRoster([]);
                        setModalClassRosterFetched(false);
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 ring-amber-200"
                    >
                      <option value="">All classes (search)</option>
                      {classes.filter((c) => c !== ALL_STUDENTS).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={!modalClassScope || modalRosterLoading}
                    onClick={loadModalClassRoster}
                    className={`mt-0 sm:mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-md disabled:opacity-45 ${navyBtn}`}
                  >
                    {modalRosterLoading ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                    Load class
                  </button>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Search</label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      value={modalStudentQuery}
                      onChange={(e) => setModalStudentQuery(e.target.value)}
                      disabled={modalClassScope !== '' && !modalClassRosterFetched}
                      placeholder={!modalClassScope ? 'Whole school…' : 'After load, filter…'}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-xs font-bold outline-none focus:ring-2 ring-amber-200 disabled:bg-slate-100"
                    />
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-100 bg-white divide-y divide-slate-100">
                  {modalClassScope && !modalClassRosterFetched && !modalRosterLoading ? (
                    <p className="p-4 text-[11px] text-slate-500 font-semibold">Pick a class and tap Load class.</p>
                  ) : modalListLoading ? (
                    <div className="p-3 flex items-center gap-2 text-xs text-slate-500 font-bold">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading…
                    </div>
                  ) : modalDisplayRows.length === 0 ? (
                    <p className="p-3 text-[11px] text-slate-500 font-semibold">No matches.</p>
                  ) : (
                    modalDisplayRows.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 text-[12px] truncate">{studentDisplayName(s)}</p>
                          <p className="font-mono text-[10px] text-slate-500 truncate">
                            {s.student_uid || '—'} · {s.class_name || '—'}
                          </p>
                        </div>
                        {s.id === selected?.id ? (
                          <span className="text-[9px] font-black text-emerald-600 uppercase">Current</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => switchToStudent(s)}
                            className="shrink-0 px-3 py-1.5 rounded-lg text-white text-[9px] font-black uppercase"
                            style={{ background: 'linear-gradient(135deg,#1E3A5F,#0D2644)' }}
                          >
                            Switch
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={connectSerial}
                  disabled={serialStatus === 'connected'}
                  className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 py-3 rounded-xl text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-50 ${navyBtn}`}
                >
                  <Usb size={16} />
                  {serialStatus === 'connected' ? 'Connected' : 'Connect device'}
                </button>
                {serialStatus === 'connected' && (
                  <button
                    type="button"
                    onClick={disconnectSerial}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-[11px] font-black uppercase text-slate-600 hover:bg-slate-50"
                  >
                    Disconnect
                  </button>
                )}
              </div>

              <p className="text-xs font-bold text-slate-800">
                Status:{' '}
                <span className={serialStatus === 'connected' ? 'text-emerald-600' : serialStatus === 'error' ? 'text-red-600' : 'text-slate-500'}>
                  {serialStatus === 'connected' ? 'Connected' : serialStatus === 'error' ? 'Error' : 'Not connected'}
                </span>
              </p>
              <p className="text-sm text-slate-600 min-h-[2.5rem]">{instruction}</p>

              {identityConflict && (
                <div className="flex rounded-2xl overflow-hidden border border-red-200 bg-red-50" role="alert">
                  <div className="flex gap-3 p-4 flex-1 items-start">
                    {identityConflict.kind === 'fingerprint' ? <Fingerprint size={22} /> : <CreditCard size={22} />}
                    <div>
                      <p className="text-[13px] font-semibold text-red-950">{identityConflict.message}</p>
                    </div>
                    <button type="button" onClick={() => setIdentityConflict(null)} className="ml-auto shrink-0" aria-label="Dismiss">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                  <Radio size={12} /> Last scanned card UID
                </label>
                <input
                  readOnly
                  value={cardUid}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-mono text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                  <Fingerprint size={12} /> Last scanned fingerprint ID
                </label>
                <input
                  readOnly
                  value={fpId}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-mono text-sm font-bold"
                />
              </div>

              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Manual edit</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <CreditCard size={12} /> RFID UID
                  </label>
                  <input
                    value={rfidManual}
                    onChange={(e) => setRfidManual(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <Fingerprint size={12} /> Fingerprint ID
                  </label>
                  <input
                    value={fpManual}
                    onChange={(e) => setFpManual(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={apiBusy}
                onClick={saveManualIdentity}
                className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-[11px] font-black uppercase tracking-widest ${navyBtn} disabled:opacity-50`}
              >
                {apiBusy ? <Loader2 className="animate-spin" size={14} /> : <Shield size={14} />}
                Save manual identity
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={enrollFp}
                  disabled={serialStatus !== 'connected' || apiBusy}
                  className="inline-flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#1E3A5F]/25 text-[#1E3A5F] text-[11px] font-black uppercase disabled:opacity-40"
                >
                  <Fingerprint size={16} /> Enroll
                </button>
                <button
                  type="button"
                  onClick={deleteFpHardware}
                  disabled={serialStatus !== 'connected' || apiBusy}
                  className="inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 text-red-700 text-[11px] font-black uppercase disabled:opacity-40"
                >
                  <Trash2 size={16} /> Delete on device
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={clearRfidRecord}
                  disabled={apiBusy || !selected.rfid_uid}
                  className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase text-slate-500 border border-dashed border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                >
                  <CreditCard className="inline mr-2" size={14} /> Remove card from record
                </button>
                <button
                  type="button"
                  onClick={clearFpRecord}
                  disabled={apiBusy || !selected.fingerprint_id}
                  className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase text-slate-500 border border-dashed border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Cpu className="inline mr-2" size={14} /> Clear fingerprint from record
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
