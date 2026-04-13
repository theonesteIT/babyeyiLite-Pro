import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { axAgent } from "./agentApi";
import { ACCENT_SLATE, cardBorder } from "./agentTheme";

export default function AgentServicesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axAgent
      .get("/services/revenue")
      .then((r) => {
        if (r.data.success) setData(r.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: ACCENT_SLATE }} />
      </div>
    );
  }

  const services = data?.services || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[#111827]">Services revenue</h2>
        <p className="text-sm text-amber-900/80 mt-1 max-w-3xl font-medium">
          Same service lines as the public Babyeyi services page. Amounts reflect recorded collections in your area where the
          system tracks them.
        </p>
        {data?.note && (
          <p className="text-xs text-amber-950 bg-amber-50 border-2 border-amber-200 rounded-xl px-3 py-2.5 mt-3 font-semibold">
            {data.note}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((s) => (
          <article
            key={s.key}
            className={`rounded-3xl ${cardBorder} bg-white p-5 shadow-md shadow-amber-900/5 hover:shadow-lg hover:border-amber-200 transition-all`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#1F2937] to-[#111827] border border-amber-200/50">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-[#111827]">{s.title}</h3>
                <p className="text-xs text-amber-900/75 mt-1 leading-relaxed font-medium">{s.description}</p>
                <p className="mt-3 text-xl font-black text-amber-700 tabular-nums">{Number(s.amount_rwf || 0).toLocaleString()} RWF</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
