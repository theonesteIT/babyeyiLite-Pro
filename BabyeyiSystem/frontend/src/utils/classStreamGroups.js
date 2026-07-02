/** Combine grade (P1) and optional stream (A) → "P1 A". */
export function formatClassWithStream(classPart, streamPart) {
  const cls = String(classPart || "").trim();
  const stream = String(streamPart || "").trim();
  if (!cls) return "";
  if (!stream) return cls;
  return `${cls} ${stream}`.replace(/\s+/g, " ").trim();
}

/** Split stored label into class grade + stream (N1 · P1 · S1 · L3 SOD · streams A/B/C). */
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

  const tssDash = raw.match(/^L([1-6])[\s-]+([A-Z]{2,})(?:[\s-]+([A-Z]))?$/i);
  if (tssDash) {
    return {
      classGrade: `L${tssDash[1]} ${tssDash[2].toUpperCase()}`,
      stream: tssDash[3] ? tssDash[3].toUpperCase() : "",
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

  if (parts.length === 2 && /^[NPS][1-6]$/i.test(parts[0])) {
    return { classGrade: parts[0].toUpperCase(), stream: parts[1].toUpperCase() };
  }

  if (/^L[1-6]\s+[A-Z]{2,}$/i.test(raw)) {
    return { classGrade: raw.replace(/\s+/g, " ").trim(), stream: "" };
  }

  return { classGrade: raw, stream: "" };
}

/** Canonical class key for documents — Nursery N1, Primary P1, Secondary S1, TSS L3 SOD. */
export function normalizeClassGradeKey(className) {
  const { classGrade } = parseClassAndStream(className);
  return String(classGrade || className || "").trim();
}

function classGradeSortKey(grade) {
  const s = String(grade || "").trim();
  const n = s.match(/^N([1-3])$/i);
  if (n) return `0-N-${n[1].padStart(2, "0")}`;
  const p = s.match(/^P([1-6])$/i);
  if (p) return `1-P-${p[1].padStart(2, "0")}`;
  const sec = s.match(/^S([1-6])$/i);
  if (sec) return `2-S-${sec[1].padStart(2, "0")}`;
  const tss = s.match(/^L([1-6])\s+(.+)$/i);
  if (tss) return `3-L-${tss[1].padStart(2, "0")}-${tss[2].toUpperCase()}`;
  return `9-${s.toUpperCase()}`;
}

function sortClassGradeKeys(grades = []) {
  return [...grades].sort((a, b) => classGradeSortKey(a).localeCompare(classGradeSortKey(b)));
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

/**
 * Collapse stored labels to unique class grades for Babyeyi documents (all levels).
 * Uses the same grouping as ClassStreamPicker: N1, P1, S1, L3 SOD — not every stream.
 */
export function uniqueClassGradesFromLabels(labels = []) {
  const list = (labels || []).map((x) => String(x || "").trim()).filter(Boolean);
  if (!list.length) return [];

  const selected = new Set(list);
  const groups = buildClassGroupsFromRows([], list);
  const grades = new Set();

  for (const g of groups) {
    if ((g.labels || []).some((l) => selected.has(l))) {
      grades.add(g.groupName);
    }
  }

  for (const s of list) {
    const inGroup = groups.some((g) => (g.labels || []).includes(s));
    if (!inGroup) {
      grades.add(normalizeClassGradeKey(s) || s);
    }
  }

  return sortClassGradeKeys([...grades]);
}

/** Comma-separated class grades for compact inline labels (view meta, list subtitles). */
export function formatBabyeyiDocumentClassLabel(labels = [], { max = 8 } = {}) {
  const grades = uniqueClassGradesFromLabels(labels);
  if (!grades.length) return "—";
  if (grades.length <= max) return grades.join(", ");
  return `${grades.slice(0, max).join(", ")} +${grades.length - max}`;
}

/** Modern chip row for print / PDF / download HTML headers. */
export function buildBabyeyiDocumentClassHeaderHtml(labels = [], labelText = "Class") {
  const grades = uniqueClassGradesFromLabels(labels);
  if (!grades.length) {
    return `<span style="font-size:14px;color:#64748b">—</span>`;
  }
  const chips = grades
    .map(
      (g) =>
        `<span style="display:inline-flex;align-items:center;padding:5px 12px;margin:2px;border-radius:999px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a5f;font-size:13px;font-weight:700;letter-spacing:.02em">${g}</span>`,
    )
    .join("");
  return `<div style="margin:8px 0 6px;padding:12px 16px;background:#f8fafc;border:2px solid #1e3a5f;border-radius:10px;display:inline-block;max-width:100%;box-sizing:border-box;text-align:center"><div style="font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">${labelText}</div><div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px">${chips}</div></div>`;
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
      classGradeSortKey(a.groupName).localeCompare(classGradeSortKey(b.groupName)),
    );
}
