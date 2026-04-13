// ================================================================
// Local-only children added by parent (demo until backend exists)
// ================================================================

const KEY = "babyeyi_parent_local_children";

function keyForParent(parentPhone) {
  const phone = String(parentPhone || "").trim();
  if (!phone) return KEY;
  return `${KEY}:${phone}`;
}

export function getLocalChildren(parentPhone = null) {
  try {
    const raw = localStorage.getItem(keyForParent(parentPhone));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalChildren(list, parentPhone = null) {
  localStorage.setItem(keyForParent(parentPhone), JSON.stringify(list));
}

export function addLocalChild({ childName, schoolName, grade, parentPhone = null }) {
  const name = String(childName || "").trim();
  if (!name) return getLocalChildren(parentPhone);
  const parts = name.split(/\s+/);
  const first_name = parts[0] || "Child";
  const last_name = parts.slice(1).join(" ") || "";
  const row = {
    id: `local-${Date.now()}`,
    first_name,
    last_name,
    school_name: String(schoolName || "").trim() || null,
    grade_label: String(grade || "").trim() || "P4",
    student_uid: null,
    _local: true,
  };
  const next = [...getLocalChildren(parentPhone), row];
  saveLocalChildren(next, parentPhone);
  return next;
}

export function normalizeChildForUi(c) {
  const classLabel =
    (typeof c?.class_name === "string" && c.class_name.trim()) ||
    (typeof c?.grade_label === "string" && c.grade_label.trim()) ||
    "P4";
  return {
    ...c,
    displayGrade: classLabel,
    schoolLabel: c.school_name || "School TBD",
  };
}
