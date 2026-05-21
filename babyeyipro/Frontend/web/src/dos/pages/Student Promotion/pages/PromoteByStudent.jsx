import { useEffect, useMemo, useState } from "react";
import { Search, User, CheckCircle, ArrowRight, Save, Loader2 } from "lucide-react";
import { useStudentPromotionData } from "../context/StudentPromotionDataContext";

const promoTypes = ["Mid-Year Promotion", "Exceptional Promotion", "Transfer to Another Stream", "Demotion", "Reinstatement", "Normal Promotion"];

export default function PromoteByStudent() {
  const {
    groups,
    streams,
    streamsByGroup,
    searchStudents,
    buildDestinationLabel,
    submitPromotion,
    academicYear,
    term,
    loading,
  } = useStudentPromotionData();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [newClass, setNewClass] = useState("");
  const [newStream, setNewStream] = useState("");
  const [reason, setReason] = useState("Normal Promotion");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (groups.length && !newClass) {
      setNewClass(groups[Math.min(1, groups.length - 1)] || groups[0]);
    }
  }, [groups, newClass]);

  const streamOpts = useMemo(() => {
    if (newClass && streamsByGroup[newClass]?.length) return streamsByGroup[newClass];
    return streams;
  }, [newClass, streams, streamsByGroup]);

  useEffect(() => {
    if (streamOpts.length && !newStream) setNewStream(streamOpts[0]);
  }, [streamOpts, newStream]);

  const filtered = query.length > 1 ? searchStudents(query) : [];

  const handlePromote = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await submitPromotion({
        promoteIds: [selected.id],
        repeaterIds: [],
        destinationClassName: buildDestinationLabel(newClass, newStream),
        sourceClassName: selected.class_name,
        promotionType: reason,
        year: academicYear,
        term,
      });
      setDone(true);
    } catch (e) {
      setError(e.message || "Promotion failed");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Student Promoted!
          </h2>
          <p className="text-gray-500 mb-6">
            {selected?.name} has been moved to {buildDestinationLabel(newClass, newStream)} via {reason}.
          </p>
          <button onClick={() => { setDone(false); setSelected(null); setQuery(""); }} className="bg-amber-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-amber-600 transition">
            Promote Another Student
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Search Student
        </h3>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
            placeholder="Search by name or student ID..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
            disabled={loading}
          />
        </div>
        {filtered.length > 0 && (
          <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            {filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setSelected(s); setQuery(s.name); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition border-b border-gray-50 last:border-0 text-left"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {s.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.code} · {s.class_name || `${s.class} ${s.stream}`.trim()}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${s.status === "Eligible" ? "bg-green-100 text-green-700" : s.status === "Risky" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                  {s.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
              <User size={22} className="text-amber-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">{selected.name}</h4>
              <p className="text-xs text-gray-400">{selected.code} · Current: {selected.class_name}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Promotion Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">New Class</label>
                <select value={newClass} onChange={(e) => setNewClass(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50">
                  {groups.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">New Stream</label>
                <select value={newStream} onChange={(e) => setNewStream(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50">
                  {streamOpts.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Promotion Type</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50">
                  {promoTypes.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="button"
            disabled={saving}
            onClick={handlePromote}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-amber-200"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Confirm Promotion <ArrowRight size={15} />
          </button>
        </div>
      )}

      {!selected && !loading && (
        <div className="text-center py-12">
          <User size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Search for a student above to begin individual promotion</p>
        </div>
      )}
    </div>
  );
}
