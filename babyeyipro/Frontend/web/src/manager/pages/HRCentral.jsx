import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Users, Search, Plus, MoreVertical, Briefcase,
    TrendingUp, Download, Mail, ChevronRight,
    UserCheck, Award, Filter, Activity, UserPlus, X, User,
    Phone, Clock, Home, Tag, Printer, Eye, CheckCircle, RefreshCw, Camera, ChevronLeft,
    FileText, FileSpreadsheet, ChevronDown, Building2, ShieldCheck, FileSignature, Loader2,
    Fingerprint, CreditCard, IdCard, Edit3, Wallet
} from 'lucide-react';
import staffService from '../services/staffService';
import api from '../services/api';
import { toDateInputValue } from '../../shared/dateInput';
import { useAuth } from '../context/AuthContext';
import { useAcademic } from '../context/AcademicContext';
import { buildHrStaffExportRows, exportHrStaffPdf, exportHrStaffExcel } from '../utils/hrStaffExport';

// ── Staff Detail Modal (Drawer Style) ──────────────────────────────────────
const StaffModal = ({ staff, onClose }) => {
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
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] animate-in fade-in duration-300"
                onClick={onClose}
            />
            <div className="fixed inset-y-0 right-0 z-[110] w-full md:w-[420px] bg-white flex flex-col animate-in slide-in-from-right duration-500 ease-out border-l border-black/10">
                <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-re-bg border border-black/5 flex items-center justify-center text-re-text font-semibold text-base relative overflow-hidden">
                            <span className="relative z-10" style={{ color: "#1E3A5F" }}>{staff.name?.charAt(0)}</span>
                            <div className="absolute inset-0 opacity-5" style={{ background: "#FEBF10" }}></div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-re-text text-sm leading-tight uppercase tracking-tight">{staff.name}</h3>
                            <p className="text-[8px] text-re-text-muted font-bold flex items-center gap-1 uppercase tracking-widest mt-0.5 opacity-40">
                                <span className="w-1 h-1 rounded-full" style={{ background: "#FEBF10" }}></span>
                                Staff ID: {staff.id}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-re-bg rounded-lg transition-all text-re-text-muted hover:text-[#1E3A5F] group">
                        <X size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${staff.status === 'Exceptional' ? 'bg-emerald-50 border-emerald-100/50' : 'bg-re-navy/5 border-re-navy/10'}`}>
                        <div className={`p-1.5 rounded-lg ${staff.status === 'Exceptional' ? 'bg-emerald-500' : 'bg-[#1E3A5F]'} text-white`}>
                            <ShieldCheck size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-re-text uppercase tracking-widest">{staff.status || 'Standard'} Personnel Rating</p>
                            <p className="text-[9px] text-re-text/40 font-bold uppercase tracking-tight leading-none mt-0.5">Performance aligned with Core Values</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 relative overflow-hidden group">
                            <p className="text-[8px] text-re-text-muted uppercase tracking-[0.2em] font-semibold mb-1 opacity-60">Performance score</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-semibold text-re-text tracking-tighter">{staff.performanceOutOf100 != null ? staff.performanceOutOf100 : '—'}</span>
                                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#FEBF10" }}>/100</span>
                            </div>
                        </div>
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 relative overflow-hidden group text-right">
                            <p className="text-[8px] text-re-text-muted uppercase tracking-[0.2em] font-semibold mb-1 opacity-60">Gate reliability</p>
                            <div className="flex items-baseline gap-1 justify-end">
                                <span className="text-2xl font-semibold text-re-text tracking-tighter">{staff.reliabilityPct != null ? staff.reliabilityPct : '—'}</span>
                                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#FEBF10" }}>%</span>
                            </div>
                        </div>
                    </div>
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
                                    <span className="text-[9px] font-semibold text-re-text-muted uppercase tracking-[0.3em] opacity-40">{group.section}</span>
                                    <div className="flex-1 h-px bg-black/5" />
                                </div>
                                {group.rows.map((item, i) => (
                                    <div key={`${group.section}-${i}`} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2">
                                            <item.icon size={11} className="opacity-30" style={{ color: "#FEBF10" }} />
                                            <span className="text-[10px] font-semibold text-re-text-muted uppercase tracking-widest">{item.label}</span>
                                        </div>
                                        <div className="flex-1 mx-3 border-b border-dashed border-black/10 group-hover:border-[#FEBF10]/30 transition-colors" />
                                        <span className="text-[10px] font-semibold text-re-text uppercase tracking-tight text-right truncate max-w-[170px]" title={String(item.value || 'N/A')}>{item.value || 'N/A'}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                        <div className="rounded-2xl border border-[#1E3A5F]/15 bg-[#1E3A5F]/5 p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[9px] font-semibold text-[#1E3A5F] uppercase tracking-[0.25em]">Payroll Summary</span>
                                <div className="flex-1 h-px bg-[#1E3A5F]/15" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white rounded-xl border border-black/5 p-2">
                                    <p className="text-[8px] font-semibold uppercase tracking-widest text-re-text-muted">Gross</p>
                                    <p className="text-[10px] font-semibold text-re-text">{formatRwf(gross)}</p>
                                </div>
                                <div className="bg-white rounded-xl border border-black/5 p-2">
                                    <p className="text-[8px] font-semibold uppercase tracking-widest text-re-text-muted">Tax</p>
                                    <p className="text-[10px] font-semibold text-re-text">{taxPercent > 0 ? `${taxPercent}% (${formatRwf(taxAmount)})` : 'Not set'}</p>
                                </div>
                                <div className="bg-white rounded-xl border border-black/5 p-2">
                                    <p className="text-[8px] font-semibold uppercase tracking-widest text-re-text-muted">Net</p>
                                    <p className="text-[10px] font-semibold text-re-text">{formatRwf(net)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        
                        
                    </div>
                </div>
               
            </div>
        </>,
        document.body
    );
};

// ── Shule Avance policy modal ───────────────────────────────────────────────
const ShuleAvancePolicyModal = ({ isOpen, onClose, advanceMaxPercent, setAdvanceMaxPercent, policySaving, onSave, enabledCount, totalCount }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <button type="button" className="fixed inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
            <div
                className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-black/10 overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
                role="dialog"
                aria-labelledby="avance-policy-title"
            >
                <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#1E3A5F] text-[#FEBF10] flex items-center justify-center shrink-0">
                            <Wallet size={18} />
                        </div>
                        <div className="min-w-0">
                            <h3 id="avance-policy-title" className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wide truncate">
                                Avance rate
                            </h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">Shule Avance monthly cap</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl border border-black/5 text-slate-500 hover:bg-slate-50 shrink-0">
                        <X size={16} />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <p className="text-[12px] text-slate-600 leading-relaxed">
                        Set the maximum advance each staff member may request per month, as a percentage of net salary.
                        Enable access per person when hiring or from the staff row menu.
                    </p>
                    <p className="text-[11px] font-semibold text-[#1E3A5F]/80">
                        {enabledCount} of {totalCount} staff with Shule Avance enabled
                    </p>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                            Max % per month
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={100}
                            value={advanceMaxPercent}
                            onChange={(e) => setAdvanceMaxPercent(e.target.value)}
                            className="w-full h-11 px-4 rounded-xl border border-slate-200 text-base font-bold text-[#1E3A5F] bg-white outline-none focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/10"
                        />
                    </div>
                </div>
                <div className="px-5 py-4 border-t border-black/5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-11 px-5 rounded-xl border border-black/10 text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={policySaving}
                        onClick={onSave}
                        className="h-11 px-6 rounded-xl text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
                    >
                        {policySaving ? 'Saving…' : 'Save policy'}
                    </button>
                </div>
            </div>
        </div>,
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

const HIRE_STEP_SHORT = ['Personal', 'Employment', 'Department', 'Payroll', 'Account', 'Review'];

const getRoleAbbr = (roleCode) => {
    const role = (roleCode || '').toUpperCase();
    if (role.includes('MANAGER')) return 'SM';
    if (role.includes('DIRECTOR')) return 'SD';
    if (role.includes('ACCOUNTANT')) return 'AC';
    if (role.includes('TEACHER')) return 'TR';
    return 'SS';
};

const getNextStaffCode = (roleCode, existingStaff = [], currentStaffId = null) => {
    const prefix = getRoleAbbr(roleCode);
    let maxCodeNumber = 0;
    (existingStaff || []).forEach((s) => {
        if (currentStaffId && String(s?.id) === String(currentStaffId)) return;
        if (currentStaffId && String(s?.real_id) === String(currentStaffId)) return;
        const rawCode = String(s?.staff_id || s?.staffId || s?._raw?.staff_id || '').trim().toUpperCase();
        const match = rawCode.match(/^([A-Z]{2})-(\d+)$/);
        if (match && match[1] === prefix) {
            const n = Number(match[2]);
            if (Number.isFinite(n)) maxCodeNumber = Math.max(maxCodeNumber, n);
        }
    });
    return `${prefix}-${String(maxCodeNumber + 1).padStart(3, '0')}`;
};

const KNOWN_ROLE_CODES = new Set([
    'TEACHER', 'ACCOUNTANT', 'HR', 'DOS', 'STORE_MANAGER', 'UNIFORM_MANAGER',
    'ASSETS_MANAGER', 'LIBRARIAN', 'DISCIPLINE', 'SECRETARY', 'HOD', 'SCHOOL_MANAGER', 'SCHOOL_DIRECTOR',
]);

// ── Clean Field Component ──────────────────────────────────────────────────
const Field = ({ label, required, error, hint, children, className = '', fullWidth = false }) => (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? 'col-span-1 sm:col-span-2' : ''} ${className}`}>
        <label className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="text-[12px] sm:text-[11px] font-semibold text-slate-700 sm:text-slate-600 sm:uppercase sm:tracking-wider leading-snug">
                {label}
            </span>
            {required && <span className="text-[#c87800] text-sm leading-none font-bold">*</span>}
            {hint && <span className="text-[11px] sm:text-[10px] text-slate-400 font-medium">{hint}</span>}
        </label>
        {children}
        {error && (
            <p className="text-[11px] sm:text-[10px] font-semibold text-red-600 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
            </p>
        )}
    </div>
);

// ── Section Divider ────────────────────────────────────────────────────────
const SectionHeader = ({ title, icon: Icon, subtitle }) => (
    <div className="col-span-1 sm:col-span-2 pt-1 sm:pt-2 pb-1 space-y-1">
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
                {Icon && <Icon size={14} className="text-[#c87800] shrink-0" />}
                <span className="text-[11px] sm:text-[10px] font-bold text-[#1E3A5F] uppercase tracking-[0.15em] sm:tracking-[0.2em] truncate">{title}</span>
            </div>
            <div className="flex-1 h-px bg-slate-100" />
        </div>
        {subtitle ? (
            <p className="text-[12px] sm:text-[11px] text-slate-500 font-medium leading-snug">{subtitle}</p>
        ) : null}
    </div>
);

const HireModal = ({ isOpen, onClose, onHire, onEdit, editingStaff, existingStaff, advanceMaxPercent = 25 }) => {
    const isEditMode = !!editingStaff;
    const [step, setStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [photo, setPhoto] = useState(null);
    const [preview, setPreview] = useState(null);
    const [formData, setFormData] = useState({
        full_name: '', gender: '', date_of_birth: '', national_id: '',
        passport_number: '', phone: '', email: '', address: '',
        staff_id: '', employment_type: 'Full-time', job_title: '',
        date_of_employment: '', contract_start_date: '', contract_end_date: '',
        full_contract: false, employment_status: 'Active', department: 'Academics',
        sub_department: '', role_code: 'TEACHER', custom_role_name: '',
        payroll_basic_salary: '', payroll_transport_allowance: '',
        payroll_housing_allowance: '', payroll_meal_allowance: '',
        payroll_other_allowances: [{ label: '', amount: '' }],
        payroll_tax_percent: '', payroll_pension_amount: '',
        payroll_other_deductions: [{ label: '', amount: '' }],
        payroll_payment_frequency: 'Monthly', payroll_payment_method: 'Bank Transfer',
        payroll_bank_name: '', payroll_account_number: '', payroll_mobile_money_phone: '',
        payroll_part_time_rate: '', payroll_part_time_unit: 'hour',
        allow_advance: false, max_advance_limit: '', advance_deduction_type: 'percent',
        advance_deduction_value: '', account_enabled: true, username: '',
        password: '', confirm_password: '', rfid_uid: '', fingerprint_id: '', identity_remarks: ''
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
                } catch { return [{ label: '', amount: '' }]; }
            };
            const normalizedDepartment = editingStaff.department === 'Academic Staff' ? 'Academics' : editingStaff.department || 'Administration';
            const resolvedRoleCode = String(editingStaff.role_code || 'TEACHER').toUpperCase().replace(/\s+/g, '_');
            const isKnownRole = KNOWN_ROLE_CODES.has(resolvedRoleCode);
            const resolvedCustomRole = !isKnownRole ? String(editingStaff.role_name || editingStaff.role || editingStaff.jobTitle || resolvedRoleCode).replace(/_/g, ' ').trim() : '';
            setFormData({
                full_name: editingStaff.name || '', gender: editingStaff.gender || '',
                date_of_birth: toDateInputValue(editingStaff.date_of_birth), national_id: editingStaff.nationalId || '',
                passport_number: editingStaff.passportNumber || '',
                phone: editingStaff.phone !== 'N/A' ? editingStaff.phone : '',
                email: editingStaff.email || '', address: editingStaff.address || '',
                staff_id: String(editingStaff.staffId || editingStaff.id || ''),
                employment_type: editingStaff.employmentType || 'Full-time',
                job_title: editingStaff.jobTitle || editingStaff.role || '',
                date_of_employment: toDateInputValue(editingStaff.date_of_employment),
                contract_start_date: toDateInputValue(editingStaff.contract_start_date),
                contract_end_date: toDateInputValue(editingStaff.contract_end_date),
                full_contract: !!(editingStaff.employmentType === 'Contract' && !editingStaff.contract_end_date),
                employment_status: editingStaff.employmentStatus || (editingStaff.status === 'Inactive' ? 'Suspended' : 'Active'),
                department: normalizedDepartment, sub_department: editingStaff.subDepartment || '',
                role_code: isKnownRole ? resolvedRoleCode : 'CUSTOM', custom_role_name: resolvedCustomRole,
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
                allow_advance: !!editingStaff.allowAdvance, max_advance_limit: editingStaff.maxAdvanceLimit ?? '',
                advance_deduction_type: editingStaff.advanceDeductionType || 'percent',
                advance_deduction_value: editingStaff.advanceDeductionValue ?? '',
                account_enabled: editingStaff.accountEnabled !== false,
                username: editingStaff.username || (editingStaff.email || `${parts[0] || ''}.${parts[1] || ''}`).split('@')[0],
                password: '', confirm_password: '',
                rfid_uid: editingStaff.rfid_uid || '', fingerprint_id: editingStaff.fingerprint_id || '',
                identity_remarks: editingStaff.identity_remarks || ''
            });
            setPreview(editingStaff.photo ? (import.meta.env.VITE_API_URL || 'http://localhost:5100') + editingStaff.photo : null);
        } else {
            const defaultRole = 'TEACHER';
            const defaultStaffCode = getNextStaffCode(defaultRole, existingStaff);
            setFormData((prev) => ({
                ...prev, full_name: '', gender: '', date_of_birth: '', national_id: '',
                passport_number: '', phone: '', email: '', address: '',
                staff_id: defaultStaffCode, employment_type: 'Full-time', job_title: '',
                date_of_employment: '', contract_start_date: '', contract_end_date: '',
                full_contract: false, employment_status: 'Active', department: 'Academics',
                sub_department: '', role_code: defaultRole, custom_role_name: '',
                payroll_basic_salary: '', payroll_transport_allowance: '',
                payroll_housing_allowance: '', payroll_meal_allowance: '',
                payroll_other_allowances: [{ label: '', amount: '' }],
                payroll_tax_percent: '', payroll_pension_amount: '',
                payroll_other_deductions: [{ label: '', amount: '' }],
                payroll_payment_frequency: 'Monthly', payroll_payment_method: 'Bank Transfer',
                payroll_bank_name: '', payroll_account_number: '', payroll_mobile_money_phone: '',
                payroll_part_time_rate: '', payroll_part_time_unit: 'hour',
                allow_advance: false, max_advance_limit: '', advance_deduction_type: 'percent',
                advance_deduction_value: '', account_enabled: true, username: '',
                password: '', confirm_password: '', rfid_uid: '', fingerprint_id: '', identity_remarks: ''
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
            if (!formData.full_name || !formData.phone || !formData.gender) return 'Fill all required personal fields (name, gender, phone).';
            const emailTrim = String(formData.email || '').trim();
            if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) return 'Email format is invalid.';
            if (emailTrim && sameEmail) return 'Email already exists.';
            const nidTrim = String(formData.national_id || '').trim();
            if (nidTrim && sameNationalId) return 'National ID/Passport already exists.';
            if (!/^[+]?[\d\s-]{9,20}$/.test(formData.phone)) return 'Phone format is invalid.';
        }
        if (step === 1) {
            if (!formData.staff_id || !formData.job_title || !formData.date_of_employment) return 'Employment details are required.';
            const dupCode = (existingStaff || []).find((s) => {
                if (String(s?.real_id) === String(editingStaff?.real_id || editingStaff?.id)) return false;
                const c = String(s?.staff_id || s?.staffId || s?._raw?.staff_id || '').trim().toUpperCase();
                return c && c === String(formData.staff_id || '').trim().toUpperCase();
            });
            if (!isEditMode && dupCode) return 'This staff ID is already assigned. Change role or refresh the form.';
            if (formData.employment_type === 'Contract' && !formData.contract_start_date) return 'Contract start date is required.';
            if (formData.employment_type === 'Contract' && !formData.full_contract && !formData.contract_end_date) return 'Contract end date is required unless Full Contract is checked.';
        }
        if (step === 2 && (!formData.department || !formData.role_code)) return 'Department and role are required.';
        if (step === 2 && formData.role_code === 'CUSTOM' && !String(formData.custom_role_name || '').trim()) return 'Custom role name is required.';
        if (step === 4 && formData.account_enabled) {
            if (!formData.username) return 'Username is required when account is enabled.';
            const pwd = String(formData.password || '');
            const confirmPwd = String(formData.confirm_password || '');
            if (!isEditMode) {
                if (pwd.length < 8) return 'Password must be at least 8 characters.';
                if (pwd !== confirmPwd) return 'Passwords do not match.';
            } else if (pwd || confirmPwd) {
                if (pwd.length < 8) return 'New password must be at least 8 characters.';
                if (pwd !== confirmPwd) return 'New passwords do not match.';
            }
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
            first_name, last_name, full_name: formData.full_name,
            gender: formData.gender, date_of_birth: formData.date_of_birth || null,
            national_id: formData.national_id || null, passport_number: formData.passport_number || null,
            phone: formData.phone || null, email: String(formData.email || '').trim() || null, address: formData.address || null,
            staff_id: formData.staff_id || null, staff_code: formData.staff_id || null,
            employment_type: formData.employment_type, job_title: formData.job_title,
            date_of_employment: formData.date_of_employment || null,
            contract_start_date: formData.employment_type === 'Contract' ? formData.contract_start_date || null : null,
            contract_end_date: formData.employment_type === 'Contract' ? (formData.full_contract ? null : (formData.contract_end_date || null)) : null,
            employment_status: formData.employment_status, department: formData.department,
            sub_department: formData.sub_department || null,
            role_code: formData.role_code === 'CUSTOM' ? String(formData.custom_role_name || '').trim().toUpperCase().replace(/\s+/g, '_') : formData.role_code,
            role_name: formData.role_code === 'CUSTOM' ? String(formData.custom_role_name || '').trim() || null : null,
            payroll_basic_salary: toNumberOrNull(formData.payroll_basic_salary),
            payroll_transport_allowance: null, payroll_housing_allowance: null, payroll_meal_allowance: null,
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
            username: formData.username || (String(formData.email || '').trim() ? String(formData.email || '').trim().split('@')[0] : ''),
            rfid_uid: formData.rfid_uid || null, fingerprint_id: formData.fingerprint_id || null,
            identity_remarks: formData.identity_remarks || null
        };
        if (formData.account_enabled) {
            const pwd = String(formData.password || '').trim();
            if (!isEditMode) {
                payload.password = pwd;
            } else if (pwd) {
                payload.password = pwd;
            }
        }
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
        if (!isEditMode) {
            const roleKey = formData.role_code === 'CUSTOM' ? (formData.custom_role_name || 'CUSTOM') : formData.role_code;
            const nextStaffId = getNextStaffCode(roleKey, existingStaff);
            payload.staff_id = nextStaffId;
            payload.staff_code = nextStaffId;
        }
        const result = isEditMode ? await onEdit(editingStaff.real_id || editingStaff.id, payload, photo) : await onHire(payload, photo);
        setIsSubmitting(false);
        if (result?.ok) { onClose(); return; }
        setError(result?.message || 'Unable to save this staff record. Please review highlighted fields.');
        if (result?.field) {
            const backendToUiField = { email: 'email', phone: 'phone', username: 'username', national_id: 'national_id', staff_id: 'staff_id' };
            const uiField = backendToUiField[result.field] || null;
            if (uiField) {
                setFieldErrors((prev) => ({ ...prev, [uiField]: result.message || 'Invalid value' }));
                if (uiField === 'email' || uiField === 'phone' || uiField === 'national_id') setStep(0);
                if (uiField === 'username') setStep(4);
                if (uiField === 'staff_id') setStep(1);
            }
        }
    };

    // ── Shared input styles — touch-friendly on mobile ─────────────────────
    const formGrid = 'grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-5 gap-y-4';
    const inp = 'w-full min-h-[44px] sm:h-10 bg-white border border-slate-200 rounded-xl sm:rounded-lg px-3.5 sm:px-3 text-[16px] sm:text-[12px] font-medium text-slate-800 outline-none focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/10 transition-all placeholder:text-slate-400 placeholder:font-normal touch-manipulation';
    const inpErr = (field) => `${inp} ${fieldErrors[field] ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`;
    const sel = `${inp} cursor-pointer appearance-none pr-10 bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_14px_center] sm:bg-[right_12px_center]`;
    const inpDisabled = `${inp} bg-slate-50 text-slate-500 cursor-not-allowed border-slate-100`;
    const stepProgress = Math.round(((step + 1) / HIRE_STEPS.length) * 100);

    const parseAmount = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
    const formatRwf = (v) => new Intl.NumberFormat('en-RW').format(Math.max(0, Math.round(v || 0)));
    const basicSalaryValue = parseAmount(formData.payroll_basic_salary);
    const extraAllowancesValue = (formData.payroll_other_allowances || []).reduce((sum, row) => sum + parseAmount(row.amount), 0);
    const grossSalary = basicSalaryValue + extraAllowancesValue;
    const taxPercentValue = parseAmount(formData.payroll_tax_percent);
    const taxAmount = taxPercentValue > 0 ? (grossSalary * taxPercentValue) / 100 : 0;
    const otherDeductionsValue = (formData.payroll_other_deductions || []).reduce((sum, row) => sum + parseAmount(row.amount), 0);
    const totalDeductions = taxAmount + otherDeductionsValue;
    const netSalary = grossSalary - totalDeductions;

    const section = () => {
        if (step === 0) return (
            <div className={formGrid}>
                {/* Photo upload — full width */}
                <div className="col-span-1 sm:col-span-2 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="relative w-24 h-24 sm:w-20 sm:h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-white shrink-0 hover:border-[#c87800] transition-colors group">
                        {preview
                            ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
                            : <div className="flex flex-col items-center gap-1">
                                <Camera size={20} className="text-slate-300 group-hover:text-[#c87800] transition-colors" />
                                <span className="text-[9px] font-semibold text-slate-300 uppercase tracking-wider group-hover:text-[#c87800] transition-colors">Photo</span>
                              </div>
                        }
                        <input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    <div className="text-center sm:text-left">
                        <p className="text-[13px] font-semibold text-slate-700 mb-1">Profile photo</p>
                        <p className="text-[12px] text-slate-500 font-medium leading-relaxed">Tap to upload a clear passport-style photo. JPG or PNG, max 2MB.</p>
                    </div>
                </div>

                <SectionHeader title="Basic Information" icon={User} />

                <Field label="Full Name" required error={fieldErrors.full_name}>
                    <input className={inpErr('full_name')} placeholder="e.g. Juma Ally" value={formData.full_name} onChange={(e) => setField('full_name', e.target.value)} />
                </Field>

                <Field label="Gender" required>
                    <select className={sel} value={formData.gender} onChange={(e) => setField('gender', e.target.value)}>
                        <option value="">Select gender</option>
                        <option>Male</option>
                        <option>Female</option>
                    </select>
                </Field>

                <Field label="Date of Birth">
                    <input type="date" className={inp} value={toDateInputValue(formData.date_of_birth)} onChange={(e) => setField('date_of_birth', e.target.value)} />
                </Field>

                <Field label="National ID / Passport" hint="(optional)" error={fieldErrors.national_id}>
                    <input className={inpErr('national_id')} placeholder="ID or passport (optional)" value={formData.national_id} onChange={(e) => setField('national_id', e.target.value)} />
                </Field>

                <SectionHeader title="Contact Details" icon={Phone} />

                <Field label="Phone Number" required error={fieldErrors.phone}>
                    <input className={inpErr('phone')} placeholder="e.g. 07XXXXXXXX" value={formData.phone} onChange={(e) => setField('phone', e.target.value)} />
                </Field>

                <Field label="Email Address" hint="(optional)" error={fieldErrors.email}>
                    <input type="email" className={inpErr('email')} placeholder="e.g. name@gmail.com (optional)" value={formData.email} onChange={(e) => setField('email', e.target.value)} />
                </Field>

                <Field label="Residential Address" fullWidth>
                    <input className={inp} placeholder="e.g. Kigali, Gasabo, Kimironko" value={formData.address} onChange={(e) => setField('address', e.target.value)} />
                </Field>
            </div>
        );

        if (step === 1) return (
            <div className={formGrid}>
                <SectionHeader title="Role & Contract" icon={Briefcase} />

                <Field label="Staff ID / Code" hint="(Auto-generated)" error={fieldErrors.staff_id}>
                    <input className={inpDisabled} value={formData.staff_id} readOnly />
                </Field>

                <Field label="Employment Type" required>
                    <select className={sel} value={formData.employment_type} onChange={(e) => setField('employment_type', e.target.value)}>
                        <option>Full-time</option>
                        <option>Part-time</option>
                        <option>Contract</option>
                        <option>Temporary</option>
                    </select>
                </Field>

                <Field label="Job Title / Position" required>
                    <input className={inp} placeholder="e.g. Teacher, Accountant, DOS" value={formData.job_title} onChange={(e) => setField('job_title', e.target.value)} />
                </Field>

                <Field label="Date of Employment" required>
                    <input type="date" className={inp} value={toDateInputValue(formData.date_of_employment)} onChange={(e) => setField('date_of_employment', e.target.value)} />
                </Field>

                {formData.employment_type === 'Contract' && (
                    <Field label="Contract Start Date" required>
                        <input type="date" className={inp} value={toDateInputValue(formData.contract_start_date)} onChange={(e) => setField('contract_start_date', e.target.value)} />
                    </Field>
                )}

                {formData.employment_type === 'Contract' && (
                    <div className="col-span-2">
                        <label className="flex items-center gap-3 p-3 bg-[#1E3A5F]/5 border border-[#1E3A5F]/15 rounded-lg cursor-pointer hover:bg-[#1E3A5F]/10 transition-colors">
                            <input
                                type="checkbox"
                                checked={!!formData.full_contract}
                                onChange={(e) => {
                                    setField('full_contract', e.target.checked);
                                    if (e.target.checked) setField('contract_end_date', '');
                                }}
                                className="w-4 h-4 accent-[#1E3A5F]"
                            />
                            <div>
                                <p className="text-[12px] font-semibold text-[#1E3A5F]">Full Contract — No Fixed End Date</p>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Check this if the contract has no scheduled end date.</p>
                            </div>
                        </label>
                    </div>
                )}

                {formData.employment_type === 'Contract' && !formData.full_contract && (
                    <Field label="Contract End Date" required>
                        <input type="date" className={inp} value={toDateInputValue(formData.contract_end_date)} onChange={(e) => setField('contract_end_date', e.target.value)} />
                    </Field>
                )}

                <Field label="Employment Status" required>
                    <select className={sel} value={formData.employment_status} onChange={(e) => setField('employment_status', e.target.value)}>
                        <option>Active</option>
                        <option>On Leave</option>
                        <option>Suspended</option>
                    </select>
                </Field>
            </div>
        );

        if (step === 2) return (
            <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <SectionHeader title="Department Assignment" icon={Building2} />

                <Field label="Department" required>
                    <select className={sel} value={formData.department} onChange={(e) => setField('department', e.target.value)}>
                        <option>Academics</option>
                        <option>Administration</option>
                        <option>Finance</option>
                        <option>Discipline</option>
                        <option>HR</option>
                        <option>Library</option>
                        <option>Store</option>
                    </select>
                </Field>

                <Field label="Sub-department" hint="(Optional)">
                    <input className={inp} placeholder="e.g. Secondary Section, Accounts Unit" value={formData.sub_department} onChange={(e) => setField('sub_department', e.target.value)} />
                </Field>

                <SectionHeader title="Role Assignment" icon={ShieldCheck} />

                <Field label="Role / Permission Level" required>
                    <select className={sel} value={formData.role_code} onChange={(e) => {
                        const val = e.target.value;
                        setField('role_code', val);
                        if (val !== 'CUSTOM') setField('custom_role_name', '');
                        if (!isEditMode) setField('staff_id', getNextStaffCode(val, existingStaff));
                    }}>
                        <option value="TEACHER">Teacher</option>
                        <option value="ACCOUNTANT">Accountant</option>
                        <option value="HR">HR</option>
                        <option value="DOS">DOS</option>
                        <option value="STORE_MANAGER">Store Manager</option>
                        <option value="UNIFORM_MANAGER">Uniform Manager</option>
                        <option value="LIBRARIAN">Librarian</option>
                        <option value="DISCIPLINE">Head of Discipline</option>
                        <option value="GATE_KEEPER">Gate Keeper</option>
                        <option value="SECRETARY">Secretary</option>
                        <option value="HOD">Staff</option>
                        <option value="SCHOOL_MANAGER">School Manager</option>
                        <option value="SCHOOL_DIRECTOR">School Director</option>
                        <option value="CUSTOM">Custom Role…</option>
                    </select>
                </Field>

                {formData.role_code === 'CUSTOM' && (
                    <Field label="Custom Role Name" required fullWidth>
                        <input
                            className={inp}
                            placeholder="e.g. Welfare Officer, Lab Assistant"
                            value={formData.custom_role_name}
                            onChange={(e) => {
                                const roleName = e.target.value;
                                setField('custom_role_name', roleName);
                                if (!isEditMode) setField('staff_id', getNextStaffCode(roleName, existingStaff));
                            }}
                        />
                    </Field>
                )}
            </div>
        );

        if (step === 3) return (
            <div className="space-y-5">
                {/* Salary */}
                <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                    <SectionHeader title="Salary Structure" icon={CreditCard} subtitle="All fields on this step are optional — you can set payroll later." />

                    <Field label="Basic Salary" hint="(RWF, optional)">
                        <input type="number" className={inp} placeholder="Leave blank if not set yet" value={formData.payroll_basic_salary} onChange={(e) => setField('payroll_basic_salary', e.target.value)} />
                    </Field>

                    <Field label="Income Tax Rate" hint="(%, optional)">
                        <input type="number" className={inp} placeholder="e.g. 30" value={formData.payroll_tax_percent} onChange={(e) => setField('payroll_tax_percent', e.target.value)} />
                    </Field>

                    <Field label="Payment Frequency" hint="(optional)">
                        <select className={sel} value={formData.payroll_payment_frequency} onChange={(e) => setField('payroll_payment_frequency', e.target.value)}>
                            <option>Monthly</option>
                            <option>Weekly</option>
                        </select>
                    </Field>

                    <Field label="Payment Method" hint="(optional)">
                        <select className={sel} value={formData.payroll_payment_method} onChange={(e) => setField('payroll_payment_method', e.target.value)}>
                            <option>Bank Transfer</option>
                            <option>Mobile Money</option>
                        </select>
                    </Field>

                    {formData.payroll_payment_method === 'Bank Transfer' ? (
                        <>
                            <Field label="Bank Name">
                                <input className={inp} placeholder="e.g. BK, Equity, I&M" value={formData.payroll_bank_name} onChange={(e) => setField('payroll_bank_name', e.target.value)} />
                            </Field>
                            <Field label="Bank Account Number">
                                <input className={inp} placeholder="Account Number" value={formData.payroll_account_number} onChange={(e) => setField('payroll_account_number', e.target.value)} />
                            </Field>
                        </>
                    ) : (
                        <Field label="Mobile Money Phone">
                            <input className={inp} placeholder="250..." value={formData.payroll_mobile_money_phone} onChange={(e) => setField('payroll_mobile_money_phone', e.target.value)} />
                        </Field>
                    )}

                    {formData.employment_type === 'Part-time' && (
                        <>
                            <Field label="Part-time Rate" hint="(per unit)">
                                <input type="number" className={inp} placeholder="0" value={formData.payroll_part_time_rate} onChange={(e) => setField('payroll_part_time_rate', e.target.value)} />
                            </Field>
                            <Field label="Rate Unit">
                                <select className={sel} value={formData.payroll_part_time_unit} onChange={(e) => setField('payroll_part_time_unit', e.target.value)}>
                                    <option value="hour">Per Hour</option>
                                    <option value="session">Per Session</option>
                                </select>
                            </Field>
                        </>
                    )}
                </div>

                {/* Allowances */}
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={14} className="text-[#c87800] shrink-0" />
                            <span className="text-[12px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wider">Additional allowances</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setField('payroll_other_allowances', [...formData.payroll_other_allowances, { label: '', amount: '' }])}
                            className="flex items-center justify-center gap-1.5 px-4 h-10 sm:h-8 text-[11px] font-bold uppercase tracking-wider text-[#1E3A5F] bg-[#1E3A5F]/10 rounded-xl hover:bg-[#1E3A5F]/20 transition-colors touch-manipulation w-full sm:w-auto"
                        >
                            <Plus size={12} /> Add row
                        </button>
                    </div>
                    <div className="p-4 space-y-2.5">
                        {formData.payroll_other_allowances.length === 0 && (
                            <p className="text-[11px] text-slate-400 text-center py-2">No allowances added yet.</p>
                        )}
                        {formData.payroll_other_allowances.map((item, idx) => (
                            <div key={`allow-${idx}`} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_40px] gap-3 sm:gap-2 sm:items-end">
                                <Field label={idx === 0 ? 'Allowance label' : ''}>
                                    <input className={inp} placeholder="e.g. Night Shift, Overtime" value={item.label} onChange={(e) => updateListItem('payroll_other_allowances', idx, 'label', e.target.value)} />
                                </Field>
                                <Field label={idx === 0 ? 'Amount (RWF)' : ''}>
                                    <input type="number" className={inp} placeholder="0" value={item.amount} onChange={(e) => updateListItem('payroll_other_allowances', idx, 'amount', e.target.value)} />
                                </Field>
                                <button
                                    type="button"
                                    onClick={() => setField('payroll_other_allowances', formData.payroll_other_allowances.filter((_, i) => i !== idx))}
                                    className="h-11 sm:h-10 w-full sm:w-10 flex items-center justify-center gap-2 sm:gap-0 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 sm:border-0 transition-colors touch-manipulation"
                                >
                                    <X size={16} />
                                    <span className="text-[11px] font-semibold sm:hidden">Remove</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Deductions */}
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                            <FileText size={14} className="text-[#c87800] shrink-0" />
                            <span className="text-[12px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wider">Other deductions</span>
                            <span className="text-[11px] text-slate-400 font-medium">(optional)</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setField('payroll_other_deductions', [...formData.payroll_other_deductions, { label: '', amount: '' }])}
                            className="flex items-center justify-center gap-1.5 px-4 h-10 sm:h-8 text-[11px] font-bold uppercase tracking-wider text-[#1E3A5F] bg-[#1E3A5F]/10 rounded-xl hover:bg-[#1E3A5F]/20 transition-colors touch-manipulation w-full sm:w-auto"
                        >
                            <Plus size={12} /> Add row
                        </button>
                    </div>
                    <div className="p-4 space-y-2.5">
                        {formData.payroll_other_deductions.length === 0 && (
                            <p className="text-[11px] text-slate-400 text-center py-2">No deductions added yet.</p>
                        )}
                        {formData.payroll_other_deductions.map((item, idx) => (
                            <div key={`ded-${idx}`} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_40px] gap-3 sm:gap-2 sm:items-end">
                                <Field label={idx === 0 ? 'Deduction label' : ''}>
                                    <input className={inp} placeholder="e.g. Pension, Union Fee" value={item.label} onChange={(e) => updateListItem('payroll_other_deductions', idx, 'label', e.target.value)} />
                                </Field>
                                <Field label={idx === 0 ? 'Amount (RWF)' : ''}>
                                    <input type="number" className={inp} placeholder="0" value={item.amount} onChange={(e) => updateListItem('payroll_other_deductions', idx, 'amount', e.target.value)} />
                                </Field>
                                <button
                                    type="button"
                                    onClick={() => setField('payroll_other_deductions', formData.payroll_other_deductions.filter((_, i) => i !== idx))}
                                    className="h-11 sm:h-10 w-full sm:w-10 flex items-center justify-center gap-2 sm:gap-0 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 sm:border-0 transition-colors touch-manipulation"
                                >
                                    <X size={16} />
                                    <span className="text-[11px] font-semibold sm:hidden">Remove</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Advance */}
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.allow_advance}
                                onChange={(e) => setField('allow_advance', e.target.checked)}
                                className="w-4 h-4 accent-[#1E3A5F]"
                            />
                            <div>
                                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Allow Shule Avance</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                    Staff can request cashouts &amp; services (school cap: {advanceMaxPercent}% of net salary / month).
                                </p>
                            </div>
                        </label>
                    </div>
                    {formData.allow_advance && (
                        <div className="p-4 grid grid-cols-3 gap-4">
                            <Field label="Max Advance Limit" hint="(RWF)">
                                <input type="number" className={inp} placeholder="e.g. 50000" value={formData.max_advance_limit} onChange={(e) => setField('max_advance_limit', e.target.value)} />
                            </Field>
                            <Field label="Deduction Type">
                                <select className={sel} value={formData.advance_deduction_type} onChange={(e) => setField('advance_deduction_type', e.target.value)}>
                                    <option value="percent">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount</option>
                                </select>
                            </Field>
                            <Field label="Deduction Value">
                                <input type="number" className={inp} placeholder="0" value={formData.advance_deduction_value} onChange={(e) => setField('advance_deduction_value', e.target.value)} />
                            </Field>
                        </div>
                    )}
                </div>

                {/* Live Payroll Summary */}
                <div className="rounded-xl border border-[#1E3A5F]/15 bg-[#1E3A5F]/4 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#1E3A5F]/10 bg-[#1E3A5F]/5">
                        <p className="text-[11px] font-bold text-[#1E3A5F] uppercase tracking-wider">Live Payroll Calculation</p>
                    </div>
                    <div className="p-4 grid grid-cols-5 gap-3">
                        {[
                            { label: 'Basic', value: `${formatRwf(basicSalaryValue)} RWF` },
                            { label: 'Gross', value: `${formatRwf(grossSalary)} RWF` },
                            { label: 'Tax', value: taxPercentValue > 0 ? `${taxPercentValue}% (${formatRwf(taxAmount)} RWF)` : 'Not set' },
                            { label: 'Total Deductions', value: `${formatRwf(totalDeductions)} RWF` },
                            { label: 'Net Salary', value: `${formatRwf(netSalary)} RWF`, highlight: true },
                        ].map((item) => (
                            <div key={item.label} className={`rounded-lg border p-3 ${item.highlight ? 'bg-[#1E3A5F] border-[#1E3A5F]' : 'bg-white border-slate-100'}`}>
                                <p className={`text-[9px] font-semibold uppercase tracking-wider mb-1 ${item.highlight ? 'text-white/60' : 'text-slate-400'}`}>{item.label}</p>
                                <p className={`text-[11px] font-bold leading-tight ${item.highlight ? 'text-white' : 'text-slate-700'}`}>{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );

        if (step === 4) return (
            <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <SectionHeader title="Login Account" icon={UserCheck} />

                <div className="col-span-2">
                    <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-100/60 transition-colors">
                        <input
                            type="checkbox"
                            checked={formData.account_enabled}
                            onChange={(e) => setField('account_enabled', e.target.checked)}
                            className="w-4 h-4 accent-[#1E3A5F]"
                        />
                        <div>
                            <p className="text-[12px] font-semibold text-slate-700">
                                {isEditMode ? 'Login account enabled' : 'Create Login Account'}
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                {isEditMode
                                    ? 'Uncheck to disable sign-in for this staff member.'
                                    : 'This staff member will be able to log in to the system.'}
                            </p>
                        </div>
                    </label>
                </div>

                <Field label="Username" required={formData.account_enabled} error={fieldErrors.username}>
                    <input
                        className={`${inpErr('username')} ${!formData.account_enabled ? 'opacity-50' : ''}`}
                        placeholder="e.g. juma.ally"
                        value={formData.username}
                        onChange={(e) => setField('username', e.target.value)}
                        disabled={!formData.account_enabled}
                    />
                </Field>

                <Field
                    label={isEditMode ? 'New password' : 'Password'}
                    required={!isEditMode && formData.account_enabled}
                    hint={isEditMode ? '(optional — leave blank to keep current password)' : '(min. 8 characters)'}
                >
                    <input
                        type="password"
                        autoComplete={isEditMode ? 'new-password' : 'new-password'}
                        className={`${inp} ${!formData.account_enabled ? 'opacity-50' : ''}`}
                        placeholder={isEditMode ? 'Set a new password' : '••••••••'}
                        value={formData.password}
                        onChange={(e) => setField('password', e.target.value)}
                        disabled={!formData.account_enabled}
                    />
                </Field>

                <Field
                    label={isEditMode ? 'Confirm new password' : 'Confirm Password'}
                    required={!isEditMode && formData.account_enabled}
                >
                    <input
                        type="password"
                        autoComplete={isEditMode ? 'new-password' : 'new-password'}
                        className={`${inp} ${!formData.account_enabled ? 'opacity-50' : ''}`}
                        placeholder={isEditMode ? 'Repeat new password' : '••••••••'}
                        value={formData.confirm_password}
                        onChange={(e) => setField('confirm_password', e.target.value)}
                        disabled={!formData.account_enabled}
                    />
                </Field>

                
            </div>
        );

        // Step 5 — Review
        return (
            <div className="space-y-3">
                <p className="text-[11px] text-slate-500 font-medium">Review all information before saving. Click any step tab above to go back and make changes.</p>
                {[
                    { label: 'Personal', value: `${formData.full_name} · ${formData.email} · ${formData.gender}` },
                    { label: 'Employment', value: `${formData.staff_id} · ${formData.employment_type} · ${formData.job_title}` },
                    { label: 'Role', value: `${formData.department} / ${formData.role_code === 'CUSTOM' ? formData.custom_role_name : formData.role_code}` },
                    { label: 'Payroll', value: `Basic: ${formatRwf(basicSalaryValue)} RWF · Net: ${formatRwf(netSalary)} RWF · ${formData.payroll_payment_method}` },
                    {
                        label: 'Account',
                        value: (() => {
                            if (!formData.account_enabled) return 'No login account';
                            const base = `Enabled · Username: ${formData.username || 'auto-assigned'}`;
                            if (isEditMode && String(formData.password || '').trim()) {
                                return `${base} · New password set`;
                            }
                            return base;
                        })(),
                    },
                ].map((row) => (
                    <div key={row.label} className="flex gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24 shrink-0 pt-0.5">{row.label}</span>
                        <span className="text-[12px] font-semibold text-slate-700">{row.value}</span>
                    </div>
                ))}
            </div>
        );
    };

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <button type="button" className="fixed inset-0 bg-[#0a192f]/60" aria-label="Close" onClick={onClose} />
            <div
                className="relative bg-white w-full sm:max-w-3xl rounded-t-[1.25rem] sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 flex flex-col max-h-[100dvh] sm:max-h-[92vh] border border-slate-200"
                role="dialog"
                aria-modal="true"
                aria-labelledby="hire-modal-title"
            >
                {/* Header */}
                <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 shrink-0 border-b border-white/10" style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                <UserPlus size={18} className="text-[#FEBF10]" />
                            </div>
                            <div className="min-w-0">
                                <h3 id="hire-modal-title" className="text-[15px] sm:text-[13px] font-bold text-white tracking-tight leading-tight">
                                    {isEditMode ? 'Edit staff profile' : 'Add new staff member'}
                                </h3>
                                <p className="text-[11px] text-white/55 font-medium mt-1 truncate">
                                    {HIRE_STEPS[step]}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all shrink-0 touch-manipulation"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Mobile progress */}
                    <div className="mt-4 sm:hidden">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/70 mb-2">
                            <span>Step {step + 1} of {HIRE_STEPS.length}</span>
                            <span>{stepProgress}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                            <div className="h-full rounded-full bg-[#FEBF10] transition-all duration-300" style={{ width: `${stepProgress}%` }} />
                        </div>
                        <div className="flex gap-1 mt-3 overflow-x-auto pb-0.5 -mx-1 px-1">
                            {HIRE_STEP_SHORT.map((label, i) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => setStep(i)}
                                    className={`shrink-0 h-8 min-w-[4.5rem] px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wide transition-all touch-manipulation ${
                                        i === step
                                            ? 'bg-white text-[#1E3A5F]'
                                            : i < step
                                            ? 'bg-white/20 text-white'
                                            : 'bg-white/5 text-white/45 border border-white/10'
                                    }`}
                                >
                                    {i < step ? '✓ ' : ''}{label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Desktop step tabs */}
                <div className="hidden sm:block px-5 py-3 bg-slate-50/90 border-b border-slate-100 shrink-0">
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                        {HIRE_STEPS.map((label, i) => (
                            <button
                                key={label}
                                type="button"
                                onClick={() => setStep(i)}
                                className={`h-9 px-3.5 rounded-xl text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                    i === step
                                        ? 'bg-[#1E3A5F] text-white'
                                        : i < step
                                        ? 'bg-[#1E3A5F]/10 text-[#1E3A5F]'
                                        : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                {i < step && <CheckCircle size={11} />}
                                {HIRE_STEP_SHORT[i]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mx-4 sm:mx-5 mt-3 sm:mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3 shrink-0">
                        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                            <X size={12} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Please fix this</p>
                            <p className="text-[13px] sm:text-[12px] font-semibold text-red-800 mt-0.5 leading-snug">{error}</p>
                        </div>
                    </div>
                )}

                {/* Form Body */}
                <form
                    id="hr-staff-stepper-form"
                    onSubmit={onSubmit}
                    className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 sm:px-6 py-4 sm:py-5"
                >
                    {section()}
                </form>

                {/* Footer */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white border-t border-slate-100 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
                    <div className="hidden sm:flex items-center justify-between gap-4">
                        <button
                            type="button"
                            onClick={step === 0 ? onClose : () => setStep((s) => Math.max(0, s - 1))}
                            className="h-10 px-5 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            {step === 0 ? 'Cancel' : 'Back'}
                        </button>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-medium text-slate-400 tabular-nums">{step + 1} / {HIRE_STEPS.length}</span>
                            {step < HIRE_STEPS.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={onNext}
                                    className="h-10 px-6 rounded-xl text-white font-semibold text-[11px] flex items-center gap-2 transition-all active:scale-[0.98] touch-manipulation"
                                    style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
                                >
                                    Continue <ChevronRight size={14} />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    form="hr-staff-stepper-form"
                                    disabled={isSubmitting}
                                    className="h-10 px-6 rounded-xl font-semibold text-[11px] flex items-center gap-2 text-[#1E3A5F] transition-all active:scale-[0.98] disabled:opacity-60 touch-manipulation"
                                    style={{ background: 'linear-gradient(135deg, #FEBF10 0%, #e6ab00 100%)' }}
                                >
                                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                    {isSubmitting ? 'Saving…' : 'Save staff profile'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Mobile footer */}
                    <div className="flex sm:hidden flex-col gap-2">
                        <div className="flex items-center justify-center">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider tabular-nums">
                                Step {step + 1} of {HIRE_STEPS.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={step === 0 ? onClose : () => setStep((s) => Math.max(0, s - 1))}
                                className="h-12 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-600 flex items-center justify-center gap-1.5 touch-manipulation active:bg-slate-50"
                            >
                                {step > 0 && <ChevronLeft size={16} />}
                                {step === 0 ? 'Cancel' : 'Back'}
                            </button>
                            {step < HIRE_STEPS.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={onNext}
                                    className="h-12 rounded-xl text-white font-bold text-[12px] flex items-center justify-center gap-1.5 touch-manipulation active:scale-[0.98]"
                                    style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
                                >
                                    Continue <ChevronRight size={16} />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    form="hr-staff-stepper-form"
                                    disabled={isSubmitting}
                                    className="h-12 rounded-xl font-bold text-[12px] flex items-center justify-center gap-1.5 text-[#1E3A5F] disabled:opacity-60 touch-manipulation active:scale-[0.98]"
                                    style={{ background: 'linear-gradient(135deg, #FEBF10 0%, #e6ab00 100%)' }}
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                    {isSubmitting ? 'Saving…' : 'Save'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

/** Export Records dropdown — PDF & Excel */
const ExportRecordsMenu = ({
    isOpen,
    onToggle,
    onClose,
    recordCount,
    exportLoading,
    onExportPdf,
    onExportExcel,
    buttonClassName = 'w-full h-11',
}) => (
    <div className="relative">
        <button
            type="button"
            onClick={onToggle}
            disabled={!!exportLoading}
            className={`${buttonClassName} flex items-center justify-center gap-2 text-white rounded-xl font-semibold text-[10px] sm:text-[9px] uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-70`}
            style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
        >
            {exportLoading ? (
                <Loader2 size={14} className="animate-spin text-[#FEBF10]" />
            ) : (
                <Download size={14} />
            )}
            <span>{exportLoading ? 'Exporting…' : 'Export records'}</span>
            {!exportLoading && (
                <ChevronDown size={12} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            )}
        </button>

        {isOpen && !exportLoading && (
            <>
                <button type="button" className="fixed inset-0 z-[40] cursor-default" aria-label="Close menu" onClick={onClose} />
                <div className="absolute top-full left-0 right-0 mt-2 z-[50] rounded-2xl border border-[#1E3A5F]/15 bg-white overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#1E3A5F]">Download roster</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            {recordCount} record{recordCount === 1 ? '' : 's'} (current filters)
                        </p>
                    </div>
                    <div className="p-2 space-y-1">
                        <button
                            type="button"
                            onClick={onExportPdf}
                            disabled={recordCount === 0}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-[#1E3A5F]/5 active:bg-[#1E3A5F]/10 transition-colors disabled:opacity-45 disabled:pointer-events-none group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 group-hover:border-red-200">
                                <FileText size={18} className="text-red-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-[#1E3A5F]">PDF report</p>
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Print-ready table · landscape A4</p>
                            </div>
                            <ChevronRight size={14} className="text-slate-300 shrink-0" />
                        </button>
                        <button
                            type="button"
                            onClick={onExportExcel}
                            disabled={recordCount === 0}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-emerald-50/80 active:bg-emerald-50 transition-colors disabled:opacity-45 disabled:pointer-events-none group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:border-emerald-200">
                                <FileSpreadsheet size={18} className="text-emerald-700" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-[#1E3A5F]">Excel workbook</p>
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Spreadsheet with school metadata</p>
                            </div>
                            <ChevronRight size={14} className="text-slate-300 shrink-0" />
                        </button>
                    </div>
                    {recordCount === 0 && (
                        <p className="px-4 pb-3 text-[10px] text-amber-700 font-semibold">No personnel match your filters.</p>
                    )}
                </div>
            </>
        )}
    </div>
);

const HRCentral = () => {
    const { manager } = useAuth();
    const academic = useAcademic();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [staffRowMenu, setStaffRowMenu] = useState(null);
    const closeStaffRowMenu = useCallback(() => setStaffRowMenu(null), []);
    const [showDeptFilter, setShowDeptFilter] = useState(false);
    const [selectedDept, setSelectedDept] = useState('All Departments');
    const [showAllDeptsModal, setShowAllDeptsModal] = useState(false);
    const [isDeptSelected, setIsDeptSelected] = useState(window.innerWidth >= 768);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [showHireModal, setShowHireModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [advanceMaxPercent, setAdvanceMaxPercent] = useState(25);
    const [policySaving, setPolicySaving] = useState(false);
    const [showAvancePolicyModal, setShowAvancePolicyModal] = useState(false);
    const [exportLoading, setExportLoading] = useState(null);

    const notify = (type, message) => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setNotifications((prev) => [...prev, { id, type, message }]);
        setTimeout(() => { setNotifications((prev) => prev.filter((n) => n.id !== id)); }, 4200);
    };

    const openEditModal = (staffMember) => { setEditingStaff(staffMember); setShowHireModal(true); closeStaffRowMenu(); };
    const closeHireModal = () => { setShowHireModal(false); setEditingStaff(null); };

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
        } finally { setIsActionLoading(false); closeStaffRowMenu(); }
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
        } finally { setIsActionLoading(false); closeStaffRowMenu(); }
    };

    const handleToggleActive = async (staffId, isCurrentlyActive) => {
        setIsActionLoading(true);
        try {
            await staffService.setStaffActive(staffId, !isCurrentlyActive);
            notify('success', `Staff account ${isCurrentlyActive ? 'deactivated' : 'activated'} successfully.`);
            await fetchStaff();
        } catch (error) {
            notify('error', error.response?.data?.message || 'Failed to update staff status.');
        } finally { setIsActionLoading(false); closeStaffRowMenu(); }
    };

    const handleToggleAllowAdvance = async (staffId, name, currentlyAllowed) => {
        const next = !currentlyAllowed;
        if (!window.confirm(`${next ? 'Enable' : 'Disable'} Shule Avance for ${name}?`)) return;
        setIsActionLoading(true);
        try {
            const res = await staffService.setStaffAllowAdvance(staffId, next);
            if (!res?.success) {
                notify('error', res?.message || 'Could not update Shule Avance access.');
                return;
            }
            notify('success', next ? 'Shule Avance enabled for this staff member.' : 'Shule Avance disabled for this staff member.');
            await fetchStaff();
        } catch (error) {
            notify('error', error.response?.data?.message || 'Failed to update Shule Avance access.');
        } finally {
            setIsActionLoading(false);
            closeStaffRowMenu();
        }
    };

    const [stats, setStats] = useState({ totalStaff: '0', activePercent: '100%', presentCount: 0, absentCount: 0, avgEvaluation: '—', retentionRate: '98%' });
    const [loading, setLoading] = useState(true);
    const [hrTerm, setHrTerm] = useState('');
    const [metricsRange, setMetricsRange] = useState(null);

    useEffect(() => {
        if (!academic.loading && academic.currentTerm && !hrTerm) setHrTerm(academic.currentTerm);
    }, [academic.loading, academic.currentTerm, hrTerm]);

    useEffect(() => {
        if (!manager?.school_id) return;
        (async () => {
            try {
                const res = await staffService.getShuleAvancePolicy();
                if (res?.success && res.data?.max_percent != null) {
                    setAdvanceMaxPercent(Number(res.data.max_percent) || 25);
                }
            } catch {
                /* policy optional until backend ready */
            }
        })();
    }, [manager?.school_id]);

    const saveAdvancePolicy = async () => {
        const pct = Number(advanceMaxPercent);
        if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
            notify('error', 'Enter a percentage between 1 and 100.');
            return;
        }
        setPolicySaving(true);
        try {
            const res = await staffService.updateShuleAvancePolicy(pct);
            if (!res?.success) {
                notify('error', res?.message || 'Could not save Shule Avance policy.');
                return;
            }
            notify('success', res.message || 'Shule Avance policy saved.');
            setShowAvancePolicyModal(false);
        } catch (err) {
            notify('error', err?.response?.data?.message || 'Failed to save policy.');
        } finally {
            setPolicySaving(false);
        }
    };

    const openAvancePolicyModal = () => {
        setActiveDropdown(null);
        setShowAvancePolicyModal(true);
    };

    const fetchStaff = async () => {
        if (!manager?.school_id) return;
        setLoading(true);
        try {
            const termParam = hrTerm || academic.currentTerm || 'Term 1';
            const [staffRes, metricsRes] = await Promise.allSettled([
                staffService.getStaff(),
                api.get('/dos/reports/hr/staff-metrics', { params: { term: termParam } }),
            ]);
            const metricsPayload = metricsRes.status === 'fulfilled' && metricsRes.value.data?.success ? metricsRes.value.data.data : null;
            const byUser = new Map((metricsPayload?.staff || []).map((row) => [Number(row.user_id), row]));
            const expectedSlots = Number(metricsPayload?.range?.expected_slots || 0);
            setMetricsRange(metricsPayload?.range || null);

            if (staffRes.status !== 'fulfilled' || !staffRes.value.success) {
                setStaff([]);
                setStats((prev) => ({ ...prev, totalStaff: '0', activePercent: '0%', presentCount: 0, absentCount: 0, avgEvaluation: '—' }));
                return;
            }

            const res = staffRes.value;
            const mapped = (res.data || []).map((s) => {
                const pk = Number(s.id);
                const m = Number.isFinite(pk) ? byUser.get(pk) : null;
                const reliabilityPct = m != null ? m.reliability_pct : expectedSlots > 0 ? 0 : null;
                const performanceOutOf100 = m != null ? m.performance_out_of_100 : null;
                return {
                    _raw: s, id: s.user_uid || s.id, real_id: s.id, userPk: pk,
                    name: s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
                    role: s.role_name || s.role_code, role_code: s.role_code || '',
                    department: s.department || (s.role_code === 'TEACHER' ? 'Academic Staff' : ['HOD', 'DOS'].includes(s.role_code) ? 'Leadership' : ['ACCOUNTANT'].includes(s.role_code) ? 'Administration' : 'Support Staff'),
                    phone: s.phone || 'N/A', email: s.email, photo: s.photo,
                    location: s.sector ? `${s.sector}, ${s.district}` : (s.district || 'N/A'),
                    status: s.is_active ? 'Expected' : 'Inactive',
                    evaluation: performanceOutOf100, attendance: reliabilityPct,
                    reliabilityPct, performanceOutOf100, lessonPresencePct: m?.lesson_presence_pct ?? null,
                    joinedDate: s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
                    staffId: s.staff_id || null, gender: s.gender || null,
                    date_of_birth: s.date_of_birth || '', dateOfBirth: s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('en-GB') : null,
                    nationalId: s.national_id || s.passport_number || null, passportNumber: s.passport_number || null,
                    address: s.address || null, employmentType: s.employment_type || null,
                    jobTitle: s.job_title || null, date_of_employment: s.date_of_employment || '',
                    dateOfEmployment: s.date_of_employment ? new Date(s.date_of_employment).toLocaleDateString('en-GB') : null,
                    contract_start_date: s.contract_start_date || '',
                    contractStartDate: s.contract_start_date ? new Date(s.contract_start_date).toLocaleDateString('en-GB') : null,
                    contract_end_date: s.contract_end_date || '',
                    contractEndDate: s.contract_end_date ? new Date(s.contract_end_date).toLocaleDateString('en-GB') : null,
                    fullContract: s.employment_type === 'Contract' && !s.contract_end_date,
                    employmentStatus: s.employment_status || null, subDepartment: s.sub_department || null,
                    payrollBasicSalary: s.payroll_basic_salary, payrollTransportAllowance: s.payroll_transport_allowance,
                    payrollHousingAllowance: s.payroll_housing_allowance, payrollMealAllowance: s.payroll_meal_allowance,
                    payrollOtherAllowances: s.payroll_other_allowances, payrollTaxPercent: s.payroll_tax_percent,
                    payrollPensionAmount: s.payroll_pension_amount, payrollOtherDeductions: s.payroll_other_deductions,
                    payrollPartTimeRate: s.payroll_part_time_rate, payrollPartTimeUnit: s.payroll_part_time_unit,
                    payrollPaymentFrequency: s.payroll_payment_frequency || null, payrollPaymentMethod: s.payroll_payment_method || null,
                    payrollBankName: s.payroll_bank_name || null, payrollAccountNumber: s.payroll_account_number || null,
                    payrollMobileMoneyPhone: s.payroll_mobile_money_phone || null, allowAdvance: !!s.allow_advance,
                    maxAdvanceLimit: s.max_advance_limit, advanceDeductionType: s.advance_deduction_type || null,
                    advanceDeductionValue: s.advance_deduction_value, accountEnabled: s.account_enabled !== 0,
                    username: s.staff_login_username || s.username || null,
                    rfid_uid: s.rfid_uid, fingerprint_id: s.fingerprint_id, identity_remarks: s.identity_remarks
                };
            });
            setStaff(mapped);

            const total = mapped.length;
            const active = mapped.filter((s) => s.status === 'Expected').length;
            const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
            const scored = mapped.filter((s) => s.performanceOutOf100 != null);
            const avgEval = scored.length > 0 ? `${Math.round(scored.reduce((a, c) => a + c.performanceOutOf100, 0) / scored.length)}/100` : '—';
            const retention = total > 0 ? (95 + (activePct / 20)).toFixed(1) : '0.0';
            setStats({ totalStaff: total.toString(), activePercent: `${activePct}%`, presentCount: active, absentCount: total - active, avgEvaluation: avgEval, retentionRate: `${retention}%` });
        } catch (err) {
            console.error("Failed to fetch staff:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!manager?.school_id || academic.loading) return;
        fetchStaff();
    }, [manager, hrTerm, academic.loading, academic.currentTerm]);

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
                notify('success', res?.data?.staff_id ? `Personnel account created (Staff ID: ${res.data.staff_id}).` : 'Personnel account created successfully.');
                fetchStaff();
                return { ok: true };
            }
            notify('error', res?.message || 'Hiring failed. Please check inputs.');
            return { ok: false, field: res?.field, message: res?.message };
        } catch (err) {
            const data = err?.response?.data || {};
            const field = data.field;
            let message = data.message || 'Hiring failed. Please check inputs.';
            if (data.code === 'DUPLICATE_STAFF_ID' || /duplicate entry.*staff_id/i.test(String(message))) {
                message = 'That staff ID is already used. Close and re-open the form to get the next available code.';
            }
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

    const schoolName = manager?.school?.name || manager?.school_name || 'School';
    const exportTerm = hrTerm || academic.currentTerm || 'Term 1';

    const runStaffExport = async (format) => {
        const rows = buildHrStaffExportRows(filteredStaff);
        if (!rows.length) {
            notify('error', 'No staff records to export. Clear filters or add personnel first.');
            setActiveDropdown(null);
            return;
        }
        setExportLoading(format);
        setActiveDropdown(null);
        try {
            const ctx = {
                schoolName,
                term: exportTerm,
                department: selectedDept,
                stats,
                rows,
            };
            if (format === 'pdf') {
                exportHrStaffPdf(ctx);
                notify('success', `PDF downloaded (${rows.length} staff).`);
            } else {
                exportHrStaffExcel(ctx);
                notify('success', `Excel file downloaded (${rows.length} staff).`);
            }
        } catch (err) {
            notify('error', err?.message || 'Export failed. Please try again.');
        } finally {
            setExportLoading(null);
        }
    };

    useEffect(() => {
        if (!staffRowMenu) return undefined;
        const onReposition = () => closeStaffRowMenu();
        window.addEventListener('scroll', onReposition, true);
        window.addEventListener('resize', onReposition);
        return () => { window.removeEventListener('scroll', onReposition, true); window.removeEventListener('resize', onReposition); };
    }, [staffRowMenu, closeStaffRowMenu]);

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">
            {/* Notifications */}
            <div className="fixed top-5 right-5 z-[220] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-24px)]">
                {notifications.map((n) => (
                    <div key={n.id} className={`rounded-xl border px-4 py-3 animate-in slide-in-from-right-5 duration-300 ${n.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                        <p className="text-[10px] font-semibold uppercase tracking-widest">{n.type === 'success' ? 'Success' : 'Action Failed'}</p>
                        <p className="text-[11px] font-bold mt-0.5 tracking-tight">{n.message}</p>
                    </div>
                ))}
            </div>

            <StaffModal staff={selectedStaff} onClose={() => setSelectedStaff(null)} />
            <HireModal
                isOpen={showHireModal}
                onClose={closeHireModal}
                onHire={handleHire}
                onEdit={handleEditStaff}
                editingStaff={editingStaff}
                existingStaff={staff}
                advanceMaxPercent={advanceMaxPercent}
            />
            <ShuleAvancePolicyModal
                isOpen={showAvancePolicyModal}
                onClose={() => setShowAvancePolicyModal(false)}
                advanceMaxPercent={advanceMaxPercent}
                setAdvanceMaxPercent={setAdvanceMaxPercent}
                policySaving={policySaving}
                onSave={saveAdvancePolicy}
                enabledCount={staff.filter((s) => s.allowAdvance).length}
                totalCount={staff.length}
            />

            {showAllDeptsModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowAllDeptsModal(false)} />
                    <div className="relative bg-white w-full max-w-sm rounded-[2rem] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-re-text uppercase tracking-widest">Select Department</h3>
                                <p className="text-[10px] text-re-text-muted font-bold mt-0.5">Filter the staff overview</p>
                            </div>
                            <button onClick={() => setShowAllDeptsModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-re-bg text-re-text-muted hover:bg-black/10 transition-colors"><X size={14} /></button>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-2">
                            {departments.map(dept => (
                                <button key={dept} onClick={() => { setSelectedDept(dept); setShowAllDeptsModal(false); }}
                                    className={`h-12 flex items-center gap-2 px-4 rounded-xl border text-[10px] font-semibold uppercase tracking-widest transition-all ${selectedDept === dept ? 'bg-re-navy/10 border-re-navy/30 text-re-navy ring-1 ring-re-navy/30' : 'bg-white border-black/5 text-re-text-muted hover:border-black/10'}`}>
                                    {selectedDept === dept && <CheckCircle size={14} className="text-re-navy" />}
                                    {dept}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* Hero */}
            <div className="relative w-full min-h-[220px] overflow-hidden bg-[#c87800]">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />
                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-12 pb-16 flex items-center gap-8">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-5 h-1 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></span>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.3em]" style={{ color: "#FEBF10" }}>Organizational Resource</p>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight leading-none mb-1 mt-1 uppercase" style={{ fontFamily: "'Montserrat', sans-serif" }}>HR Central</h1>
                        <p className="text-[10px] font-medium text-white/60 max-w-lg leading-relaxed uppercase tracking-widest" style={{ fontFamily: "'Montserrat', sans-serif" }}>Professional Personnel & Leadership Management Engine</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-12 -mt-3 sm:-mt-4 pt-2 relative z-20 pb-24 lg:pb-20">
                <div className="bg-white rounded-t-2xl sm:rounded-t-[28px] border border-black/10 overflow-hidden flex flex-col">

                    <div className={`${!isDeptSelected ? 'hidden md:grid' : 'grid'} grid-cols-1 lg:grid-cols-4 border-b border-black/5`}>
                        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 divide-x divide-y md:divide-y-0 divide-black/5">
                            {[
                                { label: 'Total Personnel', value: stats.totalStaff, icon: <Users size={12} className="mb-1.5" /> },
                                { label: 'Active Present', value: stats.activePercent, subValue: `${stats.presentCount} present | ${stats.absentCount} absent`, icon: <Activity size={12} className="mb-1.5" /> },
                                { label: 'Performance avg', value: stats.avgEvaluation, icon: <Award size={12} className="mb-1.5" /> },
                            ].map((stat, i) => (
                                <div key={i} className="p-3 sm:p-5 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                                    <div className="mb-1 sm:mb-1.5 opacity-40 shrink-0" style={{ color: "#FEBF10" }}>{stat.icon}</div>
                                    <span className="text-sm sm:text-xl font-semibold text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">{stat.value}</span>
                                    <p className="text-[6px] sm:text-[7px] font-semibold text-re-text-muted uppercase tracking-[0.2em] mt-0.5 opacity-60">{stat.label}</p>
                                    {stat.subValue && <p className="text-[6px] sm:text-[7px] font-semibold uppercase tracking-widest mt-0.5 opacity-30" style={{ color: "#1E3A5F" }}>{stat.subValue}</p>}
                                </div>
                            ))}
                        </div>

                        <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
                            <ExportRecordsMenu
                                isOpen={activeDropdown === 'export'}
                                onToggle={() => setActiveDropdown(activeDropdown === 'export' ? null : 'export')}
                                onClose={() => setActiveDropdown(null)}
                                recordCount={filteredStaff.length}
                                exportLoading={exportLoading}
                                onExportPdf={() => runStaffExport('pdf')}
                                onExportExcel={() => runStaffExport('excel')}
                            />

                            <div className="relative">
                                <button onClick={() => setActiveDropdown(activeDropdown === 'actions' ? null : 'actions')} className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-medium text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg transition-all">
                                    <ShieldCheck size={14} style={{ color: "#FEBF10" }} /><span>HR Actions</span><ChevronDown size={12} className={`transition-transform duration-300 ${activeDropdown === 'actions' ? 'rotate-180' : ''}`} />
                                </button>
                                {activeDropdown === 'actions' && (<>
                                    <div className="fixed inset-0 z-[40]" onClick={() => setActiveDropdown(null)} />
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200">
                                        <button onClick={() => { setShowHireModal(true); setActiveDropdown(null); }} className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[#1E3A5F] hover:bg-re-navy/5 transition-colors flex items-center gap-2.5"><UserPlus size={14} /> Hire New Staff</button>
                                        <button type="button" onClick={openAvancePolicyModal} className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5"><Wallet size={14} style={{ color: "#FEBF10" }} /> Avance rate</button>
                                    </div>
                                </>)}
                            </div>

                            <button onClick={() => { setShowHireModal(true); setActiveDropdown(null); }} className="w-full h-11 flex items-center justify-center gap-2 rounded-xl font-medium text-[9px] uppercase tracking-widest text-[#1E3A5F] border border-[#FEBF10]/40 bg-[#FEBF10]/15 hover:bg-[#FEBF10]/25 transition-all">
                                <UserPlus size={14} />Add New Staff
                            </button>
                        </div>
                    </div>

                    {/* Mobile actions */}
                    <div className={`${!isDeptSelected ? 'hidden' : 'flex'} lg:hidden p-4 border-b border-black/5 flex-col gap-2 bg-slate-50/80`}>
                        <ExportRecordsMenu
                            isOpen={activeDropdown === 'export-mobile'}
                            onToggle={() => setActiveDropdown(activeDropdown === 'export-mobile' ? null : 'export-mobile')}
                            onClose={() => setActiveDropdown(null)}
                            recordCount={filteredStaff.length}
                            exportLoading={exportLoading}
                            onExportPdf={() => runStaffExport('pdf')}
                            onExportExcel={() => runStaffExport('excel')}
                            buttonClassName="w-full h-10"
                        />
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <button
                                    type="button"
                                    onClick={() => setActiveDropdown(activeDropdown === 'actions-mobile' ? null : 'actions-mobile')}
                                    className="w-full h-10 flex items-center justify-center gap-2 bg-white border border-black/10 text-re-text font-semibold text-[10px] uppercase tracking-widest rounded-xl"
                                >
                                    <ShieldCheck size={14} style={{ color: '#FEBF10' }} />
                                    <span>HR Actions</span>
                                    <ChevronDown size={12} className={`transition-transform ${activeDropdown === 'actions-mobile' ? 'rotate-180' : ''}`} />
                                </button>
                                {activeDropdown === 'actions-mobile' && (
                                    <>
                                        <div className="fixed inset-0 z-[40]" onClick={() => setActiveDropdown(null)} />
                                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-black/10 rounded-xl overflow-hidden py-1 z-[50]">
                                            <button type="button" onClick={() => { setShowHireModal(true); setActiveDropdown(null); }} className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[#1E3A5F] hover:bg-re-navy/5 flex items-center gap-2.5"><UserPlus size={14} /> Hire new staff</button>
                                            <button type="button" onClick={openAvancePolicyModal} className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg border-t border-black/5 flex items-center gap-2.5"><Wallet size={14} style={{ color: '#FEBF10' }} /> Avance rate</button>
                                        </div>
                                    </>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowHireModal(true)}
                                className="h-10 px-4 shrink-0 flex items-center justify-center gap-1.5 rounded-xl font-semibold text-[10px] uppercase tracking-widest text-[#1E3A5F] border border-[#FEBF10]/50 bg-[#FEBF10]/20"
                            >
                                <UserPlus size={14} /> Add staff
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className={`${!isDeptSelected ? 'hidden md:flex' : 'flex'} p-4 md:px-8 border-b border-black/5 flex-col md:flex-row items-stretch md:items-center gap-3 bg-white`}>
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-re-text-muted/40 group-focus-within:text-[#1E3A5F] transition-colors" size={14} />
                            <input type="text" placeholder="Search by name, ID or role..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-9 sm:h-10 bg-re-bg rounded-xl pl-11 pr-4 font-extrabold outline-none border border-transparent focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-re-text text-sm sm:text-xs tracking-tight" />
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                            <div className="flex flex-col gap-1 min-w-[140px]">
                                <span className="text-[7px] font-bold uppercase tracking-widest text-re-text-muted opacity-60 px-1">Term</span>
                                <select value={hrTerm || academic.currentTerm || 'Term 1'} onChange={(e) => setHrTerm(e.target.value)} className="h-9 sm:h-10 px-3 rounded-xl border border-black/10 bg-white text-[10px] font-bold uppercase tracking-wider text-[#1E3A5F] outline-none focus:ring-2 focus:ring-[#FEBF10]/30">
                                    {(academic.activeTerms?.length ? academic.activeTerms : ['Term 1', 'Term 2', 'Term 3']).map((t) => (<option key={t} value={t}>{t}</option>))}
                                </select>
                            </div>
                          
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                           
                            <button onClick={() => setShowDeptFilter(!showDeptFilter)} className="h-9 sm:h-10 px-3 sm:px-5 bg-white border border-black/5 rounded-xl flex items-center gap-1.5 sm:gap-2 text-re-text-muted font-semibold text-[8px] sm:text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all whitespace-nowrap"><Filter size={13} style={{ color: "#FEBF10" }} />Filter By Dept</button>
                        </div>
                    </div>

                    {showDeptFilter && (
                        <div className={`${!isDeptSelected ? 'hidden md:flex' : 'flex'} px-6 md:px-8 py-4 bg-re-bg/20 border-b border-black/5 items-center overflow-x-auto gap-2 custom-scrollbar animate-in slide-in-from-top-2 fade-in duration-300`}>
                            <button onClick={() => setSelectedDept('All Departments')} className={`flex items-center justify-center gap-1.5 shrink-0 h-7 sm:h-9 px-3 sm:px-5 rounded-lg sm:rounded-xl border font-medium text-[7px] sm:text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${selectedDept === 'All Departments' ? 'text-white' : 'bg-white border-black/5 text-re-text-muted hover:bg-re-bg'}`} style={selectedDept === 'All Departments' ? { background: "#1E3A5F", borderColor: "#1E3A5F" } : {}}>
                                {selectedDept === 'All Departments' && <CheckCircle size={10} />} All Departments
                            </button>
                            {departments.map((dept, idx) => (
                                <button key={dept} onClick={() => setSelectedDept(dept)} className={`flex items-center justify-center gap-1.5 shrink-0 h-7 sm:h-9 px-3 sm:px-5 rounded-lg sm:rounded-xl border font-medium text-[7px] sm:text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${idx > 1 ? 'hidden md:flex' : ''} ${selectedDept === dept ? 'text-white' : 'bg-white border-black/5 text-re-text-muted hover:bg-re-bg'}`} style={selectedDept === dept ? { background: "#1E3A5F", borderColor: "#1E3A5F" } : {}}>
                                    {selectedDept === dept && <CheckCircle size={10} />} {dept}
                                </button>
                            ))}
                            <button onClick={() => setShowAllDeptsModal(true)} className="md:hidden flex items-center justify-center gap-1.5 shrink-0 h-7 px-3 rounded-lg border border-black/5 bg-white font-semibold text-[7px] uppercase tracking-widest transition-all active:scale-95" style={{ color: "#FEBF10" }}>
                                <Plus size={10} /> More
                            </button>
                        </div>
                    )}

                    {!isDeptSelected && (
                        <div className="md:hidden p-4 sm:p-6 bg-re-bg/20 flex flex-col items-center justify-center text-center py-8 sm:py-12 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-2xl sm:rounded-[2rem] flex items-center justify-center mb-4 sm:mb-6 border border-black/5 animate-bounce" style={{ color: "#FEBF10" }}><Briefcase size={24} className="sm:w-8 sm:h-8" /></div>
                            <h2 className="text-lg sm:text-xl font-semibold text-re-text tracking-tighter uppercase mb-1 sm:mb-2">Select a Division</h2>
                            <p className="text-[8px] sm:text-[10px] text-re-text-muted font-bold uppercase tracking-widest leading-relaxed mb-6 sm:mb-8 max-w-[200px] sm:max-w-[240px]">Select a specific institutional department to view personnel.</p>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-sm">
                                {departments.map(dept => (
                                    <button key={dept} onClick={() => { setSelectedDept(dept); setIsDeptSelected(true); }} className="h-14 sm:h-16 flex items-center justify-center gap-2.5 sm:gap-2 bg-white border border-black/5 rounded-xl sm:rounded-2xl transition-all group active:scale-95">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-[9px] sm:text-[10px] font-semibold text-re-text group-hover:text-[#1E3A5F] uppercase">{dept}</span>
                                            <span className="text-[6px] sm:text-[7px] font-bold text-re-text-muted uppercase tracking-widest opacity-40 italic">View Roster</span>
                                        </div>
                                        <ChevronRight size={14} className="text-re-text-muted" />
                                    </button>
                                ))}
                                <button onClick={() => { setSelectedDept('All Departments'); setIsDeptSelected(true); }} className="col-span-2 h-12 sm:h-14 text-white rounded-xl sm:rounded-2xl font-semibold text-[8px] sm:text-[9px] uppercase tracking-widest active:scale-95 transition-all mt-1 sm:mt-2" style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}>View All Personnel</button>
                            </div>
                        </div>
                    )}

                    {/* Mobile staff cards */}
                    <div className={`${!isDeptSelected ? 'hidden' : 'block'} md:hidden bg-white`}>
                        {loading ? (
                            <div className="p-10 text-center">
                                <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#1E3A5F transparent transparent transparent' }} />
                                <p className="text-[10px] font-semibold text-re-text-muted uppercase tracking-widest">Loading…</p>
                            </div>
                        ) : filteredStaff.length === 0 ? (
                            <p className="p-10 text-center text-[10px] font-semibold text-re-text-muted uppercase tracking-widest opacity-50">No personnel found.</p>
                        ) : (
                            <ul className="divide-y divide-black/5">
                                {filteredStaff.map((s) => (
                                    <li key={s.id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedStaff(s)}
                                            className="w-full text-left px-4 py-3.5 flex items-center gap-3 active:bg-re-bg/50"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-re-bg border border-black/5 flex shrink-0 items-center justify-center overflow-hidden">
                                                {s.photo ? <img src={(import.meta.env.VITE_API_URL || 'http://localhost:5100') + s.photo} className="w-full h-full object-cover" alt="" /> : <User size={14} className="opacity-40" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-semibold text-re-text uppercase truncate">{s.name}</p>
                                                <p className="text-[9px] text-re-text-muted uppercase tracking-wider truncate">{s.role}</p>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${s.allowAdvance ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-500'}`}>
                                                        Avance {s.allowAdvance ? 'on' : 'off'}
                                                    </span>
                                                    <span className="text-[8px] font-bold uppercase text-slate-500">
                                                        {s.performanceOutOf100 != null ? `${s.performanceOutOf100}/100` : '—'} perf
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (staffRowMenu?.staff?.id === s.id) { closeStaffRowMenu(); return; }
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const MENU_W = 192, MENU_H = 280;
                                                    const spaceBelow = window.innerHeight - rect.bottom;
                                                    const openUp = spaceBelow < MENU_H && rect.top > MENU_H + 16;
                                                    const left = Math.min(Math.max(8, rect.right - MENU_W), window.innerWidth - MENU_W - 8);
                                                    const top = openUp ? rect.top - MENU_H - 8 : rect.bottom + 8;
                                                    setStaffRowMenu({ staff: s, left, top });
                                                }}
                                                className="w-9 h-9 rounded-lg border border-black/5 flex items-center justify-center text-re-text-muted shrink-0"
                                            >
                                                <MoreVertical size={14} />
                                            </button>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className={`${!isDeptSelected ? 'hidden md:block' : 'hidden md:block'} overflow-x-auto bg-white`}>
                        {isDeptSelected && (
                            <div className="md:hidden px-6 py-3 bg-white border-b border-black/5 flex items-center justify-between">
                                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full" style={{ background: "#FEBF10" }}></div><span className="text-[9px] font-semibold text-re-text uppercase tracking-widest">{selectedDept} Roster</span></div>
                                <button onClick={() => setIsDeptSelected(false)} className="text-[8px] font-semibold uppercase tracking-widest hover:underline" style={{ color: "#FEBF10" }}>Change Dept</button>
                            </div>
                        )}
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-re-bg/20 border-b border-black/5">
                                    <th className="px-4 sm:px-8 py-2.5 sm:py-3 text-[7px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Personnel Info</th>
                                    <th className="hidden md:table-cell px-8 py-3 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Designation</th>
                                    <th className="hidden lg:table-cell px-6 py-3 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Shule Avance</th>
                                    <th className="hidden md:table-cell px-8 py-3 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Reliability</th>
                                    <th className="hidden md:table-cell px-8 py-3 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Performance</th>
                                    <th className="px-4 sm:px-8 py-2.5 sm:py-3 text-[7px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 text-right">Records</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {loading ? (
                                    <tr><td colSpan="6" className="p-12 text-center">
                                        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "#1E3A5F transparent transparent transparent" }}></div>
                                        <p className="text-[10px] font-semibold text-re-text-muted uppercase tracking-widest">Querying Personnel DB...</p>
                                    </td></tr>
                                ) : (
                                    <>
                                        {filteredStaff.map((s) => (
                                            <tr key={s.id} onClick={() => setSelectedStaff(s)} className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group cursor-pointer">
                                                <td className="px-4 sm:px-8 py-2 sm:py-3 border-r border-black/5">
                                                    <div className="flex items-center gap-3 sm:gap-4">
                                                        <div className="w-8 h-8 rounded-full bg-re-bg border border-black/5 flex-shrink-0 flex items-center justify-center relative overflow-hidden group-hover:bg-white">
                                                            {s.photo ? <img src={(import.meta.env.VITE_API_URL || 'http://localhost:5100') + s.photo} className="w-full h-full object-cover" alt={s.name} /> : <User size={12} className="opacity-40 text-re-text-muted" />}
                                                            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-black/5 rounded-full flex items-center justify-center">
                                                                <div className={`w-1 h-1 rounded-full ${s.status === 'Expected' ? 'bg-emerald-500' : 'bg-red-400'}`}></div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-semibold text-re-text tracking-tight uppercase leading-none mb-0.5 group-hover:text-[#1E3A5F] transition-colors">{s.name}</p>
                                                            <p className="text-[7px] sm:text-[8px] font-bold text-re-text-muted opacity-30 uppercase tracking-widest leading-none font-mono italic">{s.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hidden md:table-cell px-8 py-5">
                                                    <div className="flex flex-col gap-0.5">
                                                        <p className="text-[10px] font-semibold text-re-text uppercase tracking-tight truncate max-w-[150px]">{s.role}</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[9px] font-bold text-re-text-muted opacity-50 uppercase tracking-widest">{s.department}</p>
                                                            {(s.rfid_uid || s.fingerprint_id) && (
                                                                <div className="flex items-center gap-1 bg-black/5 px-1.5 py-0.5 rounded ml-1">
                                                                    {s.rfid_uid && <IdCard size={10} className="text-[#1E3A5F] opacity-70" />}
                                                                    {s.fingerprint_id && <Fingerprint size={10} className="text-emerald-500 opacity-70" />}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hidden lg:table-cell px-6 py-5">
                                                    <span className={`inline-flex px-2 py-1 rounded-full text-[8px] font-bold uppercase tracking-wide ${s.allowAdvance ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-500'}`}>
                                                        {s.allowAdvance ? 'Enabled' : 'Off'}
                                                    </span>
                                                </td>
                                                <td className="hidden md:table-cell px-8 py-5">
                                                    <div className="space-y-1.5 max-w-[120px]">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <p className="text-[9px] font-semibold text-re-text">{s.reliabilityPct != null ? `${s.reliabilityPct}%` : '—'}</p>
                                                            <span className="text-[7px] font-bold uppercase text-re-text-muted opacity-50 shrink-0">gate</span>
                                                        </div>
                                                        <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                                                            <div className="h-full transition-all" style={{ width: `${Math.min(100, s.reliabilityPct ?? 0)}%`, background: (s.reliabilityPct ?? 0) >= 95 ? 'linear-gradient(135deg, #1E3A5F 0%, #3D5A80 100%)' : '#FEBF10' }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hidden md:table-cell px-8 py-5">
                                                    <div className={`inline-flex items-baseline gap-1 px-3 py-1.5 rounded-lg text-[8px] font-semibold uppercase tracking-widest ring-1 ring-inset ${s.status === 'Exceptional' ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/20' : s.status === 'Expected' ? 'bg-blue-50 text-blue-600 ring-blue-500/20' : 'bg-re-navy/5 text-re-navy ring-re-navy/20'}`} style={s.status !== 'Exceptional' && s.status !== 'Expected' ? { color: "#1E3A5F" } : {}}>
                                                        <span className="text-sm font-bold tracking-tight normal-case">{s.performanceOutOf100 != null ? s.performanceOutOf100 : '—'}</span>
                                                        <span className="opacity-70">/100</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-8 py-3 sm:py-5 text-right relative">
                                                    <div className="flex items-center justify-end">
                                                        <button type="button" onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (staffRowMenu?.staff?.id === s.id) { closeStaffRowMenu(); return; }
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            const MENU_W = 192, MENU_H = 280;
                                                            const spaceBelow = window.innerHeight - rect.bottom;
                                                            const openUp = spaceBelow < MENU_H && rect.top > MENU_H + 16;
                                                            const left = Math.min(Math.max(8, rect.right - MENU_W), window.innerWidth - MENU_W - 8);
                                                            const top = openUp ? rect.top - MENU_H - 8 : rect.bottom + 8;
                                                            setStaffRowMenu({ staff: s, left, top });
                                                        }} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-re-text-muted hover:bg-re-bg transition-all border border-transparent hover:border-black/5">
                                                            <MoreVertical size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredStaff.length === 0 && (
                                            <tr><td colSpan="6" className="p-12 text-center text-[10px] font-semibold text-re-text-muted uppercase tracking-widest italic opacity-40">No personnel records found matching your criteria.</td></tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className={`${!isDeptSelected ? 'hidden md:flex' : 'flex'} px-4 sm:px-8 py-4 bg-re-bg/20 border-t border-black/5 flex-row items-center justify-between gap-4`}>
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="hidden xs:flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></div>
                                <p className="text-[6px] sm:text-[7px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic whitespace-nowrap">HR Database Sync</p>
                            </div>
                            <div className="hidden xs:block w-px h-3 bg-black/10"></div>
                            <p className="text-[6px] sm:text-[7px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic whitespace-nowrap">Displaying {filteredStaff.length} Records</p>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-1.5">
                            <button className="h-7 px-2 sm:px-3 rounded-lg bg-white border border-black/5 text-[7px] sm:text-[8px] font-semibold text-re-text-muted tracking-tighter opacity-40 hover:opacity-100 transition-all font-mono italic">Prev_set</button>
                            <div className="h-7 px-3 sm:px-4 rounded-lg flex items-center justify-center bg-white border border-black/5 text-[7px] sm:text-[8px] font-semibold text-re-text tracking-tighter">Page 01</div>
                            <button className="h-7 px-3 sm:px-4 rounded-lg text-white text-[7px] sm:text-[8px] font-semibold tracking-tighter" style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}>Next_set</button>
                        </div>
                    </div>
                </div>

                {staffRowMenu && createPortal(
                    <>
                        <button type="button" className="fixed inset-0 z-[190] cursor-default bg-black/[0.03]" onClick={(e) => { e.stopPropagation(); closeStaffRowMenu(); }} />
                        <div role="menu" className="fixed z-[200] w-48 bg-white border border-slate-200 rounded-2xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150" style={{ left: staffRowMenu.left, top: staffRowMenu.top, fontFamily: "'Montserrat', system-ui, sans-serif" }} onClick={(e) => e.stopPropagation()}>
                            {(() => {
                                const ms = staffRowMenu.staff;
                                return (<>
                                    <button type="button" className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[#1E3A5F] hover:bg-re-navy/5 transition-colors flex items-center gap-2.5" onClick={() => { setSelectedStaff(ms); closeStaffRowMenu(); }}><Eye size={13} /> View Full File</button>
                                    <button type="button" className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center gap-2.5 border-t border-black/5" onClick={() => openEditModal(ms)}><Edit3 size={13} /> Edit Staff</button>
                                    <button type="button" className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-violet-700 hover:bg-violet-50 transition-colors flex items-center gap-2.5 border-t border-black/5" onClick={() => handleToggleAllowAdvance(ms.real_id || ms.id, ms.name, ms.allowAdvance)} disabled={isActionLoading}>{isActionLoading ? <Loader2 size={13} className="animate-spin" /> : <Wallet size={13} />}{ms.allowAdvance ? 'Disable Shule Avance' : 'Enable Shule Avance'}</button>
                                    <button type="button" className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5" onClick={() => handleResendInvite(ms.real_id || ms.id)} disabled={isActionLoading}>{isActionLoading ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} className="text-[#FEBF10]" />}Resend Invitation</button>
                                    <button type="button" className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-indigo-700 hover:bg-indigo-50 transition-colors flex items-center gap-2.5 border-t border-black/5" onClick={() => handleToggleActive(ms.real_id || ms.id, ms.status !== 'Inactive')} disabled={isActionLoading}>{isActionLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}{ms.status === 'Inactive' ? 'Activate Staff' : 'Deactivate Staff'}</button>
                                    <button type="button" className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2.5 border-t border-black/5" onClick={() => handleDeleteStaff(ms.real_id || ms.id, ms.name)} disabled={isActionLoading}>{isActionLoading ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}Delete Staff</button>
                                    <button type="button" className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5" onClick={() => closeStaffRowMenu()}><FileSignature size={13} className="text-re-text-muted" /> Add Appraisal</button>
                                    <button type="button" className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5" onClick={() => closeStaffRowMenu()}><Printer size={13} className="text-re-text-muted" /> Export Profile</button>
                                </>);
                            })()}
                        </div>
                    </>, document.body
                )}

                {/* Mobile floating Add Staff */}
                <div className="lg:hidden fixed inset-x-0 bottom-0 z-[90] pointer-events-none px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        onClick={() => setShowHireModal(true)}
                        className="pointer-events-auto w-full h-12 flex items-center justify-center gap-2 rounded-2xl font-bold text-[11px] uppercase tracking-widest text-white border border-[#d4a20a]/30"
                        style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
                    >
                        <UserPlus size={18} strokeWidth={2} />
                        Add staff
                    </button>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between mt-8 px-4 gap-4">
                    <p className="text-[7px] text-re-text-muted font-semibold uppercase tracking-[0.3em] opacity-30 italic">Developed & Engineered by Babyeyi Intelligence Systems</p>
                    <div className="flex items-center gap-4 opacity-20">
                        <span className="text-[8px] font-semibold text-re-text uppercase tracking-widest">HR Module</span>
                        <span className="text-[8px] font-semibold text-re-text uppercase tracking-widest">v1.2.0-Reloaded</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HRCentral;
