export default function FeePaymentBreakdown({ lines = [], totalLabel = "TOTAL", totalRwf = 0 }) {
  if (!lines.length) return null;
  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-[#000435]">
        <p className="text-[11px] font-black uppercase tracking-[.12em] text-[#000435]">
          Fee Payment Breakdown
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b-2 border-[#000435] text-[10px] font-black uppercase tracking-wider text-gray-500">
              <th className="text-left px-4 py-2 w-10">#</th>
              <th className="text-left px-2 py-2">Payment Item</th>
              <th className="text-right px-4 py-2 whitespace-nowrap">Amount (RWF)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={`${line.label}-${i}`} className="border-b border-gray-100">
                <td className="px-4 py-2.5 text-gray-400 font-bold">{i + 1}</td>
                <td className="px-2 py-2.5 font-semibold text-[#000435]">{line.label}</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-[#000435]">
                  {Number(line.amount || 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#000435]">
              <td colSpan={2} className="px-4 py-3 font-black text-[#000435] uppercase text-[12px]">
                {totalLabel}
              </td>
              <td className="px-4 py-3 text-right font-black font-mono text-[#000435] text-[15px]">
                RWF {Number(totalRwf || 0).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
