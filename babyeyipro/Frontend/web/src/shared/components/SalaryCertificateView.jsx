import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Printer, ShieldCheck, Loader2 } from 'lucide-react';
import {
  buildSalaryCertificateData,
  buildCertificateEarningRows,
  formatCertificateDate,
  formatCertMoney,
} from '../payroll/salaryCertificateData';
import { downloadSalaryCertificatePdf } from '../payroll/salaryCertificatePdf';
import {
  loadSalaryCertificateContext,
  mergeEmployeeWithPayrollSetup,
} from '../payroll/salaryCertificateLoader';

function InfoLines({ rows }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-wrap gap-x-2 gap-y-0.5">
          <dt className="text-slate-500 shrink-0">{label}</dt>
          <dd className="text-[#000435] font-medium">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function SalaryCertificateView({
  employee,
  orgOverride,
  compact = false,
  showActions = true,
  className = '',
}) {
  const [context, setContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const certRef = useRef(null);

  const staffUserId = employee?.id || employee?.user_id || employee?.staffUserId;

  useEffect(() => {
    let cancelled = false;
    setLoadingContext(true);
    loadSalaryCertificateContext(staffUserId)
      .then((ctx) => {
        if (!cancelled) setContext(ctx);
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false);
      });
    return () => { cancelled = true; };
  }, [staffUserId]);

  const payrollEmployee = useMemo(() => {
    if (!employee) return null;
    return mergeEmployeeWithPayrollSetup(employee, context?.employeePayroll);
  }, [employee, context?.employeePayroll]);

  const cert = useMemo(() => {
    if (!payrollEmployee) return null;
    return buildSalaryCertificateData(payrollEmployee, {
      org: { ...(context?.org || {}), ...(orgOverride || {}) },
      preparedBy: context?.preparedBy,
      statutory: context?.statutory,
      payeRates: context?.payeRates,
      allowanceRules: context?.allowanceRules,
      customDeductions: context?.customDeductions || [],
      advances: context?.advances || [],
    });
  }, [payrollEmployee, context, orgOverride]);

  const qrUrl = cert
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(cert.verifyUrl)}`
    : '';

  const handlePrint = () => {
    window.print();
  };

  const handlePdf = async () => {
    const root = certRef.current?.querySelector('[data-salary-certificate]') || certRef.current;
    if (!root) return;
    setPdfBusy(true);
    try {
      const safeName = String(cert.employee?.name || 'employee').replace(/[^\w\-]+/g, '_');
      await downloadSalaryCertificatePdf(root, `salary-certificate-${safeName}.pdf`);
    } catch (err) {
      window.alert(err?.message || 'Failed to export PDF.');
    } finally {
      setPdfBusy(false);
    }
  };

  if (!employee) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-500">
        No employee data for salary certificate.
      </div>
    );
  }

  if (loadingContext || !cert) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm text-slate-500">
        <Loader2 size={22} className="animate-spin mx-auto mb-2 text-[#F59E0B]" />
        Loading salary certificate…
      </div>
    );
  }

  const employeeRows = [
    ['Employee Name', cert.employee.name],
    ['Employee ID', cert.employee.id],
    ['Position / Designation', cert.employee.position],
    ['Department', cert.employee.department],
    ['Employment Type', cert.employee.employmentType],
    ['Date of Employment', formatCertificateDate(cert.employee.hireDate)],
  ];

  return (
    <div className={`salary-certificate-root ${className}`} ref={certRef}>
      {showActions ? (
        <div className="flex flex-wrap gap-2 mb-4 print:hidden">
          <button
            type="button"
            onClick={handlePdf}
            disabled={pdfBusy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#000435] text-white text-sm font-semibold hover:bg-[#000435]/90 disabled:opacity-60"
          >
            <Download size={16} className="text-[#FFC107]" />
            {pdfBusy ? 'Exporting…' : 'Download PDF'}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Printer size={16} />
            Print
          </button>
        </div>
      ) : null}

      <div
        data-salary-certificate
        className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden cert-document ${compact ? 'text-[11px]' : ''}`}
      >
        {/* Header — logo + school + title only (no employee photo) */}
        <div className="cert-header bg-[#000435] px-5 sm:px-6 pt-5 pb-4 relative">
          <div className="h-1 bg-[#FFC107] absolute bottom-0 left-0 right-0" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {cert.org.logoUrl ? (
                <img
                  src={cert.org.logoUrl}
                  alt=""
                  className="cert-logo w-16 h-16 rounded-xl object-contain bg-white p-1.5 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[#FFC107] text-xs font-bold shrink-0">
                  LOGO
                </div>
              )}
              <div className="min-w-0">
                <p className="text-white/70 text-[10px] uppercase tracking-[0.2em]">Empowering Education</p>
                <p className="text-white font-bold text-lg sm:text-xl leading-tight">{cert.org.name}</p>
              </div>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <h2 className="text-white font-black text-xl sm:text-2xl tracking-wide leading-none">
                SALARY CERTIFICATE
              </h2>
             
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] border border-white/15">
              Ref: <strong className="text-[#FFC107]">{cert.referenceNo}</strong>
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] border border-white/15">
              Date: <strong>{formatCertificateDate(cert.issueDate)}</strong>
            </span>
          </div>
        </div>

        <div className="cert-body p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <section className="cert-section">
                <h3 className="text-xs font-bold text-[#000435] uppercase tracking-wide mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-[#FFC107] rounded-full shrink-0" />
                  Employee Information
                </h3>
                <InfoLines rows={employeeRows} />
              </section>

              <section className="cert-section">
                <h3 className="text-xs font-bold text-[#000435] uppercase tracking-wide mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-[#FFC107] rounded-full shrink-0" />
                  Salary Details
                </h3>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">{cert.certificationText}</p>
                <div className="rounded-lg border border-slate-100 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#000435] text-white">
                        <th className="text-left px-3 py-2 font-semibold">Description</th>
                        <th className="text-right px-3 py-2 font-semibold">Amount (RWF)</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {buildCertificateEarningRows(cert.salary).map(([label, amt]) => (
                        <tr
                          key={label}
                          className={label === 'Gross Salary' ? 'bg-[#FFC107] text-[#000435] font-bold' : 'border-b border-slate-50'}
                        >
                          <td className="px-3 py-1.5">{label}</td>
                          <td className={`px-3 py-1.5 text-right tabular-nums ${label === 'Gross Salary' ? 'font-bold' : 'font-medium'}`}>
                            {formatCertMoney(amt).replace(' RWF', '')}
                          </td>
                        </tr>
                      ))}
                      {(cert.salary.deductionRows || []).map(([label, amt]) => (
                        <tr key={label} className="border-b border-slate-50 text-red-700/90">
                          <td className="px-3 py-1.5">{label}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                            −{formatCertMoney(amt).replace(' RWF', '')}
                          </td>
                        </tr>
                      ))}
                      {!(cert.salary.deductionRows || []).length && cert.salary.deductions > 0 ? (
                        <tr className="border-b border-slate-50">
                          <td className="px-3 py-1.5">Deductions</td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                            −{formatCertMoney(cert.salary.deductions).replace(' RWF', '')}
                          </td>
                        </tr>
                      ) : null}
                      <tr className="bg-[#000435] text-white font-bold">
                        <td className="px-3 py-2">Net Salary</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCertMoney(cert.salary.net).replace(' RWF', '')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="cert-section">
                <h3 className="text-xs font-bold text-[#000435] uppercase tracking-wide mb-1.5 flex items-center gap-2">
                  <span className="w-1 h-4 bg-[#FFC107] rounded-full shrink-0" />
                  Certification Statement
                </h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">{cert.footerNote}</p>
                
              </section>
            </div>

            <div className="space-y-3 cert-sidebar">
              <section className="cert-section">
                <h3 className="text-[10px] font-bold text-[#000435] uppercase tracking-wide mb-2">Employer Information</h3>
                <dl className="space-y-1.5 text-[11px]">
                  {[
                    ['Organization', cert.org.name],
                    ['Address', cert.org.address],
                    ['Telephone', cert.org.phone],
                    ['Email', cert.org.email],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-slate-400">{k}</dt>
                      <dd className="text-slate-700 font-medium">{v || '—'}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="cert-section cert-qr">
                <h3 className="text-[10px] font-bold text-[#000435] mb-2">Document Verification</h3>
                <div className="flex items-center gap-3">
                  <img
                    src={qrUrl}
                    alt="Verification QR"
                    className="w-[72px] h-[72px] rounded border border-slate-100 bg-white p-0.5 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 leading-snug">Scan to verify authenticity.</p>
                    <p className="text-[10px] font-mono font-bold text-[#000435] mt-1 break-all">{cert.verificationCode}</p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="cert-signatures grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div>
              <p className="text-[10px] font-bold text-[#000435] uppercase tracking-wide mb-2">Prepared By</p>
              <p className="text-[11px] text-slate-600">
                <span className="text-slate-400">Name:</span>{' '}
                <span className="font-semibold text-slate-800">{cert.preparedBy.name}</span>
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                <span className="text-slate-400">Position:</span>{' '}
                <span className="font-semibold text-slate-800">{cert.preparedBy.position}</span>
              </p>
              <div className="mt-3 pt-2 border-t border-slate-100">
                {cert.preparedBy.signatureUrl ? (
                  <img
                    src={cert.preparedBy.signatureUrl}
                    alt="Accountant signature"
                    className="h-10 max-w-[160px] object-contain"
                  />
                ) : (
                  <p className="text-[11px] text-slate-400">Signature: ____________________</p>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-1">Date: {formatCertificateDate(cert.issueDate)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#000435] uppercase tracking-wide mb-2">Authorized Signature</p>
              <p className="text-[11px] text-slate-600">
                <span className="text-slate-400">Name:</span>{' '}
                <span className="font-semibold text-slate-800">{cert.authorizedBy.name}</span>
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                <span className="text-slate-400">Position:</span>{' '}
                <span className="font-semibold text-slate-800">{cert.authorizedBy.position}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-6 pt-2 border-t border-slate-100">Signature &amp; Stamp</p>
              <p className="text-[11px] text-slate-600 mt-1">Date: {formatCertificateDate(cert.issueDate)}</p>
            </div>
          </div>
        </div>

        <div className="cert-footer bg-[#000435] px-4 py-2 text-center">
          <p className="text-[9px] text-white/80">
            Computer-generated certificate · For verification contact {cert.org.email || cert.org.name}
          </p>
        </div>
      </div>
    </div>
  );
}
