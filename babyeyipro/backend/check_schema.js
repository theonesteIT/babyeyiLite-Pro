const { query } = require('./config/database');

async function check() {
    try {
        const tables = ['schools', 'students', 'users'];
        for (const table of tables) {
            console.log(`--- Table: ${table} ---`);
            const rows = await query(`DESCRIBE ${table}`);
            console.log(rows.map(r => r.Field).join(', '));
            console.log('\n');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
