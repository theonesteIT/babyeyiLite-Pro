import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Banknote, Clock, ArrowRight, Loader2, TrendingUp } from "lucide-react";
import { axAgent } from "./agentApi";
import { ACCENT_SLATE, cardBorder } from "./agentTheme";

export default function AgentDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    axAgent
      .get("/summary")
      .then((r) => {
        if (!cancelled && r.data.success) setData(r.data.data);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.response?.data?.message || "Could not load summary");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: ACCENT_SLATE }} />
      </div>
    );
  }

  if (err) {
    return <div className="rounded-2xl border-2 border-red-200 bg-red-50 text-red-800 text-sm font-semibold p-4">{err}</div>;
  }

  const cards = [
    {
      label: "Schools in your area",
      value: data?.schools_in_coverage ?? 0,
      sub: "Active registrations matching your sectors",
      icon: Building2,
      to: "/agent/schools",
      tone: "from-[#000435] to-[#0c1a3a]",
    },
    {
      label: "Total collected (Babyeyi)",
      value: `${Number(data?.total_collected_rwf || 0).toLocaleString()} RWF`,
      sub: `${data?.paid_transactions ?? 0} confirmed payment(s)`,
      icon: Banknote,
      to: "/agent/school-fees",
      tone: "from-[#F59E0B] to-[#FBBF24]",
    },
    {
      label: "Pending / not finalised",
      value: `${Number(data?.pending_amount_rwf || 0).toLocaleString()} RWF`,
      sub: `${data?.pending_transactions ?? 0} intent(s) not PAID yet`,
      icon: Clock,
      to: "/agent/school-fees",
      tone: "from-[#F5B800] to-amber-600",
    },
  ];

  const assign = data?.assignment;
  const noCov = data?.no_coverage || !assign?.sectors?.length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#000435] tracking-tight">Overview</h2>
        <p className="text-sm text-amber-900/80 mt-1 max-w-2xl font-medium">
          Snapshot of schools and Babyeyi fee collections recorded for your assigned district and sectors.
        </p>
        {noCov ? (
          <div className="mt-3 rounded-2xl border-2 border-amber-300 bg-amber-50 text-amber-950 text-sm font-semibold px-4 py-3 max-w-2xl">
            {data?.no_coverage
              ? "Your account has no field profile yet. Ask a Super Admin to register your district and sectors before data appears here."
              : "Your profile has no sectors assigned. Ask a Super Admin to select at least one sector in your district."}
          </div>
        ) : assign ? (
          <p className="text-xs text-amber-800 font-bold mt-2">
            Coverage: {assign.province} · {assign.district}
            {assign.all_sectors
              ? " · all sectors in this district"
              : ` · ${(assign.sectors || []).slice(0, 6).join(", ")}${(assign.sectors || []).length > 6 ? "…" : ""}`}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className={`group relative overflow-hidden rounded-3xl p-5 sm:p-6 text-white bg-gradient-to-br ${c.tone} shadow-xl shadow-amber-900/15 min-h-[140px] flex flex-col justify-between`}
          >
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-sm">
                <c.icon className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="relative mt-4">
              <p className="text-2xl sm:text-3xl font-black tabular-nums leading-tight">{c.value}</p>
              <p className="text-sm font-bold text-white/90 mt-1">{c.label}</p>
              <p className="text-[11px] text-white/75 mt-1 leading-snug">{c.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className={`rounded-3xl ${cardBorder} bg-white p-5 sm:p-6 shadow-md shadow-amber-900/5`}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-amber-600" />
          <h3 className="font-black text-[#111827]">Quick actions</h3>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <Link
            to="/agent/schools"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950 min-h-[44px] hover:bg-amber-100 transition-colors"
          >
            Filter schools <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/agent/services"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#1F2937]/20 bg-[#1F2937] px-4 py-3 text-sm font-bold text-amber-100 min-h-[44px] hover:bg-[#111827] transition-colors"
          >
            Service revenue breakdown <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/agent/reports"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-[#F5B800] to-amber-500 px-4 py-3 text-sm font-bold text-white min-h-[44px] shadow-md shadow-amber-200/50 hover:opacity-95 transition-opacity"
          >
            Monthly reports <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/agent/support-requests"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-amber-200 bg-white px-4 py-3 text-sm font-bold text-amber-900 min-h-[44px] hover:bg-amber-50 transition-colors"
          >
            Support requests <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/agent/shop-products"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-amber-200 bg-white px-4 py-3 text-sm font-bold text-amber-900 min-h-[44px] hover:bg-amber-50 transition-colors"
          >
            Shop products <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/agent/shop-orders"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-amber-200 bg-white px-4 py-3 text-sm font-bold text-amber-900 min-h-[44px] hover:bg-amber-50 transition-colors"
          >
            Shop orders <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
