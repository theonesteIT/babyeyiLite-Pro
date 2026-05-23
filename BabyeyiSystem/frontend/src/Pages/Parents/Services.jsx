// ================================================================
// Services.jsx — Our Services (Classkit, shoes, paid at school, …)
// ================================================================

import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Home,
  BookOpen,
  ShieldCheck,
  School,
  ShoppingCart,
} from "lucide-react";

const services = [
  {
    icon: BookOpen,
    title: "Classkit voucher",
    desc: "Get everything your child needs for school in one convenient package",
    bullets: ["Books, pens, pencils & more", "Flexible payment options", "Free school delivery"],
    bulletClass: "text-orange-600",
    href: "/parents/classkit",
    cta: "Order Classkit",
  },
  {
    icon: School,
    title: "ShuleKit",
    desc: "Same guided flow — resume and share links if you stop before checkout or payment.",
    bullets: ["Same steps as ClassKit · branded ShuleKit", "WhatsApp‑friendly resume link", "Pick up after payment anytime"],
    bulletClass: "text-teal-600",
    href: "/parents/classkit?kit=shule",
    cta: "Order ShuleKit",
  },
  {
    icon: ShieldCheck,
    title: "School shoes",
    desc: "Quality school shoes with AI-powered size finder for the perfect fit",
    bullets: ["AI-powered size finder", "Durable & comfortable", "Affordable pricing"],
    bulletClass: "text-sky-600",
    href: "/parents/service-student-select?service=shoes",
    cta: "Order shoes voucher",
  },
  {
    icon: School,
    title: "Uniform voucher",
    desc: "Request school uniform items with parent student-first flow and guided checkout.",
    bullets: ["Choose your linked student", "Uniform items by type", "Delivery and payment steps"],
    bulletClass: "text-emerald-600",
    href: "/parents/service-student-select?service=uniform",
    cta: "Order uniform voucher",
  },
  {
    icon: ShoppingCart,
    title: "Scholist materials",
    desc: "Browse and shop for scholastic materials and school supplies",
    bullets: ["Wide variety of products", "Competitive prices", "Home or school delivery"],
    bulletClass: "text-purple-600",
    href: "/parents/shop",
    cta: "Open shop",
  },
];

export default function Services() {
  return (
    <div className="pb-6 px-0">
      <div
        className="px-4 sm:px-6 pt-2 pb-8 text-white"
      >
        <div className="mx-auto flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Our Services</h1>
              <p className="text-slate-900 text-sm mt-1 leading-snug">
                Browse all available services to help prepare your child for school.
              </p>
            </div>
          </div>
          <Link
            to="/parents/home"
            className="shrink-0 p-2.5 rounded-full border border-white/40 text-white hover:bg-white/10"
            aria-label="Home"
          >
            <Home size={22} />
          </Link>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 -mt-2 space-y-5 pt-4">
        {services.map((s) => {
          const Icon = s.icon;
          const CardInner = (
            <>
              <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shrink-0 shadow-md">
                <Icon className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-extrabold text-slate-900">{s.title}</h2>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{s.desc}</p>
                <ul className="mt-4 space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <span className={`font-bold ${s.bulletClass} shrink-0`}>•</span>
                      <span className="text-slate-700">{b}</span>
                    </li>
                  ))}
                </ul>
                {s.href && s.href !== "#" && !s.disabled && (
                  <div className="mt-5">
                    <Link
                      to={s.href}
                      className="inline-flex items-center justify-center rounded-xl bg-orange-500 text-white font-bold text-sm px-5 py-2.5 hover:bg-orange-600 transition-colors"
                    >
                      {s.cta || "Open"}
                    </Link>
                  </div>
                )}
                {s.disabled && (
                  <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-wide">Coming soon</p>
                )}
              </div>
            </>
          );
          return (
            <div
              key={s.title}
              className="rounded-2xl bg-white border border-slate-100 shadow-lg shadow-slate-200/50 p-5 sm:p-6 flex flex-col sm:flex-row gap-4"
            >
              {CardInner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
