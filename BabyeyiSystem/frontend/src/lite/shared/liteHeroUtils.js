/** Manager-style hero subtitle: "FIRST LAST · SCHOOL NAME" */
export function liteHeroUserSubtitle(user) {
  const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  const school = user?.school?.name || user?.school_name || '';
  const parts = [name, school].filter(Boolean);
  return parts.length ? parts.join(' · ').toUpperCase() : '';
}
