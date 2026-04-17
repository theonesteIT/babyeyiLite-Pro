import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, Archive, Download, Filter,
  Loader2, Package, Plus, RefreshCw, Search, Tag, Trash2, X, Edit2, Save,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import api from '../services/api';
import PortalListPageLayout from '../components/PortalListPageLayout';
import { PORTAL } from '../config/portal';

function fmtMoney(v) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(v) || 0);
}

const CATEGORIES = ['All', 'Stationery', 'Furniture', 'Electronics', 'Cleaning', 'Sports', 'Lab', 'Kitchen', 'Other'];

// ── Item form modal ───────────────────────────────────────────
const ItemModal = ({ item, onClose, onSave }) => {
  const isEdit = !!item?.id;
  const [form, setForm] = useState({
    name: item?.name || '',
    category: item?.category || 'Stationery',
    unit: item?.unit || 'pcs',
    quantity: item?.quantity ?? '',
    reorder_level: item?.reorder_level ?? '',
    unit_cost: item?.unit_cost ?? '',
    location: item?.location || '',
    note: item?.note || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim() && Number(form.quantity) >= 0 && Number(form.unit_cost) >= 0;

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[28px] shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 shrink-0">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-re-navy">{isEdit ? 'Edit item' : 'Add item'}</p>
            <h3 className="font-black text-re-navy text-base mt-0.5">{isEdit ? form.name : 'New stock item'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-re-navy transition-all"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {[
            { label: 'Item name *', key: 'name', type: 'text', placeholder: 'e.g. A4 Paper Ream' },
            { label: 'Unit (pcs, kg, L, box…)', key: 'unit', type: 'text', placeholder: 'pcs' },
            { label: 'Quantity in stock *', key: 'quantity', type: 'number', placeholder: '0' },
            { label: 'Reorder level', key: 'reorder_level', type: 'number', placeholder: '10' },
            { label: 'Unit cost (RWF) *', key: 'unit_cost', type: 'number', placeholder: '0' },
            { label: 'Storage location', key: 'location', type: 'text', placeholder: 'e.g. Shelf A3' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
                className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-re-navy/20 transition-all" />
            </div>
          ))}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-re-navy/20 transition-all">
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Note</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} placeholder="Optional note"
              className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-re-navy/20 transition-all resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-black/5 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-black/5 text-re-navy font-black text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all">Cancel</button>
          <button onClick={() => { if (valid) { onSave({ ...item, ...form, quantity: Number(form.quantity), reorder_level: Number(form.reorder_level), unit_cost: Number(form.unit_cost) }); onClose(); }}}
            disabled={!valid}
            className="px-6 py-2 rounded-xl text-white font-black text-[9px] uppercase tracking-widest disabled:opacity-50 transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,#1E3A5F,#0D2644)' }}>
            <Save size={12} className="inline mr-1" />{isEdit ? 'Update' : 'Add item'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Main page ─────────────────────────────────────────────────
export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [modal, setModal] = useState(null); // null | { item?: object }
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get('/store/inventory');
      if (res.data?.success) setItems(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (e) {
      console.warn('[Inventory] fetch failed:', e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSave = async (item) => {
    try {
      if (item.id) {
        await api.patch(`/store/inventory/${item.id}`, item);
      } else {
        await api.post('/store/inventory', item);
      }
      fetchItems();
    } catch (e) { console.warn('[Inventory] save failed:', e.message); fetchItems(); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/store/inventory/${id}`); } catch (e) { console.warn(e.message); }
    setDeleteConfirm(null);
    fetchItems();
  };

  const derived = useMemo(() => {
    const lowStock = items.filter(i => i.reorder_level > 0 && Number(i.quantity) <= Number(i.reorder_level));
    const outOfStock = items.filter(i => Number(i.quantity) === 0);
    const totalValue = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_cost), 0);
    return { lowStock: lowStock.length, outOfStock: outOfStock.length, totalValue, totalItems: items.length };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      const catOk = category === 'All' || i.category === category;
      const stockOk = stockFilter === 'All'
        || (stockFilter === 'Low' && i.reorder_level > 0 && Number(i.quantity) <= Number(i.reorder_level) && Number(i.quantity) > 0)
        || (stockFilter === 'Out' && Number(i.quantity) === 0)
        || (stockFilter === 'OK' && (i.reorder_level <= 0 || Number(i.quantity) > Number(i.reorder_level)));
      const qOk = !q || i.name?.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q) || i.location?.toLowerCase().includes(q);
      return catOk && stockOk && qOk;
    });
  }, [items, search, category, stockFilter]);

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, W, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Inventory Report — Babyeyi School Store', 40, 36);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()} · ${filtered.length} items`, 40, 72);
    const cols = [
      { k: 'name', label: 'Item', w: 160 },
      { k: 'category', label: 'Category', w: 80 },
      { k: 'unit', label: 'Unit', w: 50 },
      { k: 'quantity', label: 'Qty', w: 50 },
      { k: 'reorder_level', label: 'Reorder', w: 60 },
      { k: 'unit_cost', label: 'Unit Cost', w: 80 },
      { k: 'location', label: 'Location', w: 80 },
    ];
    let y = 96, x = 40;
    doc.setFillColor(241, 245, 249);
    doc.rect(40, y - 12, W - 80, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    cols.forEach(c => { doc.text(c.label, x, y); x += c.w; });
    y += 18;
    doc.setFont('helvetica', 'normal');
    filtered.forEach(row => {
      if (y > 520) { doc.addPage(); y = 40; }
      x = 40;
      cols.forEach(c => {
        let val = row[c.k] ?? '';
        if (c.k === 'unit_cost') val = fmtMoney(val);
        doc.text(String(val).substring(0, 22), x, y);
        x += c.w;
      });
      y += 16;
    });
    doc.save('inventory.pdf');
  };

  const stockBadge = (item) => {
    const qty = Number(item.quantity);
    if (qty === 0) return <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-600 uppercase">Out</span>;
    if (item.reorder_level > 0 && qty <= Number(item.reorder_level)) return <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 uppercase">Low</span>;
    return <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-re-navy/10 text-re-navy uppercase">OK</span>;
  };

  const selectCls =
    'h-9 md:h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[9px] font-black uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] cursor-pointer appearance-none px-3 pr-8';
  const selectChevron = {
    backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%231E3A5F%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.5rem center',
    backgroundSize: '10px',
  };

  return (
    <>
      <PortalListPageLayout
        eyebrow={PORTAL.brandLine}
        title="School Inventory"
        titleHighlight="Inventory"
        subtitle="Items, quantities, reorder levels, and storage locations"
        heroIcon={Package}
        stats={[
          { label: 'Total items', value: derived.totalItems, icon: Package },
          { label: 'Total value', value: fmtMoney(derived.totalValue), icon: Tag },
          { label: 'Low stock', value: derived.lowStock, icon: AlertTriangle },
          { label: 'Out of stock', value: derived.outOfStock, icon: Archive },
        ]}
        rightColumn={(
          <>
            <button
              type="button"
              onClick={fetchItems}
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg hover:border-[#1E3A5F]/20 transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-[#1E3A5F]' : 'text-[#1E3A5F]'} />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportPDF}
              className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg transition-all"
            >
              <Download size={14} className="text-amber-500" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => setModal({})}
              className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
            >
              <Plus size={14} />
              Add item
            </button>
          </>
        )}
        toolbar={(
          <>
            <div className="relative w-full sm:w-[11rem] shrink-0 group">
              <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500 z-[1]" />
              <span className="absolute left-7 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] z-[1] pointer-events-none">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full ${selectCls} !pl-[4.5rem]`}
                style={selectChevron}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="relative w-full sm:w-[9.5rem] shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] z-[1] pointer-events-none">Stock</span>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className={`w-full ${selectCls} !pl-14`}
                style={selectChevron}
              >
                {['All', 'OK', 'Low', 'Out'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="relative flex-1 min-w-[200px] group">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-[#1E3A5F] transition-colors z-[1] pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, category, location…"
                className="w-full h-9 md:h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[9px] font-black uppercase tracking-tight shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] placeholder:text-[#1E3A5F]/30 !pl-8"
              />
            </div>
          </>
        )}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 size={22} className="animate-spin text-[#1E3A5F]/30" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Loading inventory…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 px-6">
            <Package size={36} className="text-slate-200" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">No items match your filters</p>
            <button type="button" onClick={() => setModal({})} className="text-[10px] font-black text-[#1E3A5F] hover:underline">
              + Add first item
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-re-bg/20 border-b border-black/5">
                {['Item', 'Category', 'Qty', 'Unit', 'Reorder', 'Unit cost', 'Location', 'Status', ''].map((h, hi) => (
                  <th
                    key={`inv-th-${hi}`}
                    className="px-4 sm:px-6 py-3 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-50 border-r border-black/5 last:border-r-0"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group">
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5">
                    <p className="font-black text-[#1E3A5F] text-[12px] tracking-tight">{item.name}</p>
                    {item.note ? (
                      <p className="text-[8px] font-bold text-re-text-muted uppercase tracking-widest mt-1 opacity-60 truncate max-w-[220px]">{item.note}</p>
                    ) : null}
                  </td>
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5 text-[10px] font-black text-[#1E3A5F]">
                    <span className="bg-re-bg px-2 py-0.5 rounded-lg border border-black/5">{item.category}</span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5 font-black text-slate-800 text-[12px]">{item.quantity}</td>
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5 text-[10px] font-bold text-slate-500">{item.unit}</td>
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5 text-[10px] font-bold text-slate-500">{item.reorder_level || '—'}</td>
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5 text-[10px] font-bold text-slate-700">{fmtMoney(item.unit_cost)}</td>
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5 text-[10px] font-bold text-slate-500">{item.location || '—'}</td>
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5">{stockBadge(item)}</td>
                  <td className="px-4 sm:px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => setModal(item)} className="p-1.5 rounded-lg hover:bg-re-navy/5 text-slate-300 hover:text-re-navy transition-colors" aria-label="Edit">
                        <Edit2 size={12} />
                      </button>
                      <button type="button" onClick={() => setDeleteConfirm(item)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors" aria-label="Delete">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PortalListPageLayout>

      {modal !== null && <ItemModal item={modal} onClose={() => setModal(null)} onSave={handleSave} />}
      {deleteConfirm && createPortal(
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 size={20} className="text-red-500" /></div>
            <h3 className="font-black text-slate-800 mb-2">Delete "{deleteConfirm.name}"?</h3>
            <p className="text-[11px] font-bold text-slate-400 mb-6">This will permanently remove this item from inventory.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-black/5 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all">Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
