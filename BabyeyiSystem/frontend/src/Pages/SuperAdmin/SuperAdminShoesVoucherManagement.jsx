import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, FileText, Loader2, Package, Pencil, Plus, Trash2, Truck } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api`;
const axCfg = { withCredentials: true };
const inp = 'w-full border-2 border-amber-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400';

function apiOrigin() {
  const raw = String(import.meta.env.VITE_API_URL || 'http://localhost:5100')
    .trim()
    .replace(/\/+$/, '');
  return raw.replace(/\/api\/?$/i, '') || 'http://localhost:5100';
}

/** Fixed catalog — Super Admin toggles which appear on this package and uploads an image each */
const SHOE_MODEL_PRESETS = [
  { id: 'mentor', label: 'Mentor', hint: 'Classic school profile' },
  { id: 'bata-toughes', label: 'Bata Toughes', hint: 'Hard-wearing everyday' },
  { id: 'crabkids', label: 'Crabkids', hint: 'Youth-friendly fit' },
];

const MODEL_UPLOAD_KEYS = {
  mentor: 'model_image_mentor',
  'bata-toughes': 'model_image_bata_toughes',
  crabkids: 'model_image_crabkids',
};

const emptyEnabled = () => ({ mentor: false, 'bata-toughes': false, crabkids: false });
const emptyUrls = () => ({ mentor: null, 'bata-toughes': null, crabkids: null });

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
  /** Super Admin shoe model (groups many packages for parents) */
  shoe_brand_model_id: '',
  shoeModelsEnabled: emptyEnabled(),
  shoeModelExistingUrls: emptyUrls(),
};

export default function SuperAdminShoesVoucherManagement() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('packages');
  const [brandModels, setBrandModels] = useState([]);
  const [rows, setRows] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [packageSearch, setPackageSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [queueSearch, setQueueSearch] = useState('');
  const [queuePaymentFilter, setQueuePaymentFilter] = useState('all');
  const [queueFulfillmentFilter, setQueueFulfillmentFilter] = useState('');
  const [agents, setAgents] = useState([]);
  /** order id → agent user id string for PATCH */
  const [agentPick, setAgentPick] = useState({});
  const [toast, setToast] = useState(null);
  /** New image file per model id (optional; keeps existing URL on server if omitted) */
  const [shoeModelFiles, setShoeModelFiles] = useState(() => ({ ...emptyEnabled() }));

  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [modelForm, setModelForm] = useState({ id: null, name: '', sort_order: '0', image: null, existingUrl: '' });
  const [modelSaving, setModelSaving] = useState(false);

  const loadBrandModels = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/student-services/admin/shoe-brand-models`, axCfg);
      setBrandModels(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setBrandModels([]);
    }
  }, []);

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
      const params = {};
      if (queueSearch.trim()) params.search = queueSearch.trim();
      if (queuePaymentFilter === 'paid') params.payment = 'paid';
      if (queuePaymentFilter === 'unpaid') params.payment = 'unpaid';
      if (queueFulfillmentFilter) params.fulfillment_status = queueFulfillmentFilter;
      const res = await axios.get(`${API}/student-services/admin/shoes/orders`, { ...axCfg, params });
      const list = res.data?.data || [];
      setOrders(list);
      setAgentPick(() => {
        const next = {};
        list.forEach((o) => {
          next[o.id] = o.agent_user_id != null ? String(o.agent_user_id) : '';
        });
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [queueSearch, queuePaymentFilter, queueFulfillmentFilter]);

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
    loadBrandModels();
  }, [loadBrandModels]);

  useEffect(() => {
    if (tab === 'models') loadBrandModels();
  }, [tab, loadBrandModels]);

  useEffect(() => {
    if (tab === 'packages') loadPackages();
  }, [tab, loadPackages]);

  useEffect(() => {
    if (tab !== 'queue') return;
    const t = setTimeout(() => loadOrders(), queueSearch.trim() ? 320 : 0);
    return () => clearTimeout(t);
  }, [tab, queueSearch, queuePaymentFilter, queueFulfillmentFilter, loadOrders]);

  const downloadExport = async (format) => {
    const params = new URLSearchParams({ format });
    if (queueSearch.trim()) params.set('search', queueSearch.trim());
    if (tab === 'queue') {
      if (queuePaymentFilter === 'paid') params.set('payment', 'paid');
      if (queuePaymentFilter === 'unpaid') params.set('payment', 'unpaid');
      if (queueFulfillmentFilter) params.set('fulfillment_status', queueFulfillmentFilter);
    }
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
    loadBrandModels();
    setForm({ ...emptyForm, shoeModelsEnabled: emptyEnabled(), shoeModelExistingUrls: emptyUrls(), shoe_brand_model_id: '' });
    setShoeModelFiles({ ...emptyEnabled() });
    setModalOpen(true);
  };

  const openEdit = (r) => {
    const en = emptyEnabled();
    const exUrls = emptyUrls();
    if (Array.isArray(r.shoe_models)) {
      r.shoe_models.forEach((x) => {
        const id = x.model_id || x.id;
        if (id && Object.prototype.hasOwnProperty.call(en, id)) {
          en[id] = true;
          if (x.image_url) {
            const u = String(x.image_url);
            exUrls[id] = u.startsWith('http') ? u : `${apiOrigin()}${u.startsWith('/') ? u : `/${u}`}`;
          }
        }
      });
    }
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
      shoe_brand_model_id: r.shoe_brand_model_id != null && r.shoe_brand_model_id !== '' ? String(r.shoe_brand_model_id) : '',
      shoeModelsEnabled: en,
      shoeModelExistingUrls: exUrls,
    });
    setShoeModelFiles({ ...emptyEnabled() });
    loadBrandModels();
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
    const useBrand = String(form.shoe_brand_model_id || '').trim() !== '';
    let selectedModels = SHOE_MODEL_PRESETS.filter((m) => form.shoeModelsEnabled[m.id]).map((m) => ({ model_id: m.id }));
    if (!useBrand) {
      if (!selectedModels.length) {
        setToast({ type: 'err', message: 'Either assign a Shoe model (Models tab) or select at least one legacy preset below.' });
        return;
      }
      for (const m of SHOE_MODEL_PRESETS) {
        if (!form.shoeModelsEnabled[m.id]) continue;
        const hasNew = !!shoeModelFiles[m.id];
        const hasExisting = !!(form.id && form.shoeModelExistingUrls[m.id]);
        if (!hasNew && !hasExisting) {
          setToast({ type: 'err', message: `Upload an image for ${m.label}, or clear that model.` });
          return;
        }
      }
    } else {
      selectedModels = [{ model_id: 'mentor' }];
    }
    setSaving(true);
    try {
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
      if (useBrand) fd.append('shoe_brand_model_id', String(form.shoe_brand_model_id));
      else fd.append('shoe_brand_model_id', '');
      fd.append('shoe_models', JSON.stringify(selectedModels));
      fd.append('status', form.status);
      if (!useBrand) {
        SHOE_MODEL_PRESETS.forEach((m) => {
          const key = MODEL_UPLOAD_KEYS[m.id];
          const file = shoeModelFiles[m.id];
          if (key && file) fd.append(key, file);
        });
      }
      if (form.id) await axios.put(`${API}/student-services/admin/services/${form.id}`, fd, axCfg);
      else await axios.post(`${API}/student-services/admin/services`, fd, axCfg);
      setModalOpen(false);
      setShoeModelFiles({ ...emptyEnabled() });
      loadPackages();
      setToast({ type: 'ok', message: 'Package saved.' });
    } catch (e) {
      setToast({ type: 'err', message: e.response?.data?.message || e.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const setQueueStatus = async (orderId, status) => {
    const raw = agentPick[orderId];
    const agent_user_id = raw !== undefined && raw !== '' ? Number(raw) : null;
    await axios.patch(`${API}/student-services/admin/shoes/orders/${orderId}/status`, {
      fulfillment_status: status,
      agent_user_id: Number.isFinite(agent_user_id) ? agent_user_id : null,
    }, axCfg);
    loadOrders();
  };

  const filteredRows = useMemo(() => {
    const q = packageSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.name} ${r.service_code}`.toLowerCase().includes(q));
  }, [rows, packageSearch]);

  const filteredBrandModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return brandModels;
    return brandModels.filter((m) => `${m.name} ${m.slug}`.toLowerCase().includes(q));
  }, [brandModels, modelSearch]);

  const saveBrandModel = async () => {
    if (!modelForm.name.trim()) {
      setToast({ type: 'err', message: 'Name is required.' });
      return;
    }
    if (!modelForm.id && !modelForm.image) {
      setToast({ type: 'err', message: 'Upload a hero image for this model.' });
      return;
    }
    setModelSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', modelForm.name.trim());
      fd.append('sort_order', modelForm.sort_order || '0');
      if (modelForm.image) fd.append('image', modelForm.image);
      if (modelForm.id) {
        await axios.put(`${API}/student-services/admin/shoe-brand-models/${modelForm.id}`, fd, axCfg);
      } else {
        await axios.post(`${API}/student-services/admin/shoe-brand-models`, fd, axCfg);
      }
      setModelModalOpen(false);
      await loadBrandModels();
      setToast({ type: 'ok', message: 'Shoe model saved.' });
    } catch (e) {
      setToast({ type: 'err', message: e.response?.data?.message || e.message || 'Save failed' });
    } finally {
      setModelSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="font-bold text-[#000435] text-lg">Shoes Voucher Management</h1>
        <p className="text-xs text-slate-600 mt-0.5">Packages, models, and approval queue</p>
      </div>

      <div className="space-y-4">
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
          <button onClick={() => setTab('models')} className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'models' ? 'bg-[#000435] text-amber-400' : 'bg-white border border-amber-200 text-amber-800'}`}>Shoe models</button>
          <button onClick={() => setTab('queue')} className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'queue' ? 'bg-[#000435] text-amber-400' : 'bg-white border border-amber-200 text-amber-800'}`}>Approval Queue</button>
          <button type="button" onClick={() => downloadExport('csv')} className="px-3 py-2 rounded-xl text-sm font-bold bg-white border border-amber-200 text-amber-800 inline-flex items-center gap-1.5"><Download size={14} /> CSV</button>
          <button type="button" onClick={() => downloadExport('xlsx')} className="px-3 py-2 rounded-xl text-sm font-bold bg-white border border-amber-200 text-amber-800 inline-flex items-center gap-1.5"><FileSpreadsheet size={14} /> Excel</button>
          <button type="button" onClick={() => downloadExport('pdf')} className="px-3 py-2 rounded-xl text-sm font-bold bg-white border border-amber-200 text-amber-800 inline-flex items-center gap-1.5"><FileText size={14} /> PDF</button>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4">
          <div className="flex flex-wrap gap-2 items-center justify-between mb-3">
            <input
              className={`${inp} max-w-sm`}
              placeholder={
                tab === 'packages' ? 'Search packages…' : tab === 'models' ? 'Search shoe models…' : 'Search orders (code, buyer, school…)'
              }
              value={tab === 'packages' ? packageSearch : tab === 'models' ? modelSearch : queueSearch}
              onChange={(e) => {
                if (tab === 'packages') setPackageSearch(e.target.value);
                else if (tab === 'models') setModelSearch(e.target.value);
                else setQueueSearch(e.target.value);
              }}
            />
            {tab === 'packages' && <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#000435] text-amber-400 font-bold"><Plus size={14} /> New package</button>}
            {tab === 'models' && (
              <button
                type="button"
                onClick={() => {
                  setModelForm({ id: null, name: '', sort_order: '0', image: null, existingUrl: '' });
                  setModelModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#000435] text-amber-400 font-bold"
              >
                <Plus size={14} /> New shoe model
              </button>
            )}
          </div>

          {tab === 'queue' && (
            <div className="flex flex-wrap gap-2 mb-3">
              <select
                className={`${inp} max-w-[200px]`}
                value={queuePaymentFilter}
                onChange={(e) => setQueuePaymentFilter(e.target.value)}
              >
                <option value="all">All payments</option>
                <option value="paid">Paid only</option>
                <option value="unpaid">Not paid</option>
              </select>
              <select
                className={`${inp} max-w-[240px]`}
                value={queueFulfillmentFilter}
                onChange={(e) => setQueueFulfillmentFilter(e.target.value)}
              >
                <option value="">All delivery statuses</option>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Delivered">Delivered</option>
                <option value="Not delivered">Not delivered</option>
                <option value="Out of stock">Out of stock</option>
              </select>
            </div>
          )}

          {loading && tab !== 'models' ? (
            <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" /></div>
          ) : tab === 'models' ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredBrandModels.map((m) => (
                <div key={m.id} className="border border-amber-200 rounded-xl overflow-hidden bg-white">
                  <div className="aspect-[16/10] bg-amber-100 overflow-hidden">
                    {m.image_url ? (
                      <img
                        src={m.image_url.startsWith('http') ? m.image_url : `${apiOrigin()}${m.image_url.startsWith('/') ? m.image_url : `/${m.image_url}`}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-amber-600 text-sm font-bold">No image</div>
                    )}
                  </div>
                  <div className="p-3 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-black text-[#000435]">{m.name}</div>
                      <div className="text-[10px] text-amber-700 font-mono">{m.slug}</div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const u = m.image_url
                            ? (m.image_url.startsWith('http') ? m.image_url : `${apiOrigin()}${m.image_url.startsWith('/') ? m.image_url : `/${m.image_url}`}`)
                            : '';
                          setModelForm({
                            id: m.id,
                            name: m.name || '',
                            sort_order: String(m.sort_order ?? 0),
                            image: null,
                            existingUrl: u,
                          });
                          setModelModalOpen(true);
                        }}
                        className="text-xs px-2 py-1 border rounded-lg text-slate-700 inline-flex items-center gap-1"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Delete model “${m.name}”?`)) return;
                          try {
                            await axios.delete(`${API}/student-services/admin/shoe-brand-models/${m.id}`, axCfg);
                            loadBrandModels();
                            setToast({ type: 'ok', message: 'Model deleted.' });
                          } catch (e) {
                            setToast({ type: 'err', message: e.response?.data?.message || e.message || 'Delete failed' });
                          }
                        }}
                        className="text-xs px-2 py-1 border border-red-200 rounded-lg bg-red-50 text-red-700 inline-flex items-center gap-1 font-bold"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!filteredBrandModels.length && (
                <p className="text-sm text-slate-600 col-span-full">
                  {brandModels.length ? 'No matches.' : 'No shoe models yet. Create one, then assign packages under Packages.'}
                </p>
              )}
            </div>
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
                    {r.shoe_brand_model?.name && <Tag text={`Model: ${r.shoe_brand_model.name}`} />}
                    <Tag text={`From ${Number(r.price_from || 0).toLocaleString()} Frw`} />
                    <Tag text={`Stock: ${r.stock_quantity == null ? 'Unlimited' : r.stock_quantity}`} />
                    <Tag text={`Delivery fee: ${Number(r.delivery_fee || 0).toLocaleString()} Frw`} />
                    <Tag text={`Status: ${r.status}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {!orders.length && (
                <p className="text-sm text-slate-600">No shoes voucher orders match your filters.</p>
              )}
              {orders.map((o) => {
                const lines = Array.isArray(o.shoes_requested) ? o.shoes_requested : [];
                const meta = o.order_meta || {};
                const delivery = meta.delivery || {};
                const payOk = o.payment_is_paid || o.payment_status === 'paid';
                return (
                  <div key={o.id} className="border border-amber-200 rounded-xl p-4 bg-amber-50/30">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-[#000435]">{o.order_number}</span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              payOk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {payOk ? 'Paid' : 'Not paid'}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white border border-amber-200 text-amber-900">
                            {o.fulfillment_status || 'Pending'}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-slate-800">{o.service_name}</div>
                        <div className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">Student:</span> {o.first_name} {o.last_name} ·{' '}
                          <span className="font-mono">{o.student_code || '—'}</span>
                          {o.class_name ? ` · ${o.class_name}` : ''}
                        </div>
                        <div className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">School:</span> {o.school_name || '—'}
                        </div>
                        {(o.buyer_name || o.buyer_contact) && (
                          <div className="text-xs text-slate-600">
                            <span className="font-semibold text-slate-700">Payer (MoMo):</span> {o.buyer_name || '—'} · {o.buyer_contact || '—'}
                          </div>
                        )}
                        <div className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">Agent (parent choice):</span> {o.agent_display || '—'}
                        </div>
                        {(delivery.method || delivery.district) && (
                          <div className="text-xs text-slate-600">
                            <span className="font-semibold text-slate-700">Delivery:</span>{' '}
                            {String(delivery.method || '').replace(/_/g, ' ') || '—'}
                            {delivery.district
                              ? ` · ${[delivery.district, delivery.sector, delivery.phone].filter(Boolean).join(', ')}`
                              : ''}
                          </div>
                        )}
                      </div>
                      <div className="text-left lg:text-right shrink-0">
                        <div className="font-black text-lg text-amber-800">{Number(o.amount || 0).toLocaleString()} Frw</div>
                        <div className="text-[10px] text-slate-500 uppercase">Payment: {o.payment_status}</div>
                      </div>
                    </div>

                    {lines.length > 0 && (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3">
                        <div className="text-[10px] font-black uppercase text-amber-800 mb-2">Shoes requested</div>
                        <ul className="space-y-1.5 text-sm text-slate-800">
                          {lines.map((line, idx) => (
                            <li key={idx} className="flex flex-wrap justify-between gap-2 border-b border-amber-100 last:border-0 pb-1.5 last:pb-0">
                              <span className="font-medium">{line.name}</span>
                              <span className="text-slate-600 text-xs">
                                ×{line.quantity}
                                {line.line_total_rwf != null ? ` · ${Number(line.line_total_rwf).toLocaleString()} Frw` : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-3 max-w-md">
                      <label className="block text-[10px] font-bold uppercase text-amber-800 mb-1">Assign / change field agent</label>
                      <select
                        className={inp}
                        value={agentPick[o.id] ?? ''}
                        onChange={(e) => setAgentPick((p) => ({ ...p, [o.id]: e.target.value }))}
                      >
                        <option value="">Not assigned</option>
                        {agents.map((a) => (
                          <option key={a.id} value={String(a.id)}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 mt-1">Saving the agent happens when you tap a status button below.</p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {['Pending', 'Processing', 'Delivered', 'Not delivered', 'Out of stock'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setQueueStatus(o.id, st)}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white font-bold text-amber-900 hover:bg-amber-100"
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-600 inline-flex items-center gap-2"><CheckCircle2 size={14} /> Queue shows payer, student, school, parent-selected agent, delivery, shoes requested, paid vs not paid, and fulfillment (Pending → Processing → Delivered / Not delivered / Out of stock).</p>
        <p className="text-xs text-slate-600 inline-flex items-center gap-2"><Truck size={14} /> New MoMo checkouts store agent and delivery on the order automatically; use status buttons to update each row (agent saves with the status tap).</p>
        <p className="text-xs"><Link to="/superadmin/voucher-services" className="text-amber-700 underline">Open general voucher services page</Link></p>
      </div>

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
            <Field label="Shoe model (groups this package with others for parents)">
              <select
                className={inp}
                value={form.shoe_brand_model_id}
                onChange={(e) => setForm((p) => ({ ...p, shoe_brand_model_id: e.target.value }))}
              >
                <option value="">— None: use legacy presets below —</option>
                {brandModels.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-600 mt-1">
                Create models under the <strong>Shoe models</strong> tab, then add many packages that all use the same model. Parents pick the model first, then the shoe.
              </p>
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Available sizes (comma separated)"><input className={inp} value={form.available_sizes} onChange={(e) => setForm((p) => ({ ...p, available_sizes: e.target.value }))} /></Field>
              <Field label="Shoe categories (comma separated)"><input className={inp} value={form.shoe_categories} onChange={(e) => setForm((p) => ({ ...p, shoe_categories: e.target.value }))} /></Field>
            </div>

            {form.shoe_brand_model_id ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-sm text-amber-950">
                Package photo for parents comes from the selected <strong>Shoe model</strong>. No per-preset uploads are needed.
              </div>
            ) : (
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-3 space-y-3">
              <p className="text-xs font-black text-[#000435] uppercase tracking-wide">Legacy shoe presets (optional if you use Shoe model above)</p>
              <p className="text-[11px] text-amber-900/80">Tick the models included in this package and upload a photo for each. Parents only see models you enable here.</p>
              <div className="space-y-3">
                {SHOE_MODEL_PRESETS.map((m) => {
                  const on = !!form.shoeModelsEnabled[m.id];
                  const f = shoeModelFiles[m.id];
                  const existing = form.shoeModelExistingUrls[m.id];
                  return (
                    <div key={m.id} className="rounded-lg border border-amber-200 bg-white p-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-1 rounded border-amber-300"
                          checked={on}
                          onChange={(e) => {
                            const v = e.target.checked;
                            setForm((p) => ({ ...p, shoeModelsEnabled: { ...p.shoeModelsEnabled, [m.id]: v } }));
                            if (!v) setShoeModelFiles((prev) => ({ ...prev, [m.id]: null }));
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[#000435] text-sm">{m.label}</div>
                          <div className="text-[11px] text-amber-800/80">{m.hint}</div>
                          {on && (
                            <div className="mt-2 flex flex-wrap items-end gap-3">
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-amber-800 mb-1">Image</label>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  className="text-xs max-w-full"
                                  onChange={(e) => {
                                    const next = e.target.files?.[0] || null;
                                    setShoeModelFiles((prev) => ({ ...prev, [m.id]: next }));
                                  }}
                                />
                                {f && <p className="text-[10px] text-amber-900 mt-1 font-medium">New: {f.name}</p>}
                              </div>
                              {existing && !f && (
                                <div className="w-20 h-20 rounded-lg border border-amber-200 overflow-hidden bg-amber-100 shrink-0">
                                  <img src={existing} alt="" className="w-full h-full object-cover" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
            )}

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

      {modelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-[#000435]">{modelForm.id ? 'Edit shoe model' : 'New shoe model'}</h3>
            <Field label="Display name">
              <input className={inp} value={modelForm.name} onChange={(e) => setModelForm((p) => ({ ...p, name: e.target.value }))} />
            </Field>
            <Field label="Sort order (lower first)">
              <input type="number" className={inp} value={modelForm.sort_order} onChange={(e) => setModelForm((p) => ({ ...p, sort_order: e.target.value }))} />
            </Field>
            <Field label="Hero image (shown to parents)">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="text-sm max-w-full"
                onChange={(e) => setModelForm((p) => ({ ...p, image: e.target.files?.[0] || null }))}
              />
              {modelForm.existingUrl && !modelForm.image && (
                <div className="mt-2 w-28 h-28 rounded-lg border border-amber-200 overflow-hidden bg-amber-50">
                  <img src={modelForm.existingUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModelModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold">
                Cancel
              </button>
              <button
                type="button"
                onClick={saveBrandModel}
                disabled={modelSaving}
                className="px-4 py-2 rounded-xl bg-[#000435] text-amber-400 font-black disabled:opacity-60"
              >
                {modelSaving ? 'Saving...' : 'Save model'}
              </button>
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
