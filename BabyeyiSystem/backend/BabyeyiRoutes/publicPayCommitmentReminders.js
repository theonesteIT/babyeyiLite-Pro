'use strict';

const { runPublicPaymentCommitmentReminders } = require('./publicPaymentCommitments');

let timer = null;

function startPublicPayCommitmentReminderScheduler(intervalMs = 3_600_000) {
  if (timer) return;
  const tick = async () => {
    try {
      const r = await runPublicPaymentCommitmentReminders();
      if (r.sent > 0) {
        console.log(`[public-pay-commitments] sent ${r.sent} reminder(s)`);
      }
    } catch (e) {
      console.warn('[public-pay-commitments] scheduler:', e.message);
    }
  };
  void tick();
  timer = setInterval(tick, intervalMs);
}

module.exports = { startPublicPayCommitmentReminderScheduler };
