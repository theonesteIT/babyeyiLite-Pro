import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Search,
  Upload,
  Camera,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Fingerprint,
  Users,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

const C = {
  dark: "#1A1200",
  gold: "#FEBF10",
  goldDark: "#B88A00",
  emerald: "#059669",
  slate: "#0f172a",
};

/** Snapchat-style “Pleasant frame”: higher saturation + slight warmth (also called saturation frame). */
const PLEASANT_FRAME_FILTER =
  "saturate(1.45) contrast(1.06) brightness(1.04) sepia(0.05)";

function cameraStartErrorMessage(err) {
  const name = err && typeof err === "object" && "name" in err ? String(err.name) : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera access was blocked. Click the camera icon in the address bar and allow this site, or check site settings for camera.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "That camera was not found. It may be unplugged—try another device or reconnect the webcam.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "This camera could not be opened. It may be in use by another app (Zoom, Teams, etc.), or the USB connection/driver failed—close other apps using the camera and try again.";
  }
  if (name === "OverconstrainedError") {
    return "This camera does not support the requested settings. Try another camera or refresh the page.";
  }
  if (name === "SecurityError") {
    return "Camera requires a secure (HTTPS) context or allowed permissions.";
  }
  if (name === "AbortError") {
    return "Opening the camera was cancelled. Try again.";
  }
  return "Could not start this camera. Check permissions, USB connection, and that no other app is using it.";
}

function StepIndicator({ step }) {
  const items = [
    { n: 1, label: "Search", sub: "Select student" },
    { n: 2, label: "Photo", sub: "Upload / capture" },
    { n: 3, label: "Credentials", sub: "RFID + Fingerprint" },
  ];
  return (
    <div className="mb-4 px-1">
      <div className="grid grid-cols-3 gap-2">
        {items.map((it, idx) => {
          const active = step === it.n;
          const done = step > it.n;
          return (
            <div key={it.n} className="min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                    done
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/30"
                      : active
                        ? "bg-[#FEBF10] text-[#1A1200] ring-2 ring-[#FDEAA0]"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> : it.n}
                </div>
                <div className="min-w-0">
                  <div className={`text-[10px] font-black uppercase tracking-widest truncate ${active ? "text-slate-800" : done ? "text-emerald-700" : "text-slate-400"}`}>
                    {it.label}
                  </div>
                  <div className={`text-[10px] font-semibold truncate ${active ? "text-slate-600" : done ? "text-emerald-700" : "text-slate-500/70"}`}>
                    {it.sub}
                  </div>
                </div>
              </div>
              {idx < items.length - 1 && (
                <div className="h-1 mt-2">
                  <div
                    className={`h-full rounded-full ${
                      step > it.n ? "bg-emerald-400" : active ? "bg-[#FEBF10]" : "bg-slate-200"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
        {hint ? <span className="text-slate-400 font-semibold normal-case ml-2">({hint})</span> : null}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const inputCls =
  "w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base sm:text-sm text-slate-800 placeholder:text-slate-300 focus:border-[#FEBF10] focus:ring-2 focus:ring-[#FEBF10]/25 outline-none transition-all";

function resolveMediaUrl(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || s.startsWith("data:")) return s;
  const base = String(API || "").replace(/\/+$/, "");
  const rel = s.startsWith("/") ? s : `/${s}`;
  return `${base}${rel}`;
}

export default function StudentIdentityRegistrationModal({ open, onClose, session, toast, onSaved }) {
  const [step, setStep] = useState(1);

  // Step 1
  const [searchMode, setSearchMode] = useState("student_code"); // student_code | sdms_code | student_name
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Step 2
  const [photoTab, setPhotoTab] = useState("upload"); // upload | camera
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState(null);

  const [approvedBlob, setApprovedBlob] = useState(null);
  const [approvedPreviewUrl, setApprovedPreviewUrl] = useState(null);

  const [cameraDevices, setCameraDevices] = useState([]);
  const [cameraDeviceId, setCameraDeviceId] = useState("");
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedFromCamera, setCapturedFromCamera] = useState(false);
  /** Live preview + JPEG capture use the same filter when enabled. */
  const [pleasantFrame, setPleasantFrame] = useState(true);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  // Step 3
  const [identityRfid, setIdentityRfid] = useState("");
  const [identityFingerprint, setIdentityFingerprint] = useState("");
  const [identityRemarks, setIdentityRemarks] = useState("");
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [step3Error, setStep3Error] = useState(null);
  const [step3Success, setStep3Success] = useState(null);
  const [photoSaved, setPhotoSaved] = useState(false);

  /** Step 3: work through a class without returning to step 2 */
  const [distinctClasses, setDistinctClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classFilterStep3, setClassFilterStep3] = useState("");
  const [classRosterStudents, setClassRosterStudents] = useState([]);
  const [classRosterLoading, setClassRosterLoading] = useState(false);
  const [classRosterError, setClassRosterError] = useState(null);

  const studentPhotoUrl = resolveMediaUrl(selectedStudent?.student_photo_url || null);
  const fullName = selectedStudent ? `${selectedStudent.first_name || ""} ${selectedStudent.last_name || ""}`.trim() : "";

  const resetWizard = useCallback(() => {
    setStep(1);
    setSearchMode("student_code");
    setSearchQuery("");
    setSearchError(null);
    setSearchResults([]);
    setSelectedStudent(null);

    setPhotoTab("upload");
    setUploadFile(null);
    setUploadPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setApprovedBlob(null);
    setApprovedPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    setCameraDevices([]);
    setCameraDeviceId("");
    setCameraBusy(false);
    setCameraError(null);
    setCameraOpen(false);
    setCapturedFromCamera(false);

    setIdentityRfid("");
    setIdentityFingerprint("");
    setIdentityRemarks("");
    setSavingPhoto(false);
    setSavingIdentity(false);
    setStep3Error(null);
    setStep3Success(null);
    setPhotoSaved(false);

    setDistinctClasses([]);
    setClassesLoading(false);
    setClassFilterStep3("");
    setClassRosterStudents([]);
    setClassRosterLoading(false);
    setClassRosterError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    resetWizard();
  }, [open, resetWizard]);

  // Manage object URLs
  useEffect(() => {
    return () => {
      if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
      if (approvedPreviewUrl) URL.revokeObjectURL(approvedPreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(
    async (deviceId) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera is not supported in this browser.");
        return;
      }
      setCameraError(null);
      setCameraBusy(true);
      try {
        stopCamera();
        const constraints =
          deviceId && String(deviceId).trim()
            ? {
                video: { deviceId: { exact: String(deviceId).trim() } },
                audio: false,
              }
            : { video: true, audio: false };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        setCameraError(cameraStartErrorMessage(e));
      } finally {
        setCameraBusy(false);
      }
    },
    [stopCamera]
  );

  const detectCameras = useCallback(async () => {
    setCameraError(null);
    try {
      // Request permission first so device labels are populated (when supported).
      await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = (devices || []).filter((d) => d.kind === "videoinput");
      const normalized = videoInputs.map((d) => ({
        deviceId: d.deviceId,
        label: d.label ? d.label : "Camera",
      }));
      setCameraDevices(normalized);

      const usbFirst =
        normalized.find((d) => /usb|webcam|external|camera/i.test(d.label)) ||
        normalized.find((d) => d.label && d.label.toLowerCase().includes("camera")) ||
        normalized[0] ||
        null;
      setCameraDeviceId(usbFirst?.deviceId || "");
      return usbFirst?.deviceId || "";
    } catch {
      setCameraError("Camera detection failed. Check browser permissions and device connection.");
      return "";
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    setCameraOpen(true);
    setCapturedFromCamera(false);
    setCameraError(null);

    try {
      const deviceId = await detectCameras();
      await startCamera(deviceId || undefined);
    } catch {
      setCameraError("Cannot start camera. Please try again.");
    }
  }, [detectCameras, startCamera]);

  const captureFromVideo = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.filter = pleasantFrame ? PLEASANT_FRAME_FILTER : "none";
    ctx.drawImage(video, 0, 0, w, h);
    ctx.filter = "none";

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        // If the previous preview exists, release it.
        setApprovedBlob((prev) => {
          if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
          return blob;
        });

        const url = URL.createObjectURL(blob);
        setApprovedPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setPhotoSaved(false);
        setCapturedFromCamera(true);
        setCameraOpen(false);
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  }, [pleasantFrame, stopCamera]);

  // Step 1 search (debounced)
  useEffect(() => {
    if (!open || step !== 1) return;

    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const t = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const params = new URLSearchParams({
          page: "1",
          limit: "20",
          paginate: "true",
          q,
        });
        const res = await fetch(`${API}/api/students?${params}`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json.success) {
          setSearchResults([]);
          setSearchError(json.message || "Failed to search students.");
          return;
        }

        const rows = Array.isArray(json.data) ? json.data : [];
        const ql = q.toLowerCase();
        const filtered = rows.filter((s) => {
          const studentCode = String(s.student_code || "").toLowerCase();
          const sdm = String(s.sdm_code || "").toLowerCase();
          const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
          if (searchMode === "student_code") {
            return studentCode.includes(ql) || String(s.student_uid || "").toLowerCase().includes(ql);
          }
          if (searchMode === "sdms_code") return sdm.includes(ql);
          return name.includes(ql);
        });
        setSearchResults(filtered.slice(0, 15));
      } catch {
        setSearchResults([]);
        setSearchError("Cannot reach server. Please try again.");
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [API, open, step, searchQuery, searchMode]);

  // Prefill identity values when entering step 3
  useEffect(() => {
    if (!open || step !== 3 || !selectedStudent) return;
    setIdentityRfid(selectedStudent.rfid_uid || "");
    setIdentityFingerprint(selectedStudent.fingerprint_id || "");
    setIdentityRemarks(selectedStudent.identity_remarks || "");
    setStep3Error(null);
    setStep3Success(null);
  }, [open, step, selectedStudent]);

  // Step 3: distinct class names for roster picker
  useEffect(() => {
    if (!open || step !== 3) return;
    let cancelled = false;
    (async () => {
      setClassesLoading(true);
      try {
        const res = await fetch(`${API}/api/students?paginate=false&limit=5000`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (cancelled || !json.success) {
          if (!cancelled) setDistinctClasses([]);
          return;
        }
        const uniq = new Set();
        (json.data || []).forEach((row) => {
          const cn = row.class_name != null ? String(row.class_name).trim() : "";
          if (cn) uniq.add(cn);
        });
        setDistinctClasses([...uniq].sort((a, b) => a.localeCompare(b)));
      } catch {
        if (!cancelled) setDistinctClasses([]);
      } finally {
        if (!cancelled) setClassesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, step, API]);

  // Default class filter from current student when opening step 3
  useEffect(() => {
    if (step !== 3 || !selectedStudent?.class_name) return;
    const cn = String(selectedStudent.class_name).trim();
    if (!cn || classFilterStep3) return;
    setClassFilterStep3(cn);
  }, [step, selectedStudent?.id, selectedStudent?.class_name, classFilterStep3]);

  // Load all students in selected class (step 3)
  useEffect(() => {
    if (!open || step !== 3) return;
    const cn = classFilterStep3.trim();
    if (!cn) {
      setClassRosterStudents([]);
      setClassRosterError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setClassRosterLoading(true);
      setClassRosterError(null);
      try {
        const params = new URLSearchParams({ paginate: "false", limit: "1200", class_name: cn });
        const res = await fetch(`${API}/api/students?${params}`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!json.success) {
          setClassRosterError(json.message || "Failed to load class list");
          setClassRosterStudents([]);
          return;
        }
        const rows = Array.isArray(json.data) ? json.data : [];
        rows.sort(
          (a, b) =>
            String(a.last_name || "").localeCompare(String(b.last_name || "")) ||
            String(a.first_name || "").localeCompare(String(b.first_name || ""))
        );
        setClassRosterStudents(rows);
      } catch {
        if (!cancelled) {
          setClassRosterError("Network error");
          setClassRosterStudents([]);
        }
      } finally {
        if (!cancelled) setClassRosterLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, step, classFilterStep3, API]);

  const handleUploadSelect = useCallback((file) => {
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type || "")) {
      setSearchError(null);
      return;
    }
    setUploadFile(file);
    const url = URL.createObjectURL(file);
    setUploadPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });

    setApprovedBlob(file);
    setApprovedPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setPhotoSaved(false);
    setCapturedFromCamera(false);
  }, []);

  const savePhotoToProfile = useCallback(
    async ({ goToStep3 }) => {
      if (!selectedStudent) {
        setSearchError("Select a student first.");
        return false;
      }
      if (!approvedBlob) {
        setSearchError("Please choose or capture a photo first.");
        return false;
      }
      setSavingPhoto(true);
      setSearchError(null);
      try {
        const fd = new FormData();
        const photoFile =
          approvedBlob instanceof Blob
            ? new File([approvedBlob], "student-photo.jpg", { type: approvedBlob.type || "image/jpeg" })
            : approvedBlob;
        fd.append("photo", photoFile);

        const url = `${API}/api/students/${selectedStudent.id}/identity/photo`;
        const res = await fetch(url, { method: "PUT", credentials: "include", body: fd });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          setSearchError(json.message || "Failed to save student photo.");
          return false;
        }
        await fetch(`${API}/api/student-cards/cache/refresh/${selectedStudent.id}`, {
          method: "POST",
          credentials: "include",
        }).catch(() => null);

        setSelectedStudent((prev) => ({
          ...(prev || {}),
          ...json.data,
        }));
        setPhotoSaved(true);
        if (goToStep3) setStep(3);
        return true;
      } catch {
        setSearchError("Cannot connect to server.");
        return false;
      } finally {
        setSavingPhoto(false);
      }
    },
    [API, approvedBlob, selectedStudent]
  );

  const doSavePhotoAndContinue = useCallback(() => savePhotoToProfile({ goToStep3: true }), [savePhotoToProfile]);

  const savePhotoStayOnStep3 = useCallback(() => savePhotoToProfile({ goToStep3: false }), [savePhotoToProfile]);

  const applyStudentSwitch = useCallback(
    (s) => {
      if (!s) return;
      stopCamera();
      setUploadFile(null);
      setUploadPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setApprovedBlob(null);
      setApprovedPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setCameraOpen(false);
      setCapturedFromCamera(false);
      setCameraError(null);
      setPhotoSaved(!!(s.student_photo_url && String(s.student_photo_url).trim()));
      setSelectedStudent(s);
      setSearchError(null);
      setStep3Error(null);
      setStep3Success(null);
    },
    [stopCamera]
  );

  const doSaveIdentity = useCallback(async () => {
    if (!selectedStudent) return;

    setSavingIdentity(true);
    setStep3Error(null);
    setStep3Success(null);
    try {
      const payload = {
        rfid_uid: identityRfid.trim() || null,
        fingerprint_id: identityFingerprint.trim() || null,
        identity_remarks: identityRemarks.trim() || null,
      };

      const res = await fetch(`${API}/api/students/${selectedStudent.id}/identity`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        setStep3Error(json.message || "Failed to save identity credentials.");
        return;
      }

      const updated = { ...(selectedStudent || {}), ...json.data };
      setSelectedStudent(updated);

      const idx = classRosterStudents.findIndex((x) => x.id === selectedStudent.id);
      const nextStudent = idx >= 0 && idx + 1 < classRosterStudents.length ? classRosterStudents[idx + 1] : null;

      if (nextStudent) {
        applyStudentSwitch(nextStudent);
        setStep3Success("Saved. Next student loaded — adjust photo or credentials, then save.");
        toast?.("Identity saved. Switched to next student.", "success");
        onSaved?.();
      } else {
        setStep3Success("Identity credentials saved successfully.");
        toast?.("Identity saved successfully.", "success");
        onSaved?.();
        setTimeout(() => onClose?.(), 650);
      }
    } catch {
      setStep3Error("Cannot connect to server.");
    } finally {
      setSavingIdentity(false);
    }
  }, [
    API,
    applyStudentSwitch,
    classRosterStudents,
    identityFingerprint,
    identityRemarks,
    identityRfid,
    onClose,
    onSaved,
    selectedStudent,
    toast,
  ]);

  // Cleanup camera on close
  useEffect(() => {
    if (!open) stopCamera();
  }, [open, stopCamera]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(2,6,23,0.76)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !savingPhoto && !savingIdentity) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Student identity registration"
    >
      <div
        className={`bg-white w-full flex flex-col overflow-hidden shadow-2xl rounded-t-[1.35rem] sm:rounded-3xl h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[min(92vh,920px)] ${step === 3 ? "max-w-3xl" : "max-w-2xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Body (no top title bar — close via footer, backdrop, or step 1 Cancel) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))] bg-slate-50">
          <StepIndicator step={step} />

          {step === 3 && (
            <div className="mb-4 rounded-2xl border border-[#FDEAA0]/80 bg-[#FFFBE8]/90 p-3 sm:p-4">
              <div className="flex items-start gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400/30 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-slate-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900">Class roster</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Choose a class, switch learners with arrows or the list — no need to return to step 2 for a new photo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-2 items-end">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Class</label>
                  <select
                    value={classFilterStep3}
                    onChange={(e) => setClassFilterStep3(e.target.value)}
                    disabled={classesLoading}
                    className={inputCls}
                  >
                    <option value="">{classesLoading ? "Loading classes…" : "Select class"}</option>
                    {distinctClasses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={!classFilterStep3 || classRosterLoading || !selectedStudent}
                    onClick={() => {
                      const i = classRosterStudents.findIndex((s) => s.id === selectedStudent?.id);
                      if (i > 0) applyStudentSwitch(classRosterStudents[i - 1]);
                    }}
                    className="inline-flex items-center justify-center min-h-[44px] px-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-black text-xs hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Previous student"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!classFilterStep3 || classRosterLoading || !selectedStudent}
                    onClick={() => {
                      const i = classRosterStudents.findIndex((s) => s.id === selectedStudent?.id);
                      if (i >= 0 && i < classRosterStudents.length - 1) applyStudentSwitch(classRosterStudents[i + 1]);
                    }}
                    className="inline-flex items-center justify-center min-h-[44px] px-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-black text-xs hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Next student"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {classRosterError && (
                <p className="text-xs font-semibold text-red-600 mt-2">{classRosterError}</p>
              )}

              {classFilterStep3 && (
                <div className="mt-3">
                  {classRosterLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#B88A00]" /> Loading students…
                    </div>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
                      {classRosterStudents.map((s) => {
                        const sel = selectedStudent?.id === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => applyStudentSwitch(s)}
                            className={`shrink-0 max-w-[140px] rounded-xl border px-2.5 py-2 text-left transition-all touch-manipulation ${
                              sel ? "border-[#FEBF10] bg-[#FFF3CC] shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <p className="text-[11px] font-black text-slate-900 truncate">
                              {s.first_name} {s.last_name}
                            </p>
                            <p className="text-[9px] font-mono text-slate-500 truncate">{s.student_code || s.student_uid}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!classRosterLoading && classRosterStudents.length === 0 && classFilterStep3 && (
                    <p className="text-[11px] text-slate-500 mt-1">No students found for this class.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {(searchError || step3Error) && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-red-700">{searchError || step3Error}</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900">Search and select a student</p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Use <span className="font-bold text-slate-700">Student Code</span>, <span className="font-bold text-slate-700">SDMS Code</span>, or <span className="font-bold text-slate-700">Student Name</span>.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 shrink-0">
                    <Search className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer touch-manipulation">
                    <input
                      type="radio"
                      name="smode"
                      checked={searchMode === "student_code"}
                      onChange={() => setSearchMode("student_code")}
                      className="w-4 h-4 text-[#FEBF10] focus:ring-[#FEBF10]/30"
                    />
                    <span className="text-[12px] font-bold text-slate-700">Student Code</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer touch-manipulation">
                    <input
                      type="radio"
                      name="smode"
                      checked={searchMode === "sdms_code"}
                      onChange={() => setSearchMode("sdms_code")}
                      className="w-4 h-4 text-[#FEBF10] focus:ring-[#FEBF10]/30"
                    />
                    <span className="text-[12px] font-bold text-slate-700">SDMS Code</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer touch-manipulation">
                    <input
                      type="radio"
                      name="smode"
                      checked={searchMode === "student_name"}
                      onChange={() => setSearchMode("student_name")}
                      className="w-4 h-4 text-[#FEBF10] focus:ring-[#FEBF10]/30"
                    />
                    <span className="text-[12px] font-bold text-slate-700">Student Name</span>
                  </label>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    enterKeyHint="search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedStudent(null);
                      setSearchError(null);
                    }}
                    placeholder={
                      searchMode === "student_code"
                        ? "Type student code..."
                        : searchMode === "sdms_code"
                          ? "Type SDMS code..."
                          : "Type student name..."
                    }
                    className="w-full pl-10 pr-3 py-2.5 min-h-[44px] rounded-xl border border-slate-200 bg-white text-sm focus:border-[#FEBF10] focus:ring-2 focus:ring-[#FEBF10]/25 outline-none"
                  />
                </div>

                <div className="mt-3">
                  {searching ? (
                    <div className="py-6 text-center text-slate-500 text-xs font-semibold">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#B88A00]" />
                      Searching...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-sm font-black text-slate-400">No matches yet</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {searchQuery.trim() ? "Try another search value." : "Start typing to search."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {searchResults.map((s) => {
                        const isSelected = selectedStudent?.id === s.id;
                        const img = resolveMediaUrl(s.student_photo_url);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelectedStudent(s)}
                            className={`text-left rounded-2xl border p-3 touch-manipulation transition-all ${
                              isSelected
                                ? "border-[#FEBF10] bg-[#FFF3CC]/80 shadow-sm"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                                {img ? (
                                  <img src={img} alt={`${s.first_name} ${s.last_name}`} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-slate-200" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-black text-slate-900 truncate">
                                  {s.first_name} {s.last_name}
                                </p>
                                <p className="text-[11px] font-mono text-slate-600 mt-1">
                                  {s.student_code || s.student_uid || "—"}
                                  {s.sdm_code ? <span className="text-slate-400"> · SDMS {s.sdm_code}</span> : null}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-1 truncate">
                                  {s.class_name || "—"} · {s.gender || "—"}
                                </p>
                              </div>
                              <div className="shrink-0">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                                    isSelected ? "border-[#FEBF10] bg-[#FEBF10]/15" : "border-slate-200 bg-white"
                                  }`}
                                >
                                  <CheckCircle2 className={`w-4 h-4 ${isSelected ? "text-[#B88A00]" : "text-slate-300"}`} />
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {selectedStudent && (
                <div className="rounded-2xl border border-[#FDEAA0]/70 bg-white p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                      {studentPhotoUrl ? (
                        <img src={studentPhotoUrl} alt="Current student" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-900">{fullName || "Selected student"}</p>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-widest font-black text-slate-500">Student Code</p>
                          <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">{selectedStudent.student_code || selectedStudent.student_uid || "—"}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-widest font-black text-slate-500">SDMS Code</p>
                          <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">{selectedStudent.sdm_code || "—"}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-widest font-black text-slate-500">Class / Department</p>
                          <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedStudent.class_name || "—"}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-widest font-black text-slate-500">Gender</p>
                          <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedStudent.gender || "—"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {(step === 2 || step === 3) && (
            <div className="space-y-4">
              {!selectedStudent ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-700">
                  Please go back and select a student first.
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900">
                          {step === 3 ? "Photo for this student" : "Assign student photo"}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Upload from computer or capture using an external USB webcam / connected camera.
                        </p>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-amber-400/20 flex items-center justify-center shrink-0">
                        <Camera className="w-5 h-5 text-slate-900" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setPhotoTab("upload")}
                        className={`rounded-2xl border px-3 py-3 text-left touch-manipulation transition-all ${
                          photoTab === "upload" ? "border-[#FEBF10] bg-[#FFF3CC]/80" : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Upload className="w-4 h-4 text-slate-600" />
                          <p className="text-[13px] font-black text-slate-900">Upload Image</p>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Choose a photo file from your device</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoTab("camera")}
                        className={`rounded-2xl border px-3 py-3 text-left touch-manipulation transition-all ${
                          photoTab === "camera" ? "border-[#FEBF10] bg-[#FFF3CC]/80" : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-slate-600" />
                          <p className="text-[13px] font-black text-slate-900">Capture with Camera</p>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Detect & preview external USB webcams</p>
                      </button>
                    </div>

                    {/* Current photo */}
                    <div className="rounded-2xl border border-[#FDEAA0]/70 bg-[#FFFBE8]/60 p-3 mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          {studentPhotoUrl ? (
                            <img src={studentPhotoUrl} alt="Current student photo" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-200" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-black text-slate-900">Current photo</p>
                          <p className="text-[11px] text-slate-600 mt-1">
                            {studentPhotoUrl ? "Existing photo found for this student." : "No photo saved yet. You can skip photo and continue."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {photoTab === "upload" && (
                      <div className="space-y-3">
                        <Field label="Upload image" hint="JPG/PNG">
                          <label className="flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer touch-manipulation">
                            <Upload className="w-4 h-4 text-slate-600" />
                            <span className="text-sm font-black text-slate-800">Choose file</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg"
                              className="hidden"
                              onChange={(e) => handleUploadSelect(e.target.files?.[0] || null)}
                            />
                          </label>
                        </Field>

                        {uploadPreviewUrl && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Preview</p>
                            <div className="mt-2 flex items-center gap-3">
                              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                <img src={uploadPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadFile(null);
                                  setUploadPreviewUrl((prev) => {
                                    if (prev) URL.revokeObjectURL(prev);
                                    return null;
                                  });
                                  setApprovedBlob(null);
                                  setApprovedPreviewUrl((prev) => {
                                    if (prev) URL.revokeObjectURL(prev);
                                    return null;
                                  });
                                  setPhotoSaved(false);
                                }}
                                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 touch-manipulation"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {photoTab === "camera" && (
                      <div className="space-y-3">
                        {!cameraOpen ? (
                          <button
                            type="button"
                            onClick={handleTakePhoto}
                            disabled={cameraBusy}
                            className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-2xl bg-amber-400 text-sm font-black text-slate-900 hover:bg-amber-300 disabled:opacity-60 transition-all touch-manipulation"
                          >
                            {cameraBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Camera className="w-4 h-4" /> Take Photo</>}
                          </button>
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                            {cameraError && (
                              <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                {cameraError}
                              </div>
                            )}

                            {/* Wide live preview + actions beside (Capture next to preview, not below) */}
                            <div className="flex flex-col sm:flex-row gap-4 items-stretch">
                              <div className="min-w-0 flex-1 sm:min-w-[58%]">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Live preview</p>
                                <div className="relative w-full rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-900 shadow-inner aspect-video min-h-[280px] max-h-[min(72vh,580px)]">
                                  <video
                                    ref={videoRef}
                                    playsInline
                                    muted
                                    className="absolute inset-0 w-full h-full object-cover"
                                    style={{
                                      filter: pleasantFrame ? PLEASANT_FRAME_FILTER : "none",
                                    }}
                                  />
                                  {cameraBusy && (
                                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                                      <Loader2 className="w-8 h-8 animate-spin text-[#B88A00]" />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col gap-3 w-full sm:w-[200px] md:w-[220px] shrink-0 sm:pt-7">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-2.5">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                                    Pleasant frame
                                  </p>
                                  <p className="text-[10px] text-slate-500 mb-2 leading-snug">
                                    Saturation + warmth (like Snapchat). Matches your saved photo.
                                  </p>
                                  <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white">
                                    <button
                                      type="button"
                                      onClick={() => setPleasantFrame(true)}
                                      className={`flex-1 min-h-[40px] text-[11px] font-black px-2 transition-colors touch-manipulation ${
                                        pleasantFrame
                                          ? "bg-[#FEBF10] text-[#1A1200]"
                                          : "bg-white text-slate-500 hover:bg-slate-50"
                                      }`}
                                    >
                                      On
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPleasantFrame(false)}
                                      className={`flex-1 min-h-[40px] text-[11px] font-black px-2 border-l border-slate-200 transition-colors touch-manipulation ${
                                        !pleasantFrame
                                          ? "bg-slate-900 text-white"
                                          : "bg-white text-slate-500 hover:bg-slate-50"
                                      }`}
                                    >
                                      Original
                                    </button>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={captureFromVideo}
                                  disabled={cameraBusy}
                                  className="w-full min-h-[52px] rounded-2xl bg-[#FEBF10] text-[#1A1200] text-sm font-black hover:bg-[#FDEAA0] disabled:opacity-60 transition-all touch-manipulation shadow-md shadow-amber-500/20"
                                >
                                  Capture
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCameraOpen(false);
                                    stopCamera();
                                  }}
                                  className="w-full min-h-[48px] rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 touch-manipulation"
                                >
                                  Cancel
                                </button>
                                {cameraDevices.length > 0 && (
                                  <div className="pt-1 border-t border-slate-100">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Camera</p>
                                    <select
                                      value={cameraDeviceId}
                                      onChange={(e) => setCameraDeviceId(e.target.value)}
                                      className={inputCls}
                                      style={{ minHeight: 44 }}
                                    >
                                      {cameraDevices.map((d) => (
                                        <option key={d.deviceId} value={d.deviceId}>
                                          {d.label}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => startCamera(cameraDeviceId || undefined)}
                                      disabled={cameraBusy}
                                      className="mt-2 w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800 disabled:opacity-60 transition-all touch-manipulation"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                      Switch
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {(approvedPreviewUrl || capturedFromCamera) && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Captured photo</p>
                            <div className="mt-2 flex items-center gap-3">
                              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                {approvedPreviewUrl ? <img src={approvedPreviewUrl} alt="Captured" className="w-full h-full object-cover" /> : null}
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-slate-600 font-semibold">
                                  Confirm the photo. You can retake if it&apos;s not clear.
                                </p>
                                <div className="flex gap-2 mt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setApprovedBlob(null);
                                      setApprovedPreviewUrl((prev) => {
                                        if (prev) URL.revokeObjectURL(prev);
                                        return null;
                                      });
                                      setPhotoSaved(false);
                                      setCapturedFromCamera(false);
                                      setCameraOpen(false);
                                    }}
                                    className="flex-1 min-h-[44px] rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 touch-manipulation"
                                  >
                                    Clear
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleTakePhoto}
                                    disabled={cameraBusy}
                                    className="flex-1 min-h-[44px] rounded-xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800 disabled:opacity-60 touch-manipulation"
                                  >
                                    Retake
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {step === 2 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900">Ready to continue</p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Save an approved image if available, or continue without photo and assign credentials later.
                          </p>
                        </div>
                        <div className="shrink-0">
                          <button
                            type="button"
                            onClick={doSavePhotoAndContinue}
                            disabled={savingPhoto}
                            className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-2xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-500 disabled:opacity-60 transition-all touch-manipulation"
                          >
                            {savingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Save & Continue</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900">Save photo to profile</p>
                          <p className="text-[11px] text-slate-600 mt-1">
                            After capture or upload, save here. Then set RFID / fingerprint below — or switch student in the class bar above.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={savePhotoStayOnStep3}
                          disabled={savingPhoto}
                          className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-2xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-500 disabled:opacity-60 transition-all touch-manipulation shrink-0"
                        >
                          {savingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Save photo</>}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {!selectedStudent ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-700">
                  Please go back and select a student first.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <Field label="RFID UID Code" hint="optional">
                        <input
                          value={identityRfid}
                          onChange={(e) => setIdentityRfid(e.target.value)}
                          placeholder="e.g. 04A1B2C3..."
                          className={inputCls}
                        />
                      </Field>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <Field label="Fingerprint ID" hint="optional">
                        <input
                          value={identityFingerprint}
                          onChange={(e) => setIdentityFingerprint(e.target.value)}
                          placeholder="e.g. FP-1001"
                          className={inputCls}
                        />
                      </Field>
                    </div>

                    <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-3">
                      <Field label="Remarks / Notes" hint="optional">
                        <textarea
                          value={identityRemarks}
                          onChange={(e) => setIdentityRemarks(e.target.value)}
                          rows={3}
                          placeholder="Anything to note about this identity setup..."
                          className={`${inputCls} resize-none`}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 inline-flex items-center gap-2">
                          <Fingerprint className="w-4 h-4 text-amber-700" />
                          Assign credentials
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          RFID UID and Fingerprint ID are optional. If provided, they are validated to prevent duplicates across the school.
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <div className="px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                            Attendance tracking
                          </div>
                          <div className="px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                            Gate access
                          </div>
                          <div className="px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                            Library & canteen
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col gap-2 items-end">
                        <button
                          type="button"
                          onClick={doSaveIdentity}
                          disabled={savingIdentity}
                          className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-2xl bg-amber-400 text-[#1A1200] text-sm font-black hover:bg-amber-300 disabled:opacity-60 transition-all touch-manipulation"
                        >
                          {savingIdentity ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Save Identity</>}
                        </button>
                        <p className="text-[10px] text-slate-500 font-semibold">You can edit later anytime.</p>
                      </div>
                    </div>

                    {step3Success && (
                      <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-emerald-800">{step3Success}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Hidden canvas for camera capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
          <button
            type="button"
            onClick={() => {
              if (savingPhoto || savingIdentity) return;
              if (step === 1) return onClose?.();
              setStep((s) => Math.max(1, s - 1));
              setSearchError(null);
              setStep3Error(null);
            }}
            disabled={savingPhoto || savingIdentity}
            className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-4 py-3 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all touch-manipulation"
          >
            {step === 1 ? "Cancel" : "← Back"}
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {step < 3 && (
              <button
                type="button"
                onClick={() => {
                  if (savingPhoto || savingIdentity) return;
                  if (step === 1 && !selectedStudent) {
                    setSearchError("Please select a student to continue.");
                    return;
                  }
                  if (step === 2 && !photoSaved) {
                    setSearchError(null);
                  }
                  setSearchError(null);
                  setStep((s) => Math.min(3, s + 1));
                }}
                disabled={savingPhoto || savingIdentity}
                className="inline-flex items-center justify-center gap-1.5 min-h-[48px] sm:min-h-0 px-5 py-3 sm:py-2 rounded-xl bg-amber-400 text-sm sm:text-xs font-black text-slate-900 hover:bg-amber-300 transition-all touch-manipulation w-full sm:w-auto"
              >
                Next <ChevronRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={() => onClose?.()}
                disabled={savingIdentity}
                className="inline-flex items-center justify-center gap-2 min-h-[48px] sm:min-h-0 px-5 py-3 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all touch-manipulation w-full sm:w-auto"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

