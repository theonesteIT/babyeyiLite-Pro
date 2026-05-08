import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Users, Search, Plus, MoreVertical, Briefcase,
    TrendingUp, Mail, ChevronRight,
    UserCheck, Award, Filter, Activity, UserPlus, X, User,
    Phone, Clock, Home, Tag, Printer, Eye, CheckCircle, RefreshCw, Camera,
    FileText, FileSpreadsheet, Building2, ShieldCheck, FileSignature, Loader2,
    Fingerprint, CreditCard, IdCard, Edit3, Pencil
} from 'lucide-react';
import {
    RegistryPageShell,
    RegistryPageHeader,
    RegistryStatGrid,
    RegistryCard,
    ExportSplitButton,
} from '../components/RegistryPageChrome';
import staffService from '../services/staffService';
import { useAuth } from '../context/AuthContext';

// ── Staff Detail Modal (Drawer Style) ──────────────────────────────────────
const StaffModal = ({ staff, onClose, onEditProfile }) => {
    if (!staff) return null;
    const raw = staff._raw || {};
    const pick = (...vals) => {
        for (const v of vals) {
            if (v !== undefined && v !== null && String(v).trim() !== '') return v;
        }
        return null;
    };
    const toAmount = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };
    const parseMaybeJson = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        try {
            const out = JSON.parse(val);
            return Array.isArray(out) ? out : [];
        } catch {
            return [];
        }
    };
    const formatRwf = (v) => `${new Intl.NumberFormat('en-RW').format(Math.max(0, Math.round(v || 0)))} RWF`;
    const basic = toAmount(pick(staff.payrollBasicSalary, raw.payroll_basic_salary));
    const fixedAllowances =
        toAmount(pick(staff.payrollTransportAllowance, raw.payroll_transport_allowance)) +
        toAmount(pick(staff.payrollHousingAllowance, raw.payroll_housing_allowance)) +
        toAmount(pick(staff.payrollMealAllowance, raw.payroll_meal_allowance));
    const otherAllowances = parseMaybeJson(pick(staff.payrollOtherAllowances, raw.payroll_other_allowances))
        .reduce((sum, row) => sum + toAmount(row?.amount), 0);
    const gross = basic + fixedAllowances + otherAllowances;
    const taxPercent = toAmount(pick(staff.payrollTaxPercent, raw.payroll_tax_percent));
    const taxAmount = taxPercent > 0 ? (gross * taxPercent) / 100 : 0;
    const pension = toAmount(pick(staff.payrollPensionAmount, raw.payroll_pension_amount));
    const otherDeductions = parseMaybeJson(pick(staff.payrollOtherDeductions, raw.payroll_other_deductions))
        .reduce((sum, row) => sum + toAmount(row?.amount), 0);
    const deductions = taxAmount + pension + otherDeductions;
    const net = gross - deductions;

    return createPortal(
        <>
            {/* Backdrop Blur */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Right Side Drawer */}
            <div className="fixed inset-y-0 right-0 z-[110] w-full md:w-[420px] bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.1)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">

                {/* Drawer Header */}
                <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-white shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-re-text font-black text-base shadow-inner relative overflow-hidden shrink-0">
                            {staff.photo ? (
                                <img
                                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:5100'}${staff.photo}`}
                                    className="w-full h-full object-cover relative z-10"
                                    alt=""
                                />
                            ) : (
                                <>
                                    <span className="relative z-10" style={{ color: "#1E3A5F" }}>{staff.name?.charAt(0)}</span>
                                    <div className="absolute inset-0 opacity-5 bg-re-gold" />
                                </>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight tracking-tight truncate">{staff.name}</h3>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate font-mono">
                                {pick(staff.staffId, raw.staff_id, staff.id)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {typeof onEditProfile === 'function' && (
                            <button
                                type="button"
                                onClick={() => onEditProfile(staff)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-re-gold px-3 py-2 text-[12px] font-bold text-[#0b1530] shadow-sm hover:bg-re-gold-light transition-all"
                            >
                                <Pencil size={14} />
                                <span className="hidden xs:inline">Edit</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-slate-800"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Drawer Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">

                    {/* Status Alert (Premium Badge) */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${staff.status === 'Exceptional' ? 'bg-emerald-50 border-emerald-100/50' : 'bg-re-navy/5 border-re-navy/10'}`}>
                        <div className={`p-1.5 rounded-lg ${staff.status === 'Exceptional' ? 'bg-emerald-500' : 'bg-[#1E3A5F]'} text-white`}>
                            <ShieldCheck size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-re-text uppercase tracking-widest">{staff.status || 'Standard'} Personnel Rating</p>
                            <p className="text-[9px] text-re-text/40 font-bold uppercase tracking-tight leading-none mt-0.5">Performance aligned with Core Values</p>
                        </div>
                    </div>

                    {/* HR Hero Section (Evaluation & Presence) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-re-grad-purple opacity-5 rounded-full -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-700" />
                            <p className="text-[8px] text-re-text-muted uppercase tracking-[0.2em] font-black mb-1 relative z-10 opacity-60">Evaluation Score</p>
                            <div className="flex items-baseline gap-1 relative z-10">
                                <span className="text-2xl font-black text-re-text tracking-tighter">{staff.evaluation || 85}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#FEBF10" }}>%</span>
                            </div>
                        </div>
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group text-right">
                            <div className="absolute top-0 left-0 w-16 h-16 opacity-5 rounded-full -ml-6 -mt-6 group-hover:scale-125 transition-transform duration-700" style={{ background: "#FEBF10" }} />
                            <p className="text-[8px] text-re-text-muted uppercase tracking-[0.2em] font-black mb-1 relative z-10 opacity-60">Attendance</p>
                            <div className="flex items-baseline gap-1 justify-end relative z-10">
                                <span className="text-2xl font-black text-re-text tracking-tighter">{staff.attendance || 90}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#FEBF10" }}>%</span>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Info Matrix */}
                    <div className="space-y-5">
                        {[
                            {
                                section: 'Personal Information',
                                rows: [
                                    { label: 'Full Name', value: pick(staff.name, raw.full_name, `${raw.first_name || ''} ${raw.last_name || ''}`.trim()) || 'N/A', icon: User },
                                    { label: 'Gender', value: pick(staff.gender, raw.gender) || 'N/A', icon: UserCheck },
                                    { label: 'Date of Birth', value: pick(staff.dateOfBirth, raw.date_of_birth) || 'N/A', icon: Clock },
                                    { label: 'National ID/Passport', value: pick(staff.nationalId, raw.national_id, raw.passport_number) || 'N/A', icon: IdCard },
                                    { label: 'Phone', value: pick(staff.phone, raw.phone) || 'N/A', icon: Phone },
                                    { label: 'Email', value: pick(staff.email, raw.email) || 'N/A', icon: Mail },
                                    { label: 'Address', value: pick(staff.address, raw.address) || 'N/A', icon: Home },
                                ],
                            },
                            {
                                section: 'Employment Details',
                                rows: [
                                    { label: 'Staff ID', value: pick(staff.staffId, raw.staff_id, staff.id, raw.user_uid) || 'N/A', icon: Tag },
                                    { label: 'Employment Type', value: pick(staff.employmentType, raw.employment_type) || 'N/A', icon: Briefcase },
                                    { label: 'Job Title', value: pick(staff.jobTitle, raw.job_title, staff.role, raw.role_name, raw.role_code) || 'N/A', icon: Briefcase },
                                    { label: 'Date of Employment', value: pick(staff.dateOfEmployment, raw.date_of_employment, staff.joinedDate, raw.created_at) || 'N/A', icon: Clock },
                                    { label: 'Contract Start Date', value: pick(staff.contractStartDate, raw.contract_start_date) || 'N/A', icon: Clock },
                                    { label: 'Contract End Date', value: pick(staff.contractEndDate, raw.contract_end_date) || ((pick(staff.fullContract, raw.employment_type === 'Contract' && !raw.contract_end_date)) ? 'Full Contract (No End Date)' : 'N/A'), icon: Clock },
                                    { label: 'Status', value: pick(staff.employmentStatus, raw.employment_status, staff.status) || 'N/A', icon: Activity },
                                ],
                            },
                            {
                                section: 'Department & Role',
                                rows: [
                                    { label: 'Department', value: pick(staff.department, raw.department) || 'N/A', icon: Building2 },
                                    { label: 'Sub-department', value: pick(staff.subDepartment, raw.sub_department) || 'N/A', icon: Building2 },
                                    { label: 'Role', value: pick(staff.role, raw.role_name, raw.role_code) || 'N/A', icon: ShieldCheck },
                                ],
                            },
                            {
                                section: 'Payroll Setup',
                                rows: [
                                    { label: 'Basic Salary', value: pick(staff.payrollBasicSalary, raw.payroll_basic_salary) != null ? `${pick(staff.payrollBasicSalary, raw.payroll_basic_salary)} RWF` : 'N/A', icon: CreditCard },
                                    { label: 'Tax (%)', value: pick(staff.payrollTaxPercent, raw.payroll_tax_percent) != null ? `${pick(staff.payrollTaxPercent, raw.payroll_tax_percent)}%` : 'Not set', icon: TrendingUp },
                                    { label: 'Payment Frequency', value: pick(staff.payrollPaymentFrequency, raw.payroll_payment_frequency) || 'N/A', icon: Clock },
                                    { label: 'Payment Method', value: pick(staff.payrollPaymentMethod, raw.payroll_payment_method) || 'N/A', icon: CreditCard },
                                    { label: 'Bank Name', value: pick(staff.payrollBankName, raw.payroll_bank_name) || 'N/A', icon: Building2 },
                                    { label: 'Account Number', value: pick(staff.payrollAccountNumber, raw.payroll_account_number) || 'N/A', icon: IdCard },
                                    { label: 'Mobile Money', value: pick(staff.payrollMobileMoneyPhone, raw.payroll_mobile_money_phone) || 'N/A', icon: Phone },
                                    { label: 'Advance Allowed', value: (pick(staff.allowAdvance, raw.allow_advance) ? 'Yes' : 'No'), icon: FileSignature },
                                ],
                            },
                            {
                                section: 'Account & Identity',
                                rows: [
                                    { label: 'Account Enabled', value: (pick(staff.accountEnabled, raw.account_enabled) ? 'Yes' : 'No'), icon: UserCheck },
                                    { label: 'Username', value: pick(staff.username, raw.staff_login_username, raw.username) || 'N/A', icon: User },
                                    { label: 'RFID UID', value: staff.rfid_uid || 'N/A', icon: IdCard },
                                    { label: 'Fingerprint ID', value: staff.fingerprint_id || 'N/A', icon: Fingerprint },
                                    { label: 'Identity Remarks', value: staff.identity_remarks || 'N/A', icon: FileText },
                                ],
                            },
                        ].map((group) => (
                            <div key={group.section} className="space-y-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.3em] opacity-40">{group.section}</span>
                                    <div className="flex-1 h-px bg-black/5" />
                                </div>
                                {group.rows.map((item, i) => (
                                    <div key={`${group.section}-${i}`} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2">
                                            <item.icon size={11} className="opacity-30" style={{ color: "#FEBF10" }} />
                                            <span className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">{item.label}</span>
                                        </div>
                                        <div className="flex-1 mx-3 border-b border-dashed border-black/10 group-hover:border-[#FEBF10]/30 transition-colors" />
                                        <span className="text-[10px] font-black text-re-text uppercase tracking-tight text-right truncate max-w-[170px]" title={String(item.value || 'N/A')}>{item.value || 'N/A'}</span>
                                    </div>
                                ))}
                            </div>
                        ))}

                        <div className="rounded-2xl border border-[#1E3A5F]/15 bg-[#1E3A5F]/5 p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-[0.25em]">Payroll Summary</span>
                                <div className="flex-1 h-px bg-[#1E3A5F]/15" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white rounded-xl border border-black/5 p-2">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Gross</p>
                                    <p className="text-[10px] font-black text-re-text">{formatRwf(gross)}</p>
                                </div>
                                <div className="bg-white rounded-xl border border-black/5 p-2">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Tax</p>
                                    <p className="text-[10px] font-black text-re-text">{taxPercent > 0 ? `${taxPercent}% (${formatRwf(taxAmount)})` : 'Not set'}</p>
                                </div>
                                <div className="bg-white rounded-xl border border-black/5 p-2">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Net</p>
                                    <p className="text-[10px] font-black text-re-text">{formatRwf(net)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Behavioral Activity Log (HR History) */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.3em] opacity-40">Personnel Activity Log</span>
                            <div className="flex-1 h-px bg-black/5" />
                        </div>

                        <div className="space-y-3">
                            {[
                                { type: 'Appraisal', date: 'Last Month', msg: 'Termly performance review finalized at Expected level.', icon: FileSignature, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                                { type: 'Presence', date: '3 weeks ago', msg: 'Approved excused absence for professional development.', icon: UserCheck, color: 'text-re-purple', bg: 'bg-re-purple/5' },
                                { type: 'Role Auth', date: '1 year ago', msg: 'Contract renewed successfully for upcoming academic cycle.', icon: ShieldCheck, color: 'text-[#1E3A5F]', bg: 'bg-slate-100' }
                            ].map((log, i) => (
                                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-re-bg/50 border border-black/[0.02] group hover:bg-white hover:border-black/5 transition-all">
                                    <div className={`p-2 rounded-xl ${log.bg} ${log.color} shrink-0`}>
                                        <log.icon size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-re-text">{log.type}</span>
                                            <span className="w-1 h-1 bg-black/10 rounded-full"></span>
                                            <span className="text-[8px] font-bold text-re-text-muted opacity-40 uppercase">{log.date}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-re-text-muted leading-relaxed tracking-tight group-hover:text-re-text transition-colors">{log.msg}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Drawer Footer (Actions) */}
                <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                    {typeof onEditProfile === 'function' && (
                        <button
                            type="button"
                            onClick={() => onEditProfile(staff)}
                            className="h-12 w-full flex items-center justify-center gap-2 rounded-2xl bg-re-gold text-[#0b1530] font-bold text-sm shadow-md hover:bg-re-gold-light transition-all"
                        >
                            <Pencil size={16} /> Full profile &amp; edit
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => onClose()}
                        className="h-12 w-full flex items-center justify-center gap-2 text-white rounded-2xl font-bold text-sm shadow-lg hover:opacity-95 transition-all"
                        style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                    >
                        <FileSignature size={16} /> Request formal appraisal
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            className="h-12 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-800 font-semibold text-xs rounded-2xl hover:bg-slate-50"
                        >
                            <Mail size={15} className="text-re-gold" /> Send notice
                        </button>
                        <button
                            type="button"
                            className="h-12 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-800 font-semibold text-xs rounded-2xl hover:bg-slate-50"
                            onClick={() => window.print()}
                        >
                            <Printer size={15} className="text-re-gold" /> Print HR file
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};
const HIRE_STEPS = [
    'Personal Information',
    'Employment Details',
    'Department & Role Assignment',
    'Payroll Setup',
    'Account Setup',
    'Review & Save'
];

const getRoleAbbr = (roleCode) => {
    const role = (roleCode || '').toUpperCase();
    if (role.includes('MANAGER')) return 'SM';
    if (role.includes('DIRECTOR')) return 'SD';
    if (role.includes('ACCOUNTANT')) return 'AC';
    if (role.includes('TEACHER')) return 'TR';
    return 'SS'; // Support Staff default
};

const getNextStaffCode = (roleCode, existingStaff = [], currentStaffId = null) => {
    const prefix = getRoleAbbr(roleCode);
    let maxCodeNumber = 0;
    (existingStaff || []).forEach((s) => {
        if (currentStaffId && String(s?.id) === String(currentStaffId)) return;
        const rawCode = String(s?.staff_id || s?.staffId || '').trim().toUpperCase();
        const match = rawCode.match(/^[A-Z]{2}-(\d{1,})$/);
        if (match) {
            const n = Number(match[1]);
            if (Number.isFinite(n)) maxCodeNumber = Math.max(maxCodeNumber, n);
        }
    });
    return `${prefix}-${String(maxCodeNumber + 1).padStart(3, '0')}`;
};

const KNOWN_ROLE_CODES = new Set([
    'TEACHER',
    'ACCOUNTANT',
    'HR',
    'DOS',
    'STORE_MANAGER',
    'LIBRARIAN',
    'DISCIPLINE',
    'SECRETARY',
    'HOD',
    'SCHOOL_MANAGER',
    'SCHOOL_DIRECTOR',
]);

const HireModal = ({ isOpen, onClose, onHire, onEdit, editingStaff, existingStaff }) => {
    const isEditMode = !!editingStaff;
    const [step, setStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [photo, setPhoto] = useState(null);
    const [preview, setPreview] = useState(null);
    const [formData, setFormData] = useState({
        full_name: '',
        gender: '',
        date_of_birth: '',
        national_id: '',
        passport_number: '',
        phone: '',
        email: '',
        address: '',
        staff_id: '',
        employment_type: 'Full-time',
        job_title: '',
        date_of_employment: '',
        contract_start_date: '',
        contract_end_date: '',
        full_contract: false,
        employment_status: 'Active',
        department: 'Academics',
        sub_department: '',
        role_code: 'TEACHER',
        custom_role_name: '',
        payroll_basic_salary: '',
        payroll_transport_allowance: '',
        payroll_housing_allowance: '',
        payroll_meal_allowance: '',
        payroll_other_allowances: [{ label: '', amount: '' }],
        payroll_tax_percent: '',
        payroll_pension_amount: '',
        payroll_other_deductions: [{ label: '', amount: '' }],
        payroll_payment_frequency: 'Monthly',
        payroll_payment_method: 'Bank Transfer',
        payroll_bank_name: '',
        payroll_account_number: '',
        payroll_mobile_money_phone: '',
        payroll_part_time_rate: '',
        payroll_part_time_unit: 'hour',
        allow_advance: false,
        max_advance_limit: '',
        advance_deduction_type: 'percent',
        advance_deduction_value: '',
        account_enabled: true,
        username: '',
        password: '',
        confirm_password: '',
        rfid_uid: '',
        fingerprint_id: '',
        identity_remarks: ''
    });

    useEffect(() => {
        if (!isOpen) return;
        if (isEditMode && editingStaff) {
            const parts = String(editingStaff.name || '').trim().split(/\s+/);
            const parseList = (val) => {
                if (!val) return [{ label: '', amount: '' }];
                if (Array.isArray(val)) return val.length ? val : [{ label: '', amount: '' }];
                try {
                    const out = JSON.parse(val);
                    return Array.isArray(out) && out.length ? out : [{ label: '', amount: '' }];
                } catch {
                    return [{ label: '', amount: '' }];
                }
            };
            const normalizedDepartment =
                editingStaff.department === 'Academic Staff'
                    ? 'Academics'
                    : editingStaff.department || 'Administration';
            const resolvedRoleCode = String(editingStaff.role_code || 'TEACHER').toUpperCase().replace(/\s+/g, '_');
            const isKnownRole = KNOWN_ROLE_CODES.has(resolvedRoleCode);
            const resolvedCustomRole = !isKnownRole
                ? String(editingStaff.role_name || editingStaff.role || editingStaff.jobTitle || resolvedRoleCode)
                    .replace(/_/g, ' ')
                    .trim()
                : '';
            setFormData({
                full_name: editingStaff.name || '',
                gender: editingStaff.gender || '',
                date_of_birth: editingStaff.date_of_birth || '',
                national_id: editingStaff.nationalId || '',
                passport_number: editingStaff.passportNumber || '',
                phone: editingStaff.phone !== 'N/A' ? editingStaff.phone : '',
                email: editingStaff.email || '',
                address: editingStaff.address || '',
                staff_id: String(editingStaff.staffId || editingStaff.id || ''),
                employment_type: editingStaff.employmentType || 'Full-time',
                job_title: editingStaff.jobTitle || editingStaff.role || '',
                date_of_employment: editingStaff.date_of_employment || '',
                contract_start_date: editingStaff.contract_start_date || '',
                contract_end_date: editingStaff.contract_end_date || '',
                full_contract: !!(editingStaff.employmentType === 'Contract' && !editingStaff.contract_end_date),
                employment_status: editingStaff.employmentStatus || (editingStaff.status === 'Inactive' ? 'Suspended' : 'Active'),
                department: normalizedDepartment,
                sub_department: editingStaff.subDepartment || '',
                role_code: isKnownRole ? resolvedRoleCode : 'CUSTOM',
                custom_role_name: resolvedCustomRole,
                payroll_basic_salary: editingStaff.payrollBasicSalary ?? '',
                payroll_transport_allowance: editingStaff.payrollTransportAllowance ?? '',
                payroll_housing_allowance: editingStaff.payrollHousingAllowance ?? '',
                payroll_meal_allowance: editingStaff.payrollMealAllowance ?? '',
                payroll_other_allowances: parseList(editingStaff.payrollOtherAllowances),
                payroll_tax_percent: editingStaff.payrollTaxPercent ?? '',
                payroll_pension_amount: editingStaff.payrollPensionAmount ?? '',
                payroll_other_deductions: parseList(editingStaff.payrollOtherDeductions),
                payroll_payment_frequency: editingStaff.payrollPaymentFrequency || 'Monthly',
                payroll_payment_method: editingStaff.payrollPaymentMethod || 'Bank Transfer',
                payroll_bank_name: editingStaff.payrollBankName || '',
                payroll_account_number: editingStaff.payrollAccountNumber || '',
                payroll_mobile_money_phone: editingStaff.payrollMobileMoneyPhone || '',
                payroll_part_time_rate: editingStaff.payrollPartTimeRate ?? '',
                payroll_part_time_unit: editingStaff.payrollPartTimeUnit || 'hour',
                allow_advance: !!editingStaff.allowAdvance,
                max_advance_limit: editingStaff.maxAdvanceLimit ?? '',
                advance_deduction_type: editingStaff.advanceDeductionType || 'percent',
                advance_deduction_value: editingStaff.advanceDeductionValue ?? '',
                account_enabled: editingStaff.accountEnabled !== false,
                username: editingStaff.username || (editingStaff.email || `${parts[0] || ''}.${parts[1] || ''}`).split('@')[0],
                password: '',
                confirm_password: '',
                rfid_uid: editingStaff.rfid_uid || '',
                fingerprint_id: editingStaff.fingerprint_id || '',
                identity_remarks: editingStaff.identity_remarks || ''
            });
            setPreview(editingStaff.photo ? (import.meta.env.VITE_API_URL || 'http://localhost:5100') + editingStaff.photo : null);
        } else {
            const defaultRole = 'TEACHER';
            const defaultStaffCode = getNextStaffCode(defaultRole, existingStaff);
            setFormData((prev) => ({
                ...prev,
                full_name: '',
                gender: '',
                date_of_birth: '',
                national_id: '',
                passport_number: '',
                phone: '',
                email: '',
                address: '',
                staff_id: defaultStaffCode,
                employment_type: 'Full-time',
                job_title: '',
                date_of_employment: '',
                contract_start_date: '',
                contract_end_date: '',
                full_contract: false,
                employment_status: 'Active',
                department: 'Academics',
                sub_department: '',
                role_code: defaultRole,
                custom_role_name: '',
                payroll_basic_salary: '',
                payroll_transport_allowance: '',
                payroll_housing_allowance: '',
                payroll_meal_allowance: '',
                payroll_other_allowances: [{ label: '', amount: '' }],
                payroll_tax_percent: '',
                payroll_pension_amount: '',
                payroll_other_deductions: [{ label: '', amount: '' }],
                payroll_payment_frequency: 'Monthly',
                payroll_payment_method: 'Bank Transfer',
                payroll_bank_name: '',
                payroll_account_number: '',
                payroll_mobile_money_phone: '',
                payroll_part_time_rate: '',
                payroll_part_time_unit: 'hour',
                allow_advance: false,
                max_advance_limit: '',
                advance_deduction_type: 'percent',
                advance_deduction_value: '',
                account_enabled: true,
                username: '',
                password: '',
                confirm_password: '',
                rfid_uid: '',
                fingerprint_id: '',
                identity_remarks: ''
            }));
            setPreview(null);
        }
        setPhoto(null);
        setStep(0);
        setError('');
        setFieldErrors({});
    }, [isOpen, isEditMode, editingStaff, existingStaff]);

    if (!isOpen) return null;

    const setField = (key, value) => {
        setFormData((p) => ({ ...p, [key]: value }));
        setFieldErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };
    const toNumberOrNull = (v) => {
        if (v === '' || v == null) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    };
    const sameEmail = (existingStaff || []).find((s) => String(s.email || '').toLowerCase() === String(formData.email || '').toLowerCase() && String(s.id) !== String(editingStaff?.id));
    const sameNationalId = (existingStaff || []).find((s) => String(s.national_id || '') && String(s.national_id) === String(formData.national_id || '') && String(s.id) !== String(editingStaff?.id));

    const validateStep = () => {
        if (step === 0) {
            if (!formData.full_name || !formData.email || !formData.phone || !formData.gender || !formData.national_id) return 'Fill all required personal fields.';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Email format is invalid.';
            if (!/^[+]?[\d\s-]{9,20}$/.test(formData.phone)) return 'Phone format is invalid.';
            if (sameEmail) return 'Email already exists.';
            if (sameNationalId) return 'National ID/Passport already exists.';
        }
        if (step === 1) {
            if (!formData.staff_id || !formData.job_title || !formData.date_of_employment) return 'Employment details are required.';
            if (formData.employment_type === 'Contract' && !formData.contract_start_date) return 'Contract start date is required.';
            if (formData.employment_type === 'Contract' && !formData.full_contract && !formData.contract_end_date) return 'Contract end date is required unless Full Contract is checked.';
        }
        if (step === 2 && (!formData.department || !formData.role_code)) return 'Department and role are required.';
        if (step === 2 && formData.role_code === 'CUSTOM' && !String(formData.custom_role_name || '').trim()) {
            return 'Custom role name is required.';
        }
        if (step === 4 && formData.account_enabled) {
            if (!formData.username) return 'Username is required when account is enabled.';
            if (!isEditMode && String(formData.password || '').length < 8) return 'Password must be at least 8 characters.';
            if (!isEditMode && formData.password !== formData.confirm_password) return 'Passwords do not match.';
        }
        return '';
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhoto(file);
        setPreview(URL.createObjectURL(file));
    };

    const updateListItem = (field, index, key, value) => {
        const list = [...formData[field]];
        list[index] = { ...list[index], [key]: value };
        setField(field, list);
    };

    const preparePayload = () => {
        const [first_name, ...rest] = String(formData.full_name || '').trim().split(/\s+/);
        const last_name = rest.join(' ') || '-';
        const payload = {
            first_name,
            last_name,
            full_name: formData.full_name,
            gender: formData.gender,
            date_of_birth: formData.date_of_birth || null,
            national_id: formData.national_id || null,
            passport_number: formData.passport_number || null,
            phone: formData.phone || null,
            email: formData.email,
            address: formData.address || null,
            staff_id: formData.staff_id || null,
            staff_code: formData.staff_id || null,
            employment_type: formData.employment_type,
            job_title: formData.job_title,
            date_of_employment: formData.date_of_employment || null,
            contract_start_date: formData.employment_type === 'Contract' ? formData.contract_start_date || null : null,
            contract_end_date: formData.employment_type === 'Contract' ? (formData.full_contract ? null : (formData.contract_end_date || null)) : null,
            employment_status: formData.employment_status,
            department: formData.department,
            sub_department: formData.sub_department || null,
            role_code: formData.role_code === 'CUSTOM'
                ? String(formData.custom_role_name || '').trim().toUpperCase().replace(/\s+/g, '_')
                : formData.role_code,
            role_name: formData.role_code === 'CUSTOM'
                ? String(formData.custom_role_name || '').trim() || null
                : null,
            payroll_basic_salary: toNumberOrNull(formData.payroll_basic_salary),
            payroll_transport_allowance: null,
            payroll_housing_allowance: null,
            payroll_meal_allowance: null,
            payroll_other_allowances: formData.payroll_other_allowances.filter((a) => a.label || a.amount),
            payroll_tax_percent: toNumberOrNull(formData.payroll_tax_percent),
            payroll_pension_amount: null,
            payroll_other_deductions: formData.payroll_other_deductions.filter((d) => d.label || d.amount),
            payroll_payment_frequency: formData.payroll_payment_frequency,
            payroll_payment_method: formData.payroll_payment_method,
            payroll_bank_name: formData.payroll_payment_method === 'Bank Transfer' ? formData.payroll_bank_name || null : null,
            payroll_account_number: formData.payroll_payment_method === 'Bank Transfer' ? formData.payroll_account_number || null : null,
            payroll_mobile_money_phone: formData.payroll_payment_method === 'Mobile Money' ? formData.payroll_mobile_money_phone || null : null,
            payroll_part_time_rate: formData.employment_type === 'Part-time' ? toNumberOrNull(formData.payroll_part_time_rate) : null,
            payroll_part_time_unit: formData.employment_type === 'Part-time' ? formData.payroll_part_time_unit : null,
            allow_advance: !!formData.allow_advance,
            max_advance_limit: formData.allow_advance ? toNumberOrNull(formData.max_advance_limit) : null,
            advance_deduction_type: formData.allow_advance ? formData.advance_deduction_type : null,
            advance_deduction_value: formData.allow_advance ? toNumberOrNull(formData.advance_deduction_value) : null,
            account_enabled: !!formData.account_enabled,
            username: formData.username || String(formData.email || '').split('@')[0],
            rfid_uid: formData.rfid_uid || null,
            fingerprint_id: formData.fingerprint_id || null,
            identity_remarks: formData.identity_remarks || null
        };
        if (!isEditMode && formData.account_enabled) payload.password = formData.password;
        return payload;
    };

    const onNext = () => {
        const msg = validateStep();
        setError(msg);
        if (msg) return;
        setStep((s) => Math.min(s + 1, HIRE_STEPS.length - 1));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        const msg = validateStep();
        setError(msg);
        if (msg) return;
        setFieldErrors({});
        setIsSubmitting(true);
        const payload = preparePayload();
        const result = isEditMode ? await onEdit(editingStaff.real_id || editingStaff.id, payload, photo) : await onHire(payload, photo);
        setIsSubmitting(false);
        if (result?.ok) {
            onClose();
            return;
        }
        setError(result?.message || 'Unable to save this staff record. Please review highlighted fields.');
        if (result?.field) {
            const backendToUiField = {
                email: 'email',
                phone: 'phone',
                username: 'username',
                national_id: 'national_id'
            };
            const uiField = backendToUiField[result.field] || null;
            if (uiField) {
                setFieldErrors((prev) => ({ ...prev, [uiField]: result.message || 'Invalid value' }));
                if (uiField === 'email' || uiField === 'phone' || uiField === 'national_id') setStep(0);
                if (uiField === 'username') setStep(4);
            }
        }
    };

    const inputCls = 'w-full h-9 bg-re-bg/80 border border-black/5 rounded-xl px-3 text-[10px] font-black outline-none focus:ring-1 ring-re-navy/10 transition-all shadow-inner';
    const inputClsWithError = (field) => `${inputCls} ${fieldErrors[field] ? 'border-red-400 focus:border-red-500 ring-red-200' : ''}`;
    const parseAmount = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };
    const formatRwf = (v) => new Intl.NumberFormat('en-RW').format(Math.max(0, Math.round(v || 0)));
    const basicSalaryValue = parseAmount(formData.payroll_basic_salary);
    const fixedAllowancesValue = 0;
    const extraAllowancesValue = (formData.payroll_other_allowances || [])
        .reduce((sum, row) => sum + parseAmount(row.amount), 0);
    const grossSalary = basicSalaryValue + fixedAllowancesValue + extraAllowancesValue;
    const taxPercentValue = parseAmount(formData.payroll_tax_percent);
    const taxAmount = taxPercentValue > 0 ? (grossSalary * taxPercentValue) / 100 : 0;
    const pensionAmount = 0;
    const otherDeductionsValue = (formData.payroll_other_deductions || [])
        .reduce((sum, row) => sum + parseAmount(row.amount), 0);
    const totalDeductions = taxAmount + pensionAmount + otherDeductionsValue;
    const netSalary = grossSalary - totalDeductions;
    const section = () => {
        if (step === 0) {
            return (
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-2xl bg-re-bg border border-black/10 flex items-center justify-center overflow-hidden">
                                {preview ? <img src={preview} alt="preview" className="w-full h-full object-cover" /> : <Camera size={20} className="opacity-40" />}
                            </div>
                            <input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                        <div className="text-[9px] font-bold text-re-text-muted uppercase tracking-widest">Profile Photo (with preview)</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Full Name</p>
                            <input className={inputCls} placeholder="e.g. Juma Ally" value={formData.full_name} onChange={(e) => setField('full_name', e.target.value)} />
                        </label>
                        <label className="space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Gender</p>
                            <select className={inputCls} value={formData.gender} onChange={(e) => setField('gender', e.target.value)}><option value="">Select gender</option><option>Male</option><option>Female</option></select>
                        </label>
                        <label className="space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Date of Birth</p>
                            <input type="date" className={inputCls} value={formData.date_of_birth} onChange={(e) => setField('date_of_birth', e.target.value)} />
                        </label>
                        <label className="space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">National ID / Passport</p>
                            <input className={inputClsWithError('national_id')} placeholder="ID or Passport Number" value={formData.national_id} onChange={(e) => setField('national_id', e.target.value)} />
                            {fieldErrors.national_id && <p className="text-[9px] font-bold text-red-600">{fieldErrors.national_id}</p>}
                        </label>
                        <label className="space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Phone Number</p>
                            <input className={inputClsWithError('phone')} placeholder="e.g. 07XXXXXXXX" value={formData.phone} onChange={(e) => setField('phone', e.target.value)} />
                            {fieldErrors.phone && <p className="text-[9px] font-bold text-red-600">{fieldErrors.phone}</p>}
                        </label>
                        <label className="space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Email Address</p>
                            <input type="email" className={inputClsWithError('email')} placeholder="e.g. name@gmail.com" value={formData.email} onChange={(e) => setField('email', e.target.value)} />
                            {fieldErrors.email && <p className="text-[9px] font-bold text-red-600">{fieldErrors.email}</p>}
                        </label>
                    </div>
                    <label className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Address</p>
                        <input className={inputCls} placeholder="e.g. Kigali, Gasabo, Kimironko" value={formData.address} onChange={(e) => setField('address', e.target.value)} />
                    </label>
                </div>
            );
        }
        if (step === 1) {
            return (
                <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Staff ID / Code (Auto Generated)</p>
                        <input className={`${inputCls} bg-black/5 opacity-80 cursor-not-allowed`} placeholder="e.g. TR-007" value={formData.staff_id} readOnly />
                    </label>
                    <label className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Employment Type</p>
                        <select className={inputCls} value={formData.employment_type} onChange={(e) => setField('employment_type', e.target.value)}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Temporary</option></select>
                    </label>
                    <label className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Job Title / Position</p>
                        <input className={inputCls} placeholder="e.g. Teacher, Accountant, DOS" value={formData.job_title} onChange={(e) => setField('job_title', e.target.value)} />
                    </label>
                    <label className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Date of Employment</p>
                        <input type="date" className={inputCls} value={formData.date_of_employment} onChange={(e) => setField('date_of_employment', e.target.value)} />
                    </label>
                    {formData.employment_type === 'Contract' && (
                        <label className="space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Contract Start Date</p>
                            <input type="date" className={inputCls} value={formData.contract_start_date} onChange={(e) => setField('contract_start_date', e.target.value)} />
                        </label>
                    )}
                    {formData.employment_type === 'Contract' && (
                        <label className="col-span-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1E3A5F] bg-[#1E3A5F]/5 border border-[#1E3A5F]/15 rounded-xl px-3 py-2">
                            <input
                                type="checkbox"
                                checked={!!formData.full_contract}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setField('full_contract', checked);
                                    if (checked) setField('contract_end_date', '');
                                }}
                            />
                            Full Contract (No End Date)
                        </label>
                    )}
                    {formData.employment_type === 'Contract' && (
                        <label className="space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Contract End Date</p>
                            <input
                                type="date"
                                className={`${inputCls} ${formData.full_contract ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
                                value={formData.contract_end_date}
                                onChange={(e) => setField('contract_end_date', e.target.value)}
                                disabled={!!formData.full_contract}
                            />
                        </label>
                    )}
                    <label className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Employment Status</p>
                        <select className={inputCls} value={formData.employment_status} onChange={(e) => setField('employment_status', e.target.value)}><option>Active</option><option>On Leave</option><option>Suspended</option></select>
                    </label>
                </div>
            );
        }
        if (step === 2) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Department</p>
                        <select className={inputCls} value={formData.department} onChange={(e) => setField('department', e.target.value)}>
                            <option>Academics</option><option>Administration</option><option>Finance</option><option>Discipline</option><option>HR</option><option>Library</option><option>Store</option>
                        </select>
                    </label>
                    <label className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Sub-department (Optional)</p>
                        <input className={inputCls} placeholder="e.g. Secondary Section, Accounts Unit" value={formData.sub_department} onChange={(e) => setField('sub_department', e.target.value)} />
                    </label>
                    <label className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Role Assignment</p>
                        <select className={inputCls} value={formData.role_code} onChange={(e) => {
                            const val = e.target.value;
                            setField('role_code', val);
                            if (val !== 'CUSTOM') setField('custom_role_name', '');
                            if (!isEditMode) {
                                setField('staff_id', getNextStaffCode(val, existingStaff));
                            }
                        }}>
                            <option value="TEACHER">Teacher</option>
                            <option value="ACCOUNTANT">Accountant</option>
                            <option value="HR">HR</option>
                            <option value="DOS">DOS</option>
                            <option value="STORE_MANAGER">Store Manager</option>
                            <option value="LIBRARIAN">Librarian</option>
                            <option value="DISCIPLINE">Head of Discipline</option>
                            <option value="GATE_KEEPER">Gate Keeper</option>
                            <option value="SECRETARY">Secretary</option>
                            <option value="HOD">Staff</option>
                            <option value="SCHOOL_MANAGER">School Manager</option>
                            <option value="SCHOOL_DIRECTOR">School Director</option>
                            <option value="CUSTOM">Custom</option>
                        </select>
                    </label>
                    {formData.role_code === 'CUSTOM' && (
                        <label className="space-y-1 md:col-span-2">
                            <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Custom Role Name</p>
                            <input
                                className={inputCls}
                                placeholder="e.g. Welfare Officer, Lab Assistant"
                                value={formData.custom_role_name}
                                onChange={(e) => {
                                    const roleName = e.target.value;
                                    setField('custom_role_name', roleName);
                                    if (!isEditMode) {
                                        setField('staff_id', getNextStaffCode(roleName, existingStaff));
                                    }
                                }}
                            />
                        </label>
                    )}
                </div>
            );
        }
        if (step === 3) {
            return (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Basic Salary (Amount)</p>
                            <input type="number" className={inputCls} placeholder="0" value={formData.payroll_basic_salary} onChange={(e) => setField('payroll_basic_salary', e.target.value)} />
                        </label>
                        <label className="space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Tax (%) Optional</p>
                            <input type="number" className={inputCls} placeholder="e.g. 30" value={formData.payroll_tax_percent} onChange={(e) => setField('payroll_tax_percent', e.target.value)} />
                        </label>
                        <label className="space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Payment Frequency</p>
                            <select className={inputCls} value={formData.payroll_payment_frequency} onChange={(e) => setField('payroll_payment_frequency', e.target.value)}><option>Monthly</option><option>Weekly</option></select>
                        </label>
                        <label className="space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Payment Method</p>
                            <select className={inputCls} value={formData.payroll_payment_method} onChange={(e) => setField('payroll_payment_method', e.target.value)}><option>Bank Transfer</option><option>Mobile Money</option></select>
                        </label>
                        {formData.payroll_payment_method === 'Bank Transfer' ? (
                            <label className="space-y-1">
                                <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Bank Name</p>
                                <input className={inputCls} placeholder="Bank Name" value={formData.payroll_bank_name} onChange={(e) => setField('payroll_bank_name', e.target.value)} />
                            </label>
                        ) : (
                            <label className="space-y-1">
                                <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Mobile Money Phone</p>
                                <input className={inputCls} placeholder="250..." value={formData.payroll_mobile_money_phone} onChange={(e) => setField('payroll_mobile_money_phone', e.target.value)} />
                            </label>
                        )}
                        {formData.payroll_payment_method === 'Bank Transfer' ? (
                            <label className="space-y-1">
                                <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Account Number</p>
                                <input className={inputCls} placeholder="Account Number" value={formData.payroll_account_number} onChange={(e) => setField('payroll_account_number', e.target.value)} />
                            </label>
                        ) : null}
                        {formData.employment_type === 'Part-time' ? (
                            <label className="space-y-1">
                                <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Part-time Rate (Optional)</p>
                                <input type="number" className={inputCls} placeholder="0" value={formData.payroll_part_time_rate} onChange={(e) => setField('payroll_part_time_rate', e.target.value)} />
                            </label>
                        ) : null}
                        {formData.employment_type === 'Part-time' ? (
                            <label className="space-y-1">
                                <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">Rate Unit</p>
                                <select className={inputCls} value={formData.payroll_part_time_unit} onChange={(e) => setField('payroll_part_time_unit', e.target.value)}><option value="hour">Per Hour</option><option value="session">Per Session</option></select>
                            </label>
                        ) : null}
                    </div>
                    <div className="border border-black/5 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest">Allowances (Add Many)</span>
                            <button type="button" onClick={() => setField('payroll_other_allowances', [...formData.payroll_other_allowances, { label: '', amount: '' }])} className="text-[9px] font-black uppercase">Add</button>
                        </div>
                        {formData.payroll_other_allowances.map((item, idx) => (
                            <div key={`allow-${idx}`} className="grid grid-cols-5 gap-2">
                                <input className={`col-span-3 ${inputCls}`} placeholder="Allowance Label (e.g. Night Shift)" value={item.label} onChange={(e) => updateListItem('payroll_other_allowances', idx, 'label', e.target.value)} />
                                <input type="number" className={inputCls} placeholder="Amount (optional)" value={item.amount} onChange={(e) => updateListItem('payroll_other_allowances', idx, 'amount', e.target.value)} />
                                <button type="button" onClick={() => setField('payroll_other_allowances', formData.payroll_other_allowances.filter((_, i) => i !== idx))} className="text-red-500"><X size={14} /></button>
                            </div>
                        ))}
                    </div>
                    <div className="border border-black/5 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest">Other Deductions (Optional)</span>
                            <button type="button" onClick={() => setField('payroll_other_deductions', [...formData.payroll_other_deductions, { label: '', amount: '' }])} className="text-[9px] font-black uppercase">Add</button>
                        </div>
                        {formData.payroll_other_deductions.map((item, idx) => (
                            <div key={`ded-${idx}`} className="grid grid-cols-5 gap-2">
                                <input className={`col-span-3 ${inputCls}`} placeholder="Deduction Label" value={item.label} onChange={(e) => updateListItem('payroll_other_deductions', idx, 'label', e.target.value)} />
                                <input type="number" className={inputCls} placeholder="Amount (optional)" value={item.amount} onChange={(e) => updateListItem('payroll_other_deductions', idx, 'amount', e.target.value)} />
                                <button type="button" onClick={() => setField('payroll_other_deductions', formData.payroll_other_deductions.filter((_, i) => i !== idx))} className="text-red-500"><X size={14} /></button>
                            </div>
                        ))}
                    </div>
                    <div className="border border-black/5 rounded-xl p-3 space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase"><input type="checkbox" checked={formData.allow_advance} onChange={(e) => setField('allow_advance', e.target.checked)} /> Allow Advance / Loan</label>
                        {formData.allow_advance && (
                            <div className="grid grid-cols-3 gap-3">
                                <input type="number" className={inputCls} placeholder="Max Advance Limit" value={formData.max_advance_limit} onChange={(e) => setField('max_advance_limit', e.target.value)} />
                                <select className={inputCls} value={formData.advance_deduction_type} onChange={(e) => setField('advance_deduction_type', e.target.value)}><option value="percent">Percent</option><option value="fixed">Fixed</option></select>
                                <input type="number" className={inputCls} placeholder="Deduction Value" value={formData.advance_deduction_value} onChange={(e) => setField('advance_deduction_value', e.target.value)} />
                            </div>
                        )}
                    </div>
                    <div className="border border-[#1E3A5F]/20 bg-[#1E3A5F]/5 rounded-xl p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#1E3A5F] mb-2">Auto Payroll Calculation</p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[9px] font-black uppercase tracking-wider">
                            <div className="bg-white rounded-lg border border-black/5 p-2">
                                <p className="text-re-text-muted text-[8px]">Gross</p>
                                <p>{formatRwf(grossSalary)} RWF</p>
                            </div>
                            <div className="bg-white rounded-lg border border-black/5 p-2">
                                <p className="text-re-text-muted text-[8px]">Tax</p>
                                <p>{taxPercentValue > 0 ? `${taxPercentValue}%` : 'Not set'}</p>
                            </div>
                            <div className="bg-white rounded-lg border border-black/5 p-2">
                                <p className="text-re-text-muted text-[8px]">Tax Amount</p>
                                <p>{formatRwf(taxAmount)} RWF</p>
                            </div>
                            <div className="bg-white rounded-lg border border-black/5 p-2">
                                <p className="text-re-text-muted text-[8px]">Deductions</p>
                                <p>{formatRwf(totalDeductions)} RWF</p>
                            </div>
                            <div className="bg-white rounded-lg border border-black/5 p-2">
                                <p className="text-re-text-muted text-[8px]">Net Salary</p>
                                <p>{formatRwf(netSalary)} RWF</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        if (step === 4) {
            return (
                <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase"><input type="checkbox" checked={formData.account_enabled} onChange={(e) => setField('account_enabled', e.target.checked)} /> Create Login Account</label>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <input className={inputClsWithError('username')} placeholder="Username" value={formData.username} onChange={(e) => setField('username', e.target.value)} />
                            {fieldErrors.username && <p className="text-[9px] font-bold text-red-600">{fieldErrors.username}</p>}
                        </div>
                        {!isEditMode && <input type="password" className={inputCls} placeholder="Password" value={formData.password} onChange={(e) => setField('password', e.target.value)} />}
                        {!isEditMode && <input type="password" className={inputCls} placeholder="Confirm Password" value={formData.confirm_password} onChange={(e) => setField('confirm_password', e.target.value)} />}
                        <input className={inputCls} placeholder="RFID UID (Optional)" value={formData.rfid_uid} onChange={(e) => setField('rfid_uid', e.target.value)} />
                        <input className={inputCls} placeholder="Fingerprint ID (Optional)" value={formData.fingerprint_id} onChange={(e) => setField('fingerprint_id', e.target.value)} />
                    </div>
                    <textarea className="w-full min-h-[70px] bg-re-bg/80 border border-black/5 rounded-xl p-3 text-[10px] font-black outline-none" placeholder="Identity remarks" value={formData.identity_remarks} onChange={(e) => setField('identity_remarks', e.target.value)} />
                </div>
            );
        }
        return (
            <div className="space-y-2 text-[10px] font-bold uppercase">
                <p><span className="text-re-text-muted">Personal:</span> {formData.full_name} | {formData.email}</p>
                <p><span className="text-re-text-muted">Employment:</span> {formData.staff_id} | {formData.employment_type} | {formData.job_title}</p>
                <p><span className="text-re-text-muted">Role:</span> {formData.department} / {formData.role_code}</p>
                <p><span className="text-re-text-muted">Payroll:</span> {formData.payroll_payment_frequency} / {formData.payroll_payment_method}</p>
                <p><span className="text-re-text-muted">Account:</span> {formData.account_enabled ? `Enabled (${formData.username || 'auto'})` : 'Disabled'}</p>
            </div>
        );
    };

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-[#0a192f]/70 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
            <div className="relative bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10 flex flex-col max-h-[92vh]">
                <div className="px-6 py-3 flex items-center justify-between shadow-md shrink-0" style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}>
                    <div className="flex items-center gap-2">
                        <UserPlus size={14} className="text-re-gold" />
                        <h3 className="text-[10px] font-black text-white uppercase tracking-widest">{isEditMode ? 'Edit Staff' : 'Add New Staff'} - HR Central</h3>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-re-gold"><X size={14} /></button>
                </div>
                <div className="px-5 py-3 bg-re-bg/30 border-b border-black/5 grid grid-cols-2 md:grid-cols-6 gap-2">
                    {HIRE_STEPS.map((label, i) => (
                        <button key={label} type="button" onClick={() => setStep(i)} className={`h-8 rounded-lg text-[8px] font-black uppercase tracking-widest border ${i === step ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : i < step ? 'bg-[#1E3A5F]/10 text-[#1E3A5F] border-[#1E3A5F]/30' : 'bg-white text-re-text-muted border-black/10'}`}>
                            {label}
                        </button>
                    ))}
                </div>
                <form id="hr-staff-stepper-form" onSubmit={onSubmit} className="p-5 space-y-4 overflow-y-auto">
                    {error && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">Action failed</p>
                            <p className="text-[11px] font-bold text-rose-800 mt-0.5">{error}</p>
                        </div>
                    )}
                    {section()}
                </form>
                <div className="px-5 py-3 bg-white border-t border-black/5 flex items-center justify-between">
                    <button type="button" onClick={step === 0 ? onClose : () => setStep((s) => Math.max(0, s - 1))} className="h-9 px-4 rounded-lg border border-black/10 text-[9px] font-black uppercase tracking-widest text-[#1E3A5F]">Back</button>
                    {step < HIRE_STEPS.length - 1 ? (
                        <button type="button" onClick={onNext} className="h-9 px-5 rounded-lg bg-re-grad-navy text-white font-black text-[9px] uppercase tracking-widest flex items-center gap-1">Next <ChevronRight size={12} /></button>
                    ) : (
                        <button type="submit" form="hr-staff-stepper-form" disabled={isSubmitting} className="h-9 px-5 rounded-lg bg-re-gold text-[#1E3A5F] font-black text-[9px] uppercase tracking-widest flex items-center gap-1 disabled:opacity-60">
                            {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} {isSubmitting ? 'Saving...' : 'Review & Save'}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

const HRCentral = () => {
    const { manager } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [showDeptFilter, setShowDeptFilter] = useState(false);
    const [selectedDept, setSelectedDept] = useState('All Departments');
    const [showAllDeptsModal, setShowAllDeptsModal] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [showHireModal, setShowHireModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [notifications, setNotifications] = useState([]);

    const notify = (type, message) => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setNotifications((prev) => [...prev, { id, type, message }]);
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 4200);
    };

    const openEditModal = (staffMember) => {
        setEditingStaff(staffMember);
        setShowHireModal(true);
        setOpenDropdownId(null);
    };

    const closeHireModal = () => {
        setShowHireModal(false);
        setEditingStaff(null);
    };

    const [staff, setStaff] = useState([]);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const departments = ['Academic Staff', 'Administration', 'Leadership', 'Support Staff'];

    const handleResendInvite = async (staffId) => {
        if (!window.confirm("This will reset the staff password and send a new invitation email. Proceed?")) return;
        setIsActionLoading(true);
        try {
            await staffService.resendInvitation(staffId);
            notify('success', 'Invitation resent successfully.');
        } catch (error) {
            notify('error', error.response?.data?.message || 'Failed to resend invitation.');
        } finally {
            setIsActionLoading(false);
            setOpenDropdownId(null);
        }
    };

    const handleDeleteStaff = async (staffId, name) => {
        if (!window.confirm(`Delete ${name}? This will deactivate and remove the account from active records.`)) return;
        setIsActionLoading(true);
        try {
            await staffService.deleteStaff(staffId);
            notify('success', 'Staff account deleted.');
            await fetchStaff();
        } catch (error) {
            notify('error', error.response?.data?.message || 'Failed to delete staff.');
        } finally {
            setIsActionLoading(false);
            setOpenDropdownId(null);
        }
    };

    const handleToggleActive = async (staffId, isCurrentlyActive) => {
        setIsActionLoading(true);
        try {
            await staffService.setStaffActive(staffId, !isCurrentlyActive);
            notify('success', `Staff account ${isCurrentlyActive ? 'deactivated' : 'activated'} successfully.`);
            await fetchStaff();
        } catch (error) {
            notify('error', error.response?.data?.message || 'Failed to update staff status.');
        } finally {
            setIsActionLoading(false);
            setOpenDropdownId(null);
        }
    };

    const [stats, setStats] = useState({
        totalStaff: '0',
        activePercent: '100%',
        presentCount: 0,
        absentCount: 0,
        avgEvaluation: '85%',
        retentionRate: '98%'
    });
    const [loading, setLoading] = useState(true);

    const fetchStaff = async () => {
        if (!manager?.school_id) return;
        setLoading(true);
        try {
            const res = await staffService.getStaff();
            if (res.success) {
                const mapped = (res.data || []).map(s => {
                    // Semi-deterministic variation for evaluation and attendance for a "live" feel
                    const seed = (s.id || 0) % 15;
                    const evalScore = 80 + seed;
                    const attenScore = 90 + (seed % 10);

                    return {
                        _raw: s,
                        id: s.user_uid || s.id,
                        real_id: s.id,
                        name: s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
                        role: s.role_name || s.role_code,
                        role_code: s.role_code || '',
                        department: s.department || (s.role_code === 'TEACHER' ? 'Academic Staff' :
                            ['HOD', 'DOS'].includes(s.role_code) ? 'Leadership' :
                                ['ACCOUNTANT'].includes(s.role_code) ? 'Administration' : 'Support Staff'),
                        phone: s.phone || 'N/A',
                        email: s.email,
                        photo: s.photo,
                        location: s.sector ? `${s.sector}, ${s.district}` : (s.district || 'N/A'),
                        status: s.is_active ? 'Expected' : 'Inactive',
                        evaluation: evalScore,
                        attendance: attenScore,
                        joinedDate: s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
                        staffId: s.staff_id || null,
                        gender: s.gender || null,
                        date_of_birth: s.date_of_birth || '',
                        dateOfBirth: s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('en-GB') : null,
                        nationalId: s.national_id || s.passport_number || null,
                        passportNumber: s.passport_number || null,
                        address: s.address || null,
                        employmentType: s.employment_type || null,
                        jobTitle: s.job_title || null,
                        date_of_employment: s.date_of_employment || '',
                        dateOfEmployment: s.date_of_employment ? new Date(s.date_of_employment).toLocaleDateString('en-GB') : null,
                        contract_start_date: s.contract_start_date || '',
                        contractStartDate: s.contract_start_date ? new Date(s.contract_start_date).toLocaleDateString('en-GB') : null,
                        contract_end_date: s.contract_end_date || '',
                        contractEndDate: s.contract_end_date ? new Date(s.contract_end_date).toLocaleDateString('en-GB') : null,
                        fullContract: s.employment_type === 'Contract' && !s.contract_end_date,
                        employmentStatus: s.employment_status || null,
                        subDepartment: s.sub_department || null,
                        payrollBasicSalary: s.payroll_basic_salary,
                        payrollTransportAllowance: s.payroll_transport_allowance,
                        payrollHousingAllowance: s.payroll_housing_allowance,
                        payrollMealAllowance: s.payroll_meal_allowance,
                        payrollOtherAllowances: s.payroll_other_allowances,
                        payrollTaxPercent: s.payroll_tax_percent,
                        payrollPensionAmount: s.payroll_pension_amount,
                        payrollOtherDeductions: s.payroll_other_deductions,
                        payrollPartTimeRate: s.payroll_part_time_rate,
                        payrollPartTimeUnit: s.payroll_part_time_unit,
                        payrollPaymentFrequency: s.payroll_payment_frequency || null,
                        payrollPaymentMethod: s.payroll_payment_method || null,
                        payrollBankName: s.payroll_bank_name || null,
                        payrollAccountNumber: s.payroll_account_number || null,
                        payrollMobileMoneyPhone: s.payroll_mobile_money_phone || null,
                        allowAdvance: !!s.allow_advance,
                        maxAdvanceLimit: s.max_advance_limit,
                        advanceDeductionType: s.advance_deduction_type || null,
                        advanceDeductionValue: s.advance_deduction_value,
                        accountEnabled: s.account_enabled !== 0,
                        username: s.staff_login_username || s.username || null,
                        rfid_uid: s.rfid_uid,
                        fingerprint_id: s.fingerprint_id,
                        identity_remarks: s.identity_remarks
                    };
                });
                setStaff(mapped);

                // Calculate real stats
                const total = mapped.length;
                const active = mapped.filter(s => s.status === 'Expected').length;
                const activePct = total > 0 ? Math.round((active / total) * 100) : 0;

                // Calculate Average Evaluation (Scale 1-10)
                const avgEval = mapped.length > 0
                    ? (mapped.reduce((acc, curr) => acc + curr.evaluation, 0) / (mapped.length * 10)).toFixed(1)
                    : '0.0';

                // Calculate Retention Rate (Mocked logic but based on active/total)
                const retention = total > 0 ? (95 + (activePct / 20)).toFixed(1) : '0.0';

                setStats({
                    totalStaff: total.toString(),
                    activePercent: `${activePct}%`,
                    presentCount: active,
                    absentCount: total - active,
                    avgEvaluation: avgEval,
                    retentionRate: `${retention}%`
                });
            }
        } catch (err) {
            console.error("Failed to fetch staff:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, [manager]);

    const handleHire = async (payload, photoFile) => {
        try {
            const res = await staffService.createStaff(payload);
            if (res.success) {
                const createdId = res?.data?.id;
                if (createdId && photoFile) {
                    const photoData = new FormData();
                    photoData.append('photo', photoFile);
                    await staffService.updateStaffPhoto(createdId, photoData);
                }
                notify('success', 'Personnel account created successfully.');
                fetchStaff();
                return { ok: true };
            }
            notify('error', res?.message || 'Hiring failed. Please check inputs.');
            return { ok: false, field: res?.field, message: res?.message };
        } catch (err) {
            console.error("Failed to hire staff:", err);
            const field = err?.response?.data?.field;
            const message = err?.response?.data?.message || 'Hiring failed. Please check inputs.';
            notify('error', message);
            return { ok: false, field, message };
        }
    };

    const handleEditStaff = async (staffId, payload, photoFile) => {
        try {
            const res = await staffService.updateStaff(staffId, payload);
            if (!res.success) throw new Error(res.message || 'Update failed');

            if (photoFile) {
                const photoData = new FormData();
                photoData.append('photo', photoFile);
                await staffService.updateStaffPhoto(staffId, photoData);
            }

            notify('success', 'Staff profile updated successfully.');
            fetchStaff();
            return { ok: true };
        } catch (err) {
            console.error("Failed to update staff:", err);
            const field = err?.response?.data?.field;
            const message = err.response?.data?.message || err.message || 'Update failed. Please try again.';
            notify('error', message);
            return { ok: false, field, message };
        }
    };

    const filteredStaff = staff.filter(s =>
        (s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.role.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedDept === 'All Departments' || s.department === selectedDept)
    );

    const registryStatItems = useMemo(
        () => [
            {
                label: 'Total personnel',
                value: stats.totalStaff,
                trend: staff.length ? `${stats.presentCount} active · ${stats.absentCount} inactive` : '—',
                icon: Users,
                tone: 'navy',
            },
            {
                label: 'Active rate',
                value: stats.activePercent,
                trend: `Target retention ${stats.retentionRate}`,
                icon: Activity,
                tone: 'gold',
            },
            {
                label: 'Avg evaluation',
                value: stats.avgEvaluation,
                trend: 'Scale 1–10 cohort mean',
                icon: Award,
                tone: 'emerald',
            },
            {
                label: 'Retention',
                value: stats.retentionRate,
                trend: 'Rolling HR health signal',
                icon: TrendingUp,
                tone: 'violet',
            },
        ],
        [stats, staff.length]
    );

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-full">
            <div className="fixed top-5 right-5 z-[220] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-24px)]">
                {notifications.map((n) => (
                    <div
                        key={n.id}
                        className={`rounded-xl border shadow-xl px-4 py-3 animate-in slide-in-from-right-5 duration-300 ${n.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                            }`}
                    >
                        <p className="text-[10px] font-black uppercase tracking-widest">
                            {n.type === 'success' ? 'Success' : 'Action Failed'}
                        </p>
                        <p className="text-[11px] font-bold mt-0.5 tracking-tight">{n.message}</p>
                    </div>
                ))}
            </div>
            <StaffModal
                staff={selectedStaff}
                onClose={() => setSelectedStaff(null)}
                onEditProfile={(s) => {
                    setSelectedStaff(null);
                    openEditModal(s);
                }}
            />

            <HireModal
                isOpen={showHireModal}
                onClose={closeHireModal}
                onHire={handleHire}
                onEdit={handleEditStaff}
                editingStaff={editingStaff}
                existingStaff={staff}
            />

            {/* Mobile "More Departments" Modal */}
            {showAllDeptsModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowAllDeptsModal(false)} />
                    <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-re-text uppercase tracking-widest">Select Department</h3>
                                <p className="text-[10px] text-re-text-muted font-bold mt-0.5">Filter the staff overview</p>
                            </div>
                            <button onClick={() => setShowAllDeptsModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-re-bg text-re-text-muted hover:bg-black/10 transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-2">
                            {departments.map(dept => (
                                <button
                                    key={dept}
                                    onClick={() => {
                                        setSelectedDept(dept);
                                        setShowAllDeptsModal(false);
                                    }}
                                    className={`h-12 flex items-center gap-2 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${selectedDept === dept
                                        ? 'bg-re-navy/10 border-re-navy/30 text-re-navy ring-1 ring-re-navy/30'
                                        : 'bg-white border-black/5 text-re-text-muted hover:border-black/10'
                                        }`}
                                >
                                    {selectedDept === dept && <CheckCircle size={14} className="text-re-navy" />}
                                    {dept}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>, document.body
            )}

            <RegistryPageShell>
                <RegistryPageHeader
                    overline="Organizational resource"
                    title="HR Central"
                    subtitle={`Personnel, roles, and payroll context — aligned with the Students registry. ${manager?.school?.name ? `School: ${manager.school.name}.` : ''}`}
                    secondaryAction={(
                        <ExportSplitButton
                            open={exportOpen}
                            onOpen={setExportOpen}
                            onClose={() => setExportOpen(false)}
                        >
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                                onClick={() => setExportOpen(false)}
                            >
                                <FileText size={16} className="text-re-gold shrink-0" /> Export PDF
                            </button>
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                                onClick={() => setExportOpen(false)}
                            >
                                <FileSpreadsheet size={16} className="text-re-gold shrink-0" /> Export Excel
                            </button>
                        </ExportSplitButton>
                    )}
                    primaryAction={(
                        <button
                            type="button"
                            onClick={() => {
                                setEditingStaff(null);
                                setShowHireModal(true);
                            }}
                            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-re-gold px-5 py-2.5 text-[13px] font-bold text-[#0b1530] shadow-[0_4px_14px_rgba(254,191,16,0.35)] hover:bg-re-gold-light transition-all"
                        >
                            <UserPlus size={18} strokeWidth={2.5} /> Add staff
                        </button>
                    )}
                />

                <RegistryStatGrid items={registryStatItems} />

                <RegistryCard>
                    <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-6 bg-white">
                        <div className="relative w-full group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-re-navy transition-colors" size={18} />
                            <input
                                type="search"
                                placeholder="Search by name, ID, or role…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-re-gold/40 focus:bg-white focus:ring-2 focus:ring-re-gold/20"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingStaff(null);
                                    setShowHireModal(true);
                                }}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-re-gold/50 bg-re-gold/15 px-4 text-xs font-bold uppercase tracking-wide text-[#0b1530] hover:bg-re-gold/25"
                            >
                                <UserPlus size={15} />
                                Add staff
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowDeptFilter(!showDeptFilter)}
                                className="inline-flex h-11 flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                            >
                                <Filter size={15} className="text-re-gold" />
                                Department
                            </button>
                        </div>
                    </div>

                    {/* Conditional Dept Filter Section */}
                    {showDeptFilter && (
                        <div className="flex px-6 md:px-8 py-4 bg-re-bg/20 border-b border-black/5 items-center overflow-x-auto gap-2 custom-scrollbar animate-in slide-in-from-top-2 fade-in duration-300">

                            {/* All Depts Option */}
                            <button
                                onClick={() => setSelectedDept('All Departments')}
                                className={`flex items-center justify-center gap-1.5 shrink-0 h-7 sm:h-9 px-3 sm:px-5 rounded-lg sm:rounded-xl border font-black text-[7px] sm:text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${selectedDept === 'All Departments'
                                    ? 'text-white shadow-xl hover:scale-105'
                                    : 'bg-white border-black/5 text-re-text-muted hover:bg-re-bg hover:text-re-text'
                                    }`}
                                style={selectedDept === 'All Departments' ? { background: "#1E3A5F", borderColor: "#1E3A5F" } : {}}
                            >
                                {selectedDept === 'All Departments' && <CheckCircle size={10} className="sm:w-3 sm:h-3 opacity-80" />}
                                All Departments
                            </button>

                            {/* Individual Depts */}
                            {departments.map((dept, idx) => (
                                <button
                                    key={dept}
                                    onClick={() => setSelectedDept(dept)}
                                    className={`flex items-center justify-center gap-1.5 shrink-0 h-7 sm:h-9 px-3 sm:px-5 rounded-lg sm:rounded-xl border font-black text-[7px] sm:text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${idx > 1 ? 'hidden md:flex' : ''} ${selectedDept === dept
                                        ? 'text-white shadow-xl hover:scale-105'
                                        : 'bg-white border-black/5 text-re-text-muted hover:bg-re-bg hover:text-re-text'
                                        }`}
                                    style={selectedDept === dept ? { background: "#1E3A5F", borderColor: "#1E3A5F" } : {}}
                                >
                                    {selectedDept === dept && <CheckCircle size={10} className="sm:w-3 sm:h-3 opacity-80" />}
                                    {dept}
                                </button>
                            ))}

                            {/* More Trigger for Mobile */}
                            <button
                                onClick={() => setShowAllDeptsModal(true)}
                                className="md:hidden flex items-center justify-center gap-1.5 shrink-0 h-7 px-3 rounded-lg border border-black/5 bg-white font-black text-[7px] uppercase tracking-widest transition-all shadow-sm active:scale-95"
                                style={{ color: "#FEBF10" }}
                            >
                                <Plus size={10} /> More
                            </button>
                        </div>
                    )}


                    <div className="overflow-x-auto bg-white">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-re-bg/20 border-b border-black/5">
                                    <th className="px-4 sm:px-8 py-2.5 sm:py-3 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 last:border-r-0">Personnel Info</th>
                                    <th className="hidden md:table-cell px-8 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Designation</th>
                                    <th className="hidden md:table-cell px-8 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Reliability</th>
                                    <th className="hidden md:table-cell px-8 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Performance</th>
                                    <th className="px-4 sm:px-8 py-2.5 sm:py-3 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 text-right">Records</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center">
                                            <div className="w-8 h-8 border-4 border-re-navy border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "#1E3A5F #0000 0000 0000" }}></div>
                                            <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">Querying Personnel DB...</p>
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {filteredStaff.map((s, index) => {
                                            const isLastItems = index >= filteredStaff.length - 2 && filteredStaff.length > 2;
                                            return (
                                                <tr
                                                    key={s.id}
                                                    onClick={() => setSelectedStaff(s)}
                                                    className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group cursor-pointer"
                                                >
                                                    <td className="px-4 sm:px-8 py-2 sm:py-3 border-r border-black/5 last:border-r-0">
                                                        <div className="flex items-center gap-3 sm:gap-4">
                                                            <div className="w-8 h-8 rounded-full bg-re-bg border border-black/5 flex-shrink-0 flex items-center justify-center text-re-text-muted transition-colors relative shadow-inner overflow-hidden group-hover:bg-white">
                                                                {s.photo ? (
                                                                    <img
                                                                        src={(import.meta.env.VITE_API_URL || 'http://localhost:5100') + s.photo}
                                                                        className="w-full h-full object-cover"
                                                                        alt={s.name}
                                                                    />
                                                                ) : (
                                                                    <User size={12} className="sm:w-3.5 sm:h-3.5 opacity-40 text-re-text-muted" />
                                                                )}
                                                                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-black/5 rounded-full flex items-center justify-center">
                                                                    <div className={`w-1 h-1 sm:w-1.5 h-1.5 rounded-full ${s.status === 'Expected' ? 'bg-emerald-500' : 'bg-red-400'}`}></div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-black text-re-text tracking-tight uppercase leading-none mb-0.5 group-hover:text-[#1E3A5F] transition-colors">{s.name}</p>
                                                                <p className="text-[7px] sm:text-[8px] font-bold text-re-text-muted opacity-30 uppercase tracking-widest leading-none font-mono italic">{s.id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-8 py-5">
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className="text-[10px] font-black text-re-text uppercase tracking-tight truncate max-w-[150px]">{s.role}</p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[9px] font-bold text-re-text-muted opacity-50 uppercase tracking-widest">{s.department}</p>
                                                                {(s.rfid_uid || s.fingerprint_id) && (
                                                                    <div className="flex items-center gap-1 bg-black/5 px-1.5 py-0.5 rounded ml-1">
                                                                        {s.rfid_uid && <IdCard size={10} className="text-[#1E3A5F] opacity-70" title="RFID Card Assigned" />}
                                                                        {s.fingerprint_id && <Fingerprint size={10} className="text-emerald-500 opacity-70" title="Biometric Fingerprint Assigned" />}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-8 py-5">
                                                        <div className="space-y-1.5 max-w-[100px]">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[9px] font-black text-re-text">{s.attendance}% Present</p>
                                                            </div>
                                                            <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                                                                <div className="h-full" style={{ width: `${s.attendance}%`, background: s.attendance >= 95 ? "linear-gradient(135deg, #1E3A5F 0%, #3D5A80 100%)" : "#FEBF10" }}></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-8 py-5">
                                                        <div className={`inline-flex px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ring-1 ring-inset ${s.status === 'Exceptional' ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/20' :
                                                            s.status === 'Expected' ? 'bg-blue-50 text-blue-600 ring-blue-500/20' :
                                                                'bg-re-navy/5 text-re-navy ring-re-navy/20'
                                                            }`} style={s.status !== 'Exceptional' && s.status !== 'Expected' ? { color: "#1E3A5F" } : {}}>
                                                            {s.status} Score: {s.evaluation}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 sm:px-8 py-3 sm:py-5 text-right relative">
                                                        <div className="flex items-center gap-2 sm:gap-3 justify-end">
                                                            <button
                                                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-re-text-muted hover:bg-re-bg transition-all border border-transparent hover:border-black/5"
                                                                style={{ color: "inherit" }}
                                                                onClick={(e) => { e.stopPropagation(); }}
                                                            >
                                                                <Phone size={12} className="sm:w-3.5 sm:h-3.5" />
                                                            </button>
                                                            <div className="relative">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenDropdownId(openDropdownId === s.id ? null : s.id);
                                                                    }}
                                                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-re-text-muted hover:bg-re-bg transition-all border border-transparent hover:border-black/5"
                                                                >
                                                                    <MoreVertical size={12} className="sm:w-3.5 sm:h-3.5" />
                                                                </button>

                                                                {/* Dropdown Menu */}
                                                                {openDropdownId === s.id && (
                                                                    <>
                                                                        <div
                                                                            className="fixed inset-0 z-[40]"
                                                                            onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }}
                                                                        />
                                                                        <div
                                                                            className={`absolute right-0 ${isLastItems ? 'bottom-full mb-2 origin-bottom-right' : 'top-full mt-2 origin-top-right'} w-48 bg-white border border-black/5 shadow-2xl rounded-2xl z-[50] overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150`}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#1E3A5F] hover:bg-re-navy/5 transition-colors flex items-center gap-2.5"
                                                                                onClick={() => { setSelectedStaff(s); setOpenDropdownId(null); }}
                                                                            >
                                                                                <Eye size={13} /> View Full File
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center gap-2.5 border-t border-black/5"
                                                                                onClick={() => openEditModal(s)}
                                                                            >
                                                                                <Edit3 size={13} /> Edit Staff
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5"
                                                                                onClick={() => handleResendInvite(s.real_id || s.id)}
                                                                                disabled={isActionLoading}
                                                                            >
                                                                                {isActionLoading ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} className="text-[#FEBF10]" />}
                                                                                Resend Invitation
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-700 hover:bg-indigo-50 transition-colors flex items-center gap-2.5 border-t border-black/5"
                                                                                onClick={() => handleToggleActive(s.real_id || s.id, s.status !== 'Inactive')}
                                                                                disabled={isActionLoading}
                                                                            >
                                                                                {isActionLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                                                                                {s.status === 'Inactive' ? 'Activate Staff' : 'Deactivate Staff'}
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2.5 border-t border-black/5"
                                                                                onClick={() => handleDeleteStaff(s.real_id || s.id, s.name)}
                                                                                disabled={isActionLoading}
                                                                            >
                                                                                {isActionLoading ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                                                                                Delete Staff
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5"
                                                                                onClick={() => setOpenDropdownId(null)}
                                                                            >
                                                                                <FileSignature size={13} className="text-re-text-muted" /> Add Appraisal
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5"
                                                                                onClick={() => setOpenDropdownId(null)}
                                                                            >
                                                                                <Printer size={13} className="text-re-text-muted" /> Export Profile
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredStaff.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="p-12 text-center text-[10px] font-black text-re-text-muted uppercase tracking-widest italic opacity-40">No personnel records found matching your criteria.</td>
                                            </tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer */}
                    <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <p className="text-xs font-medium text-slate-500">
                            Showing <span className="font-semibold text-slate-800 tabular-nums">{filteredStaff.length}</span> personnel
                            {selectedDept !== 'All Departments' ? ` · ${selectedDept}` : ''}
                        </p>
                        <p className="text-[11px] font-medium text-slate-400">Tap a row to view the full HR file</p>
                    </div>
                </RegistryCard>
            </RegistryPageShell>
        </div>
    );
};

export default HRCentral;
