const { promisePool } = require('../config/database');

async function seed() {
    console.log('🌱 Starting Refined Academic Seed (V3) with Holidays and Master Sequence...');
    const schoolId = 11;

    try {
        // Cleanup Milestones and Holidays to avoid dupes
        await promisePool.query('DELETE FROM school_term_milestones WHERE school_id = ?', [schoolId]);
        await promisePool.query('DELETE FROM school_holidays WHERE school_id = ?', [schoolId]);

        // 1. School Holidays
        console.log(' - Seeding Holidays...');
        const holidays = [
            { name: 'New Year', start: '2025-01-01', end: '2025-01-02', type: 'Public Holiday' },
            { name: 'Heroes Day', start: '2025-02-01', end: '2025-02-01', type: 'Public Holiday' },
            { name: 'Genocide Memorial Day', start: '2025-04-07', end: '2025-04-07', type: 'National Event' },
            { name: 'Labor Day', start: '2025-05-01', end: '2025-05-01', type: 'Public Holiday' },
            { name: 'Independence Day', start: '2025-07-01', end: '2025-07-01', type: 'Public Holiday' },
            { name: 'Liberation Day', start: '2025-07-04', end: '2025-07-04', type: 'National Event' },
            { name: 'Christmas Day', start: '2025-12-25', end: '2025-12-25', type: 'Public Holiday' }
        ];

        for (const h of holidays) {
            await promisePool.query(
                'INSERT INTO school_holidays (school_id, name, start_date, end_date, holiday_type) VALUES (?, ?, ?, ?, ?)',
                [schoolId, h.name, h.start, h.end, h.type]
            );
        }

        // 2. Terms and Multi-Milestone Sequences
        console.log(' - Seeding Terms and Complete Activity Sequences...');
        const terms = [
            { name: 'Term 1 2025', start: '2025-01-06', end: '2025-03-28' },
            { name: 'Term 2 2025', start: '2025-04-14', end: '2025-07-04' },
            { name: 'Term 3 2025', start: '2025-08-04', end: '2025-10-31' }
        ];

        for (const t of terms) {
            // Upsert the term
            await promisePool.query(
                'INSERT INTO school_terms (school_id, name, start_date, end_date) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE start_date=VALUES(start_date)',
                [schoolId, t.name, t.start, t.end]
            );
            // Get the ID
            const termId = (await promisePool.query('SELECT id FROM school_terms WHERE school_id=? AND name=? LIMIT 1', [schoolId, t.name]))[0][0].id;
            
            // Generate full sequence of activities
            const milestones = [
                { name: 'Term Commencement & Registration', timing: 'Week 1', sort_order: 1 },
                { name: 'First Continuous Assessment', timing: 'Week 4', sort_order: 2 },
                { name: 'Mid-term Examinations', timing: 'Week 6-7', sort_order: 3 },
                { name: 'Academic Reports Draft', timing: 'Week 9', sort_order: 4 },
                { name: 'End-term Examinations', timing: 'Week 10-11', sort_order: 5 },
                { name: 'Term Closure & Report Distribution', timing: 'Week 12', sort_order: 6 }
            ];

            for (const m of milestones) {
                await promisePool.query(
                    'INSERT INTO school_term_milestones (school_id, term_id, name, timing, sort_order) VALUES (?, ?, ?, ?, ?)',
                    [schoolId, termId, m.name, m.timing, m.sort_order]
                );
            }
        }

        console.log('✅ Sequence and Holidays Seeding Complete for School 11!');
    } catch (err) {
        console.error('❌ Seeding Failed:', err);
    } finally {
        process.exit(0);
    }
}

seed();
