import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  RefreshCw, CheckCircle, AlertCircle, Plus, Trash2, X,
  ChevronDown, Users, Zap, Settings, Loader2, Download, FileSpreadsheet, Pencil,
  ExternalLink, Power,
} from "lucide-react";
import { buildPayrollPreviewRows, mergeAllowancesWithExtras, mergeEmployeeDeductionsWithExtras } from "../../utils/payrollPreview";
import { calcRwandaPayroll, shouldUseSchoolAutoAllowances } from "../../utils/rwandaPayrollEngine";
import { getStaffAllowanceSplit, normalizeAllowanceSplit } from "../../utils/payrollStaffAllowances";
import { filterPayrollEmployeeDeductions } from "../../utils/payrollEmployeeDeductions";
import { getEmployeePayrollDeductions } from "../../services/payrollTemplateService";
import { getPayrollRuns, isPayrollRunPaid, triggerPayrollRun } from "../../services/payrollRunService";
import { listTerminationsForPayrollMonth } from "../../services/terminationBenefitsService";
import {
  mapApiLineToRegisterRow,
  sumPayrollRegisterRows,
} from "../../utils/payrollRegister";
import PayrollReportRegisterTable from "../../components/PayrollReportRegisterTable";
import {
  buildPreviewReportRows,
  enrichRegisterRowForReports,
  resolveRunReportColumns,
  sumRunReportRows,
} from "../../utils/payrollReportTables";
import { downloadRunPayrollRegisterExcel } from "../../utils/payrollReportExport";
import api from "../../services/api";
import AccountantOchreHero from "../../components/AccountantOchreHero";
import StaffToProcessModal from "../../components/payroll/StaffToProcessModal";
import {
  parseManagerAcademicSettings,
  termsForRegistryYear,
  inferCurrentTerm,
  yearOptionLabel,
  resolvePayrollCalendarYear,
} from "../../utils/academicCalendarFilters";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toPayrollYear(academicYear, month) {
  return resolvePayrollCalendarYear(academicYear, month);
}

function emptyAdj() {
  return {
    extraAllowances: [],
    extraDeductions: [],
    basicSalaryOverride: null,
    allowanceSplit: null,
  };
}

function splitHasValues(split) {
  const n = normalizeAllowanceSplit(split);
  return !!n?.hasStored;
}

const RUN_ALLOWANCE_TYPES = [
  "Fixed Amount",
  "Percentage of Basic Salary",
  "Percentage of Gross Salary",
];

const RUN_DEDUCTION_TYPES = ["Fixed Amount", "Percentage of Basic"];

function cloneAllowancesFromTemplate(tpl) {
  return (tpl?.allowances || [])
    .filter((a) => String(a.status || "Active").toLowerCase() === "active")
    .map((a, i) => ({
      id: a.id || `run-a-${i}`,
      category: a.category || a.name || "Allowance",
      name: a.name || a.category || "Allowance",
      amountType: a.amountType || "Fixed Amount",
      value: Number(a.value || 0),
      payrollChannel: a.payrollChannel || a.payroll_channel || "tax",
      status: "Active",
    }));
}

function cloneDeductionsFromTemplate(tpl) {
  return (tpl?.deductions || [])
    .filter((d) => String(d.status || "Active").toLowerCase() === "active")
    .map((d, i) => ({
      id: d.id || `run-d-${i}`,
      category: d.category || d.name || "Deduction",
      name: d.name || d.category || "Deduction",
      amountType: d.amountType || "Fixed Amount",
      value: Number(d.value || 0),
      payrollChannel: d.payrollChannel || d.payroll_channel || "tax",
      status: "Active",
    }));
}

function allowancesForRunApi(list) {
  return (list || []).map((a) => ({
    category: a.category || a.name,
    name: a.name || a.category,
    amountType: a.amountType || "Fixed Amount",
    value: Number(a.value || 0),
    payrollChannel: a.payrollChannel || "tax",
    status: "Active",
  }));
}

function deductionsForRunApi(list) {
  return (list || []).map((d) => ({
    category: d.category || d.name,
    name: d.name || d.category,
    amountType: d.amountType || "Fixed Amount",
    value: Number(d.value || 0),
    payrollChannel: d.payrollChannel || "tax",
    status: "Active",
  }));
}

function FieldSelect({ label, value, onChange, options, disabled, hint }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">
        {label}
        {hint ? <span className="normal-case tracking-normal text-slate-400 font-medium"> · {hint}</span> : null}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#000435] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/40 focus:border-[#F59E0B] disabled:opacity-60 disabled:cursor-not-allowed pr-10"
        >
          {options.map((o) => (
            <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
              {typeof o === "string" ? o : o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </label>
  );
}

function RunLevelAdjustments({ allowances, setAllowances, deductions, setDeductions }) {
  const [panelTab, setPanelTab] = useState("allowances");

  const updateAllowance = (id, field, value) => {
    setAllowances((list) => list.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };
  const updateDeduction = (id, field, value) => {
    setDeductions((list) => list.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <p className="text-sm font-bold text-[#000435]">Adjust this payroll run</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Edit allowances and deductions for this month only — register recalculates instantly. Does not change Salary Template unless you save there.
        </p>
        <div className="flex gap-2 mt-3">
          {[
            { key: "allowances", label: `Allowances (${allowances.length})` },
            { key: "deductions", label: `Deductions (${deductions.length})` },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setPanelTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                panelTab === t.key ? "bg-[#000435] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        {panelTab === "allowances" ? (
          <div className="space-y-2">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setAllowances((p) => [...p, {
                  id: `run-a-${Date.now()}`,
                  category: "Bonus",
                  name: "Bonus",
                  amountType: "Fixed Amount",
                  value: 0,
                  status: "Active",
                }])}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#F59E0B]"
              >
                <Plus size={14} /> Add allowance
              </button>
            </div>
            {allowances.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No allowances — add one or load from template on refresh.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th className="text-left p-2 font-semibold">Name</th>
                      <th className="text-left p-2 font-semibold">Type</th>
                      <th className="text-left p-2 font-semibold">Value</th>
                      <th className="p-2 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {allowances.map((a) => (
                      <tr key={a.id} className="border-t border-slate-100">
                        <td className="p-2">
                          <input
                            value={a.name || a.category}
                            onChange={(e) => {
                              const v = e.target.value;
                              setAllowances((list) => list.map((x) => (
                                x.id === a.id ? { ...x, name: v, category: v } : x
                              )));
                            }}
                            className="w-full min-w-[120px] rounded-lg border border-slate-200 px-2 py-1.5"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={a.amountType}
                            onChange={(e) => updateAllowance(a.id, "amountType", e.target.value)}
                            className="w-full min-w-[140px] rounded-lg border border-slate-200 px-2 py-1.5"
                          >
                            {RUN_ALLOWANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            value={a.value}
                            onChange={(e) => updateAllowance(a.id, "value", Number(e.target.value.replace(/[^\d.]/g, "")) || 0)}
                            className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 tabular-nums"
                          />
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Remove allowance "${a.name}" for this run?`)) {
                                setAllowances((p) => p.filter((x) => x.id !== a.id));
                              }
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setDeductions((p) => [...p, {
                  id: `run-d-${Date.now()}`,
                  category: "SACCO",
                  name: "SACCO",
                  amountType: "Fixed Amount",
                  value: 0,
                  status: "Active",
                }])}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#F59E0B]"
              >
                <Plus size={14} /> Add deduction
              </button>
            </div>
            {deductions.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No template deductions for this run.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th className="text-left p-2 font-semibold">Name</th>
                      <th className="text-left p-2 font-semibold">Type</th>
                      <th className="text-left p-2 font-semibold">Value</th>
                      <th className="p-2 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {deductions.map((d) => (
                      <tr key={d.id} className="border-t border-slate-100">
                        <td className="p-2">
                          <input
                            value={d.name || d.category}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDeductions((list) => list.map((x) => (
                                x.id === d.id ? { ...x, name: v, category: v } : x
                              )));
                            }}
                            className="w-full min-w-[120px] rounded-lg border border-slate-200 px-2 py-1.5"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={d.amountType}
                            onChange={(e) => updateDeduction(d.id, "amountType", e.target.value)}
                            className="w-full min-w-[120px] rounded-lg border border-slate-200 px-2 py-1.5"
                          >
                            {RUN_DEDUCTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            value={d.value}
                            onChange={(e) => updateDeduction(d.id, "value", Number(e.target.value.replace(/[^\d.]/g, "")) || 0)}
                            className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 tabular-nums"
                          />
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Remove deduction "${d.name}" for this run?`)) {
                                setDeductions((p) => p.filter((x) => x.id !== d.id));
                              }
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeeAdjustModal({
  employee,
  adjustment,
  onSave,
  onClose,
  runOverrides,
  templateConfig,
  empDeductions,
  staffRecord,
}) {
  const storedStaffSplit = getStaffAllowanceSplit(staffRecord || {});
  const initialSplit = adjustment?.allowanceSplit || (storedStaffSplit.hasStored ? storedStaffSplit : null);
  const [allowanceEach, setAllowanceEach] = useState(
    initialSplit && initialSplit.transport === initialSplit.housing && initialSplit.housing === initialSplit.others
      ? String(initialSplit.transport || "")
      : ""
  );
  const [transportAmt, setTransportAmt] = useState(initialSplit ? String(initialSplit.transport || "") : "");
  const [housingAmt, setHousingAmt] = useState(initialSplit ? String(initialSplit.housing || "") : "");
  const [othersAmt, setOthersAmt] = useState(initialSplit ? String(initialSplit.others || "") : "");
  const [extraAllowances, setExtraAllowances] = useState(adjustment?.extraAllowances || []);
  const [extraDeductions, setExtraDeductions] = useState(adjustment?.extraDeductions || []);
  const [basicOverride, setBasicOverride] = useState(
    adjustment?.basicSalaryOverride
      ? String(adjustment.basicSalaryOverride)
      : (employee?.basic ? String(employee.basic) : "")
  );

  const addAllowance = () => setExtraAllowances((p) => [...p, { label: "Bonus", amount: "" }]);
  const addDeduction = () => setExtraDeductions((p) => [...p, { label: "Other", amount: "" }]);

  const schoolAllowanceAuto = shouldUseSchoolAutoAllowances(
    [],
    templateConfig?.rules?.allowanceAuto || {},
    { runAllowances: runOverrides?.allowances }
  );

  const parsedAllowanceSplit = useMemo(() => {
    const each = Number(String(allowanceEach).replace(/,/g, "")) || 0;
    if (each > 0) return normalizeAllowanceSplit({ allowanceEach: each });
    return normalizeAllowanceSplit({
      transport: Number(String(transportAmt).replace(/,/g, "")) || 0,
      housing: Number(String(housingAmt).replace(/,/g, "")) || 0,
      others: Number(String(othersAmt).replace(/,/g, "")) || 0,
    });
  }, [allowanceEach, transportAmt, housingAmt, othersAmt]);

  const parsedExtras = useMemo(() => ({
    extraAllowances: extraAllowances
      .map((a) => ({ label: String(a.label || "Allowance").trim(), amount: Number(String(a.amount).replace(/,/g, "")) || 0 }))
      .filter((a) => a.amount > 0),
    extraDeductions: extraDeductions
      .map((d) => ({ label: String(d.label || "Deduction").trim(), amount: Number(String(d.amount).replace(/,/g, "")) || 0 }))
      .filter((d) => d.amount > 0),
  }), [extraAllowances, extraDeductions]);

  const liveCalc = useMemo(() => {
    const storedBasic = Number(employee?.basic || 0);
    const overrideNum = Number(String(basicOverride).replace(/,/g, "")) || 0;
    const basic = overrideNum > 0 ? overrideNum : storedBasic;
    if (!basic) return null;
    const staffId = Number(employee?.id);
    const storedDed = filterPayrollEmployeeDeductions(
      (empDeductions || []).filter((d) => Number(d.staffUserId) === staffId)
    );
    const useManualSplit = !!parsedAllowanceSplit?.hasStored;
    const baseAllowances = useManualSplit || !schoolAllowanceAuto ? [] : (runOverrides?.allowances || []);
    const allowances = mergeAllowancesWithExtras(baseAllowances, parsedExtras.extraAllowances);
    const employeeSpecific = mergeEmployeeDeductionsWithExtras(
      storedDed,
      parsedExtras.extraDeductions
    );
    return calcRwandaPayroll({
      basicSalary: basic,
      allowances,
      storedAllowanceSplit: parsedAllowanceSplit || undefined,
      templateDeductions: runOverrides?.deductions || [],
      employeeDeductions: employeeSpecific,
      statutory: templateConfig?.statutory || {},
      payeRates: templateConfig?.payeRates,
      allowanceRules: templateConfig?.rules?.allowanceAuto || {},
      runAllowances: parsedAllowanceSplit?.hasStored ? [] : runOverrides?.allowances,
      forceManualAllowances: parsedAllowanceSplit?.hasStored,
    });
  }, [employee, basicOverride, parsedExtras, parsedAllowanceSplit, runOverrides, templateConfig, empDeductions, schoolAllowanceAuto]);

  const save = () => {
    const storedBasic = Number(employee?.basic || 0);
    const overrideNum = Number(String(basicOverride).replace(/,/g, "")) || 0;
    const basicSalaryOverride = overrideNum > 0 && overrideNum !== storedBasic ? overrideNum : null;
    onSave({
      ...parsedExtras,
      basicSalaryOverride,
      allowanceSplit: parsedAllowanceSplit,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000435]/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#000435]">Adjust payroll — {employee?.name}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Override basic or set Transport / Housing / Others for this employee only (this run). Leave empty to use auto from basic or imported amounts.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <section>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Basic salary (this run)</p>
            <input
              value={basicOverride}
              onChange={(e) => setBasicOverride(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="RWF"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold tabular-nums"
            />
            {liveCalc ? (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                {[
                  { label: "Gross", value: liveCalc.grossSalary },
                  { label: "PAYE", value: liveCalc.paye },
                  { label: "CSR 6%", value: liveCalc.rssbEmployee },
                  { label: "Net pay", value: liveCalc.finalNet },
                ].map((c) => (
                  <div key={c.label} className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-2">
                    <p className="text-slate-400 font-semibold uppercase">{c.label}</p>
                    <p className="font-bold text-[#000435] tabular-nums">{Number(c.value || 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
          <section>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Register allowances (this employee, this run)</p>
            <p className="text-[11px] text-slate-500 mb-3">
              Same as spreadsheet: Others, H/A and T/A are usually equal. One amount fills all three, or enter each column.
              {storedStaffSplit.hasStored && !adjustment?.allowanceSplit ? (
                <span className="block mt-1 text-emerald-700 font-medium">
                  Imported/stored: T/A {storedStaffSplit.transport.toLocaleString()}, H/A {storedStaffSplit.housing.toLocaleString()}, Others {storedStaffSplit.others.toLocaleString()}
                </span>
              ) : null}
            </p>
            <label className="block mb-3">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Same amount for T/A, H/A &amp; Others</span>
              <input
                value={allowanceEach}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, "");
                  setAllowanceEach(v);
                  if (v) {
                    setTransportAmt(v);
                    setHousingAmt(v);
                    setOthersAmt(v);
                  }
                }}
                placeholder="e.g. 78488"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold tabular-nums"
              />
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: "T/A", value: transportAmt, set: setTransportAmt },
                { label: "H/A", value: housingAmt, set: setHousingAmt },
                { label: "Others", value: othersAmt, set: setOthersAmt },
              ].map((f) => (
                <label key={f.label} className="block">
                  <span className="text-[10px] font-semibold text-slate-500">{f.label}</span>
                  <input
                    value={f.value}
                    onChange={(e) => {
                      f.set(e.target.value.replace(/[^\d]/g, ""));
                      setAllowanceEach("");
                    }}
                    placeholder="RWF"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs tabular-nums"
                  />
                </label>
              ))}
            </div>
          </section>
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Extra allowances (bonus, etc.)</p>
              <button type="button" onClick={addAllowance} className="text-xs font-semibold text-[#F59E0B] inline-flex items-center gap-1">
                <Plus size={14} /> Add
              </button>
            </div>
            {extraAllowances.length === 0 ? (
              <p className="text-xs text-slate-400">Optional — added on top of register allowances above.</p>
            ) : (
              <div className="space-y-2">
                {extraAllowances.map((a, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={a.label}
                      onChange={(e) => setExtraAllowances((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                      placeholder="Label"
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      value={a.amount}
                      onChange={(e) => setExtraAllowances((p) => p.map((x, j) => (j === i ? { ...x, amount: e.target.value.replace(/\D/g, "") } : x)))}
                      placeholder="RWF"
                      className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums"
                    />
                    <button type="button" onClick={() => setExtraAllowances((p) => p.filter((_, j) => j !== i))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Extra deductions</p>
              <button type="button" onClick={addDeduction} className="text-xs font-semibold text-[#F59E0B] inline-flex items-center gap-1">
                <Plus size={14} /> Add
              </button>
            </div>
            {extraDeductions.length === 0 ? (
              <p className="text-xs text-slate-400">No extra deductions — template & loan deductions still apply.</p>
            ) : (
              <div className="space-y-2">
                {extraDeductions.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={d.label}
                      onChange={(e) => setExtraDeductions((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                      placeholder="Label"
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      value={d.amount}
                      onChange={(e) => setExtraDeductions((p) => p.map((x, j) => (j === i ? { ...x, amount: e.target.value.replace(/\D/g, "") } : x)))}
                      placeholder="RWF"
                      className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums"
                    />
                    <button type="button" onClick={() => setExtraDeductions((p) => p.filter((_, j) => j !== i))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
          <button type="button" onClick={save} className="px-4 py-2 rounded-xl bg-[#000435] text-white text-sm font-bold">Apply & recalculate</button>
        </div>
      </div>
    </div>
  );
}

export default function PayrollRun() {
  const [academicYear, setAcademicYear] = useState("");
  const [term, setTerm] = useState("");
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [academicRegistry, setAcademicRegistry] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [academicLoaded, setAcademicLoaded] = useState(false);

  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [payrollData, setPayrollData] = useState([]);
  const [savedRunId, setSavedRunId] = useState(null);
  const [templateConfig, setTemplateConfig] = useState(null);
  const [staffRaw, setStaffRaw] = useState([]);
  const [empDeductions, setEmpDeductions] = useState([]);
  const [employeeAdjustments, setEmployeeAdjustments] = useState({});
  const [runAllowances, setRunAllowances] = useState([]);
  const [runDeductions, setRunDeductions] = useState([]);
  const [editEmployee, setEditEmployee] = useState(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showRunAdjustments, setShowRunAdjustments] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState("");
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [existingPaidRun, setExistingPaidRun] = useState(null);
  const [checkingPaidRun, setCheckingPaidRun] = useState(false);
  const [terminationPayrolls, setTerminationPayrolls] = useState([]);

  const payrollYear = useMemo(() => toPayrollYear(academicYear, month), [academicYear, month]);
  const payrollMonthNum = useMemo(() => MONTHS.indexOf(month) + 1, [month]);
  const periodIsPaid = !!existingPaidRun;

  const termOptions = useMemo(() => {
    const terms = termsForRegistryYear(academicRegistry, academicYear);
    return terms.length ? terms : ["Term 1", "Term 2", "Term 3"];
  }, [academicRegistry, academicYear]);

  const yearOptions = useMemo(() => {
    if (!availableYears.length) return [{ value: String(new Date().getFullYear()), label: String(new Date().getFullYear()) }];
    return availableYears.map((y) => {
      const row = academicRegistry.find((r) => String(r.academic_year) === String(y));
      return { value: y, label: yearOptionLabel(row) || y };
    });
  }, [availableYears, academicRegistry]);

  const loadStaffAndTemplate = useCallback(() => {
    setLoadingStaff(true);
    Promise.all([
      api.get("/accountant/payroll/templates/active").catch(() => null),
      api.get("/accountant/payroll/staff/search", { params: { query: "", limit: 500 } }).catch(() => null),
      getEmployeePayrollDeductions().catch(() => []),
    ])
      .then(([tplRes, staffRes, empDedRows]) => {
        setTemplateConfig(tplRes?.data?.data || null);
        const rows = Array.isArray(staffRes?.data?.data) ? staffRes.data.data : [];
        setStaffRaw(rows);
        setEmpDeductions(filterPayrollEmployeeDeductions(Array.isArray(empDedRows) ? empDedRows : []));
        setEmployees(
          rows.map((s, idx) => {
            const basic = Number(s?.payroll?.basicSalary || s?.salary?.basic || 0) || 0;
            return {
              id: Number(s.staffUserId || idx + 1),
              name: s.fullName || `Staff ${idx + 1}`,
              dept: s.department || s.role || "Staff",
              basic,
              missingBasic: basic <= 0,
            };
          })
        );
      })
      .finally(() => setLoadingStaff(false));
  }, []);

  useEffect(() => {
    api.get("/dos/academic-calendar-settings")
      .then((res) => {
        if (!res.data?.success) return;
        const parsed = parseManagerAcademicSettings(res.data.data || {});
        const year = parsed.currentYear || String(new Date().getFullYear());
        const defaultTerm = parsed.defaultTerm || inferCurrentTerm(parsed.defaultTerms);
        const years = parsed.years?.length ? parsed.years : [year];
        setAcademicRegistry(parsed.registry);
        setAvailableYears(years);
        setAcademicYear(year);
        setTerm(defaultTerm);
        setAcademicLoaded(true);
      })
      .catch(() => {
        const y = String(new Date().getFullYear());
        setAvailableYears([y]);
        setAcademicYear(y);
        setTerm(inferCurrentTerm(["Term 1", "Term 2", "Term 3"]));
        setAcademicLoaded(true);
      });
  }, []);

  useEffect(() => {
    loadStaffAndTemplate();
  }, [loadStaffAndTemplate]);

  useEffect(() => {
    setStatus((s) => (s === "done" ? "idle" : s));
    setPayrollData([]);
    setSavedRunId(null);
    setProgress(0);
  }, [month, academicYear, payrollYear]);

  useEffect(() => {
    if (!academicLoaded || !academicYear || !month) {
      setExistingPaidRun(null);
      return undefined;
    }
    let cancelled = false;
    setCheckingPaidRun(true);
    getPayrollRuns({
      month,
      year: payrollYear,
      academicYear,
      status: "paid",
      limit: 5,
    })
      .then((runs) => {
        if (cancelled) return;
        const paid = runs.find((r) => isPayrollRunPaid(r.status)) || null;
        setExistingPaidRun(paid);
      })
      .catch(() => {
        if (!cancelled) setExistingPaidRun(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingPaidRun(false);
      });
    return () => { cancelled = true; };
  }, [academicLoaded, academicYear, month, payrollYear]);

  useEffect(() => {
    if (!payrollMonthNum || !payrollYear) {
      setTerminationPayrolls([]);
      return undefined;
    }
    let cancelled = false;
    listTerminationsForPayrollMonth(payrollMonthNum, payrollYear)
      .then((data) => {
        if (!cancelled) setTerminationPayrolls(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setTerminationPayrolls([]);
      });
    return () => { cancelled = true; };
  }, [payrollMonthNum, payrollYear, month, academicYear]);

  const templateSyncKey = templateConfig
    ? `${templateConfig.id || ""}-v${templateConfig.version || 0}`
    : "";

  const allowanceRules = templateConfig?.rules?.allowanceAuto || templateConfig?.allowanceAuto || {};
  const schoolAllowanceAuto = shouldUseSchoolAutoAllowances([], allowanceRules, {
    runAllowances: runAllowances.length ? runAllowances : undefined,
  });

  useEffect(() => {
    if (!templateConfig) {
      setRunAllowances([]);
      setRunDeductions([]);
      return;
    }
    const autoOn = shouldUseSchoolAutoAllowances([], templateConfig?.rules?.allowanceAuto || {}, {});
    setRunAllowances(autoOn ? [] : cloneAllowancesFromTemplate(templateConfig));
    setRunDeductions(cloneDeductionsFromTemplate(templateConfig));
  }, [templateSyncKey]);

  const runOverrides = useMemo(
    () => ({
      allowances: allowancesForRunApi(runAllowances),
      deductions: deductionsForRunApi(runDeductions),
    }),
    [runAllowances, runDeductions]
  );

  const handleYearChange = (nextYear) => {
    setAcademicYear(nextYear);
    const terms = termsForRegistryYear(academicRegistry, nextYear);
    setTerm((prev) => (terms.includes(prev) ? prev : inferCurrentTerm(terms)));
  };

  const previewResult = useMemo(
    () => buildPayrollPreviewRows(staffRaw, templateConfig, empDeductions, employeeAdjustments, runOverrides, terminationPayrolls),
    [staffRaw, templateConfig, empDeductions, employeeAdjustments, runOverrides, terminationPayrolls]
  );

  const previewRegisterRows = previewResult.rows;
  const missingBasicEmployees = useMemo(
    () => employees.filter((e) => e.missingBasic),
    [employees]
  );
  const templateActive = !!(
    templateConfig?.applyToAll
    && String(templateConfig?.status || '').toLowerCase() === 'active'
    && templateConfig?.isActive !== false
  );
  const hasTemplate = !!templateConfig;
  const templateInactive = hasTemplate && !templateActive;
  const canRunPayroll = !loadingStaff && employees.length > 0;
  const previewReportRows = useMemo(
    () => buildPreviewReportRows(previewRegisterRows, templateConfig),
    [previewRegisterRows, templateConfig],
  );
  const runTemplateColumns = useMemo(
    () => resolveRunReportColumns(templateConfig),
    [templateConfig],
  );
  const previewReportTotals = useMemo(
    () => (previewReportRows.length ? sumRunReportRows(previewReportRows) : null),
    [previewReportRows],
  );
  const previewTotals = useMemo(
    () => (previewRegisterRows.length ? sumPayrollRegisterRows(previewRegisterRows) : null),
    [previewRegisterRows]
  );

  const periodLabel = useMemo(
    () => `PAYROLL FOR ${String(month).toUpperCase()} ${payrollYear}`,
    [month, payrollYear]
  );

  const saveEmployeeAdjustment = (staffUserId, adj) => {
    setEmployeeAdjustments((prev) => {
      const next = { ...prev };
      const hasItems =
        (adj.extraAllowances?.length || 0)
        + (adj.extraDeductions?.length || 0)
        + (adj.basicSalaryOverride ? 1 : 0)
        + (splitHasValues(adj.allowanceSplit) ? 1 : 0) > 0;
      if (hasItems) next[staffUserId] = adj;
      else delete next[staffUserId];
      return next;
    });
  };

  const openEmployeeEdit = useCallback((staffUserId) => {
    const id = Number(staffUserId);
    const emp = employees.find((e) => e.id === id);
    if (emp && !emp.missingBasic) setEditEmployee(emp);
  }, [employees]);

  const adjustmentsPayload = useMemo(
    () => Object.entries(employeeAdjustments).map(([staffUserId, adj]) => ({
      staffUserId: Number(staffUserId),
      extraAllowances: adj.extraAllowances || [],
      extraDeductions: adj.extraDeductions || [],
      basicSalaryOverride: adj.basicSalaryOverride || undefined,
      allowanceSplit: splitHasValues(adj.allowanceSplit) ? adj.allowanceSplit : undefined,
    })),
    [employeeAdjustments]
  );

  const runPayroll = async () => {
    if (!academicYear || !term) {
      setError("Academic year and term are required. Configure them in Manager → Settings → Preferences.");
      return;
    }
    if (periodIsPaid) {
      setError(
        `${month} ${payrollYear} (${academicYear}) is already paid. `
        + "This month cannot be run again. Open Salary Payment or Pay Slips to view it.",
      );
      return;
    }
    if (!employees.length) {
      setError("No active staff found for payroll.");
      return;
    }
    const missingCount = missingBasicEmployees.length;
    const includedCount = previewRegisterRows.length;
    let confirmBody =
      `Save payroll for ${month} ${payrollYear}?\n\n`
      + `${employees.length} active staff total`;
    if (!templateActive) {
      confirmBody +=
        '\n\nNote: Salary template is not marked Active — payroll still uses saved allowances & statutory rates.';
    }
    if (includedCount > 0) {
      confirmBody += `\n${includedCount} in register preview · Net ${(previewTotals?.netPayFinal ?? previewTotals?.net ?? 0).toLocaleString()} RWF`;
    }
    if (missingCount > 0) {
      confirmBody +=
        `\n\n⚠ ${missingCount} staff missing basic salary — payroll will still run using default role rates for them.`
        + `\nSet basic salary via Employee Import or Staff Salary Setup.`;
    }
    confirmBody += "\n\nYou can review or delete from Salary Payment while status is Processing.";
    const ok = window.confirm(confirmBody);
    if (!ok) return;
    setError("");
    setStatus("running");
    setProgress(0);

    const tick = setInterval(() => {
      setProgress((p) => Math.min(p + 12, 92));
    }, 160);

    try {
      const res = await triggerPayrollRun({
        month,
        term,
        year: payrollYear,
        academicYear,
        paymentDate: payDate,
        employeeAdjustments: adjustmentsPayload,
        allowanceOverrides: allowancesForRunApi(runAllowances),
        deductionOverrides: deductionsForRunApi(runDeductions),
      });
      clearInterval(tick);
      setProgress(100);
      const lines = Array.isArray(res?.data?.lines) ? res.data.lines : [];
      setSavedRunId(res?.data?.runId || res?.id || null);
      setPayrollData(lines.map((l, idx) => ({ ...l, id: idx + 1 })));
      setStatus("done");
    } catch (e) {
      clearInterval(tick);
      setProgress(0);
      setStatus("idle");
      const msg = e?.response?.data?.detail || e?.response?.data?.message || "Failed to trigger payroll";
      setError(msg);
    }
  };

  const schoolName = useMemo(() => {
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("authUser") || "{}";
      const u = JSON.parse(raw);
      return u?.school?.name || u?.school_name || "School";
    } catch {
      return "School";
    }
  }, []);

  const savedReportRows = useMemo(() => {
    const enriched = payrollData.map((line) => enrichRegisterRowForReports(
      mapApiLineToRegisterRow(line),
      line,
      'Processing',
      templateConfig,
    ));
    const runColumns = resolveRunReportColumns(templateConfig);
    return enriched.map((row) => ({ ...row, runColumns }));
  }, [payrollData, templateConfig]);

  const savedReportTotals = useMemo(
    () => (savedReportRows.length ? sumRunReportRows(savedReportRows) : null),
    [savedReportRows],
  );

  const registerRows = useMemo(
    () => payrollData.map((l) => mapApiLineToRegisterRow(l)),
    [payrollData]
  );

  const registerTotals = useMemo(
    () => (registerRows.length ? sumPayrollRegisterRows(registerRows) : null),
    [registerRows]
  );

  const totals = payrollData.reduce(
    (acc, e) => ({
      gross: acc.gross + Number(e.gross || 0),
      paye: acc.paye + Number(e.paye || 0),
      rssb: acc.rssb + Number(e.csrEmployee6 ?? e.rssb ?? 0),
      rama: acc.rama + Number(e.ramaEmployee ?? e.rama ?? 0),
      net: acc.net + Number(e.netPayFinal ?? e.net ?? 0),
      totalCsr14: acc.totalCsr14 + Number(e.totalCsr14 || 0),
    }),
    { gross: 0, paye: 0, rssb: 0, rama: 0, net: 0, totalCsr14: 0 }
  );

  const statutory = templateConfig?.statutory || {};
  const templateAllowanceCount = (templateConfig?.allowances || []).filter((a) => String(a.status || "Active").toLowerCase() === "active").length;

  const allowanceAutoBanner = schoolAllowanceAuto ? (
    <p className="mb-4 text-xs text-emerald-200/95">
      <strong>Auto allowances from basic salary</strong> — for each employee, Gross = Basic ÷ 0.7; Others, Housing, and Transport are equal (10% of gross each). Amounts differ per person because basic salaries differ. Add rows below only for extra one-off allowances this month.
    </p>
  ) : null;

  const previewRowByStaffId = useMemo(() => {
    const map = new Map();
    for (const r of previewRegisterRows) {
      if (r.staffUserId) map.set(Number(r.staffUserId), r);
    }
    return map;
  }, [previewRegisterRows]);

  const staffProfileAllowanceCount = useMemo(
    () => staffRaw.filter((s) => getStaffAllowanceSplit(s).hasStored).length,
    [staffRaw]
  );
  const activeAdvanceCount = useMemo(
    () => empDeductions.filter((d) => String(d.deductionType) === "Salary Advance").length,
    [empDeductions]
  );

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <AccountantOchreHero
        eyebrow="Finance · Payroll"
        titleLine="Payroll"
        titleAccent="Run"
        subtitle="Generate monthly payroll using the active salary template and manager academic calendar."
        icon={Zap}
      />

      <div className="acct-shell-standard -mt-10 relative z-10 pb-16 space-y-5">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#000435]/[0.03] to-transparent">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#000435] flex items-center justify-center">
                <Settings size={17} className="text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#000435]">Payroll configuration</p>
                <p className="text-[11px] text-slate-500">
                  Academic year syncs with Manager → Settings → Preferences
                </p>
              </div>
            </div>
            {!academicLoaded ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Loading calendar…
              </span>
            ) : null}
          </div>

          <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <FieldSelect label="Academic year" hint="from manager" value={academicYear} onChange={handleYearChange} options={yearOptions} disabled={!academicLoaded} />
            <FieldSelect label="Term" value={term} onChange={setTerm} options={termOptions} disabled={!academicLoaded} />
            <FieldSelect label="Payroll month" value={month} onChange={setMonth} options={MONTHS} />
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">Payment date</span>
              <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#000435] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/40 focus:border-[#F59E0B]" />
            </label>
          </div>
        </div>

       

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5 text-red-800 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : null}

        {checkingPaidRun && academicLoaded ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 size={16} className="animate-spin shrink-0" />
            <span>Checking payroll status for {month} {payrollYear}…</span>
          </div>
        ) : null}

        {periodIsPaid && status === "idle" ? (
          <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-4 flex items-start gap-3">
            <CheckCircle size={22} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-emerald-900 uppercase tracking-wide">
                This month is paid
              </p>
              <p className="text-sm text-emerald-800 mt-1">
                <strong>{month} {payrollYear}</strong>
                {academicYear ? ` · Academic year ${academicYear}` : ""}
                {existingPaidRun?.runNumber ? ` · ${existingPaidRun.runNumber}` : ""}
                {existingPaidRun?.staffCount ? ` · ${existingPaidRun.staffCount} staff` : ""}
                {existingPaidRun?.netTotal
                  ? ` · Net ${Number(existingPaidRun.netTotal).toLocaleString()} RWF`
                  : ""}
              </p>
              <p className="text-xs text-emerald-700/90 mt-2">
                Payroll for this period is locked. You cannot generate or save another run for the same month and academic year.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link
                  to="/payroll/salary-payment"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
                >
                  <ExternalLink size={12} /> Salary Payment
                </Link>
                <Link
                  to="/payroll/payslips"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-600 text-emerald-800 text-xs font-bold hover:bg-emerald-100"
                >
                  <ExternalLink size={12} /> Pay Slips
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {status === "idle" && !periodIsPaid && (staffProfileAllowanceCount > 0 || empDeductions.length > 0) ? (
          <div className="rounded-2xl border border-[#000435]/15 bg-[#000435]/[0.03] px-4 py-4 flex items-start gap-3">
            <CheckCircle size={18} className="text-[#F59E0B] shrink-0 mt-0.5" />
            <div className="min-w-0 text-xs text-slate-600 leading-relaxed">
              <p className="text-sm font-bold text-[#000435]">Staff Salary Setup applied to this run</p>
              <p className="mt-1">
                {staffProfileAllowanceCount > 0
                  ? `${staffProfileAllowanceCount} employee(s) use saved allowances (Others / H/A / T/A and custom). `
                  : ""}
                {empDeductions.length > 0
                  ? `${empDeductions.length} active deduction(s) from staff profiles are included`
                  : "No active deductions"}
                {activeAdvanceCount > 0
                  ? ` — ${activeAdvanceCount} salary advance(s) deduct monthly until repayment months are complete.`
                  : "."}
                {" "}Deleted or completed items are excluded. Paid payroll snapshots are not changed if you edit profiles later.
              </p>
              <Link
                to="/payroll/staff-salary-setup"
                className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-[#000435] hover:text-[#F59E0B]"
              >
                <ExternalLink size={12} /> Staff Salary Setup
              </Link>
            </div>
          </div>
        ) : null}

        {missingBasicEmployees.length > 0 && status === "idle" && !periodIsPaid ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-900">
                {missingBasicEmployees.length} staff missing basic salary
              </p>
              <p className="text-xs text-amber-800/90 mt-1">
                They are highlighted below and excluded from the register preview. You can still save payroll —
                the system uses default role rates for staff without basic salary. Set amounts via{' '}
                <strong>Payroll → Employee Import</strong> or <strong>Staff Salary Setup</strong>.
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {missingBasicEmployees.slice(0, 12).map((e) => (
                  <li
                    key={e.id}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200"
                  >
                    {e.name}
                  </li>
                ))}
                {missingBasicEmployees.length > 12 ? (
                  <li className="text-[10px] text-amber-700 self-center">
                    +{missingBasicEmployees.length - 12} more
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        ) : null}

        {templateInactive && employees.length > 0 && status === "idle" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2.5 text-amber-900 text-sm">
            <Power size={18} className="shrink-0 mt-0.5 text-amber-600" />
            <span>
              Salary template is <strong>deactivated</strong>. You can still preview and run payroll using saved allowances.
              To change items, go to{" "}
              <Link to="/payroll/salary-template" className="font-bold underline text-[#000435]">
                Salary Template
              </Link>
              , edit or delete allowances/deductions, then click <strong>Activate</strong>.
            </span>
          </div>
        ) : null}

        {!templateActive && !templateInactive && employees.length > 0 && status === "idle" ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 flex items-start gap-2.5 text-sky-900 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-sky-600" />
            <span>
              <strong>Salary template not marked Active.</strong> Register preview still uses saved allowances &amp; statutory rates from Salary Template.
              Click <strong>Activate template</strong> on Payroll → Salary Template to mark this run as template-applied.
            </span>
          </div>
        ) : null}

        {status === "idle" && !periodIsPaid && showRunAdjustments ? (
          <RunLevelAdjustments
            allowances={runAllowances}
            setAllowances={setRunAllowances}
            deductions={runDeductions}
            setDeductions={setRunDeductions}
          />
        ) : null}

        {status === "idle" && !periodIsPaid ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowStaffModal(true)}
              className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-100 bg-white shadow-sm hover:border-[#FFC107]/50 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#000435] flex items-center justify-center shrink-0">
                  <Users size={18} className="text-[#FFC107]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#000435]">View staff to process</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {employees.length} staff
                    {terminationPayrolls.length ? ` · +${terminationPayrolls.length} termination` : ''}
                    {Object.keys(employeeAdjustments).length ? ` · ${Object.keys(employeeAdjustments).length} adjusted` : ''}
                  </p>
                </div>
              </div>
              <ChevronDown size={18} className="text-slate-400 shrink-0 -rotate-90" />
            </button>
            <button
              type="button"
              onClick={() => setShowRunAdjustments((v) => !v)}
              className={`flex items-center justify-between gap-3 p-4 rounded-2xl border shadow-sm transition-all text-left ${
                showRunAdjustments ? 'border-[#FFC107] bg-amber-50/40' : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Settings size={18} className="text-[#000435]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#000435]">Run allowances &amp; deductions</p>
                  <p className="text-[11px] text-slate-500">
                    {showRunAdjustments ? 'Panel open — month-only overrides' : 'Optional — tap to expand'}
                  </p>
                </div>
              </div>
              <ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform ${showRunAdjustments ? 'rotate-180' : ''}`} />
            </button>
          </div>
        ) : null}

        {status === "idle" && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#000435]">Live Payroll Register — preview before save</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {schoolName.toUpperCase()} · {periodLabel}
                </p>
               
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={!previewReportRows.length}
                  onClick={() => downloadRunPayrollRegisterExcel({
                    schoolName,
                    periodLabel,
                    rows: previewReportRows,
                    totalRow: previewReportTotals,
                    runStatus: 'Preview',
                    filename: `payroll-preview-${month}-${payrollYear}.xlsx`,
                  })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F59E0B] text-[#000435] text-xs font-bold hover:bg-[#F59E0B]/90 disabled:opacity-50"
                >
                  <FileSpreadsheet size={14} /> Export Excel
                </button>
              </div>
            </div>
            <div className="p-4">
              {terminationPayrolls.length > 0 && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="font-semibold">Termination month payroll included</p>
                  <p className="text-xs mt-1 text-amber-800/90">
                    {terminationPayrolls.length} employee{terminationPayrolls.length !== 1 ? 's' : ''} terminated in {month} {payrollYear}
                    — final-month rules apply (no basic salary split, no allowances, no RAMA/maternity; CBHI deducted for total payable).
                  </p>
                </div>
              )}
              {loadingStaff ? (
                <div className="py-16 text-center text-slate-400 text-sm">
                  <Loader2 size={22} className="animate-spin mx-auto mb-2 text-[#F59E0B]" />
                  Loading staff for register…
                </div>
              ) : previewReportRows.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm text-amber-800 font-semibold">
                    No staff with basic salary in preview
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {missingBasicEmployees.length > 0
                      ? `All ${missingBasicEmployees.length} staff listed above are missing basic salary. You can still confirm & save payroll — default role rates will apply.`
                      : 'Import basic salaries or configure them in Staff Salary Setup.'}
                  </p>
                </div>
              ) : (
                <PayrollReportRegisterTable
                  variant="run"
                  rows={previewReportRows}
                  totalRow={previewReportTotals}
                  runColumns={runTemplateColumns}
                  maxHeight={480}
                />
              )}
            </div>
            {previewTotals ? (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex flex-wrap gap-4 text-[11px] text-slate-600">
                <span>Gross <strong className="text-[#000435]">{(previewTotals.gross || 0).toLocaleString()}</strong></span>
                <span>PAYE <strong className="text-red-700">{(previewTotals.paye || 0).toLocaleString()}</strong></span>
                <span>CSR 14% <strong>{(previewTotals.totalCsr14 || 0).toLocaleString()}</strong></span>
                <span>Net pay <strong className="text-[#000435]">{(previewTotals.netPayFinal ?? previewTotals.net ?? 0).toLocaleString()} RWF</strong></span>
              </div>
            ) : null}
            <div className="px-5 py-4 border-t border-slate-100">
              {periodIsPaid ? (
                <div className="w-full rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-emerald-900 font-bold text-sm py-5 px-4 text-center">
                  <CheckCircle size={20} className="inline-block mr-2 text-emerald-600 align-middle" />
                  This month is paid — payroll cannot be saved again for {month} {payrollYear}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={runPayroll}
                  disabled={!canRunPayroll || checkingPaidRun}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl bg-[#000435] hover:bg-[#000435]/90 text-white font-bold text-base py-5 shadow-lg shadow-[#000435]/20 disabled:opacity-50 transition-all"
                >
                  <Zap size={22} className="text-[#F59E0B]" />
                  Confirm &amp; save payroll · {month} {payrollYear}
                </button>
              )}
              <p className="text-[10px] text-slate-400 text-center mt-2">
                {periodIsPaid
                  ? "Change academic year or month to run payroll for a different period."
                  : !templateActive && hasTemplate
                    ? 'Template saved but not activated — preview uses saved allowances & statutory rates. Activate on Salary Template for payroll run metadata.'
                    : !hasTemplate
                      ? 'No template saved — preview uses Rwanda default statutory rates only.'
                      : missingBasicEmployees.length > 0
                        ? `${missingBasicEmployees.length} without basic salary excluded from preview · default role rates apply on save`
                        : 'Review the register above, then save. Status will be Processing until marked Paid on Salary Payment.'}
              </p>
            </div>
          </div>
        )}

        {status === "running" && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center gap-4">
            <RefreshCw size={28} className="text-[#F59E0B] animate-spin" />
            <p className="font-bold text-[#000435]">Calculating payroll…</p>
            <div className="w-full max-w-md">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{employees.length} employees</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#F59E0B] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
              <CheckCircle size={22} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-emerald-900">Payroll saved to database</p>
                <p className="text-sm text-emerald-700">
                  {month} · {term} · {academicYear}
                  {savedRunId ? ` · Run #${savedRunId}` : ""} — view in Salary Payment.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Gross", value: totals.gross },
                { label: "PAYE", value: totals.paye },
                { label: "CSR 14%", value: totals.totalCsr14 },
                { label: "CSR 6% Emp", value: totals.rssb },
                { label: "RAMA", value: totals.rama },
                { label: "Net Pay", value: totals.net },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <p className="text-sm font-black text-[#000435] tabular-nums">
                    {value.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">RWF</span>
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">{label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#000435]">Payroll register — {month} {payrollYear}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Income Salary = Gross − PAYE − CSR 6% − M.LEAVE 0.3% − RAMA 7.5% · Net = Income − Mutuelle 0.5%</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={!savedReportRows.length} onClick={() => downloadRunPayrollRegisterExcel({ schoolName, periodLabel, rows: savedReportRows, totalRow: savedReportTotals, runStatus: 'Processing', filename: `payroll-${month}-${payrollYear}.xlsx` })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                    <Download size={14} /> CSV
                  </button>
                  <button type="button" disabled={!savedReportRows.length} onClick={() => downloadRunPayrollRegisterExcel({ schoolName, periodLabel, rows: savedReportRows, totalRow: savedReportTotals, runStatus: 'Processing', filename: `payroll-${month}-${payrollYear}.xlsx` })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F59E0B] text-[#000435] text-xs font-bold hover:bg-[#F59E0B]/90 disabled:opacity-50">
                    <FileSpreadsheet size={14} /> Excel
                  </button>
                </div>
              </div>
              <div className="p-4">
                <PayrollReportRegisterTable
                  variant="run"
                  rows={savedReportRows}
                  totalRow={savedReportTotals}
                  runColumns={runTemplateColumns}
                  maxHeight={520}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {editEmployee ? (
        <EmployeeAdjustModal
          employee={editEmployee}
          staffRecord={staffRaw.find((s) => Number(s.staffUserId || s.id) === Number(editEmployee.id))}
          adjustment={employeeAdjustments[editEmployee.id] || emptyAdj()}
          runOverrides={runOverrides}
          templateConfig={templateConfig}
          empDeductions={empDeductions}
          onSave={(adj) => saveEmployeeAdjustment(editEmployee.id, adj)}
          onClose={() => setEditEmployee(null)}
        />
      ) : null}

      <StaffToProcessModal
        open={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        employees={employees}
        loadingStaff={loadingStaff}
        previewRowByStaffId={previewRowByStaffId}
        employeeAdjustments={employeeAdjustments}
        terminationPayrolls={terminationPayrolls}
        onRefresh={loadStaffAndTemplate}
        onEditEmployee={(e) => {
          setShowStaffModal(false);
          setEditEmployee(e);
        }}
      />
    </div>
  );
}
