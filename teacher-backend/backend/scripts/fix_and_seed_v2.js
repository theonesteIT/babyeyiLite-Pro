const { promisePool } = require('../config/database');

async function seed() {
    console.log('🌱 Starting Refined Academic Seed (V2) for School 11...');
    const schoolId = 11;

    try {
        // 1. Periods (School Day Structure)
        console.log(' - Seeding School Periods...');
        const periods = [
            { name: 'Period 1', start: '08:00', end: '08:40', break: 0 },
            { name: 'Period 2', start: '08:40', end: '09:20', break: 0 },
            { name: 'Period 3', start: '09:20', end: '10:00', break: 0 },
            { name: 'Morning Break', start: '10:00', end: '10:30', break: 1 },
            { name: 'Period 4', start: '10:30', end: '11:10', break: 0 },
            { name: 'Period 5', start: '11:10', end: '11:50', break: 0 },
            { name: 'Period 6', start: '11:50', end: '12:30', break: 0 },
            { name: 'Lunch Break', start: '12:30', end: '13:30', break: 1 },
            { name: 'Period 7', start: '13:30', end: '14:10', break: 0 },
            { name: 'Period 8', start: '14:10', end: '14:50', break: 0 },
            { name: 'Period 9', start: '14:50', end: '15:30', break: 0 },
            { name: 'Extra Curricular', start: '15:30', end: '16:10', break: 0 }
        ];

        for (let i = 0; i < periods.length; i++) {
            const p = periods[i];
            await promisePool.query(
                'INSERT INTO school_periods (school_id, period_name, start_time, end_time, is_break, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
                [schoolId, p.name, p.start, p.end, p.break, i]
            );
        }

        // 2. Subjects with NESA Codes
        console.log(' - Seeding Subjects with Module Codes...');
        const subjects = [
            { name: 'Mathematics', code: 'GENAT038', cat: 'Science' },
            { name: 'English', code: 'LIT201', cat: 'Languages' },
            { name: 'Kinyarwanda', code: 'KIN101', cat: 'Languages' },
            { name: 'Physics', code: 'PHY304', cat: 'Science' },
            { name: 'Chemistry', code: 'CHE302', cat: 'Science' },
            { name: 'Biology', code: 'BIO301', cat: 'Science' },
            { name: 'Entrepreneurship', code: 'ENT405', cat: 'Technical' },
            { name: 'Geography', code: 'GEO202', cat: 'Arts' },
            { name: 'History', code: 'HIS201', cat: 'Arts' }
        ];

        for (const sub of subjects) {
            await promisePool.query(
                'INSERT INTO school_subjects (school_id, name, category, subject_code) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE subject_code=VALUES(subject_code)',
                [schoolId, sub.name, sub.cat, sub.code]
            );
        }

        // 3. School Terms
        console.log(' - Seeding Terms...');
        const terms = [
            { name: 'Term 1 2025', start: '2025-01-06', end: '2025-03-28' },
            { name: 'Term 2 2025', start: '2025-04-14', end: '2025-07-04' },
            { name: 'Term 3 2025', start: '2025-08-04', end: '2025-10-31' }
        ];

        for (const t of terms) {
            const [rows] = await promisePool.query(
                'INSERT INTO school_terms (school_id, name, start_date, end_date) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE start_date=VALUES(start_date)',
                [schoolId, t.name, t.start, t.end]
            );
            const termId = rows.insertId || (await promisePool.query('SELECT id FROM school_terms WHERE school_id=? AND name=? LIMIT 1', [schoolId, t.name]))[0][0].id;
            await promisePool.query(
                'INSERT INTO school_term_milestones (school_id, term_id, name, timing, sort_order) VALUES (?, ?, ?, ?, ?)',
                [schoolId, termId, 'Mid-term Exams', 'Week 6-7', 1]
            );
        }

        // 4. Timetable (Multiple Sessions per Teacher)
        console.log(' - Generating Multi-Session Timetable...');
        const timetable = [
            // Alice (ID 15)
            { class: 'P1 A', subject: 'Mathematics', staff: 15, day: 'Monday', start: '08:00', end: '08:40', room: 'P1-Room' },
            { class: 'P1 A', subject: 'Mathematics', staff: 15, day: 'Monday', start: '08:40', end: '09:20', room: 'P1-Room' }, // Double period
            { class: 'S1 A', subject: 'Physics', staff: 15, day: 'Monday', start: '11:10', end: '11:50', room: 'Lab 1' },
            
            // Bob (ID 16)
            { class: 'P1 A', subject: 'English', staff: 16, day: 'Monday', start: '09:20', end: '10:00', room: 'P1-Room' },
            { class: 'S1 A', subject: 'Mathematics', staff: 16, day: 'Monday', start: '11:50', end: '12:30', room: 'Room 5' },
            { class: 'S1 A', subject: 'Mathematics', staff: 16, day: 'Tuesday', start: '08:00', end: '08:40', room: 'Room 5' }
        ];

        for (const tt of timetable) {
            await promisePool.query(
                `INSERT INTO academic_timetables (school_id, class_name, subject_name, staff_id, day_of_week, start_time, end_time, room)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [schoolId, tt.class, tt.subject, tt.staff, tt.day, tt.start, tt.end, tt.room]
            );
        }

        console.log('✅ Refined Seeding Complete for School 11!');
    } catch (err) {
        console.error('❌ Seeding Failed:', err);
    } finally {
        process.exit(0);
    }
}

seed();
