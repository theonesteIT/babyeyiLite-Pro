import api from './api';

export async function getActivePayrollTemplate() {
  const res = await api.get('/accountant/payroll/templates/active');
  return res.data?.data || null;
}

export async function getPayrollTemplateHistory(limit = 15) {
  const res = await api.get('/accountant/payroll/templates/history', { params: { limit } });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function savePayrollTemplate(payload) {
  const res = await api.post('/accountant/payroll/templates', payload);
  return res.data?.data || null;
}

export async function previewPayrollCalculation(payload) {
  const res = await api.post('/accountant/payroll/templates/preview', payload);
  return res.data?.data || null;
}

export async function getEmployeePayrollDeductions(params = {}) {
  const res = await api.get('/accountant/payroll/employee-deductions', { params });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function createEmployeePayrollDeduction(payload) {
  const res = await api.post('/accountant/payroll/employee-deductions', payload);
  return res.data?.data || null;
}

export async function updateEmployeePayrollDeduction(id, payload) {
  const res = await api.patch(`/accountant/payroll/employee-deductions/${id}`, payload);
  return res.data || null;
}

export async function deleteEmployeePayrollDeduction(id) {
  const res = await api.delete(`/accountant/payroll/employee-deductions/${id}`);
  return res.data || null;
}

export async function searchPayrollStaff(query, limit = 20) {
  const res = await api.get('/accountant/payroll/staff/search', { params: { query, limit } });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function saveStaffBasicSalary(userId, basicSalary) {
  const res = await api.patch(`/accountant/payroll/staff/${userId}`, {
    payroll_basic_salary: basicSalary,
  });
  return res.data || null;
}

/** Persist basic salary and allowance columns on the staff profile. */
export async function saveStaffPayrollProfile(userId, payload = {}) {
  const res = await api.patch(`/accountant/payroll/staff/${userId}`, payload);
  return res.data || null;
}

export async function getStaffAdvanceCheck(staffUserId) {
  const res = await api.get(`/accountant/payroll/advance-check/${staffUserId}`);
  return res.data?.data || null;
}
