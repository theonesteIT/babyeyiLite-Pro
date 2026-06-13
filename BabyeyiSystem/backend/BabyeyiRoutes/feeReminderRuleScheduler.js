'use strict';

/**
 * Executes school_fee_reminder_rules on a schedule (daily / weekly / etc.).
 * Started from server.js — checks every 60 seconds for rules due at send_time.
 */

const { promisePool } = require('../config/database');

const CONDITION_EXAMPLES = [
  { condition: 'Balance > 0', meaning: 'Any student with money still owed' },
  { condition: 'Balance < 400000', meaning: 'Outstanding balance under 400,000 RWF' },
  { condition: 'Balance >= 50000', meaning: 'Owes at least 50,000 RWF' },
  { condition: 'Status = unpaid', meaning: 'Not paid at all (fee card)' },
  { condition: 'Status = partial', meaning: 'Partially paid' },
  { condition: 'Overdue > 7 days', meaning: 'No payment for more than 7 days' },
  { condition: 'Overdue >= 15 days', meaning: 'Seriously overdue (15+ days)' },
  { condition: 'Small balance', meaning: 'Balance between 1 and 49,999 RWF' },
];

const TEMPLATE_PRESETS = {
  gentle: {
    subject: 'Friendly Reminder – School Fees',
    body:
      'Dear {ParentName},\n\nThis is a gentle reminder that {StudentName} has an outstanding balance of {Balance} RWF for {Class}.\n\nKindly pay at the school office or via the parent portal.\n\nThank you,\n{SchoolName}',
  },
  urgent: {
    subject: 'URGENT: Outstanding Fees – Action Required',
    body:
      'Dear {ParentName},\n\n{StudentName} has an outstanding balance of {Balance} RWF. Payment is overdue. Please settle before {Deadline}.\n\n{SchoolName}',
  },
  final: {
    subject: 'FINAL NOTICE – Immediate Payment Required',
    body:
      'Dear {ParentName},\n\nFINAL NOTICE: {StudentName} owes {Balance} RWF. Pay before {Deadline} to avoid disruption.\n\n{SchoolName} Administration',
  },
  exam: {
    subject: 'Exam Access – Fee Clearance Required',
    body:
      'Dear {ParentName},\n\nExam access for {StudentName} ({Class}) requires clearing {Balance} RWF before {Deadline}.\n\n{SchoolName}',
  },
  pta: {
    subject: 'PTA Contribution Reminder',
    body: 'Dear {ParentName},\n\nPTA contribution of {Balance} RWF is due for {StudentName} before {Deadline}.\n\n{SchoolName} PTA',
  },
  transport: {
    subject: 'Transport Fees – Balance Remaining',
    body:
      'Dear {ParentName},\n\nTransport balance for {StudentName} is {Balance} RWF. Please pay before {Deadline}.\n\n{SchoolName}',
  },
};

let schedulerTimer = null;
let runnerDeps = null;

function trimStr(v) {
  return String(v ?? '').trim();
}

function normalizeOp(op) {
  const o = String(op || '').trim();
  if (o === '>' || o === '>=') return o;
  if (o === '<' || o === '<=') return o;
  if (o === '=' || o === '==') return '=';
  return o;
}

function parseRuleCondition(text) {
  const s = trimStr(text).replace(/\s+/g, ' ');
  if (!s) return null;

  let m = s.match(/^overdue\s*([><=]+)\s*(\d+)\s*(?:days?)?$/i);
  if (m) return { type: 'overdue', op: normalizeOp(m[1]), value: Number(m[2]) };

  m = s.match(/^balance\s*([><=]+)\s*([\d,\s]+)$/i);
  if (m) return { type: 'balance', op: normalizeOp(m[1]), value: Number(String(m[2]).replace(/[,\s]/g, '')) };

  m = s.match(/^status\s*=\s*(unpaid|partial|paid|no_fee)$/i);
  if (m) return { type: 'status', op: '=', value: m[1].toLowerCase() };

  if (/^small\s*balance$/i.test(s)) return { type: 'small_balance' };

  return null;
}

function compareNumeric(actual, op, target) {
  if (op === '>') return actual > target;
  if (op === '>=') return actual >= target;
  if (op === '<') return actual < target;
  if (op === '<=') return actual <= target;
  if (op === '=') return actual === target;
  return false;
}

function studentMatchesCondition(student, cond) {
  if (!cond) return false;
  if (cond.type === 'balance') {
    const bal = student.balance == null ? null : Number(student.balance);
    if (bal == null || Number.isNaN(bal)) return false;
    return compareNumeric(bal, cond.op, cond.value);
  }
  if (cond.type === 'overdue') {
    const days = Number(student.overdue_days || 0);
    return compareNumeric(days, cond.op, cond.value);
  }
  if (cond.type === 'status') {
    return String(student.status || '').toLowerCase() === cond.value;
  }
  if (cond.type === 'small_balance') {
    const bal = student.balance == null ? null : Number(student.balance);
    return bal != null && bal > 0 && bal < 50000;
  }
  return false;
}

function studentMatchesRule(student, conditionText, extraText) {
  const main = parseRuleCondition(conditionText);
  if (!main) return false;
  if (!studentMatchesCondition(student, main)) return false;
  const extra = trimStr(extraText);
  if (!extra) return true;
  const extraCond = parseRuleCondition(extra);
  if (!extraCond) return true;
  return studentMatchesCondition(student, extraCond);
}

function mapActionToTemplateKey(actionText) {
  const s = trimStr(actionText).toLowerCase();
  if (s.includes('final')) return 'final';
  if (s.includes('urgent')) return 'urgent';
  if (s.includes('exam')) return 'exam';
  if (s.includes('pta')) return 'pta';
  if (s.includes('transport')) return 'transport';
  return 'gentle';
}

function formatRuleSendTime(raw) {
  const t = trimStr(raw);
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function minutesOfDay(d) {
  return d.getHours() * 60 + d.getMinutes();
}

function isSendTimeDue(sendTime, now, windowMinutes = 3) {
  const t = formatRuleSendTime(sendTime);
  if (!t) return false;
  const [h, min] = t.split(':').map((x) => parseInt(x, 10));
  const target = h * 60 + min;
  const current = minutesOfDay(now);
  return Math.abs(current - target) <= windowMinutes;
}

function isFrequencyDue(frequency, lastSentAt, now) {
  const freq = trimStr(frequency).toLowerCase();
  const last = lastSentAt ? new Date(lastSentAt) : null;

  if (freq === 'once' || freq === 'one time') {
    return !last;
  }
  if (freq.includes('daily')) {
    if (!last) return true;
    return last.toDateString() !== now.toDateString();
  }
  if (freq.includes('twice per week')) {
    if (!last) return true;
    const daysSince = (now.getTime() - last.getTime()) / 86400000;
    if (daysSince < 3) return false;
    const dow = now.getDay();
    return dow === 1 || dow === 4;
  }
  if (freq.includes('once per week') || freq === 'weekly' || freq.includes('week')) {
    if (!last) return true;
    return now.getTime() - last.getTime() >= 7 * 86400000;
  }
  if (freq.includes('monthly')) {
    if (!last) return true;
    return now.getTime() - last.getTime() >= 28 * 86400000;
  }
  if (freq.includes('3 days before')) {
    if (!last) return true;
    return now.getTime() - last.getTime() >= 3 * 86400000;
  }
  if (!last) return true;
  return now.getTime() - last.getTime() >= 86400000;
}

function parseRuleChannelsJson(channelsJson) {
  let arr = [];
  try {
    arr = channelsJson
      ? Array.isArray(channelsJson)
        ? channelsJson
        : JSON.parse(channelsJson)
      : [];
  } catch (_) {
    arr = [];
  }
  if (!arr.length) return ['email', 'push', 'in_system'];
  if (arr.includes('email') && arr.includes('push') && arr.includes('in_system')) {
    return ['email', 'push', 'in_system'];
  }
  return arr.filter((c) => ['email', 'push', 'in_system', 'sms'].includes(c));
}

function initFeeReminderRuleRunner(deps) {
  runnerDeps = deps;
}

async function ensureRuleRunTable() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_fee_reminder_rule_runs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      rule_id INT UNSIGNED NOT NULL,
      campaign_id INT UNSIGNED NULL,
      students_matched INT UNSIGNED NOT NULL DEFAULT 0,
      reached_count INT UNSIGNED NOT NULL DEFAULT 0,
      delivered_count INT UNSIGNED NOT NULL DEFAULT 0,
      failed_count INT UNSIGNED NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'sent',
      error_message VARCHAR(255) NULL,
      ran_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_rrr_rule (rule_id),
      KEY idx_rrr_school (school_id, ran_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool
    .query(
      `ALTER TABLE school_fee_reminder_campaigns
       ADD COLUMN trigger_rule_id INT UNSIGNED NULL`
    )
    .catch(() => {});
}

function ruleRequiresFeeCard(ruleRow) {
  if (ruleRow.require_fee_card === 0 || ruleRow.require_fee_card === false) return false;
  return true;
}

/** Load students for a rule's academic year, term, class, and fee-card scope. */
async function buildRuleTargetStudents(ruleRow) {
  if (!runnerDeps) throw new Error('Rule runner not initialized');
  const schoolId = Number(ruleRow.school_id);
  const calendar = await runnerDeps.loadSchoolAcademicCalendar(schoolId);
  const now = new Date();
  const academicYear =
    trimStr(ruleRow.academic_year) ||
    calendar.currentAcademicYear ||
    runnerDeps.inferAcademicYearFromDate(now);
  const term =
    trimStr(ruleRow.term) ||
    calendar.defaultTerm ||
    runnerDeps.inferTermFromMonth(calendar.terms, now);
  const className = trimStr(ruleRow.class_name);
  const classLabel = !className || className.toLowerCase() === 'all' ? 'All' : className;
  const requireFeeCard = ruleRequiresFeeCard(ruleRow);

  const buildOpts = {};
  if (classLabel !== 'All') buildOpts.class_name = classLabel;

  let payload = await runnerDeps.buildReminderStudents(schoolId, academicYear, term, buildOpts);
  payload.students = await runnerDeps.enrichStudentsWithPushFlag(payload.students);

  const withFeeCard = payload.students.filter((s) => s.status !== 'no_fee');
  let inScope = requireFeeCard ? withFeeCard : payload.students;
  const matched = inScope.filter((s) =>
    studentMatchesRule(s, ruleRow.condition_text, ruleRow.extra_condition)
  );

  return {
    schoolId,
    academicYear,
    term,
    className: classLabel,
    requireFeeCard,
    totalStudents: payload.students.length,
    withFeeCardCount: withFeeCard.length,
    inScopeCount: inScope.length,
    matched,
    class_names: payload.class_names || [],
  };
}

async function executeReminderRule(ruleRow, opts = {}) {
  if (!runnerDeps) throw new Error('Rule runner not initialized');
  const force = !!opts.force;
  const now = opts.now || new Date();

  if (!Number(ruleRow.is_active) && !force) {
    return { skipped: true, reason: 'Rule is inactive' };
  }

  const sendTime = formatRuleSendTime(ruleRow.send_time);
  if (!sendTime) {
    return { skipped: true, reason: 'No send time configured' };
  }

  if (!force) {
    if (!isSendTimeDue(sendTime, now)) {
      return { skipped: true, reason: 'Not within send time window' };
    }
    if (!isFrequencyDue(ruleRow.frequency, ruleRow.last_sent_at, now)) {
      return { skipped: true, reason: 'Frequency not due yet' };
    }
  }

  const mainCond = parseRuleCondition(ruleRow.condition_text);
  if (!mainCond) {
    return { skipped: true, reason: 'Invalid IF condition — edit the rule' };
  }

  const scope = await buildRuleTargetStudents(ruleRow);
  const targets = scope.matched;
  const schoolId = scope.schoolId;

  if (!targets.length) {
    await promisePool.query(
      `UPDATE school_fee_reminder_rules SET last_sent_at = ?, last_reached_count = 0 WHERE id = ?`,
      [now, ruleRow.id]
    );
    await ensureRuleRunTable();
    await promisePool.query(
      `INSERT INTO school_fee_reminder_rule_runs
        (school_id, rule_id, students_matched, reached_count, status, error_message)
       VALUES (?, ?, 0, 0, 'no_match', 'No students matched conditions')`,
      [schoolId, ruleRow.id]
    );
    return {
      skipped: false,
      matched: 0,
      reached: 0,
      message: 'No students matched',
      academic_year: scope.academicYear,
      term: scope.term,
      class_name: scope.className,
      total_in_scope: scope.inScopeCount,
      with_fee_card: scope.withFeeCardCount,
    };
  }

  const [[schoolRow]] = await promisePool.query(
    'SELECT COALESCE(school_name, name) AS name FROM schools WHERE id = ? LIMIT 1',
    [schoolId]
  ).catch(() => [[{ name: 'School' }]]);
  const schoolName = schoolRow?.name || 'School';

  const templateKey = mapActionToTemplateKey(ruleRow.action_text);
  const preset = TEMPLATE_PRESETS[templateKey] || TEMPLATE_PRESETS.gentle;
  const channels = parseRuleChannelsJson(ruleRow.channels_json);
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + 7);
  const deadlineLabel = deadline.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const campaignCode = `REM-AUTO-${Date.now().toString(36).toUpperCase().slice(-8)}`;
  const title = `${ruleRow.name} (Auto)`;

  const [ins] = await promisePool.query(
    `INSERT INTO school_fee_reminder_campaigns (
      school_id, created_by_user_id, campaign_code, title, template_key,
      academic_year, term, subject_line, message_body, channels_json, filters_json,
      schedule_mode, scheduled_at, sent_at, recipient_count, delivered_count, failed_count, status, trigger_rule_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'now', NULL, ?, ?, 0, 0, 'delivered', ?)`,
    [
      schoolId,
      ruleRow.created_by_user_id || 0,
      campaignCode,
      title,
      templateKey,
      scope.academicYear,
      scope.term,
      preset.subject,
      preset.body,
        JSON.stringify(channels),
        JSON.stringify({
          auto_rule_id: ruleRow.id,
          academic_year: scope.academicYear,
          term: scope.term,
          class_name: scope.className,
        }),
      now,
      targets.length,
      ruleRow.id,
    ]
  );

  const campaignId = ins.insertId;
  const result = await runnerDeps.deliverCampaignNow({
    schoolId,
    schoolName,
    campaignId,
    targets,
    channels,
    subject: preset.subject,
    messageBody: preset.body,
    deadline: deadlineLabel,
    academicYear: scope.academicYear,
    term: scope.term,
  });

  const finalStatus =
    result.failed > 0 && result.delivered > 0
      ? 'partial'
      : result.failed > 0 && result.delivered === 0
        ? 'failed'
        : 'delivered';

  await promisePool.query(
    `UPDATE school_fee_reminder_campaigns
     SET delivered_count = ?, failed_count = ?, status = ?
     WHERE id = ?`,
    [result.delivered, result.failed, finalStatus, campaignId]
  );

  const reached = targets.length;
  await promisePool.query(
    `UPDATE school_fee_reminder_rules
     SET last_sent_at = ?, last_reached_count = ?
     WHERE id = ?`,
    [now, reached, ruleRow.id]
  );

  await ensureRuleRunTable();
  await promisePool.query(
    `INSERT INTO school_fee_reminder_rule_runs
      (school_id, rule_id, campaign_id, students_matched, reached_count, delivered_count, failed_count, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      schoolId,
      ruleRow.id,
      campaignId,
      targets.length,
      reached,
      result.delivered,
      result.failed,
      finalStatus,
    ]
  );

  return {
    skipped: false,
    matched: targets.length,
    reached,
    delivered: result.delivered,
    failed: result.failed,
    campaign_id: campaignId,
    campaign_code: campaignCode,
    status: finalStatus,
    academic_year: scope.academicYear,
    term: scope.term,
    class_name: scope.className,
    total_in_scope: scope.inScopeCount,
    with_fee_card: scope.withFeeCardCount,
  };
}

async function runDueFeeReminderRules() {
  if (!runnerDeps) return;
  await runnerDeps.ensureReminderTables();
  await ensureRuleRunTable();

  const now = new Date();
  const [rules] = await promisePool.query(
    `SELECT * FROM school_fee_reminder_rules
     WHERE deleted_at IS NULL AND is_active = 1 AND send_time IS NOT NULL`
  );

  for (const rule of rules || []) {
    try {
      await executeReminderRule(rule, { force: false, now });
    } catch (e) {
      console.error('[fee-reminder-scheduler] rule', rule.id, e.message);
    }
  }
}

function startFeeReminderRuleScheduler(intervalMs = 60_000) {
  if (schedulerTimer) return;
  const tick = () => {
    runDueFeeReminderRules().catch((e) => console.error('[fee-reminder-scheduler]', e.message));
  };
  tick();
  schedulerTimer = setInterval(tick, intervalMs);
}

function stopFeeReminderRuleScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}

module.exports = {
  CONDITION_EXAMPLES,
  parseRuleCondition,
  studentMatchesRule,
  initFeeReminderRuleRunner,
  buildRuleTargetStudents,
  executeReminderRule,
  runDueFeeReminderRules,
  startFeeReminderRuleScheduler,
  stopFeeReminderRuleScheduler,
};
