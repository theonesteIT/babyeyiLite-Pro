import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { parseClassAndStream } from "../../../utils/classStreamGroups";

/**
 * Babyeyi wizard — pick registered classes via class + stream dropdowns
 * (from student register/import or school class registry).
 */
export default function RegisteredClassStreamPicker({
  groups = [],
  selected = [],
  onChange,
  sortSelected,
  catalogOrder = [],
  minSelected = 1,
  colors = {},
  levelLabel = "",
  onSelectAllLevel,
}) {
  const C = {
    dark: colors.dark || "#000435",
    darkMid: colors.darkMid || "#334155",
    goldBg: colors.goldBg || "#fffbeb",
    goldBorder: colors.goldBorder || "#fde68a",
    goldDark: colors.goldDark || "#b45309",
  };

  const [classGrade, setClassGrade] = useState("");
  const [streamLabel, setStreamLabel] = useState("");

  const selectedGroup = useMemo(
    () => groups.find((g) => g.groupName === classGrade),
    [groups, classGrade],
  );

  const streamOptions = useMemo(() => {
    if (!selectedGroup) return [];
    return (selectedGroup.labels || []).map((label) => {
      const { stream } = parseClassAndStream(label);
      return { value: label, display: stream || label };
    });
  }, [selectedGroup]);

  useEffect(() => {
    setStreamLabel("");
  }, [classGrade]);

  useEffect(() => {
    if (!groups.length) {
      setClassGrade("");
      setStreamLabel("");
      return;
    }
    if (classGrade && groups.some((g) => g.groupName === classGrade)) return;
    setClassGrade(groups[0].groupName);
  }, [groups, classGrade]);

  useEffect(() => {
    if (!streamOptions.length) {
      setStreamLabel("");
      return;
    }
    if (streamLabel && streamOptions.some((o) => o.value === streamLabel)) return;
    setStreamLabel(streamOptions[0].value);
  }, [streamOptions, streamLabel]);

  const applySelection = (next) => {
    const sorted = sortSelected ? sortSelected(next, catalogOrder) : next;
    onChange(sorted);
  };

  const addEntry = () => {
    if (!selectedGroup) return;
    let label = streamLabel;
    if (!selectedGroup.hasStreams) {
      label = selectedGroup.labels?.[0] || selectedGroup.groupName;
    }
    if (!label || selected.includes(label)) return;
    applySelection([...selected, label]);
  };

  const removeEntry = (label) => {
    const next = selected.filter((x) => x !== label);
    if (next.length < minSelected && selected.length <= minSelected) return;
    applySelection(next);
  };

  const allLevelLabels = groups.flatMap((g) => g.labels || []);
  const canAdd = selectedGroup && (
    !selectedGroup.hasStreams
      ? !(selected.includes(selectedGroup.labels?.[0] || selectedGroup.groupName))
      : streamLabel && !selected.includes(streamLabel)
  );

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-3 border-b"
        style={{ borderColor: C.goldBorder, background: C.goldBg }}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: C.dark }}>
            Select classes
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: C.darkMid }}>
            {levelLabel ? `${levelLabel} · ` : ""}
            {selected.length} selected
            {allLevelLabels.length ? ` · ${groups.length} class${groups.length === 1 ? "" : "es"} registered` : ""}
          </p>
        </div>
        {allLevelLabels.length > 0 && onSelectAllLevel ? (
          <button
            type="button"
            onClick={onSelectAllLevel}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors shrink-0"
            style={{ borderColor: C.goldBorder, background: "#fff", color: C.goldDark }}
          >
            Select all
          </button>
        ) : null}
      </div>

      <div className="p-4 space-y-4">
        {!groups.length ? (
          <p className="text-xs text-center text-slate-500 py-6 px-4 rounded-xl border border-dashed border-slate-200">
            No classes on this level yet. Register or import students first, then return here to pick class and stream.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block sm:col-span-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Class / grade <span className="text-red-500">*</span>
                </span>
                <select
                  value={classGrade}
                  onChange={(e) => setClassGrade(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none bg-white"
                >
                  {groups.map((g) => (
                    <option key={g.groupName} value={g.groupName}>
                      {g.groupName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block sm:col-span-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Stream
                  {!selectedGroup?.hasStreams ? (
                    <span className="text-slate-400 font-semibold normal-case"> (none)</span>
                  ) : null}
                </span>
                <select
                  value={streamLabel}
                  onChange={(e) => setStreamLabel(e.target.value)}
                  disabled={!selectedGroup?.hasStreams || streamOptions.length <= 1}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none bg-white disabled:opacity-50"
                >
                  {streamOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.display}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end sm:col-span-1">
                <button
                  type="button"
                  onClick={addEntry}
                  disabled={!canAdd}
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
                Choose a class{selectedGroup?.hasStreams ? " and stream" : ""}, then click Add class.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
