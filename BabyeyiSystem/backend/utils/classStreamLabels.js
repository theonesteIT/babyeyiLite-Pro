/** Backend mirror of frontend classStreamGroups — Babyeyi document class display. */

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

  if (parts.length === 2 && /^[PSN][1-6]?$/i.test(parts[0])) {
    return { classGrade: parts[0].toUpperCase(), stream: parts[1] };
  }

  return { classGrade: raw, stream: '' };
}

function uniqueClassGradesFromLabels(labels = []) {
  const grades = new Set();
  for (const raw of labels || []) {
    const s = String(raw || '').trim();
    if (!s) continue;
    const { classGrade } = parseClassAndStream(s);
    grades.add(classGrade || s);
  }
  return [...grades].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  );
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
