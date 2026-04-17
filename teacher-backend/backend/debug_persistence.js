const { promisePool: db } = require('./config/database');

async function testPersistence() {
  const schoolId = 1; // Assuming ID 1 exists
  try {
    console.log('--- Testing Schools Update ---');
    const profile = {
      school_name: "Test Academy",
      school_category: "A-Level,O-Level",
      boarding_type: "Boarding School",
      offered_combinations: "PCM,MCB"
    };
    
    // Simulate the PUT logic
    const fieldMap = {
        schoolName: 'school_name', school_name: 'school_name',
        schoolCode: 'school_code', school_code: 'school_code',
        category: 'school_category', school_category: 'school_category',
        ownership: 'ownership_type', ownership_type: 'ownership_type',
        yearEstablished: 'year_established', year_established: 'year_established',
        boarding_type: 'boarding_type',
        vision: 'vision'
    };
    const setClauses = ['updated_at = NOW()'];
    const params = [];
    Object.entries(fieldMap).forEach(([bodyKey, colName]) => {
      if (profile[bodyKey] !== undefined) {
        setClauses.push(`${colName} = ?`);
        params.push(profile[bodyKey]);
      }
    });
    
    let combinations = profile.offered_combinations;
    if (typeof combinations === 'string' && combinations.includes(',')) {
      combinations = combinations.split(',').map(c => c.trim()).filter(Boolean);
    }
    setClauses.push('a_level_combinations = ?');
    params.push(JSON.stringify(combinations));
    
    params.push(schoolId);
    await db.query(`UPDATE schools SET ${setClauses.join(', ')} WHERE id = ?`, params);
    console.log('Schools updated.');

    console.log('--- Testing Groups Update ---');
    const groups = [
      { group_name: 'S4', stream_name: 'A', category: 'A-Level', combination: 'PCM' },
      { group_name: 'S1', stream_name: 'A', category: 'O-Level', combination: null }
    ];
    
    await db.query('DELETE FROM school_groups WHERE school_id = ?', [schoolId]);
    if (groups.length > 0) {
      const values = groups.map(g => [schoolId, g.group_name, g.stream_name, g.category, g.combination]);
      await db.query('INSERT INTO school_groups (school_id, group_name, stream_name, category, combination) VALUES ?', [values]);
    }
    console.log('Groups updated.');

    console.log('--- Verifying Load ---');
    const [sRows] = await db.query('SELECT school_name, school_category, boarding_type, a_level_combinations FROM schools WHERE id = ?', [schoolId]);
    console.log('School Data:', sRows[0]);
    
    const [gRows] = await db.query('SELECT group_name, stream_name, category, combination FROM school_groups WHERE school_id = ?', [schoolId]);
    console.log('Groups Data:', gRows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testPersistence();
