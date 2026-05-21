import { useState } from "react";
import { RefreshCw, MessageSquare, Send, Check } from "lucide-react";
import { useStudentPromotionData } from "../context/StudentPromotionDataContext";

export default function RepeatersManagement() {
  const { repeaters, groups, streams, streamsByGroup } = useStudentPromotionData();
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("");
  const [newStream, setNewStream] = useState(streams[0] || "");
  const [notified, setNotified] = useState({});

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <RefreshCw size={18} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800">Repeaters Management</h3>
            <p className="text-xs text-gray-400">Manage students flagged for repeating</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold px-4 py-2 rounded-xl">
          <RefreshCw size={14} /> {repeaters.length} Students Flagged
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* List */}
        <div className="lg:col-span-2 space-y-3">
          {repeaters.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
              No repeaters flagged. Mark learners in Academic Progress or uncheck them during class promotion.
            </div>
          )}
          {repeaters.map(s => (
            <div
              key={s.id}
              onClick={() => setSelected(s)}
              className={`bg-white rounded-2xl border shadow-sm p-5 cursor-pointer hover:shadow-md transition-all ${selected?.id === s.id ? "border-amber-400 ring-2 ring-amber-100" : "border-gray-100"}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-base font-semibold flex-shrink-0">
                  {s.name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-800">{s.name}</h4>
                      <p className="text-xs text-gray-400">{s.code} · {s.class} {s.stream}</p>
                    </div>
                    <span className="text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-lg">Repeat</span>
                  </div>
                  <div className="flex gap-4 mt-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Marks</p>
                      <p className="text-sm font-semibold text-red-600">{s.avgMarks}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Attendance</p>
                      <p className="text-sm font-semibold text-amber-600">{s.attendance}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Discipline</p>
                      <p className="text-sm font-semibold text-gray-600">{s.discipline}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Fees</p>
                      <p className={`text-sm font-semibold ${s.fees === "Cleared" ? "text-green-600" : "text-red-600"}`}>{s.fees}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${notified[s.id] ? "bg-green-100 text-green-700" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
                  onClick={e => { e.stopPropagation(); setNotified(p => ({ ...p, [s.id]: true })); }}
                >
                  <span className="flex items-center gap-1">
                    {notified[s.id] ? <Check size={10} /> : <Send size={10} />}
                    {notified[s.id] ? "Notified" : "Notify Parent"}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Action Panel */}
        <div>
          {selected ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">
                Manage: {selected.name.split(" ")[0]}
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Change Stream</label>
                  <select value={newStream} onChange={e => setNewStream(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:border-amber-400 transition">
                    {streams.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Reason for Repeat</label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"
                    placeholder="Enter reason..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Actions</label>
                  <div className="space-y-2">
                    <button className="w-full flex items-center gap-2 justify-center text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl transition shadow-sm shadow-amber-200">
                      <RefreshCw size={14} /> Confirm Repeat
                    </button>
                    <button className="w-full flex items-center gap-2 justify-center text-sm font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 rounded-xl transition">
                      <MessageSquare size={14} /> Teacher Recommendation
                    </button>
                    <button
                      className="w-full flex items-center gap-2 justify-center text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl transition"
                      onClick={() => setNotified(p => ({ ...p, [selected.id]: true }))}
                    >
                      <Send size={14} /> Notify Parent
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-8 text-center">
              <RefreshCw size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Select a student to manage their repeat settings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
