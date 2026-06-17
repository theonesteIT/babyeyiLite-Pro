import { useEffect, useRef, useState } from "react";

/**
 * Hierarchical class picker: grade row (P1) selects all streams; chevron expands P1 A, P1 B…
 */
export default function ClassStreamPicker({
  groups = [],
  selected = [],
  onChange,
  sortSelected,
  catalogOrder = [],
  minSelected = 1,
  colors = {},
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

  return (
    <div
      className="max-h-64 overflow-y-auto rounded-xl border p-2 space-y-1"
      style={{ borderColor: C.goldBorder, background: C.goldBg }}
    >
      {groups.map((group) => {
        const allOn = group.labels.every((l) => selectedSet.has(l));
        const someOn = group.labels.some((l) => selectedSet.has(l));
        const isOpen = !!expanded[group.groupName];
        const groupId = `cls-grp-${group.groupName.replace(/\s+/g, "-")}`;

        return (
          <div key={group.groupName} className="rounded-lg">
            <div
              className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg transition-colors hover:bg-white/80"
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
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold transition-transform"
                  style={{
                    borderColor: C.goldBorder,
                    color: C.goldDark,
                    transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                  }}
                  title={isOpen ? "Hide streams" : "Show streams"}
                >
                  ▾
                </button>
              ) : (
                <span className="w-7 shrink-0" aria-hidden />
              )}

              <GroupCheckbox
                checked={allOn}
                indeterminate={someOn && !allOn}
                onChange={() => toggleGroup(group)}
              />

              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="flex-1 min-w-0 text-left text-sm font-semibold truncate"
              >
                {group.groupName}
                {group.hasStreams && (
                  <span className="ml-1.5 text-[10px] font-medium normal-case" style={{ color: C.darkMid }}>
                    ({group.labels.length} stream{group.labels.length === 1 ? "" : "s"})
                  </span>
                )}
              </button>
            </div>

            {group.hasStreams && isOpen && (
              <div id={`${groupId}-streams`} className="ml-9 space-y-0.5 border-l pl-2 mb-1" style={{ borderColor: C.goldBorder }}>
                {group.labels.map((label) => (
                  <label
                    key={label}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer text-[12px] font-semibold transition-colors hover:bg-white/80"
                    style={{ color: C.darkMid }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSet.has(label)}
                      onChange={() => toggleStream(label)}
                      className="size-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 shrink-0"
                    />
                    <span className="min-w-0 break-words">{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
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
