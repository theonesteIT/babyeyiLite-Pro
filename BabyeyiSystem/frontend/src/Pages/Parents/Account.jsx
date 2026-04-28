// ================================================================
// Account.jsx — Babyeyi wallet / savings overview (placeholder balances)
// ================================================================

import { Link } from "react-router-dom";
import { Wallet, CalendarDays, Filter, Home as HomeIcon } from "lucide-react";

export default function Account() {
  return (
    <div className="space-y-6 pb-4 max-w-lg mx-auto">
      <div className="rounded-2xl bg-orange-500 px-4 py-4 flex items-center justify-between gap-3 text-white shadow-lg shadow-orange-500/20">
        <div className="flex items-center gap-3 min-w-0">
          <Wallet className="w-8 h-8 shrink-0 opacity-95" strokeWidth={2} />
          <div className="min-w-0">
            <h1 className="font-extrabold text-lg leading-tight">My Babyeyi Account</h1>
            <p className="text-white/85 text-xs sm:text-sm">Manage your savings &amp; transactions</p>
          </div>
        </div>
        <Link
          to="/parents/home"
          className="shrink-0 w-11 h-11 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors border border-white/30"
          aria-label="Home"
        >
          <HomeIcon size={20} />
        </Link>
      </div>

      <div className="rounded-3xl bg-gradient-to-r from-orange-600 to-orange-400 p-6 sm:p-8 text-white shadow-xl">
        <p className="text-white/85 text-sm font-medium">Available balance</p>
        <p className="text-3xl sm:text-4xl font-extrabold mt-2 tracking-tight">11,500 RWF</p>
        <div className="flex flex-wrap gap-3 mt-8">
          <button
            type="button"
            className="px-5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 font-bold text-sm border border-white/30 transition-colors"
          >
            + Add funds
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 font-bold text-sm border border-white/30 transition-colors"
          >
            <CalendarDays size={18} />
            All history
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Recent transactions</h2>
          <button type="button" className="p-2 rounded-lg text-slate-400 hover:bg-slate-50" aria-label="Filter">
            <Filter size={18} />
          </button>
        </div>
        <div className="py-14 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-slate-400" />
          </div>
          <p className="font-bold text-slate-600">No transactions yet</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            Your transaction history will appear here when you add funds or make payments.
          </p>
        </div>
      </div>
    </div>
  );
}
