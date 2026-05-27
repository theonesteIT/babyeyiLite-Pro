// ================================================================
// Home.jsx — Parent dashboard home (children, assistants, quick actions)
// ================================================================

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  MapPin,
  Hash,
  ChevronRight,
  Plus,
  Bot,
  Headphones,
  Wallet,
  CreditCard,
  MapPinned,
  Ticket,
  Package,
  Sparkles,
  LayoutGrid,
  ClipboardList,
  RefreshCw,
  Sun,
  ArrowUpRight,
  ShieldCheck,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import AddChildModal from "../../components/Parents/AddChildModal";
import { useMergedParentChildren } from "../../hooks/useMergedParentChildren";
import { normalizeChildForUi } from "../../utils/parentLocalChildren";
import { useAuth } from "../../context/AuthContext";

function firstNameFromDisplay(fullName) {
  if (!fullName || typeof fullName !== "string") return "";
  const part = fullName.split("&")[0].trim();
  return part.split(/\s+/)[0] || "";
}

function greetingForTime() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function SectionHeading({ title, subtitle, action, onClick }) {
  const clickable = Boolean(onClick);
  return (
    <div
      className={
        "flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4" +
        (clickable ? " cursor-pointer" : "")
      }
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <span
            className="h-1 w-10 shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 shadow-sm shadow-orange-500/30"
            aria-hidden
          />
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-slate-500 max-w-3xl">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {action ? <div className="shrink-0 sm:ml-4">{action}</div> : null}
    </div>
  );
}

function ChildrenSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex gap-3 p-4 rounded-2xl border border-slate-100 bg-white shadow-sm animate-pulse"
        >
          <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-2.5 pt-0.5 min-w-0">
            <div className="h-4 bg-slate-200 rounded-lg w-[40%] max-w-[12rem]" />
            <div className="h-3 bg-slate-100 rounded-lg w-[70%]" />
            <div className="h-3 bg-slate-100 rounded-lg w-[50%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

const quickActions = [
  {
    to: "/parents/orders",
    title: "Order history",
    desc: "Classkit and demo orders on this device",
    icon: ClipboardList,
  },
  {
    to: "/parents/services",
    title: "Services",
    desc: "Classkit, shoes, paid at school & more",
    icon: LayoutGrid,
  },
  {
    to: "/parents/shulecard",
    title: "Shulecard",
    desc: "The student pocket money card",
    icon: CreditCard,
  },
  {
    to: "/parents/shop",
    title: "Shule Papietrie",
    desc: "Stationery & learning materials",
    icon: Package,
  },
  {
    to: "/schools",
    title: "Find a school",
    desc: "Browse schools near you",
    icon: MapPinned,
    external: false,
  },
  {
    to: "#",
    title: "Vouchers & offers",
    desc: "Coming soon",
    icon: Ticket,
    disabled: true,
  },
  {
    to: "#",
    title: "Deliveries",
    desc: "Track orders",
    icon: Package,
    disabled: true,
  },
];

export default function Home() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const [addOpen, setAddOpen] = useState(false);
  const [hasPublicDraft, setHasPublicDraft] = useState(false);

  const {
    merged: children,
    loading,
    error,
    refreshLocal,
    refreshApi,
  } = useMergedParentChildren();

  useEffect(() => {
    if (searchParams.get("addStudent") !== "1") return;
    const openAndRedirect = () => {
      setAddOpen(true);
      navigate("/parents/home", { replace: true });
    };
    openAndRedirect();
  }, [searchParams, navigate]);

  const displayName =
    auth.user?.full_name ||
    [auth.user?.first_name, auth.user?.last_name].filter(Boolean).join(" ") ||
    "Parent";
  const first = firstNameFromDisplay(displayName) || "there";

  const filtered = useMemo(() => {
    if (!q) return children;
    return children.filter((c) => {
      const uid = (c.student_uid || "").toLowerCase();
      const name = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
      const sc = (c.student_code || "").toLowerCase();
      const sdm = (c.sdm_code || "").toLowerCase();
      return (
        uid.includes(q) || name.includes(q) || sc.includes(q) || sdm.includes(q)
      );
    });
  }, [children, q]);

  useEffect(() => {
    const loadDraftFlag = () => {
      try {
        const raw = sessionStorage.getItem("babyeyi_public_pay_draft");
        if (!raw) {
          setHasPublicDraft(false);
          return;
        }
        const parsed = JSON.parse(raw);
        setHasPublicDraft(!!parsed?.fromPublicFinder);
      } catch {
        setHasPublicDraft(false);
      }
    };
    loadDraftFlag();
  }, []);

  return (
    <div className="space-y-8 pb-4 text-slate-900 dark:text-slate-100">
      <AddChildModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={refreshLocal}
        onLinked={refreshApi}
      />

      {auth.user?.phone_only_registration_required && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-amber-900">
                Complete your registration
              </p>
              <p className="text-sm text-amber-800 mt-1">
                Set a password on the login page to finish securing your account
                (you are redirected there automatically when needed).
              </p>
            </div>
            <Link
              to="/parents/login"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 transition-colors"
            >
              Set password
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      )}

      {hasPublicDraft && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-emerald-900">
                Continue Your Public Payment Draft
              </p>
              <p className="text-xs text-emerald-800 mt-0.5">
                Resume in one tap and select your student to continue payment.
              </p>
            </div>
            <Link
              to="/parents/quick-pay"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
            >
              Continue
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* Welcome */}
      <section className="relative overflow-hidden rounded-3xl p-4 ">
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="min-w-0">
            <h1 className="mt-2 text-2xl text-center sm:text-left sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {greetingForTime()}, {first}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2.5 lg:flex-col xl:flex-row lg:items-stretch">
            <Link
              to="/parents/services"
              className="inline-flex  w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/25 hover:brightness-105 active:scale-[0.99] transition-all"
            >
              Explore services
              <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </section>

      {/* Personal assistants */}
      <section>
        <SectionHeading
          title="Personal assistants"
          subtitle="Optional AI and human support — more skills coming soon."
          onClick={() => navigate("/parents/find-agent")}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => navigate("/parents/find-agent")}
            className="group flex items-center gap-4 rounded-[1.75rem] border border-slate-900/10 bg-slate-950 p-4 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.45)] text-left text-white transition hover:shadow-[0_25px_100px_-50px_rgba(15,23,42,0.5)]"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20">
              <Headphones className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-lg">Agent Assistance</p>
              <p className="mt-1 text-sm text-slate-300">
                Get quick help from a Babyeyi agent.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/parents/services")}
            className="group flex items-center gap-4 rounded-[1.75rem] border border-slate-900/10 bg-slate-950 p-4 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.45)] text-left text-white transition hover:shadow-[0_25px_100px_-50px_rgba(15,23,42,0.5)]"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20">
              <Bot className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-lg">Tools & Services</p>
              <p className="mt-1 text-sm text-slate-300">
                School support services & more.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>
        </div>
      </section>

      {/* My children */}
      <section>
        <SectionHeading
          title="My children"
          subtitle="All learners linked to your phone on school records, plus students you add with limited financial access and local profiles."
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-700"
              >
                <Plus size={18} strokeWidth={2.5} />
                Add student
              </button>
            </div>
          }
        />
        {q && (
          <p className="text-sm text-slate-500 mb-3">
            Showing matches for &quot;{searchParams.get("q")}&quot;
            {filtered.length === 0 && " — none found."}
          </p>
        )}

        {loading && <ChildrenSkeleton />}

        {!loading && error && (
          <p className="text-center text-red-600 text-sm py-8 rounded-2xl border border-red-100 bg-red-50">
            {error}
          </p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="relative text-center py-12 px-4 rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-orange-50/50 to-transparent pointer-events-none" />
            <p className="text-slate-800 font-bold text-lg">
              {children.length === 0 ? "No learners linked yet" : "No matches"}
            </p>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
              {children.length === 0
                ? "When a school registers a student with your phone as father or mother, they will show up here. You can also add a child to plan Classkit."
                : "Try another student code, SDM ID, or clear the search from the header."}
            </p>
            {children.length === 0 && (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white font-bold px-6 py-3 text-sm shadow-lg shadow-orange-500/20 hover:brightness-105 transition-all"
              >
                <Plus size={18} />
                Add student
              </button>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <ul className="space-y-3">
            {filtered.map((c) => {
              const u = normalizeChildForUi(c);
              return (
                <li key={c.id}>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white p-4 shadow-sm hover:shadow-md hover:border-orange-200/80 dark:hover:border-orange-700 transition-all duration-200">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-extrabold text-lg shrink-0 ring-2 ring-white shadow-md">
                      {(u.first_name || "?")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900 truncate">
                          {u.first_name} {u.last_name}
                        </p>
                        {c._local && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md">
                            Added by you
                          </span>
                        )}
                        {String(c.access_type || "").toUpperCase() ===
                          "LIMITED" && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            Limited access
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-500">
                        {u.school_name && (
                          <span className="inline-flex items-center gap-1">
                            <GraduationCap
                              size={12}
                              className="text-orange-500 shrink-0"
                            />
                            {u.school_name}
                          </span>
                        )}
                        {u.grade_label && (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                            Class {u.grade_label}
                          </span>
                        )}
                        {u.student_uid && (
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Hash size={12} />
                            {u.student_uid}
                          </span>
                        )}
                        {u.student_code && (
                          <span
                            className="inline-flex items-center gap-1 font-mono text-slate-600"
                            title="Official student code"
                          >
                            Code {u.student_code}
                          </span>
                        )}
                        {u.sdm_code && (
                          <span
                            className="inline-flex items-center gap-1 font-mono text-slate-600"
                            title="SDM ID"
                          >
                            SDM {u.sdm_code}
                          </span>
                        )}
                        {(u.district || u.province) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} />
                            {[u.district, u.province]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {/* Quick actions */}
      <section>
        <SectionHeading
          title="Quick actions"
          subtitle="Chat with school staff, payments, Classkit, and discovery."
        />
        <div className="space-y-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const inner = (
              <>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
                  <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    {action.title}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {action.desc}
                  </p>
                  {action.value ? (
                    <p className="text-sm font-bold text-orange-600 mt-1">
                      {action.value}
                    </p>
                  ) : null}
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </>
            );
            const className =
              "group w-full flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-600 shadow-sm p-4 transition-all hover:shadow-md hover:border-orange-100 dark:hover:border-orange-900/50";
            if (action.disabled) {
              return (
                <div
                  key={action.title}
                  className={`${className} opacity-60 cursor-not-allowed`}
                >
                  {inner}
                </div>
              );
            }
            if (action.to.startsWith("/")) {
              return (
                <Link key={action.title} to={action.to} className={className}>
                  {inner}
                </Link>
              );
            }
            return (
              <a key={action.title} href={action.to} className={className}>
                {inner}
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
