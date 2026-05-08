import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Fingerprint,
  Loader2,
  Radio,
  Search,
  Shield,
  Usb,
  UserCheck,
  CreditCard,
  Check,
  ArrowLeft,
  GraduationCap,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SmartAccessSchoolToolbar from './SmartAccessSchoolToolbar';
import { api, uploadsBase } from './smartAccessApi';

const USB_FILTERS = [{ usbVendorId: 0x10c4 }, { usbVendorId: 0x1a86 }];

/** Read file as base64 JSON body for staff photo API. */
function fileToPhotoJsonPayload(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || '');
      const i = s.indexOf(',');
      const photoBase64 = i >= 0 ? s.slice(i + 1) : s;
      resolve({
        photoBase64,
        mimeType: file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg',
      });
    };
    r.onerror = () => reject(new Error('Could not read image file'));
    r.readAsDataURL(file);
  });
}

function staffName(s) {
  return `${s.first_name || ''} ${s.last_name || ''}`.trim() || '—';
}

function filterStaff(list, q) {
  const rows = Array.isArray(list) ? list : [];
  const t = String(q || '').trim().toLowerCase();
  if (!t) return rows;
  return rows.filter((s) => {
    const name = staffName(s).toLowerCase();
    const em = String(s.email || '').toLowerCase();
    const sid = String(s.staff_id || s.staff_login_username || '').toLowerCase();
    const un = String(s.username || '').toLowerCase();
    return name.includes(t) || em.includes(t) || sid.includes(t) || un.includes(t);
  });
}

function photoHref(path) {
  if (!path) return null;
  const p = String(path).trim();
  if (!p) return null;
  if (p.startsWith('http')) return p;
  const base = uploadsBase.replace(/\/+$/, '');
  return `${base}${p.startsWith('/') ? p : `/${p}`}`;
}

export default function SuperAdminStaffSmartAccess() {
  const [searchParams] = useSearchParams();
  const presetFromQuery = useMemo(() => {
    const n = Number(searchParams.get('school_id'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [searchParams]);

  const [scopedSchool, setScopedSchool] = useState(null);
  const schoolId = scopedSchool?.id ?? null;

  const [step, setStep] = useState(1);
  const [listLoading, setListLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const selectedRef = useRef(null);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const [serialStatus, setSerialStatus] = useState('idle');
  const [instruction, setInstruction] = useState('Connect USB device, then scan card or enroll fingerprint.');
  const [cardUid, setCardUid] = useState('');
  const [fpId, setFpId] = useState('');
  const [port, setPort] = useState(null);
  const portRef = useRef(null);
  const readerRef = useRef(null);
  const lineBuf = useRef('');
  const [apiBusy, setApiBusy] = useState(false);
  const [banner, setBanner] = useState(null);
  const [identityConflict, setIdentityConflict] = useState(null);

  const [rfidManual, setRfidManual] = useState('');
  const [fpManual, setFpManual] = useState('');
  const [remarks, setRemarks] = useState('');

  const navyBtn =
    'bg-gradient-to-br from-[#1E3A5F] to-[#0D2644] hover:from-[#234a73] hover:to-[#0f2038] shadow-lg shadow-[#1E3A5F]/25';

  const loadStaff = useCallback(async () => {
    if (!schoolId) return;
    setListLoading(true);
    try {
      const { data: res } = await api.get('/school/staff', { params: { school_id: schoolId } });
      if (res?.success) setStaff(Array.isArray(res.data) ? res.data : []);
      else {
        setStaff([]);
        setBanner({ type: 'error', text: res?.message || 'Could not load staff.' });
      }
    } catch (e) {
      console.error(e);
      setStaff([]);
      const msg = e.response?.data?.message;
      const code = e.response?.data?.code;
      setBanner({
        type: 'error',
        text: msg || (code === 'PRO_REQUIRED' ? 'This school requires a Pro subscription for this action.' : 'Could not load staff.'),
      });
    } finally {
      setListLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) loadStaff();
    else {
      setStaff([]);
      setSelected(null);
      setStep(1);
    }
  }, [schoolId, loadStaff]);

  const filtered = useMemo(() => filterStaff(staff, search), [staff, search]);

  const patchIdentity = useCallback(
    async (id, body) => {
      if (!schoolId) return false;
      setApiBusy(true);
      setIdentityConflict(null);
      try {
        const { data: res } = await api.put(`/school/staff/${id}/identity`, body, {
          params: { school_id: schoolId },
        });
        if (res?.success) {
          const row = res.data || {};
          setStaff((prev) =>
            prev.map((s) =>
              s.id === id ? { ...s, rfid_uid: row.rfid_uid, fingerprint_id: row.fingerprint_id } : s
            )
          );
          setSelected((cur) =>
            cur && cur.id === id ? { ...cur, rfid_uid: row.rfid_uid, fingerprint_id: row.fingerprint_id } : cur
          );
          return true;
        }
        setBanner({ type: 'error', text: res?.message || 'Update failed.' });
        return false;
      } catch (e) {
        const status = e.response?.status;
        const data = e.response?.data || {};
        const msg = data.message || 'Update failed.';
        if (status === 409) {
          setIdentityConflict({ message: msg });
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
        const ok = await patchIdentity(st.id, {
          rfid_uid: uid,
          fingerprint_id: st.fingerprint_id || fpManual || null,
        });
        if (ok) setBanner({ type: 'ok', text: `RFID saved for ${staffName(st)}` });
        return;
      }
      if (text.startsWith('FPID:') || text.startsWith('EXIST:')) {
        const id = text.replace(/^FPID:|^EXIST:/, '').trim();
        setFpId(id);
        setFpManual(id);
        setInstruction(`Fingerprint ID: ${id}`);
        const cur = selectedRef.current;
        const rfid = (cur?.rfid_uid || rfidManual || cardUid || '').trim() || null;
        const ok = await patchIdentity(st.id, { rfid_uid: rfid, fingerprint_id: id });
        if (ok) setBanner({ type: 'ok', text: `Fingerprint saved for ${staffName(st)}` });
        return;
      }
      if (text === 'STEP:PLACE_FINGER') setInstruction('Place finger on the sensor');
      else if (text === 'STEP:REMOVE_FINGER') setInstruction('Remove finger');
      else if (text === 'STEP:PLACE_AGAIN') setInstruction('Place the same finger again');
      else if (text === 'STEP:PROCESSING') setInstruction('Processing…');
      else if (text === 'STEP:FAILED') setInstruction('Enrollment failed — try again');
    },
    [patchIdentity, rfidManual, fpManual, cardUid]
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
    portRef.current = port;
  }, [port]);

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
      setInstruction('Web Serial requires Chrome or Edge (HTTPS or localhost).');
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

  const savePhoto = async () => {
    if (!selected?.id || !photoFile || !schoolId) {
      setBanner({ type: 'error', text: 'Select a staff member and choose a photo.' });
      return;
    }
    setPhotoBusy(true);
    try {
      const { photoBase64, mimeType } = await fileToPhotoJsonPayload(photoFile);
      const { data: json } = await api.post(
        `/school/staff/${selected.id}/photo`,
        { photoBase64, mimeType },
        { params: { school_id: schoolId } }
      );
      if (!json?.success) {
        setBanner({ type: 'error', text: json?.message || 'Upload failed.' });
        return;
      }
      const path = json.data?.photo;
      if (path) {
        setSelected((s) => (s ? { ...s, photo: path } : s));
        setStaff((prev) => prev.map((x) => (x.id === selected.id ? { ...x, photo: path } : x)));
      }
      setBanner({ type: 'ok', text: 'Photo saved. Continue to hardware.' });
      setStep(3);
    } catch (e) {
      setBanner({ type: 'error', text: e.response?.data?.message || 'Upload failed.' });
    } finally {
      setPhotoBusy(false);
    }
  };

  const saveIdentityManual = async () => {
    if (!selected?.id) return;
    const r = (rfidManual || cardUid).trim();
    const f = (fpManual || fpId).trim();
    const ok = await patchIdentity(selected.id, {
      rfid_uid: r || null,
      fingerprint_id: f || null,
      identity_remarks: remarks.trim() || undefined,
    });
    if (ok) setBanner({ type: 'ok', text: 'Identity saved.' });
  };

  const clearStaffRfidRecord = async () => {
    if (!selected?.id) return;
    if (!window.confirm('Remove assigned RFID card for this staff member?')) return;
    const ok = await patchIdentity(selected.id, { rfid_uid: null });
    if (ok) {
      setCardUid('');
      setRfidManual('');
      setBanner({ type: 'ok', text: 'RFID card removed from staff record.' });
    }
  };

  const clearStaffFpRecord = async () => {
    if (!selected?.id) return;
    if (!window.confirm('Remove assigned fingerprint for this staff member?')) return;
    const ok = await patchIdentity(selected.id, { fingerprint_id: null });
    if (ok) {
      setFpId('');
      setFpManual('');
      setBanner({ type: 'ok', text: 'Fingerprint removed from staff record.' });
    }
  };

  useEffect(() => {
    if (!selected) return;
    setRfidManual(selected.rfid_uid || '');
    setFpManual(selected.fingerprint_id || '');
    setRemarks(selected.identity_remarks || '');
    setCardUid('');
    setFpId('');
  }, [selected]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-6 sm:p-8 text-white shadow-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300/90 mb-1">Super Admin · Staff</p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Staff <span className="text-amber-300">Smart Access</span>
        </h1>
        <p className="text-sm text-white/65 font-medium mt-2 max-w-2xl leading-relaxed">
          Select a school, choose a staff member, optionally update their photo, then assign RFID and fingerprint with the USB reader.
        </p>
        <div className="flex flex-wrap gap-2 mt-5">
          <Link
            to="/superadmin/smart-access/students"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-200 hover:text-amber-100"
          >
            <GraduationCap size={14} /> Student Smart Access
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
          Select a school to load staff accounts.
        </div>
      )}

      {schoolId && banner && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
            banner.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-100 text-red-900'
          }`}
        >
          {banner.text}
          <button type="button" className="ml-3 text-xs opacity-70 hover:opacity-100" onClick={() => setBanner(null)}>Dismiss</button>
        </div>
      )}

      {schoolId && (
        <div className="rounded-2xl bg-[#0f172a] text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStep(n)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                  step === n ? 'bg-white text-[#0f172a]' : 'bg-white/10 text-white/80 hover:bg-white/15'
                }`}
              >
                Step {n}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Usb className="opacity-70" size={16} />
            <span className="text-[10px] font-bold text-white/70">Chrome / Edge · Web Serial</span>
          </div>
        </div>
      )}

      {schoolId && step === 1 && (
        <section className="bg-white rounded-[28px] border border-slate-200 shadow-lg p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 1 — Select person</h2>
              <p className="text-xs text-slate-500 font-semibold mt-1">All staff at the selected school.</p>
            </div>
            <button type="button" onClick={loadStaff} className="text-[10px] font-black uppercase tracking-widest text-[#1E3A5F]">
              Refresh list
            </button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, username, staff ID…"
              className="w-full rounded-2xl border border-slate-200 pl-12 pr-4 py-3.5 text-sm font-bold"
            />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-sm min-w-[640px]">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">RFID</th>
                  <th className="py-3 px-4">Fingerprint</th>
                  <th className="py-3 px-4 w-32">Action</th>
                </tr>
              </thead>
              <tbody>
                {listLoading && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-bold">
                      <Loader2 className="inline animate-spin mr-2" /> Loading…
                    </td>
                  </tr>
                )}
                {!listLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-bold">No staff found.</td>
                  </tr>
                )}
                {!listLoading &&
                  filtered.map((row) => (
                    <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">{staffName(row)}</td>
                      <td className="py-3 px-4 text-slate-600 text-xs font-mono">{row.email}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-black uppercase text-amber-700">{row.role_code}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{row.rfid_uid || '—'}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{row.fingerprint_id || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(row);
                              setPhotoFile(null);
                              setStep(3);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50"
                          >
                            Edit identity
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(row);
                              setPhotoFile(null);
                              setStep(2);
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-white ${navyBtn}`}
                          >
                            <UserCheck size={14} /> Select
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {schoolId && step === 2 && selected && (
        <section className="bg-white rounded-[28px] border border-slate-200 shadow-lg p-6 md:p-8">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 mb-4"
          >
            <ArrowLeft size={14} /> Back to search
          </button>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Step 2 — Profile photo</h2>
          <p className="text-xs text-slate-500 font-semibold mb-6">
            {staffName(selected)} · {selected.email}
          </p>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-full sm:w-48 shrink-0">
              {(selected.photo && photoHref(selected.photo)) ? (
                <img
                  src={photoHref(selected.photo)}
                  alt=""
                  className="w-full rounded-2xl border border-slate-200 object-cover aspect-square bg-slate-100"
                />
              ) : (
                <div className="aspect-square rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400 text-center px-2">
                  No photo on file
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3 w-full">
              <label className="block text-[10px] font-black uppercase text-slate-500">Upload new photo</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="w-full text-sm font-semibold"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-8">
            <button
              type="button"
              disabled={photoBusy || !photoFile}
              onClick={savePhoto}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#0f172a] font-black text-xs uppercase tracking-widest disabled:opacity-50"
            >
              {photoBusy ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
              Save & continue
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-xs font-black uppercase text-slate-700"
            >
              Skip to hardware
            </button>
          </div>
        </section>
      )}

      {schoolId && step === 3 && selected && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#0f172a] text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white/90 max-w-xl flex items-start gap-2">
              <Radio className="shrink-0 mt-0.5 opacity-80" size={16} />
              Connect the USB device once, then assign cards or fingerprints.
            </p>
            <button
              type="button"
              onClick={connectSerial}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-[10px] font-black uppercase"
            >
              <Usb size={14} /> Web Serial
            </button>
          </div>

          <section className="bg-white rounded-[28px] border border-slate-200 shadow-lg p-6 md:p-8">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 mb-4"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Step 3 — Hardware</h2>
            <p className="text-xs text-slate-500 font-semibold mb-6">
              Selected: <strong>{staffName(selected)}</strong>
            </p>

            {identityConflict && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-900">
                {identityConflict.message}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Serial status</p>
                <p className="text-sm font-bold text-slate-800">{serialStatus === 'connected' ? 'Connected' : 'Not connected'}</p>
                <p className="text-xs text-slate-600 mt-2">{instruction}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Last scan</p>
                <p className="font-mono text-xs text-slate-800">RFID: {cardUid || '—'}</p>
                <p className="font-mono text-xs text-slate-800 mt-1">FP: {fpId || '—'}</p>
              </div>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Manual entry</p>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
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
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional remarks"
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm mb-6"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={apiBusy}
                onClick={saveIdentityManual}
                className={`inline-flex items-center gap-2 px-8 py-3 rounded-2xl text-white font-black text-xs uppercase tracking-widest ${navyBtn} disabled:opacity-50`}
              >
                {apiBusy ? <Loader2 className="animate-spin" size={16} /> : <Shield size={16} />}
                Save identity
              </button>
              <button
                type="button"
                onClick={clearStaffRfidRecord}
                disabled={apiBusy || !selected.rfid_uid}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-dashed border-slate-300 text-slate-700 font-black text-xs uppercase tracking-widest hover:bg-slate-50 disabled:opacity-40"
              >
                <Trash2 size={14} /> Remove card
              </button>
              <button
                type="button"
                onClick={clearStaffFpRecord}
                disabled={apiBusy || !selected.fingerprint_id}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-dashed border-slate-300 text-slate-700 font-black text-xs uppercase tracking-widest hover:bg-slate-50 disabled:opacity-40"
              >
                <Trash2 size={14} /> Remove fingerprint
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
