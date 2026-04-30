const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { promisePool } = require('../config/database');
const { notifyNewChatMessage } = require('../utils/chatNotifications');

const router = express.Router();

let chatTablesReady = false;
const CHAT_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'chat-attachments');
if (!fs.existsSync(CHAT_UPLOAD_DIR)) fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });

const chatUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, CHAT_UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safeExt = ext || '.bin';
      cb(null, `chat-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allow = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    if (allow.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Unsupported attachment type'));
  },
});

function trimStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function normalizePhone(raw) {
  if (!raw) return null;
  let v = String(raw).replace(/[\s\-().]/g, '');
  v = v.replace(/[^\d+]/g, '');
  if (v.startsWith('+250')) v = `0${v.slice(4)}`;
  else if (v.startsWith('250') && v.length === 12) v = `0${v.slice(3)}`;
  if (/^[27]\d{8}$/.test(v)) v = `0${v}`;
  if (/^07[2-9]\d{7}$/.test(v)) return v;
  if (/^078\d{7}$/.test(v)) return v;
  if (/^079\d{7}$/.test(v)) return v;
  if (/^025\d{7}$/.test(v)) return v;
  return null;
}

function mysqlPhoneTokenRegexp(phoneNorm) {
  if (!phoneNorm) return null;
  const p = String(phoneNorm).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return `(^|[^0-9])${p}($|[^0-9])`;
}

function normalizeClassToken(v) {
  return trimStr(v).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function hasManagerRole(req) {
  const roleCode = String(req.session?.user?.role?.code || req.session?.user?.role_code || req.session?.roleCode || '').toUpperCase();
  return ['SCHOOL_MANAGER', 'SCHOOL_ADMIN', 'DOS'].includes(roleCode);
}

function extractPhonesFromText(raw) {
  const txt = String(raw || '');
  const matches = txt.match(/(\+?250)?0?7[2-9]\d{7}/g) || [];
  const out = [];
  for (const m of matches) {
    const n = normalizePhone(m);
    if (n) out.push(n);
  }
  return out;
}

async function collectAllParentPhonesForSchool(schoolId) {
  const [rows] = await promisePool.query(
    `SELECT father_phone, mother_phone
     FROM students
     WHERE school_id = ?`,
    [schoolId]
  );
  const set = new Set();
  for (const r of rows || []) {
    const fDirect = normalizePhone(r.father_phone);
    const mDirect = normalizePhone(r.mother_phone);
    if (fDirect) set.add(fDirect);
    if (mDirect) set.add(mDirect);
    for (const p of extractPhonesFromText(r.father_phone)) set.add(p);
    for (const p of extractPhonesFromText(r.mother_phone)) set.add(p);
  }
  return Array.from(set);
}

async function collectAllStudentProxyPhonesForSchool(schoolId) {
  const [rows] = await promisePool.query(
    `SELECT id
     FROM students
     WHERE school_id = ?`,
    [schoolId]
  );
  return (rows || [])
    .map((r) => Number(r.id))
    .filter((id) => Number.isFinite(id) && id > 0)
    .map((id) => `student:${id}`);
}

async function collectUserIdsByRoleScope(schoolId, scope) {
  const scopeNorm = String(scope || '').toUpperCase();
  if (scopeNorm === 'ALL_TEACHERS') {
    const [rows] = await promisePool.query(
      `SELECT u.id
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.school_id = ? AND u.deleted_at IS NULL
         AND UPPER(COALESCE(r.role_code,'')) = 'TEACHER'`,
      [schoolId]
    );
    return (rows || []).map((r) => Number(r.id)).filter((x) => Number.isFinite(x) && x > 0);
  }
  if (scopeNorm === 'ALL_STAFF') {
    const [rows] = await promisePool.query(
      `SELECT u.id
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.school_id = ? AND u.deleted_at IS NULL
         AND UPPER(COALESCE(r.role_code,'')) <> 'PARENT'`,
      [schoolId]
    );
    return (rows || []).map((r) => Number(r.id)).filter((x) => Number.isFinite(x) && x > 0);
  }
  return [];
}

function parseStudentProxyPhone(parentPhone) {
  const v = trimStr(parentPhone);
  if (!v.toLowerCase().startsWith('student:')) return null;
  const id = Number(v.split(':')[1] || 0);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function resolveParentLabelsForPhones(schoolId, parentPhones = []) {
  const map = new Map();
  const unique = [...new Set((parentPhones || []).map((p) => trimStr(p)).filter(Boolean))];
  if (!schoolId || !unique.length) return map;

  const proxyIds = unique.map(parseStudentProxyPhone).filter((id) => Number.isFinite(id) && id > 0);
  if (proxyIds.length) {
    const placeholders = proxyIds.map(() => '?').join(',');
    const [rows] = await promisePool.query(
      `SELECT id, first_name, last_name, class_name
       FROM students
       WHERE school_id = ? AND id IN (${placeholders})`,
      [schoolId, ...proxyIds]
    );
    for (const r of rows || []) {
      map.set(`student:${r.id}`, {
        student_name: `${trimStr(r.first_name)} ${trimStr(r.last_name)}`.trim() || 'Student',
        class_name: trimStr(r.class_name) || 'Class N/A',
      });
    }
  }

  const realPhones = unique.filter((p) => !parseStudentProxyPhone(p));
  for (const phone of realPhones) {
    const pattern = mysqlPhoneTokenRegexp(normalizePhone(phone));
    if (!pattern) continue;
    const [[row]] = await promisePool.query(
      `SELECT first_name, last_name, class_name
       FROM students
       WHERE school_id = ?
         AND (
           (father_phone IS NOT NULL AND TRIM(father_phone) <> '' AND father_phone REGEXP ?)
           OR
           (mother_phone IS NOT NULL AND TRIM(mother_phone) <> '' AND mother_phone REGEXP ?)
         )
       ORDER BY id DESC
       LIMIT 1`,
      [schoolId, pattern, pattern]
    );
    if (row) {
      map.set(phone, {
        student_name: `${trimStr(row.first_name)} ${trimStr(row.last_name)}`.trim() || 'Student',
        class_name: trimStr(row.class_name) || 'Class N/A',
      });
    }
  }

  return map;
}

async function resolveTeacherCoursesByUserIds(schoolId, userIds = []) {
  const map = new Map();
  const ids = [...new Set((userIds || []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
  if (!schoolId || !ids.length) return map;
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await promisePool.query(
    `SELECT staff_id, subject_name
     FROM academic_timetables
     WHERE school_id = ? AND staff_id IN (${placeholders})
       AND subject_name IS NOT NULL AND TRIM(subject_name) <> ''
     ORDER BY subject_name ASC`,
    [schoolId, ...ids]
  ).catch(() => [[]]);
  const acc = new Map();
  for (const r of rows || []) {
    const k = Number(r.staff_id);
    const subj = trimStr(r.subject_name);
    if (!k || !subj) continue;
    const set = acc.get(k) || new Set();
    set.add(subj);
    acc.set(k, set);
  }
  for (const [uid, set] of acc.entries()) {
    map.set(uid, Array.from(set).slice(0, 4).join(', '));
  }
  return map;
}

async function ensureChatTables() {
  if (chatTablesReady) return;

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_chat_threads (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      thread_type ENUM('DIRECT','GROUP','BROADCAST') NOT NULL DEFAULT 'DIRECT',
      thread_name VARCHAR(160) NULL,
      thread_scope VARCHAR(64) NULL,
      created_by_user_id INT UNSIGNED NULL,
      created_by_parent_phone VARCHAR(30) NULL,
      last_message_at DATETIME NULL,
      last_message_preview VARCHAR(255) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_chat_threads_school (school_id),
      KEY idx_chat_threads_last (school_id, last_message_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query(
    `ALTER TABLE school_chat_threads
     MODIFY COLUMN thread_type ENUM('DIRECT','GROUP','BROADCAST') NOT NULL DEFAULT 'DIRECT'`
  ).catch(() => {});
  await promisePool.query('ALTER TABLE school_chat_threads ADD COLUMN thread_name VARCHAR(160) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE school_chat_threads ADD COLUMN thread_scope VARCHAR(64) NULL').catch(() => {});

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_chat_participants (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      thread_id INT UNSIGNED NOT NULL,
      school_id INT UNSIGNED NOT NULL,
      participant_type ENUM('USER','PARENT') NOT NULL,
      user_id INT UNSIGNED NULL,
      parent_phone VARCHAR(30) NULL,
      role_code VARCHAR(64) NULL,
      last_read_message_id INT UNSIGNED NULL,
      joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_chat_participant_user (thread_id, user_id),
      UNIQUE KEY uq_chat_participant_parent (thread_id, parent_phone),
      KEY idx_chat_participants_school (school_id),
      KEY idx_chat_participants_user (user_id),
      KEY idx_chat_participants_parent (parent_phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_chat_messages (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      thread_id INT UNSIGNED NOT NULL,
      school_id INT UNSIGNED NOT NULL,
      sender_type ENUM('USER','PARENT') NOT NULL,
      sender_user_id INT UNSIGNED NULL,
      sender_parent_phone VARCHAR(30) NULL,
      reply_to_message_id INT UNSIGNED NULL,
      body TEXT NOT NULL,
      attachment_url VARCHAR(500) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_chat_messages_thread (thread_id, id),
      KEY idx_chat_messages_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query('ALTER TABLE school_chat_messages ADD COLUMN reply_to_message_id INT UNSIGNED NULL').catch(() => {});

  chatTablesReady = true;
}

function resolveUserIdentity(req) {
  const roleCode = String(req.session?.user?.role?.code || req.session?.user?.role_code || '').toUpperCase();
  const parentPhone = normalizePhone(req.session?.user?.parent_phone);
  const studentId = Number(req.session?.user?.student_id || 0);
  const studentClass = trimStr(req.session?.user?.class_name || '');
  const studentSchoolId = Number(req.session?.user?.school_id || req.session?.school_id || 0);
  if (roleCode === 'STUDENT' && studentId > 0) {
    return {
      type: 'PARENT',
      parent_phone: `student:${studentId}`,
      role_code: 'STUDENT',
      user_id: null,
      student_id: studentId,
      school_id: studentSchoolId || null,
      class_name: studentClass || null,
      is_student_proxy: true,
    };
  }
  const chatAsParent = !!req.session?.user?.chat_as_parent;
  if ((roleCode === 'PARENT' || (roleCode === 'STUDENT' && chatAsParent)) && parentPhone) {
    return {
      type: 'PARENT',
      parent_phone: parentPhone,
      role_code: roleCode === 'STUDENT' ? 'PARENT' : 'PARENT',
      user_id: null,
    };
  }

  const rawUserId = req.session?.userId || req.session?.user?.id || req.user?.id || null;
  const userId = Number(rawUserId);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  return {
    type: 'USER',
    user_id: userId,
    role_code: roleCode || null,
    parent_phone: null,
  };
}

async function resolveIdentitySchools(identity, req) {
  if (!identity) return [];
  if (identity.is_student_proxy) {
    const sid = Number(identity.school_id || req.session?.school_id || req.session?.user?.school_id || 0);
    if (!sid) return [];
    const [[s]] = await promisePool.query('SELECT id, school_name FROM schools WHERE id = ? LIMIT 1', [sid]);
    return s ? [s] : [];
  }
  if (identity.type === 'USER') {
    const sid = req.session?.school_id || req.session?.user?.school_id || req.user?.school_id || req.user?.school?.id || null;
    if (sid) {
      const [[s]] = await promisePool.query('SELECT id, school_name FROM schools WHERE id = ? LIMIT 1', [sid]);
      return s ? [s] : [];
    }
    const [rows] = await promisePool.query(
      `SELECT id, school_name
       FROM schools
       WHERE manager_user_id = ?
       ORDER BY school_name ASC`,
      [identity.user_id]
    );
    return rows || [];
  }

  const pattern = mysqlPhoneTokenRegexp(identity.parent_phone);
  if (!pattern) return [];
  const [rows] = await promisePool.query(
    `SELECT DISTINCT sc.id, sc.school_name
     FROM students s
     INNER JOIN schools sc ON sc.id = s.school_id
     WHERE (
       (s.father_phone IS NOT NULL AND TRIM(s.father_phone) <> '' AND s.father_phone REGEXP ?)
       OR
       (s.mother_phone IS NOT NULL AND TRIM(s.mother_phone) <> '' AND s.mother_phone REGEXP ?)
     )
     ORDER BY sc.school_name ASC`,
    [pattern, pattern]
  );
  return rows || [];
}

async function ensureThreadReadable(threadId, schoolId, identity) {
  if (!threadId || !schoolId || !identity) return false;
  if (identity.type === 'USER') {
    const [[r]] = await promisePool.query(
      `SELECT id FROM school_chat_participants
       WHERE thread_id = ? AND school_id = ? AND participant_type = 'USER' AND user_id = ?
       LIMIT 1`,
      [threadId, schoolId, identity.user_id]
    );
    return !!r;
  }
  const [[r]] = await promisePool.query(
    `SELECT id FROM school_chat_participants
     WHERE thread_id = ? AND school_id = ? AND participant_type = 'PARENT' AND parent_phone = ?
     LIMIT 1`,
    [threadId, schoolId, identity.parent_phone]
  );
  return !!r;
}

async function notifyChatParticipants(io, threadId, schoolId, messagePayload) {
  if (!io) return;
  const [participants] = await promisePool.query(
    `SELECT participant_type, user_id, parent_phone
     FROM school_chat_participants
     WHERE thread_id = ? AND school_id = ?`,
    [threadId, schoolId]
  );
  for (const p of participants || []) {
    if (p.participant_type === 'USER' && p.user_id) {
      io.to(`chat:user:${p.user_id}`).emit('chat:new-message', messagePayload);
    }
    if (p.participant_type === 'PARENT' && p.parent_phone) {
      io.to(`chat:parent:${p.parent_phone}`).emit('chat:new-message', messagePayload);
    }
  }
  io.to(`chat:thread:${threadId}`).emit('chat:new-message', messagePayload);
}

router.use(async (_req, _res, next) => {
  try {
    await ensureChatTables();
    next();
  } catch (err) {
    next(err);
  }
});

router.get('/chat/schools', async (req, res) => {
  try {
    const identity = resolveUserIdentity(req);
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const schools = await resolveIdentitySchools(identity, req);
    return res.json({ success: true, data: schools });
  } catch (err) {
    console.error('GET /chat/schools', err);
    return res.status(500).json({ success: false, message: 'Failed to load schools' });
  }
});

router.get('/chat/staff', async (req, res) => {
  try {
    const identity = resolveUserIdentity(req);
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const schoolId = Number(req.query.school_id || 0);
    if (!schoolId) return res.status(400).json({ success: false, message: 'school_id is required' });
    const schools = await resolveIdentitySchools(identity, req);
    if (!schools.some((s) => Number(s.id) === schoolId)) {
      return res.status(403).json({ success: false, message: 'You cannot access this school staff list' });
    }
    const q = `%${trimStr(req.query.q || '').toLowerCase()}%`;

    if (identity.is_student_proxy) {
      const [rows] = await promisePool.query(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.photo, UPPER(r.role_code) AS role_code, r.role_name
         FROM users u
         INNER JOIN roles r ON r.id = u.role_id
         WHERE u.school_id = ? AND u.deleted_at IS NULL
           AND UPPER(COALESCE(r.role_code, '')) NOT IN ('PARENT','STUDENT')
           AND (
             ? = '%%'
             OR LOWER(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) LIKE ?
             OR LOWER(COALESCE(r.role_name, '')) LIKE ?
             OR LOWER(COALESCE(r.role_code, '')) LIKE ?
           )
         ORDER BY
           CASE WHEN UPPER(COALESCE(r.role_code, '')) = 'TEACHER' THEN 0 ELSE 1 END,
           COALESCE(r.role_name, '') ASC,
           u.first_name ASC,
           u.last_name ASC
         LIMIT 300`,
        [schoolId, q, q, q, q]
      );
      return res.json({ success: true, data: rows || [] });
    }

    const roleGroup = String(req.query.role_group || 'all').toLowerCase();
    const roleSql = [];
    const roleArgs = [];
    if (roleGroup === 'teachers') {
      roleSql.push(`UPPER(COALESCE(r.role_code, '')) IN ('TEACHER')`);
    } else if (roleGroup === 'leadership') {
      roleSql.push(`UPPER(COALESCE(r.role_code, '')) IN ('SCHOOL_ADMIN','SCHOOL_MANAGER','DOS','HOD','DISCIPLINE_STAFF','ACCOUNTANT','LIBRARIAN','STOREKEEPER')`);
    } else if (roleGroup === 'support') {
      roleSql.push(`UPPER(COALESCE(r.role_code, '')) IN ('ACCOUNTANT','LIBRARIAN','STOREKEEPER','DISCIPLINE_STAFF')`);
    } else if (roleGroup !== 'all') {
      roleSql.push(`UPPER(COALESCE(r.role_code, '')) = ?`);
      roleArgs.push(roleGroup.toUpperCase());
    }
    const [rows] = await promisePool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.photo, UPPER(r.role_code) AS role_code, r.role_name
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.school_id = ? AND u.deleted_at IS NULL
         AND UPPER(COALESCE(r.role_code, '')) NOT IN ('PARENT')
         ${roleSql.length ? `AND ${roleSql.join(' AND ')}` : ''}
         AND (
           ? = '%%'
           OR LOWER(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) LIKE ?
           OR LOWER(COALESCE(r.role_name, '')) LIKE ?
           OR LOWER(COALESCE(r.role_code, '')) LIKE ?
         )
       ORDER BY r.role_name ASC, u.first_name ASC, u.last_name ASC
       LIMIT 300`,
      [schoolId, ...roleArgs, q, q, q, q]
    );
    return res.json({ success: true, data: rows || [] });
  } catch (err) {
    console.error('GET /chat/staff', err);
    return res.status(500).json({ success: false, message: 'Failed to load school staff' });
  }
});

router.post('/chat/groups', async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const identity = resolveUserIdentity(req);
    if (!identity || identity.type !== 'USER') return res.status(401).json({ success: false, message: 'Manager session required' });
    if (!hasManagerRole(req)) return res.status(403).json({ success: false, message: 'Only school manager/admin can create groups' });

    const schoolId = Number(req.body?.school_id || 0);
    const groupName = trimStr(req.body?.name || req.body?.thread_name || '');
    const scope = String(req.body?.scope || '').toUpperCase(); // ALL_PARENTS | ALL_TEACHERS | ALL_STAFF | CUSTOM
    if (!schoolId || !groupName || !scope) {
      return res.status(400).json({ success: false, message: 'school_id, name and scope are required' });
    }
    const schools = await resolveIdentitySchools(identity, req);
    if (!schools.some((s) => Number(s.id) === schoolId)) {
      return res.status(403).json({ success: false, message: 'You cannot create group for this school' });
    }

    let memberUserIds = [];
    let memberParentPhones = [];
    if (scope === 'ALL_PARENTS') {
      memberParentPhones = await collectAllParentPhonesForSchool(schoolId);
      const studentProxyPhones = await collectAllStudentProxyPhonesForSchool(schoolId);
      memberParentPhones = [...new Set([...(memberParentPhones || []), ...(studentProxyPhones || [])])];
    } else if (scope === 'ALL_TEACHERS' || scope === 'ALL_STAFF') {
      memberUserIds = await collectUserIdsByRoleScope(schoolId, scope);
    } else if (scope === 'CUSTOM') {
      memberUserIds = (Array.isArray(req.body?.member_user_ids) ? req.body.member_user_ids : [])
        .map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0);
      memberParentPhones = (Array.isArray(req.body?.member_parent_phones) ? req.body.member_parent_phones : [])
        .map((p) => normalizePhone(p)).filter(Boolean);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid scope' });
    }

    memberUserIds = [...new Set(memberUserIds.filter((id) => id !== Number(identity.user_id)))];
    memberParentPhones = [...new Set(memberParentPhones)];
    if (!memberUserIds.length && !memberParentPhones.length) {
      return res.status(400).json({ success: false, message: 'Group has no members for selected scope' });
    }

    await conn.beginTransaction();
    const [ins] = await conn.query(
      `INSERT INTO school_chat_threads
       (school_id, thread_type, thread_name, thread_scope, created_by_user_id, last_message_at)
       VALUES (?, 'GROUP', ?, ?, ?, NOW())`,
      [schoolId, groupName, scope, identity.user_id]
    );
    const threadId = Number(ins.insertId);
    await conn.query(
      `INSERT INTO school_chat_participants (thread_id, school_id, participant_type, user_id, role_code)
       VALUES (?, ?, 'USER', ?, ?)`,
      [threadId, schoolId, identity.user_id, identity.role_code || 'USER']
    );
    for (const uid of memberUserIds) {
      await conn.query(
        `INSERT IGNORE INTO school_chat_participants (thread_id, school_id, participant_type, user_id, role_code)
         VALUES (?, ?, 'USER', ?, 'USER')`,
        [threadId, schoolId, uid]
      );
    }
    for (const phone of memberParentPhones) {
      await conn.query(
        `INSERT IGNORE INTO school_chat_participants (thread_id, school_id, participant_type, parent_phone, role_code)
         VALUES (?, ?, 'PARENT', ?, 'PARENT')`,
        [threadId, schoolId, phone]
      );
    }
    await conn.commit();
    conn.release();

    return res.status(201).json({
      success: true,
      data: {
        thread_id: threadId,
        thread_type: 'GROUP',
        thread_name: groupName,
        thread_scope: scope,
        members: {
          users: memberUserIds.length + 1,
          parents: memberParentPhones.length,
        },
      },
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('POST /chat/groups', err);
    return res.status(500).json({ success: false, message: 'Failed to create group' });
  }
});

router.get('/chat/groups/options', async (req, res) => {
  try {
    const identity = resolveUserIdentity(req);
    if (!identity || identity.type !== 'USER') return res.status(401).json({ success: false, message: 'Manager session required' });
    if (!hasManagerRole(req)) return res.status(403).json({ success: false, message: 'Only school manager/admin can view group options' });
    const schoolId = Number(req.query.school_id || 0);
    if (!schoolId) return res.status(400).json({ success: false, message: 'school_id is required' });
    const schools = await resolveIdentitySchools(identity, req);
    if (!schools.some((s) => Number(s.id) === schoolId)) {
      return res.status(403).json({ success: false, message: 'You cannot access this school' });
    }
    const [teachersRows] = await promisePool.query(
      `SELECT COUNT(*) AS c
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.school_id = ? AND u.deleted_at IS NULL AND UPPER(COALESCE(r.role_code,'')) = 'TEACHER'`,
      [schoolId]
    );
    const [staffRows] = await promisePool.query(
      `SELECT COUNT(*) AS c
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.school_id = ? AND u.deleted_at IS NULL AND UPPER(COALESCE(r.role_code,'')) <> 'PARENT'`,
      [schoolId]
    );
    const parents = await collectAllParentPhonesForSchool(schoolId);
    return res.json({
      success: true,
      data: {
        all_parents: { count: parents.length },
        all_teachers: { count: Number(teachersRows?.[0]?.c || 0) },
        all_staff: { count: Number(staffRows?.[0]?.c || 0) },
      },
    });
  } catch (err) {
    console.error('GET /chat/groups/options', err);
    return res.status(500).json({ success: false, message: 'Failed to load group options' });
  }
});

router.post('/chat/uploads', (req, res, next) => {
  chatUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'Attachment upload failed' });
    return next();
  });
}, async (req, res) => {
  try {
    const identity = resolveUserIdentity(req);
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const file = req.file;
    if (!file?.filename) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const attachmentUrl = `/uploads/chat-attachments/${file.filename}`;
    return res.json({
      success: true,
      data: {
        filename: file.filename,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        url: attachmentUrl,
      },
    });
  } catch (err) {
    console.error('POST /chat/uploads', err);
    return res.status(500).json({ success: false, message: 'Failed to upload attachment' });
  }
});

router.post('/chat/threads', async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const identity = resolveUserIdentity(req);
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const schoolId = Number(req.body?.school_id || 0);
    const participantUserId = Number(req.body?.participant_user_id || 0);
    if (!schoolId || !participantUserId) {
      return res.status(400).json({ success: false, message: 'school_id and participant_user_id are required' });
    }

    const schools = await resolveIdentitySchools(identity, req);
    if (!schools.some((s) => Number(s.id) === schoolId)) {
      return res.status(403).json({ success: false, message: 'You cannot start chat in this school' });
    }

    const [[targetUser]] = await conn.query(
      `SELECT u.id, UPPER(r.role_code) AS role_code
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? AND u.school_id = ? AND u.deleted_at IS NULL LIMIT 1`,
      [participantUserId, schoolId]
    );
    if (!targetUser) return res.status(404).json({ success: false, message: 'Staff member not found' });

    await conn.beginTransaction();

    let existingThreadId = null;
    if (identity.type === 'USER') {
      const [[match]] = await conn.query(
        `SELECT p1.thread_id
         FROM school_chat_participants p1
         INNER JOIN school_chat_participants p2 ON p2.thread_id = p1.thread_id
         WHERE p1.school_id = ? AND p2.school_id = ?
           AND p1.participant_type = 'USER' AND p1.user_id = ?
           AND p2.participant_type = 'USER' AND p2.user_id = ?
         GROUP BY p1.thread_id
         HAVING COUNT(*) >= 2
         LIMIT 1`,
        [schoolId, schoolId, identity.user_id, participantUserId]
      );
      existingThreadId = match?.thread_id || null;
    } else {
      const [[match]] = await conn.query(
        `SELECT p1.thread_id
         FROM school_chat_participants p1
         INNER JOIN school_chat_participants p2 ON p2.thread_id = p1.thread_id
         WHERE p1.school_id = ? AND p2.school_id = ?
           AND p1.participant_type = 'PARENT' AND p1.parent_phone = ?
           AND p2.participant_type = 'USER' AND p2.user_id = ?
         GROUP BY p1.thread_id
         HAVING COUNT(*) >= 2
         LIMIT 1`,
        [schoolId, schoolId, identity.parent_phone, participantUserId]
      );
      existingThreadId = match?.thread_id || null;
    }

    let threadId = existingThreadId;
    if (!threadId) {
      const [threadIns] = await conn.query(
        `INSERT INTO school_chat_threads
         (school_id, thread_type, created_by_user_id, created_by_parent_phone, last_message_at)
         VALUES (?, 'DIRECT', ?, ?, NOW())`,
        [schoolId, identity.type === 'USER' ? identity.user_id : null, identity.type === 'PARENT' ? identity.parent_phone : null]
      );
      threadId = threadIns.insertId;
      if (identity.type === 'USER') {
        await conn.query(
          `INSERT INTO school_chat_participants (thread_id, school_id, participant_type, user_id, role_code)
           VALUES (?, ?, 'USER', ?, ?)`,
          [threadId, schoolId, identity.user_id, identity.role_code || 'USER']
        );
      } else {
        await conn.query(
          `INSERT INTO school_chat_participants (thread_id, school_id, participant_type, parent_phone, role_code)
           VALUES (?, ?, 'PARENT', ?, 'PARENT')`,
          [threadId, schoolId, identity.parent_phone]
        );
      }
      await conn.query(
        `INSERT INTO school_chat_participants (thread_id, school_id, participant_type, user_id, role_code)
         VALUES (?, ?, 'USER', ?, ?)`,
        [threadId, schoolId, participantUserId, targetUser.role_code || 'USER']
      );
    }

    await conn.commit();
    conn.release();
    return res.status(existingThreadId ? 200 : 201).json({ success: true, data: { thread_id: threadId } });
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('POST /chat/threads', err);
    return res.status(500).json({ success: false, message: 'Failed to create/find chat thread' });
  }
});

router.get('/chat/threads', async (req, res) => {
  try {
    const identity = resolveUserIdentity(req);
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const schoolId = Number(req.query.school_id || 0);
    if (!schoolId) return res.status(400).json({ success: false, message: 'school_id is required' });
    const schools = await resolveIdentitySchools(identity, req);
    if (!schools.some((s) => Number(s.id) === schoolId)) {
      return res.status(403).json({ success: false, message: 'You cannot access this school chats' });
    }

    if (identity.is_student_proxy && trimStr(identity.parent_phone)) {
      await promisePool.query(
        `INSERT IGNORE INTO school_chat_participants (thread_id, school_id, participant_type, parent_phone, role_code)
         SELECT t.id, t.school_id, 'PARENT', ?, 'PARENT'
         FROM school_chat_threads t
         WHERE t.school_id = ?
           AND UPPER(COALESCE(t.thread_type, '')) IN ('GROUP','BROADCAST')
           AND UPPER(COALESCE(t.thread_scope, '')) = 'ALL_PARENTS'`,
        [identity.parent_phone, schoolId]
      ).catch(() => {});
    }

    const identityFilterSql = identity.type === 'USER'
      ? `p.participant_type = 'USER' AND p.user_id = ?`
      : `p.participant_type = 'PARENT' AND p.parent_phone = ?`;
    const identityArg = identity.type === 'USER' ? identity.user_id : identity.parent_phone;

    const [rows] = await promisePool.query(
      `SELECT t.id, t.school_id, t.thread_type, t.thread_name, t.thread_scope, t.created_by_user_id, t.created_at,
              t.last_message_at, t.last_message_preview, t.updated_at,
              cu.first_name AS created_by_first_name, cu.last_name AS created_by_last_name
       FROM school_chat_threads t
       INNER JOIN school_chat_participants p ON p.thread_id = t.id
       LEFT JOIN users cu ON cu.id = t.created_by_user_id
       WHERE t.school_id = ? AND ${identityFilterSql}
       ORDER BY COALESCE(t.last_message_at, t.updated_at, t.created_at) DESC
       LIMIT 300`,
      [schoolId, identityArg]
    );

    const threadIds = (rows || []).map((r) => r.id);
    if (!threadIds.length) return res.json({ success: true, data: [] });
    const placeholders = threadIds.map(() => '?').join(',');

    const [participants] = await promisePool.query(
      `SELECT p.thread_id, p.participant_type, p.user_id, p.parent_phone, p.role_code,
              u.first_name, u.last_name, u.photo, r.role_name
       FROM school_chat_participants p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE p.thread_id IN (${placeholders})`,
      threadIds
    );
    const parentPhones = (participants || [])
      .filter((p) => p.participant_type === 'PARENT' && trimStr(p.parent_phone))
      .map((p) => trimStr(p.parent_phone));
    const teacherUserIds = (participants || [])
      .filter((p) => p.participant_type === 'USER' && p.user_id)
      .map((p) => Number(p.user_id));
    const parentLabelMap = await resolveParentLabelsForPhones(schoolId, parentPhones);
    const courseMap = await resolveTeacherCoursesByUserIds(schoolId, teacherUserIds);

    const [unreadRows] = await promisePool.query(
      `SELECT p.thread_id, COUNT(m.id) AS unread_count
       FROM school_chat_participants p
       INNER JOIN school_chat_messages m ON m.thread_id = p.thread_id
       WHERE p.thread_id IN (${placeholders})
         AND ${identityFilterSql}
         AND (
           p.last_read_message_id IS NULL
           OR m.id > p.last_read_message_id
         )
         AND (
           (p.participant_type = 'USER' AND (m.sender_type <> 'USER' OR m.sender_user_id <> p.user_id))
           OR
           (p.participant_type = 'PARENT' AND (m.sender_type <> 'PARENT' OR m.sender_parent_phone <> p.parent_phone))
         )
       GROUP BY p.thread_id`,
      [...threadIds, identityArg]
    );

    const unreadMap = new Map((unreadRows || []).map((x) => [Number(x.thread_id), Number(x.unread_count || 0)]));
    const participantsByThread = new Map();
    for (const p of participants || []) {
      const key = Number(p.thread_id);
      const arr = participantsByThread.get(key) || [];
      arr.push(p);
      participantsByThread.set(key, arr);
    }

    const mapped = rows.map((t) => {
      const all = participantsByThread.get(Number(t.id)) || [];
      const isGroupThread = String(t.thread_type || '').toUpperCase() === 'GROUP' || String(t.thread_type || '').toUpperCase() === 'BROADCAST';
      if (isGroupThread) {
        return {
          id: t.id,
          school_id: t.school_id,
          thread_type: t.thread_type || 'GROUP',
          thread_name: t.thread_name || 'Group',
          thread_scope: t.thread_scope || null,
          last_message_at: t.last_message_at,
          last_message_preview: t.last_message_preview,
          unread_count: unreadMap.get(Number(t.id)) || 0,
          group_info: {
            member_count: all.length,
            scope_badge: t.thread_scope || 'GROUP',
            created_by: `${trimStr(t.created_by_first_name)} ${trimStr(t.created_by_last_name)}`.trim() || null,
            created_at: t.created_at || null,
            last_active: t.last_message_at || t.updated_at || t.created_at || null,
          },
          other_participant: {
            participant_type: 'GROUP',
            user_id: null,
            parent_phone: null,
            name: t.thread_name || 'Group',
            role_name: t.thread_scope ? String(t.thread_scope).replace(/_/g, ' ') : 'Group',
            teacher_courses: null,
            photo: null,
          },
        };
      }
      let other = null;
      for (const p of all) {
        if (identity.type === 'USER' && p.participant_type === 'USER' && Number(p.user_id) === Number(identity.user_id)) continue;
        if (identity.type === 'PARENT' && p.participant_type === 'PARENT' && String(p.parent_phone) === String(identity.parent_phone)) continue;
        other = p;
        break;
      }
      return {
        id: t.id,
        school_id: t.school_id,
        thread_type: t.thread_type || 'DIRECT',
        thread_name: t.thread_name || null,
        thread_scope: t.thread_scope || null,
        last_message_at: t.last_message_at,
        last_message_preview: t.last_message_preview,
        unread_count: unreadMap.get(Number(t.id)) || 0,
        other_participant: other
          ? {
            participant_type: other.participant_type,
            user_id: other.user_id || null,
            parent_phone: other.parent_phone || null,
            name: other.participant_type === 'USER'
              ? `${trimStr(other.first_name)} ${trimStr(other.last_name)}`.trim()
              : `Parent${parentLabelMap.get(trimStr(other.parent_phone))?.student_name ? ` • ${parentLabelMap.get(trimStr(other.parent_phone)).student_name}` : ''}${parentLabelMap.get(trimStr(other.parent_phone))?.class_name ? ` (${parentLabelMap.get(trimStr(other.parent_phone)).class_name})` : ''}`,
            role_name: other.participant_type === 'USER'
              ? (other.role_name || other.role_code || 'Staff')
              : `Parent${parentLabelMap.get(trimStr(other.parent_phone))?.student_name ? ` • ${parentLabelMap.get(trimStr(other.parent_phone)).student_name}` : ''}${parentLabelMap.get(trimStr(other.parent_phone))?.class_name ? ` (${parentLabelMap.get(trimStr(other.parent_phone)).class_name})` : ''}`,
            teacher_courses: other.participant_type === 'USER' ? (courseMap.get(Number(other.user_id)) || null) : null,
            photo: other.photo || null,
          }
          : null,
      };
    });
    return res.json({ success: true, data: mapped });
  } catch (err) {
    console.error('GET /chat/threads', err);
    return res.status(500).json({ success: false, message: 'Failed to load chat threads' });
  }
});

router.get('/chat/threads/:threadId/messages', async (req, res) => {
  try {
    const identity = resolveUserIdentity(req);
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const threadId = Number(req.params.threadId || 0);
    const schoolId = Number(req.query.school_id || 0);
    if (!threadId || !schoolId) return res.status(400).json({ success: false, message: 'threadId and school_id are required' });

    const canRead = await ensureThreadReadable(threadId, schoolId, identity);
    if (!canRead) return res.status(403).json({ success: false, message: 'Thread access denied' });

    const limit = Math.min(200, Math.max(20, Number(req.query.limit || 80)));
    const qRaw = trimStr(req.query.q || '');
    const qLike = qRaw ? `%${qRaw.toLowerCase()}%` : '';
    const beforeId = Number(req.query.before_id || 0);
    const beforeClause = beforeId ? 'AND m.id < ?' : '';
    const searchClause = qRaw ? `AND (
      LOWER(COALESCE(m.body, '')) LIKE ?
      OR LOWER(COALESCE(m.attachment_url, '')) LIKE ?
      OR LOWER(TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')))) LIKE ?
    )` : '';
    const args = [];
    args.push(threadId, schoolId);
    if (beforeId) args.push(beforeId);
    if (qRaw) args.push(qLike, qLike, qLike);
    args.push(limit);
    const [rows] = await promisePool.query(
      `SELECT m.id, m.thread_id, m.sender_type, m.sender_user_id, m.sender_parent_phone,
              m.reply_to_message_id, m.body, m.attachment_url, m.created_at,
              rm.body AS reply_to_body, rm.sender_type AS reply_to_sender_type, rm.sender_user_id AS reply_to_sender_user_id, rm.sender_parent_phone AS reply_to_sender_parent_phone,
              rm_u.first_name AS reply_to_first_name, rm_u.last_name AS reply_to_last_name,
              u.first_name, u.last_name, r.role_name, r.role_code
       FROM school_chat_messages m
       LEFT JOIN school_chat_messages rm ON rm.id = m.reply_to_message_id AND rm.thread_id = m.thread_id
       LEFT JOIN users rm_u ON rm_u.id = rm.sender_user_id
       LEFT JOIN users u ON u.id = m.sender_user_id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE m.thread_id = ? AND m.school_id = ? ${beforeClause} ${searchClause}
       ORDER BY m.id DESC
       LIMIT ?`,
      args
    );
    const [participants] = await promisePool.query(
      `SELECT participant_type, user_id, parent_phone, last_read_message_id
       FROM school_chat_participants
       WHERE thread_id = ? AND school_id = ?`,
      [threadId, schoolId]
    );
    const [users] = await promisePool.query(
      `SELECT u.id, u.first_name, u.last_name, UPPER(r.role_code) AS role_code
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.id IN (
         SELECT user_id FROM school_chat_participants WHERE thread_id = ? AND school_id = ? AND user_id IS NOT NULL
       )`,
      [threadId, schoolId]
    );
    const userMap = new Map((users || []).map((u) => [Number(u.id), u]));
    const courseMap = await resolveTeacherCoursesByUserIds(schoolId, (users || []).map((u) => Number(u.id)));
    return res.json({
      success: true,
      data: (rows || []).reverse().map((m) => ({
        id: m.id,
        thread_id: m.thread_id,
        sender_type: m.sender_type,
        sender_user_id: m.sender_user_id,
        sender_parent_phone: m.sender_parent_phone,
        sender_name: m.sender_type === 'USER'
          ? `${trimStr(m.first_name)} ${trimStr(m.last_name)}`.trim()
          : 'Parent',
        sender_role: m.sender_type === 'USER' ? (m.role_name || m.role_code || 'Staff') : 'Parent',
        sender_courses: m.sender_type === 'USER' ? (courseMap.get(Number(m.sender_user_id)) || null) : null,
        reply_to: m.reply_to_message_id ? {
          message_id: Number(m.reply_to_message_id),
          body: trimStr(m.reply_to_body),
          sender_type: m.reply_to_sender_type || null,
          sender_user_id: m.reply_to_sender_user_id ? Number(m.reply_to_sender_user_id) : null,
          sender_parent_phone: m.reply_to_sender_parent_phone || null,
          sender_name: m.reply_to_sender_type === 'USER'
            ? (`${trimStr(m.reply_to_first_name)} ${trimStr(m.reply_to_last_name)}`.trim() || `Staff ${Number(m.reply_to_sender_user_id || 0)}`)
            : 'Parent',
        } : null,
        body: m.body,
        attachment_url: m.attachment_url,
        created_at: m.created_at,
        read_by: (participants || []).filter((p) => Number(p.last_read_message_id || 0) >= Number(m.id || 0)).map((p) => {
          if (p.participant_type === 'USER') {
            const u = userMap.get(Number(p.user_id));
            return {
              participant_type: 'USER',
              user_id: p.user_id,
              label: u ? `${trimStr(u.first_name)} ${trimStr(u.last_name)}`.trim() : `Staff ${p.user_id}`,
              role_code: u?.role_code || null,
            };
          }
          return {
            participant_type: 'PARENT',
            parent_phone: p.parent_phone,
            label: 'Parent',
            role_code: 'PARENT',
          };
        }),
      })),
    });
  } catch (err) {
    console.error('GET /chat/threads/:threadId/messages', err);
    return res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
});

router.post('/chat/threads/:threadId/messages', async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const identity = resolveUserIdentity(req);
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const threadId = Number(req.params.threadId || 0);
    const schoolId = Number(req.body?.school_id || req.query?.school_id || 0);
    const body = trimStr(req.body?.body);
    const attachmentUrl = trimStr(req.body?.attachment_url) || null;
    const replyToMessageId = Number(req.body?.reply_to_message_id || 0);
    if (!threadId || !schoolId || (!body && !attachmentUrl)) {
      return res.status(400).json({ success: false, message: 'threadId, school_id and message body or attachment are required' });
    }

    const canRead = await ensureThreadReadable(threadId, schoolId, identity);
    if (!canRead) return res.status(403).json({ success: false, message: 'Thread access denied' });
    let validReplyToMessageId = null;
    if (Number.isFinite(replyToMessageId) && replyToMessageId > 0) {
      const [[replyRow]] = await conn.query(
        `SELECT id
         FROM school_chat_messages
         WHERE id = ? AND thread_id = ? AND school_id = ?
         LIMIT 1`,
        [replyToMessageId, threadId, schoolId]
      );
      validReplyToMessageId = replyRow?.id ? Number(replyRow.id) : null;
    }

    await conn.beginTransaction();
    const [ins] = await conn.query(
      `INSERT INTO school_chat_messages
       (thread_id, school_id, sender_type, sender_user_id, sender_parent_phone, reply_to_message_id, body, attachment_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [threadId, schoolId, identity.type, identity.type === 'USER' ? identity.user_id : null, identity.type === 'PARENT' ? identity.parent_phone : null, validReplyToMessageId, body, attachmentUrl]
    );
    const messageId = ins.insertId;
    await conn.query(
      `UPDATE school_chat_threads
       SET last_message_at = NOW(), last_message_preview = ?, updated_at = NOW()
       WHERE id = ? AND school_id = ?`,
      [body.slice(0, 255), threadId, schoolId]
    );
    if (identity.type === 'USER') {
      await conn.query(
        `UPDATE school_chat_participants
         SET last_read_message_id = ?
         WHERE thread_id = ? AND school_id = ? AND participant_type = 'USER' AND user_id = ?`,
        [messageId, threadId, schoolId, identity.user_id]
      );
    } else {
      await conn.query(
        `UPDATE school_chat_participants
         SET last_read_message_id = ?
         WHERE thread_id = ? AND school_id = ? AND participant_type = 'PARENT' AND parent_phone = ?`,
        [messageId, threadId, schoolId, identity.parent_phone]
      );
    }
    await conn.commit();
    conn.release();

    const messagePayload = {
      id: messageId,
      thread_id: threadId,
      school_id: schoolId,
      sender_type: identity.type,
      sender_user_id: identity.type === 'USER' ? identity.user_id : null,
      sender_parent_phone: identity.type === 'PARENT' ? identity.parent_phone : null,
      reply_to_message_id: validReplyToMessageId,
      body,
      attachment_url: attachmentUrl,
      created_at: new Date().toISOString(),
    };
    const io = req.app.get('io');
    await notifyChatParticipants(io, threadId, schoolId, messagePayload);
    await notifyNewChatMessage({
      schoolId,
      threadId,
      messageId,
      senderType: identity.type,
      senderUserId: identity.type === 'USER' ? identity.user_id : null,
      senderParentPhone: identity.type === 'PARENT' ? identity.parent_phone : null,
      senderName: identity.type === 'USER' ? `Staff ${identity.user_id}` : 'Parent',
      body: body || '[Attachment]',
    }).catch((e) => {
      console.error('chat notification dispatch error', e.message);
    });

    return res.status(201).json({ success: true, data: messagePayload });
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('POST /chat/threads/:threadId/messages', err);
    return res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

router.post('/chat/threads/:threadId/read', async (req, res) => {
  try {
    const identity = resolveUserIdentity(req);
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const threadId = Number(req.params.threadId || 0);
    const schoolId = Number(req.body?.school_id || 0);
    if (!threadId || !schoolId) return res.status(400).json({ success: false, message: 'threadId and school_id are required' });
    const canRead = await ensureThreadReadable(threadId, schoolId, identity);
    if (!canRead) return res.status(403).json({ success: false, message: 'Thread access denied' });

    const [[maxRow]] = await promisePool.query(
      'SELECT MAX(id) AS max_id FROM school_chat_messages WHERE thread_id = ? AND school_id = ?',
      [threadId, schoolId]
    );
    const maxId = Number(maxRow?.max_id || 0);
    if (identity.type === 'USER') {
      await promisePool.query(
        `UPDATE school_chat_participants
         SET last_read_message_id = ?
         WHERE thread_id = ? AND school_id = ? AND participant_type = 'USER' AND user_id = ?`,
        [maxId || null, threadId, schoolId, identity.user_id]
      );
    } else {
      await promisePool.query(
        `UPDATE school_chat_participants
         SET last_read_message_id = ?
         WHERE thread_id = ? AND school_id = ? AND participant_type = 'PARENT' AND parent_phone = ?`,
        [maxId || null, threadId, schoolId, identity.parent_phone]
      );
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('POST /chat/threads/:threadId/read', err);
    return res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
});

router.delete('/chat/threads/:threadId', async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const identity = resolveUserIdentity(req);
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const threadId = Number(req.params.threadId || 0);
    const schoolId = Number(req.query.school_id || req.body?.school_id || 0);
    if (!threadId || !schoolId) return res.status(400).json({ success: false, message: 'threadId and school_id are required' });

    const canRead = await ensureThreadReadable(threadId, schoolId, identity);
    if (!canRead) return res.status(403).json({ success: false, message: 'Thread access denied' });

    await conn.beginTransaction();
    if (identity.type === 'USER') {
      await conn.query(
        `DELETE FROM school_chat_participants
         WHERE thread_id = ? AND school_id = ? AND participant_type = 'USER' AND user_id = ?`,
        [threadId, schoolId, identity.user_id]
      );
    } else {
      await conn.query(
        `DELETE FROM school_chat_participants
         WHERE thread_id = ? AND school_id = ? AND participant_type = 'PARENT' AND parent_phone = ?`,
        [threadId, schoolId, identity.parent_phone]
      );
    }

    const [[left]] = await conn.query(
      `SELECT COUNT(*) AS c
       FROM school_chat_participants
       WHERE thread_id = ? AND school_id = ?`,
      [threadId, schoolId]
    );
    if (Number(left?.c || 0) <= 0) {
      await conn.query('DELETE FROM school_chat_messages WHERE thread_id = ? AND school_id = ?', [threadId, schoolId]);
      await conn.query('DELETE FROM school_chat_threads WHERE id = ? AND school_id = ?', [threadId, schoolId]);
    }

    await conn.commit();
    conn.release();
    return res.json({ success: true });
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('DELETE /chat/threads/:threadId', err);
    return res.status(500).json({ success: false, message: 'Failed to remove chat thread' });
  }
});

router.get('/chat/unread-count', async (req, res) => {
  try {
    const identity = resolveUserIdentity(req);
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const schoolId = Number(req.query.school_id || 0);
    if (!schoolId) return res.status(400).json({ success: false, message: 'school_id is required' });
    const schools = await resolveIdentitySchools(identity, req);
    if (!schools.some((s) => Number(s.id) === schoolId)) return res.status(403).json({ success: false, message: 'Access denied' });

    const identityFilterSql = identity.type === 'USER'
      ? `p.participant_type = 'USER' AND p.user_id = ?`
      : `p.participant_type = 'PARENT' AND p.parent_phone = ?`;
    const identityArg = identity.type === 'USER' ? identity.user_id : identity.parent_phone;

    const [[row]] = await promisePool.query(
      `SELECT COUNT(m.id) AS unread_count
       FROM school_chat_participants p
       INNER JOIN school_chat_messages m ON m.thread_id = p.thread_id
       WHERE p.school_id = ? AND ${identityFilterSql}
         AND (
           p.last_read_message_id IS NULL
           OR m.id > p.last_read_message_id
         )
         AND (
           (p.participant_type = 'USER' AND (m.sender_type <> 'USER' OR m.sender_user_id <> p.user_id))
           OR
           (p.participant_type = 'PARENT' AND (m.sender_type <> 'PARENT' OR m.sender_parent_phone <> p.parent_phone))
         )`,
      [schoolId, identityArg]
    );
    return res.json({ success: true, data: { unread_count: Number(row?.unread_count || 0) } });
  } catch (err) {
    console.error('GET /chat/unread-count', err);
    return res.status(500).json({ success: false, message: 'Failed to load unread count' });
  }
});

module.exports = {
  router,
  ensureChatTables,
  resolveUserIdentity,
  resolveIdentitySchools,
  normalizePhone,
};
