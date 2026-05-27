import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { axAgent } from "./agentApi";
import { ACCENT_SLATE, pageShell, pageCardPad } from "./agentTheme";
import AgentPageHeader from "./AgentPageHeader";

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
    <div className={`${pageShell} bg-white`}>
      <AgentPageHeader
        title="Services revenue"
        description="Service lines from the public Babyeyi services page. Amounts reflect collections in your coverage area."
      />
      {data?.note && (
        <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium -mt-2">
          {data.note}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((s) => (
          <article key={s.key} className={`${pageCardPad} hover:shadow-md hover:border-slate-300 transition-all`}>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-[#000435]">{s.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.description}</p>
                <p className="mt-3 text-xl font-bold text-[#000435] tabular-nums">
                  {Number(s.amount_rwf || 0).toLocaleString()} RWF
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
