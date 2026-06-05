import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ChevronRight, Mail, Phone, MapPin, Calendar, Pencil, Loader2, User,
  FileText, GraduationCap, FolderOpen, AlertCircle, ChevronDown, Camera,
  Banknote, Heart, Briefcase, ClipboardList, UserCheck, Upload, ArrowLeftRight,
  TrendingUp, UserX, Eye, Download, BarChart3, Clock, Palmtree, MoreHorizontal,
  Building2, Users, Zap, Replace, ExternalLink, KeyRound, Shield, AtSign, Lock,
} from 'lucide-react';
import { isPlaceholderStaffEmail } from './hrConstants';
import { h } from '../../utils/href';
import { HrBadge, statusToBadge, HrModal } from './hrUi';
import {
  yearsOfService, resolveStaffPhotoUrl, normalizeHrDocument, resolveHrDocumentUrl,
} from './hrConstants';
import hrService from '../../services/hrService';
import staffService from '../../services/staffService';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'personal', label: 'Personal Information' },
  { id: 'employment', label: 'Employment' },
  { id: 'contract', label: 'Contract' },
  { id: 'qualifications', label: 'Qualifications' },
  { id: 'access', label: 'System Access' },
  { id: 'documents', label: 'Documents' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'leave', label: 'Leave' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'performance', label: 'Performance' },
  { id: 'more', label: 'More' },
];

const DOC_LABELS = {
  cv: 'CV / Resume',
  application_letter: 'Application Letter',
  national_id_copy: 'National ID Copy',
  degree: 'Degree / Certificate',
  contract: 'Signed Contract',
  passport_copy: 'Passport Copy',
  certificates: 'Professional Certificates',
  other: 'Other Attachments',
};

const avatarColors = ['bg-amber-500', 'bg-teal-500', 'bg-sky-500', 'bg-violet-500', 'bg-pink-500'];
const initials = (name) => (name || '?').split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
const avatarColor = (id) => avatarColors[Math.abs(String(id || 0).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % avatarColors.length];

function fmtDate(d) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return null;
  }
}

function val(v) {
  const s = v != null ? String(v).trim() : '';
  return s || null;
}

function display(v) {
  return val(v) || '—';
}

function docTypeLabel(name) {
  const n = String(name || '').toLowerCase();
  if (n.endsWith('.pdf')) return { label: 'PDF', cls: 'bg-red-50 text-red-600' };
  if (/\.(jpg|jpeg|png|webp)$/.test(n)) return { label: 'IMG', cls: 'bg-sky-50 text-sky-600' };
  if (/\.(doc|docx)$/.test(n)) return { label: 'DOC', cls: 'bg-blue-50 text-blue-600' };
  return { label: 'FILE', cls: 'bg-slate-100 text-slate-600' };
}

const InfoRow = ({ label, value, highlight, badge }) => (
  <div className="flex justify-between items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
    <span className="text-slate-400 text-xs flex-shrink-0 w-36 sm:w-40">{label}</span>
    {badge ? (
      <HrBadge variant={statusToBadge(value)}>{value}</HrBadge>
    ) : (
      <span className={`text-xs text-right flex-1 ${highlight ? 'text-[#c87800]' : 'text-slate-700'}`} style={{ fontWeight: 500 }}>
        {value || '—'}
      </span>
    )}
  </div>
);

function SectionCard({ title, icon: Icon, children, action, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {Icon ? <Icon size={16} className="text-[#c87800] shrink-0" strokeWidth={1.75} /> : null}
          <h3 className="text-slate-700 text-sm truncate" style={{ fontWeight: 500 }}>{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function TabEmpty({ icon: Icon, title, message, action }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
      {Icon ? <Icon size={40} className="mx-auto text-slate-300 mb-3" strokeWidth={1.25} /> : null}
      <p className="text-slate-600 text-sm" style={{ fontWeight: 500 }}>{title}</p>
      <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">{message}</p>
      {action}
    </div>
  );
}

export default function EmployeeProfile() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const inAccountant = location.pathname.startsWith('/accountant');
  const routePath = (path) => {
    if (!inAccountant) return h(path);
    const mapped = path
      .replace('/hr/directory/', '/payroll/employees/')
      .replace('/hr/directory', '/payroll/employees')
      .replace('/hr/registration', '/payroll/employees/import')
      .replace('/hr/leave', '/payroll/leave');
    return `/accountant${mapped}`;
  };
  const [emp, setEmp] = useState(null);
  const [leaveRows, setLeaveRows] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showActions, setShowActions] = useState(false);
  const [docPreview, setDocPreview] = useState(null);

  const loadEmployee = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await hrService.getEmployee(employeeId);
      if (!res?.success) throw new Error(res?.message || 'Employee not found');
      setEmp(res.data);
    } catch (err) {
      setError(err?.message || 'Failed to load profile');
      setEmp(null);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  const loadLeave = useCallback(async () => {
    if (!employeeId) return;
    setLeaveLoading(true);
    try {
      const [listRes, balRes] = await Promise.all([
        hrService.getLeaveRequests({ staff_user_id: employeeId }),
        hrService.getLeaveBalance(employeeId, 'Annual Leave'),
      ]);
      if (listRes?.success) setLeaveRows(listRes.data || []);
      if (balRes?.success) setLeaveBalance(balRes.data);
    } catch {
      setLeaveRows([]);
    } finally {
      setLeaveLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { loadEmployee(); }, [loadEmployee]);

  useEffect(() => {
    if (activeTab === 'leave' && employeeId) loadLeave();
  }, [activeTab, employeeId, loadLeave]);

  const handleDeactivate = async () => {
    if (!window.confirm(`Deactivate ${emp?.name}? They will lose portal access.`)) return;
    try {
      await staffService.setStaffActive(employeeId, false);
      await loadEmployee();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not deactivate employee');
    }
    setShowActions(false);
  };

  const quickActions = [
    { label: 'Edit profile', icon: Pencil, onClick: () => navigate(routePath(`/hr/directory/${employeeId}/edit`)) },
    { label: 'Assign leave', icon: Palmtree, onClick: () => navigate(routePath(`/hr/leave?staff=${employeeId}`)) },
    { label: 'Record attendance', icon: UserCheck, onClick: () => navigate(h('/attendance/morning/staff')) },
    { label: 'Upload document', icon: Upload, onClick: () => setActiveTab('documents') },
    { label: 'Transfer employee', icon: ArrowLeftRight, onClick: () => navigate(routePath(`/hr/directory/${employeeId}/edit`)) },
    { label: 'Promote employee', icon: TrendingUp, onClick: () => navigate(routePath(`/hr/directory/${employeeId}/edit`)) },
    { label: 'Deactivate employee', icon: UserX, danger: true, onClick: handleDeactivate },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 className="animate-spin" size={22} />
        <span className="text-sm">Loading employee profile…</span>
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 px-4">
        <AlertCircle className="text-amber-500" size={32} />
        <p className="text-slate-600 text-sm">{error || 'Employee not found.'}</p>
        <Link to={routePath('/hr/directory')} className="text-[#c87800] text-xs hover:underline">Back to directory</Link>
      </div>
    );
  }

  const hr = emp.hr_profile || {};
  const photoUrl = resolveStaffPhotoUrl(emp.photo);
  const yos = yearsOfService(emp.hire_date);
  const resAddr = val(emp.address) || [hr.residence?.village, hr.residence?.cell, hr.residence?.sector, hr.residence?.district, hr.residence?.province].filter(Boolean).join(', ') || null;
  const gross = emp.payroll_basic_salary ? Number(emp.payroll_basic_salary) : null;
  const docs = hr.documents || {};
  const docEntries = Object.entries(docs).map(([k, v]) => [k, normalizeHrDocument(v)]);
  const emergency = hr.emergency_contact || {};
  const qualifications = (hr.qualifications || []).filter((q) => q.level || q.institution);
  const experience = (hr.experience || []).filter((e) => e.employer || e.position);

  const openDocPreview = (key, doc) => {
    setDocPreview({ key, name: doc.name, url: resolveHrDocumentUrl(doc) });
  };

  const employmentHistoryRows = [
    {
      position: emp.position,
      dept: emp.department,
      type: emp.employment_type,
      from: fmtDate(emp.hire_date),
      to: emp.contract_end ? fmtDate(emp.contract_end) : 'Present',
      duration: yos != null ? `${yos} year${yos !== 1 ? 's' : ''}` : '—',
      reason: 'Current role',
    },
    ...experience.map((ex) => ({
      position: ex.position || '—',
      dept: ex.employer || '—',
      type: '—',
      from: '—',
      to: '—',
      duration: ex.years ? `${ex.years} yr` : '—',
      reason: '—',
    })),
  ];

  const renderOverview = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SectionCard title="Personal Information" icon={User}>
            <InfoRow label="Full Names" value={emp.name} />
            <InfoRow label="Date of Birth" value={fmtDate(emp.date_of_birth)} />
            <InfoRow label="Gender" value={val(emp.gender)} />
            <InfoRow label="Marital Status" value={val(hr.marital_status)} />
            <InfoRow label="Nationality" value={val(hr.nationality)} />
            <InfoRow label="ID Number" value={val(emp.national_id) || val(emp.passport_number)} />
            <InfoRow label="Phone Number" value={val(emp.phone)} />
            <InfoRow label="Email Address" value={val(emp.email)} />
            <InfoRow label="Residential Address" value={resAddr} />
          </SectionCard>
          <SectionCard title="Employment Information" icon={Briefcase}>
            <InfoRow label="Department" value={val(emp.department)} />
            <InfoRow label="Position" value={val(emp.position)} highlight />
            <InfoRow label="Employment Category" value={val(emp.role_name || emp.role_code)} />
            <InfoRow label="Employment Type" value={val(emp.employment_type)} />
            <InfoRow label="Status" value={emp.employment_status} badge />
            <InfoRow label="Hire Date" value={fmtDate(emp.hire_date)} />
            <InfoRow label="Contract End" value={emp.contract_end ? fmtDate(emp.contract_end) : 'Ongoing'} />
            <InfoRow label="Years of Service" value={yos != null ? `${yos} years` : null} />
          </SectionCard>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SectionCard title="Next of Kin" icon={Users}>
            {hr.next_of_kin?.name ? (
              <>
                <InfoRow label="Full Names" value={hr.next_of_kin.name} />
                <InfoRow label="Relationship" value={hr.next_of_kin.relationship} />
                <InfoRow label="Phone Number" value={hr.next_of_kin.phone} />
                <InfoRow label="Address" value={hr.next_of_kin.address} />
              </>
            ) : (
              <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle size={12} /> Not provided</p>
            )}
          </SectionCard>
          <SectionCard title="Emergency Contact" icon={Heart}>
            {emergency.name ? (
              <>
                <InfoRow label="Full Names" value={emergency.name} />
                <InfoRow label="Relationship" value={emergency.relationship} />
                <InfoRow label="Phone Number" value={emergency.phone} />
                <InfoRow label="Address" value={emergency.address} />
              </>
            ) : (
              <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle size={12} /> Not provided — add via edit profile</p>
            )}
          </SectionCard>
        </div>
        <SectionCard title="Bank Information" icon={Building2}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <InfoRow label="Bank Name" value={val(emp.payroll_bank_name)} />
            <InfoRow label="Account Number" value={val(emp.payroll_account_number)} />
            <InfoRow label="Account Name" value={val(emp.payroll_account_holder)} />
            <InfoRow label="Mobile Money" value={val(emp.payroll_mobile_money_phone)} />
            <InfoRow label="Payment Method" value={val(emp.payroll_payment_method)} />
          </div>
        </SectionCard>
        {employmentHistoryRows.length > 0 && (
          <SectionCard title="Employment History" icon={ClipboardList}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Position', 'Department', 'Type', 'From', 'To', 'Duration', 'Note'].map((col) => (
                      <th key={col} className="text-left pb-2.5 pr-3 text-slate-400 whitespace-nowrap" style={{ fontWeight: 500 }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employmentHistoryRows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      {[row.position, row.dept, row.type, row.from, row.to, row.duration, row.reason].map((cell, j) => (
                        <td key={j} className="py-2.5 pr-3 text-slate-700 whitespace-nowrap" style={{ fontWeight: 500 }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}
      </div>
      <div className="space-y-5">
        <SectionCard title="Salary Information" icon={Banknote}>
          {gross ? (
            <>
              <p className="text-slate-400 text-xs mb-1">Basic salary on record</p>
              <p className="text-slate-800 text-2xl" style={{ fontWeight: 500 }}>
                {gross.toLocaleString()} <span className="text-base font-normal text-slate-400">RWF / month</span>
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('payroll')}
                className="mt-4 w-full py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                style={{ fontWeight: 500 }}
              >
                <BarChart3 size={14} /> View payroll details
              </button>
            </>
          ) : (
            <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle size={12} /> Salary not configured</p>
          )}
        </SectionCard>
        <SectionCard title="Quick Actions" icon={Zap}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={[
                  'group p-3 rounded-xl border transition-all duration-200 text-left',
                  action.danger
                    ? 'bg-red-50/30 border-red-200/70 hover:bg-red-50/50 text-red-700 sm:col-span-2'
                    : 'bg-white border-slate-200/90 hover:border-amber-200 hover:shadow-sm text-slate-700',
                ].join(' ')}
              >
                <div className="min-w-0 text-left">
                  <div
                    className={`text-sm leading-tight truncate ${
                      action.danger ? 'text-red-600' : 'text-[#1f2a44] group-hover:text-[#c87800]'
                    }`}
                    style={{ fontWeight: 600 }}
                  >
                    {action.label}
                  </div>
                  <div className={`text-[10px] uppercase tracking-[0.08em] mt-0.5 ${action.danger ? 'text-red-400' : 'text-slate-400'}`} style={{ fontWeight: 600 }}>
                    {action.danger ? 'Requires confirmation' : 'Action'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
        <SectionCard
          title="Documents"
          icon={FolderOpen}
          action={docEntries.length > 0 ? (
            <button type="button" onClick={() => setActiveTab('documents')} className="text-[#c87800] text-xs hover:underline" style={{ fontWeight: 500 }}>View all</button>
          ) : null}
        >
          {docEntries.length > 0 ? (
            <div className="space-y-2">
              {docEntries.slice(0, 4).map(([k, doc]) => {
                const dt = docTypeLabel(doc.name);
                return (
                  <div key={k} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] ${dt.cls}`} style={{ fontWeight: 500 }}>{dt.label}</span>
                    <span className="text-xs text-slate-600 truncate flex-1">{DOC_LABELS[k] || k.replace(/_/g, ' ')}</span>
                    <button type="button" onClick={() => openDocPreview(k, doc)} className="text-[#c87800] hover:text-[#b36d00]"><Eye size={14} /></button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No documents uploaded</p>
          )}
        </SectionCard>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'personal':
        return (
          <SectionCard title="Personal Information" icon={User}>
            <InfoRow label="First name" value={emp.first_name} />
            <InfoRow label="Middle name" value={val(hr.middle_name)} />
            <InfoRow label="Last name" value={emp.last_name} />
            <InfoRow label="Father's names" value={val(hr.father_names)} />
            <InfoRow label="Mother's names" value={val(hr.mother_names)} />
            <InfoRow label="Date of birth" value={fmtDate(emp.date_of_birth)} />
            <InfoRow label="Gender" value={val(emp.gender)} />
            <InfoRow label="Marital status" value={val(hr.marital_status)} />
            <InfoRow label="Nationality" value={val(hr.nationality)} />
            <InfoRow label="Birth country" value={val(hr.birth_country)} />
            <InfoRow label="Place of birth" value={[hr.birth_place?.district, hr.birth_place?.province].filter(Boolean).join(', ') || null} />
            <InfoRow label="Alt. phone" value={val(hr.alt_phone)} />
            <InfoRow label="National ID" value={val(emp.national_id)} />
            <InfoRow label="Email" value={val(emp.email)} />
            <InfoRow label="Phone" value={val(emp.phone)} />
            <InfoRow label="Address" value={resAddr} />
          </SectionCard>
        );
      case 'employment':
        return (
          <SectionCard title="Employment Information" icon={Briefcase}>
            <InfoRow label="Employee ID" value={emp.employee_id} />
            <InfoRow label="Department" value={val(emp.department)} />
            <InfoRow label="Sub-department" value={val(emp.sub_department)} />
            <InfoRow label="Position" value={val(emp.position)} highlight />
            <InfoRow label="Role" value={val(emp.role_name || emp.role_code)} />
            <InfoRow label="Employment type" value={val(emp.employment_type)} />
            <InfoRow label="Status" value={emp.employment_status} badge />
            <InfoRow label="Hire date" value={fmtDate(emp.hire_date)} />
            <InfoRow label="Years of service" value={yos != null ? `${yos} years` : null} />
          </SectionCard>
        );
      case 'contract':
        {
          const now = new Date();
          const endDate = emp.contract_end ? new Date(emp.contract_end) : null;
          const dayLeft = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
          const contractAlert = !endDate
            ? 'This contract has no end date.'
            : dayLeft < 0
              ? 'This contract has ended.'
              : dayLeft <= 30
                ? `This contract will end in ${dayLeft} day(s).`
                : null;
        return (
          <SectionCard title="Contract Details" icon={ClipboardList}>
            {contractAlert ? (
              <div className={`mb-3 rounded-xl border px-3 py-2 text-xs ${dayLeft == null ? 'bg-sky-50 border-sky-100 text-sky-700' : dayLeft < 0 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                {contractAlert}
              </div>
            ) : null}
            <InfoRow label="Contract type" value={val(emp.employment_type)} />
            <InfoRow label="Start date" value={fmtDate(emp.contract_start || emp.hire_date)} />
            <InfoRow label="End date" value={emp.contract_end ? fmtDate(emp.contract_end) : 'Ongoing'} />
            <InfoRow label="Ongoing" value={emp.contract_end ? 'No' : 'Yes'} />
          </SectionCard>
        );
        }
      case 'qualifications':
        return qualifications.length > 0 ? (
          <div className="space-y-4 max-w-3xl">
            {qualifications.map((q, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <GraduationCap size={20} className="text-[#c87800]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 text-sm" style={{ fontWeight: 500 }}>{q.level || 'Qualification'}</p>
                    <p className="text-[#c87800] text-xs mt-0.5" style={{ fontWeight: 500 }}>{q.institution}</p>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                      <div><p className="text-slate-400">Year</p><p className="text-slate-700 mt-0.5" style={{ fontWeight: 500 }}>{display(q.year)}</p></div>
                      <div><p className="text-slate-400">Grade</p><p className="text-slate-700 mt-0.5" style={{ fontWeight: 500 }}>{display(q.grade)}</p></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <TabEmpty icon={GraduationCap} title="No qualifications" message="Qualifications added during registration will appear here." action={
            <button type="button" onClick={() => navigate(routePath(`/hr/directory/${employeeId}/edit`))} className="mt-4 text-[#c87800] text-xs hover:underline">Edit profile</button>
          } />
        );
      case 'access': {
        const portalOn = emp.account_enabled !== false && emp.is_active;
        const loginEmail = emp.email && !isPlaceholderStaffEmail(emp.email) ? emp.email : null;
        const loginUrl = `${window.location.origin}/login`;
        return (
          <div className="max-w-3xl space-y-5">
            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#000435] flex items-center justify-center">
                    <Shield size={22} className="text-[#FBBF24]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-slate-800 text-base" style={{ fontWeight: 500 }}>System access & login</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Portal dashboard credentials for this employee</p>
                  </div>
                </div>
                <HrBadge variant={portalOn ? 'success' : 'muted'}>{portalOn ? 'Portal enabled' : 'Portal disabled'}</HrBadge>
              </div>
              {portalOn && loginEmail ? (
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-1"><AtSign size={11} className="text-[#c87800]" /> Login email</p>
                      <p className="text-sm text-[#000435] break-all" style={{ fontWeight: 500 }}>{loginEmail}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-1"><KeyRound size={11} className="text-[#c87800]" /> Username</p>
                      <p className="text-sm text-[#000435] font-mono" style={{ fontWeight: 500 }}>{emp.username || '—'}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white border border-slate-100 sm:col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-1"><Lock size={11} className="text-[#c87800]" /> Password</p>
                      <p className="text-xs text-slate-500">Passwords are never shown after creation. Reset from edit profile to issue a new temporary password and optional welcome email.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={loginUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#c87800] text-white text-xs hover:bg-[#b36d00]" style={{ fontWeight: 500 }}>
                      <ExternalLink size={14} /> Open login page
                    </a>
                    <button type="button" onClick={() => navigate(routePath(`/hr/directory/${employeeId}/edit`))} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs hover:bg-slate-50" style={{ fontWeight: 500 }}>
                      <Pencil size={14} /> Manage access
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <KeyRound size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-600" style={{ fontWeight: 500 }}>No portal login configured</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Enable system access in edit profile to create login credentials and send a welcome email.</p>
                  <button type="button" onClick={() => navigate(routePath(`/hr/directory/${employeeId}/edit`))} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c87800] text-white text-xs" style={{ fontWeight: 500 }}>
                    <KeyRound size={14} /> Enable portal access
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      }
      case 'documents':
        return docEntries.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docEntries.map(([k, doc]) => {
              const dt = docTypeLabel(doc.name);
              const url = resolveHrDocumentUrl(doc);
              return (
                <div key={k} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] ${dt.cls}`} style={{ fontWeight: 500 }}>{dt.label}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-sm truncate" style={{ fontWeight: 500 }}>{DOC_LABELS[k] || k.replace(/_/g, ' ')}</p>
                      <p className="text-slate-400 text-xs mt-0.5 truncate">{doc.name}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => openDocPreview(k, doc)} className="flex-1 py-2 text-xs rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-[#c87800] border border-slate-100 flex items-center justify-center gap-1" style={{ fontWeight: 500 }}>
                      <Eye size={12} /> Preview
                    </button>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 text-xs rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-[#c87800] border border-slate-100 flex items-center justify-center gap-1" style={{ fontWeight: 500 }}>
                        <Download size={12} /> Download
                      </a>
                    ) : null}
                    <button type="button" onClick={() => navigate(routePath(`/hr/directory/${employeeId}/edit`))} className="flex-1 py-2 text-xs rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-[#c87800] border border-slate-100 flex items-center justify-center gap-1" style={{ fontWeight: 500 }}>
                      <Replace size={12} /> Replace
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <TabEmpty icon={FolderOpen} title="No documents" message="Upload documents from the edit profile wizard." action={
            <button type="button" onClick={() => navigate(routePath(`/hr/directory/${employeeId}/edit`))} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c87800] text-white text-xs" style={{ fontWeight: 500 }}>
              <Upload size={14} /> Upload documents
            </button>
          } />
        );
      case 'attendance':
        return (
          <TabEmpty
            icon={Clock}
            title="Staff attendance"
            message="Daily attendance is recorded in the attendance module. Open staff daily attendance to view or record today's status."
            action={
              <button type="button" onClick={() => navigate(h('/attendance/morning/staff'))} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c87800] text-white text-xs" style={{ fontWeight: 500 }}>
                <UserCheck size={14} /> Open staff attendance
              </button>
            }
          />
        );
      case 'leave':
        return (
          <div className="space-y-5">
            {leaveBalance && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Annual leave entitlement</p>
                  <p className="text-xl text-[#000435] mt-1" style={{ fontWeight: 500 }}>{leaveBalance.entitlement ?? '—'} days</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Used</p>
                  <p className="text-xl text-amber-600 mt-1" style={{ fontWeight: 500 }}>{leaveBalance.used ?? 0} days</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Remaining</p>
                  <p className="text-xl text-emerald-600 mt-1" style={{ fontWeight: 500 }}>
                    {leaveBalance.remaining ?? Math.max(0, Number(leaveBalance.entitlement || 0) - Number(leaveBalance.used || 0))} days
                  </p>
                </div>
              </div>
            )}
            <SectionCard
              title="Leave requests"
              icon={Palmtree}
              action={
                <button type="button" onClick={() => navigate(routePath(`/hr/leave?staff=${employeeId}`))} className="text-[#c87800] text-xs hover:underline flex items-center gap-1" style={{ fontWeight: 500 }}>
                  <ExternalLink size={12} /> Register leave
                </button>
              }
            >
              {leaveLoading ? (
                <div className="flex justify-center py-8 text-slate-400 gap-2"><Loader2 size={18} className="animate-spin" /> Loading…</div>
              ) : leaveRows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400">
                        {['Type', 'From', 'To', 'Days', 'Status'].map((col) => (
                          <th key={col} className="text-left py-2 pr-3" style={{ fontWeight: 500 }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRows.map((row) => (
                        <tr key={row.id} className="border-b border-slate-50">
                          <td className="py-2.5 pr-3 text-slate-700" style={{ fontWeight: 500 }}>{row.leave_type}</td>
                          <td className="py-2.5 pr-3">{fmtDate(row.start_date)}</td>
                          <td className="py-2.5 pr-3">{fmtDate(row.end_date)}</td>
                          <td className="py-2.5 pr-3">{row.total_days}</td>
                          <td className="py-2.5"><HrBadge variant={statusToBadge(row.status)}>{row.status}</HrBadge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No leave requests for this employee.</p>
              )}
            </SectionCard>
          </div>
        );
      case 'payroll':
        return (
          <SectionCard title="Payroll & payment" icon={Banknote}>
            <InfoRow label="Basic salary" value={gross ? `${gross.toLocaleString()} RWF` : null} />
            <InfoRow label="Payment method" value={val(emp.payroll_payment_method)} />
            <InfoRow label="Bank name" value={val(emp.payroll_bank_name)} />
            <InfoRow label="Account number" value={val(emp.payroll_account_number)} />
            <InfoRow label="Account holder" value={val(emp.payroll_account_holder)} />
            <InfoRow label="Mobile money phone" value={val(emp.payroll_mobile_money_phone)} />
            <InfoRow label="Mobile provider" value={val(hr.mobile_provider)} />
          </SectionCard>
        );
      case 'performance':
        return (
          <TabEmpty
            icon={BarChart3}
            title="Performance reviews"
            message="Performance tracking is not configured for this employee yet. Appraisal records will appear here when available."
          />
        );
      case 'more':
        return (
          <SectionCard title="Additional records" icon={MoreHorizontal}>
            <InfoRow label="RSSB number" value={val(hr.rssb_number)} />
            <InfoRow label="TIN number" value={val(hr.tin_number)} />
            <InfoRow label="Medical insurance" value={val(hr.medical_insurance)} />
            <InfoRow label="User UID" value={emp.user_uid} />
            <InfoRow label="Portal active" value={emp.is_active ? 'Yes' : 'No'} />
          </SectionCard>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Breadcrumb + actions */}
      <div className="bg-white border-b border-slate-100 px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <nav className="flex items-center gap-2 text-xs text-slate-400">
          <Link to={routePath('/hr/directory')} className="hover:text-[#c87800] transition-colors">Employee Directory</Link>
          <ChevronRight size={12} />
          <span className="text-slate-600" style={{ fontWeight: 500 }}>Employee Profile</span>
        </nav>
        <div className="flex gap-2 relative">
          <button
            type="button"
            onClick={() => navigate(routePath(`/hr/directory/${employeeId}/edit`))}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            style={{ fontWeight: 500 }}
          >
            <Pencil size={13} /> Edit profile
          </button>
          <button
            type="button"
            onClick={() => setShowActions(!showActions)}
            className="px-4 py-2 bg-[#c87800] text-white rounded-xl text-xs hover:bg-[#b36d00] transition-colors flex items-center gap-1.5"
            style={{ fontWeight: 500 }}
          >
            Actions <ChevronDown size={12} />
          </button>
          {showActions && (
            <>
              <button type="button" className="fixed inset-0 z-10" onClick={() => setShowActions(false)} aria-label="Close" />
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-100 rounded-xl shadow-lg py-1 z-20 text-xs">
                {quickActions.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => { a.onClick(); setShowActions(false); }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2 ${a.danger ? 'text-red-600' : 'text-slate-600'}`}
                  >
                    <a.icon size={14} /> {a.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {error ? <div className="mx-4 mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{error}</div> : null}

      {/* Hero */}
      <div className="bg-white border-b border-slate-100 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 items-start">
          <div className="relative shrink-0 mx-auto lg:mx-0">
            {photoUrl ? (
              <img src={photoUrl} alt={emp.name} className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-lg ring-2 ring-amber-100" />
            ) : (
              <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl ${avatarColor(emp.id)} flex items-center justify-center text-white text-2xl shadow-lg`} style={{ fontWeight: 500 }}>
                {initials(emp.name)}
              </div>
            )}
            <button type="button" onClick={() => navigate(routePath(`/hr/directory/${employeeId}/edit`))} className="absolute bottom-1 right-1 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-[#c87800] shadow-sm">
              <Camera size={14} />
            </button>
            {emp.employment_status === 'Active' && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-1">
              <h1 className="text-slate-800 text-xl sm:text-2xl" style={{ fontWeight: 500 }}>{emp.name}</h1>
              <HrBadge variant={statusToBadge(emp.employment_status)}>{emp.employment_status}</HrBadge>
            </div>
            <p className="text-slate-500 text-sm font-mono">{emp.employee_id} · {emp.position}</p>
            <p className="text-slate-400 text-xs mt-0.5">{val(emp.department)} · {val(emp.role_name || emp.role_code)}</p>
            <div className="mt-4 flex flex-wrap justify-center lg:justify-start gap-5">
              {[
                { icon: Calendar, label: 'Join date', value: fmtDate(emp.hire_date) },
                { icon: Mail, label: 'Email', value: val(emp.email) },
                { icon: Phone, label: 'Phone', value: val(emp.phone) },
                { icon: MapPin, label: 'Address', value: resAddr },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2 min-w-0 max-w-[200px]">
                  <Icon size={14} className="text-[#c87800] shrink-0" />
                  <div className="min-w-0 text-left">
                    <p className="text-slate-400 text-[10px] uppercase tracking-wide">{label}</p>
                    <p className="text-slate-700 text-xs truncate" style={{ fontWeight: 500 }} title={value || ''}>{value || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full lg:w-56 shrink-0 bg-slate-50 rounded-2xl border border-slate-100 p-4">
            <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-3" style={{ fontWeight: 500 }}>Employment summary</p>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-2"><dt className="text-slate-400">Type</dt><dd className="text-slate-700 text-right" style={{ fontWeight: 500 }}>{display(emp.employment_type)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-400">Contract</dt><dd className="text-slate-700 text-right" style={{ fontWeight: 500 }}>{emp.contract_end ? fmtDate(emp.contract_end) : 'Ongoing'}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-400">Department</dt><dd className="text-slate-700 text-right truncate" style={{ fontWeight: 500 }}>{display(emp.department)}</dd></div>
              {yos != null && (
                <div className="flex justify-between gap-2"><dt className="text-slate-400">Service</dt><dd className="text-slate-700 text-right" style={{ fontWeight: 500 }}>{yos} year{yos !== 1 ? 's' : ''}</dd></div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto gap-0 scrollbar-thin">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3.5 text-xs whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id ? 'border-[#c87800] text-[#c87800]' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
                style={{ fontWeight: activeTab === tab.id ? 500 : 400 }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{renderTabContent()}</div>

      <HrModal open={!!docPreview} onClose={() => setDocPreview(null)} title="Document" wide>
        {docPreview && (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-slate-500 text-xs uppercase">{DOC_LABELS[docPreview.key] || docPreview.key}</p>
              <p className="text-[#000435]" style={{ fontWeight: 500 }}>{docPreview.name}</p>
            </div>
            {docPreview.url ? (
              <>
                {/\.pdf($|\?)/i.test(docPreview.url) ? (
                  <iframe title={docPreview.name} src={docPreview.url} className="w-full h-[min(70vh,520px)] rounded-xl border border-slate-200" />
                ) : /\.(jpe?g|png|webp)($|\?)/i.test(docPreview.url) ? (
                  <img src={docPreview.url} alt={docPreview.name} className="max-w-full max-h-[70vh] mx-auto rounded-xl border border-slate-200" />
                ) : (
                  <a href={docPreview.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#c87800] text-xs hover:underline">
                    <Download size={14} /> Open / download file
                  </a>
                )}
                <a href={docPreview.url} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-[#c87800] hover:underline">Open in new tab</a>
              </>
            ) : (
              <p className="text-xs text-slate-500">File not on server. Re-upload via Edit profile → Documents.</p>
            )}
          </div>
        )}
      </HrModal>
    </div>
  );
}
