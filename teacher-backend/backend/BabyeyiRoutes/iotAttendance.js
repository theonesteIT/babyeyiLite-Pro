const express = require('express');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');
const studentPermissions = require('./studentPermissions');

const router = express.Router();
const SCHOOL_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS', 'TEACHER', 'HOD'];

let tablesReady = false;

async function ensureIotTables() {
  if (tablesReady) return;

  // 1. IoT Hardware Registry
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_iot_devices (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      device_uid VARCHAR(120) NOT NULL,
      device_label VARCHAR(150) NULL,
      device_type ENUM('GATE_SCANNER', 'CLASS_READER', 'LIBRARY_GATE', 'POS_SCANNER') DEFAULT 'GATE_SCANNER',
      status ENUM('Online', 'Offline') DEFAULT 'Offline',
      last_heartbeat DATETIME NULL,
      purpose VARCHAR(255) NULL,
      mapped_event_id INT UNSIGNED NULL, -- Link to attendance_events
      mapped_class_id INT UNSIGNED NULL, -- Link to school_classes
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_dev_school (school_id, device_uid),
      INDEX idx_dev_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 2. Flexible Attendance Events (Flexible Operations / Pulses)
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS attendance_events (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      event_name VARCHAR(150) NOT NULL,
      start_time TIME NULL,
      end_time TIME NULL,
      late_threshold TIME NULL,
      target_group ENUM('STUDENTS', 'STAFF', 'BOTH') DEFAULT 'STUDENTS',
      residency_filter ENUM('ALL', 'DAY', 'BOARDING') DEFAULT 'ALL',
      days_active VARCHAR(255) DEFAULT 'Mon,Tue,Wed,Thu,Fri', -- JSON or CSV of active days
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_event_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 3. Raw Biometric Logs (Buffer / Chaos Handler)
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS biometric_logs_raw (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      device_uid VARCHAR(120) NOT NULL,
      rfid_uid VARCHAR(120) NOT NULL,
      scan_timestamp DATETIME NOT NULL,
      server_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      direction_hint ENUM('IN', 'OUT', 'UNKNOWN') DEFAULT 'UNKNOWN',
      is_manual_correction BOOLEAN DEFAULT FALSE,
      is_processed BOOLEAN DEFAULT FALSE,
      INDEX idx_raw_school_rfid (school_id, rfid_uid),
      INDEX idx_raw_processed (is_processed)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Migration: Ensure columns exist if table was already created
  try {
    await promisePool.query("ALTER TABLE biometric_logs_raw ADD COLUMN direction_hint ENUM('IN', 'OUT', 'UNKNOWN') DEFAULT 'UNKNOWN'");
    await promisePool.query("ALTER TABLE biometric_logs_raw ADD COLUMN is_manual_correction BOOLEAN DEFAULT FALSE");
  } catch (err) { /* ignore if already exists */ }


  // 4. Daily Attendance Summary (Aggregated Truth)
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS daily_attendance_summary (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      person_id INT UNSIGNED NOT NULL,
      person_type ENUM('STUDENT', 'STAFF') NOT NULL,
      attendance_date DATE NOT NULL,
      first_in DATETIME NULL,
      last_out DATETIME NULL,
      status ENUM('Present', 'Late', 'Absent', 'Excused') DEFAULT 'Absent',
      remarks TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_person_date (school_id, person_id, person_type, attendance_date),
      INDEX idx_date_school (school_id, attendance_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  tablesReady = true;
  console.log('✅ IoT Attendance Tables Verified');
}

function resolveSchoolId(req) {
  return (
    req.session?.school_id ||
    req.session?.user?.school_id ||
    req.user?.school_id ||
    null
  );
}

// ════════════════════════════════════════════════════════════════
// IOT DEVICE MANAGEMENT
// ════════════════════════════════════════════════════════════════

// GET /api/iot/devices
router.get('/devices', requireRole(SCHOOL_ROLES), async (req, res) => {
  try {
    await ensureIotTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const [rows] = await promisePool.query(
      'SELECT * FROM school_iot_devices WHERE school_id = ? ORDER BY created_at DESC',
      [schoolId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /iot/devices:', err);
    res.status(500).json({ success: false, message: 'Failed to load devices' });
  }
});

// POST /api/iot/devices
router.post('/devices', requireRole(SCHOOL_ROLES), async (req, res) => {
  try {
    await ensureIotTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const { device_uid, device_label, device_type, purpose, mapped_event_id, mapped_class_id } = req.body;
    if (!device_uid) return res.status(400).json({ success: false, message: 'Device UID is required' });

    await promisePool.query(
      `INSERT INTO school_iot_devices (school_id, device_uid, device_label, device_type, purpose, mapped_event_id, mapped_class_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
          device_label = VALUES(device_label), 
          device_type = VALUES(device_type), 
          purpose = VALUES(purpose),
          mapped_event_id = VALUES(mapped_event_id),
          mapped_class_id = VALUES(mapped_class_id)`,
      [schoolId, device_uid, device_label || device_uid, device_type || 'GATE_SCANNER', purpose || null, mapped_event_id || null, mapped_class_id || null]
    );
    res.json({ success: true, message: 'Device registered successfully' });
  } catch (err) {
    console.error('POST /iot/devices:', err);
    res.status(500).json({ success: false, message: 'Failed to register device' });
  }
});

// ════════════════════════════════════════════════════════════════
// OPERATIONAL PULSES (Attendance Events)
// ════════════════════════════════════════════════════════════════

// GET /api/iot/events
router.get('/events', requireRole(SCHOOL_ROLES), async (req, res) => {
  try {
    await ensureIotTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const [rows] = await promisePool.query(
      'SELECT * FROM attendance_events WHERE school_id = ? ORDER BY start_time ASC',
      [schoolId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /iot/events:', err);
    res.status(500).json({ success: false, message: 'Failed to load events' });
  }
});

// POST /api/iot/events
router.post('/events', requireRole(SCHOOL_ROLES), async (req, res) => {
  try {
    await ensureIotTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const { id, event_name, start_time, end_time, late_threshold, target_group, residency_filter, days_active } = req.body;
    
    if (id) {
      await promisePool.query(
        `UPDATE attendance_events SET event_name=?, start_time=?, end_time=?, late_threshold=?, target_group=?, residency_filter=?, days_active=?
         WHERE id = ? AND school_id = ?`,
        [event_name, start_time, end_time, late_threshold, target_group || 'STUDENTS', residency_filter || 'ALL', days_active || 'Mon,Tue,Wed,Thu,Fri', id, schoolId]
      );
    } else {
      await promisePool.query(
        `INSERT INTO attendance_events (school_id, event_name, start_time, end_time, late_threshold, target_group, residency_filter, days_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [schoolId, event_name, start_time, end_time, late_threshold, target_group || 'STUDENTS', residency_filter || 'ALL', days_active || 'Mon,Tue,Wed,Thu,Fri']
      );
    }
    res.json({ success: true, message: 'Event saved successfully' });
  } catch (err) {
    console.error('POST /iot/events:', err);
    res.status(500).json({ success: false, message: 'Failed to save event' });
  }
});

// DELETE /api/iot/events/:id
router.delete('/events/:id', requireRole(SCHOOL_ROLES), async (req, res) => {
  try {
    await ensureIotTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    await promisePool.query('DELETE FROM attendance_events WHERE id = ? AND school_id = ?', [req.params.id, schoolId]);
    res.json({ success: true, message: 'Event removed' });
  } catch (err) {
    console.error('DELETE /iot/events:', err);
    res.status(500).json({ success: false, message: 'Failed to remove event' });
  }
});

// ════════════════════════════════════════════════════════════════
// IOT SYNC & REAL-TIME FEEDBACK (NodeMCU Endpoint)
// ════════════════════════════════════════════════════════════════

// POST /api/iot/v1/sync
router.post('/v1/sync', async (req, res) => {
  try {
    await ensureIotTables();
    const { device_mac, scans } = req.body;
    if (!device_mac || !scans || !Array.isArray(scans)) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    // 1. Identify which school this device belongs to
    const [[device]] = await promisePool.query(
      'SELECT school_id, device_label, device_type FROM school_iot_devices WHERE device_uid = ? AND is_active = 1 LIMIT 1',
      [device_mac]
    );

    if (!device) {
      return res.status(403).json({ 
        success: false, 
        instruction: { screen: "DEVICE UNREGISTERED", color: "RED" } 
      });
    }

    const schoolId = device.school_id;
    const results = [];

    for (const scan of scans) {
      const { rfid_uid, timestamp } = scan;
      let scanTime = timestamp ? new Date(timestamp) : new Date();

      // [HARDENING] Sln 2: Handle "Year 1970" reset issues from hardware
      if (scanTime.getFullYear() < 2024) {
          console.log(`[IOT_HARDENING] Healing invalid timestamp (${scanTime.toISOString()}) for RFID ${rfid_uid}`);
          scanTime = new Date(); // Use current server time
      }

      // a) Chaos Handling: Check for duplicate scan in the last 10 seconds (Deduplication)
      const [[exists]] = await promisePool.query(
        'SELECT id FROM biometric_logs_raw WHERE school_id = ? AND rfid_uid = ? AND scan_timestamp > DATE_SUB(?, INTERVAL 10 SECOND) LIMIT 1',
        [schoolId, rfid_uid, scanTime]
      );

      if (exists) {
        results.push({ rfid_uid, status: 'duplicate', name: 'Wait...', msg: 'Already scanned' });
        continue;
      }

      // b) Guess Direction (Temporal Logic)
      const now = new Date(scanTime);
      const hours = now.getHours();
      const mins = now.getMinutes();
      const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;

      let direction = 'UNKNOWN';
      let msgPrefix = '';

      // 1. Check if scan falls into a defined Pulse Window (Arrival/Departure)
      const [pulses] = await promisePool.query(
        'SELECT * FROM attendance_events WHERE school_id = ? AND is_active = 1',
        [schoolId]
      );
      
      const morningPulse = pulses.find(p => (p.event_name.toLowerCase().includes('morning') || p.event_name.toLowerCase().includes('arrival')) && timeStr >= p.start_time && timeStr <= p.end_time);
      const afternoonPulse = pulses.find(p => (p.event_name.toLowerCase().includes('afternoon') || p.event_name.toLowerCase().includes('departure') || p.event_name.toLowerCase().includes('exit')) && timeStr >= p.start_time && timeStr <= p.end_time);

      if (morningPulse) {
        direction = 'IN';
        msgPrefix = 'IN: ';
      } else if (afternoonPulse) {
        direction = 'OUT';
        msgPrefix = 'OUT: ';
      } else {
        // 2. Toggle Logic based on last scan today
        const [[lastScan]] = await promisePool.query(
          `SELECT direction_hint FROM biometric_logs_raw 
           WHERE school_id = ? AND rfid_uid = ? AND DATE(scan_timestamp) = DATE(?)
           ORDER BY scan_timestamp DESC LIMIT 1`,
          [schoolId, rfid_uid, scanTime]
        );

        if (!lastScan) {
           direction = 'IN'; // Default first scan is IN
        } else {
           direction = lastScan.direction_hint === 'IN' ? 'OUT' : 'IN';
        }
        msgPrefix = direction === 'IN' ? 'IN: ' : 'OUT: ';
      }

      // c) Store Raw Log with Hint
      await promisePool.query(
        'INSERT INTO biometric_logs_raw (school_id, device_uid, rfid_uid, scan_timestamp, direction_hint) VALUES (?, ?, ?, ?, ?)',
        [schoolId, device_mac, rfid_uid, scanTime, direction]
      );

      // d) Real-time Lookup for Feedback (Student)
      const [[student]] = await promisePool.query(
        'SELECT id, first_name, last_name, class_name FROM students WHERE school_id = ? AND rfid_uid = ? LIMIT 1',
        [schoolId, rfid_uid]
      );

      if (student) {
        results.push({
          rfid_uid,
          status: 'success',
          name: `${student.first_name} ${student.last_name}`.substring(0, 16),
          info: student.class_name || 'Student',
          msg: `${msgPrefix}Success`,
          direction,
          color: 'GREEN'
        });
        continue;
      }

      // e) Real-time Lookup (Staff)
      const [[staff]] = await promisePool.query(
        `SELECT u.first_name, u.last_name, r.role_name 
         FROM staff st 
         INNER JOIN users u ON u.id = st.user_id 
         INNER JOIN roles r ON r.id = u.role_id
         WHERE st.school_id = ? AND st.rfid_uid = ? LIMIT 1`,
        [schoolId, rfid_uid]
      );

      if (staff) {
        results.push({
          rfid_uid,
          status: 'success',
          name: `${staff.first_name} ${staff.last_name}`.substring(0, 16),
          info: staff.role_name,
          msg: `${msgPrefix}Welcome`,
          direction,
          color: 'GREEN'
        });
        continue;
      }


      // e) Unknown Card
      results.push({
        rfid_uid,
        status: 'unknown',
        name: 'Unknown',
        msg: 'Unregistered ID',
        color: 'YELLOW'
      });
    }

    const feedback = scans.length === 1 ? results[0] : { success: true, processed: results.length };
    res.json(feedback);
  } catch (err) {
    console.error('IOT Sync Error:', err);
    res.status(500).json({ status: 'error', msg: 'System Error' });
  }
});

// POST /api/iot/v1/correct
// Triggered by the "Mistake Button" on hardware
router.post('/v1/correct', async (req, res) => {
  try {
    await ensureIotTables();
    const { device_mac, rfid_uid } = req.body;
    
    if (!device_mac || !rfid_uid) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    // Find the very last scan for this student today
    const [lastScans] = await promisePool.query(
      `SELECT id, direction_hint FROM biometric_logs_raw 
       WHERE device_uid = ? AND rfid_uid = ? AND scan_timestamp > DATE_SUB(NOW(), INTERVAL 1 MINUTE)
       ORDER BY scan_timestamp DESC LIMIT 1`,
      [device_mac, rfid_uid]
    );

    if (lastScans.length === 0) {
      return res.status(404).json({ success: false, message: 'No recent scan found to correct' });
    }

    const lastScan = lastScans[0];
    const newDirection = lastScan.direction_hint === 'IN' ? 'OUT' : 'IN';

    await promisePool.query(
      'UPDATE biometric_logs_raw SET direction_hint = ?, is_manual_correction = 1 WHERE id = ?',
      [newDirection, lastScan.id]
    );

    res.json({ 
      success: true, 
      msg: `FLIPPED TO ${newDirection}`,
      new_direction: newDirection,
      color: 'CYAN'
    });
  } catch (err) {
    console.error('Correction Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// ════════════════════════════════════════════════════════════════
// ATTENDANCE RECONCILIATION ENGINE (Smart Reconciliation)
// ════════════════════════════════════════════════════════════════

/**
 * REUSABLE Core Reconciliation Function (Used by API and Scheduler)
 */
async function runSchoolReconciliation(schoolId, date) {
    await ensureIotTables();
    const scanDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(date).getDay()];

    // 1. Fetch Students & Staff
    const [students] = await promisePool.query(
        'SELECT id, rfid_uid, residency_status FROM students WHERE school_id = ?',
        [schoolId]
    );
    const [staff] = await promisePool.query(
        'SELECT id, rfid_uid FROM staff WHERE school_id = ?',
        [schoolId]
    );

    // 2. Fetch Contextual Data
    const [events] = await promisePool.query(
        'SELECT * FROM attendance_events WHERE school_id = ? AND is_active = 1',
        [schoolId]
    );
    const [devices] = await promisePool.query(
        'SELECT * FROM school_iot_devices WHERE school_id = ? AND is_active = 1',
        [schoolId]
    );
    const [timetable] = await promisePool.query(
        'SELECT * FROM academic_timetables WHERE school_id = ? AND day_of_week = ?',
        [schoolId, scanDay]
    );
    const [logs] = await promisePool.query(
        `SELECT rfid_uid, scan_timestamp, device_uid, direction_hint, is_manual_correction 
         FROM biometric_logs_raw 
         WHERE school_id = ? AND DATE(scan_timestamp) = ?`,
        [schoolId, date]
    );
    const [teacherRecords] = await promisePool.query(
        `SELECT ar.student_id, ar.status FROM academic_attendance_records ar
         INNER JOIN academic_attendance_logs al ON al.id = ar.log_id
         WHERE al.school_id = ? AND al.record_date = ?`,
        [schoolId, date]
    );

    const allPeople = [
        ...students.map(s => ({ ...s, type: 'STUDENT' })),
        ...staff.map(st => ({ ...st, type: 'STAFF', residency_status: 'ALL' }))
    ];

    const results = [];

    for (const person of allPeople) {
        let finalStatus = 'Absent';
        let remarks = '';
        
        const personLogs = logs.filter(l => l.rfid_uid === person.rfid_uid)
            .sort((a,b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp));
        
        // a) Identify Logical Arrival & Departure
        const inScans = personLogs.filter(l => l.direction_hint === 'IN');
        const outScans = personLogs.filter(l => l.direction_hint === 'OUT');

        const firstIn = inScans.length > 0 ? inScans[0].scan_timestamp : (personLogs.length > 0 ? personLogs[0].scan_timestamp : null);
        const lastOut = outScans.length > 0 ? outScans[outScans.length - 1].scan_timestamp : (personLogs.length > 1 ? personLogs[personLogs.length - 1].scan_timestamp : null);

        // b) Operational Pulses (Arrival/Assembly/etc)
        const activePulses = events.filter(e => {
            const groupMatch = e.target_group === 'BOTH' || e.target_group === (person.type + 'S');
            const residencyMatch = person.type === 'STAFF' || e.residency_filter === 'ALL' || e.residency_filter === person.residency_status;
            const dateMatch = (e.days_active || 'Mon,Tue,Wed,Thu,Fri').split(',').includes(scanDay);
            return groupMatch && residencyMatch && dateMatch;
        });

        if (activePulses.length > 0) {
            const morningPulse = activePulses.find(p => p.event_name.toLowerCase().includes('morning') || p.event_name.toLowerCase().includes('arrival'));
            const checkTime = (person.type === 'STUDENT' && person.residency_status === 'BOARDING') ? null : firstIn;

            if (morningPulse && checkTime) {
                const scanTimeString = new Date(checkTime).toTimeString().split(' ')[0];
                if (scanTimeString <= morningPulse.late_threshold) finalStatus = 'Present';
                else if (scanTimeString <= morningPulse.end_time) {
                    finalStatus = 'Late';
                    remarks = `Late: ${morningPulse.event_name}`;
                }
            } else if (morningPulse && person.residency_status === 'BOARDING') {
                finalStatus = 'Present';
                remarks = 'Boarding Presence Assumed';
            }
        }

        // c) Classroom Granularity
        const scheduledForDay = timetable.filter(t => 
            (person.type === 'STUDENT' && t.class_name) || 
            (person.type === 'STAFF' && t.staff_id === person.id)
        );

        if (scheduledForDay.length > 0) {
            let classPresentCount = 0;
            for (const period of scheduledForDay) {
                const periodScan = personLogs.find(l => {
                    const lTime = new Date(l.scan_timestamp).toTimeString().split(' ')[0];
                    return lTime >= period.start_time && lTime <= period.end_time;
                });
                if (periodScan) {
                    const classReader = devices.find(d => d.device_type === 'CLASS_READER' && d.purpose?.toLowerCase().includes(period.class_name.toLowerCase()));
                    if (classReader && periodScan.device_uid === classReader.device_uid) {
                        classPresentCount++;
                    }
                }
            }
            if (classPresentCount > 0) {
                remarks += ` | Class Verified (${classPresentCount})`;
                if (finalStatus === 'Absent') finalStatus = 'Present';
            }
        }

        // d) Overrides & Corrections
        if (personLogs.some(l => l.is_manual_correction)) {
            remarks += ' [S.Verified]';
        }
        const override = teacherRecords.find(tr => tr.student_id === person.id);
        if (override) {
            finalStatus = override.status;
            remarks = 'Teacher Override';
        }
        if (person.type === 'STUDENT' && person.residency_status === 'DAY' && firstIn && finalStatus === 'Absent') {
            finalStatus = 'Present';
            remarks = 'Gate Scan Verified';
        }

        await promisePool.query(
            `INSERT INTO daily_attendance_summary (school_id, person_id, person_type, attendance_date, first_in, last_out, status, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE first_in=VALUES(first_in), last_out=VALUES(last_out), status=VALUES(status), remarks=VALUES(remarks)`,
            [schoolId, person.id, person.type, date, firstIn, lastOut, finalStatus, remarks]
        );
        results.push({ id: person.id, type: person.type, status: finalStatus });
    }
    return { success: true, processed: results.length, date };
}

router.post('/reconcile', requireRole(SCHOOL_ROLES), async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const { date } = req.body;
        if (!schoolId || !date) return res.status(400).json({ success: false, message: 'Missing parameters' });

        const result = await runSchoolReconciliation(schoolId, date);
        res.json(result);
    } catch (err) {
        console.error('Reconciliation Error:', err);
        res.status(500).json({ success: false, message: 'Reconciliation failed' });
    }
});

module.exports = router;
module.exports.runSchoolReconciliation = runSchoolReconciliation;
