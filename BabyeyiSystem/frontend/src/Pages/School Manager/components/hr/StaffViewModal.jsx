import { X, Mail, Phone, User, Briefcase, Wallet, Shield } from "lucide-react";
import { formatCurrency } from "../../utils/hrCenterHelpers";
import { staffRowDisplayMeta, isPlaceholderEmail } from "../../utils/staffFormMapper";

const FONT = `"Montserrat", system-ui, sans-serif`;

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
      <dt className="text-xs font-semibold text-slate-500 shrink-0">{label}</dt>
      <dd className="text-sm font-semibold text-slate-800 text-right break-all">{value ?? "—"}</dd>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-[#000435] mb-3">
        <Icon size={16} className="text-amber-500" />
        {title}
      </h3>
      <dl>{children}</dl>
    </section>
  );
}

export default function StaffViewModal({ open, staff, onClose, onEdit }) {
  if (!open || !staff) return null;

  const meta = staffRowDisplayMeta(staff);
  const noEmail = isPlaceholderEmail(staff.email);

  return (
    <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ fontFamily: FONT }}>
      <div className="absolute inset-0 bg-[#000435]/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-[#000435] to-[#0a1654] text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90">Staff profile</p>
            <h2 className="text-lg font-bold">{meta.fullName}</h2>
            <p className="text-xs text-white/60 mt-0.5">{meta.roleDisplay}</p>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <Section title="Personal" icon={User}>
            <Row label="Phone" value={staff.phone} />
            <Row label="Email" value={meta.emailDisplay} />
            <Row label="Gender" value={staff.gender} />
            <Row label="Date of birth" value={staff.date_of_birth ? String(staff.date_of_birth).slice(0, 10) : null} />
            <Row label="National ID" value={staff.national_id} />
            <Row label="Address" value={staff.address} />
          </Section>

          <Section title="Job" icon={Briefcase}>
            <Row label="Staff ID" value={staff.staff_id} />
            <Row label="Department" value={staff.department} />
            <Row label="Position" value={meta.roleDisplay} />
            <Row label="Contract" value={staff.employment_type} />
            <Row label="Joined" value={staff.date_of_employment ? String(staff.date_of_employment).slice(0, 10) : null} />
            <Row label="Status" value={staff.employment_status || (staff.is_active ? "Active" : "Inactive")} />
          </Section>

          <Section title="Payroll" icon={Wallet}>
            <Row label="Basic salary" value={staff.payroll_basic_salary != null ? formatCurrency(staff.payroll_basic_salary) : null} />
            <Row label="Payment" value={staff.payroll_payment_method} />
            <Row label="Shule Avance" value={Number(staff.allow_advance) === 1 ? "Allowed" : "Not allowed"} />
          </Section>

          <Section title="Account" icon={Shield}>
            <Row label="Username" value={staff.username} />
            <Row label="RFID UID" value={staff.rfid_uid || "—"} />
            <Row label="Login email" value={noEmail ? "System login (no personal email)" : staff.email} />
            <Row label="Account" value={Number(staff.account_enabled) === 0 ? "Disabled" : "Active"} />
          </Section>
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-slate-100 flex gap-2 justify-end bg-slate-50/80">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-white">
            Close
          </button>
          <button
            type="button"
            onClick={() => { onClose?.(); onEdit?.(staff); }}
            className="px-5 py-2.5 rounded-xl bg-amber-400 text-[#000435] text-sm font-bold hover:bg-amber-300"
          >
            Edit staff
          </button>
        </div>
      </div>
    </div>
  );
}
