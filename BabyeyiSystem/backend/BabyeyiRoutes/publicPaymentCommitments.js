'use strict';

const express = require('express');
const { promisePool } = require('../config/database');
const { ensurePublicPaymentCommitmentsSchema } = require('../utils/publicPaymentCommitmentsSchema');
const { buildRemainPayHref, FEE_REMINDER_PAY_PATH } = require('../utils/publicPayDeepLink');
const { collectParentPhonesForStudent } = require('./parentWebPush');
const { insertParentPortalNotification } = require('./parentStudentNotifications');
const { sendWebPushToParentPhones, isWebPushConfigured } = require('./parentWebPush');
const { sendWebPushToStudentCode } = require('./publicGuestWebPush');

const router = express.Router();

function roundMoney(x) {
  return Math.round(Number(x || 0) * 100) / 100;
}

function normalizePhone(raw) {
  const s = String(raw || '').replace(/\s+/g, '').trim();
  if (!s) return '';
  if (s.startsWith('+250')) return s;
  if (s.startsWith('250') && s.length >= 12) return `+${s}`;
  if (s.startsWith('07') && s.length === 10) return `+250${s.slice(1)}`;
  return s;
}

function daysUntil(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / (24 * 60 * 60 * 1000));
}

/** POST /api/public/babyeyi-pay/payment-commitment */
router.post('/payment-commitment', async (req, res) => {
  try {
    await ensurePublicPaymentCommitmentsSchema();
    const b = req.body || {};
    const schoolId = parseInt(b.school_id, 10);
    const babyeyiId = parseInt(b.babyeyi_id, 10);
    const promiseDate = String(b.promise_date || '').trim().slice(0, 10);
    const totalDue = roundMoney(b.total_due_rwf);
    const amountPayNow = roundMoney(b.amount_pay_now_rwf);
    const remaining = roundMoney(b.remaining_rwf ?? Math.max(0, totalDue - amountPayNow));

    if (!schoolId || !Number.isFinite(babyeyiId) || babyeyiId < 0) {
      return res.status(400).json({ success: false, message: 'school_id and babyeyi_id are required' });
    }
    if (!promiseDate || !/^\d{4}-\d{2}-\d{2}$/.test(promiseDate)) {
      return res.status(400).json({ success: false, message: 'promise_date (YYYY-MM-DD) is required' });
    }
    if (remaining <= 0) {
      return res.status(400).json({ success: false, message: 'remaining_rwf must be greater than 0 for a commitment' });
    }
    const days = daysUntil(promiseDate);
    if (days == null || days < 1) {
      return res.status(400).json({ success: false, message: 'Promise date must be at least tomorrow' });
    }

    const payPath = String(b.pay_path || FEE_REMINDER_PAY_PATH).trim() || FEE_REMINDER_PAY_PATH;
    const studentId = b.student_id != null ? parseInt(b.student_id, 10) : null;
    const parentPhone = normalizePhone(b.parent_phone);
    const payload = {
      selected_fee_ids: b.selected_fee_ids || [],
      selected_requirement_ids: b.selected_requirement_ids || [],
      amount_pay_now_rwf: amountPayNow,
    };

    const [ins] = await promisePool.query(
      `INSERT INTO public_payment_commitments (
        school_id, babyeyi_id, student_id, student_code, student_name, class_name,
        academic_year, term, parent_phone, pay_path,
        total_due_rwf, amount_paid_rwf, remaining_rwf, promise_date, days_until_promise,
        status, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        schoolId,
        babyeyiId,
        studentId || null,
        String(b.student_code || '').trim() || null,
        String(b.student_name || '').trim() || null,
        String(b.class_name || '').trim() || null,
        String(b.academic_year || '').trim() || null,
        String(b.term || '').trim() || null,
        parentPhone || null,
        payPath,
        totalDue,
        0,
        remaining,
        promiseDate,
        days,
        JSON.stringify(payload),
      ]
    );

    return res.json({
      success: true,
      data: { commitment_id: ins.insertId, promise_date: promiseDate, days_until_promise: days },
    });
  } catch (err) {
    console.error('[public/payment-commitment]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to save commitment' });
  }
});

/** PATCH /api/public/babyeyi-pay/payment-commitment/:id/record-payment */
router.patch('/payment-commitment/:id/record-payment', async (req, res) => {
  try {
    await ensurePublicPaymentCommitmentsSchema();
    const id = parseInt(req.params.id, 10);
    const paid = roundMoney(req.body?.amount_paid_rwf);
    const intentId = req.body?.payment_intent_id != null ? parseInt(req.body.payment_intent_id, 10) : null;
    const parentPhone = normalizePhone(req.body?.parent_phone);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid commitment id' });

    const [[row]] = await promisePool.query(
      `SELECT * FROM public_payment_commitments WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Commitment not found' });

    const newPaid = roundMoney(Number(row.amount_paid_rwf || 0) + paid);
    const newRemain = roundMoney(Math.max(0, Number(row.total_due_rwf || 0) - newPaid));
    const status = newRemain <= 0 ? 'fulfilled' : 'active';

    await promisePool.query(
      `UPDATE public_payment_commitments
       SET amount_paid_rwf = ?, remaining_rwf = ?, status = ?,
           payment_intent_id = COALESCE(?, payment_intent_id),
           parent_phone = COALESCE(?, parent_phone),
           updated_at = NOW()
       WHERE id = ?`,
      [newPaid, newRemain, status, intentId || null, parentPhone || null, id]
    );

    return res.json({ success: true, data: { remaining_rwf: newRemain, status } });
  } catch (err) {
    console.error('[public/payment-commitment/record-payment]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update commitment' });
  }
});

async function sendCommitmentReminder(row) {
  const remain = roundMoney(row.remaining_rwf);
  if (remain <= 0) return { sent: false, reason: 'no_balance' };

  const studentName = String(row.student_name || 'your child').trim();
  const payPath = row.pay_path || FEE_REMINDER_PAY_PATH;
  const payUrl = buildRemainPayHref(payPath, {
    code: row.student_code,
    remain,
    year: row.academic_year,
    term: row.term,
    babyeyiId: row.babyeyi_id,
  });

  const totalDue = roundMoney(row.total_due_rwf);
  const paid = roundMoney(row.amount_paid_rwf);
  const days = daysUntil(row.promise_date);
  const promiseLabel = String(row.promise_date || '').trim();

  let title;
  let body;
  if (days === 0) {
    title = `Promise date reached — ${studentName}`;
    body = `Today (${promiseLabel}) is your promise date. Remaining: ${remain.toLocaleString()} RWF. Please pay the full balance now.`;
  } else if (days != null && days < 0) {
    title = `Overdue fees — ${studentName}`;
    body = `Your promise date (${promiseLabel}) has passed. Remaining: ${remain.toLocaleString()} RWF. Please pay all outstanding fees now.`;
  } else {
    title = `Fee reminder — ${studentName}`;
    const daysLabel = days == null ? '' : `${days} day(s) until your promise date (${promiseLabel}).`;
    body = `Total: ${totalDue.toLocaleString()} RWF · Paid: ${paid.toLocaleString()} RWF · Remaining: ${remain.toLocaleString()} RWF. ${daysLabel} Tap to pay.`;
  }

  const phones = new Set();
  const explicit = normalizePhone(row.parent_phone);
  if (explicit) phones.add(explicit);
  if (row.student_id) {
    for (const p of await collectParentPhonesForStudent(row.student_id)) {
      phones.add(p);
    }
  }

  let pushSent = 0;
  const pushPayload = { title, body: body.slice(0, 240), tag: `pay-commit-${row.id}`, url: payUrl };
  if (isWebPushConfigured() && phones.size) {
    const r = await sendWebPushToParentPhones([...phones], pushPayload, { category: 'fee_reminders' });
    pushSent += Number(r.sent || 0);
  }
  if (row.student_code) {
    const gr = await sendWebPushToStudentCode(row.student_code, pushPayload, { category: 'fee_reminders' });
    pushSent += Number(gr.sent || 0);
  }

  for (const phone of phones) {
    await insertParentPortalNotification({
      targetPhone: phone,
      studentId: row.student_id,
      type: 'FEE_PAYMENT_COMMITMENT',
      title,
      body,
      payload: {
        commitment_id: row.id,
        total_due_rwf: totalDue,
        amount_paid_rwf: paid,
        remaining_rwf: remain,
        promise_date: row.promise_date,
        pay_url: payUrl,
        student_name: studentName,
        school_id: row.school_id,
        class_name: row.class_name,
        academic_year: row.academic_year,
        term: row.term,
      },
    }).catch(() => false);
  }

  await promisePool.query(
    `UPDATE public_payment_commitments SET last_reminder_at = NOW() WHERE id = ?`,
    [row.id]
  );

  return { sent: true, pushSent, phones: phones.size };
}

/** Daily reminder runner — called from scheduler (once per ~24h per commitment). */
async function runPublicPaymentCommitmentReminders() {
  await ensurePublicPaymentCommitmentsSchema();
  const [rows] = await promisePool.query(
    `SELECT * FROM public_payment_commitments
     WHERE status = 'active'
       AND remaining_rwf > 0
       AND (
         last_reminder_at IS NULL
         OR last_reminder_at < DATE_SUB(NOW(), INTERVAL 20 HOUR)
       )
     ORDER BY promise_date ASC, id ASC
     LIMIT 200`
  );

  let sent = 0;
  for (const row of rows || []) {
    try {
      const r = await sendCommitmentReminder(row);
      if (r.sent) sent += 1;
    } catch (e) {
      console.warn('[public-pay-commitment-reminder]', row.id, e.message);
    }
  }

  return { checked: (rows || []).length, sent };
}

module.exports = router;
module.exports.runPublicPaymentCommitmentReminders = runPublicPaymentCommitmentReminders;
