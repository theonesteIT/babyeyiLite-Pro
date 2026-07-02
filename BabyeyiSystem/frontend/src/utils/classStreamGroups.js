/** Combine grade (P1) and optional stream (A) → "P1 A". */
export function formatClassWithStream(classPart, streamPart) {
  const cls = String(classPart || "").trim();
  const stream = String(streamPart || "").trim();
  if (!cls) return "";
  if (!stream) return cls;
  return `${cls} ${stream}`.replace(/\s+/g, " ").trim();
}

/** Split stored label into class grade + stream (e.g. "L3 SOD A" → L3 SOD / A). */
export function parseClassAndStream(className) {
  const raw = String(className || "").trim();
  if (!raw) return { classGrade: "", stream: "" };

  const legacy = raw.match(/^L([1-6])\s*([A-Z]{2,})\s*-\s*([A-Z])$/i)
    || raw.match(/^L([1-6])([A-Z]{2,})-([A-Z])$/i);
  if (legacy) {
    return {
      classGrade: `L${legacy[1]} ${legacy[2].toUpperCase()}`,
      stream: legacy[3].toUpperCase(),
    };
  }

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (/^[A-Z]$/i.test(last)) {
      return {
        classGrade: parts.slice(0, -1).join(" "),
        stream: last.toUpperCase(),
      };
    }
  }

  if (parts.length === 2 && /^[PSN][1-6]?$/i.test(parts[0])) {
    return { classGrade: parts[0].toUpperCase(), stream: parts[1] };
  }

  return { classGrade: raw, stream: "" };
}

/** @deprecated use parseClassAndStream */
export function parseClassNameToParts(className) {
  const { classGrade, stream } = parseClassAndStream(className);
  return { classBase: classGrade, stream };
}

/** Human-readable: Class L3 SOD · Stream A */
export function formatClassStreamDisplay(className) {
  const { classGrade, stream } = parseClassAndStream(className);
  if (!classGrade) return "—";
  if (!stream) return classGrade;
  return `Class ${classGrade} · Stream ${stream}`;
}

/** Normalize student-only rows into group_name + stream_name for grouping. */
export function normalizeRegisteredClassRow(r) {
  if (!r || !r._from_students) return r;
  const raw = String(r.group_name || "").trim();
  const { classGrade, stream } = parseClassAndStream(raw);
  return {
    ...r,
    group_name: classGrade || raw,
    stream_name: stream || null,
  };
}

/** Format one school_classes row the same way as GET /api/schools/:id/classes. */
export function formatSchoolClassRowLabel(r) {
  if (!r) return "";
  if (r._from_students) {
    const raw = String(r.group_name || "").trim();
    const { classGrade, stream } = parseClassAndStream(raw);
    return formatClassWithStream(classGrade, stream) || raw;
  }
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
      const row = normalizeRegisteredClassRow(r);
      const groupName = String(row.group_name || "").trim();
      if (!groupName) continue;
      add(groupName, formatSchoolClassRowLabel(row));
    }
  }

  for (const opt of labelOptions) {
    const s = String(opt || "").trim();
    if (!s) continue;
    const { classGrade } = parseClassAndStream(s);
    const groupName = classGrade || s;
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
