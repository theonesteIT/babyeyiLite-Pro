/** Backend mirror of frontend classStreamGroups — Babyeyi document class display (all levels). */

function parseClassAndStream(className) {
  const raw = String(className || '').trim();
  if (!raw) return { classGrade: '', stream: '' };

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
      stream: tssDash[3] ? tssDash[3].toUpperCase() : '',
    };
  }

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (/^[A-Z]$/i.test(last)) {
      return {
        classGrade: parts.slice(0, -1).join(' '),
        stream: last.toUpperCase(),
      };
    }
  }

  if (parts.length === 2 && /^[NPS][1-6]$/i.test(parts[0])) {
    return { classGrade: parts[0].toUpperCase(), stream: parts[1].toUpperCase() };
  }

  if (/^L[1-6]\s+[A-Z]{2,}$/i.test(raw)) {
    return { classGrade: raw.replace(/\s+/g, ' ').trim(), stream: '' };
  }

  return { classGrade: raw, stream: '' };
}

function normalizeClassGradeKey(className) {
  const { classGrade } = parseClassAndStream(className);
  return String(classGrade || className || '').trim();
}

function classGradeSortKey(grade) {
  const s = String(grade || '').trim();
  const n = s.match(/^N([1-3])$/i);
  if (n) return `0-N-${n[1].padStart(2, '0')}`;
  const p = s.match(/^P([1-6])$/i);
  if (p) return `1-P-${p[1].padStart(2, '0')}`;
  const sec = s.match(/^S([1-6])$/i);
  if (sec) return `2-S-${sec[1].padStart(2, '0')}`;
  const tss = s.match(/^L([1-6])\s+(.+)$/i);
  if (tss) return `3-L-${tss[1].padStart(2, '0')}-${tss[2].toUpperCase()}`;
  return `9-${s.toUpperCase()}`;
}

function sortClassGradeKeys(grades = []) {
  return [...grades].sort((a, b) => classGradeSortKey(a).localeCompare(classGradeSortKey(b)));
}

function buildClassGroupsFromLabels(labelOptions = []) {
  const map = new Map();
  const add = (groupName, label) => {
    const g = String(groupName || '').trim();
    const l = String(label || '').trim();
    if (!g || !l) return;
    if (!map.has(g)) map.set(g, new Set());
    map.get(g).add(l);
  };

  for (const opt of labelOptions) {
    const s = String(opt || '').trim();
    if (!s) continue;
    const { classGrade } = parseClassAndStream(s);
    add(classGrade || s, s);
  }

  return [...map.entries()].map(([groupName, labelSet]) => ({
    groupName,
    labels: [...labelSet],
  }));
}

function uniqueClassGradesFromLabels(labels = []) {
  const list = (labels || []).map((x) => String(x || '').trim()).filter(Boolean);
  if (!list.length) return [];

  const selected = new Set(list);
  const groups = buildClassGroupsFromLabels(list);
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

function formatBabyeyiDocumentClassLabel(labels = [], { max = 8 } = {}) {
  const grades = uniqueClassGradesFromLabels(labels);
  if (!grades.length) return '—';
  if (grades.length <= max) return grades.join(', ');
  return `${grades.slice(0, max).join(', ')} +${grades.length - max}`;
}

function buildBabyeyiDocumentClassHeaderHtml(labels = [], labelText = 'Class', esc = (s) => s) {
  const grades = uniqueClassGradesFromLabels(labels);
  if (!grades.length) {
    return `<span style="font-size:14px;color:#64748b">—</span>`;
  }
  const chips = grades
    .map(
      (g) =>
        `<span style="display:inline-flex;align-items:center;padding:5px 12px;margin:2px;border-radius:999px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a5f;font-size:13px;font-weight:700;letter-spacing:.02em">${esc(g)}</span>`,
    )
    .join('');
  return `<div style="margin:8px 0 6px;padding:12px 16px;background:#f8fafc;border:2px solid #1e3a5f;border-radius:10px;display:inline-block;max-width:100%;box-sizing:border-box;text-align:center"><div style="font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">${esc(labelText)}</div><div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px">${chips}</div></div>`;
}

module.exports = {
  uniqueClassGradesFromLabels,
  formatBabyeyiDocumentClassLabel,
  buildBabyeyiDocumentClassHeaderHtml,
};
