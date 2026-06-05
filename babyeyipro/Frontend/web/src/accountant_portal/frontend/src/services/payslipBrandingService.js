import api from './api';
import { resolvePayslipAssetUrl } from '../utils/payslipAssets';
import { getSchoolInfo } from '../utils/payslipBuilder';

export async function getPayslipBranding() {
  const res = await api.get('/accountant/payroll/payslip-branding');
  const raw = res.data?.data || {};
  return mapPayslipBranding(raw);
}

export function mapPayslipBranding(raw = {}) {
  const fallback = getSchoolInfo();
  const name = String(raw.school_name || fallback.name || 'School').trim() || 'School';
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2
    ? `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
    : (parts[0]?.slice(0, 2) || 'SC').toUpperCase();

  return {
    name,
    initials,
    tagline: fallback.tagline || 'Excellence in Education',
    address: fallback.address || '',
    tin: fallback.tin || '',
    phone: fallback.phone || '',
    email: fallback.email || '',
    website: fallback.website || '',
    logoUrl: resolvePayslipAssetUrl(raw.logo_url),
    stampUrl: resolvePayslipAssetUrl(raw.stamp_url),
    headTeacherName: String(raw.head_teacher_name || '').trim() || 'Head Teacher',
    headTeacherTitle: 'Head Teacher',
    headTeacherSignatureUrl: resolvePayslipAssetUrl(raw.head_signature_url),
    accountantName: String(raw.accountant_name || '').trim() || 'Accountant',
    accountantTitle: 'Accountant',
    accountantSignatureUrl: resolvePayslipAssetUrl(raw.accountant_signature_url),
  };
}

export async function uploadAccountantSignature(file) {
  if (!file) throw new Error('Choose a signature image first');
  const fd = new FormData();
  fd.append('file', file);
  fd.append('asset_type', 'accountant_signature');
  const res = await api.post('/babyeyi/upload-asset', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const body = res.data || {};
  if (body.success === false) throw new Error(body.message || 'Upload failed');
  return resolvePayslipAssetUrl(body.url);
}
