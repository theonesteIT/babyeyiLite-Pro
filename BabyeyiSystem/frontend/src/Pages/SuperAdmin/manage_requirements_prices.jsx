// ================================================================
// manage_requirements_prices.jsx — Super Admin: master catalog from
// `student_requirements` (price + optional image). Modal-based editor.
// Design: Montserrat, #FEBF10 accent, Tailwind, mobile responsive.
// ================================================================
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle,
  X,
  DollarSign,
  BookOpen,
  Home,
  Menu,
  ImagePlus,
  Trash2,
  Plus,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5100';
const API = `${API_BASE}/api`;
const axCfg = { headers: { 'Content-Type': 'application/json' }, withCredentials: true };

const ACCENT = '#FEBF10';

const Toast = ({ toasts, remove }) => (
  <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[300] space-y-2 pointer-events-none">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl border w-full
          ${t.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : t.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}
      >
        {t.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> : t.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /> : null}
        <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
        <button type="button" onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100 shrink-0 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    ))}
  </div>
);

function absImageUrl(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return '';
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  return `${API_BASE}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

export default function ManageRequirementsPrices() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [toasts, setToasts] = useState([]);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addImageFile, setAddImageFile] = useState(null);
  const [creatingReq, setCreatingReq] = useState(false);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };
  const removeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/requirement-prices/requirements`, axCfg);
      if (res.data.success && Array.isArray(res.data.data)) {
        setRows(
          res.data.data.map((r) => ({
            ...r,
            default_price: r.default_price != null && r.default_price !== '' ? r.default_price : '',
            image_url: r.image_url || '',
          }))
        );
      } else {
        setRows([]);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load requirements', 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const openCatalog = () => {
    setCatalogOpen(true);
    loadCatalog();
  };

  const setPrice = (id, value) => {
    const v = value === '' ? '' : parseFloat(value);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, default_price: Number.isFinite(v) ? v : '' } : r)));
  };

  const saveCatalog = async () => {
    const items = rows.map((r) => ({
      student_requirement_id: r.id,
      default_price: r.default_price === '' || r.default_price == null ? null : r.default_price,
      image_url: r.image_url ? r.image_url : null,
    }));
    if (!items.length) {
      addToast('No requirements in catalog.', 'info');
      return;
    }
    setSaving(true);
    try {
      await axios.put(`${API}/requirement-prices/catalog-defaults`, { items }, axCfg);
      addToast('Catalog prices and images saved.', 'success');
      setCatalogOpen(false);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save catalog', 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (id, file) => {
    if (!file) return;
    setUploadingId(id);
    try {
      const fd = new FormData();
      fd.append('image', file);
      // Do not set Content-Type: browser/axios must add multipart boundary automatically
      const res = await axios.post(`${API}/requirement-prices/requirements/${id}/image`, fd, {
        withCredentials: true,
      });
      if (res.data.success && res.data.image_url) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, image_url: res.data.image_url } : r)));
        addToast('Image uploaded.', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Image upload failed', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const openAddRequirement = () => {
    setAddName('');
    setAddPrice('');
    setAddImageFile(null);
    setAddModalOpen(true);
  };

  const submitNewRequirement = async () => {
    const name = addName.trim();
    if (!name) {
      addToast('Enter a requirement name.', 'error');
      return;
    }
    let default_price = null;
    if (addPrice !== '' && addPrice != null) {
      const n = parseFloat(addPrice);
      if (!Number.isFinite(n) || n < 0) {
        addToast('Price must be a non-negative number.', 'error');
        return;
      }
      default_price = n;
    }
    setCreatingReq(true);
    try {
      const res = await axios.post(
        `${API}/requirement-prices/requirements`,
        { name, default_price: default_price != null ? default_price : undefined },
        axCfg
      );
      if (!res.data.success || !res.data.data?.id) {
        throw new Error(res.data.message || 'Create failed');
      }
      const newId = res.data.data.id;
      if (addImageFile) {
        const fd = new FormData();
        fd.append('image', addImageFile);
        await axios.post(`${API}/requirement-prices/requirements/${newId}/image`, fd, { withCredentials: true });
      }
      addToast('Requirement added to catalog.', 'success');
      setAddModalOpen(false);
      setAddName('');
      setAddPrice('');
      setAddImageFile(null);
      if (catalogOpen) await loadCatalog();
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'Failed to add requirement', 'error');
    } finally {
      setCreatingReq(false);
    }
  };

  const clearImage = async (id) => {
    try {
      await axios.delete(`${API}/requirement-prices/requirements/${id}/image`, axCfg);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, image_url: '' } : r)));
      addToast('Image removed.', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to remove image', 'error');
    }
  };

  const selectClass = `w-full bg-white border-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
    focus:outline-none focus:ring-2 focus:ring-offset-1 border-amber-200 focus:border-[#FEBF10] focus:ring-amber-300`;

  const PricingSidebar = () => (
    <nav className="flex flex-col gap-1 p-3">
      <button
        type="button"
        onClick={() => { navigate('/superadmin/dashboard'); setSidebarOpen(false); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-amber-700 hover:bg-amber-100"
      >
        <Home className="w-4 h-4" /> Back to Dashboard
      </button>
      <div className="my-2 border-t border-amber-200" />
      <p className="px-3 text-[10px] font-bold text-amber-600 uppercase tracking-widest">Pricing</p>
      <button
        type="button"
        onClick={() => setSidebarOpen(false)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ backgroundColor: ACCENT }}
      >
        <DollarSign className="w-4 h-4" /> Catalog prices
      </button>
      <button
        type="button"
        onClick={() => { navigate('/requirement-prices-list'); setSidebarOpen(false); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-amber-700 hover:bg-amber-100"
      >
        <BookOpen className="w-4 h-4" /> View Prices List
      </button>
    </nav>
  );

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50/50 flex min-w-0 overflow-x-hidden"
      style={{ fontFamily: 'Montserrat, sans-serif' }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <aside className="hidden lg:flex flex-col w-56 border-r-2 border-amber-100 fixed left-0 top-0 h-full z-20 bg-white/98 shadow-lg">
        <div className="px-4 py-5 border-b-2 border-amber-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl" style={{ backgroundColor: ACCENT }}><DollarSign className="w-5 h-5 text-white" /></div>
            <h1 className="text-sm font-black text-gray-900">Pricing</h1>
          </div>
        </div>
        <PricingSidebar />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-gray-900/40 z-40" onClick={() => setSidebarOpen(false)}>
          <div className="w-72 h-full bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b-2 border-amber-100">
              <h2 className="font-bold text-gray-900">Navigation</h2>
              <button type="button" onClick={() => setSidebarOpen(false)} className="p-2 rounded-xl hover:bg-amber-50"><X className="w-5 h-5" /></button>
            </div>
            <PricingSidebar />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 lg:ml-56">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b-2 border-amber-100 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-amber-700 hover:bg-amber-100"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/superadmin/dashboard')}
              className="hidden lg:flex p-2 rounded-xl text-amber-700 hover:bg-amber-100 transition-all"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold text-gray-900 truncate">
                Student requirements catalog
              </h1>
              <p className="text-xs text-amber-700/80 truncate">
                Set default prices and optional images for every row in <code className="bg-amber-100 px-1 rounded text-[10px]">student_requirements</code>
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
          <section className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ backgroundColor: ACCENT }}>
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-lg font-black text-gray-900 mb-2">Master requirement list</h2>
            <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed mb-6">
              Open the editor to load all requirements from the database, set a default price in RWF for each, and optionally attach a reference image per item.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={openCatalog}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm text-white shadow-lg hover:opacity-95 active:scale-[0.99] transition-all"
                style={{ backgroundColor: ACCENT }}
              >
                <DollarSign className="w-4 h-4" />
                Edit catalog (prices &amp; images)
              </button>
              <button
                type="button"
                onClick={openAddRequirement}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm border-2 border-amber-300 text-amber-900 bg-white hover:bg-amber-50 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Add requirement
              </button>
            </div>
          </section>
        </main>

        <Toast toasts={toasts} remove={removeToast} />
      </div>

      {catalogOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
          onClick={() => !saving && !loading && setCatalogOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[min(92dvh,900px)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b border-amber-100 shrink-0">
              <div>
                <h3 className="font-black text-gray-900 text-sm sm:text-base">Catalog defaults</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Prices apply as Super Admin baseline; images are optional.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={openAddRequirement}
                  disabled={saving || loading}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black border-2 border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Add requirement
                </button>
                <button
                  type="button"
                  onClick={() => !saving && setCatalogOpen(false)}
                  className="p-2 rounded-xl hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {loading && (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                </div>
              )}
              {!loading && rows.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-10">No rows in student_requirements yet.</p>
              )}
              {!loading &&
                rows.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border-2 border-amber-100 p-4 flex flex-col sm:flex-row gap-4 bg-amber-50/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm">{r.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">id #{r.id}</p>
                      <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mt-3 mb-1">Default price (RWF)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={r.default_price === '' ? '' : r.default_price}
                        onChange={(e) => setPrice(r.id, e.target.value)}
                        className={selectClass}
                        placeholder="0"
                      />
                    </div>
                    <div className="sm:w-44 shrink-0 flex flex-col items-center gap-2">
                      {r.image_url ? (
                        <img
                          src={absImageUrl(r.image_url)}
                          alt=""
                          className="w-full max-h-28 object-contain rounded-xl border border-amber-200 bg-white"
                        />
                      ) : (
                        <div className="w-full h-24 rounded-xl border-2 border-dashed border-amber-200 flex items-center justify-center text-amber-300">
                          <ImagePlus className="w-8 h-8" />
                        </div>
                      )}
                      <label className="w-full">
                        <span className="sr-only">Upload image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingId === r.id}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (f) uploadImage(r.id, f);
                          }}
                        />
                        <span className="flex items-center justify-center gap-1 w-full py-2 rounded-xl text-[11px] font-bold border-2 border-amber-200 bg-white cursor-pointer hover:bg-amber-50 text-amber-900">
                          {uploadingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                          {uploadingId === r.id ? 'Uploading…' : 'Image'}
                        </span>
                      </label>
                      {r.image_url ? (
                        <button
                          type="button"
                          onClick={() => clearImage(r.id)}
                          className="text-[11px] font-bold text-red-600 hover:underline inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
            </div>

            <div className="p-4 border-t border-amber-100 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end shrink-0">
              <button
                type="button"
                onClick={() => !saving && setCatalogOpen(false)}
                className="py-3 sm:py-2.5 px-5 rounded-xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCatalog}
                disabled={saving || loading || rows.length === 0}
                className="py-3 sm:py-2.5 px-6 rounded-xl font-black text-sm text-white shadow-md disabled:opacity-50 inline-flex items-center justify-center gap-2"
                style={{ backgroundColor: ACCENT }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {addModalOpen && (
        <div
          className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
          onClick={() => !creatingReq && setAddModalOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-black text-gray-900 text-base">Add requirement</h3>
            <p className="text-xs text-gray-500 mt-1">
              Creates a row in <code className="bg-amber-100 px-1 rounded">student_requirements</code>. Optional image uploads to the catalog.
            </p>
            <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mt-4 mb-1">Name</label>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className={selectClass}
              placeholder="e.g. Ream of Paper A4"
              disabled={creatingReq}
            />
            <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mt-3 mb-1">Default price (RWF)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={addPrice}
              onChange={(e) => setAddPrice(e.target.value)}
              className={selectClass}
              placeholder="Optional"
              disabled={creatingReq}
            />
            <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mt-3 mb-1">Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              disabled={creatingReq}
              onChange={(e) => setAddImageFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-gray-600"
            />
            <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => !creatingReq && setAddModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border-2 border-gray-200 font-bold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitNewRequirement}
                disabled={creatingReq}
                className="py-2.5 px-5 rounded-xl font-black text-sm text-white inline-flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
              >
                {creatingReq ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save to catalog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
