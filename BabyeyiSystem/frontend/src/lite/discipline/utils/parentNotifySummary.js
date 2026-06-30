/** Summarize parent notification delivery from discipline marks API. */
export function formatParentNotifySummary(summary) {
  if (!summary || summary.error) return null;
  const parts = [];
  if (Number(summary.in_app?.sent) > 0) parts.push(`${summary.in_app.sent} in-app`);
  if (Number(summary.push?.sent) > 0) parts.push(`${summary.push.sent} push`);
  if (Number(summary.email?.sent) > 0) parts.push(`${summary.email.sent} email`);
  if (Number(summary.sms?.sent) > 0) parts.push(`${summary.sms.sent} SMS`);
  return parts.length ? parts.join(', ') : null;
}

export function readParentNotificationsFromMarksResponse(res) {
  const body = res?.data;
  return body?.parent_notifications ?? body?.data?.parent_notifications ?? null;
}

export function readParentNotificationsFromCaseResponse(res) {
  return readParentNotificationsFromMarksResponse(res);
}

export function mergeParentNotifySummaries(summaries = []) {
  const merged = {
    in_app: { sent: 0 },
    push: { sent: 0 },
    email: { sent: 0 },
    sms: { sent: 0, failed: 0, skipped: 0 },
  };
  for (const summary of summaries) {
    if (!summary) continue;
    merged.in_app.sent += Number(summary.in_app?.sent || 0);
    merged.push.sent += Number(summary.push?.sent || 0);
    merged.email.sent += Number(summary.email?.sent || 0);
    merged.sms.sent += Number(summary.sms?.sent || 0);
    merged.sms.failed += Number(summary.sms?.failed || 0);
    if (summary.sms?.skipped) merged.sms.skipped = summary.sms.skipped;
  }
  return merged;
}

export function conductCaseSmsMessage(summary) {
  const smsSent = Number(summary?.sms?.sent || 0);
  if (smsSent > 0) {
    return `SMS sent to ${smsSent} parent${smsSent === 1 ? '' : 's'}.`;
  }
  if (summary?.sms?.skipped === 'no_parent_phones') {
    return 'No parent phone numbers on file — SMS not sent.';
  }
  if (summary?.sms?.skipped === 'sms_not_configured') {
    return 'SMS is not configured on the server. Restart backend after adding AFROBULK_SMS_API_KEY to .env.';
  }
  if (summary?.sms?.skipped === 'sms_send_failed' || Number(summary?.sms?.failed || 0) > 0) {
    const err = trimStr(summary?.sms?.error);
    return err
      ? `SMS could not be sent (${err}). Check AfroBulk balance and sender ID.`
      : 'Could not deliver SMS to one or more parents. Check AfroBulk balance and sender ID.';
  }
  return null;
}

function trimStr(v) {
  return String(v ?? '').trim();
}

export function marksSavedNotifyMessage(action, summary) {
  if (action !== 'remove') return 'Marks updated successfully.';
  const smsLine = conductCaseSmsMessage(summary);
  if (smsLine) return `Marks updated. ${smsLine}`;
  const detail = formatParentNotifySummary(summary);
  if (detail) return `Marks updated. Parent notified (${detail}).`;
  return 'Marks updated. Parent notification sent (SMS / email / push / in-app where configured).';
}
