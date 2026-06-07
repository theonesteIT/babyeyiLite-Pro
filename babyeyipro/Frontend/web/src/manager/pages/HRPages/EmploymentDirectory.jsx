import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Users, UserPlus, Search, Download, Upload, ChevronDown, MoreVertical,
  UserCheck, GraduationCap, Wrench, CalendarOff, Loader2, RotateCcw,
  Mail, Phone, MapPin, Calendar, Eye, Pencil, Trash2, AlertTriangle,
} from 'lucide-react';
import { h } from '../../utils/href';
import {
  HrPageLayout, HrPanel, HrSearch, HrSelect, HrBadge, statusToBadge, HrStatCard,
  HrModal, HrBtnPrimary, HrBtnOutline,
} from './hrUi';
import {
  STAFF_POSITIONS, HR_DEPARTMENTS, CONTRACT_TYPES,
  resolveStaffPhotoUrl, yearsOfService,
} from './hrConstants';
import { EMPLOYEE_IMPORT_TEMPLATE_HEADERS } from '../../utils/hrEmployeeImportTemplate';
import hrService from '../../services/hrService';
import TablePagination from '../../../shared/components/TablePagination';
import { DIRECTORY_MONTHS, buildDirectoryYearOptions } from '../../../shared/utils/directoryFilters';

const avatarColors = ['bg-amber-500', 'bg-teal-500', 'bg-sky-500', 'bg-violet-500', 'bg-pink-500', 'bg-emerald-500'];
const initials = (name) => (name || '?').split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
const avatarColor = (id) => avatarColors[Math.abs(String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % avatarColors.length];

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function toInputDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function DirectoryEmployeeCard({
  emp, menuOpen, onMenuToggle, onView, onEdit, onDelete, selected, onSelect,
}) {
  const photoUrl = resolveStaffPhotoUrl(emp.photo);
  const yos = yearsOfService(emp.hire_date);

  return (
    <HrPanel className={`p-4 sm:p-5 hover:shadow-md transition-shadow relative group ${selected ? 'ring-2 ring-[#c87800]/50 border-[#c87800]/30' : ''}`}>
      <div className="flex flex-col xl:flex-row gap-5 xl:gap-6 items-stretch">
        {/* Left — identity */}
        <div className="flex gap-4 shrink-0 xl:w-[240px]">
          <label className="flex items-start pt-1 shrink-0 cursor-pointer" title="Select employee">
            <input
              type="checkbox"
              checked={!!selected}
              onChange={onSelect}
              className="w-4 h-4 rounded border-slate-300 text-[#c87800] focus:ring-[#F59E0B]/30"
            />
          </label>
          <div className="relative shrink-0">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={emp.name}
                className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full object-cover border-2 border-white shadow ring-1 ring-slate-100"
              />
            ) : (
              <div
                className={`w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full ${avatarColor(emp.id)} flex items-center justify-center text-white text-lg shadow ring-1 ring-slate-100`}
                style={{ fontWeight: 500 }}
              >
                {initials(emp.name)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onView}
                className="text-base sm:text-lg text-[#000435] tracking-tight hover:text-[#c87800] text-left truncate transition-colors"
                style={{ fontWeight: 500 }}
              >
                {emp.name}
              </button>
              <HrBadge variant={statusToBadge(emp.status)}>{emp.status}</HrBadge>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{emp.employee_id}</p>
            <p className="text-sm text-[#c87800] mt-0.5 truncate" style={{ fontWeight: 500 }}>
              {emp.position || '—'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {emp.department}
              {emp.role_name ? ` · ${emp.role_name}` : ''}
            </p>
            {emp.status === 'Terminated' && emp.termination_date && (
              <p className="text-[11px] text-red-600/80 mt-1 font-medium">
                Terminated {formatDate(emp.termination_date)}
                {!emp.account_enabled && !emp.is_active ? ' · Login disabled' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Center — contact grid */}
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 min-w-0 border-t xl:border-t-0 border-slate-100 pt-4 xl:pt-0">
          {[
            { icon: Calendar, label: 'Join date', value: formatDate(emp.hire_date) },
            { icon: Mail, label: 'Email', value: emp.email || '—' },
            { icon: Phone, label: 'Phone', value: emp.phone || '—' },
            { icon: MapPin, label: 'Address', value: emp.address || '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                <Icon size={11} className="text-[#c87800]" strokeWidth={1.75} />
                {label}
              </p>
              <p className="text-xs text-slate-700 truncate mt-1" style={{ fontWeight: 500 }} title={value}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Right — employment summary */}
        <div className="xl:w-52 shrink-0 p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2" style={{ fontWeight: 500 }}>
            Employment summary
          </p>
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-400">Type</dt>
              <dd className="text-slate-700 text-right truncate" style={{ fontWeight: 500 }}>
                {emp.employment_type || emp.contract || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-400">Contract</dt>
              <dd className="text-slate-700 text-right" style={{ fontWeight: 500 }}>
                {emp.contract_end ? formatDate(emp.contract_end) : 'Ongoing'}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-400">Department</dt>
              <dd className="text-slate-700 text-right truncate" style={{ fontWeight: 500 }}>
                {emp.department || '—'}
              </dd>
            </div>
            {yos != null && (
              <div className="flex justify-between gap-2">
                <dt className="text-slate-400">Service</dt>
                <dd className="text-slate-700 text-right" style={{ fontWeight: 500 }}>
                  {yos} year{yos !== 1 ? 's' : ''}
                </dd>
              </div>
            )}
          </dl>
          <button
            type="button"
            onClick={onView}
            className="mt-3 w-full py-2 rounded-lg border border-amber-200/80 text-[#c87800] text-[10px] uppercase tracking-wider hover:bg-amber-50 opacity-0 group-hover:opacity-100 xl:opacity-100 transition-opacity"
            style={{ fontWeight: 500 }}
          >
            View profile
          </button>
        </div>
      </div>

      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
          aria-label="Actions"
        >
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <>
            <button type="button" className="fixed inset-0 z-10" onClick={onMenuToggle} aria-label="Close menu" />
            <div className="absolute right-0 top-full z-20 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-xs">
              <button type="button" onClick={onView} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-600 flex items-center gap-2">
                <Eye size={13} /> View profile
              </button>
              <button type="button" onClick={onEdit} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-600 flex items-center gap-2">
                <Pencil size={13} /> Edit profile
              </button>
              <button type="button" onClick={onDelete} className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2">
                <Trash2 size={13} /> Delete employee
              </button>
            </div>
          </>
        )}
      </div>
    </HrPanel>
  );
}

export default function EmploymentDirectory() {
  const navigate = useNavigate();
  const location = useLocation();
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({
    total: 0, active: 0, teachers: 0, support: 0, on_leave: 0,
    active_pct: 0, teachers_pct: 0, support_pct: 0, on_leave_pct: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('All');
  const [position, setPosition] = useState('All');
  const [status, setStatus] = useState('All');
  const [contract, setContract] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [menuOpen, setMenuOpen] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState('');

  const loadDirectory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hrService.getDirectory({
        search: search || undefined,
        department: dept !== 'All' ? dept : undefined,
        status: status !== 'All' ? status : undefined,
        contract: contract !== 'All' ? contract : undefined,
        position: position !== 'All' ? position : undefined,
        year: yearFilter !== 'All' ? yearFilter : undefined,
        month: monthFilter !== 'All' ? monthFilter : undefined,
      });
      if (res?.success) {
        setEmployees(res.data || []);
        setStats(res.stats || {});
      }
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [search, dept, position, status, contract, yearFilter, monthFilter]);

  useEffect(() => {
    const t = setTimeout(loadDirectory, 300);
    return () => clearTimeout(t);
  }, [loadDirectory]);

  useEffect(() => {
    setPage(1);
  }, [search, dept, position, status, contract, yearFilter, monthFilter, rowsPerPage]);

  const yearOptions = useMemo(() => buildDirectoryYearOptions(12), []);

  const totalPages = Math.max(1, Math.ceil(employees.length / rowsPerPage));
  const paginated = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return employees.slice(start, start + rowsPerPage);
  }, [employees, page, rowsPerPage]);

  const clearFilters = () => {
    setSearch('');
    setDept('All');
    setPosition('All');
    setStatus('All');
    setContract('All');
    setYearFilter('All');
    setMonthFilter('All');
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllShown = () => {
    setSelectedIds(new Set(employees.map((e) => e.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const runDelete = async (ids) => {
    if (!ids.length) return;
    setDeleting(true);
    setDeleteNotice('');
    let success = 0;
    const failed = [];
    for (const id of ids) {
      try {
        const res = await staffService.deleteStaff(id);
        if (res?.success) success += 1;
        else failed.push(id);
      } catch {
        failed.push(id);
      }
    }
    setDeleting(false);
    setDeleteConfirm(null);
    clearSelection();
    await loadDirectory();
    if (failed.length) {
      setDeleteNotice(`Removed ${success} employee(s). ${failed.length} could not be deleted (may be your own account or protected).`);
    } else {
      setDeleteNotice(`Removed ${success} employee(s).`);
    }
  };

  const confirmDeleteSelected = () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setDeleteConfirm({ mode: 'selected', count: ids.length, ids });
  };

  const confirmDeleteAllShown = () => {
    if (!employees.length) return;
    setDeleteConfirm({ mode: 'all', count: employees.length, ids: employees.map((e) => e.id) });
  };
  const inAccountant = location.pathname.startsWith('/accountant');
  const routePath = (path) => {
    if (!inAccountant) return h(path);
    const mapped = path
      .replace('/hr/directory/', '/payroll/employees/')
      .replace('/hr/directory', '/payroll/employees')
      .replace('/hr/registration', '/payroll/employees/import');
    return `/accountant${mapped}`;
  };

  const exportAsImportTemplate = () => {
    const rows = employees.map((emp) => {
      const hr = emp.hr_profile || {};
      const res = hr.residence || {};
      const birth = hr.birth_place || {};
      const kin = hr.next_of_kin || {};
      const q = Array.isArray(hr.qualifications) ? hr.qualifications[0] || {} : {};
      return {
        'First Name': emp.first_name || (emp.name || '').split(' ')[0] || '',
        'Middle Name': hr.middle_name || '',
        'Last Name': emp.last_name || (emp.name || '').split(' ').slice(1).join(' ') || '',
        Gender: emp.gender || '',
        'Date of Birth': toInputDate(emp.date_of_birth),
        Phone: emp.phone || '',
        'Alt Phone': hr.alt_phone || '',
        Email: emp.email || '',
        'Marital Status': hr.marital_status || '',
        Nationality: hr.nationality || '',
        'Birth Country': hr.birth_country || '',
        'Birth Province': birth.province || '',
        'Birth District': birth.district || '',
        'Birth Sector': birth.sector || '',
        'Birth Cell': birth.cell || '',
        'Birth Village': birth.village || '',
        'Residence Province': res.province || '',
        'Residence District': res.district || '',
        'Residence Sector': res.sector || '',
        'Residence Cell': res.cell || '',
        'Residence Village': res.village || '',
        Department: emp.department || '',
        'Position Code': emp.role_code || '',
        'Contract Type': emp.employment_type || emp.contract || '',
        'Start Date': toInputDate(emp.contract_start || emp.hire_date),
        'End Date': toInputDate(emp.contract_end),
        'Basic Salary': emp.payroll_basic_salary || '',
        'National ID': emp.national_id || '',
        'RSSB Number': hr.rssb_number || '',
        'Medical Insurance': hr.medical_insurance || '',
        'TIN Number': hr.tin_number || '',
        'Payment Method': emp.payroll_payment_method || '',
        'Bank Name': emp.payroll_bank_name || '',
        'Bank Account Number': emp.payroll_account_number || '',
        'Bank Account Holder': emp.payroll_account_holder || '',
        'Mobile Provider': hr.mobile_provider || '',
        'Mobile Money Number': emp.payroll_mobile_money_phone || '',
        'Next of Kin Name': kin.name || '',
        'Next of Kin Relationship': kin.relationship || '',
        'Next of Kin Phone': kin.phone || '',
        'Next of Kin Email': kin.email || '',
        'Next of Kin Address': kin.address || '',
        'Qualification Level': q.level || '',
        'Qualification Institution': q.institution || '',
        'Qualification Year': q.year || '',
        'Qualification Grade': q.grade || '',
      };
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, { header: EMPLOYEE_IMPORT_TEMPLATE_HEADERS });
    ws['!cols'] = EMPLOYEE_IMPORT_TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(14, h.length + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, `employee-directory-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const positionOptions = ['All', ...STAFF_POSITIONS.filter((p) => p.code !== 'CUSTOM').map((p) => p.label)];
  const statusOptions = ['All', 'Active', 'Probation', 'Suspended', 'On Leave', 'Terminated'];
  const deptOptions = ['All', ...HR_DEPARTMENTS];

  return (
    <HrPageLayout
      title="Employee Directory"
      subtitle="Manage and view all employees in the system"
      HeroIcon={Users}
      headerRight={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportAsImportTemplate}
            className="h-9 px-3 rounded-xl border border-white/20 bg-white/10 text-[10px] text-white flex items-center gap-1.5 hover:bg-white/15 uppercase tracking-wider"
            style={{ fontWeight: 500 }}
          >
            <Download size={13} /> Export <ChevronDown size={12} />
          </button>
          <button
            type="button"
            onClick={() => navigate(routePath('/hr/registration'))}
            className="h-9 px-3 rounded-xl border border-white/20 bg-white/10 text-[10px] text-white flex items-center gap-1.5 hover:bg-white/15 uppercase tracking-wider"
            style={{ fontWeight: 500 }}
          >
            <Upload size={13} /> Import
          </button>
          <button
            type="button"
            onClick={() => navigate(routePath('/hr/registration'))}
            className="h-9 px-4 rounded-xl bg-white text-[#c87800] text-[10px] uppercase tracking-wider hover:bg-amber-50 flex items-center gap-1.5"
            style={{ fontWeight: 500 }}
          >
            <UserPlus size={14} /> Add employee
          </button>
        </div>
      }
      contentClassName="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-5"
    >
      <HrPanel className="p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
          <HrSearch
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, email, position…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <HrSelect value={dept} onChange={(e) => setDept(e.target.value)} className="!w-auto min-w-[150px]">
            {deptOptions.map((o) => (
              <option key={o} value={o}>{o === 'All' ? 'All Departments' : o}</option>
            ))}
          </HrSelect>
          <HrSelect value={position} onChange={(e) => setPosition(e.target.value)} className="!w-auto min-w-[140px]">
            {positionOptions.map((o) => (
              <option key={o} value={o}>{o === 'All' ? 'All Positions' : o}</option>
            ))}
          </HrSelect>
          <HrSelect value={status} onChange={(e) => setStatus(e.target.value)} className="!w-auto min-w-[130px]">
            {statusOptions.map((o) => (
              <option key={o} value={o}>{o === 'All' ? 'All Status' : o}</option>
            ))}
          </HrSelect>
          <HrSelect value={contract} onChange={(e) => setContract(e.target.value)} className="!w-auto min-w-[130px]">
            {['All', ...CONTRACT_TYPES].map((o) => (
              <option key={o} value={o}>{o === 'All' ? 'All Types' : o}</option>
            ))}
          </HrSelect>
          <HrSelect value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="!w-auto min-w-[120px]">
            {yearOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </HrSelect>
          <HrSelect value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="!w-auto min-w-[130px]">
            {DIRECTORY_MONTHS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </HrSelect>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-[#c87800]"
            style={{ fontWeight: 500 }}
          >
            <RotateCcw size={14} /> Clear
          </button>
        </div>
      </HrPanel>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <HrStatCard icon={Users} label="Total Employees" value={String(stats.total || 0)} sub="All time" iconClass="text-sky-600 bg-sky-50" />
        <HrStatCard icon={UserCheck} label="Active Employees" value={String(stats.active || 0)} sub={`${stats.active_pct || 0}% of total`} iconClass="text-emerald-600 bg-emerald-50" />
        <HrStatCard icon={GraduationCap} label="Teachers" value={String(stats.teachers || 0)} sub={`${stats.teachers_pct || 0}% of total`} iconClass="text-violet-600 bg-violet-50" />
        <HrStatCard icon={Wrench} label="Support Staff" value={String(stats.support || 0)} sub={`${stats.support_pct || 0}% of total`} iconClass="text-orange-600 bg-orange-50" />
        <HrStatCard icon={CalendarOff} label="On Leave" value={String(stats.on_leave || 0)} sub={`${stats.on_leave_pct || 0}% of total`} iconClass="text-red-600 bg-red-50" />
      </div>

      {deleteNotice ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{deleteNotice}</div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectAllShown}
              disabled={!employees.length || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              style={{ fontWeight: 500 }}
            >
              Select all ({employees.length})
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={!selectedIds.size}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-[#c87800] disabled:opacity-50"
              style={{ fontWeight: 500 }}
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={confirmDeleteSelected}
              disabled={!selectedIds.size || deleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
              style={{ fontWeight: 500 }}
            >
              <Trash2 size={14} /> Delete selected ({selectedIds.size})
            </button>
            <button
              type="button"
              onClick={confirmDeleteAllShown}
              disabled={!employees.length || deleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-xs text-white hover:bg-red-700 disabled:opacity-50"
              style={{ fontWeight: 500 }}
            >
              <Trash2 size={14} /> Delete all shown ({employees.length})
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Per page</span>
            <HrSelect
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="!w-auto min-w-[4rem] py-1.5 text-xs"
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </HrSelect>
          </div>
        </div>
        <p className="text-xs text-slate-500 px-1">
          Showing {employees.length === 0 ? 0 : (page - 1) * rowsPerPage + 1} to{' '}
          {Math.min(page * rowsPerPage, employees.length)} of {employees.length} employees
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
            <Loader2 size={22} className="animate-spin" />
            Loading employees…
          </div>
        ) : paginated.length === 0 ? (
          <HrPanel className="p-12 text-center text-slate-400 text-sm">
            No employees found.{' '}
            <button type="button" onClick={() => navigate(routePath('/hr/registration'))} className="text-[#c87800] hover:underline">
              Register one
            </button>
          </HrPanel>
        ) : (
          <div className="space-y-3">
            {paginated.map((emp) => (
              <DirectoryEmployeeCard
                key={emp.id}
                emp={emp}
                selected={selectedIds.has(emp.id)}
                onSelect={() => toggleSelect(emp.id)}
                menuOpen={menuOpen === emp.id}
                onMenuToggle={() => setMenuOpen(menuOpen === emp.id ? null : emp.id)}
                onView={() => { setMenuOpen(null); navigate(routePath(`/hr/directory/${emp.id}`)); }}
                onEdit={() => { setMenuOpen(null); navigate(routePath(`/hr/directory/${emp.id}/edit`)); }}
                onDelete={() => {
                  setMenuOpen(null);
                  setDeleteConfirm({ mode: 'one', count: 1, ids: [emp.id], name: emp.name });
                }}
              />
            ))}
          </div>
        )}

        {totalPages >= 1 && (
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={employees.length}
            pageSize={rowsPerPage}
            itemCount={paginated.length}
            pageStartIndex={(page - 1) * rowsPerPage}
            onPageChange={setPage}
            onPageSizeChange={(n) => { setRowsPerPage(n); setPage(1); }}
            pageSizeOptions={[10, 25, 50]}
          />
        )}
      </div>

      <HrModal
        open={!!deleteConfirm}
        onClose={() => !deleting && setDeleteConfirm(null)}
        title="Delete employee(s)?"
        footer={(
          <>
            <HrBtnOutline onClick={() => setDeleteConfirm(null)} disabled={deleting}>Cancel</HrBtnOutline>
            <HrBtnPrimary
              className="!bg-red-600 hover:!bg-red-700 !border-red-600"
              onClick={() => runDelete(deleteConfirm?.ids || [])}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : `Delete ${deleteConfirm?.count || 0}`}
            </HrBtnPrimary>
          </>
        )}
      >
        <div className="flex gap-3 text-sm text-slate-600">
          <AlertTriangle className="text-red-500 shrink-0" size={20} />
          <div>
            {deleteConfirm?.mode === 'one' ? (
              <p>Remove <strong>{deleteConfirm.name}</strong> from the directory? This soft-deletes their account.</p>
            ) : deleteConfirm?.mode === 'all' ? (
              <p>Remove all <strong>{deleteConfirm.count}</strong> employees matching your current filters? This cannot be undone easily.</p>
            ) : (
              <p>Remove <strong>{deleteConfirm?.count}</strong> selected employee(s)?</p>
            )}
            <p className="text-xs text-slate-400 mt-2">You cannot delete your own logged-in account.</p>
          </div>
        </div>
      </HrModal>
    </HrPageLayout>
  );
}
