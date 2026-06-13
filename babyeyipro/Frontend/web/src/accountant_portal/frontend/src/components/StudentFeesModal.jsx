import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, CreditCard, User, Calendar, Receipt, Loader2, FileText, 
    ChevronRight, AlertTriangle, ShieldCheck, TrendingUp,
    Phone, Printer, Users, Home, Banknote, Send, Settings2,
    Download, History,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import PortalToast from './PortalToast';
import InvoiceHistoryModal from './InvoiceHistoryModal';
import api from '../services/api';
import {
    buildReceiptViewModel,
    printFeePaymentReceiptPdf,
    downloadFeePaymentReceiptPdf,
    downloadAllStudentPaymentsPdf,
} from '../utils/feePaymentReceipt';

export default function StudentFeesModal({
    isOpen,
    onClose,
    student,
    academicYear,
    term,
    paymentHistory = [],
    onEditPayment,
    onDeletePayment,
}) {
    const [loading, setLoading] = useState(true);
    const [profileError, setProfileError] = useState('');
    const [feeProfile, setFeeProfile] = useState(null);
    const [history, setHistory] = useState([]);
    const [invoiceMenuOpen, setInvoiceMenuOpen] = useState(false);
    const [invoiceSettingsOpen, setInvoiceSettingsOpen] = useState(false);
    const [invoiceHistoryOpen, setInvoiceHistoryOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [busyActionKey, setBusyActionKey] = useState('');

    const storageKeys = useMemo(() => {
        const uid = student?.id || 'student';
        const keyBase = `acct:fees:invoice`;
        return {
            config: `${keyBase}:config`,
            sent: `${keyBase}:sent:${uid}:${academicYear || 'year'}:${term || 'term'}`,
        };
    }, [student?.id, academicYear, term]);

    const [invoiceConfig, setInvoiceConfig] = useState(() => {
        try {
            const raw = localStorage.getItem('acct:fees:invoice:config');
            const parsed = raw ? JSON.parse(raw) : null;
            return parsed && typeof parsed === 'object'
                ? parsed
                : {
                    schoolName: 'Babyeyi School',
                    contactLine: 'Finance Office',
                    currency: 'RWF',
                    bankAccount: 'ACC-__________',
                    momoNumber: '07__ ___ ___',
                    footerNote: 'Thank you for supporting the school.',
                };
        } catch {
            return {
                schoolName: 'Babyeyi School',
                contactLine: 'Finance Office',
                currency: 'RWF',
                bankAccount: 'ACC-__________',
                momoNumber: '07__ ___ ___',
                footerNote: 'Thank you for supporting the school.',
            };
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('acct:fees:invoice:config', JSON.stringify(invoiceConfig));
        } catch {
            // ignore
        }
    }, [invoiceConfig]);

    const mapPaymentRows = (payments, items) => {
        if (Array.isArray(items) && items.length) {
            return items.map((item, idx) => ({
                id: item.payment_id || item.intent_id || idx + 1,
                date: item.date
                    ? String(item.date).slice(0, 10)
                    : '—',
                amount: Number(item.amount || 0),
                channel: item.channel || item.payment_method || 'Recorded',
                category: item.category || (Array.isArray(item.fee_categories) && item.fee_categories.length
                    ? item.fee_categories.join(', ')
                    : (term || 'Fees')),
                fee_lines: Array.isArray(item.fee_lines) ? item.fee_lines : [],
                ref: item.reference || item.invoice_no || (item.payment_id ? `PAY-${item.payment_id}` : '—'),
                transactionRef: item.transaction_ref || '',
                bankName: item.bank_name || '',
                paidBy: item.paid_by || '',
                momoPhone: item.momo_phone || '',
                raw: item.raw || item,
                status: item.status || 'verified',
            }));
        }
        return (payments || []).map((p, idx) => ({
            id: p.id || idx + 1,
            date: p.paid_at_date || (p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : '—'),
            amount: Number(p.amount_paid || 0),
            channel: p.payment_method || p.notes || 'Recorded',
            category: p.term || term || 'Fees',
            ref: p.receipt_no || (p.id ? `PAY-${p.id}` : '—'),
            transactionRef: p.transaction_ref || '',
            bankName: p.bank_name || '',
            paidBy: p.paid_by || '',
            momoPhone: p.momo_phone || '',
            raw: p,
            status: 'verified',
        }));
    };

    useEffect(() => {
        if (!isOpen || !student) return;
        setInvoiceMenuOpen(false);
        setInvoiceSettingsOpen(false);
        setInvoiceHistoryOpen(false);
        setProfileError('');
        setFeeProfile(null);
        setLoading(true);

        const studentDbId = Number(student.student_id);
        const canFetch = Number.isFinite(studentDbId) && studentDbId > 0;

        if (!canFetch) {
            setFeeProfile({
                amountToPay: Number(student.amountToPay ?? 0),
                paidThisTerm: Number(student.paidThisTerm ?? student.paid ?? 0),
                remaining: Number(student.remaining ?? 0),
                guardian: student.guardian || '—',
                parentPhone: student.parentPhone || '',
            });
            setHistory(mapPaymentRows(paymentHistory));
            setLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const res = await api.get(`/accountant/students/${studentDbId}/payment-history`, {
                    params: {
                        academic_year: academicYear || undefined,
                        term: term || undefined,
                    },
                });
                if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load student fees');
                const data = res.data.data || {};
                const fin = data.financial || {};
                const st = data.student || {};
                if (cancelled) return;
                setFeeProfile({
                    amountToPay: fin.amount_to_pay ?? student.amountToPay ?? 0,
                    paidThisTerm: fin.paid_this_term ?? student.paidThisTerm ?? 0,
                    remaining:
                        fin.remaining != null
                            ? fin.remaining
                            : Math.max(
                                  0,
                                  Number(fin.amount_to_pay ?? student.amountToPay ?? 0)
                                      - Number(fin.paid_this_term ?? student.paidThisTerm ?? 0)
                              ),
                    guardian: st.guardian_name || student.guardian || '—',
                    parentPhone: st.parent_phone || student.parentPhone || '',
                });
                setHistory(mapPaymentRows(paymentHistory, data.items));
            } catch (e) {
                if (cancelled) return;
                setProfileError(e.response?.data?.message || e.message || 'Could not load financial details');
                setFeeProfile({
                    amountToPay: Number(student.amountToPay ?? 0),
                    paidThisTerm: Number(student.paidThisTerm ?? student.paid ?? 0),
                    remaining: Number(student.remaining ?? 0),
                    guardian: student.guardian || '—',
                    parentPhone: student.parentPhone || '',
                });
                setHistory(mapPaymentRows(paymentHistory));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isOpen, student, paymentHistory, term, academicYear]);

    useEffect(() => {
        if (!toast) return undefined;
        const t = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(t);
    }, [toast]);

    if (!isOpen || !student) return null;

    const amountToPay = Number(
        feeProfile?.amountToPay ?? student.amountToPay ?? student.amountOwed ?? 0
    );
    const paidThisTerm = Number(feeProfile?.paidThisTerm ?? student.paidThisTerm ?? student.paid ?? 0);
    const remaining =
        feeProfile?.remaining != null
            ? Number(feeProfile.remaining)
            : Number(student.remaining ?? Math.max(0, amountToPay - paidThisTerm));
    const guardianLabel = feeProfile?.guardian || student.guardian || '—';
    const parentPhone = feeProfile?.parentPhone || student.parentPhone || '';
    const parentPhoneDial = parentPhone.replace(/[^\d+]/g, '');

    const format = (val) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(val);

    const openPrintWindow = (doc) => {
        doc.autoPrint();
        const blob = doc.output('blob');
        window.open(URL.createObjectURL(blob), '_blank');
    };

    const printInvoicePdf = () => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const W = doc.internal.pageSize.getWidth();
        const H = doc.internal.pageSize.getHeight();
        const margin = 40;
        const NAVY = [30, 58, 95];
        const YELLOW = [254, 191, 16];

        const title = 'Fees Invoice';
        const studentName = student.name || 'Student';
        const uid = student.id || '—';
        const cls = student.class || '—';
        const invoiceNo = `INV-${String(uid).replace(/\s+/g, '')}-${String(academicYear || '').replace(/\s+/g, '')}-${String(term || '').replace(/\s+/g, '')}`.replace(/-+$/,'');

        doc.setFillColor(...NAVY);
        doc.rect(0, 0, W, 64, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(invoiceConfig.schoolName || 'School', margin, 28);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(title, margin, 48);

        doc.setDrawColor(...YELLOW);
        doc.setLineWidth(3);
        doc.line(margin, 76, W - margin, 76);

        let y = 100;

        const labelValue = (label, value, boldValue = true) => {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(label, margin, y);
            doc.setDrawColor(210, 210, 210);
            doc.setLineDashPattern([1, 2], 0);
            const labelW = doc.getTextWidth(label);
            const valW = doc.getTextWidth(String(value));
            doc.line(margin + labelW + 8, y - 2, W - margin - valW - 4, y - 2);
            doc.setLineDashPattern([], 0);
            doc.setFont('helvetica', boldValue ? 'bold' : 'normal');
            doc.setTextColor(15, 23, 42);
            doc.text(String(value), W - margin, y, { align: 'right' });
            y += 16;
        };

        labelValue('Invoice No.', invoiceNo);
        labelValue('Generated', new Date().toLocaleString());
        labelValue('Academic year', academicYear || '—');
        labelValue('Term', term || '—');
        y += 4;

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...NAVY);
        doc.setFontSize(11);
        doc.text('Student', margin, y);
        y += 14;
        labelValue('Name', studentName);
        labelValue('UID', uid);
        labelValue('Class', cls);
        y += 4;

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...NAVY);
        doc.setFontSize(11);
        doc.text('Invoice Summary', margin, y);
        y += 14;
        labelValue('Amount to pay', format(amountToPay));
        labelValue('Paid (term)', format(paidThisTerm));
        labelValue('Remaining', format(remaining));
        y += 4;

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...NAVY);
        doc.setFontSize(11);
        doc.text('Payment Details', margin, y);
        y += 14;

        const recent = (history || []).slice().sort((a,b) => String(b.date||'').localeCompare(String(a.date||''))).slice(0, 6);
        if (recent.length === 0) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text('No payments recorded for this student yet.', margin, y);
            y += 14;
        } else {
            const col = [margin, margin + 140, margin + 280, W - margin];
            doc.setFillColor(...YELLOW);
            doc.rect(margin, y - 10, W - margin * 2, 18, 'F');
            doc.setTextColor(...NAVY);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('DATE', col[0] + 6, y + 2);
            doc.text('MODE', col[1] + 6, y + 2);
            doc.text('REF', col[2] + 6, y + 2);
            doc.text('AMOUNT', col[3] - 6, y + 2, { align: 'right' });
            y += 22;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(15, 23, 42);
            recent.forEach((p, i) => {
                if (y > H - 90) return;
                if (i % 2 === 1) {
                    doc.setFillColor(248, 250, 252);
                    doc.rect(margin, y - 10, W - margin * 2, 18, 'F');
                }
                doc.text(String(p.date || '—'), col[0] + 6, y + 2);
                doc.text(String(p.channel || '—'), col[1] + 6, y + 2);
                doc.text(String(p.ref || '—'), col[2] + 6, y + 2);
                doc.text(format(Number(p.amount) || 0).replace('RWF', '').trim(), col[3] - 6, y + 2, { align: 'right' });
                y += 18;
            });
            y += 6;
        }

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...NAVY);
        doc.setFontSize(11);
        doc.text('Payment Options', margin, y);
        y += 14;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        labelValue('Bank account', invoiceConfig.bankAccount || '—', false);
        labelValue('Mobile money', invoiceConfig.momoNumber || '—', false);

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.text(invoiceConfig.footerNote || '', margin, H - 48);

        openPrintWindow(doc);
    };

    const downloadAllPaymentsPdf = async () => {
        const studentId = student?.student_id;
        if (!studentId) {
            setToast({ type: 'error', message: 'Student id missing.' });
            return;
        }
        setBusyActionKey('all-pdf');
        try {
            const res = await api.get(`/accountant/students/${studentId}/payment-history`, {
                params: { academic_year: academicYear, term },
            });
            if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load payments');
            const payload = res.data.data || {};
            downloadAllStudentPaymentsPdf({
                student,
                academicYear,
                term,
                items: payload.items || [],
                schoolName: payload.student?.school_name || invoiceConfig.schoolName,
            });
            setToast({ type: 'success', message: 'Payment summary PDF downloaded.' });
        } catch (e) {
            setToast({ type: 'error', message: e?.response?.data?.message || e.message || 'Download failed.' });
        } finally {
            setBusyActionKey('');
        }
    };

    const downloadReceiptPdf = (log) => {
        const payment = log?.raw || {
            id: log?.id,
            receipt_no: log?.ref,
            amount_paid: log?.amount,
            payment_method: log?.channel,
            transaction_ref: log?.transactionRef,
            bank_name: log?.bankName,
            paid_by: log?.paidBy,
            momo_phone: log?.momoPhone,
            paid_at_date: log?.date,
            class_name: student?.class,
            term,
            academic_year_label: academicYear,
        };
        downloadFeePaymentReceiptPdf(
            buildReceiptViewModel(payment, {
                studentName: student?.name,
                studentCode: student?.id,
                className: student?.class,
                academicYear,
                term,
                schoolName: invoiceConfig.schoolName,
            })
        );
    };

    const printReceiptPdf = (log) => {
        const payment = log?.raw || {
            id: log?.id,
            receipt_no: log?.ref,
            amount_paid: log?.amount,
            payment_method: log?.channel,
            transaction_ref: log?.transactionRef,
            bank_name: log?.bankName,
            paid_by: log?.paidBy,
            momo_phone: log?.momoPhone,
            paid_at_date: log?.date,
            class_name: student?.class,
            term,
            academic_year_label: academicYear,
        };
        const receipt = buildReceiptViewModel(payment, {
            studentName: student?.name,
            studentCode: student?.id,
            className: student?.class,
            academicYear,
            term,
            schoolName: invoiceConfig.schoolName,
        });
        printFeePaymentReceiptPdf(receipt);
    };

    const sendInvoiceToParent = () => {
        // No backend yet — use email client as a lightweight "send" placeholder
        const subject = encodeURIComponent(`Fees invoice · ${student.name || 'Student'} · ${academicYear || ''} ${term || ''}`.trim());
        const body = encodeURIComponent(
            [
                `Student: ${student.name || '—'}`,
                `UID: ${student.id || '—'}`,
                `Class: ${student.class || '—'}`,
                `Academic year: ${academicYear || '—'}`,
                `Term: ${term || '—'}`,
                '',
                `Amount to pay: ${amountToPay == null ? '—' : format(amountToPay)}`,
                `Paid (term): ${format(paidThisTerm)}`,
                `Remaining: ${remaining == null ? '—' : format(remaining)}`,
                `Guardian: ${guardianLabel}`,
                `Parent phone: ${parentPhone || '—'}`,
                '',
                'Note: This invoice was generated from the school portal.',
            ].join('\n')
        );
        try {
            localStorage.setItem(storageKeys.sent, JSON.stringify({ sentAt: new Date().toISOString() }));
        } catch {
            // ignore
        }
        window.open(`mailto:?subject=${subject}&body=${body}`);
    };

    const sentMeta = (() => {
        try {
            const raw = localStorage.getItem(storageKeys.sent);
            const parsed = raw ? JSON.parse(raw) : null;
            return parsed?.sentAt ? parsed.sentAt : null;
        } catch {
            return null;
        }
    })();

    return createPortal(
        <>
            {/* Backdrop Blur */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] animate-in fade-in duration-300"
                onClick={() => onClose()}
            />

            {/* Right Side Drawer */}
            <div className="fixed inset-y-0 right-0 z-[110] w-full md:w-[420px] bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.1)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">

                {/* Drawer Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-black/5 bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full border border-black/5 bg-slate-50 flex items-center justify-center font-medium text-lg  relative overflow-hidden shrink-0 text-[#000435]">
                            <span>{student.name?.charAt(0) || <User size={20} />}</span>
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-medium text-[#000435] text-base leading-tight uppercase tracking-tight truncate">{student.name}</h3>
                            <div className="flex flex-col gap-0.5 mt-0.5">
                                <p className="text-[9px] text-slate-400 font-medium flex items-center gap-1 uppercase tracking-widest opacity-60 truncate">
                                    <span className="w-1 h-1 rounded-full shrink-0 bg-amber-400"></span>
                                    UID: {student.id}
                                </p>
                                <p className="text-[8px] text-[#000435] font-medium flex items-center gap-1 uppercase tracking-[0.2em] truncate">
                                    {student.class} Class
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => onClose()}
                        className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-[#000435] group"
                    >
                        <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Drawer Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar bg-white">

                    {profileError ? (
                        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[10px] font-medium text-amber-900">
                            {profileError}
                        </div>
                    ) : null}

                    {/* Financial Breakdown Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.3em] opacity-40">Financial Breakdown</span>
                            <div className="flex-1 h-px bg-black/5" />
                        </div>
                        {[
                            {
                                label: 'Amount to pay (Total)',
                                value: amountToPay == null ? '—' : format(amountToPay),
                                icon: AlertTriangle,
                                color: 'text-[#000435]',
                            },
                            {
                                label: 'Guardian',
                                value: guardianLabel || '—',
                                icon: Users,
                                color: 'text-[#000435]',
                            },
                            {
                                label: 'Parent Phone',
                                value: parentPhone || '—',
                                icon: Phone,
                                color: 'text-[#000435]',
                            },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    <item.icon size={11} className="opacity-30 text-amber-500" />
                                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{item.label}</span>
                                </div>
                                <div className="flex-1 mx-3 border-b border-dashed border-black/10 group-hover:border-amber-200 transition-colors" />
                                <span className={`text-[10px] font-medium uppercase tracking-tight ${item.color}`}>{item.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Financial Summary Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-3xl p-5 border border-black/5  relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500 opacity-5 rounded-full -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-700" />
                            <p className="text-[8px] text-slate-400 uppercase tracking-[0.2em] font-medium mb-1 relative z-10 opacity-60">Amount Paid</p>
                            <div className="flex items-baseline gap-1 relative z-10">
                                <span className="text-xl font-medium tracking-tighter text-emerald-600">
                                    {format(paidThisTerm).replace('RWF', '')}
                                </span>
                                <span className="text-[9px] font-medium uppercase tracking-widest text-[#000435]">RWF</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-3xl p-5 border border-black/5  relative overflow-hidden group text-right">
                            <div className="absolute top-0 left-0 w-16 h-16 bg-amber-500 opacity-5 rounded-full -ml-6 -mt-6 group-hover:scale-125 transition-transform duration-700" />
                            <p className="text-[8px] text-slate-400 uppercase tracking-[0.2em] font-medium mb-1 relative z-10 opacity-60">Remaining</p>
                            <div className="flex items-baseline gap-1 justify-end relative z-10">
                                <span className="text-xl font-medium text-red-500 tracking-tighter">
                                    {remaining == null ? '—' : format(remaining).replace('RWF', '')}
                                </span>
                                <span className="text-[9px] font-medium uppercase tracking-widest ml-1 opacity-60">RWF</span>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Log */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.3em] opacity-40">Payment History</span>
                            <div className="flex-1 h-px bg-black/5" />
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <Loader2 size={24} className="animate-spin text-[#000435]/30" />
                                <p className="text-[8px] font-medium text-slate-400 uppercase tracking-[0.2em] opacity-40">Fetching logs...</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest italic opacity-40">No transaction records found.</p>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-black/5 overflow-x-auto overflow-y-visible custom-scrollbar max-w-full">
                                <table className="w-full min-w-[520px] text-left border-collapse">
                                    <thead>
                                        <tr className="bg-re-bg/20 border-b border-black/5">
                                            <th className="px-3 py-2 text-[6.5px] font-medium text-re-text-muted uppercase tracking-[0.24em] opacity-40 border-r border-black/5 whitespace-nowrap min-w-[108px]">Paid at</th>
                                            <th className="px-3 py-2 text-[6.5px] font-medium text-re-text-muted uppercase tracking-[0.24em] opacity-40 border-r border-black/5 whitespace-nowrap min-w-[96px]">Mode</th>
                                            <th className="px-3 py-2 text-right text-[6.5px] font-medium text-re-text-muted uppercase tracking-[0.24em] opacity-40 border-r border-black/5 whitespace-nowrap min-w-[88px]">Amount</th>
                                            <th className="px-3 py-2 text-right text-[6.5px] font-medium text-re-text-muted uppercase tracking-[0.24em] opacity-40 whitespace-nowrap min-w-[220px]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5">
                                        {history.map((log) => (
                                            <tr key={log.id} className="hover:bg-re-bg/30 transition-colors">
                                                <td className="px-3 py-2 border-r border-black/5">
                                                    <p className="text-[8px] font-medium text-[#000435] uppercase tracking-widest leading-none whitespace-nowrap">{log.date}</p>
                                                    <p className="text-[6.5px] font-medium text-re-text-muted uppercase tracking-widest opacity-40 mt-1 leading-none truncate">{log.ref}</p>
                                                </td>
                                                <td className="px-3 py-2 border-r border-black/5">
                                                    <p className="text-[8px] font-medium text-[#000435] uppercase tracking-widest leading-none">{log.channel}</p>
                                                    <p className="text-[6.5px] font-medium text-re-text-muted uppercase tracking-widest opacity-40 mt-1 leading-none truncate">{log.category}</p>
                                                </td>
                                                <td className="px-3 py-2 border-r border-black/5 text-right">
                                                    <p className="text-[9px] font-medium text-emerald-600 leading-none">
                                                        {format(log.amount).replace('RWF', '').trim()}
                                                        <span className="ml-1 text-[7px] font-medium text-[#000435]/60 uppercase tracking-widest">RWF</span>
                                                    </p>
                                                </td>
                                                <td className="px-2 py-2 align-middle">
                                                    {(() => {
                                                        const isBusy = busyActionKey.startsWith(`${log.id}:`);
                                                        return (
                                                    <div className="flex flex-nowrap items-center justify-end gap-1 shrink-0 min-w-[200px]">
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                const nextAmountRaw = window.prompt('Update amount (RWF):', String(log.amount || 0));
                                                                if (nextAmountRaw == null) return;
                                                                const nextAmount = Number(String(nextAmountRaw).replace(/[^\d.]/g, ''));
                                                                if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
                                                                    setToast({ type: 'error', message: 'Amount must be greater than zero.' });
                                                                    return;
                                                                }
                                                                const nextNote = window.prompt('Update note / payment mode:', String(log.channel || '')) || '';
                                                                if (String(nextNote).length > 120) {
                                                                    setToast({ type: 'error', message: 'Note is too long (max 120 characters).' });
                                                                    return;
                                                                }
                                                                if (onEditPayment) {
                                                                    setBusyActionKey(`${log.id}:edit`);
                                                                    try {
                                                                        await onEditPayment(log.id, {
                                                                            amount_paid: nextAmount,
                                                                            notes: nextNote,
                                                                        });
                                                                    } catch (e) {
                                                                        setToast({ type: 'error', message: e?.response?.data?.message || e.message || 'Could not update payment.' });
                                                                        return;
                                                                    } finally {
                                                                        setBusyActionKey('');
                                                                    }
                                                                }
                                                                setHistory((prev) => prev.map((x) => (
                                                                    x.id === log.id ? { ...x, amount: nextAmount, channel: nextNote || x.channel } : x
                                                                )));
                                                                setToast({ type: 'success', message: 'Payment updated.' });
                                                            }}
                                                            className="h-7 px-2.5 rounded-lg shrink-0 flex items-center justify-center bg-white border border-black/5 text-[#000435] font-medium text-[7px] uppercase tracking-widest hover:bg-re-bg transition-all"
                                                            disabled={isBusy}
                                                            title="Edit payment"
                                                        >
                                                            {isBusy && busyActionKey.endsWith(':edit') ? 'Saving…' : 'Edit'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                const yes = window.confirm('Delete this payment record?');
                                                                if (!yes) return;
                                                                if (onDeletePayment) {
                                                                    setBusyActionKey(`${log.id}:delete`);
                                                                    try {
                                                                        await onDeletePayment(log.id);
                                                                    } catch (e) {
                                                                        setToast({ type: 'error', message: e?.response?.data?.message || e.message || 'Could not delete payment.' });
                                                                        return;
                                                                    } finally {
                                                                        setBusyActionKey('');
                                                                    }
                                                                }
                                                                setHistory((prev) => prev.filter((x) => x.id !== log.id));
                                                                setToast({ type: 'success', message: 'Payment deleted.' });
                                                            }}
                                                            className="h-7 px-2.5 rounded-lg shrink-0 flex items-center justify-center bg-white border border-red-200 text-red-600 font-medium text-[7px] uppercase tracking-widest hover:bg-red-50 transition-all"
                                                            disabled={isBusy}
                                                            title="Delete payment"
                                                        >
                                                            {isBusy && busyActionKey.endsWith(':delete') ? 'Deleting…' : 'Del'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => downloadReceiptPdf(log)}
                                                            className="h-7 px-2.5 rounded-lg shrink-0 flex items-center justify-center gap-1 bg-white border border-black/5 text-re-text font-medium text-[7px] uppercase tracking-widest hover:bg-re-bg transition-all"
                                                            disabled={isBusy}
                                                            title="Download receipt PDF"
                                                        >
                                                            <Download size={11} className="text-emerald-600 shrink-0" />
                                                            <span>PDF</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => printReceiptPdf(log)}
                                                            className="h-7 px-2.5 rounded-lg shrink-0 flex items-center justify-center gap-1 bg-white border border-black/5 text-re-text font-medium text-[7px] uppercase tracking-widest hover:bg-re-bg transition-all"
                                                            disabled={isBusy}
                                                            title="Print receipt"
                                                        >
                                                            <Printer size={11} className="text-amber-500 shrink-0" />
                                                            <span>Print</span>
                                                        </button>
                                                    </div>
                                                        );
                                                    })()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {!loading && history.length > 0 ? (
                            <p className="text-[7px] font-medium text-slate-400 uppercase tracking-widest text-center mt-2 opacity-50">
                                Swipe or scroll horizontally to see all actions
                            </p>
                        ) : null}
                    </div>
                </div>

                {/* Drawer Footer (Actions) */}
                <div className="px-8 py-5 border-t border-black/5 bg-slate-50/20 flex flex-col gap-2">
                    <button
                        onClick={() => onClose({ recordPayment: true })}
                        className="h-10 w-full flex items-center justify-center gap-2 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest  active:scale-95 transition-all"
                        style={{ background: "linear-gradient(135deg, #000435 0%, #0D2644 100%)" }}
                    >
                        <CreditCard size={14} /> Record Payment
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <a
                            href={parentPhoneDial ? `tel:${parentPhoneDial}` : undefined}
                            aria-disabled={!parentPhoneDial}
                            className={`h-9 flex items-center justify-center gap-2 bg-white border border-black/5 text-[#000435] font-medium text-[9px] uppercase tracking-widest rounded-xl transition-all ${
                                parentPhoneDial ? 'hover:bg-slate-50' : 'opacity-40 pointer-events-none'
                            }`}
                            title={parentPhoneDial ? `Call ${parentPhone}` : 'No parent phone on file'}
                        >
                            <Phone size={14} className="text-amber-500" /> Call Parent
                        </a>
                        <div className="relative">
                            <button
                                onClick={() => setInvoiceMenuOpen((v) => !v)}
                                className="h-9 w-full flex items-center justify-center gap-2 bg-white border border-black/5 text-[#000435] font-medium text-[9px] uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all"
                                type="button"
                            >
                                <Printer size={14} className="text-amber-500" />
                                Invoice actions
                                <ChevronRight size={14} className={`opacity-50 transition-transform ${invoiceMenuOpen ? 'rotate-90' : ''}`} />
                            </button>

                            {invoiceMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-[120]" onClick={() => setInvoiceMenuOpen(false)} />
                                    <div className="absolute right-0 bottom-11 z-[130] w-60 rounded-2xl border border-black/10 bg-white overflow-hidden shadow-xl">
                                        <button
                                            type="button"
                                            onClick={() => { setInvoiceMenuOpen(false); setInvoiceHistoryOpen(true); }}
                                            className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-re-bg/30 transition-all"
                                        >
                                            <History size={14} className="text-[#000435]" />
                                            <span className="text-[10px] font-medium uppercase tracking-widest text-[#000435]">Invoice history</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setInvoiceMenuOpen(false); downloadAllPaymentsPdf(); }}
                                            className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-re-bg/30 transition-all border-t border-black/5"
                                            disabled={busyActionKey === 'all-pdf'}
                                        >
                                            <Download size={14} className="text-emerald-600" />
                                            <span className="text-[10px] font-medium uppercase tracking-widest text-[#000435]">
                                                {busyActionKey === 'all-pdf' ? 'Preparing…' : 'Download all payments PDF'}
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setInvoiceMenuOpen(false); printInvoicePdf(); }}
                                            className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-re-bg/30 transition-all border-t border-black/5"
                                        >
                                            <Printer size={14} className="text-[#000435]" />
                                            <span className="text-[10px] font-medium uppercase tracking-widest text-[#000435]">Print invoice</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setInvoiceMenuOpen(false); sendInvoiceToParent(); }}
                                            className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-re-bg/30 transition-all border-t border-black/5"
                                        >
                                            <Send size={14} className="text-[#000435]" />
                                            <span className="text-[10px] font-medium uppercase tracking-widest text-[#000435]">Send invoice</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setInvoiceMenuOpen(false); printInvoicePdf(); sendInvoiceToParent(); }}
                                            className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-re-bg/30 transition-all border-t border-black/5"
                                        >
                                            <Receipt size={14} className="text-[#000435]" />
                                            <span className="text-[10px] font-medium uppercase tracking-widest text-[#000435]">Print & send</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setInvoiceMenuOpen(false); setInvoiceSettingsOpen(true); }}
                                            className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-re-bg/30 transition-all border-t border-black/5"
                                        >
                                            <Settings2 size={14} className="text-[#000435]" />
                                            <span className="text-[10px] font-medium uppercase tracking-widest text-[#000435]">Invoice settings</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <InvoiceSettingsModal
                open={invoiceSettingsOpen}
                onClose={() => setInvoiceSettingsOpen(false)}
                config={invoiceConfig}
                setConfig={setInvoiceConfig}
                sentAt={sentMeta}
            />
            <InvoiceHistoryModal
                isOpen={invoiceHistoryOpen}
                onClose={() => setInvoiceHistoryOpen(false)}
                student={student}
                academicYear={academicYear}
                term={term}
                schoolName={invoiceConfig.schoolName}
            />
            <PortalToast toast={toast} />
        </>,
        document.body
    );
}

// Invoice settings modal (local-only)
export function InvoiceSettingsModal({ open, onClose, config, setConfig, sentAt }) {
    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            <div className="absolute inset-0 bg-[#0A192F]/60 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />
            <div className="relative w-full max-w-2xl max-h-[92vh] bg-re-bg rounded-3xl shadow-[0_32px_128px_-15px_rgba(30,58,95,0.35)] border border-white/20 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-500">
                <div
                    className="relative z-10 px-5 py-3 shrink-0"
                    style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
                >
                    <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-re-gold  -gold/10">
                                <Settings2 size={16} />
                            </div>
                            <div>
                                <h1 className="text-[11px] font-medium text-white uppercase tracking-widest leading-none">Invoice Settings</h1>
                                <p className="text-[7px] font-medium text-white/40 uppercase tracking-tight mt-1">
                                    Last sent: {sentAt ? new Date(sentAt).toLocaleString() : 'Not yet'}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-re-gold group">
                            <X size={14} className="group-hover:rotate-90 transition-all duration-300" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-re-bg/50 p-5 md:p-6 space-y-3">
                    {[
                        { key: 'schoolName', label: 'School name' },
                        { key: 'contactLine', label: 'Contact line' },
                        { key: 'bankAccount', label: 'Bank account' },
                        { key: 'momoNumber', label: 'Mobile money' },
                        { key: 'footerNote', label: 'Footer note' },
                    ].map((f) => (
                        <div key={f.key}>
                            <p className="text-[9px] font-medium text-[#000435] uppercase tracking-[0.2em] mb-1.5 opacity-80">{f.label}</p>
                            <input
                                value={config?.[f.key] || ''}
                                onChange={(e) => setConfig((prev) => ({ ...(prev || {}), [f.key]: e.target.value }))}
                                className="w-full h-9 rounded-lg bg-re-bg px-3 outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[9px] sm:text-[10px] font-medium tracking-tight  placeholder:text-re-text-muted/40"
                            />
                        </div>
                    ))}
                </div>

                <div className="bg-white border-t border-black/5 px-5 sm:px-6 py-2 flex items-center justify-end shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-9 px-4 rounded-lg border border-black/5 text-re-navy font-medium text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all active:scale-95"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
