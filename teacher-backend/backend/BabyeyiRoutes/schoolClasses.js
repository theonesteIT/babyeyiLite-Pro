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
        const parsedRows = rows.map(r => {
            let finalCombo = r.combination;
            if (typeof finalCombo === 'string' && finalCombo.trim().startsWith('[')) {
                try { finalCombo = JSON.parse(finalCombo); } catch (_) {}
            }
            return { ...r, combination: finalCombo };
        });

        res.json({ success: true, data: parsedRows });
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
