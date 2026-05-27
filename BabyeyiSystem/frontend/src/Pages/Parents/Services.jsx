// ================================================================
// Services.jsx — Parent service menu
// ================================================================

import { Link } from "react-router-dom";
import {
  ArrowRight,
  Home,
  BookOpen,
  ShieldCheck,
  School,
  ShoppingCart,
  CreditCard,
  ChevronRight,
  MapPin,
} from "lucide-react";

const services = [
  
  {
    icon: School,
    title: "ShuleKit",
    desc: "Purchase school materials and kits",
    href: "/parents/classkit?kit=shule",
  }, {
    icon: CreditCard,
    title: "ShuleCard",
    desc: "Order school shoes simply",
    href: "/parents/shulecard?service=shulecard",
  },
  {
    icon: ShieldCheck,
    title: "Shoes Vaucher",
    desc: "Order school shoes simply",
    href: "/parents/service-student-select?service=shoes",
  },
  {
    icon: School,
    title: "Uniforms",
    desc: "Official school uniforms",
    href: "/parents/service-student-select?service=uniform",
  },
  {
    icon: ShoppingCart,
    title: "Papeterie",
    desc: "Stationery and supplies shop",
    href: "/parents/shop",
  },
  {
    icon: MapPin,
    title: "Find Agent",
    desc: "Locate the closest public shop agent for your child",
    href: "/parents/find-agent",
  },
];

export default function Services() {
  return (
    <div className="pb-6 px-0">
      <div className="px-0 sm:px-6 pt-4 pb-5 text-slate-900">
        <div className="mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Tools & Services
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto px-0 sm:px-6 pb-6 space-y-4">
        {services.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.title}
              to={s.href}
              className="group block rounded-[28px] border border-slate-800/20 bg-slate-950/95 px-5 py-4 shadow-[0_18px_45px_-25px_rgba(15,23,42,0.8)] transition hover:border-amber-300/40 hover:bg-slate-900"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20">
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-semibold text-white">{s.title}</h2>
                  <p className="text-sm text-slate-400 mt-1">{s.desc}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center text-white">
                  <ChevronRight className="h-6 w-6" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
