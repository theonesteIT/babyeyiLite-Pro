const { runSchoolReconciliation } = require('../BabyeyiRoutes/iotAttendance');
const { promisePool } = require('../config/database');

/**
 * Attendance Scheduler
 * Automatically runs reconciliation for all active schools every day at 1:00 AM.
 */
function initAttendanceScheduler() {
    console.log('📅 Attendance Scheduler Initialized');

    // Run a check every hour
    setInterval(async () => {
        const now = new Date();
        const hour = now.getHours();

        // Target: 1:00 AM
        if (hour === 1) {
            console.log('🚀 Starting Daily Auto-Reconciliation (1:00 AM)...');
            
            try {
                // 1. Get all schools that have IoT devices registered
                const [schools] = await promisePool.query(
                    'SELECT DISTINCT school_id FROM school_iot_devices WHERE is_active = 1'
                );

                // 2. Calculate "Yesterday" date (YYYY-MM-DD)
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const dateStr = yesterday.toISOString().split('T')[0];

                console.log(`📊 Processing ${schools.length} schools for date: ${dateStr}`);

                for (const school of schools) {
                    try {
                        const result = await runSchoolReconciliation(school.school_id, dateStr);
                        console.log(`✅ School ${school.school_id}: Processed ${result.processed} records.`);
                    } catch (err) {
                        console.error(`❌ Failed to reconcile School ${school.school_id}:`, err);
                    }
                }
                
                console.log('🏁 Daily Auto-Reconciliation Complete.');
            } catch (err) {
                console.error('❌ Scheduler Query Failed:', err);
            }
        }
    }, 60 * 60 * 1000); // Check every 60 minutes
}

module.exports = { initAttendanceScheduler };
