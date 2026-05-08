import { useState, useRef, useCallback, useEffect } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  Hash,
  Info,
  Keyboard,
  LogIn,
  LogOut,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Square,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { playBeep } from "./gateData";
import { fetchGateScanLogs, verifyGateScan } from "./gateApi";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const NAVY = "#000435";
const AMBER = "#F59E0B";
const AMBER2 = "#D97706"; // darker amber for overdue/warning

// allowed  → amber  (positive, student may exit)
// return   → navy   (confirmed return)
// overdue  → amber dark
// denied   → navy   (access denied / hard block)
const STATUS_CFG = {
  allowed: { color: AMBER, bg: "#FFFBEB", ring: "#FDE68A", label: "ALLOWED", Icon: CheckCircle2 },
  return: { color: NAVY, bg: "#EEF0F8", ring: "#C7CBE0", label: "RETURNED", Icon: ArrowDownLeft },
  overdue: { color: AMBER2, bg: "#FEF3C7", ring: "#FCD34D", label: "OVERDUE", Icon: AlertTriangle },
  denied: { color: NAVY, bg: "#EEF0F8", ring: "#C7CBE0", label: "DENIED", Icon: XCircle },
  idle: { color: "#94A3B8", bg: "#F8FAFC", ring: "transparent", label: "READY", Icon: ScanLine },
};

// ── CameraViewport ────────────────────────────────────────────────────────────
function CameraViewport({ active, scanning }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-[#000435]"
      style={{ aspectRatio: "1", border: `2px solid ${active ? AMBER : "#E2E8F0"}`, transition: "border-color .3s" }}
    >
      {active ? (
        <>
          <div id="gatekeeper-qr-reader" className="absolute inset-0" />
          <div className="absolute inset-0 pointer-events-none">
            {[
              { t: "10px", l: "10px", bt: true, bl: true },
              { t: "10px", r: "10px", bt: true, br: true },
              { b: "10px", l: "10px", bb: true, bl: true },
              { b: "10px", r: "10px", bb: true, br: true },
            ].map((pos, i) => (
              <div key={i} style={{
                position: "absolute",
                top: pos.t, bottom: pos.b, left: pos.l, right: pos.r,
                width: 26, height: 26,
                borderTop: pos.bt ? "3px solid " + AMBER : "none",
                borderBottom: pos.bb ? "3px solid " + AMBER : "none",
                borderLeft: pos.bl ? "3px solid " + AMBER : "none",
                borderRight: pos.br ? "3px solid " + AMBER : "none",
                borderRadius: i === 0 ? "6px 0 0 0" : i === 1 ? "0 6px 0 0" : i === 2 ? "0 0 0 6px" : "0 0 6px 0",
              }} />
            ))}
            <div style={{ width: "54%", aspectRatio: "1", border: `1px solid ${AMBER}40`, borderRadius: 10, position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
              {scanning && (
                <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${AMBER},transparent)`, animation: "scanLine 1.5s ease-in-out infinite", top: "8%" }} />
              )}
            </div>
          </div>
          <div className="absolute bottom-2 inset-x-0 text-center text-xs font-semibold"
            style={{ color: scanning ? AMBER : "rgba(255,255,255,.4)", animation: scanning ? "blink 1.2s infinite" : "none" }}>
            {scanning ? "Processing…" : "Ready to scan"}
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <CameraOff size={38} style={{ color: "rgba(255,255,255,.25)" }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,.25)" }}>Camera Off</span>
        </div>
      )}
    </div>
  );
}

// ── ResultPanel ───────────────────────────────────────────────────────────────
function ResultPanel({ scanResult, gateStatus, onClear, scanning }) {
  const cfg = STATUS_CFG[gateStatus] || STATUS_CFG.idle;

  if (scanning) return (
    <div className="flex flex-col items-center justify-center gap-5 py-12">
      <div className="w-20 h-20 rounded-full border-4 border-amber-100 border-t-amber-400 animate-spin" />
      <div className="text-center">
        <p className="font-black text-lg text-[#000435]">Verifying…</p>
        <p className="text-sm text-slate-400 mt-1">Checking permission database</p>
      </div>
    </div>
  );

  if (!scanResult) return (
    <div className="flex flex-col items-center justify-center gap-5 py-10 px-6">
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
        style={{ background: "#EEF0F8", border: "2px dashed #C7CBE0" }}>
        <ScanLine size={40} style={{ color: "#C7CBE0" }} />
      </div>
      <div className="text-center">
        <p className="font-black text-xl text-[#000435]">Gate Ready</p>
        <p className="text-sm text-slate-400 mt-1">Scan a student QR card to begin</p>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
        style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: AMBER }} />
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: AMBER2 }}>System Online</span>
      </div>
    </div>
  );

  const { Icon } = cfg;
  const perm = scanResult.student?.permission;
  const msgs = {
    allowed: scanResult?.message || "Gate open — student may exit now",
    return: scanResult?.message || "Welcome back — return recorded",
    overdue: scanResult?.message || "Student exceeded return time",
    denied: scanResult?.message || "Access denied",
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Status banner */}
      <div className="rounded-2xl p-5 flex flex-col items-center gap-3 text-center"
        style={{ background: cfg.bg, border: `2px solid ${cfg.ring}` }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: `${cfg.color}15`, border: `2.5px solid ${cfg.color}` }}>
          <Icon size={30} style={{ color: cfg.color }} />
        </div>
        <div>
          <p className="font-black text-3xl tracking-tight" style={{ color: cfg.color }}>{cfg.label}</p>
          <p className="text-sm text-slate-500 mt-1 font-medium">{msgs[gateStatus]}</p>
        </div>
      </div>

      {/* Student card */}
      {scanResult?.found && scanResult?.student && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 p-4 border-b border-slate-50">
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-base shrink-0"
              style={{ background: `linear-gradient(135deg,${NAVY},#001280)`, border: `2.5px solid ${AMBER}`, color: AMBER }}>
              {scanResult.student.initials}
            </div>
            <div>
              <p className="font-black text-base" style={{ color: NAVY }}>{scanResult.student.name}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Class: {scanResult.student.class}</p>
            </div>
            <div className="ml-auto">
              <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg"
                style={{ background: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
            </div>
          </div>

          {perm && (
            <div className="grid grid-cols-2 gap-px" style={{ background: "#F1F5F9" }}>
              {[
                ["Perm ID", perm.id],
                ["Type", perm.type],
                ["Time Out", perm.actualOut || perm.timeOut],
                ["Return By", perm.returnTime],
                ["Gate State", perm.gateState || "—"],
                ["Exceeded", perm.exceededMinutes ? `${perm.exceededMinutes} min` : "0 min"],
              ].map(([label, val]) => (
                <div key={label} className="bg-white px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                  <p className="text-sm font-bold" style={{ color: NAVY }}>{val || "—"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {gateStatus === "allowed" && (
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm"
            style={{ background: AMBER, color: NAVY }}>
            <CheckCircle2 size={15} /> Confirm Exit
          </button>
        )}
        {gateStatus === "return" && (
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white"
            style={{ background: NAVY }}>
            <ArrowDownLeft size={15} /> Confirm Return
          </button>
        )}
        {gateStatus === "denied" && (
          <button disabled className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white opacity-70 cursor-default"
            style={{ background: NAVY }}>
            <XCircle size={15} /> Access Denied
          </button>
        )}
        {gateStatus === "overdue" && (
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm"
            style={{ background: "#FEF3C7", color: AMBER2, border: `1.5px solid ${AMBER}60` }}>
            <AlertTriangle size={15} /> Mark Override
          </button>
        )}
        <button onClick={onClear}
          className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
          <RotateCcw size={14} /> Reset
        </button>
      </div>
    </div>
  );
}

// ── TodayLogs ─────────────────────────────────────────────────────────────────
function TodayLogs({ logs }) {
  const todayStr = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter(l => l.date === todayStr);
  const exits = todayLogs.filter(l => l.action === "EXIT").length;
  const returns = todayLogs.filter(l => l.action === "RETURN").length;
  const denied = todayLogs.filter(l => l.status.includes("Denied")).length;
  const out = Math.max(0, exits - returns);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-slate-400" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-600">Today's Activity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: AMBER }} />
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: AMBER2 }}>Live</span>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
        {[
          { label: "Exits", val: exits, Icon: ArrowUpRight },
          { label: "Returns", val: returns, Icon: ArrowDownLeft },
          { label: "Denied", val: denied, Icon: XCircle },
          { label: "Out Now", val: out, Icon: Users },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center justify-center py-3 px-1 gap-0.5">
            <s.Icon size={12} style={{ color: s.val > 0 ? NAVY : "#CBD5E1" }} />
            <span className="font-black text-lg leading-none" style={{ color: s.val > 0 ? NAVY : "#CBD5E1" }}>{s.val}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Log feed */}
      <div className="flex-1 overflow-y-auto">
        {todayLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 px-4">
            <ScanLine size={28} style={{ color: "#E2E8F0" }} />
            <p className="text-xs font-semibold text-slate-400">No scans today yet</p>
          </div>
        ) : (
          todayLogs.map((log, i) => {
            const isReturn = log.action === "RETURN";
            const isDenied = log.status.includes("Denied");
            const LIcon = isReturn ? ArrowDownLeft : isDenied ? XCircle : ArrowUpRight;
            const dotColor = isDenied ? NAVY : isReturn ? NAVY : AMBER;
            return (
              <div key={log.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 hover:bg-amber-50/40 transition-colors"
                style={{ animation: i === 0 ? "slideRight .25s ease" : "none" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: isDenied ? "#EEF0F8" : isReturn ? "#EEF0F8" : "#FFFBEB", border: `1px solid ${dotColor}25` }}>
                  <LIcon size={13} style={{ color: dotColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{log.student}</p>
                  <p className="text-[10px] font-medium text-slate-400 truncate">{log.class}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-slate-500 tabular-nums">{log.time}</p>
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-0.5 inline-block"
                    style={{ background: isDenied || isReturn ? "#EEF0F8" : "#FFFBEB", color: dotColor }}>
                    {log.action}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GateScanner() {
  const [logs, setLogs] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [gateStatus, setGateStatus] = useState("idle");
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [scanMode, setScanMode] = useState("EXIT");
  const inputRef = useRef(null);
  const scannerRef = useRef(null);
  const scanCooldownRef = useRef(0);

  const loadLogs = useCallback(async () => {
    try {
      const json = await fetchGateScanLogs(160);
      const rows = Array.isArray(json?.data) ? json.data : [];
      setLogs(rows.map(row => {
        const dt = row.created_at ? new Date(row.created_at) : null;
        return {
          id: row.id,
          date: dt ? dt.toISOString().slice(0, 10) : "",
          time: dt ? dt.toTimeString().slice(0, 5) : "--:--",
          student: row.student_name || "Unknown",
          class: row.class_name || "—",
          action: row.result_code === "EXIT_ALLOWED" ? "EXIT" : row.result_code?.startsWith("RETURN_") ? "RETURN" : "SCAN",
          status: !["EXIT_ALLOWED", "RETURN_ON_TIME"].includes(String(row.result_code || ""))
            ? `Denied - ${row.result_code || "UNKNOWN"}`
            : row.result_code === "RETURN_ON_TIME" ? "Returned" : "Allowed",
        };
      }));
    } catch (_) { }
  }, []);

  const processCode = useCallback(async (code, mode = scanMode) => {
    const cleaned = String(code || "").trim();
    if (!cleaned) return;
    const now = Date.now();
    if (now - scanCooldownRef.current < 1400) return;
    scanCooldownRef.current = now;
    setScanning(true);
    setScanResult(null);
    setGateStatus("idle");
    try {
      const json = await verifyGateScan({ raw: cleaned, deviceId: "GATE_SCANNER_WEB", gatePoint: "main_gate", actionType: mode });
      const student = json?.student || null;
      const permission = json?.permission || null;
      const name = student?.full_name || [student?.first_name, student?.last_name].filter(Boolean).join(" ").trim();
      const initials = String(name || "GK").split(" ").map(x => x[0] || "").join("").slice(0, 2).toUpperCase() || "GK";
      setScanResult({
        found: !!student,
        student: student ? {
          name: name || "Unknown", class: student.class_name || "—", initials,
          permission: permission ? {
            id: permission.id, type: permission.permission_type || "OTHER",
            timeOut: permission.starts_at ? String(permission.starts_at).slice(11, 16) : "—",
            returnTime: permission.ends_at ? String(permission.ends_at).slice(11, 16) : "—",
            gateState: permission.gate_scan_state || "NOT_USED",
            exceededMinutes: permission.exceeded_minutes || 0,
          } : null,
        } : null,
        message: json?.message || "",
        reasonCode: json?.reasonCode || "",
      });
      const reason = String(json?.reasonCode || "");
      if (reason === "RETURN_ON_TIME") setGateStatus("return");
      else if (reason === "RETURN_EXCEEDED") setGateStatus("overdue");
      else if (json?.allowed) setGateStatus("allowed");
      else setGateStatus("denied");
      playBeep(Boolean(json?.allowed && reason !== "RETURN_EXCEEDED"));
      loadLogs();
    } catch (err) {
      setScanResult({ found: false, error: err?.payload?.message || err?.message || "Scan failed" });
      setGateStatus("denied");
      playBeep(false);
    } finally { setScanning(false); }
  }, [loadLogs, scanMode]);

  const stopCamera = useCallback(async () => {
    try {
      const inst = scannerRef.current;
      if (inst?.isScanning) await inst.stop();
      if (inst) await inst.clear().catch(() => { });
    } catch (_) { }
    finally { scannerRef.current = null; setCameraActive(false); }
  }, []);

  const startCamera = useCallback(async (mode = scanMode) => {
    setCameraError(""); setScanMode(mode);
    try {
      await stopCamera(); setCameraActive(true);
      await new Promise(r => setTimeout(r, 50));
      const reader = new Html5Qrcode("gatekeeper-qr-reader");
      scannerRef.current = reader;
      await reader.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => processCode(text, mode), () => { }
      );
    } catch (err) {
      setCameraError(err?.message || "Failed to open camera");
      setCameraActive(false); scannerRef.current = null;
    }
  }, [processCode, scanMode, stopCamera]);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  const handleManual = () => { if (manualCode.trim()) { processCode(manualCode, scanMode); setManualCode(""); } };
  const clearResult = () => { setScanResult(null); setGateStatus("idle"); inputRef.current?.focus(); };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter(l => l.date === todayStr);

  return (
    <div className="min-h-screen bg-[#F1F4FB]" style={{ fontFamily: "'Montserrat',sans-serif" }}>

      {/* ── High-Fidelity Hero Section ── */}
      <div className="relative w-full min-h-[200px] sm:min-h-[220px] overflow-hidden bg-[#c87800]">
        <div className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none" aria-hidden />
        <div className="absolute -top-14 -right-14 w-[15rem] h-[15rem] rounded-full border border-white/[0.06] pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" aria-hidden />

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-20 sm:pb-24 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-1 rounded-full bg-[#FEBF10]" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FEBF10]">Gate Portal</p>
            </div>
            <h1 className="text-xl md:text-3xl font-semibold text-white tracking-tight leading-none mb-1 mt-1 uppercase">
              Gate Scanner
            </h1>
            <p className="text-[10px] sm:text-[11px] font-medium text-white/60 tracking-wider">
              Student Exit &amp; Return Control
            </p>
          </div>

          {/* Mode selector */}
          <div className="flex items-center bg-white/10 backdrop-blur-md rounded-2xl p-1 gap-1 self-start sm:self-auto border border-white/20">
            <button
              onClick={() => { setScanMode("EXIT"); if (cameraActive) startCamera("EXIT"); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              style={scanMode === "EXIT" ? { background: NAVY, color: AMBER, boxShadow: "0 2px 8px rgba(0,4,53,.25)" } : { color: "rgba(255,255,255,0.7)" }}>
              <LogOut size={13} /> Exit Mode
            </button>
            <button
              onClick={() => { setScanMode("RETURN"); if (cameraActive) startCamera("RETURN"); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              style={scanMode === "RETURN" ? { background: NAVY, color: AMBER, boxShadow: "0 2px 8px rgba(0,4,53,.25)" } : { color: "rgba(255,255,255,0.7)" }}>
              <LogIn size={13} /> Return Mode
            </button>
          </div>
        </div>
      </div>

      {/* ── 3-column grid ── */}
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 -mt-12 sm:-mt-16 relative z-20 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">

        {/* LEFT — Scanner Controls */}
        <div className="flex flex-col gap-4">

          {/* Camera card */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Camera size={14} className="text-slate-400" />
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: NAVY }}>QR Camera</span>
              </div>
              {cameraActive && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: AMBER }} />
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: AMBER2 }}>Active</span>
                </div>
              )}
            </div>

            <div className="p-4">
              <CameraViewport active={cameraActive} scanning={scanning} />
            </div>

            {/* Scan buttons */}
            <div className="px-4 pb-4 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => cameraActive && scanMode === "EXIT" ? stopCamera() : startCamera("EXIT")}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
                style={cameraActive && scanMode === "EXIT"
                  ? { background: "#EEF0F8", color: NAVY, border: `1.5px solid ${NAVY}40` }
                  : { background: AMBER, color: NAVY, border: `1.5px solid ${AMBER}` }}>
                {cameraActive && scanMode === "EXIT" ? <Square size={12} /> : <LogOut size={12} />}
                {cameraActive && scanMode === "EXIT" ? "Stop Exit" : "Scan Exit"}
              </button>
              <button
                onClick={() => cameraActive && scanMode === "RETURN" ? stopCamera() : startCamera("RETURN")}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
                style={cameraActive && scanMode === "RETURN"
                  ? { background: "#FFFBEB", color: AMBER2, border: `1.5px solid ${AMBER}60` }
                  : { background: NAVY, color: AMBER, border: `1.5px solid ${NAVY}` }}>
                {cameraActive && scanMode === "RETURN" ? <Square size={12} /> : <LogIn size={12} />}
                {cameraActive && scanMode === "RETURN" ? "Stop Return" : "Scan Return"}
              </button>
            </div>

            {/* Active mode badge */}
            <div className="mx-4 mb-4 py-2.5 px-4 rounded-2xl flex items-center gap-2 border"
              style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
              <Zap size={12} style={{ color: AMBER }} />
              <span className="text-xs font-bold text-slate-500">Mode:</span>
              <span className="text-xs font-black" style={{ color: NAVY }}>
                {scanMode === "EXIT" ? "Exit (Out of School)" : "Back to School"}
              </span>
            </div>

            {cameraError && (
              <div className="mx-4 mb-4 px-4 py-3 rounded-2xl flex items-start gap-2"
                style={{ background: "#EEF0F8", border: `1px solid ${NAVY}20` }}>
                <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: AMBER2 }} />
                <p className="text-xs font-semibold" style={{ color: NAVY }}>{cameraError}</p>
              </div>
            )}
          </div>

          {/* Manual input card */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Keyboard size={14} className="text-slate-400" />
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: NAVY }}>Manual / USB Input</span>
            </div>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleManual()}
                placeholder="Type or scan code…"
                className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none transition-all"
                style={{ fontFamily: "'Montserrat',sans-serif" }}
                onFocus={e => e.target.style.borderColor = AMBER}
                onBlur={e => e.target.style.borderColor = "#E2E8F0"}
              />
              <button onClick={handleManual}
                className="h-11 px-4 rounded-xl font-black text-sm flex items-center gap-1.5"
                style={{ background: `linear-gradient(135deg,${AMBER},${AMBER2})`, color: NAVY }}>
                <Hash size={13} /> Go
              </button>
            </div>
            <p className="mt-3 text-[11px] text-slate-400 font-medium leading-relaxed">
              Use <span className="font-black" style={{ color: AMBER2 }}>Scan Exit</span> for students leaving,{" "}
              <span className="font-black" style={{ color: NAVY }}>Scan Return</span> when coming back.
            </p>
          </div>

          {/* How it works — desktop only */}
          <div className="hidden lg:block bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Info size={14} className="text-slate-400" />
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: NAVY }}>How It Works</span>
            </div>
            <div className="space-y-3.5">
              {[
                { Icon: CheckCircle2, color: AMBER, title: "Allowed", desc: "Student has valid active permission for today." },
                { Icon: ArrowDownLeft, color: NAVY, title: "Returned", desc: "Student back within allowed time window." },
                { Icon: AlertTriangle, color: AMBER2, title: "Overdue", desc: "Student returned after permitted time." },
                { Icon: XCircle, color: NAVY, title: "Denied", desc: "No permission or already used." },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${item.color}12` }}>
                    <item.Icon size={12} style={{ color: item.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-black" style={{ color: NAVY }}>{item.title}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER — Scan Result */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          {/* Color stripe */}
          <div className="h-1.5 w-full transition-all duration-500"
            style={{ background: gateStatus === "idle" ? "#E2E8F0" : gateStatus === "allowed" ? AMBER : gateStatus === "overdue" ? AMBER2 : NAVY }} />

          <div className="flex-1 flex flex-col justify-center p-6 sm:p-8">
            <ResultPanel scanResult={scanResult} gateStatus={gateStatus} onClear={clearResult} scanning={scanning} />
          </div>

          {/* Bottom quick stats */}
          <div className="px-6 py-4 border-t border-slate-100 grid grid-cols-3 gap-4">
            {[
              { label: "Exits today", val: todayLogs.filter(l => l.action === "EXIT").length, Icon: ArrowUpRight },
              { label: "Returns today", val: todayLogs.filter(l => l.action === "RETURN").length, Icon: ArrowDownLeft },
              { label: "Denied today", val: todayLogs.filter(l => l.status.includes("Denied")).length, Icon: XCircle },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: "#EEF0F8" }}>
                  <s.Icon size={15} style={{ color: s.val > 0 ? NAVY : "#CBD5E1" }} />
                </div>
                <div>
                  <p className="font-black text-xl leading-none" style={{ color: NAVY }}>{s.val}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes scanLine   { 0%,100%{top:8%} 50%{top:82%} }
        @keyframes blink      { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes slideRight { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
        #gatekeeper-qr-reader video { width:100%!important;height:100%!important;object-fit:cover; }
        #gatekeeper-qr-reader       { width:100%!important;height:100%!important; }
      `}</style>
    </div>
  );
}
