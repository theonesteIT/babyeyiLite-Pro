import { useState, useEffect, useCallback } from "react";
import { SlidersHorizontal, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "../services/api";

export default function DosSettingsPage() {
  const [totalMarks, setTotalMarks] = useState("100");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [okMsg, setOkMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOkMsg(null);
    try {
      const { data: json } = await api.get("/dos/settings");
      if (!json.success) {
        setError(json.message || "Failed to load settings");
        return;
      }
      setTotalMarks(String(json.data?.total_marks ?? 100));
    } catch (err) {
      setError(err.response?.data?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    const n = Number(totalMarks);
    if (Number.isNaN(n) || n < 1 || n > 10000) {
      setError("Enter a number between 1 and 10000.");
      return;
    }
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const { data: json } = await api.put("/dos/settings", { total_marks: n });
      if (!json.success) {
        setError(json.message || "Save failed");
        return;
      }
      setOkMsg("Settings saved.");
      setTotalMarks(String(json.data?.total_marks ?? n));
    } catch (err) {
      setError(err.response?.data?.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-re-bg" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {/* ── Hero Banner ── */}
      <section className="relative p-7 md:p-10 text-white overflow-hidden min-h-[180px] flex items-center bg-[#000435]">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-5xl w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-0.5 w-6 rounded-full bg-[#FEBF10]" />
            <p className="text-[10px] font-black capitalize tracking-widest text-[#FEBF10]/80">Configuration</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">DOS Settings</h1>
          <p className="text-xs font-bold text-white/60 max-w-xl mt-2">
            Default total marks used to calculate remaining marks automatically for academic progress.
          </p>
        </div>
      </section>

      <div className="max-w-[1400px] mx-auto px-4 md:px-10 py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-[10px] font-black text-[#000435] capitalize tracking-[0.22em]">Settings Panel</h2>
        </div>

      <div className="mx-auto max-w-lg rounded-3xl border border-[#FDEAA0]/80 bg-white p-5 shadow-xl shadow-[#FDEAA0]/15 sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(254,191,16,0.2)]">
            <SlidersHorizontal className="text-[#B88A00]" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1A1200]">Total marks default</h2>
            <p className="text-xs font-medium text-slate-500">Remaining = total - marks obtained</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-[#B88A00]" />
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            {okMsg && (
              <div className="flex items-start gap-2 rounded-2xl border border-[#FDEAA0] bg-[#FFFBE8] px-3 py-2 text-sm font-semibold text-[#3D2C00]">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-[#B88A00]" />
                {okMsg}
              </div>
            )}

            <div>
              <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">Total marks</label>
              <input
                type="number"
                min={1}
                max={10000}
                step={0.01}
                required
                className="w-full rounded-xl border border-[#FDEAA0] px-4 py-3 text-lg font-black text-[#1A1200] focus:border-[#FEBF10] focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/30"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-gradient-to-r from-[#1A1200] to-[#3D2C00] py-3.5 text-sm font-black text-[#FEBF10] shadow-lg shadow-[#1A1200]/15 transition hover:opacity-95 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </form>
        )}
      </div>
      </div>
    </div>
  );
}
