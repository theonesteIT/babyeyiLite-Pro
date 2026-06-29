/** Summarize parent notification delivery from discipline marks API. */
export function formatParentNotifySummary(summary) {
  if (!summary || summary.error) return null;
  const parts = [];
  if (Number(summary.in_app?.sent) > 0) parts.push(`${summary.in_app.sent} in-app`);
  if (Number(summary.push?.sent) > 0) parts.push(`${summary.push.sent} push`);
  if (Number(summary.email?.sent) > 0) parts.push(`${summary.email.sent} email`);
  return parts.length ? parts.join(', ') : null;
}

export function readParentNotificationsFromMarksResponse(res) {
  const body = res?.data;
  return body?.parent_notifications ?? body?.data?.parent_notifications ?? null;
}

export function marksSavedNotifyMessage(action, summary) {
  if (action !== 'remove') return 'Marks updated successfully.';
  const detail = formatParentNotifySummary(summary);
  if (detail) return `Marks updated. Parent notified (${detail}).`;
  return 'Marks updated. Parent notification sent (email / push / in-app where configured).';
}
