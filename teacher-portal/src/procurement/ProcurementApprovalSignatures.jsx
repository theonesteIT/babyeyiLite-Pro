import { formatProcurementDate } from './procurementFormat';

/** Three-column approval block — matches PDF / other portal request documents. */
export default function ProcurementApprovalSignatures({
  requestedBy = '',
  reviewer = '',
  approver = '',
  requestDate = '',
  className = '',
}) {
  const cols = [
    { title: 'Requested By', name: requestedBy, date: requestDate },
    { title: 'Reviewed By (Accountant)', name: reviewer, date: '' },
    { title: 'Approved By (Manager)', name: approver, date: '' },
  ];

  return (
    <div className={`rounded-2xl border border-black/10 bg-white p-4 sm:p-5 ${className}`}>
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#000435]/50 mb-4">Approval</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-4">
        {cols.map((col) => (
          <div key={col.title} className="min-w-0">
            <p className="text-xs font-bold text-[#000435] border-b border-black/20 pb-2 mb-3 leading-snug">
              {col.title}
            </p>
            <div className="space-y-3 text-[11px] text-black/60">
              <p>
                Name:{' '}
                <span className="inline-block min-w-[7rem] border-b border-black/25 text-[#000435] font-medium align-bottom pb-0.5">
                  {col.name || '\u00A0'}
                </span>
              </p>
              <p>
                Signature:{' '}
                <span className="inline-block min-w-[7rem] border-b border-black/25 align-bottom pb-0.5">
                  {'\u00A0'}
                </span>
              </p>
              <p>
                Date:{' '}
                <span className="inline-block min-w-[7rem] border-b border-black/25 text-[#000435] align-bottom pb-0.5">
                  {col.date ? formatProcurementDate(col.date) : '\u00A0'}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
