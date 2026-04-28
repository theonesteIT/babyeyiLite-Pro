const express = require('express');
const router = express.Router();
const { promisePool: db } = require('../config/database');

// Resolve School ID from session
function resolveSchoolId(req) {
    return (
        req.session?.school_id ||
        req.session?.user?.school_id ||
        req.user?.school_id ||
        null
    );
}

// ── DB Setup ──────────────────────────────────────────────────
/** Same rules as babyeyipro SmartSchoolHardwarePage / Student wizard display labels. */
function formatCombinationBackend(combo) {
    if (combo == null || combo === '') return '';
    if (Array.isArray(combo)) return combo.map((x) => String(x).trim()).filter(Boolean).join(' ');
    if (typeof combo === 'object') {
        const vals = Object.values(combo).filter((v) => v != null && String(v).trim() !== '');
        if (vals.length) return vals.map((v) => String(v).trim()).join(' ');
        return '';
    }
    return String(combo).trim();
}

function formatSchoolClassRowLabel(r) {
    if (!r) return '';
    if (r._from_students) return String(r.group_name || '').trim();
    const stream = r.stream_name && String(r.stream_name).trim() !== '' ? r.stream_name : '';
    const combo = formatCombinationBackend(r.combination);
    const parts = [r.group_name, stream, combo].filter((p) => p != null && String(p).trim() !== '');
    return parts.join(' ').replace(/\s+/g, ' ').trim();
}

async function ensureClassesTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS school_classes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT UNSIGNED NOT NULL,
            group_name VARCHAR(100) NOT NULL,
            stream_name VARCHAR(100) NULL,
            category VARCHAR(50) NULL,
            combination JSON NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            KEY idx_school_id (school_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
}

// ── GET School Classes ──────────────────────────────────────────
router.get('/schools/:id/classes', async (req, res) => {
    try {
        await ensureClassesTable();
        const schoolId = req.params.id;
        const [rows] = await db.query(
            'SELECT * FROM school_classes WHERE school_id = ? ORDER BY group_name, stream_name',
            [schoolId]
        );

        // Robust JSON parsing for combination field
        let parsedRows = rows.map(r => {
            let finalCombo = r.combination;
            if (typeof finalCombo === 'string' && finalCombo.trim().startsWith('[')) {
                try { finalCombo = JSON.parse(finalCombo); } catch (_) {}
            }
            return { ...r, combination: finalCombo };
        });

        // If the school has not configured class rows yet, derive options from enrolled students
        // (distinct class_name) so portals still show real classes from the database.
        if (!parsedRows.length) {
            const [fromStudents] = await db.query(
                `SELECT TRIM(class_name) AS class_name
                 FROM students
                 WHERE school_id = ?
                   AND class_name IS NOT NULL
                   AND TRIM(class_name) != ''
                 GROUP BY TRIM(class_name)
                 ORDER BY TRIM(class_name) ASC`,
                [schoolId]
            );
            parsedRows = (fromStudents || []).map((r) => ({
                id: null,
                school_id: Number(schoolId),
                group_name: r.class_name,
                stream_name: null,
                category: null,
                combination: null,
                _from_students: true,
            }));
        }

        // Merged list for class filters (Smart Access, etc.): structure labels + every distinct
        // students.class_name (matches school-console import / free-text registration).
        let distinctStudentClasses = [];
        try {
            const [stuRows] = await db.query(
                `SELECT TRIM(class_name) AS c
                 FROM students
                 WHERE school_id = ?
                   AND class_name IS NOT NULL
                   AND TRIM(class_name) != ''
                 GROUP BY TRIM(class_name)`,
                [schoolId]
            );
            distinctStudentClasses = (stuRows || []).map((x) => x.c).filter(Boolean);
        } catch (_) {
            distinctStudentClasses = [];
        }

        const fromStructure = parsedRows.map(formatSchoolClassRowLabel).filter(Boolean);
        const classNameOptions = [...new Set([...fromStructure, ...distinctStudentClasses])].sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true })
        );

        res.json({ success: true, data: parsedRows, class_name_options: classNameOptions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── POST/UPDATE School Classes ──────────────────────────────────
router.post('/schools/:id/classes', async (req, res) => {
    const conn = await db.getConnection();
    try {
        await ensureClassesTable();
        await conn.beginTransaction();
        const schoolId = req.params.id;
        const { groups } = req.body;

        // Cleanup existing for this school
        await conn.query('DELETE FROM school_classes WHERE school_id = ?', [schoolId]);

        if (groups && groups.length > 0) {
            const values = groups.map(g => [
                schoolId,
                g.group_name,
                g.stream_name || 'A',
                g.category || null,
                // Ensure combination is JSON string if it's an object/array, else null
                (g.combination ? (typeof g.combination === 'object' ? JSON.stringify(g.combination) : g.combination) : null)
            ]);

            await conn.query(
                'INSERT INTO school_classes (school_id, group_name, stream_name, category, combination) VALUES ?',
                [values]
            );
        }

        await conn.commit();
        res.json({ success: true, message: 'Class structure updated successfully' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        conn.release();
    }
});

module.exports = router;
