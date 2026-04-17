import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown, ArrowUp, ArrowDownUp, Download, Loader2, Plus, RefreshCw, Search, X, Save,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import api from '../services/api';
import PortalListPageLayout from '../components/PortalListPageLayout';
import { PORTAL } from '../config/portal';

function fmtDate(raw) {
  if (!raw) return '—';
  return new Date(raw).toLocaleDateString('en-RW', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const MOVEMENT_TYPES = ['received', 'issued', 'adjusted', 'returned'];

// ── Movement form ─────────────────────────────────────────────
const MovementModal = ({ inventoryItems, onClose, onSave }) => {
  const [form, setForm] = useState({ item_id: '', type: 'received', quantity: '', unit_cost: '', ref: '', note: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.item_id && Number(form.quantity) > 0;

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[28px] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 shrink-0">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-re-navy">Record movement</p>
            <h3 className="font-black text-re-navy text-base mt-0.5">New stock movement</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Item *</label>
            <select value={form.item_id} onChange={e => set('item_id', e.target.value)}
              className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-re-navy/20">
              <option value="">Select item…</option>
              {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.name} (qty: {i.quantity})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {MOVEMENT_TYPES.map(t => (
                <button key={t} type="button" onClick={() => set('type', t)}
                  className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${form.type === t ? 'border-re-navy/40 bg-re-navy/5 text-re-navy' : 'border-black/5 bg-re-bg text-slate-400 hover:border-re-navy/20'}`}>
                  {t === 'received' ? <ArrowDown size={11} className="inline mr-1" /> : <ArrowUp size={11} className="inline mr-1" />}
                  {t}
                </button>
              ))}
            </div>
          </div>
          {[
            { label: 'Quantity *', key: 'quantity', type: 'number', placeholder: '0' },
            { label: 'Unit cost (RWF)', key: 'unit_cost', type: 'number', placeholder: '0' },
            { label: 'Reference / LPO no.', key: 'ref', type: 'text', placeholder: 'e.g. LPO-2025-001' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
                className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-re-navy/20" />
            </div>
          ))}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Note</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} placeholder="Optional"
              className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-re-navy/20 resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-black/5 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-black/5 text-re-navy font-black text-[9px] uppercase tracking-widest hover:bg-re-bg">Cancel</button>
          <button disabled={!valid} onClick={() => { if (valid) { onSave(form); onClose(); }}}
            className="px-6 py-2 rounded-xl text-white font-black text-[9px] uppercase tracking-widest disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#1E3A5F,#0D2644)' }}>
            <Save size={12} className="inline mr-1" />Record
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Main ──────────────────────────────────────────────────────
export default function StockMovements() {
  const [movements, setMovements] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [mRes, iRes] = await Promise.allSettled([
        api.get('/store/movements'),
        api.get('/store/inventory'),
      ]);
      if (mRes.status === 'fulfilled' && mRes.value.data?.success) setMovements(mRes.value.data.data || []);
      if (iRes.status === 'fulfilled' && iRes.value.data?.success) setInventory(iRes.value.data.data || []);
    } catch (e) { console.warn(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSave = async (form) => {
    try { await api.post('/store/movements', form); } catch (e) { console.warn(e.message); }
    fetchAll();
  };

  const totals = useMemo(() => {
    const received = movements.filter(m => m.type === 'received').reduce((s, m) => s + Number(m.quantity), 0);
    const issued = movements.filter(m => m.type === 'issued').reduce((s, m) => s + Number(m.quantity), 0);
    return { received, issued, total: movements.length };
  }, [movements]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return movements.filter(m => {
      const typeOk = typeFilter === 'All' || m.type === typeFilter;
      const qOk = !q || m.item_name?.toLowerCase().includes(q) || m.ref?.toLowerCase().includes(q) || m.note?.toLowerCase().includes(q);
      return typeOk && qOk;
    });
  }, [movements, search, typeFilter]);

  const typeChip = (type) => {
    const cfg = {
      received: 'bg-re-navy/10 text-re-navy',
      issued:   'bg-blue-100 text-blue-700',
      adjusted: 'bg-amber-100 text-amber-700',
      returned: 'bg-purple-100 text-purple-700',
    };
    return <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${cfg[type] || 'bg-slate-100 text-slate-500'}`}>{type}</span>;
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, W, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Stock Movements — Babyeyi School Store', 40, 36);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()} · ${filtered.length} records`, 40, 72);
    const cols = [
      { k: 'item_name', label: 'Item', w: 150 },
      { k: 'type', label: 'Type', w: 70 },
      { k: 'quantity', label: 'Qty', w: 50 },
      { k: 'unit_cost', label: 'Unit Cost', w: 80 },
      { k: 'ref', label: 'Reference', w: 100 },
      { k: 'created_at', label: 'Date', w: 120 },
      { k: 'note', label: 'Note', w: 120 },
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
        if (c.k === 'created_at') val = fmtDate(val);
        doc.text(String(val).substring(0, 24), x, y);
        x += c.w;
      });
      y += 16;
    });
    doc.save('stock-movements.pdf');
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
        title="Stock Movements"
        titleHighlight="Movements"
        subtitle="Goods received, issued, adjusted, and returned"
        heroIcon={ArrowDownUp}
        stats={[
          { label: 'Total records', value: totals.total, icon: ArrowDownUp },
          { label: 'Received lines', value: totals.received, icon: ArrowDown },
          { label: 'Issued lines', value: totals.issued, icon: ArrowUp },
        ]}
        rightColumn={(
          <>
            <button
              type="button"
              onClick={fetchAll}
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg transition-all"
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
              onClick={() => setModalOpen(true)}
              className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
            >
              <Plus size={14} />
              Record movement
            </button>
          </>
        )}
        toolbar={(
          <>
            <div className="relative w-full sm:w-[12rem] shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] z-[1] pointer-events-none">Type</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={`w-full ${selectCls} !pl-12`}
                style={selectChevron}
              >
                {['All', ...MOVEMENT_TYPES].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="relative flex-1 min-w-[200px] group">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-[#1E3A5F] transition-colors z-[1] pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item, reference, note…"
                className="w-full h-9 md:h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[9px] font-black uppercase tracking-tight shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] placeholder:text-[#1E3A5F]/30 !pl-8"
              />
            </div>
          </>
        )}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 size={22} className="animate-spin text-[#1E3A5F]/30" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Loading movements…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <ArrowDown size={36} className="text-slate-200" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">No movements match your filters</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-re-bg/20 border-b border-black/5">
                {['Item', 'Type', 'Qty', 'Unit cost', 'Reference', 'Note', 'Date'].map((h, hi) => (
                  <th
                    key={`mov-th-${hi}`}
                    className="px-4 sm:px-6 py-3 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-50 border-r border-black/5 last:border-r-0"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filtered.map((m, i) => (
                <tr key={m.id || i} className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors">
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5 font-black text-[#1E3A5F] text-[11px]">{m.item_name || '—'}</td>
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5">{typeChip(m.type)}</td>
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5 font-black text-slate-800 text-[12px]">{m.quantity}</td>
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5 text-[10px] font-bold text-slate-600">{m.unit_cost ? `${Number(m.unit_cost).toLocaleString()} RWF` : '—'}</td>
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5 text-[10px] font-bold text-slate-500">{m.ref || '—'}</td>
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5 text-[10px] font-bold text-slate-500 max-w-[160px] truncate">{m.note || '—'}</td>
                  <td className="px-4 sm:px-6 py-3 text-[10px] font-bold text-slate-500">{fmtDate(m.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PortalListPageLayout>

      {modalOpen && <MovementModal inventoryItems={inventory} onClose={() => setModalOpen(false)} onSave={handleSave} />}
    </>
  );
}
