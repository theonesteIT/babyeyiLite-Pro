/** Education levels used in Babyeyi wizard, student registration, and NESA fee matching. */
export const EDUCATION_LEVEL_OPTIONS = [
  { id: "Nursery", label: "Nursery Level", short: "Nursery", nesaLevel: "Nursery" },
  { id: "Primary", label: "Primary Level", short: "Primary", nesaLevel: "Primary" },
  { id: "Secondary", label: "Secondary Level", short: "Secondary", nesaLevel: "Secondary" },
  { id: "TSS", label: "TSS (Technical Secondary School)", short: "TSS", nesaLevel: "TSS" },
];

/** Labels stored on Babyeyi / sent to NESA limit APIs (Nursery · Primary · Secondary · TSS). */
export const NESA_FEE_LIMIT_LEVELS = EDUCATION_LEVEL_OPTIONS.map((o) => o.nesaLevel);

export function normalizeEducationLevel(level) {
  const s = String(level || "").trim();
  if (!s) return "Primary";
  const lower = s.toLowerCase();
  if (lower.includes("nursery") || lower === "n1" || lower === "n2" || lower === "n3") return "Nursery";
  if (lower.includes("primary") || /^p[1-6]$/i.test(s)) return "Primary";
  if (lower.includes("secondary") && !lower.includes("technical") && !lower.includes("tss") && !lower.includes("tvet")) {
    return "Secondary";
  }
  if (lower.includes("tss") || lower.includes("tvet") || lower.includes("technical")) return "TSS";
  if (lower.includes("university") || /^l[1-3]$/i.test(s)) return "Secondary";
  if (["Nursery", "Primary", "Secondary", "TSS"].includes(s)) return s;
  return "Primary";
}

export function mapToNesaLimitLevel(educationLevel) {
  const norm = normalizeEducationLevel(educationLevel);
  const opt = EDUCATION_LEVEL_OPTIONS.find((o) => o.id === norm);
  return opt?.nesaLevel || norm;
}

/** Map class label (+ optional school_classes row) → Nursery | Primary | Secondary | TSS */
export function inferEducationLevelFromClass(label, row) {
  if (row?.education_level) return normalizeEducationLevel(row.education_level);
  if (row?.category && /tss|tvet|technical/i.test(String(row.category))) return "TSS";

  const raw = String(label || "").trim();
  if (!raw) return "Primary";
  const compact = raw.toUpperCase().replace(/[\s-]+/g, "");

  if (/^N[123]$|^NURSERY|^RECEPTION/.test(compact) || /\bN[123]\b/.test(raw.toUpperCase())) return "Nursery";
  if (/^P[1-6]$/.test(compact) || /\bP[1-6]\b/.test(raw.toUpperCase())) return "Primary";
  if (/^S[1-6]$/.test(compact) || /\bS[1-6]\b/.test(raw.toUpperCase())) return "Secondary";

  if (
    /^L[1-6][A-Z]{2,}/.test(compact) ||
    /\b(TSS|TVET|BDC|FBO|SOD|MECH|ELEC|ICT|HOTEL|AUTOM)\b/i.test(raw)
  ) {
    return "TSS";
  }
  if (/^L[1-6]/.test(compact)) return "TSS";

  return "Primary";
}

/** @deprecated use inferEducationLevelFromClass */
export function inferNesaFeeLimitLevelFromClass(label, row) {
  return mapToNesaLimitLevel(inferEducationLevelFromClass(label, row));
}

export function labelBelongsToLevel(label, levelId, rowsByLabel) {
  const row = rowsByLabel?.get?.(label);
  return inferEducationLevelFromClass(label, row) === normalizeEducationLevel(levelId);
}

export function buildClassRowMap(rows = [], labelOptions = []) {
  const map = new Map();
  for (const r of rows || []) {
    const parts = [r.group_name, r.stream_name, r.combination].filter(Boolean).map((p) => String(p).trim());
    const label = parts.join(" ").replace(/\s+/g, " ").trim();
    if (label) map.set(label, r);
  }
  for (const opt of labelOptions || []) {
    const s = String(opt || "").trim();
    if (s && !map.has(s)) map.set(s, null);
  }
  return map;
}

export function filterClassGroupsByLevel(groups = [], levelId, rowsByLabel) {
  const level = normalizeEducationLevel(levelId);
  if (!level) return groups;
  return groups
    .map((g) => ({
      ...g,
      labels: (g.labels || []).filter((l) => labelBelongsToLevel(l, level, rowsByLabel)),
    }))
    .filter((g) => g.labels?.length);
}

export function filterLabelsByLevel(labels = [], levelId, rowsByLabel) {
  const level = normalizeEducationLevel(levelId);
  return (labels || []).filter((l) => labelBelongsToLevel(l, level, rowsByLabel));
}

export function pruneSelectedToLevel(selected = [], levelId, catalogOrder = [], rowsByLabel) {
  const level = normalizeEducationLevel(levelId);
  const set = new Set(filterLabelsByLevel(selected, level, rowsByLabel));
  return catalogOrder.filter((c) => set.has(c));
}

export function levelsPresentInCatalog(labels = [], rows = []) {
  const merged = mergeWithDefaultClassCatalog(labels, rows);
  const rowsByLabel = buildClassRowMap(merged.rows, merged.options);
  const found = new Set();
  for (const label of merged.options || []) {
    found.add(inferEducationLevelFromClass(label, rowsByLabel.get(label)));
  }
  const fromData = EDUCATION_LEVEL_OPTIONS.filter((o) => found.has(o.id));
  return fromData.length ? fromData : EDUCATION_LEVEL_OPTIONS;
}

const PRIMARY_STREAMS = ["A", "B", "C"];

/** Standard Rwanda class labels — always available without School Registry setup. */
export function buildDefaultClassLabelsByLevel(levelId) {
  const level = normalizeEducationLevel(levelId);
  if (level === "Nursery") return ["N1", "N2", "N3"];

  if (level === "Primary") {
    const labels = [];
    for (let i = 1; i <= 6; i += 1) {
      labels.push(`P${i}`);
      for (const s of PRIMARY_STREAMS) labels.push(`P${i} ${s}`);
    }
    return labels;
  }

  if (level === "Secondary") {
    const labels = [];
    for (let i = 1; i <= 6; i += 1) {
      labels.push(`S${i}`);
      for (const s of PRIMARY_STREAMS) labels.push(`S${i} ${s}`);
    }
    return labels;
  }

  if (level === "TSS") {
    /** No static TSS list — trades come from registered/imported students. */
    return [];
  }

  return [];
}

export function buildAllDefaultClassLabels() {
  return EDUCATION_LEVEL_OPTIONS.flatMap((o) => buildDefaultClassLabelsByLevel(o.id));
}

/** Merge API classes with built-in defaults (defaults fill gaps — no registry required). */
export function mergeWithDefaultClassCatalog(apiOptions = [], apiRows = []) {
  const apiLabels = (apiOptions || []).map((x) => String(x || "").trim()).filter(Boolean);
  const defaultLabels = buildAllDefaultClassLabels();
  const options = [...new Set([...apiLabels, ...defaultLabels])].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  );

  const rows = [...(apiRows || [])];
  const existing = new Set(apiLabels);
  for (const label of defaultLabels) {
    if (existing.has(label)) continue;
    const space = label.indexOf(" ");
    let groupName = label;
    let streamName = null;
    if (space > 0) {
      groupName = label.slice(0, space);
      streamName = label.slice(space + 1);
    }
    rows.push({
      id: null,
      group_name: groupName,
      stream_name: streamName,
      category: inferEducationLevelFromClass(label),
      combination: null,
      _default_catalog: true,
    });
  }

  return {
    options,
    rows,
    hasApiClasses: apiLabels.length > 0,
  };
}

export function defaultClassPickerGroupsForLevel(levelId) {
  const labels = buildDefaultClassLabelsByLevel(levelId);
  const map = new Map();
  for (const label of labels) {
    const space = label.indexOf(" ");
    const dash = label.indexOf("-");
    let groupName = label;
    if (space > 0) groupName = label.slice(0, space);
    else if (dash > 0 && /^L[1-6]/i.test(label)) groupName = label.slice(0, dash);
    if (!map.has(groupName)) map.set(groupName, new Set());
    map.get(groupName).add(label);
  }
  return [...map.entries()].map(([groupName, labelSet]) => {
    const groupLabels = [...labelSet].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
    return {
      groupName,
      labels: groupLabels,
      hasStreams: groupLabels.length > 1 || (groupLabels.length === 1 && groupLabels[0] !== groupName),
    };
  });
}
