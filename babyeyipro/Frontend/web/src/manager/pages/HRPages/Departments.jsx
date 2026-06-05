import { useState, useEffect, useCallback } from 'react';

import { Building2, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

import {

  HrPageLayout, HrPanel, HrBtnPrimary, HrBtnOutline, HrModal, HrField, HrInput, HrBtnGhost,

} from './hrUi';

import hrService from '../../services/hrService';



const chipColors = ['bg-amber-50 text-amber-800', 'bg-sky-50 text-sky-800', 'bg-emerald-50 text-emerald-800', 'bg-violet-50 text-violet-800', 'bg-teal-50 text-teal-800', 'bg-orange-50 text-orange-800'];



export default function Departments() {

  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [expanded, setExpanded] = useState(null);

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', head_name: '', budget_rwf: '' });

  const [error, setError] = useState('');



  const loadDepartments = useCallback(async () => {

    setLoading(true);

    setError('');

    try {

      let res = await hrService.getDepartments();

      if (!res?.success) throw new Error(res?.message || 'Failed to load');

      if (!res.data?.length) {

        await hrService.seedDefaultDepartments();

        res = await hrService.getDepartments();

      }

      setDepartments(res?.data || []);

    } catch (err) {

      setError(err?.message || 'Could not load departments');

      setDepartments([]);

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    loadDepartments();

  }, [loadDepartments]);



  const openCreateModal = async () => {

    setForm({ name: '', head_name: '', budget_rwf: '' });

    setShowModal(true);

    try {

      await hrService.seedDefaultDepartments();

      await loadDepartments();

    } catch {

      /* seed is best-effort */

    }

  };



  const handleCreate = async () => {

    if (!form.name.trim()) {

      setError('Department name is required.');

      return;

    }

    setSaving(true);

    setError('');

    try {

      const res = await hrService.createDepartment({

        name: form.name.trim(),

        head_name: form.head_name.trim() || null,

        budget_rwf: form.budget_rwf ? Number(form.budget_rwf) : null,

      });

      if (!res?.success) throw new Error(res?.message || 'Create failed');

      setShowModal(false);

      await loadDepartments();

    } catch (err) {

      setError(err?.response?.data?.message || err.message || 'Could not create department');

    } finally {

      setSaving(false);

    }

  };



  const handleDelete = async (deptId) => {

    if (!window.confirm('Remove this department?')) return;

    try {

      await hrService.deleteDepartment(deptId);

      await loadDepartments();

    } catch (err) {

      setError(err?.response?.data?.message || 'Delete failed');

    }

  };



  const totalEmployees = departments.reduce((s, d) => s + (d.employees || 0), 0);



  const kpiTiles = [

    { icon: Building2, label: 'Departments', value: String(departments.length), subValue: 'Organizational units' },

    { icon: Building2, label: 'Employees', value: String(totalEmployees), subValue: 'Assigned to departments' },

  ];



  return (

    <HrPageLayout

      title="Departments"

      subtitle="Structure, heads, budgets, and sub-units"

      HeroIcon={Building2}

      kpiTiles={kpiTiles}

    >

      {error && !showModal ? (

        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{error}</div>

      ) : null}



      <div className="flex justify-end">

        <HrBtnPrimary icon={Plus} onClick={openCreateModal}>Create department</HrBtnPrimary>

      </div>



      {loading ? (

        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">

          <Loader2 size={20} className="animate-spin" /> Loading departments…

        </div>

      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {departments.map((dept, i) => (

            <HrPanel key={dept.id} className="overflow-hidden">

              <div className="p-4">

                <div className="flex items-start gap-3">

                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm shrink-0 ${chipColors[i % chipColors.length]}`} style={{ fontWeight: 500 }}>

                    {dept.name[0]}

                  </div>

                  <div className="flex-1 min-w-0">

                    <h3 className="text-sm text-[#000435]" style={{ fontWeight: 500 }}>{dept.name}</h3>

                    <p className="text-slate-500 text-xs mt-0.5">

                      {dept.head_name ? `Head: ${dept.head_name}` : <span className="text-[#c87800]">No head assigned</span>}

                    </p>

                  </div>

                  <div className="flex gap-1">

                    <HrBtnGhost><Pencil size={14} strokeWidth={1.75} /></HrBtnGhost>

                    <HrBtnGhost className="hover:text-red-600" onClick={() => handleDelete(dept.id)}><Trash2 size={14} strokeWidth={1.75} /></HrBtnGhost>

                  </div>

                </div>



                <div className="mt-4 grid grid-cols-3 gap-2">

                  {[

                    { label: 'Employees', value: dept.employees || 0, cls: 'text-[#000435]' },

                    { label: 'Male', value: dept.male || 0, cls: 'text-sky-600' },

                    { label: 'Female', value: dept.female || 0, cls: 'text-pink-600' },

                  ].map((s) => (

                    <div key={s.label} className="text-center p-2 bg-slate-50 rounded-xl border border-slate-100">

                      <p className={`text-lg tabular-nums ${s.cls}`} style={{ fontWeight: 500 }}>{s.value}</p>

                      <p className="text-slate-400 text-[10px] uppercase tracking-wide">{s.label}</p>

                    </div>

                  ))}

                </div>



                {dept.budget_rwf ? (

                  <div className="mt-3 text-xs text-slate-500">

                    Budget: <span className="text-slate-700" style={{ fontWeight: 500 }}>{Number(dept.budget_rwf).toLocaleString()} RWF</span>

                  </div>

                ) : null}



                <button

                  type="button"

                  onClick={() => setExpanded(expanded === dept.id ? null : dept.id)}

                  className="mt-3 text-xs text-[#c87800] flex items-center gap-1 w-full"

                  style={{ fontWeight: 500 }}

                >

                  {expanded === dept.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}

                  Department details

                </button>

                {expanded === dept.id && (

                  <div className="mt-2 text-xs text-slate-500 space-y-1">

                    <p>Created: {dept.created_at ? new Date(dept.created_at).toLocaleDateString() : '—'}</p>

                    <p>ID: {dept.id}</p>

                  </div>

                )}

              </div>

            </HrPanel>

          ))}

        </div>

      )}



      <HrModal

        open={showModal}

        onClose={() => !saving && setShowModal(false)}

        title="Create department"

        footer={

          <>

            <HrBtnOutline className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancel</HrBtnOutline>

            <HrBtnPrimary className="flex-1" onClick={handleCreate} disabled={saving}>

              {saving ? 'Creating…' : 'Create'}

            </HrBtnPrimary>

          </>

        }

      >

        {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}

        <p className="text-xs text-slate-500 mb-4 bg-amber-50/80 border border-amber-100 rounded-xl px-3 py-2">

          Default departments (Leadership, Teaching Staff, Finance, etc.) are added to your school database when you open this form.

        </p>

        <HrField label="Department name">

          <HrInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Mathematics" />

        </HrField>

        <HrField label="Department head">

          <HrInput value={form.head_name} onChange={(e) => setForm((f) => ({ ...f, head_name: e.target.value }))} placeholder="Head name (optional)" />

        </HrField>

        <HrField label="Budget (RWF)">

          <HrInput type="number" value={form.budget_rwf} onChange={(e) => setForm((f) => ({ ...f, budget_rwf: e.target.value }))} placeholder="Optional" />

        </HrField>

      </HrModal>

    </HrPageLayout>

  );

}

