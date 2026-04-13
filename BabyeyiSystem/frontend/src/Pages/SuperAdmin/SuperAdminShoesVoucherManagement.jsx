import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, FileText, Loader2, Package, Pencil, Plus, Trash2, Truck } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api`;
const axCfg = { withCredentials: true };
const inp = 'w-full border-2 border-amber-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400';

const emptyForm = {
  id: null,
  service_code: '',
  name: '',
  category: 'Voucher',
  academic_year: '2026-2027',
  short_tagline: '',
  description: '',
  default_pricing_type: 'global',
  global_amount: '15000',
  stock_quantity: '',
  delivery_fee: '0',
  available_sizes: '32,33,34,35,36,37,38,39,40',
  shoe_categories: 'Formal,Sports,Canvas',
  status: 'draft',
};

export default function SuperAdminShoesVoucherManagement() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('packages');
  const [rows, setRows] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [packageSearch, setPackageSearch] = useState('');
  const [queueSearch, setQueueSearch] = useState('');
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [toast, setToast] = useState(null);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/student-services/admin/services`, axCfg);
      const list = (res.data?.data || []).filter((s) => {
        const hay = `${s.name || ''} ${s.service_code || ''}`.toLowerCase();
        return hay.includes('shoe');
      });
      setRows(list);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/student-services/admin/shoes/orders`, { ...axCfg, params: { search: queueSearch.trim() || undefined } });
      setOrders(res.data?.data || []);
    } finally {
      setLoading(false);
    }
  }, [queueSearch]);

  const loadAgents = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/student-services/admin/shoes/agents`, axCfg);
      setAgents(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setAgents([]);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    if (tab === 'packages') loadPackages();
  }, [tab, loadPackages]);

  useEffect(() => {
    if (tab !== 'queue') return;
    const t = setTimeout(() => loadOrders(), 320);
    return () => clearTimeout(t);
  }, [tab, queueSearch, loadOrders]);

  const downloadExport = async (format) => {
    const params = new URLSearchParams({ format });
    if (queueSearch.trim()) params.set('search', queueSearch.trim());
    const res = await fetch(`${API}/student-services/admin/shoes/orders/export?${params}`, { credentials: 'include' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      window.alert(j.message || 'Export failed');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
    a.download = `shoes-voucher-orders-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setForm({
      id: r.id,
      service_code: r.service_code || '',
      name: r.name || '',
      category: r.category || 'Voucher',
      academic_year: r.academic_year || '',
      short_tagline: r.short_tagline || '',
      description: r.description || '',
      default_pricing_type: r.default_pricing_type || 'global',
      global_amount: String(r.price_from ?? ''),
      stock_quantity: r.stock_quantity == null ? '' : String(r.stock_quantity),
      delivery_fee: String(r.delivery_fee ?? 0),
      available_sizes: Array.isArray(r.available_sizes) ? r.available_sizes.join(',') : '',
      shoe_categories: Array.isArray(r.shoe_categories) ? r.shoe_categories.join(',') : '',
      status: r.status || 'draft',
    });
    setModalOpen(true);
  };

  const removePackage = async (r) => {
    if (!window.confirm(`Delete “${r.name}”? It will be removed from the catalog (soft delete).`)) return;
    try {
      await axios.delete(`${API}/student-services/admin/services/${r.id}`, axCfg);
      setToast({ type: 'ok', message: 'Package removed.' });
      loadPackages();
    } catch (e) {
      setToast({ type: 'err', message: e.response?.data?.message || e.message || 'Delete failed' });
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const savePackage = async () => {
    if (!form.service_code.trim() || !form.name.trim()) return;
    setSaving(true);
    const fd = new FormData();
    fd.append('service_code', form.service_code.trim());
    fd.append('name', form.name.trim());
    fd.append('category', form.category);
    fd.append('academic_year', form.academic_year);
    fd.append('short_tagline', form.short_tagline);
    fd.append('description', form.description);
    fd.append('default_pricing_type', 'global');
    fd.append('prices', JSON.stringify([{ pricing_type: 'global', amount: Number(form.global_amount || 0), academic_year: form.academic_year }]));
    fd.append('stock_quantity', form.stock_quantity);
    fd.append('delivery_fee', form.delivery_fee);
    fd.append('available_sizes', JSON.stringify(form.available_sizes.split(',').map((x) => x.trim()).filter(Boolean)));
    fd.append('shoe_categories', JSON.stringify(form.shoe_categories.split(',').map((x) => x.trim()).filter(Boolean)));
    fd.append('status', form.status);
    if (form.id) await axios.put(`${API}/student-services/admin/services/${form.id}`, fd, { withCredentials: true });
    else await axios.post(`${API}/student-services/admin/services`, fd, { withCredentials: true });
    setModalOpen(false);
    loadPackages();
    setSaving(false);
  };

  const setQueueStatus = async (orderId, status) => {
    const agentId = selectedAgentId === '' ? null : Number(selectedAgentId);
    await axios.patch(`${API}/student-services/admin/shoes/orders/${orderId}/status`, {
      fulfillment_status: status,
      agent_user_id: Number.isFinite(agentId) ? agentId : null,
    }, axCfg);
    loadOrders();
  };

  const filteredRows = useMemo(() => {
    const q = packageSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.name} ${r.service_code}`.toLowerCase().includes(q));
  }, [rows, packageSearch]);

  return (
    <div className="min-h-screen bg-amber-50/40">
      <header className="sticky top-0 z-20 bg-white border-b border-amber-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/superadmin/dashboard')} className="inline-flex items-center gap-2 text-amber-800 font-bold text-sm"><ArrowLeft size={16} /> Dashboard</button>
          <h1 className="font-black text-[#000435]">Shoes Voucher Management</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        {toast && (
          <div
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
              toast.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toast.message}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setTab('packages')} className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'packages' ? 'bg-[#000435] text-amber-400' : 'bg-white border border-amber-200 text-amber-800'}`}>Packages</button>
          <button onClick={() => setTab('queue')} className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'queue' ? 'bg-[#000435] text-amber-400' : 'bg-white border border-amber-200 text-amber-800'}`}>Approval Queue</button>
          <button type="button" onClick={() => downloadExport('csv')} className="px-3 py-2 rounded-xl text-sm font-bold bg-white border border-amber-200 text-amber-800 inline-flex items-center gap-1.5"><Download size={14} /> CSV</button>
          <button type="button" onClick={() => downloadExport('xlsx')} className="px-3 py-2 rounded-xl text-sm font-bold bg-white border border-amber-200 text-amber-800 inline-flex items-center gap-1.5"><FileSpreadsheet size={14} /> Excel</button>
          <button type="button" onClick={() => downloadExport('pdf')} className="px-3 py-2 rounded-xl text-sm font-bold bg-white border border-amber-200 text-amber-800 inline-flex items-center gap-1.5"><FileText size={14} /> PDF</button>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4">
          <div className="flex flex-wrap gap-2 items-center justify-between mb-3">
            <input
              className={`${inp} max-w-sm`}
              placeholder={tab === 'packages' ? 'Search packages…' : 'Search orders (code, buyer, school…)'}
              value={tab === 'packages' ? packageSearch : queueSearch}
              onChange={(e) => (tab === 'packages' ? setPackageSearch(e.target.value) : setQueueSearch(e.target.value))}
            />
            {tab === 'packages' && <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#000435] text-amber-400 font-bold"><Plus size={14} /> New package</button>}
          </div>

          {loading ? (
            <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" /></div>
          ) : tab === 'packages' ? (
            <div className="grid md:grid-cols-2 gap-3">
              {filteredRows.map((r) => (
                <div key={r.id} className="border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-black text-[#000435]">{r.name}</div>
                      <div className="text-xs text-amber-700">{r.service_code}</div>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      <button type="button" onClick={() => openEdit(r)} className="text-xs px-2 py-1 border rounded-lg text-slate-700 inline-flex items-center gap-1"><Pencil size={12} /> Edit</button>
                      <button type="button" onClick={() => removePackage(r)} className="text-xs px-2 py-1 border border-red-200 rounded-lg bg-red-50 text-red-700 inline-flex items-center gap-1 font-bold"><Trash2 size={12} /> Delete</button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">{r.short_tagline || r.description}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Tag text={`From ${Number(r.price_from || 0).toLocaleString()} Frw`} />
                    <Tag text={`Stock: ${r.stock_quantity == null ? 'Unlimited' : r.stock_quantity}`} />
                    <Tag text={`Delivery fee: ${Number(r.delivery_fee || 0).toLocaleString()} Frw`} />
                    <Tag text={`Status: ${r.status}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 items-end">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-amber-800 mb-1">Assign field agent</label>
                  <select className={inp} value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)}>
                    <option value="">None (keep current assignment)</option>
                    {agents.map((a) => (
                      <option key={a.id} value={String(a.id)}>{a.label}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-600 md:col-span-2 pb-1">When you tap a status below, the selected agent is stored on that order (if you pick one).</p>
              </div>
              {orders.map((o) => (
                <div key={o.id} className="border border-amber-200 rounded-xl p-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <div className="font-bold text-[#000435]">{o.order_number} · {o.service_name}</div>
                      <div className="text-xs text-slate-600">{o.school_name || '—'} · {o.first_name} {o.last_name} · {o.student_code || '—'}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-black text-amber-700">{Number(o.amount || 0).toLocaleString()} Frw</div>
                      <div className="text-xs text-slate-600">{o.payment_status} · {o.fulfillment_status}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['Approved', 'Processing', 'Ready for delivery', 'Delivered', 'Completed', 'Rejected'].map((st) => (
                      <button key={st} onClick={() => setQueueStatus(o.id, st)} className="text-xs px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-800">{st}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-600 inline-flex items-center gap-2"><CheckCircle2 size={14} /> Professional shoes voucher admin flow with package management, size sets, stock, delivery fees, queue actions and export.</p>
        <p className="text-xs text-slate-600 inline-flex items-center gap-2"><Truck size={14} /> Users can track statuses: Pending → Paid → Approved → Processing → Ready for delivery → Delivered → Completed.</p>
        <p className="text-xs"><Link to="/superadmin/voucher-services" className="text-amber-700 underline">Open general voucher services page</Link></p>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-[#000435] inline-flex items-center gap-2"><Package size={16} /> {form.id ? 'Edit package' : 'Create package'}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Package name"><input className={inp} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></Field>
              <Field label="Service code"><input className={inp} value={form.service_code} onChange={(e) => setForm((p) => ({ ...p, service_code: e.target.value }))} /></Field>
              <Field label="Academic year"><input className={inp} value={form.academic_year} onChange={(e) => setForm((p) => ({ ...p, academic_year: e.target.value }))} /></Field>
              <Field label="Price (FRW)"><input type="number" className={inp} value={form.global_amount} onChange={(e) => setForm((p) => ({ ...p, global_amount: e.target.value }))} /></Field>
              <Field label="Delivery fee (FRW)"><input type="number" className={inp} value={form.delivery_fee} onChange={(e) => setForm((p) => ({ ...p, delivery_fee: e.target.value }))} /></Field>
              <Field label="Stock"><input type="number" className={inp} value={form.stock_quantity} onChange={(e) => setForm((p) => ({ ...p, stock_quantity: e.target.value }))} /></Field>
            </div>
            <Field label="Short tagline"><input className={inp} value={form.short_tagline} onChange={(e) => setForm((p) => ({ ...p, short_tagline: e.target.value }))} /></Field>
            <Field label="Description"><textarea className={`${inp} min-h-[70px]`} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Available sizes (comma separated)"><input className={inp} value={form.available_sizes} onChange={(e) => setForm((p) => ({ ...p, available_sizes: e.target.value }))} /></Field>
              <Field label="Shoe categories (comma separated)"><input className={inp} value={form.shoe_categories} onChange={(e) => setForm((p) => ({ ...p, shoe_categories: e.target.value }))} /></Field>
            </div>
            <Field label="Status">
              <select className={inp} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="draft">Draft</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option>
              </select>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold">Cancel</button>
              <button onClick={savePackage} disabled={saving} className="px-4 py-2 rounded-xl bg-[#000435] text-amber-400 font-black">{saving ? 'Saving...' : 'Save package'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] uppercase font-bold tracking-wide text-amber-800 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Tag({ text }) {
  return <span className="px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">{text}</span>;
}
