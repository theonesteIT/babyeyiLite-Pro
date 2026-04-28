const nodemailer = require('nodemailer');
const axios = require('axios');
const { promisePool } = require('../config/database');

let transportCached = null;

function getMailer() {
  if (transportCached !== null) return transportCached;
  if (!process.env.SMTP_USER) {
    transportCached = false;
    return null;
  }
  transportCached = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transportCached;
}

async function ensureNotificationTable() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_chat_notifications (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      thread_id INT UNSIGNED NOT NULL,
      message_id INT UNSIGNED NOT NULL,
      channel ENUM('EMAIL','SMS','PUSH') NOT NULL,
      recipient VARCHAR(255) NOT NULL,
      status ENUM('SENT','FAILED','SKIPPED') NOT NULL DEFAULT 'SKIPPED',
      provider_response TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_chat_notif_school (school_id),
      KEY idx_chat_notif_thread (thread_id),
      KEY idx_chat_notif_message (message_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function logNotification({ schoolId, threadId, messageId, channel, recipient, status, providerResponse }) {
  await promisePool.query(
    `INSERT INTO school_chat_notifications
     (school_id, thread_id, message_id, channel, recipient, status, provider_response)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [schoolId, threadId, messageId, channel, recipient, status, providerResponse || null]
  );
}

async function sendEmail(recipientEmail, payload) {
  const mailer = getMailer();
  if (!mailer || !recipientEmail) return { status: 'SKIPPED', response: 'SMTP not configured or no recipient' };
  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || `"Babyeyi Chat" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject: `New message from ${payload.senderName}`,
      text: `${payload.senderName} sent a new message:\n\n${payload.body}\n\nOpen chat center to reply.`,
    });
    return { status: 'SENT', response: 'Email delivered' };
  } catch (err) {
    return { status: 'FAILED', response: err.message };
  }
}

async function sendSms(recipientPhone, payload) {
  const endpoint = process.env.CHAT_SMS_WEBHOOK_URL || '';
  if (!endpoint || !recipientPhone) return { status: 'SKIPPED', response: 'SMS provider not configured or no phone' };
  try {
    const res = await axios.post(endpoint, {
      to: recipientPhone,
      message: `Babyeyi Chat: ${payload.senderName}: ${payload.body}`,
      school_id: payload.schoolId,
      thread_id: payload.threadId,
      message_id: payload.messageId,
    }, {
      headers: process.env.CHAT_SMS_WEBHOOK_TOKEN
        ? { Authorization: `Bearer ${process.env.CHAT_SMS_WEBHOOK_TOKEN}` }
        : undefined,
      timeout: 10000,
    });
    return { status: 'SENT', response: JSON.stringify(res.data || {}) };
  } catch (err) {
    return { status: 'FAILED', response: err.message };
  }
}

async function sendPush(recipientKey, payload) {
  const endpoint = process.env.CHAT_PUSH_WEBHOOK_URL || '';
  if (!endpoint || !recipientKey) return { status: 'SKIPPED', response: 'Push provider not configured' };
  try {
    const res = await axios.post(endpoint, {
      recipient: recipientKey,
      title: 'New chat message',
      body: `${payload.senderName}: ${payload.body}`,
      school_id: payload.schoolId,
      thread_id: payload.threadId,
      message_id: payload.messageId,
    }, {
      headers: process.env.CHAT_PUSH_WEBHOOK_TOKEN
        ? { Authorization: `Bearer ${process.env.CHAT_PUSH_WEBHOOK_TOKEN}` }
        : undefined,
      timeout: 10000,
    });
    return { status: 'SENT', response: JSON.stringify(res.data || {}) };
  } catch (err) {
    return { status: 'FAILED', response: err.message };
  }
}

async function resolveParticipantContacts(threadId, schoolId, senderType, senderUserId, senderParentPhone) {
  const [rows] = await promisePool.query(
    `SELECT p.participant_type, p.user_id, p.parent_phone,
            u.email AS user_email, u.first_name, u.last_name,
            pa.recovery_email AS parent_recovery_email
     FROM school_chat_participants p
     LEFT JOIN users u ON u.id = p.user_id
     LEFT JOIN parent_portal_accounts pa ON pa.phone = p.parent_phone
     WHERE p.thread_id = ? AND p.school_id = ?`,
    [threadId, schoolId]
  );
  return (rows || []).filter((p) => {
    if (senderType === 'USER' && p.participant_type === 'USER' && Number(p.user_id) === Number(senderUserId)) return false;
    if (senderType === 'PARENT' && p.participant_type === 'PARENT' && String(p.parent_phone || '') === String(senderParentPhone || '')) return false;
    return true;
  });
}

async function notifyNewChatMessage({
  schoolId,
  threadId,
  messageId,
  senderType,
  senderUserId,
  senderParentPhone,
  senderName,
  body,
}) {
  await ensureNotificationTable();
  const targets = await resolveParticipantContacts(threadId, schoolId, senderType, senderUserId, senderParentPhone);
  const payload = {
    schoolId,
    threadId,
    messageId,
    senderName: senderName || 'User',
    body: String(body || '').slice(0, 280),
  };

  for (const t of targets) {
    const emailTo = t.participant_type === 'USER' ? t.user_email : t.parent_recovery_email;
    const smsTo = t.participant_type === 'PARENT' ? t.parent_phone : null;
    const pushKey = t.participant_type === 'USER' ? `user:${t.user_id}` : `parent:${t.parent_phone}`;

    // EMAIL
    const emailRes = await sendEmail(emailTo, payload);
    await logNotification({
      schoolId, threadId, messageId, channel: 'EMAIL', recipient: emailTo || '-', status: emailRes.status, providerResponse: emailRes.response,
    });

    // SMS
    const smsRes = await sendSms(smsTo, payload);
    await logNotification({
      schoolId, threadId, messageId, channel: 'SMS', recipient: smsTo || '-', status: smsRes.status, providerResponse: smsRes.response,
    });

    // PUSH (webhook adapter)
    const pushRes = await sendPush(pushKey, payload);
    await logNotification({
      schoolId, threadId, messageId, channel: 'PUSH', recipient: pushKey, status: pushRes.status, providerResponse: pushRes.response,
    });
  }
}

module.exports = {
  notifyNewChatMessage,
};
