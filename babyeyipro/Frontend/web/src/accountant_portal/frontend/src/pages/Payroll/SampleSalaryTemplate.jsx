import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Save, CheckCircle2, Copy, History, Pencil, Trash2, X,
  ShieldCheck, Calculator, AlertCircle, Loader2, Search, User,
  ToggleLeft, ToggleRight, Upload,
} from 'lucide-react';
import './SalaryTemplate.css';
import {
  getActivePayrollTemplate,
  getPayrollTemplateHistory,
  savePayrollTemplate,
  getEmployeePayrollDeductions,
  createEmployeePayrollDeduction,
  updateEmployeePayrollDeduction,
  deleteEmployeePayrollDeduction,
  searchPayrollStaff,
} from '../../services/payrollTemplateService';
import {
  ALLOWANCE_CATEGORIES,
  DEDUCTION_CATEGORIES,
  DEFAULT_PAYE_BRACKETS,
  calcRwandaPayroll,
  fmtRwf,
} from '../../utils/rwandaPayrollEngine';

const TABS = ['Allowances', 'Deductions', 'Statutory Rates', 'Employee Deductions'];

const defaultAllowances = [
  {
    id: 1,
    category: 'Transport Allowance',
    name: 'Transport Allowance',
    amountType: 'Fixed Amount',
    value: 50000,
    taxTreatment: 'Taxable',
    frequency: 'Monthly',
    appliesTo: 'All Employees',
    status: 'Active',
  },
  {
    id: 2,
    category: 'Housing Allowance',
    name: 'Housing Allowance',
    amountType: 'Fixed Amount',
    value: 100000,
    taxTreatment: 'Taxable',
    frequency: 'Monthly',
    appliesTo: 'All Employees',
    status: 'Active',
  },
];

const defaultDeductions = [
  {
    id: 1,
    category: 'SACCO',
    name: 'SACCO',
    amountType: 'Fixed Amount',
    value: 10000,
    recurring: 'Monthly',
    appliesTo: 'All Employees',
    priority: 'Medium',
    status: 'Active',
  },
];

const defaultStatutory = {
  rssbEmployee: 6,
  rssbEmployer: 6,
  occupationalHazard: 2,
  maternityEmployee: 0.3,
  maternityEmployer: 0.3,
  ramaEmployee: 7.5,
  ramaEmployer: 7.5,
  cbhi: 0.5,
};

const emptyAllowanceForm = {
  category: 'Transport Allowance',
  customName: '',
  amountType: 'Fixed Amount',
  value: '',
  taxTreatment: 'Taxable',
  frequency: 'Monthly',
  appliesTo: 'All Employees',
  status: 'Active',
};

const emptyDeductionForm = {
  category: 'SACCO',
  customName: '',
  amountType: 'Fixed Amount',
  value: '',
  recurring: 'Monthly',
  appliesTo: 'All Employees',
  priority: 'Medium',
  status: 'Active',
};

const emptyEmpDedForm = {
  staffUserId: null,
  staffName: '',
  deductionType: 'Loan',
  customName: '',
  totalAmount: '',
  monthlyInstallment: '',
  repaymentMonths: '',
  startMonth: 9,
  startYear: 2026,
  notes: '',
  status: 'Active',
};

function cardClass() {
  return 'bg-white border border-slate-200 rounded-2xl shadow-sm';
}

function allowanceDisplayName(a) {
  if (a.category === 'Other' && a.customName) return a.customName;
  return a.name || a.category || 'Allowance';
}

function deductionDisplayName(d) {
  if (d.category === 'Other' && d.customName) return d.customName;
  return d.name || d.category || 'Deduction';
}

function formatAllowanceValue(a) {
  const t = String(a.amountType || '').toLowerCase();
  if (t.includes('percent')) return `${a.value}%`;
  return fmtRwf(a.value);
}

function monthName(n) {
  return ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][n] || n;
}

export default function SalaryTemplate() {
  const [activeTab, setActiveTab] = useState('Allowances');
  const [allowances, setAllowances] = useState(defaultAllowances);
  const [deductions, setDeductions] = useState(defaultDeductions);
  const [payeRates, setPayeRates] = useState(DEFAULT_PAYE_BRACKETS.map((r, i) => ({ id: i + 1, ...r })));
  const [statutory, setStatutory] = useState(defaultStatutory);
  const [applyToAll, setApplyToAll] = useState(true);
  const [templateMeta, setTemplateMeta] = useState({
    name: 'Rwanda School Payroll Template',
    description: 'Configured once — applied automatically during payroll runs.',
    status: 'Draft',
    effectiveDate: '2026-09-01',
  });
  const [basicSalaryTest, setBasicSalaryTest] = useState(300000);
  const [previewLoan, setPreviewLoan] = useState(0);

  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [notice, setNotice] = useState('');
  const [versionHistory, setVersionHistory] = useState([]);
  const [saving, setSaving] = useState(false);

  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [showPAYEModal, setShowPAYEModal] = useState(false);
  const [showEmpDedModal, setShowEmpDedModal] = useState(false);
  const [editingAllowanceId, setEditingAllowanceId] = useState(null);
  const [editingDeductionId, setEditingDeductionId] = useState(null);
  const [editingEmpDedId, setEditingEmpDedId] = useState(null);
  const [allowanceForm, setAllowanceForm] = useState(emptyAllowanceForm);
  const [deductionForm, setDeductionForm] = useState(emptyDeductionForm);
  const [empDedForm, setEmpDedForm] = useState(emptyEmpDedForm);

  const [employeeDeductions, setEmployeeDeductions] = useState([]);
  const [empDedLoading, setEmpDedLoading] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffResults, setStaffResults] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const payroll = useMemo(
    () =>
      calcRwandaPayroll({
        basicSalary: basicSalaryTest,
        allowances,
        templateDeductions: deductions,
        employeeDeductions: previewLoan > 0 ? [{ monthlyInstallment: previewLoan }] : [],
        statutory,
        payeRates,
      }),
    [basicSalaryTest, allowances, deductions, statutory, payeRates, previewLoan]
  );

  const loadEmployeeDeductions = useCallback(async (staffUserId) => {
    setEmpDedLoading(true);
    try {
      const rows = await getEmployeePayrollDeductions(
        staffUserId ? { staffUserId } : { query: staffSearch || undefined }
      );
      setEmployeeDeductions(rows);
    } catch {
      setEmployeeDeductions([]);
    } finally {
      setEmpDedLoading(false);
    }
  }, [staffSearch]);

  useEffect(() => {
    let alive = true;
    Promise.all([getActivePayrollTemplate(), getPayrollTemplateHistory(15)])
      .then(([tpl, history]) => {
        if (!alive) return;
        if (tpl) {
          setTemplateMeta({
            name: tpl.name || 'Payroll Salary Template',
            description: tpl.description || '',
            status: tpl.status || 'Draft',
            effectiveDate: tpl.effectiveDate ? String(tpl.effectiveDate).slice(0, 10) : '',
          });
          setApplyToAll(!!tpl.applyToAll);
          if (Array.isArray(tpl.allowances) && tpl.allowances.length) {
            setAllowances(tpl.allowances.map((a, i) => ({ id: a.id || i + 1, ...a })));
          }
          if (Array.isArray(tpl.deductions) && tpl.deductions.length) {
            setDeductions(tpl.deductions.map((d, i) => ({ id: d.id || i + 1, ...d })));
          }
          if (Array.isArray(tpl.payeRates) && tpl.payeRates.length) {
            setPayeRates(tpl.payeRates.map((r, i) => ({ id: r.id || i + 1, ...r })));
          }
          setStatutory((prev) => ({ ...prev, ...(tpl.statutory || {}) }));
        }
        setVersionHistory(history || []);
      })
      .catch(() => {
        if (alive) setNotice('Unable to load saved template from server.');
      })
      .finally(() => {
        if (alive) setLoadingTemplate(false);
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (activeTab === 'Employee Deductions') loadEmployeeDeductions(selectedStaff?.staffUserId);
  }, [activeTab, selectedStaff, loadEmployeeDeductions]);

  useEffect(() => {
    const t = window.setTimeout(async () => {
      if (!staffSearch.trim() || staffSearch.length < 2) {
        setStaffResults([]);
        return;
      }
      try {
        const rows = await searchPayrollStaff(staffSearch, 12);
        setStaffResults(rows);
      } catch {
        setStaffResults([]);
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [staffSearch]);

  const flash = (msg) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(''), 2800);
  };

  const persistTemplate = async (statusOverride) => {
    setSaving(true);
    try {
      const payload = {
        action: statusOverride === 'Active' ? 'activate' : 'save_draft',
        status: statusOverride || templateMeta.status,
        name: templateMeta.name,
        description: templateMeta.description,
        effectiveDate: templateMeta.effectiveDate,
        applyToAll,
        allowances: allowances.map(({ id, ...rest }) => ({ id, ...rest })),
        deductions: deductions.map(({ id, ...rest }) => ({ id, ...rest })),
        payeRates,
        statutory,
        rules: {
          gross: 'Basic Salary + All Allowances',
          base: 'Gross Salary - Transport Allowance',
          netBeforeCbhi: 'Gross - Employee RSSB - Maternity - RAMA - PAYE - Other Deductions',
          finalNet: 'Net Salary - CBHI',
        },
      };
      await savePayrollTemplate(payload);
      const history = await getPayrollTemplateHistory(15);
      setVersionHistory(history || []);
      setTemplateMeta((prev) => ({ ...prev, status: statusOverride || prev.status }));
      flash(statusOverride === 'Active' ? 'Template activated for all payroll runs.' : 'Template saved.');
    } catch {
      flash('Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const openEditAllowance = (a) => {
    setEditingAllowanceId(a.id);
    setAllowanceForm({
      category: a.category || a.name || 'Transport Allowance',
      customName: a.customName || '',
      amountType: a.amountType || a.type || 'Fixed Amount',
      value: a.value,
      taxTreatment: a.taxTreatment || (a.taxable === false ? 'Non-Taxable' : 'Taxable'),
      frequency: a.frequency || a.recurring || 'Monthly',
      appliesTo: a.appliesTo || 'All Employees',
      status: a.status || 'Active',
    });
    setShowAllowanceModal(true);
  };

  const saveAllowance = () => {
    const name = allowanceForm.category === 'Other' ? allowanceForm.customName : allowanceForm.category;
    const payload = {
      ...allowanceForm,
      name: name || allowanceForm.category,
      value: Number(allowanceForm.value || 0),
    };
    if (editingAllowanceId) {
      setAllowances((prev) => prev.map((a) => (a.id === editingAllowanceId ? { ...a, ...payload } : a)));
    } else {
      setAllowances((prev) => [...prev, { id: Date.now(), ...payload }]);
    }
    setEditingAllowanceId(null);
    setAllowanceForm(emptyAllowanceForm);
    setShowAllowanceModal(false);
  };

  const toggleAllowanceStatus = (id) => {
    setAllowances((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: String(a.status || 'Active').toLowerCase() === 'active' ? 'Inactive' : 'Active' }
          : a
      )
    );
  };

  const openEditDeduction = (d) => {
    setEditingDeductionId(d.id);
    setDeductionForm({
      category: d.category || d.name || 'SACCO',
      customName: d.customName || '',
      amountType: d.amountType || d.type || 'Fixed Amount',
      value: d.value,
      recurring: d.recurring || d.frequency || 'Monthly',
      appliesTo: d.appliesTo || 'All Employees',
      priority: d.priority || 'Medium',
      status: d.status || 'Active',
    });
    setShowDeductionModal(true);
  };

  const saveDeduction = () => {
    const name = deductionForm.category === 'Other' ? deductionForm.customName : deductionForm.category;
    const payload = {
      ...deductionForm,
      name: name || deductionForm.category,
      value: Number(deductionForm.value || 0),
    };
    if (editingDeductionId) {
      setDeductions((prev) => prev.map((d) => (d.id === editingDeductionId ? { ...d, ...payload } : d)));
    } else {
      setDeductions((prev) => [...prev, { id: Date.now(), ...payload }]);
    }
    setEditingDeductionId(null);
    setDeductionForm(emptyDeductionForm);
    setShowDeductionModal(false);
  };

  const saveEmpDeduction = async () => {
    const total = Number(empDedForm.totalAmount || 0);
    const months = Number(empDedForm.repaymentMonths || 0);
    let monthly = Number(empDedForm.monthlyInstallment || 0);
    if (!monthly && total && months) monthly = Math.round(total / months);
    const payload = {
      staffUserId: empDedForm.staffUserId || selectedStaff?.staffUserId,
      staffName: empDedForm.staffName || selectedStaff?.fullName || '',
      deductionType: empDedForm.deductionType,
      customName: empDedForm.deductionType === 'Other' ? empDedForm.customName : '',
      totalAmount: total,
      monthlyInstallment: monthly,
      repaymentMonths: months || null,
      startMonth: empDedForm.startMonth,
      startYear: empDedForm.startYear,
      remainingBalance: total,
      notes: empDedForm.notes,
      status: empDedForm.status,
    };
    if (!payload.staffUserId) {
      flash('Select an employee first.');
      return;
    }
    try {
      if (editingEmpDedId) {
        await updateEmployeePayrollDeduction(editingEmpDedId, payload);
      } else {
        await createEmployeePayrollDeduction(payload);
      }
      setShowEmpDedModal(false);
      setEditingEmpDedId(null);
      setEmpDedForm(emptyEmpDedForm);
      await loadEmployeeDeductions(selectedStaff?.staffUserId);
      flash('Employee deduction saved.');
    } catch {
      flash('Failed to save employee deduction.');
    }
  };

  const previewAfterLoan = payroll.finalNet - previewLoan;

  return (
    <div className="min-h-screen bg-slate-50 salary-template-scroll">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="pt-5 mb-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Payroll</p>
          <h1 className="text-2xl text-[#000435] mt-1" style={{ fontWeight: 700 }}>
            Salary Template Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Configure once: allowances, statutory rates, and payroll rules. Each month, run payroll — the system
            calculates gross, PAYE, RSSB, RAMA, CBHI, employer costs, and payslips automatically.
          </p>
        </div>

        <div className={`${cardClass()} p-3 sm:p-4 salary-template-sticky-actions mb-4`}>
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
              <input
                value={templateMeta.name}
                onChange={(e) => setTemplateMeta((p) => ({ ...p, name: e.target.value }))}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
                placeholder="Template name"
              />
              <input
                type="date"
                value={templateMeta.effectiveDate}
                onChange={(e) => setTemplateMeta((p) => ({ ...p, effectiveDate: e.target.value }))}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="accent-[#c87800]"
                />
                Apply to all active employees on payroll run
              </label>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => persistTemplate('Draft')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs"
                style={{ fontWeight: 600 }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => persistTemplate('Active')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs"
                style={{ fontWeight: 600 }}
              >
                <CheckCircle2 size={14} /> Activate Template
              </button>
            </div>
          </div>
          {loadingTemplate ? (
            <p className="text-xs text-slate-500 mt-2 inline-flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Loading template…
            </p>
          ) : null}
          {notice ? (
            <p className="text-xs text-emerald-700 mt-2 inline-flex items-center gap-1">
              <AlertCircle size={12} /> {notice}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
          <div className="space-y-4 min-w-0">
            <div className={`${cardClass()} p-2`}>
              <div className="flex flex-wrap gap-1">
                {TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActiveTab(t)}
                    className={`px-3 py-2 rounded-xl text-xs transition-colors ${
                      activeTab === t ? 'bg-[#c87800] text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    style={{ fontWeight: 600 }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'Allowances' ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs"
                    style={{ fontWeight: 600 }}
                  >
                    <Upload size={14} /> Import Allowances
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAllowanceId(null);
                      setAllowanceForm(emptyAllowanceForm);
                      setShowAllowanceModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#000435] text-white text-xs"
                    style={{ fontWeight: 600 }}
                  >
                    <Plus size={14} /> Add Allowance
                  </button>
                </div>
                <div className={`${cardClass()} overflow-auto`}>
                  <table className="w-full text-xs min-w-[640px]">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100">
                        <th className="text-left py-3 px-4">Allowance</th>
                        <th className="text-left py-3 px-4">Type</th>
                        <th className="text-left py-3 px-4">Value</th>
                        <th className="text-left py-3 px-4">Taxable</th>
                        <th className="text-left py-3 px-4">Frequency</th>
                        <th className="text-right py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {allowances.map((a) => (
                        <tr key={a.id} className={a.status === 'Inactive' ? 'opacity-50' : ''}>
                          <td className="py-3 px-4" style={{ fontWeight: 600 }}>
                            {allowanceDisplayName(a)}
                          </td>
                          <td className="py-3 px-4">{a.amountType || a.type}</td>
                          <td className="py-3 px-4">{formatAllowanceValue(a)}</td>
                          <td className="py-3 px-4">
                            {a.taxTreatment || (a.taxable === false ? 'No' : 'Yes')}
                          </td>
                          <td className="py-3 px-4">{a.frequency || a.recurring || 'Monthly'}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex gap-1">
                              <button type="button" onClick={() => openEditAllowance(a)} className="p-1.5 rounded-lg hover:bg-slate-100">
                                <Pencil size={13} />
                              </button>
                              <button type="button" onClick={() => toggleAllowanceStatus(a.id)} className="p-1.5 rounded-lg hover:bg-slate-100">
                                {a.status === 'Inactive' ? <ToggleLeft size={13} /> : <ToggleRight size={13} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => setAllowances((p) => p.filter((x) => x.id !== a.id))}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {activeTab === 'Deductions' ? (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDeductionId(null);
                      setDeductionForm(emptyDeductionForm);
                      setShowDeductionModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#000435] text-white text-xs"
                    style={{ fontWeight: 600 }}
                  >
                    <Plus size={14} /> Add Deduction
                  </button>
                </div>
                <div className={`${cardClass()} overflow-auto`}>
                  <table className="w-full text-xs min-w-[560px]">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100">
                        <th className="text-left py-3 px-4">Deduction</th>
                        <th className="text-left py-3 px-4">Type</th>
                        <th className="text-left py-3 px-4">Value</th>
                        <th className="text-left py-3 px-4">Frequency</th>
                        <th className="text-right py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {deductions.map((d) => (
                        <tr key={d.id}>
                          <td className="py-3 px-4" style={{ fontWeight: 600 }}>
                            {deductionDisplayName(d)}
                          </td>
                          <td className="py-3 px-4">{d.amountType || d.type}</td>
                          <td className="py-3 px-4">{formatAllowanceValue(d)}</td>
                          <td className="py-3 px-4">{d.recurring || d.frequency || 'Monthly'}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex gap-1">
                              <button type="button" onClick={() => openEditDeduction(d)} className="p-1.5 rounded-lg hover:bg-slate-100">
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeductions((p) => p.filter((x) => x.id !== d.id))}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {activeTab === 'Statutory Rates' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className={`${cardClass()} p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm text-[#000435] inline-flex items-center gap-1.5" style={{ fontWeight: 700 }}>
                      <ShieldCheck size={15} /> PAYE Brackets
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowPAYEModal(true)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600"
                    >
                      Edit PAYE Rates
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">Calculated progressively from Basic Salary.</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400">
                        <th className="text-left py-2">Min</th>
                        <th className="text-left py-2">Max</th>
                        <th className="text-left py-2">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payeRates.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2">{Number(r.min).toLocaleString()}</td>
                          <td className="py-2">{r.max == null ? 'Unlimited' : Number(r.max).toLocaleString()}</td>
                          <td className="py-2">{r.rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {[
                  {
                    title: 'RSSB Pension',
                    base: 'Gross Salary',
                    rows: [
                      ['Employee', `${statutory.rssbEmployee}%`],
                      ['Employer', `${statutory.rssbEmployer}%`],
                    ],
                    keys: ['rssbEmployee', 'rssbEmployer'],
                  },
                  {
                    title: 'Occupational Hazard',
                    base: 'Base Salary (= Gross − Transport)',
                    rows: [['Employer only', `${statutory.occupationalHazard}%`]],
                    keys: ['occupationalHazard'],
                  },
                  {
                    title: 'Maternity Leave',
                    base: 'Gross Salary',
                    rows: [
                      ['Employee', `${statutory.maternityEmployee}%`],
                      ['Employer', `${statutory.maternityEmployer}%`],
                    ],
                    keys: ['maternityEmployee', 'maternityEmployer'],
                  },
                  {
                    title: 'RAMA',
                    base: 'Basic Salary',
                    rows: [
                      ['Employee', `${statutory.ramaEmployee}%`],
                      ['Employer', `${statutory.ramaEmployer}%`],
                    ],
                    keys: ['ramaEmployee', 'ramaEmployer'],
                  },
                  {
                    title: 'CBHI / Mutuelle',
                    base: 'Net Salary (before CBHI)',
                    rows: [['Employee', `${statutory.cbhi}%`]],
                    keys: ['cbhi'],
                  },
                ].map((block) => (
                  <div key={block.title} className={`${cardClass()} p-4`}>
                    <h3 className="text-sm text-[#000435]" style={{ fontWeight: 700 }}>
                      {block.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Base: {block.base}</p>
                    <div className="mt-3 space-y-2">
                      {block.rows.map(([label, val], idx) => (
                        <div key={label} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-500">{label}</span>
                          <input
                            type="number"
                            step="0.1"
                            value={statutory[block.keys[idx]]}
                            onChange={(e) =>
                              setStatutory((p) => ({ ...p, [block.keys[idx]]: Number(e.target.value || 0) }))
                            }
                            className="w-20 px-2 py-1 rounded-lg border border-slate-200 text-right"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {activeTab === 'Employee Deductions' ? (
              <div className="space-y-3">
                <div className={`${cardClass()} p-4`}>
                  <p className="text-xs text-slate-500 mb-2">Search employee (code, name)</p>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      placeholder="Search employee…"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  {staffResults.length > 0 ? (
                    <div className="mt-2 border border-slate-100 rounded-xl divide-y divide-slate-50 max-h-40 overflow-auto">
                      {staffResults.map((s) => (
                        <button
                          key={s.staffUserId}
                          type="button"
                          onClick={() => {
                            setSelectedStaff(s);
                            setStaffSearch(s.fullName);
                            setStaffResults([]);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50"
                        >
                          <span style={{ fontWeight: 600 }}>{s.fullName}</span>
                          <span className="text-slate-400 ml-2">{s.staffCode}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {selectedStaff ? (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-start gap-2">
                      <User size={16} className="text-[#c87800] shrink-0 mt-0.5" />
                      <div>
                        <p style={{ fontWeight: 700 }}>{selectedStaff.fullName}</p>
                        <p className="text-slate-500">
                          {selectedStaff.department} · {selectedStaff.position}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmpDedId(null);
                      setEmpDedForm({
                        ...emptyEmpDedForm,
                        staffUserId: selectedStaff?.staffUserId,
                        staffName: selectedStaff?.fullName || '',
                      });
                      setShowEmpDedModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#000435] text-white text-xs"
                    style={{ fontWeight: 600 }}
                  >
                    <Plus size={14} /> Add Employee Deduction
                  </button>
                </div>

                <div className={`${cardClass()} overflow-auto`}>
                  {empDedLoading ? (
                    <p className="p-4 text-xs text-slate-500 inline-flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" /> Loading…
                    </p>
                  ) : (
                    <table className="w-full text-xs min-w-[720px]">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100">
                          <th className="text-left py-3 px-4">Employee</th>
                          <th className="text-left py-3 px-4">Deduction</th>
                          <th className="text-left py-3 px-4">Balance</th>
                          <th className="text-left py-3 px-4">Monthly</th>
                          <th className="text-left py-3 px-4">Status</th>
                          <th className="text-right py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {employeeDeductions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No employee deductions yet. Add loans, advances, or custom deductions per staff.
                            </td>
                          </tr>
                        ) : (
                          employeeDeductions.map((d) => (
                            <tr key={d.id}>
                              <td className="py-3 px-4">{d.staffName}</td>
                              <td className="py-3 px-4">
                                {d.deductionType === 'Other' ? d.customName : d.deductionType}
                              </td>
                              <td className="py-3 px-4">{fmtRwf(d.remainingBalance)}</td>
                              <td className="py-3 px-4">{fmtRwf(d.monthlyInstallment)}</td>
                              <td className="py-3 px-4">{d.status}</td>
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingEmpDedId(d.id);
                                      setEmpDedForm({
                                        staffUserId: d.staffUserId,
                                        staffName: d.staffName,
                                        deductionType: d.deductionType,
                                        customName: d.customName,
                                        totalAmount: d.totalAmount,
                                        monthlyInstallment: d.monthlyInstallment,
                                        repaymentMonths: d.repaymentMonths || '',
                                        startMonth: d.startMonth || 1,
                                        startYear: d.startYear || 2026,
                                        notes: d.notes,
                                        status: d.status,
                                      });
                                      setShowEmpDedModal(true);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-slate-100"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await deleteEmployeePayrollDeduction(d.id);
                                      loadEmployeeDeductions(selectedStaff?.staffUserId);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : null}

            <div className={`${cardClass()} p-4`}>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2 inline-flex items-center gap-1">
                <History size={12} /> Version History
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                {(versionHistory.length ? versionHistory : [{ version: 1, status: 'Draft' }]).map((v) => (
                  <span
                    key={v.id || v.version}
                    className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 text-slate-600"
                  >
                    v{v.version} · {v.status}
                    {v.isActive ? ' ✓' : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <aside className="xl:sticky xl:top-20 xl:self-start space-y-3">
            <div className={`${cardClass()} p-4 salary-template-preview-panel`}>
              <h3 className="text-sm text-[#000435] inline-flex items-center gap-1.5" style={{ fontWeight: 700 }}>
                <Calculator size={15} /> Live Formula Preview
              </h3>
              <label className="block mt-3 text-[11px] uppercase text-slate-400">Test Basic Salary</label>
              <input
                type="number"
                value={basicSalaryTest}
                onChange={(e) => setBasicSalaryTest(Number(e.target.value || 0))}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <label className="block mt-2 text-[11px] uppercase text-slate-400">Sample loan (monthly)</label>
              <input
                type="number"
                value={previewLoan}
                onChange={(e) => setPreviewLoan(Number(e.target.value || 0))}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm"
                placeholder="0"
              />

              <div className="mt-4 text-[11px] font-mono space-y-2 text-slate-600 border-t border-slate-100 pt-3">
                <p className="text-slate-400 uppercase tracking-wide text-[10px]">Payroll configuration</p>
                <p>Gross = Basic + Allowances → <strong className="text-[#000435]">{fmtRwf(payroll.grossSalary)}</strong></p>
                <p>Base = Gross − Transport → <strong className="text-[#000435]">{fmtRwf(payroll.baseSalary)}</strong></p>

                <p className="text-slate-400 uppercase tracking-wide text-[10px] pt-2">Employee deductions</p>
                <p>RSSB 6% gross → {fmtRwf(payroll.rssbEmployee)}</p>
                <p>Maternity 0.3% gross → {fmtRwf(payroll.maternityEmployee)}</p>
                <p>RAMA 7.5% basic → {fmtRwf(payroll.ramaEmployee)}</p>
                <p>PAYE (basic) → {fmtRwf(payroll.paye)}</p>
                <p>Other → {fmtRwf(payroll.otherDeductions)}</p>
                <p>Net before CBHI → {fmtRwf(payroll.netBeforeCbhi)}</p>
                <p>CBHI 0.5% net → {fmtRwf(payroll.cbhi)}</p>
                <p className="text-emerald-700 text-sm pt-1" style={{ fontWeight: 700 }}>
                  Final Net: {fmtRwf(payroll.finalNet)}
                </p>
                {previewLoan > 0 ? (
                  <p className="text-amber-700">After loan: {fmtRwf(previewAfterLoan)}</p>
                ) : null}

                <p className="text-slate-400 uppercase tracking-wide text-[10px] pt-2">Employer (not deducted)</p>
                <p>RSSB → {fmtRwf(payroll.rssbEmployer)}</p>
                <p>Maternity → {fmtRwf(payroll.maternityEmployer)}</p>
                <p>RAMA → {fmtRwf(payroll.ramaEmployer)}</p>
                <p>Occupational hazard → {fmtRwf(payroll.occupationalHazard)}</p>
                <p className="text-[#000435]" style={{ fontWeight: 700 }}>
                  Cost to school: {fmtRwf(payroll.totalCostToSchool)}
                </p>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-[#000435] text-white text-[10px] leading-relaxed font-mono whitespace-pre-wrap">
                {`═══════════════════════════════
PAYROLL CONFIGURATION
Gross = Basic + Allowances
Base = Gross - Transport
═══════════════════════════════
EMPLOYEE DEDUCTIONS
RSSB 6% · Maternity 0.3%
RAMA 7.5% basic · PAYE brackets
CBHI 0.5% of net
═══════════════════════════════
EMPLOYER
RSSB · Maternity · RAMA
Occupational Hazard 2% base
═══════════════════════════════`}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {showAllowanceModal ? (
        <Modal title={editingAllowanceId ? 'Edit Allowance' : 'Add Allowance'} onClose={() => setShowAllowanceModal(false)}>
          <div className="space-y-3 text-sm">
            <Field label="Allowance Category">
              <select
                value={allowanceForm.category}
                onChange={(e) => setAllowanceForm((p) => ({ ...p, category: e.target.value }))}
                className="field-input"
              >
                {ALLOWANCE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            {allowanceForm.category === 'Other' ? (
              <Field label="Specify Allowance Name">
                <input
                  value={allowanceForm.customName}
                  onChange={(e) => setAllowanceForm((p) => ({ ...p, customName: e.target.value }))}
                  className="field-input"
                  placeholder="e.g. Research Allowance"
                />
              </Field>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount Type">
                <select
                  value={allowanceForm.amountType}
                  onChange={(e) => setAllowanceForm((p) => ({ ...p, amountType: e.target.value }))}
                  className="field-input"
                >
                  {['Fixed Amount', 'Percentage of Basic Salary', 'Percentage of Gross Salary'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Value">
                <input
                  type="number"
                  value={allowanceForm.value}
                  onChange={(e) => setAllowanceForm((p) => ({ ...p, value: e.target.value }))}
                  className="field-input"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tax Treatment">
                <select
                  value={allowanceForm.taxTreatment}
                  onChange={(e) => setAllowanceForm((p) => ({ ...p, taxTreatment: e.target.value }))}
                  className="field-input"
                >
                  {['Taxable', 'Non-Taxable'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Frequency">
                <select
                  value={allowanceForm.frequency}
                  onChange={(e) => setAllowanceForm((p) => ({ ...p, frequency: e.target.value }))}
                  className="field-input"
                >
                  {['Monthly', 'Quarterly', 'Yearly', 'One-Time'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Applies To">
              <select
                value={allowanceForm.appliesTo}
                onChange={(e) => setAllowanceForm((p) => ({ ...p, appliesTo: e.target.value }))}
                className="field-input"
              >
                {['All Employees', 'Specific Department', 'Specific Position'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={allowanceForm.status}
                onChange={(e) => setAllowanceForm((p) => ({ ...p, status: e.target.value }))}
                className="field-input"
              >
                {['Active', 'Inactive'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <button type="button" onClick={saveAllowance} className="w-full py-2.5 rounded-xl bg-[#000435] text-white text-sm">
              Save Allowance
            </button>
          </div>
        </Modal>
      ) : null}

      {showDeductionModal ? (
        <Modal title={editingDeductionId ? 'Edit Deduction' : 'Add Deduction'} onClose={() => setShowDeductionModal(false)}>
          <div className="space-y-3 text-sm">
            <Field label="Deduction Category">
              <select
                value={deductionForm.category}
                onChange={(e) => setDeductionForm((p) => ({ ...p, category: e.target.value }))}
                className="field-input"
              >
                {DEDUCTION_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            {deductionForm.category === 'Other' ? (
              <Field label="Specify Deduction Name">
                <input
                  value={deductionForm.customName}
                  onChange={(e) => setDeductionForm((p) => ({ ...p, customName: e.target.value }))}
                  className="field-input"
                />
              </Field>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount Type">
                <select
                  value={deductionForm.amountType}
                  onChange={(e) => setDeductionForm((p) => ({ ...p, amountType: e.target.value }))}
                  className="field-input"
                >
                  {['Fixed Amount', 'Percentage of Basic', 'Percentage of Gross'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Value">
                <input
                  type="number"
                  value={deductionForm.value}
                  onChange={(e) => setDeductionForm((p) => ({ ...p, value: e.target.value }))}
                  className="field-input"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Recurring">
                <select
                  value={deductionForm.recurring}
                  onChange={(e) => setDeductionForm((p) => ({ ...p, recurring: e.target.value }))}
                  className="field-input"
                >
                  {['Monthly', 'One-Time'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <select
                  value={deductionForm.priority}
                  onChange={(e) => setDeductionForm((p) => ({ ...p, priority: e.target.value }))}
                  className="field-input"
                >
                  {['High', 'Medium', 'Low'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>
            <button type="button" onClick={saveDeduction} className="w-full py-2.5 rounded-xl bg-[#000435] text-white text-sm">
              Save Deduction
            </button>
          </div>
        </Modal>
      ) : null}

      {showPAYEModal ? (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
            <ModalHeader title="Edit PAYE Rates" onClose={() => setShowPAYEModal(false)} />
            <div className="mt-4 space-y-2">
              {payeRates.map((r) => (
                <div key={r.id} className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={r.min}
                    onChange={(e) =>
                      setPayeRates((p) => p.map((x) => (x.id === r.id ? { ...x, min: Number(e.target.value || 0) } : x)))
                    }
                    className="field-input"
                  />
                  <input
                    type="number"
                    value={r.max ?? ''}
                    onChange={(e) =>
                      setPayeRates((p) =>
                        p.map((x) =>
                          x.id === r.id ? { ...x, max: e.target.value === '' ? null : Number(e.target.value) } : x
                        )
                      )
                    }
                    placeholder="Unlimited"
                    className="field-input"
                  />
                  <input
                    type="number"
                    value={r.rate}
                    onChange={(e) =>
                      setPayeRates((p) => p.map((x) => (x.id === r.id ? { ...x, rate: Number(e.target.value || 0) } : x)))
                    }
                    className="field-input"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowPAYEModal(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-[#000435] text-white text-sm"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}

      {showEmpDedModal ? (
        <Modal title={editingEmpDedId ? 'Edit Employee Deduction' : 'Add Employee Deduction'} onClose={() => setShowEmpDedModal(false)}>
          <div className="space-y-3 text-sm">
            <Field label="Deduction Type">
              <select
                value={empDedForm.deductionType}
                onChange={(e) => setEmpDedForm((p) => ({ ...p, deductionType: e.target.value }))}
                className="field-input"
              >
                {DEDUCTION_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            {empDedForm.deductionType === 'Other' ? (
              <Field label="Specify Name">
                <input
                  value={empDedForm.customName}
                  onChange={(e) => setEmpDedForm((p) => ({ ...p, customName: e.target.value }))}
                  className="field-input"
                />
              </Field>
            ) : null}
            <Field label="Total Amount (RWF)">
              <input
                type="number"
                value={empDedForm.totalAmount}
                onChange={(e) => setEmpDedForm((p) => ({ ...p, totalAmount: e.target.value }))}
                className="field-input"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Monthly Installment">
                <input
                  type="number"
                  value={empDedForm.monthlyInstallment}
                  onChange={(e) => setEmpDedForm((p) => ({ ...p, monthlyInstallment: e.target.value }))}
                  className="field-input"
                />
              </Field>
              <Field label="Repayment Months">
                <input
                  type="number"
                  value={empDedForm.repaymentMonths}
                  onChange={(e) => setEmpDedForm((p) => ({ ...p, repaymentMonths: e.target.value }))}
                  className="field-input"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Month">
                <select
                  value={empDedForm.startMonth}
                  onChange={(e) => setEmpDedForm((p) => ({ ...p, startMonth: Number(e.target.value) }))}
                  className="field-input"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {monthName(m)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Start Year">
                <input
                  type="number"
                  value={empDedForm.startYear}
                  onChange={(e) => setEmpDedForm((p) => ({ ...p, startYear: Number(e.target.value) }))}
                  className="field-input"
                />
              </Field>
            </div>
            <Field label="Notes">
              <textarea
                value={empDedForm.notes}
                onChange={(e) => setEmpDedForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="field-input resize-none"
              />
            </Field>
            {empDedForm.totalAmount && empDedForm.monthlyInstallment ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs">
                <p>
                  Payroll impact preview: current net ~{fmtRwf(payroll.finalNet)} → after deduction{' '}
                  {fmtRwf(Math.max(0, payroll.finalNet - Number(empDedForm.monthlyInstallment || 0)))}
                </p>
              </div>
            ) : null}
            <button type="button" onClick={saveEmpDeduction} className="w-full py-2.5 rounded-xl bg-[#000435] text-white text-sm">
              Save Deduction
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex justify-end">
      <div className="w-full max-w-lg bg-white h-full p-5 overflow-y-auto shadow-xl">
        <ModalHeader title={title} onClose={onClose} />
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-base text-[#000435]" style={{ fontWeight: 700 }}>
        {title}
      </h3>
      <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
        <X size={18} />
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-[11px] uppercase text-slate-400 mb-1">{label}</p>
      {children}
    </div>
  );
}
