import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Loader2, Phone, Plus, RefreshCw, Save, Search, Trash2, X, Building2, PhoneCall } from 'lucide-react';
import api from '../services/api';
import PortalListPageLayout from '../components/PortalListPageLayout';
import { PORTAL } from '../config/portal';

const SupplierModal = ({ supplier, onClose, onSave }) => {
  const isEdit = !!supplier?.id;
  const [form, setForm] = useState({
    name: supplier?.name || '',
    contact_person: supplier?.contact_person || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
    categories: supplier?.categories || '',
    note: supplier?.note || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim();

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[28px] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 shrink-0">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-re-navy">{isEdit ? 'Edit supplier' : 'Add supplier'}</p>
            <h3 className="font-black text-re-navy text-base mt-0.5">{isEdit ? form.name : 'New supplier'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {[
            { label: 'Supplier name *', key: 'name', placeholder: 'e.g. ABC Stationery Ltd' },
            { label: 'Contact person', key: 'contact_person', placeholder: 'Full name' },
            { label: 'Phone', key: 'phone', placeholder: '+250 7XX XXX XXX' },
            { label: 'Email', key: 'email', placeholder: 'supplier@email.com' },
            { label: 'Address', key: 'address', placeholder: 'Kigali, Rwanda' },
            { label: 'Categories supplied', key: 'categories', placeholder: 'e.g. Stationery, Cleaning' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">{f.label}</label>
              <input value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
                className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-re-navy/20" />
            </div>
          ))}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Note</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} placeholder="Optional note"
              className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-re-navy/20 resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-black/5 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-black/5 text-re-navy font-black text-[9px] uppercase tracking-widest hover:bg-re-bg">Cancel</button>
          <button disabled={!valid} onClick={() => { if (valid) { onSave({ ...supplier, ...form }); onClose(); }}}
            className="px-6 py-2 rounded-xl text-white font-black text-[9px] uppercase tracking-widest disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#1E3A5F,#0D2644)' }}>
            <Save size={12} className="inline mr-1" />{isEdit ? 'Update' : 'Add supplier'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/store/suppliers');
      if (res.data?.success) setSuppliers(res.data.data || []);
    } catch (e) { console.warn(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleSave = async (s) => {
    try {
      if (s.id) await api.patch(`/store/suppliers/${s.id}`, s);
      else await api.post('/store/suppliers', s);
    } catch (e) { console.warn(e.message); }
    fetchSuppliers();
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/store/suppliers/${id}`); } catch (e) { console.warn(e.message); }
    setDeleteConfirm(null);
    fetchSuppliers();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return !q ? suppliers : suppliers.filter(s =>
      s.name?.toLowerCase().includes(q) || s.categories?.toLowerCase().includes(q) || s.contact_person?.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const withPhone = useMemo(
    () => suppliers.filter((s) => String(s.phone || '').trim().length > 0).length,
    [suppliers]
  );

  return (
    <>
      <PortalListPageLayout
        eyebrow={PORTAL.brandLine}
        title="School Suppliers"
        titleHighlight="Suppliers"
        subtitle="Vendors and contacts for procurement"
        heroIcon={Building2}
        stats={[
          { label: 'On file', value: suppliers.length, icon: Building2 },
          { label: 'With phone', value: withPhone, icon: PhoneCall },
        ]}
        rightColumn={(
          <>
            <button
              type="button"
              onClick={fetchSuppliers}
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-[#1E3A5F]' : 'text-[#1E3A5F]'} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setModal({})}
              className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
            >
              <Plus size={14} />
              Add supplier
            </button>
          </>
        )}
        toolbar={(
          <div className="relative flex-1 min-w-[200px] max-w-xl group">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-[#1E3A5F] transition-colors z-[1] pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, category, contact…"
              className="w-full h-9 md:h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[9px] font-black uppercase tracking-tight shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] placeholder:text-[#1E3A5F]/30 !pl-8"
            />
          </div>
        )}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 size={22} className="animate-spin text-[#1E3A5F]/30" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Loading suppliers…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 px-6">
            <Building2 size={36} className="text-slate-200" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">No suppliers match your search</p>
            <button type="button" onClick={() => setModal({})} className="text-[10px] font-black text-[#1E3A5F] hover:underline">
              + Add first supplier
            </button>
          </div>
        ) : (
          <div className="p-4 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <div key={s.id} className="bg-re-bg/40 border border-black/5 rounded-[20px] p-5 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-black/5 flex items-center justify-center font-black text-[#1E3A5F] shrink-0 shadow-sm">
                      {s.name?.charAt(0) || 'S'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-[#1E3A5F] text-[12px] leading-tight truncate">{s.name}</p>
                      {s.categories ? <p className="text-[9px] text-re-navy font-bold uppercase tracking-wider mt-0.5 truncate">{s.categories}</p> : null}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                    <button type="button" onClick={() => setModal(s)} className="p-1.5 rounded-lg hover:bg-white text-slate-300 hover:text-re-navy transition-colors" aria-label="Edit">
                      <Edit2 size={12} />
                    </button>
                    <button type="button" onClick={() => setDeleteConfirm(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors" aria-label="Delete">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {s.contact_person ? <p className="text-[10px] font-bold text-slate-600">{s.contact_person}</p> : null}
                  {s.phone ? (
                    <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                      <Phone size={10} />
                      {s.phone}
                    </p>
                  ) : null}
                  {s.address ? <p className="text-[10px] font-bold text-slate-500">{s.address}</p> : null}
                  {s.note ? <p className="text-[9px] font-bold text-slate-400 mt-2 italic line-clamp-2">{s.note}</p> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </PortalListPageLayout>

      {modal !== null && <SupplierModal supplier={modal} onClose={() => setModal(null)} onSave={handleSave} />}
      {deleteConfirm && createPortal(
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 size={20} className="text-red-500" /></div>
            <h3 className="font-black text-slate-800 mb-2">Remove "{deleteConfirm.name}"?</h3>
            <p className="text-[11px] font-bold text-slate-400 mb-6">This supplier will be removed from your records.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-black/5 font-black text-[10px] uppercase text-slate-500 hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-black text-[10px] uppercase hover:bg-red-600">Remove</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
