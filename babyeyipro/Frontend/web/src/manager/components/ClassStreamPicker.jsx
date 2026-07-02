import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { parseClassAndStream } from "../../utils/classStreamGroups";

/**
 * Hierarchical class picker: checkbox per class; chevron expands streams (all levels).
 */
export default function ClassStreamPicker({
  groups = [],
  selected = [],
  onChange,
  sortSelected,
  catalogOrder = [],
  minSelected = 1,
  colors = {},
  levelLabel = "",
  onSelectAllLevel,
  onClearLevel,
}) {
  const C = {
    dark: colors.dark || "#000435",
    darkMid: colors.darkMid || "#334155",
    goldBg: colors.goldBg || "#fffbeb",
    goldBorder: colors.goldBorder || "#fde68a",
    goldDark: colors.goldDark || "#b45309",
  };

  const [expanded, setExpanded] = useState({});
  const selectedSet = new Set(Array.isArray(selected) ? selected : []);
  const allLevelLabels = groups.flatMap((g) => g.labels || []);
  const allLevelSelected = allLevelLabels.length > 0 && allLevelLabels.every((l) => selectedSet.has(l));

  const applySelection = (next) => {
    const sorted = sortSelected ? sortSelected(next, catalogOrder) : next;
    onChange(sorted);
  };

  const toggleGroup = (group) => {
    const allOn = group.labels.every((l) => selectedSet.has(l));
    if (allOn) {
      const next = selected.filter((l) => !group.labels.includes(l));
      if (next.length < minSelected) return;
      applySelection(next);
      return;
    }
    applySelection([...new Set([...selected, ...group.labels])]);
  };

  const toggleStream = (label) => {
    const cur = Array.isArray(selected) ? [...selected] : [];
    if (selectedSet.has(label)) {
      if (cur.length <= minSelected) return;
      applySelection(cur.filter((x) => x !== label));
      return;
    }
    applySelection([...cur, label]);
  };

  const handleSelectAll = () => {
    if (onSelectAllLevel) {
      onSelectAllLevel();
      return;
    }
    applySelection([...new Set([...selected, ...allLevelLabels])]);
  };

  const handleClear = () => {
    if (onClearLevel) {
      onClearLevel();
      return;
    }
    const next = selected.filter((l) => !allLevelLabels.includes(l));
    if (next.length >= minSelected) applySelection(next);
  };

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
            {allLevelLabels.length ? ` · ${allLevelLabels.length} available` : ""}
          </p>
        </div>
        {allLevelLabels.length > 0 ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors"
              style={{
                borderColor: allLevelSelected ? C.goldDark : C.goldBorder,
                background: allLevelSelected ? "#fef3c7" : "#fff",
                color: C.goldDark,
              }}
            >
              {allLevelSelected ? "All selected" : "Select all"}
            </button>
            {selected.length > minSelected ? (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              >
                Clear
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        className="max-h-72 overflow-y-auto p-2 sm:p-3 space-y-1"
        style={{ background: "linear-gradient(180deg, #fffef9 0%, #ffffff 100%)" }}
      >
        {!groups.length ? (
          <p className="text-xs text-slate-500 text-center py-8 px-4">
            No classes on this education level. Register or import students first, or try another level.
          </p>
        ) : null}
        {groups.map((group) => {
          const allOn = group.labels.every((l) => selectedSet.has(l));
          const someOn = group.labels.some((l) => selectedSet.has(l));
          const isOpen = !!expanded[group.groupName];
          const groupId = `cls-grp-${group.groupName.replace(/\s+/g, "-")}`;

          return (
            <div key={group.groupName} className="rounded-xl border border-slate-100 bg-white/80">
              <div
                className="flex items-center gap-1.5 px-2 py-2 rounded-xl transition-colors hover:bg-amber-50/50"
                style={{ color: C.dark }}
              >
                {group.hasStreams ? (
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`${groupId}-streams`}
                    onClick={() =>
                      setExpanded((p) => ({ ...p, [group.groupName]: !p[group.groupName] }))
                    }
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-white transition-transform"
                    style={{
                      borderColor: C.goldBorder,
                      color: C.goldDark,
                      transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                    }}
                    title={isOpen ? "Hide streams" : "Show streams"}
                  >
                    <ChevronDown size={14} strokeWidth={2.5} />
                  </button>
                ) : (
                  <span className="w-7 shrink-0" aria-hidden />
                )}

                <GroupCheckbox checked={allOn} indeterminate={someOn && !allOn} onChange={() => toggleGroup(group)} />

                <button
                  type="button"
                  onClick={() => {
                    if (group.hasStreams) {
                      setExpanded((p) => ({ ...p, [group.groupName]: !p[group.groupName] }));
                    } else {
                      toggleGroup(group);
                    }
                  }}
                  className="flex-1 min-w-0 text-left text-sm font-semibold truncate"
                >
                  {group.groupName}
                  {group.hasStreams && (
                    <span className="ml-1.5 text-[10px] font-medium normal-case text-slate-500">
                      ({group.labels.length} stream{group.labels.length === 1 ? "" : "s"})
                    </span>
                  )}
                </button>
              </div>

              {group.hasStreams && isOpen && (
                <div id={`${groupId}-streams`} className="ml-9 mr-2 mb-2 space-y-0.5 border-l pl-2" style={{ borderColor: C.goldBorder }}>
                  {group.labels.map((label) => {
                    const { stream } = parseClassAndStream(label);
                    const streamDisplay = stream || label;
                    return (
                      <label
                        key={label}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer text-[12px] font-semibold transition-colors hover:bg-amber-50/60 text-slate-600"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSet.has(label)}
                          onChange={() => toggleStream(label)}
                          className="size-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 shrink-0"
                        />
                        <span className="min-w-0 break-words">
                          Stream <span className="text-slate-800">{streamDisplay}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GroupCheckbox({ checked, indeterminate, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={!!checked}
      onChange={onChange}
      className="size-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 shrink-0"
    />
  );
}
