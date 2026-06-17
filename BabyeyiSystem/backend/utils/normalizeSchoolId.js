/**
 * School IDs may legitimately be 0 in legacy rows — never use truthy checks on school_id.
 */
function normalizeSchoolId(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function hasSchoolId(value) {
  return normalizeSchoolId(value) != null;
}

module.exports = { normalizeSchoolId, hasSchoolId };
