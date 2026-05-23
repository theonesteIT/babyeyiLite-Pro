import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Banknote, Calendar, CreditCard, Filter, Printer, Receipt, RefreshCw, Search, Upload, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import api from '../services/api';
import AccountantOchreHero from '../components/AccountantOchreHero';
import AccountantFormModal, {
  FormDate,
  FormFileUpload,
  FormGrid,
  FormInput,
  FormSelect,
  FormTextarea,
} from '../components/AccountantFormModal';

const EXPENSE_CATEGORIES = ['Utilities', 'Supplies', 'Salaries', 'Transport', 'Maintenance', 'Equipment', 'Other'];

function formatMoneyRWF(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n);
}

const ExpenseDetailsDrawer = ({ isOpen, expense, onClose, onMarkPaid, onRecordPayment, onRequestApproval }) => {
  if (!isOpen || !expense) return null;

  const payments = Array.isArray(expense.payments) ? expense.payments : [];
  const paidTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = Math.max(0, (Number(expense.amount) || 0) - paidTotal);

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-md z-[210] animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 z-[220] w-full md:w-[420px] bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.1)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">
        <div className="flex items-center justify-between px-8 py-6 border-b border-black/5 bg-white shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full border border-black/5 bg-white flex items-center justify-center font-medium text-lg shadow-inner relative overflow-hidden shrink-0 text-[#000435]">
              <span>{expense.vendor?.charAt(0) || 'E'}</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-[#000435] text-base leading-tight uppercase tracking-tight truncate">{expense.vendor}</h3>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <p className="text-[9px] text-[#000435] font-medium flex items-center gap-1 uppercase tracking-widest opacity-60 truncate">
                  <span className="w-1 h-1 rounded-full shrink-0 bg-amber-400" />
                  {expense.id} · {expense.category}
                </p>
                <p className="text-[8px] text-[#000435] font-medium flex items-center gap-1 uppercase tracking-[0.2em] truncate">
                  {expense.date} · {expense.status} · Remaining {formatMoneyRWF(remaining).replace('RWF', '')} RWF
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white rounded-xl transition-all text-[#000435] hover:text-[#000435] group"
          >
            <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar bg-white">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-medium text-[#000435] uppercase tracking-[0.3em] opacity-40">Expense Details</span>
              <div className="flex-1 h-px bg-black/5" />
            </div>
            {[
              { label: 'Amount', value: formatMoneyRWF(expense.amount), icon: Banknote },
              { label: 'Invoice No.', value: expense.invoiceNo || '—', icon: Receipt },
              { label: 'Invoice File', value: expense.invoiceFileName || '—', icon: Upload },
              { label: 'Note', value: expense.note || '—', icon: AlertTriangle },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <item.icon size={11} className="opacity-30 text-amber-500" />
                  <span className="text-[10px] font-medium text-[#000435] uppercase tracking-widest">{item.label}</span>
                </div>
                <div className="flex-1 mx-3 border-b border-dashed border-black/10 group-hover:border-amber-200 transition-colors" />
                <span className="text-[10px] font-medium uppercase tracking-tight text-[#000435] max-w-[170px] truncate text-right">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500 opacity-5 rounded-full -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-700" />
              <p className="text-[8px] text-[#000435] uppercase tracking-[0.2em] font-medium mb-1 relative z-10 opacity-60">Status</p>
              <div className="flex items-baseline gap-1 relative z-10">
                <span className={`text-xl font-medium tracking-tighter ${
                  expense.status === 'paid'
                    ? 'text-emerald-600'
                    : expense.status === 'approved'
                      ? 'text-blue-600'
                      : expense.status === 'pending_approval'
                        ? 'text-indigo-600'
                        : 'text-amber-600'
                }`}>
                  {expense.status}
                </span>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group text-right">
              <div className="absolute top-0 left-0 w-16 h-16 bg-amber-500 opacity-5 rounded-full -ml-6 -mt-6 group-hover:scale-125 transition-transform duration-700" />
              <p className="text-[8px] text-[#000435] uppercase tracking-[0.2em] font-medium mb-1 relative z-10 opacity-60">Amount</p>
              <div className="flex items-baseline gap-1 justify-end relative z-10">
                <span className="text-xl font-medium text-[#000435] tracking-tighter">
                  {formatMoneyRWF(expense.amount).replace('RWF', '')}
                </span>
                <span className="text-[9px] font-medium uppercase tracking-widest ml-1 opacity-60">RWF</span>
              </div>
            </div>
          </div>

          {/* Payment history */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[9px] font-medium text-[#000435] uppercase tracking-[0.3em] opacity-40">Payment History</span>
              <div className="flex-1 h-px bg-black/5" />
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-[9px] font-medium text-[#000435] uppercase tracking-widest italic opacity-40">No payments recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments
                  .slice()
                  .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
                  .map((p) => (
                    <div key={p.id} className="flex items-start gap-3 p-4 rounded-2xl bg-white/50 border border-black/[0.02] group hover:bg-white hover:border-black/5 transition-all">
                      <div className="p-2 rounded-xl shrink-0 bg-emerald-50 text-emerald-500">
                        <CreditCard size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-medium uppercase tracking-widest text-[#000435]">{p.method || 'Payment'}</span>
                            <span className="w-1 h-1 bg-black/10 rounded-full" />
                            <span className="text-[8px] font-medium text-[#000435] opacity-40 uppercase">{p.date || '—'}</span>
                          </div>
                          <span className="text-[10px] font-medium uppercase tracking-widest text-emerald-600">
                            +{formatMoneyRWF(p.amount).replace('RWF', '')} RWF
                          </span>
                        </div>
                        <p className="text-[10px] font-medium text-[#000435] leading-relaxed tracking-tight group-hover:text-[#000435] transition-colors mt-1">
                          {p.methodRef ? `To: ${p.methodRef}` : 'To: —'} · Receipt: {p.receiptFileName ? p.receiptFileName : '—'}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-8 py-5 border-t border-black/5 bg-white/20">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onRecordPayment?.(expense)}
              disabled={!['approved', 'paid'].includes(String(expense.status || '').toLowerCase())}
              className="h-10 w-full flex items-center justify-center gap-2 bg-white border border-black/5 text-[#000435] font-medium text-[9px] uppercase tracking-widest rounded-xl hover:bg-white transition-all"
            >
              <CreditCard size={14} className="text-amber-500" />
              Record payment
            </button>
            <button
              onClick={() => {
                if (expense.status === 'approved') return onMarkPaid?.(expense);
                if (expense.status === 'pending' || expense.status === 'rejected') return onRequestApproval?.(expense);
              }}
              disabled={expense.status === 'paid' || expense.status === 'pending_approval'}
              className="h-10 w-full flex items-center justify-center gap-2 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
              style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
            >
              {expense.status === 'approved' ? 'Mark as paid' : 'Request approval'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

const RecordExpensePaymentModal = ({ isOpen, onClose, expense, onSave }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Bank Transfer');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiptFile, setReceiptFile] = useState(null);
  const [methodRef, setMethodRef] = useState('');
  const [note, setNote] = useState('');

  useMemo(() => {
    if (!isOpen) return null;
    setAmount('');
    setMethod('Bank Transfer');
    setDate(new Date().toISOString().slice(0, 10));
    setReceiptFile(null);
    setMethodRef('');
    setNote('');
    return null;
  }, [isOpen]);

  if (!isOpen || !expense) return null;

  const payments = Array.isArray(expense.payments) ? expense.payments : [];
  const paidTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = Math.max(0, (Number(expense.amount) || 0) - paidTotal);

  const handleSave = () => {
    const amt = Number(amount) || 0;
    if (amt <= 0) return;
    onSave?.({
      amount: amt,
      method,
      date,
      methodRef: methodRef.trim(),
      receiptFileName: receiptFile?.name || '',
      note: note.trim(),
    });
    onClose?.();
  };

  return (
    <AccountantFormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
      subtitle={`${expense.id} · ${expense.vendor}`}
      statusHint={`Remaining ${formatMoneyRWF(remaining).replace('RWF', '').trim()} RWF · Partial payments allowed`}
      footerHint="Receipt upload optional"
      submitLabel="Save payment"
      onSubmit={handleSave}
      submitDisabled={!(Number(amount) > 0)}
    >
      <FormGrid>
        <FormInput
          label="Amount (RWF)"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
          inputMode="numeric"
          placeholder="0"
        />
        <FormSelect label="Payment method" value={method} onChange={(e) => setMethod(e.target.value)}>
          {['Cash', 'Mobile Money', 'Bank Transfer', 'Card'].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </FormSelect>
        <FormInput
          label="Reference"
          className="sm:col-span-2"
          value={methodRef}
          onChange={(e) => setMethodRef(e.target.value)}
          placeholder={
            method === 'Bank Transfer'
              ? 'Bank account'
              : method === 'Mobile Money'
                ? 'MoMo number'
                : 'Optional'
          }
        />
        <FormDate label="Payment date" value={date} onChange={(e) => setDate(e.target.value)} />
        <FormFileUpload
          label="Upload receipt"
          fileName={receiptFile?.name}
          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
        />
      </FormGrid>
      <FormTextarea
        label="Note (optional)"
        className="mt-4"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Additional details"
        rows={3}
      />
    </AccountantFormModal>
  );
};

const AddExpenseModal = ({ isOpen, onClose, onCreate }) => {
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('');
  const [categoryOther, setCategoryOther] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setVendor('');
    setCategory('');
    setCategoryOther('');
    setDate(new Date().toISOString().slice(0, 10));
    setAmount('');
    setInvoiceNo('');
    setInvoiceFile(null);
    setNote('');
  }, [isOpen]);

  if (!isOpen) return null;

  const isOtherCategory = category === 'Other';
  const resolvedCategory = isOtherCategory ? categoryOther.trim() : category;
  const amt = Number(amount) || 0;
  const canSave = vendor.trim() && resolvedCategory && date && amt > 0;

  const handleSave = () => {
    if (!canSave) return;
    onCreate?.({
      vendor: vendor.trim(),
      category: resolvedCategory,
      date,
      amount: amt,
      invoiceNo: invoiceNo.trim(),
      invoiceFileName: invoiceFile?.name || '',
      note: note.trim(),
    });
    onClose?.();
  };

  return (
    <AccountantFormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Expense"
      subtitle="Invoice · Expenses registry"
      statusHint="RWF · Attach invoice if available"
      footerHint="Invoice attachment optional"
      submitLabel="Save expense"
      onSubmit={handleSave}
      submitDisabled={!canSave}
    >
      <FormGrid>
        <FormInput
          label="Vendor / Supplier"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          placeholder="Company name"
        />
        <FormSelect
          label="Expense category"
          value={category}
          onChange={(e) => {
            const next = e.target.value;
            setCategory(next);
            if (next !== 'Other') setCategoryOther('');
          }}
        >
          <option value="">Select category</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </FormSelect>
        {isOtherCategory ? (
          <FormInput
            label="Specify category"
            value={categoryOther}
            onChange={(e) => setCategoryOther(e.target.value)}
            placeholder="Enter category name"
          />
        ) : null}
        <FormDate label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
        <FormInput
          label="Amount (RWF)"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
          inputMode="numeric"
          placeholder="0"
        />
        <FormInput
          label="Invoice number"
          value={invoiceNo}
          onChange={(e) => setInvoiceNo(e.target.value)}
          placeholder="Optional"
        />
        <FormFileUpload
          label="Upload invoice"
          fileName={invoiceFile?.name}
          onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
        />
      </FormGrid>
      <FormTextarea
        label="Note (optional)"
        className="mt-4"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Additional details"
        rows={3}
      />
    </AccountantFormModal>
  );
};

export default function Expenses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [details, setDetails] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [payingExpense, setPayingExpense] = useState(null);

  const [rows, setRows] = useState([]);

  const fetchExpenses = async () => {
    try {
      const res = await api.get('/accountant/expenses');
      if (res.data?.success) setRows(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (e) {
      console.warn('[Expenses] Failed to load live expenses:', e.message);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadPdfReport = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    const NAVY = [30, 58, 95];
    const YELLOW = [254, 191, 16];
    const margin = 40;

    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 64, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Expenses Report', margin, 40);

    doc.setDrawColor(...YELLOW);
    doc.setLineWidth(3);
    doc.line(margin, 76, W - margin, 76);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 98);
    doc.text(`Category: ${selectedCategory}`, margin, 114);

    const headerY = 140;
    const cols = [
      { key: 'id', label: 'ID', w: 70 },
      { key: 'vendor', label: 'Vendor', w: 170 },
      { key: 'category', label: 'Category', w: 90 },
      { key: 'date', label: 'Date', w: 70 },
      { key: 'amount', label: 'Amount', w: 80 },
      { key: 'status', label: 'Status', w: 60 },
    ];

    let x = margin;
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, headerY - 14, W - margin * 2, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    cols.forEach((c) => {
      doc.text(c.label, x, headerY);
      x += c.w;
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let y = headerY + 22;
    const rowH = 18;

    filtered.forEach((r) => {
      if (y > H - 60) {
        doc.addPage();
        y = 60;
      }
      let cx = margin;
      const cells = {
        id: r.id,
        vendor: r.vendor,
        category: r.category,
        date: r.date,
        amount: formatMoneyRWF(r.amount).replace('RWF', '').trim(),
        status: r.status,
      };
      cols.forEach((c) => {
        const text = String(cells[c.key] ?? '');
        doc.text(text.length > 28 ? `${text.slice(0, 27)}…` : text, cx, y);
        cx += c.w;
      });
      y += rowH;
    });

    doc.save(`expenses-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const derived = useMemo(() => {
    const categories = ['All', ...Array.from(new Set(rows.map((r) => r.category)))];
    const total = rows.reduce((s, r) => s + r.amount, 0);
    const pendingTotal = rows.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount, 0);
    return { categories, total, pendingTotal };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rows.filter((r) => {
      const catOk = selectedCategory === 'All' || r.category === selectedCategory;
      const qOk = !q || r.vendor.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [rows, searchTerm, selectedCategory]);

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <AccountantOchreHero
        eyebrow="Spend control"
        titleLine="School"
        titleAccent="Expenses"
        subtitle="Expense register & approvals overview"
        icon={Receipt}
      />

      {/* Card */}
      <div className="acct-shell-standard pb-20">
        <div className="acct-panel-sheet overflow-hidden flex flex-col min-h-[520px]">
          {/* Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
              {[
                { label: 'Total Expenses', value: formatMoneyRWF(derived.total).replace('RWF', ''), icon: <Banknote size={14} className="text-emerald-600" /> },
                { label: 'Pending Bills', value: formatMoneyRWF(derived.pendingTotal).replace('RWF', ''), icon: <AlertTriangle size={14} className="text-amber-500" /> },
                { label: 'Records', value: String(rows.length), icon: <Calendar size={14} className="text-[#000435]" /> },
                { label: 'Currency', value: 'RWF', icon: <Receipt size={14} className="text-[#000435]" /> },
              ].map((stat, i) => (
                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                  <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0">{stat.icon}</div>
                  <span className="text-sm sm:text-2xl font-medium text-re-text tracking-tighter group-hover:text-[#000435] transition-colors">
                    {stat.value}
                  </span>
                  <p className="text-[6px] sm:text-[8px] font-medium text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
              <button
                onClick={() => setIsAddOpen(true)}
                className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
              >
                <Receipt size={14} />
                <span>Add expense</span>
              </button>
              <button
                type="button"
                onClick={downloadPdfReport}
                className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-medium text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg hover:border-[#000435]/20 hover:shadow-re-soft transition-all group"
              >
                <Printer size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: '#000435' }} />
                <span className="group-hover:text-[#000435]">Export PDF</span>
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="hidden lg:flex px-4 py-4 lg:px-3 lg:py-2 border-b border-black/5 flex-nowrap items-center justify-start gap-2 bg-re-bg/20 transition-all">
            <div className="flex flex-nowrap items-center gap-2">
              <div className="relative w-[10.5rem] shrink-0 group">
                <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#FEBF10] z-[1] pointer-events-none" />
                <span className="absolute left-7 top-1/2 -translate-y-1/2 text-[8px] font-medium uppercase text-re-text-muted tracking-[0.2em] pointer-events-none z-[1]">Category</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[9px] font-medium uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.5)] cursor-pointer appearance-none !pl-[5.2rem] pr-8"
                >
                  {derived.categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="relative w-[14rem] group">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-[#000435] transition-colors z-[1] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search vendor or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[9px] font-medium uppercase tracking-tight shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.5)] placeholder:text-[#000435]/30 !pl-8"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchExpenses()}
              className="h-8 w-8 flex items-center justify-center bg-white border border-black/5 rounded-lg hover:bg-re-bg transition-all shadow-sm disabled:opacity-40 shrink-0 ml-auto"
            >
              <RefreshCw size={12} className="text-[#000435]" />
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-white flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-re-bg/20 border-b border-black/5">
                  <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-[8px] font-medium text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Expense</th>
                  <th className="hidden md:table-cell px-6 py-3 text-[8px] font-medium text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Category</th>
                  <th className="hidden md:table-cell px-6 py-3 text-[8px] font-medium text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Date</th>
                  <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-right text-[8px] font-medium text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Amount</th>
                  <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-right text-[8px] font-medium text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Status</th>
                  <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-right text-[8px] font-medium text-re-text-muted uppercase tracking-[0.2em] opacity-40">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setDetails(r)}
                    className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors cursor-pointer"
                  >
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5">
                      <p className="text-[13px] font-medium text-[#000435] tracking-tight truncate">{r.vendor}</p>
                      <p className="text-[8px] font-medium text-re-text-muted uppercase tracking-widest leading-none mt-1 opacity-50">{r.id}</p>
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 border-r border-black/5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-white border border-black/5 text-[9px] font-medium uppercase tracking-widest text-[#000435]">
                        {r.category}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 border-r border-black/5 text-[10px] font-medium text-[#000435]">
                      {r.date}
                    </td>
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5 text-right text-[12px] font-medium text-[#000435]">
                      {formatMoneyRWF(r.amount).replace('RWF', '')}
                    </td>
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-medium uppercase tracking-widest border ${
                        r.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : r.status === 'approved'
                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                            : r.status === 'pending_approval'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                              : r.status === 'rejected'
                                ? 'bg-red-50 text-red-700 border-red-100'
                                : 'bg-amber-50 text-amber-800 border-amber-100'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const dbId = Number(r?.db_id);
                            if (!dbId) return;
                            api.patch(`/accountant/expenses/${dbId}/request-approval`).then(() => fetchExpenses());
                          }}
                          disabled={r.status === 'pending_approval' || r.status === 'approved' || r.status === 'paid'}
                          className="h-7 px-3 rounded-xl flex items-center justify-center gap-1.5 bg-white border border-black/5 text-re-text font-medium text-[8px] uppercase tracking-widest shadow-sm hover:bg-re-bg hover:text-[#000435] transition-all disabled:opacity-40"
                          title="Request manager approval"
                        >
                          <span>Request</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPayingExpense(r);
                          }}
                          disabled={!['approved', 'paid'].includes(String(r.status || '').toLowerCase())}
                          className="h-7 px-3 rounded-xl flex items-center justify-center gap-1.5 bg-white border border-black/5 text-re-text font-medium text-[9px] uppercase tracking-widest shadow-sm hover:bg-re-bg hover:text-[#000435] transition-all disabled:opacity-40"
                          title="Record payment"
                        >
                          <CreditCard size={12} className="text-amber-500" />
                          <span>Pay</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      <p className="text-[9px] font-medium text-re-text-muted uppercase tracking-widest opacity-40">No expenses found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex px-4 sm:px-8 py-5 bg-re-bg/20 border-t border-black/5 items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-[8px] font-medium text-re-text-muted uppercase tracking-widest italic opacity-60">
                {filtered.length} records
              </p>
            </div>
            <p className="text-[8px] font-medium text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic">
              RWF
            </p>
          </div>
        </div>
      </div>

      <ExpenseDetailsDrawer
        isOpen={!!details}
        expense={details}
        onClose={() => setDetails(null)}
        onMarkPaid={(exp) => {
          const dbId = Number(exp?.db_id);
          api.patch(`/accountant/expenses/${dbId}/status`, { status: 'paid' }).then(() => fetchExpenses());
          setRows((prev) => prev.map((r) => (r.id === exp.id ? { ...r, status: 'paid' } : r)));
          setDetails((prev) => (prev && prev.id === exp.id ? { ...prev, status: 'paid' } : prev));
        }}
        onRequestApproval={(exp) => {
          const dbId = Number(exp?.db_id);
          api.patch(`/accountant/expenses/${dbId}/request-approval`).then(() => fetchExpenses());
          setRows((prev) => prev.map((r) => (r.id === exp.id ? { ...r, status: 'pending_approval' } : r)));
          setDetails((prev) => (prev && prev.id === exp.id ? { ...prev, status: 'pending_approval' } : prev));
        }}
        onRecordPayment={(exp) => setPayingExpense(exp)}
      />

      <RecordExpensePaymentModal
        isOpen={!!payingExpense}
        expense={payingExpense}
        onClose={() => setPayingExpense(null)}
        onSave={(payment) => {
          const dbId = Number(payingExpense?.db_id);
          api.post(`/accountant/expenses/${dbId}/payments`, payment).then(() => fetchExpenses());
          setRows((prev) => {
            return prev.map((r) => {
              if (r.id !== payingExpense?.id) return r;
              const nextPayments = [...(Array.isArray(r.payments) ? r.payments : [])];
              nextPayments.unshift({
                id: `PAY-${Date.now()}`,
                ...payment,
              });
              const paidTotal = nextPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
              const nextStatus = paidTotal >= (Number(r.amount) || 0) ? 'paid' : 'approved';
              return { ...r, payments: nextPayments, status: nextStatus };
            });
          });

          // keep drawer in sync if open on same row
          setDetails((prev) => {
            if (!prev || prev.id !== payingExpense?.id) return prev;
            const nextPayments = [...(Array.isArray(prev.payments) ? prev.payments : [])];
            nextPayments.unshift({ id: `PAY-${Date.now()}`, ...payment });
            const paidTotal = nextPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
            const nextStatus = paidTotal >= (Number(prev.amount) || 0) ? 'paid' : 'approved';
            return { ...prev, payments: nextPayments, status: nextStatus };
          });
        }}
      />

      <AddExpenseModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onCreate={(payload) => {
          api.post('/accountant/expenses', payload).then(() => fetchExpenses());
          setRows((prev) => {
            const nextId = `EXP-${String(prev.length + 1).padStart(3, '0')}`;
            return [
              {
                id: nextId,
                status: 'pending',
                payments: [],
                ...payload,
              },
              ...prev,
            ];
          });
        }}
      />
    </div>
  );
}

