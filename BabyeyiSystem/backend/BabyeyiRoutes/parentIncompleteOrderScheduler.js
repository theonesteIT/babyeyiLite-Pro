'use strict';

/**
 * Sends incomplete-order reminders (7 / 14 / 21 days) and deletes rows after 25 days.
 */

const { runIncompleteOrderSchedulerTick } = require('./parentIncompleteOrderService');

let timer = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const summary = await runIncompleteOrderSchedulerTick();
    if (summary.reminders > 0 || summary.deleted > 0) {
      console.log(
        `[incomplete-order-scheduler] reminders=${summary.reminders} deleted=${summary.deleted}`
      );
    }
  } catch (err) {
    console.error('[incomplete-order-scheduler]', err.message);
  } finally {
    running = false;
  }
}

function startParentIncompleteOrderScheduler(intervalMs = 3600_000) {
  if (timer) return;
  const ms = Math.max(60_000, Number(intervalMs) || 3600_000);
  void tick();
  timer = setInterval(() => void tick(), ms);
}

function stopParentIncompleteOrderScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  startParentIncompleteOrderScheduler,
  stopParentIncompleteOrderScheduler,
  tick,
};
