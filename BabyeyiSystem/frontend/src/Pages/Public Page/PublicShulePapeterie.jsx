import { useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import papeterieHero from "../../assets/services/papaeterie.png";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brush,
  Calculator,
  Check,
  ChevronRight,
  GraduationCap,
  Home,
  Layers,
  Package,
  PenLine,
  Pencil,
  Ruler,
  School,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Truck,
  Eye,
  ShieldCheck,
  Clock,
  MapPin,
  Quote,
} from "lucide-react";

const NAVY = "#000435";
const MTN = "'MTN Brighter Sans', 'Trebuchet MS', 'Segoe UI', sans-serif";
const PAY_PATH = "/services/item/papeterie";

const CATEGORIES = [
  { id: "notebooks", title: "Notebooks", desc: "Counter books, ruled & plain — sizes for every class.", Icon: BookOpen },
  { id: "pens", title: "Pens & Pencils", desc: "Ballpoints, pencils, markers — classroom-ready packs.", Icon: PenLine },
  { id: "geometry", title: "Geometry Set", desc: "Compasses, set squares, protractors for maths & science.", Icon: Ruler },
  { id: "bags", title: "School Bag", desc: "Comfortable, durable bags sized for daily school use.", Icon: ShoppingBag },
  { id: "art", title: "Art Materials", desc: "Colours, brushes, craft paper for creative learning.", Icon: Brush },
  { id: "math", title: "Mathematics Tools", desc: "Calculators, rulers, maths sets for every level.", Icon: Calculator },
  { id: "exam", title: "Exam Materials", desc: "Approved sheets, pens, and essentials for assessments.", Icon: Pencil },
  { id: "textbooks", title: "Textbooks", desc: "Curriculum-aligned titles where available.", Icon: BookOpen },
  { id: "practical", title: "Practical Materials", desc: "Lab notebooks, folders, and project supplies.", Icon: Package },
];

const SCHOOLS_DEMO = ["Any school", "GS Kigali", "ES Musanze", "GS Huye"];

const PRODUCTS = [
  { id: "p1", name: "Counter Books", desc: "Durable covers, multiple subjects.", price: 8500, stock: 42, category: "notebooks", classLevel: "Primary", school: "Any school", bundle: false },
  { id: "p2", name: "100-page Notebook", desc: "Ruled A4, perforated pages.", price: 3200, stock: 120, category: "notebooks", classLevel: "All levels", school: "Any school", bundle: false },
  { id: "p3", name: "Blue Pen Pack", desc: "12 smooth-writing ballpoints.", price: 2500, stock: 88, category: "pens", classLevel: "All levels", school: "Any school", bundle: false },
  { id: "p4", name: "Geometry Set", desc: "Metal compass, set squares, protractor.", price: 12000, stock: 35, category: "geometry", classLevel: "O-Level", school: "Any school", bundle: false },
  { id: "p5", name: "School Bag", desc: "Padded straps, bottle pocket.", price: 45000, stock: 18, category: "bags", classLevel: "All levels", school: "Any school", bundle: false },
  { id: "p6", name: "Scientific Calculator", desc: "Exam-approved functions.", price: 28000, stock: 24, category: "math", classLevel: "Secondary", school: "Any school", bundle: false },
  { id: "p7", name: "Pencil Set", desc: "HB pencils, eraser caps included.", price: 4000, stock: 65, category: "pens", classLevel: "Primary", school: "Any school", bundle: false },
  { id: "p8", name: "Eraser & Sharpener Pack", desc: "Classroom essentials combo.", price: 1800, stock: 0, category: "pens", classLevel: "All levels", school: "Any school", bundle: false },
];

const BUNDLES = [
  { id: "b1", title: "Nursery Starter Pack", items: ["Crayons", "Safety scissors", "Glue stick", "Drawing book"], price: 18500, Icon: Sparkles },
  { id: "b2", title: "Primary Essentials Pack", items: ["Notebooks", "Pens", "Pencils", "Ruler", "Eraser"], price: 22000, Icon: BookOpen },
  { id: "b3", title: "Secondary Student Pack", items: ["Scientific calculator", "Geometry set", "Folders", "Blue/black pens"], price: 52000, Icon: GraduationCap },
  { id: "b4", title: "Exam Preparation Pack", items: ["Approved pens", "Clear pencil case", "Highlighter", "Sticky notes"], price: 15000, Icon: Pencil },
  { id: "b5", title: "Art Class Pack", items: ["Watercolours", "Brushes", "Sketch pad", "Oil pastels"], price: 34000, Icon: Brush },
];

const STEPS = [
  { n: 1, title: "Enter Student Code", desc: "Find student and school details automatically.", Icon: School },
  { n: 2, title: "Choose Materials", desc: "Select stationery or learning items needed.", Icon: ShoppingBag },
  { n: 3, title: "Choose Delivery", desc: "Deliver to school or at home.", Icon: Truck },
  { n: 4, title: "Pay Securely", desc: "Complete payment and track the order.", Icon: ShieldCheck },
];

const WHY = [
  { title: "Easy student-based ordering", desc: "One code pulls school, class, and context.", Icon: School },
  { title: "Quality school materials", desc: "Curated items suited for daily classroom use.", Icon: Star },
  { title: "Fast and safe delivery", desc: "Reliable handling to school or home.", Icon: Truck },
  { title: "Transparent prices", desc: "Clear pricing before you confirm checkout.", Icon: Check },
  { title: "School & home delivery", desc: "Pick what works for your family.", Icon: MapPin },
  { title: "Order tracking & receipts", desc: "Digital records for every purchase.", Icon: Clock },
];

const TESTIMONIALS = [
  { quote: "Ordering school materials has become very easy and fast.", author: "Parent, Kigali" },
  { quote: "Everything needed for the student is available in one place.", author: "Guardian, Southern Province" },
  { quote: "School delivery saves time for parents.", author: "PTA member" },
];

function formatFrw(n) {
  return `${Number(n).toLocaleString("en-RW")} Frw`;
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function PublicShulePapeterie() {
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const [studentCode, setStudentCode] = useState("");
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [priceMax, setPriceMax] = useState(100000);
  const [school, setSchool] = useState("Any school");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [bundleFilter, setBundleFilter] = useState("all");
  const [quick, setQuick] = useState(null);

  const filtered = useMemo(() => {
    return PRODUCTS.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.desc.toLowerCase().includes(search.toLowerCase())) return false;
      if (cat && p.category !== cat) return false;
      if (classLevel && p.classLevel !== classLevel && p.classLevel !== "All levels") return false;
      if (p.price > priceMax) return false;
      if (school !== "Any school" && p.school !== "Any school" && p.school !== school) return false;
      if (availableOnly && p.stock <= 0) return false;
      if (bundleFilter === "bundle" && !p.bundle) return false;
      if (bundleFilter === "single" && p.bundle) return false;
      return true;
    });
  }, [search, cat, classLevel, priceMax, school, availableOnly, bundleFilter]);

  const addCart = useCallback(() => setCartCount((c) => c + 1), []);

  const goPayWithCode = () => {
    const q = studentCode.trim() ? `?code=${encodeURIComponent(studentCode.trim())}` : "";
    navigate(`${PAY_PATH}${q}`);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800" style={{ fontFamily: MTN }}>
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b-4 border-amber-400 shadow-sm" style={{ background: NAVY }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/services"
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-bold text-amber-400 hover:bg-white/10 sm:px-4"
          >
            <ArrowLeft size={18} /> <span className="hidden sm:inline">Services</span>
          </Link>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:justify-end sm:gap-4">
            <span className="truncate text-center text-[11px] font-black uppercase tracking-widest text-white/90 sm:text-xs">
              Shule Papeterie
            </span>
            {cartCount > 0 && (
              <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-black text-[#000435]">{cartCount}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate(PAY_PATH)}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 text-sm font-black text-[#000435] hover:bg-amber-300 sm:px-4"
          >
            Pay <ChevronRight size={16} />
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ background: NAVY }}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl sm:h-96 sm:w-96" />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-12">
          <div className="relative z-10 min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5">
              <Store size={14} className="text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 sm:text-[11px]">School supply store</span>
            </div>
            <h1 className="text-3xl font-black leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-[2.65rem]">
              Shule Papeterie
            </h1>
            <p className="mt-2 text-lg font-semibold text-amber-400 sm:text-xl">Stationery and learning materials, fast and convenient</p>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
              Order school stationery and learning materials easily for your child. Choose from essential supplies, confirm student details, and complete your request in a few simple steps.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => scrollToId("featured-products")}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-[#000435] shadow-lg shadow-amber-400/20 hover:bg-amber-300"
              >
                Shop Now <ArrowRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => scrollToId("categories")}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-white/25 bg-white/5 px-5 py-3 text-sm font-bold text-white hover:border-amber-400/50 hover:bg-white/10"
              >
                Browse Materials
              </button>
            </div>
          </div>
          <div className="relative z-10">
            <div className="overflow-hidden rounded-3xl border-2 border-amber-400/40 bg-[#020740] shadow-2xl shadow-black/40">
              <img src={papeterieHero} alt="Stationery, notebooks, pens, and school supplies" className="h-[240px] w-full object-cover sm:h-[300px] lg:h-[340px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#000435]/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">Books &amp; pens</span>
                <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">Notebooks</span>
                <span className="rounded-lg bg-amber-400/90 px-3 py-1.5 text-xs font-black text-[#000435]">Trusted by families</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section id="categories" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-6 w-1 rounded-full bg-amber-400" />
              <h2 className="text-2xl font-black tracking-tight text-[#000435] sm:text-3xl">Featured categories</h2>
            </div>
            <p className="max-w-xl text-sm text-slate-600">Browse by type — each category is curated for school use.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map(({ id, title, desc, Icon }) => (
            <article
              key={id}
              className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-amber-400/60 hover:shadow-md"
            >
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border-2 border-amber-400/40 text-amber-500 transition group-hover:bg-amber-400/10"
                style={{ color: NAVY, background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(0,4,53,0.06))" }}
              >
                <Icon size={26} strokeWidth={1.75} className="text-[#000435]" />
              </div>
              <h3 className="text-lg font-black text-[#000435]">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{desc}</p>
              <button
                type="button"
                onClick={() => {
                  setCat(id);
                  scrollToId("filters");
                }}
                className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border-2 border-[#000435] bg-[#000435] text-sm font-black text-amber-400 hover:bg-[#000c6b]"
              >
                View Items <ChevronRight size={16} />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ── Featured products ── */}
      <section id="featured-products" className="border-y border-slate-100 bg-slate-50/80 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-6 w-1 rounded-full bg-amber-400" />
              <h2 className="text-2xl font-black text-[#000435] sm:text-3xl">Popular items</h2>
            </div>
            <p className="text-sm text-slate-600">Featured stationery — prices shown as examples; final amounts follow your student quote at checkout.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCTS.slice(0, 4).map((p) => (
              <article key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                <div className="flex h-36 items-center justify-center bg-gradient-to-br from-[#000435] to-[#0a1466]">
                  <Package className="text-amber-400/90" size={48} strokeWidth={1.2} />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-black text-[#000435]">{p.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{p.desc}</p>
                  <p className="mt-3 text-lg font-black text-amber-600">{formatFrw(p.price)}</p>
                  <p className={`text-xs font-bold ${p.stock > 0 ? "text-emerald-600" : "text-amber-700"}`}>
                    {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={p.stock <= 0}
                      onClick={() => p.stock > 0 && addCart()}
                      className="inline-flex min-h-[42px] flex-1 items-center justify-center rounded-xl bg-[#000435] text-xs font-black text-amber-400 hover:bg-[#000c6b] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Add to cart
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuick(p)}
                      className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1 rounded-xl border-2 border-slate-200 text-xs font-bold text-[#000435] hover:border-amber-400"
                    >
                      <Eye size={14} /> Quick view
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-black text-[#000435] sm:text-3xl">How it works</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">Four simple steps from student code to delivery.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ n, title, desc, Icon }) => (
            <div key={n} className="relative rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-[#000435]">{n}</div>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-[#000435] text-amber-400">
                <Icon size={26} strokeWidth={1.5} />
              </div>
              <h3 className="font-black text-[#000435]">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Student code ── */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-16">
        <div
          className="overflow-hidden rounded-3xl border-2 border-amber-400/50 shadow-xl"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0a1466 100%)` }}
        >
          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1">
                <Layers size={14} className="text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Student-first</span>
              </div>
              <h2 className="text-2xl font-black text-white sm:text-3xl">Order by Student Code</h2>
              <p className="mt-4 text-sm leading-relaxed text-white/70">
                Enter the student code and the system will automatically identify the student, school, class, and location to help you order the correct materials.
              </p>
              <p className="mt-4 flex items-start gap-2 text-sm font-semibold text-amber-300/95">
                <Sparkles size={18} className="mt-0.5 shrink-0" />
                Fast lookup — continue to secure payment in one flow.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-white/50">Student code / SDM ID</label>
              <input
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                placeholder="e.g. 040080001"
                className="mb-4 w-full rounded-xl border-2 border-white/20 bg-white px-4 py-3.5 text-[#000435] placeholder:text-slate-400 focus:border-amber-400 focus:outline-none min-h-[52px]"
              />
              <button
                type="button"
                onClick={goPayWithCode}
                className="w-full rounded-xl bg-amber-400 py-3.5 text-sm font-black text-[#000435] hover:bg-amber-300 min-h-[52px]"
              >
                Look up &amp; continue
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Promo banner ── */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-16">
        <div className="rounded-3xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 px-6 py-10 text-center shadow-lg sm:px-10 sm:py-12">
          <h2 className="text-2xl font-black leading-tight text-[#000435] sm:text-3xl">Everything your student needs in one place</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold text-[#000435]/80 sm:text-base">
            From notebooks to learning tools, order quickly and easily with school-based delivery support.
          </p>
          <button
            type="button"
            onClick={() => navigate(PAY_PATH)}
            className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#000435] px-8 py-3 text-sm font-black text-amber-400 hover:bg-[#000c6b]"
          >
            Start Order
          </button>
        </div>
      </section>

      {/* ── Filters + catalog ── */}
      <section id="filters" className="border-t border-slate-100 bg-slate-50/90 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-6 w-1 rounded-full bg-amber-400" />
              <h2 className="text-2xl font-black text-[#000435] sm:text-3xl">Find materials</h2>
            </div>
            <p className="text-sm text-slate-600">Filter the catalogue — search by name or narrow by class and availability.</p>
          </div>
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stationery by name…"
                className="w-full rounded-xl border-2 border-slate-200 py-3.5 pl-11 pr-4 text-[#000435] placeholder:text-slate-400 focus:border-amber-400 focus:outline-none min-h-[48px]"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm font-bold text-[#000435] min-h-[44px]">
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)} className="rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm font-bold min-h-[44px]">
                <option value="">All class levels</option>
                <option value="Nursery">Nursery</option>
                <option value="Primary">Primary</option>
                <option value="O-Level">O-Level</option>
                <option value="Secondary">Secondary</option>
                <option value="All levels">All levels</option>
              </select>
              <select value={school} onChange={(e) => setSchool(e.target.value)} className="rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm font-bold min-h-[44px]">
                {SCHOOLS_DEMO.map((s) => (
                  <option key={s} value={s}>{s === "Any school" ? "School (any)" : s}</option>
                ))}
              </select>
              <select value={bundleFilter} onChange={(e) => setBundleFilter(e.target.value)} className="rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm font-bold min-h-[44px]">
                <option value="all">Bundle or single</option>
                <option value="bundle">Bundles only</option>
                <option value="single">Single items</option>
              </select>
              <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                Max price ({formatFrw(priceMax)})
                <input type="range" min={2000} max={100000} step={1000} value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} className="w-full accent-amber-500" />
              </label>
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold text-[#000435]">
                <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} className="h-4 w-4 accent-amber-500" />
                In stock only
              </label>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((p) => (
              <article key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                  <ShoppingBag className="text-[#000435]/30" size={40} />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-black text-[#000435]">{p.name}</h3>
                  <p className="mt-1 text-xs text-slate-600">{p.desc}</p>
                  <p className="mt-2 font-black text-amber-600">{formatFrw(p.price)}</p>
                  <p className={`text-[11px] font-bold ${p.stock > 0 ? "text-emerald-600" : "text-red-600"}`}>{p.stock > 0 ? "Available" : "Unavailable"}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" disabled={p.stock <= 0} onClick={() => p.stock > 0 && addCart()} className="flex-1 rounded-lg bg-[#000435] py-2 text-xs font-black text-amber-400 disabled:opacity-40">
                      Add
                    </button>
                    <button type="button" onClick={() => setQuick(p)} className="rounded-lg border-2 border-slate-200 px-2 text-[#000435] hover:border-amber-400">
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="mt-8 text-center text-sm font-semibold text-slate-600">No items match your filters. Try clearing search or class level.</p>
          )}
        </div>
      </section>

      {/* ── Bundles ── */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mb-10">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-6 w-1 rounded-full bg-amber-400" />
            <h2 className="text-2xl font-black text-[#000435] sm:text-3xl">Ready-made bundles</h2>
          </div>
          <p className="text-sm text-slate-600">Save time with packs curated for each stage — ideal for parents at the start of term.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {BUNDLES.map((b) => (
            <article key={b.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-amber-400/60 hover:shadow-md">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#000435] text-amber-400">
                <b.Icon size={30} />
              </div>
              <h3 className="text-lg font-black text-[#000435]">{b.title}</h3>
              <ul className="mt-3 flex-1 space-y-1.5 text-sm text-slate-600">
                {b.items.map((it) => (
                  <li key={it} className="flex items-center gap-2">
                    <Check size={14} className="shrink-0 text-amber-500" /> {it}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xl font-black text-amber-600">{formatFrw(b.price)}</p>
              <button type="button" onClick={addCart} className="mt-4 rounded-xl bg-[#000435] py-3 text-sm font-black text-amber-400 hover:bg-[#000c6b] min-h-[44px]">
                Add bundle
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ── Delivery ── */}
      <section className="border-y border-slate-100 bg-slate-50/80 py-12 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <School className="mb-3 text-amber-500" size={28} />
              <h3 className="text-lg font-black text-[#000435]">Delivered to School</h3>
              <p className="mt-2 text-sm text-slate-600">Drop-off coordinated with the school — great when students board or parents prefer pickup at the gate.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <Home className="mb-3 text-amber-500" size={28} />
              <h3 className="text-lg font-black text-[#000435]">Delivered at Home</h3>
              <p className="mt-2 text-sm text-slate-600">Convenient home delivery when you need materials outside school hours.</p>
            </div>
          </div>
          <p className="mt-6 text-center text-sm font-semibold text-slate-600">Choose the most convenient delivery option during checkout.</p>
        </div>
      </section>

      {/* ── Why choose ── */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-black text-[#000435] sm:text-3xl">Why choose Shule Papeterie</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">Built for busy parents and focused students.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map(({ title, desc, Icon }) => (
            <div key={title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-[#000435]">
                <Icon size={22} />
              </div>
              <div>
                <h3 className="font-black text-[#000435]">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-[#000435] py-14 text-white sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mb-10 text-center text-2xl font-black sm:text-3xl">What families say</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <blockquote key={t.quote} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <Quote className="mb-3 text-amber-400 opacity-80" size={24} />
                <p className="text-sm leading-relaxed text-white/85">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-4 text-xs font-bold uppercase tracking-wide text-amber-400/90">— {t.author}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="rounded-3xl border-2 border-amber-400/40 bg-gradient-to-br from-white to-amber-50 px-6 py-12 text-center shadow-lg sm:px-12 sm:py-14">
          <h2 className="text-2xl font-black text-[#000435] sm:text-3xl">Ready to order school materials?</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-slate-600 sm:text-base">
            Browse stationery, identify your student, and complete your order in minutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => navigate(PAY_PATH)} className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#000435] px-6 py-3 text-sm font-black text-amber-400 hover:bg-[#000c6b]">
              Get Started
            </button>
            <button type="button" onClick={() => scrollToId("filters")} className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-[#000435] px-6 py-3 text-sm font-black text-[#000435] hover:bg-[#000435]/5">
              Browse Products
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer strip ── */}
      <footer className="border-t border-slate-200 bg-slate-50 py-8 text-center text-xs text-slate-500">
        <p className="font-semibold text-[#000435]">Shule Papeterie · Babyeyi</p>
        <p className="mt-1">Stationery &amp; learning materials for Rwandan schools.</p>
        <Link to="/services" className="mt-3 inline-block font-bold text-amber-600 hover:underline">
          All services
        </Link>
      </footer>

      {/* Quick view modal */}
      {quick && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border-2 border-amber-400 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-black text-[#000435]">{quick.name}</h3>
            <p className="mt-2 text-sm text-slate-600">{quick.desc}</p>
            <p className="mt-4 text-2xl font-black text-amber-600">{formatFrw(quick.price)}</p>
            <p className="mt-2 text-sm font-bold text-slate-600">Class: {quick.classLevel}</p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setQuick(null)} className="flex-1 rounded-xl border-2 border-slate-200 py-3 text-sm font-bold">
                Close
              </button>
              <button
                type="button"
                disabled={quick.stock <= 0}
                onClick={() => {
                  if (quick.stock > 0) addCart();
                  setQuick(null);
                }}
                className="flex-1 rounded-xl bg-[#000435] py-3 text-sm font-black text-amber-400 disabled:opacity-40"
              >
                Add to cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
