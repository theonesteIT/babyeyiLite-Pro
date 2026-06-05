import { forwardRef } from 'react';
import { BookOpen, CheckCircle2, FileText, UserCheck } from 'lucide-react';

const NAVY = '#000435';
const GOLD = '#F59E0B';
const GOLD_LIGHT = '#FEF3C7';
const BORDER = '#E2E8F0';

function shortDeductionLabel(desc = '') {
  const d = String(desc).toLowerCase();
  if (d.includes('rssb')) return 'RSSB';
  if (d.includes('rama')) return 'RAMA';
  if (d.includes('paye')) return 'PAYE';
  if (d.includes('maternity')) return 'Maternity Leave';
  if (d.includes('mutuelle') || d.includes('cbhi')) return 'Mutuelle (CBHI)';
  if (d.includes('other') || d.includes('additional')) return 'Others';
  return desc.split('—')[0].split('(')[0].trim() || desc;
}

function shortEmployerLabel(desc = '') {
  const d = String(desc).toLowerCase();
  if (d.includes('rssb')) return 'RSSB Pension';
  if (d.includes('rama')) return 'RAMA';
  if (d.includes('maternity')) return 'Maternity Leave';
  if (d.includes('occupational') || d.includes('hazard')) return 'Occupational Hazard';
  return desc.split('(')[0].trim() || desc;
}

function InfoCell({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-medium mb-0.5" style={{ color: '#64748B' }}>{label}</p>
      <p className="text-[11px] font-bold break-all" style={{ color: NAVY }}>{value || '—'}</p>
    </div>
  );
}

function AmountTable({ title, rows, totalLabel, totalValue }) {
  return (
    <div className="flex-1 min-w-0">
      <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
            <th className="text-left py-2 font-bold uppercase tracking-wide" style={{ color: GOLD }}>{title}</th>
            <th className="text-right py-2 font-bold uppercase tracking-wide" style={{ color: GOLD }}>Amount (RWF)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
              <td className="py-2.5" style={{ color: '#475569' }}>{row.label}</td>
              <td className="py-2.5 text-right font-semibold" style={{ color: NAVY }}>{row.amount}</td>
            </tr>
          ))}
          <tr>
            <td
              colSpan={2}
              className="pt-3 pb-1"
              style={{ borderTop: `1px dashed ${BORDER}` }}
            />
          </tr>
          <tr>
            <td className="py-2 font-black uppercase text-[10px] tracking-wide" style={{ color: NAVY }}>{totalLabel}</td>
            <td className="py-2 text-right font-black" style={{ color: GOLD }}>{totalValue}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function TimelineStep({ icon: Icon, label, date, isLast }) {
  return (
    <div className="flex flex-col items-center flex-1 relative">
      {!isLast && (
        <div
          className="absolute top-5 left-1/2 w-full h-px"
          style={{ borderTop: `1px dashed ${BORDER}`, zIndex: 0 }}
        />
      )}
      <div
        className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center mb-2"
        style={{ border: `2px solid ${GOLD}`, background: '#fff' }}
      >
        <Icon size={16} style={{ color: GOLD }} strokeWidth={2.2} />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: NAVY }}>{label}</p>
      <p className="text-[9px] mt-0.5 text-center" style={{ color: '#94A3B8' }}>{date}</p>
    </div>
  );
}

const ModernPayslipDocument = forwardRef(function ModernPayslipDocument({ data }, ref) {
  if (!data) return null;

  const { school, meta, employee, summary, earnings, deductions, employer, fmtPlain } = data;
  const fmt = fmtPlain || data.fmt;

  const earningRows = earnings.map((e) => ({
    label: e.desc.replace(/—.*/, '').trim(),
    amount: fmt(e.amount),
  }));

  const deductionRows = [
    ...deductions.map((d) => ({
      label: shortDeductionLabel(d.desc),
      amount: fmt(d.amount),
    })),
    ...(summary.cbhi > 0 ? [{ label: 'Mutuelle (CBHI)', amount: fmt(summary.cbhi) }] : []),
  ];

  const employerBoxes = employer.map((e) => ({
    label: shortEmployerLabel(e.desc),
    amount: fmt(e.amount),
  }));

  const contactLines = [
    school.address && `Address: ${school.address}`,
    school.tin && `TIN: ${school.tin}`,
    school.phone && `Contact: ${school.phone}`,
    school.email && `Email: ${school.email}`,
    school.website && `Website: ${school.website}`,
  ].filter(Boolean);

  return (
    <div
      ref={ref}
      id="modern-payslip-document"
      className="bg-white font-sans"
      style={{
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        maxWidth: '820px',
        margin: '0 auto',
        color: NAVY,
        padding: '32px 36px',
        lineHeight: 1.4,
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-6 pb-5" style={{ borderBottom: `2px solid ${NAVY}` }}>
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: school.logoUrl ? '#fff' : NAVY, border: school.logoUrl ? `1px solid ${BORDER}` : 'none' }}
          >
            {school.logoUrl ? (
              <img src={school.logoUrl} alt="" className="w-full h-full object-contain p-1" crossOrigin="anonymous" />
            ) : (
              <BookOpen size={22} style={{ color: GOLD }} strokeWidth={2.2} />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-black text-lg leading-tight" style={{ color: NAVY }}>{school.name}</h2>
            {contactLines.length > 0 ? (
              <div className="mt-1.5 space-y-0.5">
                {contactLines.map((line) => (
                  <p key={line} className="text-[10px]" style={{ color: '#64748B' }}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-[10px] mt-1" style={{ color: '#64748B' }}>{school.tagline}</p>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <h1 className="font-black text-2xl tracking-tight uppercase" style={{ color: NAVY }}>Payslip</h1>
          <div className="w-16 h-0.5 ml-auto mt-1 mb-3" style={{ background: GOLD }} />
          <div className="space-y-1 text-[10px]">
            {[
              ['Payslip ID', meta.payslipNo],
              ['Payroll Period', meta.payrollPeriod],
              ['Payment Date', meta.paymentDate],
              ['Payment Method', meta.paymentMethod],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-end gap-2">
                <span style={{ color: '#64748B' }}>{label}:</span>
                <span className="font-bold" style={{ color: NAVY }}>{value}</span>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-0.5">
              <span style={{ color: '#64748B' }}>Status:</span>
              <span className="font-black uppercase" style={{ color: GOLD }}>{meta.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Net Salary Highlight ── */}
      <div
        className="flex items-center justify-between py-5 my-5"
        style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: NAVY }}>Net Salary</span>
          <span className="font-black text-3xl" style={{ color: GOLD }}>{fmt(summary.net)}</span>
          <span className="text-sm font-bold" style={{ color: NAVY }}>RWF</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Paid on</p>
          <p className="text-sm font-bold" style={{ color: GOLD }}>{meta.paymentDate}</p>
        </div>
      </div>

      {/* ── Employee Information ── */}
      <div className="mb-6">
        <h3 className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: NAVY }}>
          Employee Information
        </h3>
        <div className="grid grid-cols-3 gap-x-6 gap-y-3">
          <InfoCell label="Employee Name" value={employee.name} />
          <InfoCell label="Department" value={employee.department} />
          <InfoCell label="Tax Status" value={employee.taxStatus} />
          <InfoCell label="Position" value={employee.position} />
          <InfoCell label="Bank" value={employee.bank} />
          <InfoCell label="Employment Type" value={employee.employmentType} />
          <InfoCell label="Employee ID" value={employee.id} />
          <InfoCell label="Account No." value={employee.accountMasked} />
        </div>
      </div>

      {/* ── Earnings & Deductions ── */}
      <div
        className="flex gap-8 mb-6 pb-6"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <AmountTable
          title="Earnings"
          rows={earningRows}
          totalLabel="Total Earnings"
          totalValue={fmt(summary.gross)}
        />
        <AmountTable
          title="Deductions"
          rows={deductionRows}
          totalLabel="Total Deductions"
          totalValue={fmt(summary.totalDeductions + (summary.cbhi || 0))}
        />
      </div>

      {/* ── Employer Contributions ── */}
      <div className="mb-6">
        <h3 className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: NAVY }}>
          Employer Contributions
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {employerBoxes.slice(0, 4).map((box) => (
            <div
              key={box.label}
              className="rounded-lg px-3 py-3 text-center"
              style={{ border: `1px solid ${BORDER}`, background: '#FAFAFA' }}
            >
              <p className="text-[9px] font-semibold mb-1.5 leading-tight" style={{ color: '#64748B' }}>{box.label}</p>
              <p className="text-[11px] font-bold" style={{ color: NAVY }}>{box.amount}</p>
            </div>
          ))}
          <div
            className="rounded-lg px-3 py-3 text-center flex flex-col justify-center"
            style={{ border: `1px solid ${GOLD}`, background: '#FFFBEB' }}
          >
            <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: NAVY }}>Total Contributions</p>
            <p className="text-base font-black" style={{ color: GOLD }}>{fmt(summary.employerTotal)}</p>
          </div>
        </div>
      </div>

      {/* ── Summary Totals ── */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Gross Pay', value: fmt(summary.gross), highlight: false },
          { label: 'Total Deductions', value: fmt(summary.totalDeductions + (summary.cbhi || 0)), highlight: false },
          { label: 'Employer Contributions', value: fmt(summary.employerTotal), highlight: false },
          { label: 'Net Salary', value: fmt(summary.net), highlight: true },
        ].map(({ label, value, highlight }) => (
          <div
            key={label}
            className="rounded-lg px-3 py-3 text-center"
            style={{
              border: `1px solid ${highlight ? GOLD : BORDER}`,
              background: highlight ? GOLD_LIGHT : '#FAFAFA',
            }}
          >
            <p className="text-[9px] font-bold uppercase tracking-wide mb-1.5" style={{ color: NAVY }}>{label}</p>
            <p className={`font-black ${highlight ? 'text-xl' : 'text-sm'}`} style={{ color: GOLD }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Payroll Process Timeline ── */}
      <div>
        <h3 className="text-[11px] font-black uppercase tracking-widest mb-4" style={{ color: NAVY }}>
          Payroll Process
        </h3>
        <div className="flex items-start px-4">
          <TimelineStep icon={FileText} label="Generated" date={meta.generatedAt} />
          <TimelineStep icon={UserCheck} label="Approved" date={meta.approvedAt} />
          <TimelineStep icon={CheckCircle2} label="Paid" date={meta.paidAt} isLast />
        </div>
      </div>
    </div>
  );
});

export default ModernPayslipDocument;
