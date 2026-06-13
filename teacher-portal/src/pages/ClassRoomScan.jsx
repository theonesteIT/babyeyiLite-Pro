import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, Loader2, MapPin, QrCode, ScanLine, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import api from '../services/api';
import TeacherOrangeHero from '../components/TeacherOrangeHero';

const NAVY = '#000435';
const AMBER = '#f59e0b';
const SCANNER_ID = 'teacher-class-qr-reader';

function parseQrPayload(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/BABYEYICLS:([a-f0-9]+)/i);
  return m ? m[1] : s;
}

function killVideoElement(video) {
  if (!video) return;
  const stream = video.srcObject;
  if (stream instanceof MediaStream) {
    stream.getTracks().forEach((track) => {
      track.enabled = false;
      try { track.stop(); } catch { /* ignore */ }
    });
  }
  video.srcObject = null;
  try { video.load(); } catch { /* ignore */ }
}

function killAllCameraTracks(containerEl, streamRef) {
  if (streamRef?.current instanceof MediaStream) {
    streamRef.current.getTracks().forEach((track) => {
      track.enabled = false;
      try { track.stop(); } catch { /* ignore */ }
    });
    streamRef.current = null;
  }
  if (containerEl) {
    containerEl.querySelectorAll('video').forEach(killVideoElement);
  }
  document.querySelectorAll(`#${SCANNER_ID} video`).forEach(killVideoElement);
}

function captureActiveStream(containerEl, streamRef) {
  const videos = containerEl
    ? containerEl.querySelectorAll('video')
    : document.querySelectorAll(`#${SCANNER_ID} video`);
  for (const video of videos) {
    if (video.srcObject instanceof MediaStream) {
      streamRef.current = video.srcObject;
      return;
    }
  }
}

function releaseContainerMedia(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('video').forEach(killVideoElement);
  container.innerHTML = '';
}

export default function ClassRoomScan() {
  const scannerRef = useRef(null);
  const streamRef = useRef(null);
  const viewportRef = useRef(null);
  const processingRef = useRef(false);
  const mountedRef = useRef(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [manual, setManual] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null);
  const [history, setHistory] = useState([]);

  const showViewport = cameraOn || cameraStarting;

  const loadActive = useCallback(() => {
    api.get('/teacher-portal/class-period/active')
      .then((r) => { if (r.data?.success) setActive(r.data.data); })
      .catch(() => {});
    api.get('/teacher-portal/class-period/history')
      .then((r) => { if (r.data?.success) setHistory(r.data.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadActive();
    return () => { mountedRef.current = false; };
  }, [loadActive]);

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    // Stop hardware tracks first — browser tab indicator turns off here
    killAllCameraTracks(viewportRef.current, streamRef);

    if (scanner) {
      const state = scanner.getState();
      const running = state === Html5QrcodeScannerState.SCANNING
        || state === Html5QrcodeScannerState.PAUSED;
      if (running) {
        try { await scanner.stop(); } catch { /* ignore */ }
      }
      try { await scanner.clear(); } catch { /* ignore */ }
    }

    killAllCameraTracks(viewportRef.current, streamRef);
    releaseContainerMedia(SCANNER_ID);

    if (mountedRef.current) {
      setCameraOn(false);
      setCameraStarting(false);
    }
  }, []);

  const submitScan = useCallback(async (tokenOrRaw) => {
    if (processingRef.current) return;
    const qr_token = parseQrPayload(tokenOrRaw);
    if (!qr_token) {
      setError('Invalid QR code');
      return;
    }
    processingRef.current = true;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/teacher-portal/class-room/scan', { qr_token });
      setResult(res.data);
      loadActive();
    } catch (e) {
      setError(e.response?.data?.message || 'Scan failed');
      if (e.response?.data) setResult(e.response.data);
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  }, [loadActive]);

  const submitScanRef = useRef(submitScan);
  submitScanRef.current = submitScan;

  const waitForScannerNode = useCallback(() => new Promise((resolve) => {
    const tick = () => {
      if (document.getElementById(SCANNER_ID)) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), []);

  const startCamera = useCallback(async () => {
    if (cameraStarting) return;
    setError('');
    setCameraStarting(true);
    setCameraOn(true);

    try {
      const existing = scannerRef.current;
      if (existing) {
        scannerRef.current = null;
        killAllCameraTracks(viewportRef.current, streamRef);
        const state = existing.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          try { await existing.stop(); } catch { /* ignore */ }
        }
        try { await existing.clear(); } catch { /* ignore */ }
        releaseContainerMedia(SCANNER_ID);
      }

      if (!mountedRef.current) return;
      await waitForScannerNode();
      await new Promise((r) => setTimeout(r, 80));

      const scanner = new Html5Qrcode(SCANNER_ID, false);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
        (decoded) => {
          if (processingRef.current) return;
          submitScanRef.current(decoded);
        },
        () => {}
      );

      await new Promise((r) => setTimeout(r, 250));
      captureActiveStream(viewportRef.current, streamRef);

      if (mountedRef.current) {
        setCameraOn(true);
        setCameraStarting(false);
      }
    } catch {
      killAllCameraTracks(viewportRef.current, streamRef);
      releaseContainerMedia(SCANNER_ID);
      scannerRef.current = null;
      if (mountedRef.current) {
        setCameraOn(false);
        setCameraStarting(false);
        setError('Camera access denied or unavailable. Paste the code manually below.');
      }
    }
  }, [cameraStarting, waitForScannerNode]);

  const handleStop = useCallback(async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    await stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    startCamera();
    return () => { stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lesson = active?.current_lesson;
  const log = active?.period_log;

  return (
    <div className="min-h-screen bg-[#fafafa] pb-16">
      <style>{`
        #${SCANNER_ID} video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
        #${SCANNER_ID} { width: 100%; height: 100%; }
      `}</style>
      <TeacherOrangeHero title="Class period check-in" subtitle="Camera starts automatically — scan your classroom QR" />

      <div className="max-w-2xl mx-auto px-4 -mt-8 relative z-10 space-y-4">
        {lesson && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: AMBER }}>Active lesson from timetable</p>
            <p className="text-lg font-black" style={{ color: NAVY }}>{lesson.subject_name} · {lesson.class_name}</p>
            <div className="flex flex-wrap gap-4 mt-2 text-xs font-bold" style={{ color: `${NAVY}88` }}>
              <span className="flex items-center gap-1"><Clock size={12} style={{ color: AMBER }} />{lesson.start_time} – {lesson.end_time}</span>
              {lesson.room && <span className="flex items-center gap-1"><MapPin size={12} style={{ color: AMBER }} />{lesson.room}</span>}
            </div>
            {log?.checked_in && !log?.checked_out && (
              <p className="mt-3 text-xs font-black uppercase px-3 py-1.5 rounded-lg inline-block bg-[#000435] text-white">
                Checked in at {log.entry_time} — scan again to check out
              </p>
            )}
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl border border-[#000435]/10 overflow-hidden">
          <div className="p-5 border-b border-[#000435]/8">
            <p className="text-xs font-black uppercase tracking-widest text-[#000435]/40 flex items-center gap-2">
              <ScanLine size={14} style={{ color: AMBER }} /> Classroom QR scan
            </p>
          </div>

          <div className="p-5 space-y-4">
            <div
              ref={viewportRef}
              className="relative rounded-2xl overflow-hidden aspect-[4/3]"
              style={{ background: NAVY, border: `2px solid ${cameraOn ? AMBER : '#00043520'}` }}
            >
              {showViewport && (
                <div key={cameraOn ? 'cam-on' : 'cam-start'} id={SCANNER_ID} className="absolute inset-0" />
              )}

              {cameraOn && (
                <div className="absolute inset-8 border-2 rounded-xl pointer-events-none z-10" style={{ borderColor: AMBER }} />
              )}

              {(cameraStarting || loading) && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#000435]/70">
                  <Loader2 className="animate-spin text-white" size={28} />
                  <p className="text-xs font-bold text-white/80">{loading ? 'Processing scan…' : 'Starting camera…'}</p>
                </div>
              )}

              {cameraOn && !cameraStarting && !loading && (
                <button
                  type="button"
                  onClick={handleStop}
                  className="absolute top-3 right-3 z-30 px-3 py-1.5 rounded-lg bg-black/80 text-white text-xs font-bold hover:bg-black"
                >
                  Stop
                </button>
              )}

              {!showViewport && !cameraStarting && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3">
                  <p className="text-xs font-bold text-white/70 px-6 text-center">Camera is off</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl text-xs font-black uppercase text-white"
                    style={{ background: AMBER }}
                  >
                    Turn on camera
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#000435]/40 mb-2 block">Or paste manual code</label>
              <div className="flex gap-2">
                <input
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="BABYEYICLS:..."
                  className="flex-1 h-11 px-4 rounded-xl border border-[#000435]/15 text-sm font-mono focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
                <button type="button" disabled={loading || !manual.trim()} onClick={() => submitScan(manual)}
                  className="h-11 px-4 rounded-xl text-white font-black text-xs uppercase disabled:opacity-50"
                  style={{ background: AMBER }}>
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <QrCode size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm" style={{ color: NAVY }}>
                <XCircle size={16} className="shrink-0 mt-0.5" style={{ color: AMBER }} /> {error}
              </div>
            )}

            {result?.success && (
              <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <CheckCircle2 size={20} className="shrink-0" style={{ color: AMBER }} />
                <div>
                  <p className="font-black" style={{ color: NAVY }}>{result.action === 'exit' ? 'Checked out' : 'Checked in'} successfully</p>
                  <p className="text-sm mt-1" style={{ color: `${NAVY}99` }}>{result.message}</p>
                  {result.data?.class_name && (
                    <p className="text-xs mt-2 font-bold" style={{ color: AMBER }}>
                      {result.data.class_name} · {result.data.subject_name}
                    </p>
                  )}
                  {!cameraOn && (
                    <button type="button" onClick={startCamera} className="mt-3 text-[10px] font-black uppercase" style={{ color: AMBER }}>
                      Scan again
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {history.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#000435]/10 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: NAVY }}>Today&apos;s period attendance</h3>
              <Link to="/teacher-attendance" className="text-[10px] font-black uppercase" style={{ color: AMBER }}>Full report</Link>
            </div>
            <div className="space-y-2">
              {history.map((row) => (
                <div key={row.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#000435]/8">
                  <p className="text-[10px] font-black tabular-nums min-w-[48px]" style={{ color: AMBER }}>{String(row.start_time).slice(0, 5)}</p>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{row.subject_name} · {row.class_name}</p>
                    <p className="text-[10px] opacity-50" style={{ color: NAVY }}>
                      {row.entry_hm ? `In ${row.entry_hm}` : '—'}{row.exit_hm ? ` · Out ${row.exit_hm}` : ''}
                    </p>
                  </div>
                  <span className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-[#000435] text-white">
                    {row.exit_hm ? 'Done' : row.entry_hm ? 'Live' : row.status || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
