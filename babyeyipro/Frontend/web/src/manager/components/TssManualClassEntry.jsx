import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  formatClassWithStream,
  parseClassAndStream,
} from "../../utils/classStreamGroups";

/**
 * TSS Babyeyi wizard — no static catalog; schools enter trade class + stream manually.
 * Stored label: "L3 SOD A" (class L3 SOD, stream A).
 */
export default function TssManualClassEntry({
  selected = [],
  onChange,
  colors = {},
  minSelected = 1,
}) {
  const C = {
    dark: colors.dark || "#000435",
    goldBg: colors.goldBg || "#fffbeb",
    goldBorder: colors.goldBorder || "#fde68a",
    goldDark: colors.goldDark || "#b45309",
  };

  const [classGrade, setClassGrade] = useState("");
  const [stream, setStream] = useState("");

  const addEntry = () => {
    const grade = String(classGrade || "").trim();
    if (!grade) return;
    const label = formatClassWithStream(grade, stream);
    if (selected.includes(label)) return;
    onChange([...selected, label]);
    setClassGrade("");
    setStream("");
  };

  const removeEntry = (label) => {
    const next = selected.filter((x) => x !== label);
    if (next.length < minSelected && selected.length <= minSelected) return;
    onChange(next);
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: C.goldBorder, background: C.goldBg }}
      >
        <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: C.dark }}>
          TSS classes (manual entry)
        </p>
        <p className="text-[10px] mt-1 text-slate-600 leading-relaxed">
          Enter each trade class and stream — e.g. Class <strong>L3 SOD</strong>, Stream <strong>A</strong>.
          No fixed list (schools use different trades).
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block sm:col-span-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Class / grade <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={classGrade}
              onChange={(e) => setClassGrade(e.target.value)}
              placeholder="e.g. L3 SOD"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
            />
          </label>
          <label className="block sm:col-span-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Stream <span className="text-slate-400 font-semibold normal-case">(optional)</span>
            </span>
            <input
              type="text"
              value={stream}
              onChange={(e) => setStream(e.target.value)}
              placeholder="e.g. A"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
            />
          </label>
          <div className="flex items-end sm:col-span-1">
            <button
              type="button"
              onClick={addEntry}
              disabled={!String(classGrade || "").trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-300 hover:bg-slate-800 disabled:opacity-50"
            >
              <Plus size={14} /> Add class
            </button>
          </div>
        </div>

        {selected.length ? (
          <ul className="space-y-2">
            {selected.map((label) => {
              const { classGrade: g, stream: s } = parseClassAndStream(label);
              return (
                <li
                  key={label}
                  className="flex items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2.5"
                >
                  <div className="min-w-0 text-sm">
                    <span className="font-semibold text-slate-800">Class {g}</span>
                    {s ? (
                      <span className="text-slate-600">
                        {" "}
                        · Stream <span className="font-semibold text-slate-800">{s}</span>
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEntry(label)}
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-center text-slate-500 py-4 rounded-xl border border-dashed border-slate-200">
            Add at least one TSS class for this Babyeyi.
          </p>
        )}
      </div>
    </div>
  );
}
