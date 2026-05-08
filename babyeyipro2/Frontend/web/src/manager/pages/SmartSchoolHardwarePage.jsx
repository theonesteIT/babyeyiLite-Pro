import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Cpu,
  Fingerprint,
  IdCard,
  Loader2,
  Radio,
  Search,
  Shield,
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
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMasterAuth } from '../../context/MasterAuthContext'
import { canAccessSchoolConsole } from '../utils/schoolConsoleAccess'
import { createHref } from '../../lib/hrefFactory'
import studentService from '../services/studentService'
import schoolService from '../services/schoolService'

const USB_FILTERS = [{ usbVendorId: 0x10c4 }, { usbVendorId: 0x1a86 }]

/** Match class string used in `students.class_name` and list filters (school_classes row → label). */
function formatCombination(combo) {
  if (combo == null || combo === '') return ''
  if (Array.isArray(combo)) return combo.map((x) => String(x).trim()).filter(Boolean).join(' ')
  if (typeof combo === 'object') {
    try {
      const vals = Object.values(combo).filter((v) => v != null && String(v).trim() !== '')
      if (vals.length) return vals.map((v) => String(v).trim()).join(' ')
    } catch (_) {}
    return ''
  }
  return String(combo).trim()
}

function schoolClassRowToLabel(c) {
  const stream = c.stream_name && String(c.stream_name).trim() !== '' ? c.stream_name : ''
  const combo = formatCombination(c.combination)
  const parts = [c.group_name, stream, combo].filter((p) => p != null && String(p).trim() !== '')
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function classLabel(s) {
  if (s.class_group_name) {
    return `${s.class_group_name} ${s.class_stream_name || ''} ${s.class_combination || ''}`.trim().toUpperCase()
  }
  return (s.class_name || '—').toString()
}

function studentDisplayName(s) {
  return `${s.first_name || ''} ${s.last_name || ''}`.trim() || '—'
}

function filterStudentsByQuery(students, q) {
  const t = String(q || '').trim().toLowerCase()
  if (!t) return students
  return students.filter((s) => {
    const name = studentDisplayName(s).toLowerCase()
    const code = String(s.student_uid || s.student_code || '').toLowerCase()
    const sdm = String(s.sdm_code || '').toLowerCase()
    return name.includes(t) || code.includes(t) || sdm.includes(t)
  })
}

/**
 * Pro-only: RFID card + fingerprint enrollment via Web Serial (Chrome/Edge).
 * @param {object} props
 * @param {string} [props.portalBase='/manager'] — `/manager` or `/dos` for internal links
 * @param {'manager'|'dos'} [props.accent='manager'] — subtle chrome accent
 */
export default function SmartSchoolHardwarePage({ portalBase = '/manager', accent = 'manager' }) {
  const h = useMemo(() => createHref(portalBase), [portalBase])
  const { user, loading: authLoading } = useMasterAuth()
  const proOk = useMemo(() => canAccessSchoolConsole(user), [user])

  const schoolId = user?.school_id

  const [classes, setClasses] = useState([])
  const [classesLoading, setClassesLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState('')
  const [classOpen, setClassOpen] = useState(false)

  const [listLoading, setListLoading] = useState(false)
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const selectedRef = useRef(null)

  /** In-modal: switch learner without disconnecting USB serial */
  const [modalClassScope, setModalClassScope] = useState('')
  const [modalStudentQuery, setModalStudentQuery] = useState('')
  const [modalSearchLoading, setModalSearchLoading] = useState(false)
  const [modalSearchHits, setModalSearchHits] = useState([])
  const [modalClassRoster, setModalClassRoster] = useState([])
  const [modalRosterLoading, setModalRosterLoading] = useState(false)
  /** True after user clicks "Load class" for the current `modalClassScope` */
  const [modalClassRosterFetched, setModalClassRosterFetched] = useState(false)
  /** In-modal: duplicate card / fingerprint (409) — styled alert, not only banner */
  const [identityConflict, setIdentityConflict] = useState(null)
  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  const [serialStatus, setSerialStatus] = useState('idle')
  const [instruction, setInstruction] = useState('Connect a device, then scan or enroll.')
  const [cardUid, setCardUid] = useState('')
  const [fpId, setFpId] = useState('')
  const [port, setPort] = useState(null)
  const portRef = useRef(null)
  const readerRef = useRef(null)
  const lineBuf = useRef('')
  const [apiBusy, setApiBusy] = useState(false)
  const [banner, setBanner] = useState(null)

  useEffect(() => {
    portRef.current = port
  }, [port])

  const navyBtn =
    accent === 'dos'
      ? 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25'
      : 'bg-gradient-to-br from-[#1E3A5F] to-[#0D2644] hover:from-[#234a73] hover:to-[#0f2038] shadow-lg shadow-[#1E3A5F]/25'

  const goldText = accent === 'dos' ? 'text-orange-500' : 'text-[#FEBF10]'

  const loadClasses = useCallback(async () => {
    if (!schoolId) {
      setClassesLoading(false)
      return
    }
    setClassesLoading(true)
    try {
      const res = await schoolService.getGroups(schoolId)
      if (res.success) {
        // Prefer API merge: school_classes labels + every distinct students.class_name
        // (same strings as school-console ?tab=students import / class field).
        let uniq = []
        if (Array.isArray(res.class_name_options) && res.class_name_options.length > 0) {
          uniq = [...new Set(res.class_name_options.map((s) => String(s).trim()).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true })
          )
        } else if (Array.isArray(res.data) && res.data.length) {
          uniq = [...new Set(res.data.map((c) => schoolClassRowToLabel(c)).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true })
          )
        }
        setClasses(uniq)
        setSelectedClass((prev) => (prev && uniq.includes(prev) ? prev : uniq[0] || ''))
      } else {
        setClasses([])
        setSelectedClass('')
      }
    } catch (e) {
      console.error(e)
      setClasses([])
      setSelectedClass('')
      setBanner({ type: 'error', text: 'Could not load classes from the database.' })
    } finally {
      setClassesLoading(false)
    }
  }, [schoolId])

  const loadStudents = useCallback(async () => {
    if (!schoolId || !selectedClass) return
    setListLoading(true)
    try {
      const res = await studentService.getStudents({
        class_name: selectedClass,
      })
      if (res.success) {
        setStudents(Array.isArray(res.data) ? res.data : [])
      } else {
        setStudents([])
        setBanner({ type: 'error', text: res.message || 'Failed to load students.' })
      }
    } catch (e) {
      console.error(e)
      setStudents([])
      setBanner({ type: 'error', text: 'Could not load students.' })
    } finally {
      setListLoading(false)
    }
  }, [schoolId, selectedClass])

  useEffect(() => {
    if (proOk && schoolId) loadClasses()
  }, [proOk, schoolId, loadClasses])

  useEffect(() => {
    if (!proOk || !selectedClass) return
    loadStudents()
  }, [proOk, selectedClass, loadStudents])

  const filteredLocal = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) => {
      const name = studentDisplayName(s).toLowerCase()
      const code = String(s.student_uid || s.student_code || '').toLowerCase()
      return name.includes(q) || code.includes(q)
    })
  }, [students, search])

  /** Uses PUT /students/:id/identity — not full PUT /students/:id (which requires profile fields). */
  const patchStudent = useCallback(async (id, body) => {
    setApiBusy(true)
    setIdentityConflict(null)
    try {
      const res = await studentService.updateStudentIdentity(id, body)
      if (res.success) {
        setIdentityConflict(null)
        const row = res.data || {}
        setStudents((prev) =>
          prev.map((s) => (s.id === id ? { ...s, rfid_uid: row.rfid_uid, fingerprint_id: row.fingerprint_id } : s))
        )
        setSelected((cur) =>
          cur && cur.id === id
            ? { ...cur, rfid_uid: row.rfid_uid, fingerprint_id: row.fingerprint_id }
            : cur
        )
        return true
      }
      setBanner({ type: 'error', text: res.message || 'Update failed.' })
      return false
    } catch (e) {
      console.error(e)
      const status = e.response?.status
      const data = e.response?.data || {}
      const msg = data.message || 'Update failed.'
      const code = data.code || ''
      if (status === 409) {
        setIdentityConflict({
          kind: code === 'FINGERPRINT_DUPLICATE' ? 'fingerprint' : 'card',
          message: msg,
          code,
        })
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
        setInstruction(`Card scanned: ${uid}`)
        const ok = await patchStudent(st.id, { rfid_uid: uid })
        if (ok) setBanner({ type: 'ok', text: `RFID saved for ${studentDisplayName(st)}` })
        return
      }
      if (text.startsWith('FPID:')) {
        const id = text.replace('FPID:', '').trim()
        setFpId(id)
        setInstruction(`Fingerprint registered (ID ${id})`)
        const ok = await patchStudent(st.id, { fingerprint_id: id })
        if (ok) setBanner({ type: 'ok', text: `Fingerprint ID saved for ${studentDisplayName(st)}` })
        return
      }
      if (text.startsWith('EXIST:')) {
        const id = text.replace('EXIST:', '').trim()
        setFpId(id)
        setInstruction(`Already registered — ID ${id}`)
        const ok = await patchStudent(st.id, { fingerprint_id: id })
        if (ok) setBanner({ type: 'ok', text: `Fingerprint ID synced for ${studentDisplayName(st)}` })
        return
      }
      if (text.startsWith('FPDEL:')) {
        const id = text.replace('FPDEL:', '').trim()
        setInstruction(`Deleted fingerprint ID ${id}`)
        setFpId('')
        const cur = selectedRef.current
        if (cur?.fingerprint_id && String(cur.fingerprint_id) === String(id)) {
          const ok = await patchStudent(cur.id, { fingerprint_id: null })
          if (ok) setBanner({ type: 'ok', text: 'Fingerprint cleared for this student.' })
        }
        return
      }
      if (text === 'STEP:PLACE_FINGER') setInstruction('Place finger on the sensor')
      else if (text === 'STEP:REMOVE_FINGER') setInstruction('Remove finger')
      else if (text === 'STEP:PLACE_AGAIN') setInstruction('Place the same finger again')
      else if (text === 'STEP:PROCESSING') setInstruction('Processing…')
      else if (text === 'STEP:FAILED') setInstruction('Enrollment failed — try again')
    },
    [patchStudent]
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
      setInstruction('Web Serial is not available. Use Chrome or Edge on desktop (HTTPS or localhost).')
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

  const sendCmd = async (cmd) => {
    const p = portRef.current
    if (!p?.writable) {
      setInstruction('Not connected.')
      return
    }
    const writer = p.writable.getWriter()
    await writer.write(new TextEncoder().encode(`${cmd}\n`))
    writer.releaseLock()
  }

  const openModal = (row) => {
    setSelected(row)
    setCardUid(row.rfid_uid || '')
    setFpId(row.fingerprint_id || '')
    setInstruction('Connect device, then scan card or enroll fingerprint.')
    setSerialStatus('idle')
    setModalClassScope(selectedClass || '')
    setModalStudentQuery('')
    setModalSearchHits([])
    setModalClassRoster([])
    setModalClassRosterFetched(false)
    setIdentityConflict(null)
    setBanner(null)
    setModalOpen(true)
  }

  const loadModalClassRoster = useCallback(async () => {
    if (!modalClassScope || !schoolId) return
    setModalRosterLoading(true)
    setIdentityConflict(null)
    try {
      const res = await studentService.getStudents({
        class_name: modalClassScope,
        limit: 3000,
        page: 1,
      })
      if (res.success) {
        setModalClassRoster(Array.isArray(res.data) ? res.data : [])
        setModalClassRosterFetched(true)
      } else {
        setModalClassRoster([])
        setModalClassRosterFetched(true)
      }
    } catch {
      setModalClassRoster([])
      setModalClassRosterFetched(true)
    } finally {
      setModalRosterLoading(false)
    }
  }, [modalClassScope, schoolId])

  const switchToStudent = useCallback((row) => {
    if (!row?.id) return
    setSelected(row)
    setCardUid(row.rfid_uid || '')
    setFpId(row.fingerprint_id || '')
    setBanner(null)
    setIdentityConflict(null)
    const connected = !!portRef.current
    setInstruction(
      connected
        ? 'Ready for this learner — scan a card or enroll a fingerprint.'
        : 'Connect the device, then scan or enroll for this learner.'
    )
  }, [])

  /** School-wide search only when "All classes" is selected. */
  useEffect(() => {
    if (!modalOpen || !schoolId) return
    if (modalClassScope) {
      setModalSearchHits([])
      setModalSearchLoading(false)
      return
    }
    const q = modalStudentQuery.trim()
    if (q.length < 1) {
      setModalSearchHits([])
      setModalSearchLoading(false)
      return
    }
    const t = setTimeout(async () => {
      setModalSearchLoading(true)
      try {
        const res = await studentService.getStudents({
          q,
          limit: 40,
          page: 1,
        })
        if (res.success) {
          setModalSearchHits(Array.isArray(res.data) ? res.data : [])
        } else {
          setModalSearchHits([])
        }
      } catch {
        setModalSearchHits([])
      } finally {
        setModalSearchLoading(false)
      }
    }, 320)
    return () => clearTimeout(t)
  }, [modalStudentQuery, modalClassScope, modalOpen, schoolId])

  const modalDisplayRows = useMemo(() => {
    if (modalClassScope) {
      return filterStudentsByQuery(modalClassRoster, modalStudentQuery)
    }
    return modalSearchHits
  }, [modalClassScope, modalClassRoster, modalStudentQuery, modalSearchHits])

  const modalListLoading = modalClassScope ? modalRosterLoading : modalSearchLoading

  const closeModal = () => {
    setModalOpen(false)
    setModalStudentQuery('')
    setModalSearchHits([])
    setModalClassRoster([])
    setModalClassRosterFetched(false)
    setIdentityConflict(null)
    disconnectSerial()
  }

  const enrollFp = () => {
    setInstruction('Starting enrollment…')
    sendCmd('ENROLL')
  }

  const deleteFpHardware = () => {
    const id =
      window.prompt('Fingerprint ID to delete on device:', fpId || selected?.fingerprint_id || '') || ''
    if (!id.trim()) return
    setInstruction('Deleting on device…')
    sendCmd(`DELETE:${id.trim()}`)
  }

  const clearFpRecord = async () => {
    if (!selected?.id) return
    if (!window.confirm('Clear saved fingerprint ID for this student in Babyeyi?')) return
    const ok = await patchStudent(selected.id, { fingerprint_id: null })
    if (ok) {
      setFpId('')
      setBanner({ type: 'ok', text: 'Fingerprint ID removed from student record.' })
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  if (!proOk) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center space-y-6">
        <div className="inline-flex p-4 rounded-2xl bg-re-bg border border-black/5 shadow-inner">
          <Shield className="w-12 h-12 text-[#1E3A5F]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-re-text uppercase tracking-tight">Smart access hardware</h1>
          <p className="text-sm text-re-text-muted mt-2 leading-relaxed">
            This workspace is available only for Babyeyi Pro schools (or accounts with the school console permission).
          </p>
        </div>
        <Link
          to={h('/')}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-black uppercase tracking-widest shadow-lg"
          style={{ background: 'linear-gradient(135deg,#1E3A5F,#0D2644)' }}
        >
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-500 pb-16">
      {/* Hero */}
      <div className="relative w-full overflow-hidden rounded-b-[2rem] border-b border-black/5">
        <div className="absolute inset-0 bg-[#0a192f]/88 z-10" />
        <div
          className="absolute inset-0 opacity-40 z-[1]"
          style={{
            background:
              accent === 'dos'
                ? 'radial-gradient(circle at 20% 20%, rgba(255,140,0,0.35), transparent 50%)'
                : 'radial-gradient(circle at 20% 20%, rgba(254,191,16,0.25), transparent 50%)',
          }}
        />
        <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-10 pt-10 pb-14 flex flex-col md:flex-row md:items-end gap-8">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg backdrop-blur-md">
              <img src="/favicon.svg" alt="" className="w-8 h-8 opacity-95" />
            </div>
            <div className="min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-[0.35em] ${goldText} mb-1`}>Babyeyi Pro · Hardware</p>
              <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
                Smart School <span className={goldText}>Access</span>
              </h1>
              <p className="text-xs md:text-sm text-white/55 font-bold mt-2 max-w-xl leading-relaxed">
                Connect the USB device once, then assign cards or fingerprints — use <span className="text-white/90">Switch learner</span> in the modal to move to another student without reconnecting.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-black text-white/90 uppercase tracking-wider">
              <Usb size={12} /> Web Serial
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-black text-white/90 uppercase tracking-wider">
              <Radio size={12} /> 115200 baud
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-10 -mt-8 relative z-30 space-y-6">
        {banner && (
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

        {/* Step 1 — class + search */}
        <div className="bg-white rounded-[1.75rem] border border-black/5 shadow-xl shadow-black/5 p-6 md:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end gap-6">
            <div className="flex-1 space-y-2 min-w-0">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-re-text-muted">Step 1 — Class</label>
              <div className="relative">
                <button
                  type="button"
                  disabled={classesLoading || classes.length === 0}
                  onClick={() => classes.length && setClassOpen((o) => !o)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border border-black/10 bg-re-bg/80 text-left font-black text-sm text-re-text hover:border-[#1E3A5F]/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <GraduationCap size={18} className="text-[#1E3A5F] shrink-0" />
                    <span className="truncate">
                      {classesLoading ? 'Loading classes…' : classes.length === 0 ? 'No classes in database' : selectedClass || 'Select class'}
                    </span>
                  </span>
                  <ChevronDown size={18} className="opacity-40 shrink-0" />
                </button>
                {classesLoading && (
                  <p className="text-[11px] text-re-text-muted font-bold mt-2">Reading class list from your school…</p>
                )}
                {!classesLoading && classes.length === 0 && (
                  <p className="text-[11px] text-re-text-muted font-bold mt-2 leading-relaxed">
                    No classes found. Configure class groups under{' '}
                    {portalBase === '/manager' ? (
                      <Link to={h('/registry')} className="text-[#1E3A5F] underline underline-offset-2">
                        School profile
                      </Link>
                    ) : (
                      <span className="text-re-text">School profile (Manager portal)</span>
                    )}
                    , or add students from{' '}
                    {portalBase === '/manager' ? (
                      <Link to={h('/school-console?tab=students')} className="text-[#1E3A5F] underline underline-offset-2">
                        Full school console → Students
                      </Link>
                    ) : (
                      <span className="text-re-text">Full school console → Students (Manager)</span>
                    )}{' '}
                    so each learner has a <span className="font-mono text-xs">class</span> value.
                  </p>
                )}
                {classOpen && classes.length > 0 && (
                  <>
                    <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close" onClick={() => setClassOpen(false)} />
                    <div className="absolute z-50 mt-2 w-full max-h-56 overflow-y-auto rounded-2xl border border-black/10 bg-white shadow-2xl py-1">
                      {classes.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setSelectedClass(c)
                            setClassOpen(false)
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-re-bg transition-colors ${
                            selectedClass === c ? 'text-[#1E3A5F] bg-re-navy/5' : 'text-re-text'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-re-text-muted">Search by name or student code</label>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-re-text-muted/50" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type to filter…"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-black/10 bg-white font-bold text-sm outline-none focus:ring-2 ring-[#1E3A5F]/20"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-black/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-re-bg/90 border-b border-black/5">
                    <th className="px-4 py-3 font-black text-[10px] uppercase tracking-wider text-re-text-muted">Student</th>
                    <th className="px-4 py-3 font-black text-[10px] uppercase tracking-wider text-re-text-muted">Code</th>
                    <th className="px-4 py-3 font-black text-[10px] uppercase tracking-wider text-re-text-muted hidden sm:table-cell">RFID UID</th>
                    <th className="px-4 py-3 font-black text-[10px] uppercase tracking-wider text-re-text-muted hidden md:table-cell">Fingerprint</th>
                    <th className="px-4 py-3 font-black text-[10px] uppercase tracking-wider text-re-text-muted text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {classesLoading || (classes.length > 0 && listLoading) ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-re-text-muted font-bold">
                        <Loader2 className="inline w-6 h-6 animate-spin mr-2 align-middle" />
                        {classesLoading ? 'Loading classes…' : 'Loading students…'}
                      </td>
                    </tr>
                  ) : classes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-re-text-muted font-bold">
                        Add classes in the registry or enroll students with a class name to continue.
                      </td>
                    </tr>
                  ) : filteredLocal.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-re-text-muted font-bold">
                        No students for this class or search.
                      </td>
                    </tr>
                  ) : (
                    filteredLocal.map((s) => (
                      <tr key={s.id} className="border-b border-black/[0.04] hover:bg-re-bg/40 transition-colors">
                        <td className="px-4 py-3 font-black text-re-text">{studentDisplayName(s)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-re-text-muted">{s.student_uid || s.student_code || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs hidden sm:table-cell">{s.rfid_uid || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs hidden md:table-cell">{s.fingerprint_id || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openModal(s)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest ${navyBtn}`}
                          >
                            <IdCard size={14} />
                            Assign card
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {modalOpen &&
        selected &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            <button type="button" className="absolute inset-0 bg-[#0A192F]/70 backdrop-blur-md" onClick={closeModal} aria-label="Close" />
            <div className="relative w-full max-w-lg bg-white rounded-[1.75rem] shadow-2xl border border-black/5 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[min(92vh,880px)] flex flex-col">
              <div
                className="px-6 py-4 flex items-start justify-between gap-3 text-white shrink-0"
                style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80">Assign to</p>
                  <p className="text-lg font-black truncate">{studentDisplayName(selected)}</p>
                  <p className="text-[11px] font-mono opacity-80 mt-0.5">
                    {selected.student_uid || selected.student_code || '—'} · {classLabel(selected)}
                    {selected.sdm_code ? ` · SDMS ${selected.sdm_code}` : ''}
                  </p>
                </div>
                <button type="button" onClick={closeModal} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto min-h-0">
                <div className="rounded-2xl border border-[#1E3A5F]/15 bg-re-bg/70 p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-re-text-muted flex items-center gap-2">
                    <ArrowRightLeft size={14} className="text-[#1E3A5F]" />
                    Switch learner — USB stays connected
                  </p>
                  <div className="flex flex-col gap-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-wider text-re-text-muted">Class</label>
                        <select
                          value={modalClassScope}
                          onChange={(e) => {
                            setModalClassScope(e.target.value)
                            setModalStudentQuery('')
                            setModalClassRoster([])
                            setModalClassRosterFetched(false)
                          }}
                          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs font-bold text-re-text outline-none focus:ring-2 ring-[#1E3A5F]/20"
                        >
                          <option value="">All classes</option>
                          {classes.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        disabled={!modalClassScope || modalRosterLoading}
                        onClick={loadModalClassRoster}
                        className={`mt-0 sm:mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-md disabled:opacity-45 disabled:cursor-not-allowed ${navyBtn}`}
                      >
                        {modalRosterLoading ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                        Load class
                      </button>
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-re-text-muted">
                        {modalClassScope && modalClassRosterFetched ? 'Filter class list (optional)' : 'Search (whole school)'}
                      </label>
                      <div className="relative mt-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-re-text-muted/45 pointer-events-none" />
                        <input
                          value={modalStudentQuery}
                          onChange={(e) => setModalStudentQuery(e.target.value)}
                          disabled={modalClassScope !== '' && !modalClassRosterFetched}
                          placeholder={
                            !modalClassScope
                              ? 'Name, ID, or SDMS — whole school…'
                              : !modalClassRosterFetched
                                ? 'Load the class first…'
                                : 'Narrow by name, ID, or SDMS…'
                          }
                          className="w-full rounded-xl border border-black/10 bg-white pl-9 pr-3 py-2.5 text-xs font-bold text-re-text outline-none focus:ring-2 ring-[#1E3A5F]/20 disabled:bg-re-bg/80 disabled:text-re-text-muted/50"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-re-text-muted font-semibold leading-snug -mt-1">
                    {!modalClassScope ? (
                      <>
                        Type in the search box to find any learner in the school, or pick a class and press{' '}
                        <span className="font-bold text-re-text/90">Load class</span>.
                      </>
                    ) : (
                      <>
                        Select <span className="font-mono font-bold text-re-text/90">{modalClassScope}</span>, then{' '}
                        <span className="font-bold text-re-text/90">Load class</span> to fetch everyone. Use <span className="font-bold">Switch</span> without unplugging USB.
                      </>
                    )}
                  </p>
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-black/5 bg-white divide-y divide-black/[0.06]">
                    {modalClassScope && !modalClassRosterFetched && !modalRosterLoading ? (
                      <div className="p-4 flex gap-3 items-start">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center text-[#1E3A5F]">
                          <Users size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-black text-re-text">Load this class first</p>
                          <p className="text-[11px] text-re-text-muted mt-1 leading-relaxed">
                            Choose a class above, then tap <span className="font-bold text-re-text/80">Load class</span> to list students. You can then switch between them while the device stays connected.
                          </p>
                        </div>
                      </div>
                    ) : modalListLoading ? (
                      <div className="p-3 flex items-center gap-2 text-xs text-re-text-muted font-bold">
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        {modalClassScope ? 'Loading students…' : 'Searching…'}
                      </div>
                    ) : modalClassScope && modalClassRosterFetched ? (
                      modalDisplayRows.length === 0 ? (
                        <p className="p-3 text-[11px] text-re-text-muted font-semibold leading-relaxed">
                          {modalClassRoster.length === 0
                            ? 'No students in this class.'
                            : 'No one matches your filter — clear the search box to see the full class.'}
                        </p>
                      ) : (
                        modalDisplayRows.map((s) => {
                          const isSel = s.id === selected?.id
                          return (
                            <div key={s.id} className="flex items-center gap-2 px-3 py-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-re-text text-[12px] truncate">{studentDisplayName(s)}</p>
                                <p className="font-mono text-[10px] text-re-text-muted truncate">
                                  {s.student_uid || s.student_code || '—'} · {s.class_name || '—'}
                                  {s.sdm_code ? ` · SDMS ${s.sdm_code}` : ''}
                                </p>
                              </div>
                              {isSel ? (
                                <span className="shrink-0 text-[9px] font-black uppercase tracking-wide text-emerald-600">Current</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => switchToStudent(s)}
                                  className="shrink-0 px-3 py-1.5 rounded-lg text-white text-[9px] font-black uppercase tracking-wide shadow-sm"
                                  style={{ background: 'linear-gradient(135deg,#1E3A5F,#0D2644)' }}
                                >
                                  Switch
                                </button>
                              )}
                            </div>
                          )
                        })
                      )
                    ) : modalStudentQuery.trim().length < 1 ? (
                      <p className="p-3 text-[11px] text-re-text-muted font-semibold leading-relaxed">
                        <span className="font-bold text-re-text/80">Whole school:</span> type a name, student code, or SDMS.{' '}
                        <span className="font-bold text-re-text/80">One class:</span> select it and use <span className="font-bold">Load class</span>.
                      </p>
                    ) : modalDisplayRows.length === 0 ? (
                      <p className="p-3 text-[11px] text-re-text-muted font-semibold">No students match.</p>
                    ) : (
                      modalDisplayRows.map((s) => {
                        const isSel = s.id === selected?.id
                        return (
                          <div key={s.id} className="flex items-center gap-2 px-3 py-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-re-text text-[12px] truncate">{studentDisplayName(s)}</p>
                              <p className="font-mono text-[10px] text-re-text-muted truncate">
                                {s.student_uid || s.student_code || '—'} · {s.class_name || '—'}
                                {s.sdm_code ? ` · SDMS ${s.sdm_code}` : ''}
                              </p>
                            </div>
                            {isSel ? (
                              <span className="shrink-0 text-[9px] font-black uppercase tracking-wide text-emerald-600">Current</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => switchToStudent(s)}
                                className="shrink-0 px-3 py-1.5 rounded-lg text-white text-[9px] font-black uppercase tracking-wide shadow-sm"
                                style={{ background: 'linear-gradient(135deg,#1E3A5F,#0D2644)' }}
                              >
                                Switch
                              </button>
                            )}
                          </div>
                        )
                      })
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
                      className="px-4 py-3 rounded-xl border border-black/10 text-[11px] font-black uppercase tracking-widest text-re-text-muted hover:bg-re-bg"
                    >
                      Disconnect
                    </button>
                  )}
                </div>

                <p className="text-xs font-bold text-re-text">
                  Status:{' '}
                  <span className={serialStatus === 'connected' ? 'text-emerald-600' : serialStatus === 'error' ? 'text-red-600' : 'text-re-text-muted'}>
                    {serialStatus === 'connected' ? 'Connected' : serialStatus === 'error' ? 'Error' : 'Not connected'}
                  </span>
                </p>
                <p className="text-sm text-re-text-muted leading-relaxed min-h-[2.5rem]">{instruction}</p>

                {identityConflict && (
                  <div
                    className="flex rounded-2xl overflow-hidden border border-red-200/90 bg-gradient-to-br from-red-50 via-white to-rose-50/80 shadow-[0_8px_30px_-12px_rgba(185,28,28,0.35)] ring-1 ring-red-100/80"
                    role="alert"
                  >
                    <div
                      className="w-1.5 shrink-0 bg-gradient-to-b from-red-500 via-rose-500 to-red-600"
                      aria-hidden
                    />
                    <div className="flex gap-3 p-4 flex-1 min-w-0 items-start">
                      <div className="shrink-0 w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shadow-inner border border-red-200/60">
                        {identityConflict.kind === 'fingerprint' ? (
                          <Fingerprint size={22} strokeWidth={2.25} />
                        ) : (
                          <CreditCard size={22} strokeWidth={2.25} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.12em] bg-red-600 text-white shadow-sm">
                            {identityConflict.kind === 'fingerprint' ? 'Fingerprint taken' : 'Card already taken'}
                          </span>
                          <span className="text-[9px] font-bold text-red-700/80 uppercase tracking-wider">Conflict</span>
                        </div>
                        <p className="text-[13px] font-semibold text-red-950/95 leading-snug mt-2">{identityConflict.message}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIdentityConflict(null)}
                        className="shrink-0 p-1.5 rounded-xl text-red-400 hover:text-red-700 hover:bg-red-100/80 transition-colors"
                        aria-label="Dismiss"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-re-text-muted flex items-center gap-1">
                    <Radio size={12} /> Card UID
                  </label>
                  <input
                    readOnly
                    value={cardUid}
                    className="w-full px-4 py-3 rounded-xl border border-black/10 bg-re-bg font-mono text-sm font-bold"
                    placeholder="Waiting for scan…"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-re-text-muted flex items-center gap-1">
                    <Fingerprint size={12} /> Fingerprint ID
                  </label>
                  <input
                    readOnly
                    value={fpId}
                    className="w-full px-4 py-3 rounded-xl border border-black/10 bg-re-bg font-mono text-sm font-bold"
                    placeholder="—"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={enrollFp}
                    disabled={serialStatus !== 'connected' || apiBusy}
                    className="inline-flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#1E3A5F]/20 text-[#1E3A5F] text-[11px] font-black uppercase tracking-widest hover:bg-re-navy/5 disabled:opacity-40"
                  >
                    <Fingerprint size={16} />
                    Enroll fingerprint
                  </button>
                  <button
                    type="button"
                    onClick={deleteFpHardware}
                    disabled={serialStatus !== 'connected' || apiBusy}
                    className="inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 text-red-700 text-[11px] font-black uppercase tracking-widest hover:bg-red-50 disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                    Delete on device
                  </button>
                </div>

                <button
                  type="button"
                  onClick={clearFpRecord}
                  disabled={apiBusy || !selected.fingerprint_id}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-re-text-muted border border-dashed border-black/15 hover:bg-re-bg disabled:opacity-40"
                >
                  <Cpu size={14} />
                  Clear fingerprint from student record
                </button>

                <p className="text-[10px] text-re-text-muted leading-relaxed">
                  Use <span className="font-bold text-re-text/80">Switch learner</span> to move to another student while the device stays connected. Scanning or enrollment saves to the <span className="font-bold text-re-text/80">current</span> learner. Chrome or Edge, USB serial (CP210x / CH340).
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
