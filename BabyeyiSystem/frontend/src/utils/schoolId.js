/** School IDs may be 0 — use nullish/explicit checks, not truthy. */
export function normalizeSchoolId(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function hasSchoolId(value) {
  return normalizeSchoolId(value) != null;
}

export function schoolIdFromSessionUser(user) {
  if (!user || user === false) return null;
  return normalizeSchoolId(
    user?.school?.id ?? user?.school?.school_id ?? user?.school_id ?? null
  );
}

export function schoolNameFromSessionUser(user) {
  if (!user || user === false) return null;
  return user?.school?.name ?? user?.school?.school_name ?? user?.school_name ?? null;
}
