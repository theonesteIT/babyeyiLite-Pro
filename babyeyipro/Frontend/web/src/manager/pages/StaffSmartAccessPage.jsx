import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMasterAuth } from '../../context/MasterAuthContext'
import { canAccessSchoolConsole } from '../utils/schoolConsoleAccess'
import { createHref } from '../../lib/hrefFactory'
import api from '../services/api'
import StaffIdentityPhotoStep from '../components/StaffIdentityPhotoStep'

const USB_FILTERS = [{ usbVendorId: 0x10c4 }, { usbVendorId: 0x1a86 }]
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/+$/, '')

/** Read file as base64 for JSON upload (avoids multipart/busboy issues on some devices). */
function fileToPhotoJsonPayload(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      const s = String(r.result || '')
      const i = s.indexOf(',')
      const photoBase64 = i >= 0 ? s.slice(i + 1) : s
      resolve({
        photoBase64,
        mimeType: file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg',
      })
    }
    r.onerror = () => reject(new Error('Could not read image file'))
    r.readAsDataURL(file)
  })
}

function staffName(s) {
  return `${s.first_name || ''} ${s.last_name || ''}`.trim() || '—'
}

function filterStaff(list, q, teachersOnly) {
  let rows = Array.isArray(list) ? list : []
  if (teachersOnly) rows = rows.filter((s) => String(s.role_code || '').toUpperCase() === 'TEACHER')
  const t = String(q || '').trim().toLowerCase()
  if (!t) return rows
  return rows.filter((s) => {
    const name = staffName(s).toLowerCase()
    const em = String(s.email || '').toLowerCase()
    const sid = String(s.staff_id || s.staff_login_username || '').toLowerCase()
    const un = String(s.username || '').toLowerCase()
    return name.includes(t) || em.includes(t) || sid.includes(t) || un.includes(t)
  })
}

/**
 * Staff / teacher identity: search → photo → Web Serial (same protocol as student Smart Access).
 * @param {'manager'|'dos'} props.accent
 * @param {boolean} props.teachersOnly — DOS: only teachers in step 1
 */
export default function StaffSmartAccessPage({ portalBase = '/manager', accent = 'manager', teachersOnly = false }) {
  const h = useMemo(() => createHref(portalBase), [portalBase])
  const { user, loading: authLoading } = useMasterAuth()
  const proOk = useMemo(() => canAccessSchoolConsole(user), [user])

  const [step, setStep] = useState(1)
  const [listLoading, setListLoading] = useState(false)
  const [staff, setStaff] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const selectedRef = useRef(null)
  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  const [photoFile, setPhotoFile] = useState(null)
  const [photoBusy, setPhotoBusy] = useState(false)

  const onStaffPhotoFileChange = useCallback((file) => {
    setPhotoFile(file)
  }, [])

  const [serialStatus, setSerialStatus] = useState('idle')
  const [instruction, setInstruction] = useState('Connect USB device, then scan card or enroll fingerprint.')
  const [cardUid, setCardUid] = useState('')
  const [fpId, setFpId] = useState('')
  const [port, setPort] = useState(null)
  const portRef = useRef(null)
  const readerRef = useRef(null)
  const lineBuf = useRef('')
  const [apiBusy, setApiBusy] = useState(false)
  const [banner, setBanner] = useState(null)
  const [identityConflict, setIdentityConflict] = useState(null)

  const [rfidManual, setRfidManual] = useState('')
  const [fpManual, setFpManual] = useState('')
  const [remarks, setRemarks] = useState('')

  const navyBtn =
    accent === 'dos'
      ? 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25'
      : 'bg-gradient-to-br from-[#1E3A5F] to-[#0D2644] hover:from-[#234a73] hover:to-[#0f2038] shadow-lg shadow-[#1E3A5F]/25'

  const goldText = accent === 'dos' ? 'text-orange-500' : 'text-[#FEBF10]'

  const loadStaff = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await api.get('/school/staff')
      if (res.data?.success) setStaff(Array.isArray(res.data.data) ? res.data.data : [])
      else {
        setStaff([])
        setBanner({ type: 'error', text: res.data?.message || 'Could not load staff.' })
      }
    } catch (e) {
      console.error(e)
      setStaff([])
      setBanner({ type: 'error', text: 'Could not load staff.' })
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    if (proOk) loadStaff()
  }, [proOk, loadStaff])

  const filtered = useMemo(() => filterStaff(staff, search, teachersOnly), [staff, search, teachersOnly])

  const patchIdentity = useCallback(async (id, body) => {
    setApiBusy(true)
    setIdentityConflict(null)
    try {
      const res = await api.put(`/school/staff/${id}/identity`, body)
      if (res.data?.success) {
        const row = res.data.data || {}
        setStaff((prev) =>
          prev.map((s) => (s.id === id ? { ...s, rfid_uid: row.rfid_uid, fingerprint_id: row.fingerprint_id } : s))
        )
        setSelected((cur) =>
          cur && cur.id === id ? { ...cur, rfid_uid: row.rfid_uid, fingerprint_id: row.fingerprint_id } : cur
        )
        return true
      }
      setBanner({ type: 'error', text: res.data?.message || 'Update failed.' })
      return false
    } catch (e) {
      const status = e.response?.status
      const data = e.response?.data || {}
      const msg = data.message || 'Update failed.'
      if (status === 409) {
        setIdentityConflict({ message: msg })
        setInstruction('')
      } else {
        setBanner({ type: 'error', text: msg })
      }
      return false
    } finally {
      setApiBusy(false)
    }
  }, [])

  const handleSerialLine = useCallback(
    async (text) => {
      const st = selectedRef.current
      if (!st?.id) return

      if (text.startsWith('CARD:')) {
        const uid = text.replace('CARD:', '').trim()
        setCardUid(uid)
        setRfidManual(uid)
        setInstruction(`Card scanned: ${uid}`)
        const ok = await patchIdentity(st.id, {
          rfid_uid: uid,
          fingerprint_id: st.fingerprint_id || fpManual || null,
        })
        if (ok) setBanner({ type: 'ok', text: `RFID saved for ${staffName(st)}` })
        return
      }
      if (text.startsWith('FPID:') || text.startsWith('EXIST:')) {
        const id = text.replace(/^FPID:|^EXIST:/, '').trim()
        setFpId(id)
        setFpManual(id)
        setInstruction(`Fingerprint ID: ${id}`)
        const cur = selectedRef.current
        const rfid = (cur?.rfid_uid || rfidManual || cardUid || '').trim() || null
        const ok = await patchIdentity(st.id, { rfid_uid: rfid, fingerprint_id: id })
        if (ok) setBanner({ type: 'ok', text: `Fingerprint saved for ${staffName(st)}` })
        return
      }
      if (text === 'STEP:PLACE_FINGER') setInstruction('Place finger on the sensor')
      else if (text === 'STEP:REMOVE_FINGER') setInstruction('Remove finger')
      else if (text === 'STEP:PLACE_AGAIN') setInstruction('Place the same finger again')
      else if (text === 'STEP:PROCESSING') setInstruction('Processing…')
      else if (text === 'STEP:FAILED') setInstruction('Enrollment failed — try again')
    },
    [patchIdentity, rfidManual, fpManual, cardUid]
  )

  const stopReader = async () => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel().catch(() => {})
        readerRef.current = null
      }
    } catch (_) {}
  }

  const disconnectSerial = async () => {
    await stopReader()
    const p = portRef.current
    try {
      if (p?.readable) await p.readable.cancel().catch(() => {})
      await p?.close?.()
    } catch (_) {}
    portRef.current = null
    setPort(null)
    setSerialStatus('idle')
    setInstruction('Disconnected.')
  }

  useEffect(() => {
    portRef.current = port
  }, [port])

  useEffect(() => {
    return () => {
      ;(async () => {
        try {
          if (readerRef.current) await readerRef.current.cancel().catch(() => {})
        } catch (_) {}
        try {
          const p = portRef.current
          if (p) await p.close().catch(() => {})
        } catch (_) {}
        portRef.current = null
      })()
    }
  }, [])

  const readLoop = async (serialPort) => {
    const decoder = new TextDecoder()
    lineBuf.current = ''
    const reader = serialPort.readable.getReader()
    readerRef.current = reader
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        lineBuf.current += decoder.decode(value, { stream: true })
        const parts = lineBuf.current.split(/\r?\n/)
        lineBuf.current = parts.pop() || ''
        for (const line of parts) {
          const t = line.trim()
          if (t) await handleSerialLine(t)
        }
      }
    } catch (e) {
      console.warn(e)
    } finally {
      try {
        reader.releaseLock()
      } catch (_) {}
      readerRef.current = null
    }
  }

  const connectSerial = async () => {
    if (!navigator.serial) {
      setInstruction('Web Serial requires Chrome or Edge (HTTPS or localhost).')
      setSerialStatus('error')
      return
    }
    try {
      await disconnectSerial()
      const p = await navigator.serial.requestPort({ filters: USB_FILTERS })
      await p.open({ baudRate: 115200 })
      portRef.current = p
      setPort(p)
      setSerialStatus('connected')
      setInstruction('Connected — waiting for device…')
      readLoop(p)
    } catch (e) {
      console.warn(e)
      setSerialStatus('error')
      setInstruction('Connection cancelled or failed.')
    }
  }

  const savePhoto = async () => {
    if (!selected?.id || !photoFile) {
      setBanner({ type: 'error', text: 'Select a staff member and choose a photo.' })
      return
    }
    if (photoFile.size === 0) {
      setBanner({ type: 'error', text: 'The image file is empty. Choose or capture a photo again.' })
      return
    }
    setPhotoBusy(true)
    try {
      const { photoBase64, mimeType } = await fileToPhotoJsonPayload(photoFile)
      const res = await fetch(`${API_ORIGIN}/api/school/staff/${selected.id}/photo`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoBase64, mimeType }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        setBanner({ type: 'error', text: json.message || 'Upload failed.' })
        return
      }
      const path = json.data?.photo
      if (path) {
        setSelected((s) => (s ? { ...s, photo: path } : s))
        setStaff((prev) => prev.map((x) => (x.id === selected.id ? { ...x, photo: path } : x)))
      }
      setBanner({ type: 'ok', text: 'Photo saved. Continue to hardware.' })
      setStep(3)
    } catch (e) {
      setBanner({ type: 'error', text: 'Upload failed.' })
    } finally {
      setPhotoBusy(false)
    }
  }

  const saveIdentityManual = async () => {
    if (!selected?.id) return
    const r = (rfidManual || cardUid).trim()
    const f = (fpManual || fpId).trim()
    const ok = await patchIdentity(selected.id, {
      rfid_uid: r || null,
      fingerprint_id: f || null,
      identity_remarks: remarks.trim() || undefined,
    })
    if (ok) setBanner({ type: 'ok', text: 'Identity saved.' })
  }

  useEffect(() => {
    if (!selected) return
    setRfidManual(selected.rfid_uid || '')
    setFpManual(selected.fingerprint_id || '')
    setRemarks(selected.identity_remarks || '')
    setCardUid('')
    setFpId('')
  }, [selected])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-re-navy" />
      </div>
    )
  }

  if (!proOk) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <p className="text-sm font-bold text-slate-600">Pro school console access required.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white px-5 md:px-10 py-8 border-b border-white/10">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50 mb-1">
          {teachersOnly ? 'Teachers · identity' : 'Staff & teachers · identity'}
        </p>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">Smart staff access</h1>
        <p className="text-sm text-white/70 font-semibold mt-2 max-w-2xl">
          Step 1: find the person. Step 2: profile photo. Step 3: assign RFID and fingerprint using the same USB device
          workflow as student Smart School Access.
        </p>
        <div className="flex flex-wrap gap-2 mt-5">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStep(n)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                step === n ? 'bg-white text-[#0f172a]' : 'bg-white/10 text-white/80 hover:bg-white/15'
              }`}
            >
              Step {n}
            </button>
          ))}
          <Link
            to={h('/smart-access')}
            className={`ml-auto text-[10px] font-black uppercase tracking-widest ${goldText} underline-offset-4 hover:underline`}
          >
            Student Smart Access →
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {banner && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
              banner.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-100 text-red-900'
            }`}
          >
            {banner.text}
          </div>
        )}

        {step === 1 && (
          <div className="bg-white rounded-[28px] border border-black/5 shadow-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Step 1 — Select person</h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  {teachersOnly ? 'Teachers at your school only.' : 'All staff accounts (teachers, admin, etc.).'}
                </p>
              </div>
              <button
                type="button"
                onClick={loadStaff}
                className="text-[10px] font-black uppercase tracking-widest text-[#1E3A5F]"
              >
                Refresh list
              </button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, username, or staff ID…"
                className="w-full rounded-2xl border border-slate-200 pl-12 pr-4 py-3.5 text-sm font-bold"
              />
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-sm">
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
                      <td colSpan={6} className="py-12 text-center text-slate-500 font-bold">
                        No staff found.
                      </td>
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
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(row)
                              setPhotoFile(null)
                              setStep(2)
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-white ${navyBtn}`}
                          >
                            <UserCheck size={14} />
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 2 && selected && (
          <div className="bg-white rounded-[28px] border border-black/5 shadow-xl p-6 md:p-8">
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
            <StaffIdentityPhotoStep
              key={selected.id}
              staff={selected}
              accent={accent}
              onPhotoFileChange={onStaffPhotoFileChange}
            />
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
                className="px-6 py-3 rounded-2xl border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-700"
              >
                Skip to hardware
              </button>
            </div>
          </div>
        )}

        {step === 3 && selected && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-[#0f172a] text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white/90 max-w-xl">
                <Usb className="inline mr-2 opacity-80" size={16} />
                Connect the USB device once, then assign cards or fingerprints — same as student Smart School Access.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={connectSerial}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-[10px] font-black uppercase tracking-wider"
                >
                  <Radio size={14} /> Web Serial
                </button>
                <span className="inline-flex items-center px-3 py-2 rounded-xl bg-white/5 text-[10px] font-mono text-white/70">
                  115200 baud
                </span>
              </div>
            </div>

            <div className="bg-white rounded-[28px] border border-black/5 shadow-xl p-6 md:p-8">
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

              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Or enter manually</p>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <CreditCard size={12} /> RFID UID (optional)
                  </label>
                  <input
                    value={rfidManual}
                    onChange={(e) => setRfidManual(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono"
                    placeholder="From reader or paste"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <Fingerprint size={12} /> Fingerprint ID (optional)
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
              <button
                type="button"
                disabled={apiBusy}
                onClick={saveIdentityManual}
                className={`inline-flex items-center gap-2 px-8 py-3 rounded-2xl text-white font-black text-xs uppercase tracking-widest ${navyBtn} disabled:opacity-50`}
              >
                {apiBusy ? <Loader2 className="animate-spin" size={16} /> : <Shield size={16} />}
                Save identity
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
