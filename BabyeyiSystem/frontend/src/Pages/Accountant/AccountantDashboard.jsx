import { useState, useEffect, useCallback } from "react";
import { Users, TrendingUp, Banknote, Loader2, BarChart3 } from "lucide-react";
import { StudentsByClassBarChart, CollectionsTrendChart } from "./AccountantCharts";
import { formatMoney } from "./accountantUtils";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

export default function AccountantDashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/accountant/overview`, { credentials: "include" });
      const json = await res.json();
      if (json.success) setOverview(json.data);
      else setOverview(null);
    } catch {
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-black tracking-tight text-[#1A1200] sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          At-a-glance totals and charts — record fees on the Payment page.
        </p>
      </div>

      <div className="space-y-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#FDEAA0]/80 bg-white p-5 shadow-lg shadow-[#FDEAA0]/20 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(254,191,16,0.2)]">
                  <Users className="text-[#B88A00]" size={22} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-slate-500">Students</div>
                  <div className="text-2xl font-black text-[#1A1200]">{overview?.student_count ?? "—"}</div>
                </div>
              </div>
              <div className="rounded-2xl border border-[#FDEAA0]/80 bg-white p-5 shadow-lg shadow-[#FDEAA0]/20 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3CC]">
                  <TrendingUp className="text-[#7A5C00]" size={22} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-slate-500">Collected (30 days)</div>
                  <div className="text-2xl font-black text-[#1A1200]">
                    {formatMoney(overview?.last_30_days_total_paid)}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[#FDEAA0]/80 bg-white p-5 shadow-lg shadow-[#FDEAA0]/20 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFFBE8]">
                  <Banknote className="text-[#B88A00]" size={22} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-slate-500">Payments (30 days)</div>
                  <div className="text-2xl font-black text-[#1A1200]">
                    {overview?.last_30_days_payment_count ?? 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#FDEAA0]/80 bg-white/90 p-4 shadow-lg shadow-[#FDEAA0]/15 sm:p-5">
              <div className="mb-4 flex items-center gap-2 font-black text-[#1A1200]">
                <BarChart3 size={22} className="text-[#B88A00]" />
                Dashboard insights
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-[#FDEAA0]/60 bg-[#FFFBE8]/50 p-3 sm:p-4">
                  <StudentsByClassBarChart rows={overview?.students_by_class} />
                </div>
                <div className="rounded-xl border border-[#FDEAA0]/60 bg-[#FFFBE8]/50 p-3 sm:p-4">
                  <CollectionsTrendChart days={overview?.collections_last_14_days} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
