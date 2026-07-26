'use strict';

const { insertRoleIfMissing } = require('./roleInsert');
const { ensureRolesPrimaryKey } = require('./coreAuthSchema');

/** Platform + school roles required on a fresh database. */
const CORE_ROLES = [
  { roleName: 'Super Admin', roleCode: 'SUPER_ADMIN', description: 'Platform super administrator', permissions: '["*"]', isSystemRole: true },
  { roleName: 'Full System Controller', roleCode: 'FULL_SYSTEM_CONTROLLER', description: 'Platform-wide control dashboard', permissions: '["*"]', isSystemRole: true },
  { roleName: 'School Admin', roleCode: 'SCHOOL_ADMIN', description: 'School administrator', permissions: '[]', isSystemRole: true },
  { roleName: 'School Manager', roleCode: 'SCHOOL_MANAGER', description: 'School manager', permissions: '[]', isSystemRole: true },
  { roleName: 'NESA Admin', roleCode: 'NESA_ADMIN', description: 'NESA administrator', permissions: '[]', isSystemRole: true },
  { roleName: 'NESA Officer', roleCode: 'NESA_OFFICER', description: 'NESA officer', permissions: '[]', isSystemRole: false },
  { roleName: 'District Education Officer', roleCode: 'DEO', description: 'District education officer', permissions: '[]', isSystemRole: true },
  { roleName: 'Teacher', roleCode: 'TEACHER', description: 'Teaching staff', permissions: '[]', isSystemRole: false },
  { roleName: 'Accountant', roleCode: 'ACCOUNTANT', description: 'School accountant', permissions: '[]', isSystemRole: false },
  { roleName: 'Director of Studies', roleCode: 'DOS', description: 'Director of studies', permissions: '[]', isSystemRole: false },
  { roleName: 'Head of Department', roleCode: 'HOD', description: 'Head of department', permissions: '[]', isSystemRole: false },
  { roleName: 'Parent', roleCode: 'PARENT', description: 'Parent portal user', permissions: '[]', isSystemRole: false },
  { roleName: 'Field Agent', roleCode: 'AGENT', description: 'Field agent', permissions: '[]', isSystemRole: false },
  { roleName: 'School Representative', roleCode: 'SCHOOL_REPRESENTATIVE', description: 'Multi-school representative', permissions: '[]', isSystemRole: false },
];

async function ensureCoreRoles() {
  await ensureRolesPrimaryKey();
  for (const role of CORE_ROLES) {
    await insertRoleIfMissing(role);
  }
}

module.exports = { ensureCoreRoles, CORE_ROLES };
