import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Camera, Check, ChevronRight, CreditCard, Fingerprint, Loader2, Search, Shield, Upload, X,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

function resolveMediaUrl(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (/^https?:\/\//i.test(s) || s.startsWith("data:")) return s;
  const base = String(API || "").replace(/\/+$/, "");
  const rel = s.startsWith("/") ? s : `/${s}`;
  return `${base}${rel}`;
}

export default function StaffIdentityModal({ open, onClose, staffList, creatorRole, toast }) {
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [rfid, setRfid] = useState("");
  const [fp, setFp] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = (staffList || []).filter((s) => {
      if (String(creatorRole || "").toUpperCase() === "DOS") return s.role_code === "TEACHER";
      return true;
    });
    if (!q) return base;
    return base.filter((s) => {
      const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
      const em = String(s.email || "").toLowerCase();
      const sid = String(s.staff_id || "").toLowerCase();
      const un = String(s.username || "").toLowerCase();
      return name.includes(q) || em.includes(q) || sid.includes(q) || un.includes(q);
    });
  }, [staffList, query, creatorRole]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setQuery("");
    setSelected(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setRfid("");
    setFp("");
    setRemarks("");
    setBusy(false);
  }, [open]);

  useEffect(() => {
    if (!selected) return;
    setRfid(selected.rfid_uid || "");
    setFp(selected.fingerprint_id || "");
    setRemarks(selected.identity_remarks || "");
  }, [selected]);

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const savePhoto = useCallback(async () => {
    if (!selected || !photoFile) {
      toast?.("Choose a photo first.", "error");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ""));
        r.onerror = () => reject(new Error("read failed"));
        r.readAsDataURL(photoFile);
      });
      const comma = dataUrl.indexOf(",");
      const photoBase64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
      const mimeType =
        photoFile.type && photoFile.type.startsWith("image/") ? photoFile.type : "image/jpeg";
      const res = await fetch(`${API}/api/school/staff/${selected.id}/photo`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoBase64, mimeType }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast?.(json.message || "Could not save photo", "error");
        return;
      }
      toast?.("Photo saved.", "success");
      const path = json.data?.photo;
      if (path) setSelected((prev) => (prev ? { ...prev, photo: path } : prev));
      setStep(3);
    } catch {
      toast?.("Network error", "error");
    } finally {
      setBusy(false);
    }
  }, [selected, photoFile, toast]);

  const saveIdentity = useCallback(async () => {
    if (!selected) return;
    const r = rfid.trim();
    const f = fp.trim();
    if (!r || !f) {
      toast?.("RFID and fingerprint ID are required.", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/school/staff/${selected.id}/identity`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfid_uid: r,
          fingerprint_id: f,
          identity_remarks: remarks.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast?.(json.message || "Could not save identity", "error");
        return;
      }
      toast?.("Identity saved.", "success");
      onClose?.(true);
    } catch {
      toast?.("Network error", "error");
    } finally {
      setBusy(false);
    }
  }, [selected, rfid, fp, remarks, toast, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center bg-black/55 p-3 sm:p-6">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-amber-100 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between gap-3 bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 flex items-center justify-center shrink-0">
              <Shield size={18} className="text-gray-900" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-200/90">Staff identity</p>
              <h2 className="text-base font-black text-white truncate">Step {step} of 3</h2>
            </div>
          </div>
          <button type="button" onClick={() => onClose?.()} className="p-2 rounded-xl text-white/70 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {String(creatorRole || "").toUpperCase() === "DOS"
                  ? "Search a teacher at your school by name, email, or staff ID."
                  : "Search a teacher or staff member by name, email, or staff ID."}
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type to filter…"
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none"
                />
              </div>
              <div className="rounded-2xl border border-gray-100 max-h-56 overflow-y-auto divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500">No matches.</div>
                ) : (
                  filtered.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => {
                        setSelected(row);
                        setStep(2);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-amber-50/80 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-gray-900">
                          {row.first_name} {row.last_name}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{row.email}</div>
                        <div className="text-[10px] font-bold text-amber-700 mt-0.5">{row.role_code}</div>
                      </div>
                      <ChevronRight size={16} className="text-gray-400 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {step === 2 && selected && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-800"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
                <p className="text-sm font-bold text-gray-900">
                  {selected.first_name} {selected.last_name}
                </p>
                <p className="text-xs text-gray-500">{selected.email}</p>
              </div>
              <div className="rounded-2xl border-2 border-dashed border-amber-200 p-6 text-center bg-amber-50/40">
                <Upload className="mx-auto text-amber-600 mb-2" size={28} />
                <p className="text-sm font-semibold text-gray-800 mb-2">Profile photo</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-amber-300 text-xs font-black cursor-pointer">
                  <Camera size={14} /> Choose image
                  <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
                </label>
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt=""
                    className="mt-4 mx-auto max-h-40 rounded-xl border border-amber-100 object-cover"
                  />
                )}
              </div>
              <button
                type="button"
                disabled={busy || !photoFile}
                onClick={savePhoto}
                className="w-full py-3 rounded-2xl bg-gray-900 text-amber-300 font-black text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Save photo & continue
              </button>
              {selected?.photo && (
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-full py-2.5 rounded-2xl border border-amber-200 text-amber-900 font-bold text-xs"
                >
                  Photo on file — continue to RFID / fingerprint
                </button>
              )}
            </div>
          )}

          {step === 3 && selected && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-800"
              >
                <ArrowLeft size={14} /> Back
              </button>
              {selected.photo && (
                <img
                  src={resolveMediaUrl(selected.photo)}
                  alt=""
                  className="w-20 h-20 rounded-2xl object-cover border border-gray-100 mx-auto"
                />
              )}
              <div className="grid gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">RFID UID</label>
                  <div className="relative mt-1">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      value={rfid}
                      onChange={(e) => setRfid(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm font-mono"
                      placeholder="Scan or paste UID"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">Fingerprint ID</label>
                  <div className="relative mt-1">
                    <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      value={fp}
                      onChange={(e) => setFp(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm font-mono"
                      placeholder="Hardware-generated ID"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">Remarks (optional)</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={2}
                    className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={saveIdentity}
                className="w-full py-3 rounded-2xl bg-amber-400 text-gray-900 font-black text-sm inline-flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Save identity
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
