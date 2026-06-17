/** Combine grade (P1) and optional stream (A) → "P1 A". */
export function formatClassWithStream(classPart, streamPart) {
  const cls = String(classPart || "").trim();
  const stream = String(streamPart || "").trim();
  if (!cls) return "";
  if (!stream) return cls;
  return `${cls} ${stream}`.replace(/\s+/g, " ").trim();
}

/** Split stored label "P1 A" into { classBase, stream }. */
export function parseClassNameToParts(className) {
  const raw = String(className || "").trim();
  if (!raw) return { classBase: "", stream: "" };
  const space = raw.indexOf(" ");
  if (space > 0) {
    return { classBase: raw.slice(0, space), stream: raw.slice(space + 1).trim() };
  }
  return { classBase: raw, stream: "" };
}

/** Format one school_classes row the same way as GET /api/schools/:id/classes. */
export function formatSchoolClassRowLabel(r) {
  if (!r) return "";
  if (r._from_students) return String(r.group_name || "").trim();
  const stream =
    r.stream_name && String(r.stream_name).trim() !== "" ? String(r.stream_name).trim() : "";
  const parts = [r.group_name, stream].filter((p) => p != null && String(p).trim() !== "");
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Group registered classes by grade (P1, P2, S1…) with optional streams (P1 A, P1 B…).
 * @param {Array<{ group_name?: string, stream_name?: string, _from_students?: boolean }>} rows
 * @param {string[]} [labelOptions]
 */
export function buildClassGroupsFromRows(rows = [], labelOptions = []) {
  /** @type {Map<string, Set<string>>} */
  const map = new Map();

  const add = (groupName, label) => {
    const g = String(groupName || "").trim();
    const l = String(label || "").trim();
    if (!g || !l) return;
    if (!map.has(g)) map.set(g, new Set());
    map.get(g).add(l);
  };

  if (Array.isArray(rows) && rows.length) {
    for (const r of rows) {
      const groupName = String(r.group_name || "").trim();
      if (!groupName) continue;
      add(groupName, formatSchoolClassRowLabel(r));
    }
  }

  for (const opt of labelOptions) {
    const s = String(opt || "").trim();
    if (!s) continue;
    const space = s.indexOf(" ");
    const groupName = space > 0 ? s.slice(0, space) : s;
    add(groupName, s);
  }

  return [...map.entries()]
    .map(([groupName, labelSet]) => {
      const labels = [...labelSet].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
      );
      const hasStreams = labels.length > 1 || (labels.length === 1 && labels[0] !== groupName);
      return { groupName, labels, hasStreams };
    })
    .sort((a, b) =>
      a.groupName.localeCompare(b.groupName, undefined, { numeric: true, sensitivity: "base" })
    );
}
