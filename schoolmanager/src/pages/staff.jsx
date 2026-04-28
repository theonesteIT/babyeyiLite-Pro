import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Users,
  Eye,
  Pencil,
  Trash2,
  Power,
} from 'lucide-react';
import { deleteStaff, listStaff, setStaffActive } from '../services/staffApi';

export default function Staff() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await listStaff());
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to fetch staff.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const departments = useMemo(() => {
    const byDept = rows.reduce((acc, r) => {
      const key = r.department || 'Other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return [{ name: 'All', count: rows.length }, ...Object.entries(byDept).map(([name, count]) => ({ name, count }))];
  }, [rows]);

  const filtered = rows.filter((r) => {
    const fullName = r.full_name || `${r.first_name || ''} ${r.last_name || ''}`.trim();
    const bySearch = !search || `${fullName} ${r.email || ''} ${r.role_name || ''}`.toLowerCase().includes(search.toLowerCase());
    const byDept = department === 'All' || (r.department || 'Other') === department;
    return bySearch && byDept;
  });

  const onDelete = async (id) => {
    if (!window.confirm('Delete this staff member?')) return;
    await deleteStaff(id);
    await load();
  };

  const onToggleActive = async (id, current) => {
    await setStaffActive(id, !current);
    await load();
  };

  return (
    <div id='staff-div' className="flex flex-col h-full bg-white border border-slate-200 overflow-hidden text-sm text-slate-700">
      
      {/* Action Bar */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-slate-200 bg-white relative">
        
        <div className="flex items-center gap-3">
          <Link to="/staff/new" className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-md text-sm font-semibold tracking-wide shadow-sm transition no-underline">
            Add Staff (HR Central)
          </Link>
          <h1 className="text-base font-semibold text-slate-800">HR Central Staff</h1>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center border border-slate-300 rounded-md overflow-hidden focus-within:border-primary/60">
            <div className="flex items-center px-3 py-1.5">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Search..."
                className="w-52 text-sm bg-transparent focus:outline-none placeholder:text-slate-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

       <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 border-r border-slate-100 p-3 bg-white">
          <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-3 h-3 text-primary" /> DEPARTMENT
          </h2>
          <nav className="space-y-0.5">
            {departments.map((dept) => (
              <div 
                key={dept.name}
                onClick={() => setDepartment(dept.name)}
                className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer text-xs transition-all ${dept.name === department ? 'bg-primary/5 text-primary font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span>{dept.name}</span>
                <span className={`text-[10px] font-medium ${dept.name === 'All' ? 'text-primary' : 'text-slate-400'}`}>{dept.count}</span>
              </div>
            ))}
          </nav>
        </aside>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-gray-100">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-slate-200 text-slate-800 text-[11px] font-bold bg-white">
                <th className="px-4 py-2 border-r border-slate-100 uppercase tracking-wider">Name</th>
                <th className="px-4 py-2 border-r border-slate-100 uppercase tracking-wider">Staff ID</th>
                <th className="px-4 py-2 border-r border-slate-100 uppercase tracking-wider">Work Phone</th>
                <th className="px-4 py-2 border-r border-slate-100 uppercase tracking-wider">Email</th>
                <th className="px-4 py-2 border-r border-slate-100 uppercase tracking-wider">Department</th>
                <th className="px-4 py-2 border-r border-slate-100 uppercase tracking-wider">Role</th>
                <th className="px-4 py-2 border-r border-slate-100 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {loading ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Loading staff...</td></tr> : null}
              {error ? <tr><td colSpan={8} className="px-4 py-8 text-center text-red-600">{error}</td></tr> : null}
              {!loading && !error && filtered.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No staff found.</td></tr> : null}
              {filtered.map((emp, index) => {
                const name = emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
                return (
                <tr key={emp.id} className={`border-b border-slate-200 transition-colors hover:bg-primary/5 ${index % 2 !== 0 ? 'bg-slate-200' : ''}`}>
                  <td className="px-4 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary overflow-hidden shadow-sm border border-primary/20">
                        {name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-700">{name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-1.5 text-slate-600">{emp.staff_id || '-'}</td>
                  <td className="px-4 py-1.5 text-slate-600 font-medium">{emp.phone || '-'}</td>
                  <td className="px-4 py-1.5 text-slate-600">{emp.email || '-'}</td>
                  <td className="px-4 py-1.5 text-slate-600">{emp.department || '-'}</td>
                  <td className="px-4 py-1.5 text-slate-600 font-medium">{emp.role_name || emp.role_code || '-'}</td>
                  <td className="px-4 py-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${emp.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-1.5">
                    <div className="flex items-center gap-2">
                      <button title="View" className="text-slate-500 hover:text-primary" onClick={() => window.alert(`Staff: ${name}\nEmail: ${emp.email || '-'}\nRole: ${emp.role_name || emp.role_code || '-'}`)}><Eye size={14} /></button>
                      <Link title="Edit" className="text-slate-500 hover:text-amber-600" to={`/staff/new?id=${emp.id}`}><Pencil size={14} /></Link>
                      <button title="Delete" className="text-slate-500 hover:text-red-600" onClick={() => onDelete(emp.id)}><Trash2 size={14} /></button>
                      <button title={emp.is_active ? 'Deactivate' : 'Activate'} className="text-slate-500 hover:text-indigo-600" onClick={() => onToggleActive(emp.id, !!emp.is_active)}><Power size={14} /></button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}