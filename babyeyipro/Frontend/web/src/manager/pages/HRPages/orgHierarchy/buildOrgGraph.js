/** Build React Flow nodes/edges from departments + employee directory */

const POSITION_REPORTS = {
  Teacher: 'Dean of Studies',
  'Senior Teacher': 'Dean of Studies',
  'Dean of Studies': 'Head Teacher',
  Accountant: 'Chief Accountant',
  'Chief Accountant': 'Finance Department Head',
  Secretary: 'Administrator',
  Administrator: 'Head Teacher',
  Librarian: 'Head Teacher',
  'ICT Officer': 'Head Teacher',
  'Laboratory Assistant': 'Dean of Studies',
  'Head of Discipline': 'Head Teacher',
  'Store Manager': 'Administrator',
};

const DEPT_ICONS = {
  Leadership: 'Crown',
  Academics: 'GraduationCap',
  'Teaching Staff': 'GraduationCap',
  Finance: 'Wallet',
  Administration: 'Building2',
  ICT: 'Monitor',
  Laboratory: 'FlaskConical',
  Library: 'BookOpen',
  'Support Staff': 'Wrench',
  'Student Welfare': 'Heart',
  Discipline: 'Shield',
};

export const VACANT_POSITIONS = [
  { id: 'vac-teacher', title: 'Teacher', department: 'Academics', count: 2 },
  { id: 'vac-secretary', title: 'Secretary', department: 'Administration', count: 1 },
  { id: 'vac-accountant', title: 'Accountant', department: 'Finance', count: 1 },
  { id: 'vac-ict', title: 'ICT Officer', department: 'ICT', count: 1 },
];

export const ORG_TIMELINE = [
  { id: 't1', label: 'Teacher promoted', detail: 'Ishimwe Theo → Senior Teacher', date: '15 Jun 2026' },
  { id: 't2', label: 'Transferred to Academics', detail: 'Mukamana Grace', date: '10 May 2026' },
  { id: 't3', label: 'Position Created', detail: 'ICT Officer — Administration', date: '03 Apr 2026' },
];

export function formatRwf(amount) {
  const n = Number(amount) || 0;
  return `${new Intl.NumberFormat('en-RW').format(Math.round(n))} RWF`;
}

export function initials(name) {
  return (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function normalizeDeptName(name) {
  const n = String(name || '').trim();
  if (!n) return 'General';
  if (/teach|academic/i.test(n)) return 'Academics';
  if (/admin/i.test(n)) return 'Administration';
  if (/financ|account/i.test(n)) return 'Finance';
  if (/discipline|welfare/i.test(n)) return 'Discipline';
  return n;
}

function employmentCategory(emp) {
  const role = String(emp.role_code || emp.position || '').toUpperCase();
  const dept = String(emp.department || '').toLowerCase();
  if (role.includes('TEACHER') || role === 'DOS' || dept.includes('teach')) return 'Teaching';
  if (role.includes('MANAGER') || role.includes('DIRECTOR') || role.includes('DOS')) return 'Management';
  if (['SECRETARY', 'ADMIN', 'GATE'].some((k) => role.includes(k))) return 'Administrative';
  return 'Support';
}

function estimatePayroll(employees) {
  return employees.reduce((sum, e) => {
    const basic = Number(e.payroll_basic_salary || e._raw?.payroll_basic_salary) || 350000;
    return sum + basic;
  }, 0);
}

export function computeOrgStats(employees = [], departments = []) {
  const active = employees.filter((e) => ['Active', 'On Leave'].includes(e.status) || !e.status);
  const teaching = employees.filter((e) => employmentCategory(e) === 'Teaching');
  const management = employees.filter((e) => employmentCategory(e) === 'Management');
  const vacant = VACANT_POSITIONS.reduce((s, v) => s + v.count, 0);
  const positions = new Set(employees.map((e) => e.position || e.job_title).filter(Boolean));

  return {
    totalStaff: employees.length,
    departments: departments.length || new Set(employees.map((e) => normalizeDeptName(e.department))).size,
    positions: positions.size + vacant,
    vacantPositions: vacant,
    managementStaff: management.length,
    teachingStaff: teaching.length,
  };
}

export function computeAnalytics(employees = []) {
  const deptMap = {};
  const genderMap = { Male: 0, Female: 0, Other: 0 };
  const categoryMap = { Teaching: 0, Administrative: 0, Support: 0, Management: 0 };
  const payrollByDept = {};

  employees.forEach((emp) => {
    const dept = normalizeDeptName(emp.department);
    deptMap[dept] = (deptMap[dept] || 0) + 1;
    payrollByDept[dept] = (payrollByDept[dept] || 0) + (Number(emp.payroll_basic_salary) || 350000);

    const g = String(emp.gender || '').toLowerCase();
    if (g.startsWith('m')) genderMap.Male += 1;
    else if (g.startsWith('f')) genderMap.Female += 1;
    else genderMap.Other += 1;

    const cat = employmentCategory(emp);
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });

  const total = employees.length || 1;
  const deptDistribution = Object.entries(deptMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const genderTotal = genderMap.Male + genderMap.Female + genderMap.Other || 1;
  const genderDistribution = [
    { label: 'Male', pct: Math.round((genderMap.Male / genderTotal) * 100) },
    { label: 'Female', pct: Math.round((genderMap.Female / genderTotal) * 100) },
  ];

  const categoryDistribution = Object.entries(categoryMap)
    .filter(([, c]) => c > 0)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }));

  const payrollRows = Object.entries(payrollByDept)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { deptDistribution, genderDistribution, categoryDistribution, payrollRows };
}

function groupEmployeesByDept(employees) {
  const map = {};
  employees.forEach((emp) => {
    const dept = normalizeDeptName(emp.department);
    if (!map[dept]) map[dept] = [];
    map[dept].push(emp);
  });
  return map;
}

function groupByPosition(staff) {
  const map = {};
  staff.forEach((emp) => {
    const pos = emp.position || emp.job_title || emp.role_name || 'Staff';
    if (!map[pos]) map[pos] = [];
    map[pos].push(emp);
  });
  return map;
}

export function buildDepartmentModels(departments = [], employees = []) {
  const byDept = groupEmployeesByDept(employees);
  const deptNames = departments.length
    ? departments.map((d) => d.name)
    : Object.keys(byDept);

  if (!deptNames.length) {
    deptNames.push('Academics', 'Administration', 'Finance', 'Discipline');
  }

  return deptNames.map((name, i) => {
    const apiDept = departments.find((d) => d.name === name);
    const staff = byDept[normalizeDeptName(name)] || byDept[name] || [];
    const positions = groupByPosition(staff);
    const head =
      apiDept?.head_name ||
      staff.find((e) => /head|chief|dean|director/i.test(e.position || ''))?.name ||
      staff[0]?.name ||
      '—';

    return {
      id: `dept-${i}-${name.replace(/\s+/g, '-').toLowerCase()}`,
      name: normalizeDeptName(name),
      head,
      staffCount: staff.length,
      positions: Object.entries(positions).map(([title, members]) => ({
        id: `pos-${name}-${title}`.replace(/\s+/g, '-').toLowerCase(),
        title,
        reportsTo: POSITION_REPORTS[title] || `${normalizeDeptName(name)} Head`,
        members,
        vacancies: 0,
      })),
      budget: apiDept?.budget_rwf || estimatePayroll(staff) * 1.2,
      payroll: estimatePayroll(staff),
      vacancies: VACANT_POSITIONS.filter((v) => normalizeDeptName(v.department) === normalizeDeptName(name))
        .reduce((s, v) => s + v.count, 0),
      icon: DEPT_ICONS[normalizeDeptName(name)] || 'Building2',
    };
  });
}

const NODE_W = { leader: 240, head: 220, department: 260, position: 220, employee: 200 };
const NODE_H = { leader: 100, head: 90, department: 130, position: 110, employee: 95 };
const GAP_X = 40;
const GAP_Y = 100;

export function buildFlowGraph({
  departmentModels = [],
  expandedDepts = new Set(),
  expandedPositions = new Set(),
  leaderName = 'School Director',
  headName = 'Head Teacher',
}) {
  const nodes = [];
  const edges = [];
  const centerX = 600;

  const leaderId = 'node-leader';
  nodes.push({
    id: leaderId,
    type: 'leader',
    position: { x: centerX - NODE_W.leader / 2, y: 0 },
    data: {
      id: leaderId,
      label: leaderName,
      subtitle: 'Executive leadership',
      staffCount: 1,
    },
  });

  const headId = 'node-head';
  nodes.push({
    id: headId,
    type: 'head',
    position: { x: centerX - NODE_W.head / 2, y: GAP_Y + NODE_H.leader },
    data: {
      id: headId,
      label: headName,
      subtitle: 'School administration',
      reportsTo: leaderName,
    },
  });
  edges.push({
    id: 'e-leader-head',
    source: leaderId,
    target: headId,
    type: 'smoothstep',
    style: { stroke: '#000435', strokeWidth: 2 },
  });

  const deptY = GAP_Y * 2 + NODE_H.leader + NODE_H.head;
  const deptCount = departmentModels.length;
  const deptTotalW = deptCount * NODE_W.department + (deptCount - 1) * GAP_X;
  let deptX = centerX - deptTotalW / 2 + NODE_W.department / 2;

  departmentModels.forEach((dept) => {
    const deptNodeId = dept.id;
    nodes.push({
      id: deptNodeId,
      type: 'department',
      position: { x: deptX - NODE_W.department / 2, y: deptY },
      data: {
        ...dept,
        expanded: expandedDepts.has(deptNodeId),
        parentId: headId,
      },
    });
    edges.push({
      id: `e-head-${deptNodeId}`,
      source: headId,
      target: deptNodeId,
      type: 'smoothstep',
      style: { stroke: '#000435', strokeWidth: 2 },
    });

    if (expandedDepts.has(deptNodeId) && dept.positions?.length) {
      const posY = deptY + GAP_Y + NODE_H.department;
      const posCount = dept.positions.length;
      const posTotalW = posCount * NODE_W.position + (posCount - 1) * (GAP_X / 2);
      let posX = deptX - posTotalW / 2 + NODE_W.position / 2;

      dept.positions.forEach((pos) => {
        const posNodeId = pos.id;
        nodes.push({
          id: posNodeId,
          type: 'position',
          position: { x: posX - NODE_W.position / 2, y: posY },
          data: {
            ...pos,
            department: dept.name,
            expanded: expandedPositions.has(posNodeId),
            parentId: deptNodeId,
          },
        });
        edges.push({
          id: `e-${deptNodeId}-${posNodeId}`,
          source: deptNodeId,
          target: posNodeId,
          type: 'smoothstep',
          style: { stroke: '#000435', strokeWidth: 1.5 },
        });

        if (expandedPositions.has(posNodeId) && pos.members?.length) {
          const empY = posY + GAP_Y + NODE_H.position;
          const empCount = pos.members.length;
          const empTotalW = empCount * NODE_W.employee + (empCount - 1) * (GAP_X / 3);
          let empX = posX - empTotalW / 2 + NODE_W.employee / 2;

          pos.members.slice(0, 6).forEach((emp) => {
            const empNodeId = `emp-${emp.id}`;
            nodes.push({
              id: empNodeId,
              type: 'employee',
              position: { x: empX - NODE_W.employee / 2, y: empY },
              data: {
                ...emp,
                parentId: posNodeId,
                positionTitle: pos.title,
                department: dept.name,
              },
            });
            edges.push({
              id: `e-${posNodeId}-${empNodeId}`,
              source: posNodeId,
              target: empNodeId,
              type: 'smoothstep',
              style: { stroke: '#94a3b8', strokeWidth: 1 },
            });
            empX += NODE_W.employee + GAP_X / 3;
          });
        }

        posX += NODE_W.position + GAP_X / 2;
      });
    }

    deptX += NODE_W.department + GAP_X;
  });

  return { nodes, edges };
}

export function filterOrgData(employees, { search, department, position, category, status }) {
  let list = [...employees];
  const q = String(search || '').trim().toLowerCase();
  if (q) {
    list = list.filter(
      (e) =>
        String(e.name || '').toLowerCase().includes(q) ||
        String(e.position || e.job_title || '').toLowerCase().includes(q) ||
        String(e.department || '').toLowerCase().includes(q),
    );
  }
  if (department && department !== 'All') {
    list = list.filter((e) => normalizeDeptName(e.department) === normalizeDeptName(department));
  }
  if (position && position !== 'All') {
    list = list.filter((e) => (e.position || e.job_title) === position);
  }
  if (category && category !== 'All') {
    list = list.filter((e) => employmentCategory(e) === category);
  }
  if (status && status !== 'All') {
    list = list.filter((e) => (e.status || 'Active') === status);
  }
  return list;
}

export { normalizeDeptName, employmentCategory, groupByPosition };
