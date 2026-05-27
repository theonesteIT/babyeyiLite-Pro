import React from 'react';
import { AlertTriangle, Boxes, ChartNoAxesColumn, PackageCheck, Truck } from 'lucide-react';

const inventoryStats = [
  { label: 'Total SKUs', value: '492', icon: Boxes },
  { label: 'Low Stock', value: '17', icon: AlertTriangle },
  { label: 'Incoming Orders', value: '09', icon: Truck },
  { label: 'Verified Items', value: '468', icon: PackageCheck },
];

const rows = [
  { item: 'Science Lab Kits', qty: 14, status: 'Low' },
  { item: 'Classroom Chairs', qty: 128, status: 'Healthy' },
  { item: 'A4 Papers Boxes', qty: 36, status: 'Healthy' },
  { item: 'Sports Jerseys', qty: 9, status: 'Low' },
];

export default function StockInventory() {
  return (
    <div className="min-h-screen bg-re-bg px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <section className="rounded-3xl border border-black/5 bg-white p-6 sm:p-8 shadow-sm">
        <p className="text-[10px] uppercase tracking-[0.2em] text-re-orange font-semibold">Stock & inventory</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1E3A5F] mt-2">Store and Asset Control</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">
          Monitor school inventory levels, prioritize low-stock items, and maintain procurement visibility.
        </p>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {inventoryStats.map((card) => (
          <div key={card.label} className="rounded-2xl border border-black/5 bg-white p-4">
            <card.icon size={16} className="text-[#1E3A5F]" />
            <p className="mt-2 text-lg font-semibold text-[#1E3A5F]">{card.value}</p>
            <p className="text-[11px] text-slate-500 font-bold">{card.label}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <ChartNoAxesColumn size={16} className="text-[#1E3A5F]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#1E3A5F]">Inventory snapshot</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={row.item} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-800">{row.item}</p>
                <p className="text-xs text-slate-500">Available quantity: {row.qty}</p>
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                  row.status === 'Low'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
