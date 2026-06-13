import {
  DEFAULT_PAYE_BRACKETS,
  normalizeStatutoryRates,
} from '../../accountant_portal/frontend/src/utils/rwandaPayrollEngine';
import { resolveCertificateAssetUrl } from './certificateAssets';
import { getSchoolOrgFromAuth } from './salaryCertificateData';

const API_BASE = `${(import.meta.env.VITE_UPLOADS_BASE || import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/$/, '')}/api`;

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

export function getAuthSchoolId() {
  try {
    const raw = localStorage.getItem('user') || localStorage.getItem('authUser') || '{}';
    const u = JSON.parse(raw);
    return u?.school_id || u?.school?.id || null;
  } catch {
    return null;
  }
}

function mapSessionUserSchool(sessionUser = {}) {
  const school = sessionUser?.school || {};
  const location = [school.sector, school.district, school.province].filter(Boolean).join(', ');
  return {
    name: school.name || school.school_name || sessionUser.school_name || 'School',
    address: school.full_address || school.address || location || '',
    phone: school.phone || sessionUser.phone || '',
    email: school.email || sessionUser.email || '',
    tin: school.tin || school.tax_id || '',
    logoUrl: resolveCertificateAssetUrl(school.logo_url || school.logo || ''),
    website: school.website || '',
    headName: school.head_teacher_name || '',
    headTitle: 'Head of Institution',
  };
}

export function mapSchoolRecordToOrg(school = {}) {
  const fallback = getSchoolOrgFromAuth();
  const location = [school.sector, school.district, school.province].filter(Boolean).join(', ');
  return {
    name: school.school_name || school.name || fallback.name,
    address: school.full_address || school.address || location || fallback.address,
    phone: school.phone || fallback.phone,
    email: school.email || fallback.email,
    tin: school.tin || school.tax_id || fallback.tin,
    logoUrl: resolveCertificateAssetUrl(school.logo_url) || fallback.logoUrl,
    website: school.website || fallback.website,
    headName: school.head_teacher_name || fallback.headName,
    headTitle: 'Head of Institution',
  };
}

export function mergeEmployeeWithPayrollSetup(employee = {}, payrollRow = null) {
  const p = payrollRow?.payroll || {};
  const hasPayrollRow = Boolean(payrollRow?.payroll);
  return {
    ...employee,
    payroll_basic_salary: hasPayrollRow
      ? (p.basicSalary ?? employee.payroll_basic_salary)
      : employee.payroll_basic_salary,
    payroll_transport_allowance: hasPayrollRow
      ? p.transportAllowance
      : employee.payroll_transport_allowance,
    payroll_housing_allowance: hasPayrollRow
      ? p.housingAllowance
      : employee.payroll_housing_allowance,
    payroll_meal_allowance: hasPayrollRow
      ? p.mealAllowance
      : employee.payroll_meal_allowance,
    payroll_other_allowances: hasPayrollRow
      ? p.otherAllowances
      : employee.payroll_other_allowances,
  };
}

function mapDeductionRow(row = {}) {
  return {
    id: row.id,
    name: row.customName || row.deductionType || 'Deduction',
    customName: row.customName || row.deductionType || 'Deduction',
    deductionType: row.deductionType,
    amount: row.monthlyInstallment,
    monthlyInstallment: row.monthlyInstallment,
    status: row.status || 'Active',
  };
}

function mapSessionPreparedBy(sessionUser = {}) {
  const fullName = sessionUser.full_name
    || [sessionUser.first_name, sessionUser.last_name].filter(Boolean).join(' ').trim();
  const roleCode = String(sessionUser.role?.code || sessionUser.role_code || '').toUpperCase();
  if (!fullName) return null;
  return {
    name: fullName,
    position: roleCode === 'ACCOUNTANT' ? 'Accountant' : (sessionUser.role?.name || sessionUser.role_name || 'Accountant'),
    email: sessionUser.email || '',
  };
}

/** Load school registry profile + active payroll template + staff salary setup row. */
export async function loadSalaryCertificateContext(staffUserId) {
  const context = {
    org: getSchoolOrgFromAuth(),
    statutory: {},
    payeRates: DEFAULT_PAYE_BRACKETS,
    allowanceRules: {},
    employeePayroll: null,
    customDeductions: [],
    advances: [],
    schoolId: getAuthSchoolId(),
    preparedBy: { name: 'Accountant', position: 'Accountant' },
  };

  let sessionUser = null;
  try {
    const sessionRes = await fetchJson('/session/me');
    sessionUser = sessionRes?.data || null;
    if (sessionUser) {
      context.schoolId = sessionUser.school_id || sessionUser.school?.id || context.schoolId;
      context.org = { ...context.org, ...mapSessionUserSchool(sessionUser) };
      const sessionPrepared = mapSessionPreparedBy(sessionUser);
      if (sessionPrepared) context.preparedBy = sessionPrepared;
    }
  } catch {
    /* session optional */
  }

  const tasks = [];

  if (context.schoolId) {
    tasks.push(
      fetchJson(`/schools/${context.schoolId}/summary`)
        .then((res) => {
          if (res?.success && res.data) {
            context.org = { ...context.org, ...mapSchoolRecordToOrg(res.data) };
          }
        })
        .catch(() =>
          fetchJson(`/schools/${context.schoolId}`)
            .then((res) => {
              if (res?.success && res.data) {
                context.org = { ...context.org, ...mapSchoolRecordToOrg(res.data) };
              }
            })
            .catch(() => {}),
        ),
    );
  }

  tasks.push(
    fetchJson('/accountant/payroll/payslip-branding')
      .then((res) => {
        const branding = res?.data || {};
        context.org = {
          ...context.org,
          name: branding.school_name || context.org.name,
          logoUrl: resolveCertificateAssetUrl(branding.logo_url) || context.org.logoUrl,
          headName: branding.head_teacher_name || context.org.headName,
        };
        if (branding.accountant_name) {
          context.preparedBy = {
            name: branding.accountant_name,
            position: 'Accountant',
            signatureUrl: resolveCertificateAssetUrl(branding.accountant_signature_url),
            email: context.preparedBy?.email || '',
          };
        } else if (branding.accountant_signature_url) {
          context.preparedBy = {
            ...context.preparedBy,
            signatureUrl: resolveCertificateAssetUrl(branding.accountant_signature_url),
          };
        }
      })
      .catch(() => {}),
  );

  tasks.push(
    fetchJson('/accountant/payroll/templates/active')
      .then((res) => {
        const tpl = res?.data;
        if (tpl?.statutory) context.statutory = normalizeStatutoryRates(tpl.statutory);
        if (Array.isArray(tpl?.payeRates) && tpl.payeRates.length) {
          context.payeRates = tpl.payeRates;
        }
        context.allowanceRules = tpl?.rules?.allowanceAuto || tpl?.allowanceAuto || {};
      })
      .catch(() => {}),
  );

  if (staffUserId) {
    tasks.push(
      fetchJson('/accountant/payroll/staff/search?query=&limit=500')
        .then((res) => {
          const rows = Array.isArray(res?.data) ? res.data : [];
          context.employeePayroll = rows.find(
            (row) => Number(row.staffUserId) === Number(staffUserId),
          ) || null;
        })
        .catch(() => {}),
    );

    tasks.push(
      fetchJson(`/accountant/payroll/employee-deductions?staffUserId=${staffUserId}`)
        .then((res) => {
          context.customDeductions = (Array.isArray(res?.data) ? res.data : []).map(mapDeductionRow);
        })
        .catch(() => {}),
    );

    tasks.push(
      fetchJson(`/accountant/payroll/advance-check/${staffUserId}`)
        .then((res) => {
          const adv = res?.data;
          if (adv && toMoney(adv.monthlyInstallment) > 0) {
            context.advances = [{
              monthlyInstallment: adv.monthlyInstallment,
              totalAmount: adv.totalAmount,
              repaymentMonths: adv.repaymentMonths,
              paidMonths: adv.paidMonths,
              status: adv.status || 'Active',
            }];
          }
        })
        .catch(() => {}),
    );
  }

  await Promise.all(tasks);
  return context;
}

function toMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}
