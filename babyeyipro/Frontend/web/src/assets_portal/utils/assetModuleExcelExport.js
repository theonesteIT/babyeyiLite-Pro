import * as XLSX from 'xlsx';

const BRAND = 'Babyeyi Assets Manager';

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d) {
  if (!d) return '';
  return String(d).slice(0, 10);
}

function fmtMoney(n) {
  if (n == null || n === '') return '';
  const v = Number(n);
  return Number.isFinite(v) ? v : '';
}

function buildReportWorkbook({ title, subtitle, headers, rows, colWidths, sheetName }) {
  const headerLabels = headers.map((h) => h.label);
  const dataRows = rows.map((row) =>
    headers.map((h) => {
      const val = typeof h.value === 'function' ? h.value(row) : row[h.key];
      return val ?? '';
    }),
  );

  const aoa = [
    [title],
    [subtitle],
    [`${BRAND} · Exported ${new Date().toLocaleString()}`],
    [`Total records: ${rows.length}`],
    [],
    headerLabels,
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = colWidths.map((w) => ({ wch: w }));
  ws['!views'] = [{ state: 'frozen', ySplit: 5, activeCell: 'A6' }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  return wb;
}

function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, `${filename}-${stamp()}.xlsx`);
}

const MAINT_HEADERS = [
  { key: 'asset', label: 'Asset Name' },
  { key: 'asset_code', label: 'Asset Code', value: (r) => r.asset_code || r.assetCode || '' },
  { key: 'maint_type', label: 'Type', value: (r) => r.maint_type || r.maintType || '' },
  { key: 'problem', label: 'Problem / Description', value: (r) => r.problem || r.description || '' },
  { key: 'technician', label: 'Technician' },
  { key: 'priority', label: 'Priority' },
  { key: 'cost', label: 'Est. Cost (RWF)', value: (r) => fmtMoney(r.cost ?? r.estimated_cost) },
  { key: 'start_date', label: 'Start Date', value: (r) => fmtDate(r.start_date || r.date) },
  { key: 'end_date', label: 'End Date', value: (r) => fmtDate(r.end_date) },
  { key: 'status', label: 'Status' },
];

const TRANSFER_HEADERS = [
  { key: 'asset', label: 'Asset Name' },
  { key: 'assetCode', label: 'Asset Code', value: (r) => r.assetCode || r.asset_code || '' },
  { key: 'from', label: 'From Location' },
  { key: 'to', label: 'To Location' },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Transfer Date', value: (r) => fmtDate(r.date || r.transfer_date) },
  { key: 'approvedBy', label: 'Approved By', value: (r) => r.approvedBy || r.approved_by || '' },
  { key: 'condition', label: 'Condition' },
  { key: 'notes', label: 'Notes' },
];

const RETURN_HEADERS = [
  { key: 'asset', label: 'Asset Name' },
  { key: 'assetCode', label: 'Asset Code', value: (r) => r.assetCode || r.asset_code || '' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'department', label: 'Department' },
  { key: 'date', label: 'Assignment Date', value: (r) => fmtDate(r.date || r.assignment_date) },
  { key: 'expectedReturn', label: 'Expected Return', value: (r) => fmtDate(r.expectedReturn || r.expected_return_date) },
  { key: 'status', label: 'Status' },
  { key: 'condition', label: 'Condition' },
];

const ASSIGNMENT_HEADERS = [
  { key: 'asset', label: 'Asset Name' },
  { key: 'assetCode', label: 'Asset Code', value: (r) => r.assetCode || r.asset_code || '' },
  { key: 'assignedTo', label: 'Assigned To', value: (r) => r.assignedTo || r.assignee_name || '' },
  { key: 'department', label: 'Department', value: (r) => r.department || r.staff_department || '' },
  { key: 'date', label: 'Assignment Date', value: (r) => fmtDate(r.date || r.assignment_date) },
  { key: 'expectedReturn', label: 'Expected Return', value: (r) => fmtDate(r.expectedReturn || r.expected_return_date) },
  { key: 'condition', label: 'Condition', value: (r) => r.condition || r.condition_code || '' },
  { key: 'status', label: 'Status' },
  { key: 'notes', label: 'Notes' },
];

export function exportMaintenanceToExcel(records = [], filename = 'maintenance-register') {
  const wb = buildReportWorkbook({
    title: 'MAINTENANCE REGISTER',
    subtitle: 'Repairs, inspections, replacements, and upgrades',
    headers: MAINT_HEADERS,
    rows: records,
    colWidths: [28, 14, 12, 36, 18, 10, 14, 12, 12, 12],
    sheetName: 'Maintenance',
  });
  downloadWorkbook(wb, filename);
}

export function exportTransfersToExcel(transfers = [], filename = 'asset-transfers') {
  const wb = buildReportWorkbook({
    title: 'ASSET TRANSFERS',
    subtitle: 'Movement between departments, locations, and staff',
    headers: TRANSFER_HEADERS,
    rows: transfers,
    colWidths: [28, 14, 24, 24, 20, 12, 12, 16, 12, 24],
    sheetName: 'Transfers',
  });
  downloadWorkbook(wb, filename);
}

export function exportReturnsToExcel(assignments = [], filename = 'asset-returns-queue') {
  const wb = buildReportWorkbook({
    title: 'ASSET RETURNS QUEUE',
    subtitle: 'Active assignments pending return processing',
    headers: RETURN_HEADERS,
    rows: assignments,
    colWidths: [28, 14, 22, 18, 14, 14, 12, 12],
    sheetName: 'Returns',
  });
  downloadWorkbook(wb, filename);
}

export function exportAssignmentsToExcel(assignments = [], filename = 'asset-assignments') {
  const wb = buildReportWorkbook({
    title: 'ASSET ASSIGNMENTS',
    subtitle: 'Staff, individual, and location assignments',
    headers: ASSIGNMENT_HEADERS,
    rows: assignments,
    colWidths: [28, 14, 22, 18, 14, 14, 12, 12, 24],
    sheetName: 'Assignments',
  });
  downloadWorkbook(wb, filename);
}
