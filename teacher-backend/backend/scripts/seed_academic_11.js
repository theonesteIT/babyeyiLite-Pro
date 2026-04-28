const { promisePool } = require('../config/database');

async function seed() {
    console.log('🌱 Starting Academic Seed for School 11...');
    const schoolId = 11;

    try {
        // 1. Subjects Registry
        const subjects = [
            { name: 'Mathematics', category: 'Science' },
            { name: 'English', category: 'Languages' },
            { name: 'Kinyarwanda', category: 'Languages' },
            { name: 'French', category: 'Languages' },
            { name: 'Physics', category: 'Science' },
            { name: 'Chemistry', category: 'Science' },
            { name: 'Biology', category: 'Science' },
            { name: 'History', category: 'Arts' },
            { name: 'Geography', category: 'Arts' },
            { name: 'Entrepreneurship', category: 'Technical' },
            { name: 'Social Studies', category: 'General' },
            { name: 'General Science', category: 'Science' }
        ];

        console.log(' - Seeding Subjects...');
        for (const sub of subjects) {
            await promisePool.query(
                'INSERT INTO school_subjects (school_id, name, category) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE category=VALUES(category)',
                [schoolId, sub.name, sub.category]
            );
        }

        // 2. School Calendar (2025)
        console.log(' - Seeding Terms...');
        const terms = [
            { name: 'Term 1 2025', start: '2025-01-06', end: '2025-03-28' },
            { name: 'Term 2 2025', start: '2025-04-14', end: '2025-07-04' },
            { name: 'Term 3 2025', start: '2025-08-04', end: '2025-10-31' }
        ];

        for (const t of terms) {
            const [rows] = await promisePool.query(
                'INSERT INTO school_terms (school_id, name, start_date, end_date) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE start_date=VALUES(start_date), end_date=VALUES(end_date)',
                [schoolId, t.name, t.start, t.end]
            );
            
            // Insert dummy milestones for each term
            const termId = rows.insertId || (await promisePool.query('SELECT id FROM school_terms WHERE school_id=? AND name=? LIMIT 1', [schoolId, t.name]))[0][0].id;
            
            await promisePool.query(
                'INSERT IGNORE INTO school_term_milestones (school_id, term_id, name, timing, sort_order) VALUES (?, ?, ?, ?, ?)',
                [schoolId, termId, 'Mid-term Exams', 'Week 6-7', 1]
            );
        }

        // 3. Holidays
        console.log(' - Seeding Holidays...');
        const holidays = [
            { name: 'New Year', start: '2025-01-01', end: '2025-01-02' },
            { name: 'Heroes Day', start: '2025-02-01', end: '2025-02-01' },
            { name: 'Genocide Memorial Day', start: '2025-04-07', end: '2025-04-07' },
            { name: 'Independence Day', start: '2025-07-01', end: '2025-07-01' },
            { name: 'Liberation Day', start: '2025-07-04', end: '2025-07-04' },
            { name: 'Christmas Day', start: '2025-12-25', end: '2025-12-25' }
        ];

        for (const h of holidays) {
            await promisePool.query(
                'INSERT IGNORE INTO school_holidays (school_id, name, start_date, end_date) VALUES (?, ?, ?, ?)',
                [schoolId, h.name, h.start, h.end]
            );
        }

        // 4. Academic Context
        console.log(' - Setting Active Context...');
        await promisePool.query(
            'INSERT INTO school_active_academic_context (school_id, academic_year, term) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE academic_year=VALUES(academic_year), term=VALUES(term)',
            [schoolId, '2025', 'Term 1 2025']
        );

        // 5. Subject Configuration (Linking)
        console.log(' - Linking Subjects to Classes...');
        const [subRows] = await promisePool.query('SELECT id, name FROM school_subjects WHERE school_id = ?', [schoolId]);
        const getSubId = (name) => subRows.find(s => s.name === name)?.id;

        const config = [
            { className: 'P1 A', subject: 'Mathematics', code: 'MAT', periods: 7, credits: 5 },
            { className: 'P1 A', subject: 'English', code: 'ENG', periods: 5, credits: 4 },
            { className: 'S1 A', subject: 'Physics', code: 'PHY', periods: 4, credits: 3 },
            { className: 'S1 A', subject: 'Mathematics', code: 'MAT', periods: 6, credits: 5 },
            { className: 'S4 A', subject: 'Mathematics', code: 'MCB-MAT', periods: 8, credits: 7 }
        ];

        for (const c of config) {
            const sid = getSubId(c.subject);
            if (sid) {
                await promisePool.query(
                    `INSERT INTO class_subject_configuration (school_id, class_name, subject_id, subject_code, periods_per_week, credits)
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE subject_code=VALUES(subject_code), periods_per_week=VALUES(periods_per_week), credits=VALUES(credits)`,
                    [schoolId, c.className, sid, c.code, c.periods, c.credits]
                );
            }
        }

        // 6. Timetable
        console.log(' - Generating Sample Timetable entries...');
        const timetable = [
            { class: 'P1 A', subject: 'Mathematics', staff: 15, day: 'Monday', start: '08:00', end: '08:40', room: 'P1-Room' },
            { class: 'P1 A', subject: 'English', staff: 16, day: 'Monday', start: '08:40', end: '09:20', room: 'P1-Room' },
            { class: 'S1 A', subject: 'Physics', staff: 15, day: 'Tuesday', start: '10:00', end: '11:00', room: 'Lab 1' },
            { class: 'S1 A', subject: 'Mathematics', staff: 16, day: 'Wednesday', start: '09:00', end: '10:00', room: 'Room 5' }
        ];

        for (const tt of timetable) {
            await promisePool.query(
                `INSERT IGNORE INTO academic_timetables (school_id, class_name, subject_name, staff_id, day_of_week, start_time, end_time, room)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [schoolId, tt.class, tt.subject, tt.staff, tt.day, tt.start, tt.end, tt.room]
            );
        }

        console.log('✅ Seeding Complete for School 11!');
    } catch (err) {
        console.error('❌ Seeding Failed:', err);
    } finally {
        process.exit(0);
    }
}

seed();
