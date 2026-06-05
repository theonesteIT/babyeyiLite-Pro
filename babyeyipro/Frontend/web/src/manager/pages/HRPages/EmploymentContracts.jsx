import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Plus, AlertTriangle, CircleAlert, Upload, Loader2 } from 'lucide-react';
import {
  HrPageLayout, HrPanel, HrBtnPrimary, HrBtnOutline, HrModal, HrField, HrInput, HrFormSelect,
  HrFilterPills, HrBadge, statusToBadge, HrTable, HrAlert, HrHeroAction, HrToast, HrPagination,
} from './hrUi';
import hrService from '../../services/hrService';
import { useNavigate } from 'react-router-dom';
import { h } from '../../utils/href';

const typeColor = {
  Permanent: 'text-emerald-600',
  Contract: 'text-[#c87800]',
  Temporary: 'text-orange-600',
  Probation: 'text-amber-600',
  Internship: 'text-sky-600',
};

export default function EmployeeContracts() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success', duration: 2600 });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [contractPage, setContractPage] = useState(1);
  const [newContract, setNewContract] = useState({
    userId: '',
    type: 'Permanent',
    position: '',
    start: '',
    end: '',
    salary: '',
    noEndContract: false,
    contractFile: null,
  });

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await hrService.getDirectory();
      if (!res?.success) throw new Error(res?.message || 'Failed to load contracts');
      const now = new Date();
      const mapped = (res.data || []).map((e) => {
        const end = e.contract_end ? new Date(e.contract_end) : null;
        const diffDays = end ? Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
        const status = !end
          ? 'Active'
          : diffDays < 0
            ? 'Expired'
            : diffDays <= 30
              ? 'Expiring'
              : e.status || 'Active';
        return {
          id: `CON-${e.employee_id || e.id}`,
          userId: e.id,
          emp: e.name,
          empId: e.employee_id,
          type: e.employment_type || e.contract || 'Permanent',
          position: e.position || '—',
          start: e.contract_start ? String(e.contract_start).slice(0, 10) : (e.hire_date ? String(e.hire_date).slice(0, 10) : null),
          end: e.contract_end ? String(e.contract_end).slice(0, 10) : null,
          salary: e.payroll_basic_salary ? `${Number(e.payroll_basic_salary).toLocaleString()} RWF` : '—',
          status,
          daysLeft: diffDays,
        };
      });
      setContracts(mapped);
      setEmployees(res.data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load contracts');
      setContracts([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  const types = ['All', 'Permanent', 'Contract', 'Temporary', 'Probation', 'Internship', 'Part-Time', 'Consultancy'];
  const filtered = useMemo(
    () => (filter === 'All' ? contracts : contracts.filter((c) => c.type === filter)),
    [filter, contracts]
  );
  const pageSize = 10;
  const totalContractPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedContracts = useMemo(
    () => filtered.slice((contractPage - 1) * pageSize, contractPage * pageSize),
    [filtered, contractPage]
  );
  const expiring = contracts.filter((c) => c.daysLeft !== null && c.daysLeft <= 30 && c.daysLeft >= 0);
  const expired = contracts.filter((c) => c.daysLeft !== null && c.daysLeft < 0);
  const employeeOptions = useMemo(
    () => employees.map((e) => ({ id: String(e.id), label: `${e.name} (${e.employee_id || `EMP${e.id}`})` })),
    [employees]
  );

  const resetNewContract = () => {
    setNewContract({
      userId: '',
      type: 'Permanent',
      position: '',
      start: '',
      end: '',
      salary: '',
      noEndContract: false,
      contractFile: null,
    });
    setModalError('');
    setEmployeeQuery('');
  };

  const employeeSearchResults = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    if (!q) return employeeOptions.slice(0, 8);
    return employeeOptions.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 8);
  }, [employeeOptions, employeeQuery]);

  useEffect(() => {
    setContractPage(1);
  }, [filter]);

  useEffect(() => {
    if (contractPage > totalContractPages) setContractPage(totalContractPages);
  }, [contractPage, totalContractPages]);

  const handleCreateContract = async () => {
    if (!newContract.userId) {
      setModalError('Please select an employee.');
      return;
    }
    if (!newContract.start) {
      setModalError('Start date is required.');
      return;
    }
    if (newContract.end && new Date(newContract.end) < new Date(newContract.start)) {
      setModalError('End date cannot be before start date.');
      return;
    }

    setSaving(true);
    setModalError('');
    try {
      const payload = {
        employment_type: newContract.type || null,
        job_title: newContract.position || null,
        contract_start_date: newContract.start || null,
        contract_end_date: newContract.noEndContract ? null : (newContract.end || null),
        payroll_basic_salary: newContract.salary ? Number(newContract.salary) : null,
      };
      const docFiles = newContract.contractFile ? { contract: { file: newContract.contractFile } } : null;
      const res = await hrService.updateEmployee(newContract.userId, payload, null, docFiles);
      if (!res?.success) throw new Error(res?.message || 'Failed to create contract');
      setShowModal(false);
      resetNewContract();
      await loadContracts();
      setToast({ message: 'Contract saved successfully.', type: 'success', duration: 2600 });
    } catch (err) {
      setModalError(err?.message || 'Failed to save contract');
      setToast({ message: err?.message || 'Failed to save contract.', type: 'error', duration: 3200 });
    } finally {
      setSaving(false);
    }
  };

  const kpiTiles = [
    { icon: FileText, label: 'Contracts', value: String(contracts.length), subValue: 'Total records' },
    { icon: FileText, label: 'Expiring', value: String(expiring.length), subValue: 'Within 30 days' },
    { icon: FileText, label: 'Expired', value: String(expired.length), subValue: 'Needs renewal' },
  ];

  const managerAlerts = useMemo(() => {
    const alerts = [];
    expiring.slice(0, 4).forEach((c) => alerts.push(`${c.emp}: contract expires in ${c.daysLeft} day(s).`));
    expired.slice(0, 4).forEach((c) => alerts.push(`${c.emp}: contract has expired.`));
    return alerts;
  }, [expiring, expired]);

  const selectedEmployee = employees.find((e) => String(e.id) === String(newContract.userId));
  const contractDurationDays = useMemo(() => {
    if (!newContract.start || !newContract.end || newContract.noEndContract) return null;
    const s = new Date(newContract.start);
    const e = new Date(newContract.end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return null;
    return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  }, [newContract.start, newContract.end, newContract.noEndContract]);

  return (
    <HrPageLayout
      title="Employment Contracts"
      subtitle="Contract lifecycle, renewals, and salary terms"
      HeroIcon={FileText}
      kpiTiles={kpiTiles}
      headerRight={<HrHeroAction icon={Plus} onClick={() => { resetNewContract(); setShowModal(true); }}>New contract</HrHeroAction>}
    >
      <HrToast toast={toast} onClose={() => setToast({ message: '', type: 'success', duration: 0 })} />
      {error ? <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p> : null}
      {managerAlerts.length > 0 ? (
        <HrAlert variant="warning" title="Contract notifications (manager & staff in-app)">
          <div className="space-y-1">
            {managerAlerts.map((msg, i) => <p key={i}>{msg}</p>)}
          </div>
        </HrAlert>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {expiring.length > 0 && (
          <HrAlert variant="danger" title={`Expiring soon (${expiring.length})`} icon={AlertTriangle}>
            {expiring.map((c) => (
              <div key={c.id} className="flex justify-between py-1 border-b border-red-100 last:border-0 text-xs">
                <span>{c.emp}</span>
                <span className="text-red-600 tabular-nums">{c.daysLeft}d left</span>
              </div>
            ))}
          </HrAlert>
        )}
        {expired.length > 0 && (
          <HrAlert variant="warning" title={`Expired (${expired.length})`} icon={CircleAlert}>
            {expired.map((c) => (
              <div key={c.id} className="flex justify-between py-1 border-b border-amber-100 last:border-0 text-xs">
                <span>{c.emp}</span>
                <span className="text-slate-500">Expired</span>
              </div>
            ))}
          </HrAlert>
        )}
      </div>

      <HrFilterPills options={types} value={filter} onChange={setFilter} />

      <HrTable columns={['Contract', 'Employee', 'Type', 'Position', 'Start', 'End', 'Salary', 'Status', 'Actions']}>
        {loading ? (
          <tr>
            <td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">
              <Loader2 size={18} className="inline-block animate-spin mr-2" /> Loading contracts...
            </td>
          </tr>
        ) : paginatedContracts.map((c) => (
          <tr key={c.id} className="hover:bg-slate-50/80">
            <td className="px-4 py-3 text-[#c87800] font-mono text-xs">{c.id}</td>
            <td className="px-4 py-3">
              <p className="text-xs text-[#000435]" style={{ fontWeight: 500 }}>{c.emp}</p>
              <p className="text-slate-400 text-[10px]">{c.empId}</p>
            </td>
            <td className="px-4 py-3"><span className={`text-xs ${typeColor[c.type] || 'text-slate-600'}`} style={{ fontWeight: 500 }}>{c.type}</span></td>
            <td className="px-4 py-3 text-xs text-slate-600">{c.position}</td>
            <td className="px-4 py-3 text-xs text-slate-600">{c.start}</td>
            <td className="px-4 py-3 text-xs">
              {c.end ? (
                <span className={c.daysLeft !== null && c.daysLeft <= 30 ? 'text-red-600' : 'text-slate-600'}>
                  {c.end}
                  {c.daysLeft !== null && c.daysLeft >= 0 ? ` (${c.daysLeft}d)` : c.daysLeft < 0 ? ' (expired)' : ''}
                </span>
              ) : (
                <span className="text-emerald-600">Permanent</span>
              )}
            </td>
            <td className="px-4 py-3 text-xs text-slate-600">{c.salary}</td>
            <td className="px-4 py-3"><HrBadge variant={statusToBadge(c.status)}>{c.status}</HrBadge></td>
            <td className="px-4 py-3">
              <div className="flex gap-1">
                {['View', 'Renew', 'Extend'].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => navigate(h(a === 'View' ? `/hr/directory/${c.userId}` : `/hr/directory/${c.userId}/edit`))}
                    className="px-2 py-1 text-[10px] rounded-lg bg-slate-50 text-slate-500 hover:bg-amber-50 hover:text-[#c87800]"
                    style={{ fontWeight: 500 }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </td>
          </tr>
        ))}
      </HrTable>
      <HrPagination page={contractPage} totalPages={totalContractPages} onPageChange={setContractPage} />

      <HrModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create new contract"
        footer={
          <>
            <HrBtnOutline className="flex-1" onClick={() => { setShowModal(false); resetNewContract(); }} disabled={saving}>Cancel</HrBtnOutline>
            <HrBtnPrimary className="flex-1" onClick={handleCreateContract} disabled={saving}>
              {saving ? 'Saving...' : 'Create'}
            </HrBtnPrimary>
          </>
        }
      >
        {modalError ? <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5 mb-2">{modalError}</p> : null}
        <HrField label="Employee">
          <div className="space-y-2">
            <HrInput
              value={employeeQuery}
              onChange={(e) => setEmployeeQuery(e.target.value)}
              placeholder="Search employee by name or ID..."
            />
            <div className="max-h-36 overflow-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {employeeSearchResults.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    const emp = employees.find((e) => String(e.id) === String(o.id));
                    setNewContract((prev) => ({
                      ...prev,
                      userId: o.id,
                      position: emp?.position || prev.position,
                      type: emp?.employment_type || prev.type,
                      salary: emp?.payroll_basic_salary ? String(emp.payroll_basic_salary) : prev.salary,
                    }));
                    setEmployeeQuery(o.label);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-amber-50 ${String(newContract.userId) === String(o.id) ? 'bg-amber-50 text-[#c87800]' : 'text-slate-600'}`}
                  style={{ fontWeight: 500 }}
                >
                  {o.label}
                </button>
              ))}
              {!employeeSearchResults.length ? <p className="px-3 py-2 text-xs text-slate-400">No employee found.</p> : null}
            </div>
          </div>
        </HrField>
        <HrField label="Contract type">
          <HrFormSelect
            value={newContract.type}
            onChange={(e) => setNewContract((prev) => ({ ...prev, type: e.target.value }))}
            options={['Permanent', 'Temporary', 'Probation', 'Internship', 'Part-Time', 'Consultancy']}
          />
        </HrField>
        <HrField label="Position"><HrInput value={newContract.position} onChange={(e) => setNewContract((prev) => ({ ...prev, position: e.target.value }))} /></HrField>
        <div className="grid grid-cols-2 gap-3">
          <HrField label="Start date"><HrInput type="date" value={newContract.start} onChange={(e) => setNewContract((prev) => ({ ...prev, start: e.target.value }))} /></HrField>
          <HrField label="End date"><HrInput type="date" disabled={newContract.noEndContract} value={newContract.end} onChange={(e) => setNewContract((prev) => ({ ...prev, end: e.target.value }))} /></HrField>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={newContract.noEndContract}
            onChange={(e) => setNewContract((prev) => ({ ...prev, noEndContract: e.target.checked, end: e.target.checked ? '' : prev.end }))}
          />
          Fixed contract with no end date (does not expire)
        </label>
        {selectedEmployee ? (
          <div className="text-xs rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
            Selected: <span style={{ fontWeight: 600 }}>{selectedEmployee.name}</span>
            {newContract.noEndContract ? ' · This contract does not end.' : contractDurationDays != null ? ` · Duration: ${contractDurationDays} day(s)` : ''}
          </div>
        ) : null}
        <HrField label="Salary (RWF)"><HrInput type="number" value={newContract.salary} onChange={(e) => setNewContract((prev) => ({ ...prev, salary: e.target.value }))} /></HrField>
        <HrField label="Upload contract PDF">
          <label className="w-full p-4 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 text-sm hover:border-[#c87800]/40 cursor-pointer">
            <Upload size={18} strokeWidth={1.75} />
            <span>{newContract.contractFile ? newContract.contractFile.name : 'Click to upload PDF'}</span>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => setNewContract((prev) => ({ ...prev, contractFile: e.target.files?.[0] || null }))}
            />
          </label>
        </HrField>
      </HrModal>
    </HrPageLayout>
  );
}
