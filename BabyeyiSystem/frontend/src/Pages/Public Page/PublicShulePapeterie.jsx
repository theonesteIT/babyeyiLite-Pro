import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import papeterieHero from "../../assets/services/papaeterie.png";
import {
  ArrowLeft, ArrowRight, BookOpen, Brush, Calculator,
  Check, ChevronRight, GraduationCap, Home, Layers, Package,
  PenLine, Pencil, Ruler, School, Search, ShoppingBag, Sparkles,
  Star, Store, Truck, Eye, ShieldCheck, Clock, MapPin, Quote,
  ShoppingCart, X, Plus, Minus, Trash2, ChevronDown, Filter,
  CreditCard, Tag, AlertCircle,
} from "lucide-react";

/* ─── Constants ─────────────────────────────────────────────── */
const NAVY = "#000435";
const AMBER = "#FBBF24";
const AMBER_DK = "#F59E0B";
const MTN = "'MTN Brighter Sans','Trebuchet MS','Segoe UI',sans-serif";
const PAY_PATH = "/services/item/papeterie";

/* ─── Data ──────────────────────────────────────────────────── */
const CATEGORIES = [
  { id: "notebooks",  label: "Notebooks",         Icon: BookOpen    },
  { id: "pens",       label: "Pens & Pencils",     Icon: PenLine     },
  { id: "geometry",   label: "Geometry Set",        Icon: Ruler       },
  { id: "bags",       label: "School Bag",          Icon: ShoppingBag },
  { id: "art",        label: "Art Materials",       Icon: Brush       },
  { id: "math",       label: "Maths Tools",         Icon: Calculator  },
  { id: "exam",       label: "Exam Materials",      Icon: Pencil      },
  { id: "textbooks",  label: "Textbooks",           Icon: BookOpen    },
  { id: "practical",  label: "Practical Materials", Icon: Package     },
];

const PRODUCTS = [
  { id:"p1",  name:"Counter Books",          desc:"Durable covers, multiple subjects.",         price:8500,  stock:42,  category:"notebooks", classLevel:"Primary",    tag:"Popular"  },
  { id:"p2",  name:"100-page Notebook",      desc:"Ruled A4, perforated pages.",                price:3200,  stock:120, category:"notebooks", classLevel:"All levels", tag:"Bestseller"},
  { id:"p3",  name:"Blue Pen Pack (×12)",    desc:"12 smooth-writing ballpoints.",              price:2500,  stock:88,  category:"pens",      classLevel:"All levels", tag:"Popular"  },
  { id:"p4",  name:"Geometry Set",           desc:"Metal compass, squares, protractor.",        price:12000, stock:35,  category:"geometry",  classLevel:"O-Level",    tag:null       },
  { id:"p5",  name:"School Bag",             desc:"Padded straps, bottle pocket.",              price:45000, stock:18,  category:"bags",      classLevel:"All levels", tag:"New"      },
  { id:"p6",  name:"Scientific Calculator",  desc:"Exam-approved functions.",                   price:28000, stock:24,  category:"math",      classLevel:"Secondary",  tag:null       },
  { id:"p7",  name:"Pencil Set",             desc:"HB pencils, eraser caps included.",          price:4000,  stock:65,  category:"pens",      classLevel:"Primary",    tag:null       },
  { id:"p8",  name:"Eraser & Sharpener",    desc:"Classroom essentials combo.",                price:1800,  stock:0,   category:"pens",      classLevel:"All levels", tag:null       },
  { id:"p9",  name:"Art Colour Kit",         desc:"12 watercolours + brush.",                   price:9500,  stock:30,  category:"art",       classLevel:"Primary",    tag:"Popular"  },
  { id:"p10", name:"A4 Blank Sketch Pad",    desc:"60-page sketch pad for art class.",          price:5500,  stock:45,  category:"art",       classLevel:"All levels", tag:null       },
  { id:"p11", name:"Approved Exam Pen ×4",   desc:"Blue, exam board approved.",                 price:3800,  stock:0,   category:"exam",      classLevel:"Secondary",  tag:null       },
  { id:"p12", name:"Lab Notebook",           desc:"Grid pages for practical subjects.",         price:6200,  stock:22,  category:"practical", classLevel:"O-Level",    tag:null       },
];

const BUNDLES = [
  { id:"b1", name:"Nursery Starter Pack",    items:["Crayons","Safety scissors","Glue stick","Drawing book"],                         price:18500, Icon:Sparkles     },
  { id:"b2", name:"Primary Essentials",      items:["Notebooks","Pens","Pencils","Ruler","Eraser"],                                   price:22000, Icon:BookOpen     },
  { id:"b3", name:"Secondary Student Pack",  items:["Scientific calculator","Geometry set","Folders","Blue/black pens"],              price:52000, Icon:GraduationCap},
  { id:"b4", name:"Exam Preparation Kit",    items:["Approved pens","Clear pencil case","Highlighter","Sticky notes"],               price:15000, Icon:Pencil       },
  { id:"b5", name:"Art Class Pack",          items:["Watercolours","Brushes","Sketch pad","Oil pastels"],                            price:34000, Icon:Brush        },
];

const STEPS = [
  { n:1, title:"Enter Student Code", desc:"System auto-fills student, school and class.", Icon:School     },
  { n:2, title:"Choose Materials",   desc:"Browse & add items for your child's level.",    Icon:ShoppingBag},
  { n:3, title:"Choose Delivery",    desc:"Deliver to school or to your home address.",    Icon:Truck      },
  { n:4, title:"Pay Securely",       desc:"Complete payment and track your order live.",   Icon:ShieldCheck},
];

const TESTIMONIALS = [
  { quote:"Ordering school materials has become very easy and fast.",               author:"Parent, Kigali"            },
  { quote:"Everything my child needed for the term in one checkout.",               author:"Guardian, Southern Province"},
  { quote:"School delivery saves me a full day every new term.",                    author:"PTA member, Musanze"       },
];

/* ─── Helpers ────────────────────────────────────────────────── */
const fmt = n => `${Number(n).toLocaleString("en-RW")} Frw`;
const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });

/* ─── Cart Panel ─────────────────────────────────────────────── */
function CartPanel({ cart, onClose, onQty, onRemove, onClear, onCheckout }) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/60"
        style={{ backdropFilter:"blur(4px)" }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-[201] flex flex-col overflow-hidden shadow-2xl"
        style={{
          width: "min(420px, 100vw)",
          background: "#fff",
          borderLeft: `3px solid ${AMBER}`,
          fontFamily: MTN,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: NAVY, borderBottom: `2px solid ${AMBER}` }}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} color={AMBER} />
            <span className="font-black text-white text-[15px] uppercase tracking-wider">Your Cart</span>
            <span
              className="ml-1 rounded-full px-2 py-0.5 font-black text-[11px]"
              style={{ background: AMBER, color: NAVY }}
            >
              {cart.reduce((s, i) => s + i.qty, 0)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-white/10"
          >
            <X size={18} color="white" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <ShoppingBag size={48} color="rgba(0,4,53,0.12)" />
              <p className="text-sm font-semibold text-slate-400">Your cart is empty</p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2 rounded-xl text-sm font-black"
                style={{ background: AMBER, color: NAVY }}
              >
                Browse Items
              </button>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.id}
                className="flex gap-3 rounded-2xl p-3"
                style={{ border:"1.5px solid #f1f5f9", background:"#fafafa" }}
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: NAVY }}
                >
                  <Package size={20} color={AMBER} />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[#000435] text-[13px] leading-tight truncate">{item.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{item.desc}</p>
                  <p className="font-black text-amber-600 text-[13px] mt-1">{fmt(item.price * item.qty)}</p>
                  {item.qty > 1 && (
                    <p className="text-[10px] text-slate-400">{fmt(item.price)} each</p>
                  )}
                </div>
                {/* Qty controls */}
                <div className="flex flex-col items-end justify-between gap-1">
                  <button onClick={() => onRemove(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <div
                    className="flex items-center rounded-xl overflow-hidden"
                    style={{ border:"1.5px solid #e2e8f0" }}
                  >
                    <button
                      onClick={() => onQty(item.id, -1)}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 transition-colors"
                    >
                      <Minus size={12} color={NAVY} />
                    </button>
                    <span className="w-6 text-center text-[12px] font-black text-[#000435]">{item.qty}</span>
                    <button
                      onClick={() => onQty(item.id, 1)}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 transition-colors"
                    >
                      <Plus size={12} color={NAVY} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div
            className="px-4 py-5 space-y-3"
            style={{ borderTop:"2px solid #f1f5f9", background:"#fafbff" }}
          >
            {/* Line items summary */}
            <div className="space-y-1.5">
              {cart.map(i => (
                <div key={i.id} className="flex justify-between text-[12px]">
                  <span className="text-slate-500 truncate max-w-[60%]">{i.name} ×{i.qty}</span>
                  <span className="font-bold text-[#000435]">{fmt(i.price * i.qty)}</span>
                </div>
              ))}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="font-black text-[#000435] text-[15px]">Total</span>
              <span className="font-black text-amber-600 text-[18px]">{fmt(subtotal)}</span>
            </div>
            {/* Actions */}
            <button
              onClick={onCheckout}
              className="w-full py-3.5 rounded-2xl font-black text-[14px] flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-amber-200"
              style={{ background:`linear-gradient(135deg,${AMBER},${AMBER_DK})`, color:NAVY }}
            >
              <CreditCard size={16} /> Proceed to Checkout
            </button>
            <button
              onClick={onClear}
              className="w-full py-2.5 rounded-2xl font-bold text-[12px] text-slate-400 hover:text-red-500 transition-colors"
            >
              Clear all items
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Quick View Modal ───────────────────────────────────────── */
function QuickView({ product, onClose, onAdd }) {
  if (!product) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/60" style={{ backdropFilter:"blur(4px)" }} onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ fontFamily:MTN, background:"#fff", border:`2px solid ${AMBER}`, boxShadow:"0 32px 80px rgba(0,0,0,.4)" }}
      >
        {/* Image area */}
        <div className="h-48 flex items-center justify-center relative" style={{ background:NAVY }}>
          <Package size={64} color={`${AMBER}60`} strokeWidth={1} />
          {product.tag && (
            <span
              className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
              style={{ background:AMBER, color:NAVY }}
            >
              {product.tag}
            </span>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={16} color="white" />
          </button>
        </div>
        {/* Body */}
        <div className="p-6">
          <h3 className="font-black text-[#000435] text-[20px] mb-1">{product.name}</h3>
          <p className="text-slate-500 text-[13px] mb-4">{product.desc}</p>
          <div className="flex items-center justify-between mb-5">
            <span className="font-black text-amber-600 text-[24px]">{fmt(product.price)}</span>
            <span
              className="px-3 py-1.5 rounded-full text-[11px] font-black"
              style={{
                background: product.stock > 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                color: product.stock > 0 ? "#059669" : "#dc2626",
              }}
            >
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px] mb-5">
            <div className="rounded-xl p-3" style={{ background:"#f8fafc", border:"1px solid #f1f5f9" }}>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1">Class Level</p>
              <p className="font-black text-[#000435]">{product.classLevel}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background:"#f8fafc", border:"1px solid #f1f5f9" }}>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1">Category</p>
              <p className="font-black text-[#000435] capitalize">{product.category}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl font-bold text-[13px] text-slate-500"
              style={{ border:"1.5px solid #e2e8f0" }}
            >
              Close
            </button>
            <button
              disabled={product.stock <= 0}
              onClick={() => { onAdd(product); onClose(); }}
              className="flex-2 flex-1 py-3 rounded-2xl font-black text-[13px] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ background:`linear-gradient(135deg,${AMBER},${AMBER_DK})`, color:NAVY, minWidth:0 }}
            >
              <Plus size={14} /> Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Product Card ───────────────────────────────────────────── */
function ProductCard({ p, inCart, onAdd, onQuick }) {
  const [added, setAdded] = useState(false);
  const handleAdd = () => {
    if (p.stock <= 0) return;
    onAdd(p);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };
  return (
    <article
      className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        border: inCart ? `2px solid ${AMBER}` : "1px solid #f1f5f9",
        background:"#fff",
        boxShadow: inCart ? `0 8px 32px rgba(251,191,36,0.15)` : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      {/* Image */}
      <div
        className="relative h-36 flex items-center justify-center"
        style={{ background:`linear-gradient(135deg,${NAVY} 0%,#0a1466 100%)` }}
      >
        <Package size={44} strokeWidth={1} color={`${AMBER}55`} />
        {p.tag && (
          <span
            className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
            style={{ background:AMBER, color:NAVY }}
          >
            {p.tag}
          </span>
        )}
        {inCart && (
          <span
            className="absolute top-2.5 right-2.5 px-2 py-1 rounded-full text-[9px] font-black"
            style={{ background:"rgba(255,255,255,0.15)", color:"white" }}
          >
            In cart
          </span>
        )}
        <button
          onClick={() => onQuick(p)}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center bg-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/25"
        >
          <Eye size={13} />
        </button>
      </div>
      {/* Body */}
      <div className="flex flex-col flex-1 p-4">
        <h3 className="font-black text-[#000435] text-[14px] leading-tight mb-1">{p.name}</h3>
        <p className="text-slate-500 text-[11.5px] leading-relaxed flex-1 mb-3">{p.desc}</p>
        <div className="flex items-center justify-between mb-3">
          <span className="font-black text-amber-600 text-[16px]">{fmt(p.price)}</span>
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{
              background: p.stock > 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)",
              color: p.stock > 0 ? "#059669" : "#dc2626",
            }}
          >
            {p.stock > 0 ? `${p.stock} left` : "Out"}
          </span>
        </div>
        <button
          disabled={p.stock <= 0}
          onClick={handleAdd}
          className="w-full py-2.5 rounded-xl font-black text-[12px] flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: added
              ? "rgba(16,185,129,0.12)"
              : `linear-gradient(135deg,${AMBER},${AMBER_DK})`,
            color: added ? "#059669" : NAVY,
            border: added ? "1.5px solid rgba(16,185,129,0.3)" : "none",
          }}
        >
          {added
            ? <><Check size={13} /> Added!</>
            : <><Plus size={13} /> Add to Cart</>
          }
        </button>
      </div>
    </article>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function PublicShulePapeterie() {
  const navigate = useNavigate();

  /* Cart state */
  const [cart, setCart]           = useState([]);
  const [cartOpen, setCartOpen]   = useState(false);
  const [quick, setQuick]         = useState(null);

  /* Filters */
  const [studentCode, setStudentCode] = useState("");
  const [search, setSearch]           = useState("");
  const [cat, setCat]                 = useState("");
  const [classLevel, setClassLevel]   = useState("");
  const [priceMax, setPriceMax]       = useState(100000);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [filtersOpen, setFiltersOpen]     = useState(false);

  /* Cart helpers */
  const addToCart = useCallback((product) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id);
      if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  }, []);

  const changeQty = useCallback((id, delta) => {
    setCart(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i);
      return updated;
    });
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartIds   = new Set(cart.map(i => i.id));

  const handleCheckout = () => {
    setCartOpen(false);
    const q = studentCode.trim() ? `?code=${encodeURIComponent(studentCode.trim())}` : "";
    navigate(`${PAY_PATH}${q}`);
  };

  /* Filtered products */
  const filtered = useMemo(() => PRODUCTS.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.desc.toLowerCase().includes(search.toLowerCase())) return false;
    if (cat && p.category !== cat) return false;
    if (classLevel && p.classLevel !== classLevel && p.classLevel !== "All levels") return false;
    if (p.price > priceMax) return false;
    if (availableOnly && p.stock <= 0) return false;
    return true;
  }), [search, cat, classLevel, priceMax, availableOnly]);

  /* Lock body scroll when cart/modal open */
  useEffect(() => {
    document.body.style.overflow = (cartOpen || quick) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [cartOpen, quick]);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: MTN }}>

      {/* ══ STICKY NAV ══════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-50"
        style={{ background: NAVY, borderBottom: `3px solid ${AMBER}`, boxShadow:"0 4px 24px rgba(0,0,0,.4)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Back */}
          <Link
            to="/services"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 font-bold text-amber-400 text-[13px] transition-all hover:bg-white/8"
            style={{ border:"1px solid rgba(251,191,36,0.25)", minHeight:"40px" }}
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Services</span>
          </Link>

          {/* Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Store size={16} color={AMBER} className="shrink-0" />
            <span className="font-black text-white text-[13px] uppercase tracking-[0.14em] truncate">
              Shule Papeterie
            </span>
          </div>

          {/* Cart button */}
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 font-black text-[13px] transition-all hover:shadow-lg hover:shadow-amber-400/30"
            style={{ background:`linear-gradient(135deg,${AMBER},${AMBER_DK})`, color:NAVY, minHeight:"40px" }}
          >
            <ShoppingCart size={16} />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
                style={{ background: NAVY, color: AMBER, border:`2px solid ${AMBER}` }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ══ HERO ════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ background: NAVY, minHeight:"clamp(420px,60vh,600px)" }}
      >
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 rounded-full"
          style={{ width:380, height:380, background:`radial-gradient(circle,${AMBER}18 0%,transparent 70%)` }}
        />
        <div
          className="pointer-events-none absolute -left-16 bottom-0 rounded-full"
          style={{ width:260, height:260, background:`radial-gradient(circle,${AMBER}10 0%,transparent 70%)` }}
        />
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage:`radial-gradient(circle,rgba(251,191,36,0.08) 1px,transparent 1px)`, backgroundSize:"28px 28px" }}
        />

        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Left */}
          <div>
            <div
              className="mb-5 inline-flex items-center gap-2 rounded-lg px-3 py-1.5"
              style={{ background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.28)" }}
            >
              <Store size={13} color={AMBER} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: AMBER }}>
                School supply store
              </span>
            </div>
            <h1
              className="font-black leading-[1.06] text-white"
              style={{ fontSize:"clamp(2rem,5vw,3.4rem)", letterSpacing:"-0.03em" }}
            >
              Shule<br />
              <span style={{ color: AMBER }}>Papeterie</span>
            </h1>
            <p
              className="mt-4 leading-relaxed"
              style={{ fontSize:"clamp(14px,1.4vw,17px)", color:"rgba(255,255,255,0.6)", maxWidth:480 }}
            >
              Order school stationery and learning materials for your child — fast, easy, and delivered to school or home.
            </p>
            {/* Hero stats */}
            <div className="mt-8 flex flex-wrap gap-4">
              {[["500+","Products"],["24h","Delivery"],["100%","Secure"]].map(([n,l])=>(
                <div key={l} className="text-center">
                  <p className="font-black text-[22px]" style={{ color:AMBER }}>{n}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{l}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => scrollTo("products")}
                className="inline-flex items-center gap-2 rounded-2xl font-black text-[14px] px-6 py-3.5 transition-all hover:shadow-lg hover:shadow-amber-400/30"
                style={{ background:`linear-gradient(135deg,${AMBER},${AMBER_DK})`, color:NAVY, minHeight:52 }}
              >
                Shop Now <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => scrollTo("bundles")}
                className="inline-flex items-center gap-2 rounded-2xl font-bold text-[14px] px-6 py-3.5 text-white transition-all hover:bg-white/8"
                style={{ border:"1.5px solid rgba(255,255,255,0.2)", minHeight:52 }}
              >
                View Bundles
              </button>
            </div>
          </div>
          {/* Right image */}
          <div className="relative">
            <div
              className="overflow-hidden rounded-3xl shadow-2xl"
              style={{ border:`2px solid rgba(251,191,36,0.35)` }}
            >
              <img
                src={papeterieHero}
                alt="Stationery and school supplies"
                className="w-full object-cover"
                style={{ height:"clamp(220px,30vw,360px)" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#000435]/70 via-transparent to-transparent rounded-3xl" />
            </div>
            {/* Floating chips */}
            <div
              className="absolute -bottom-4 left-4 flex gap-2"
            >
              {["Books & pens","Notebooks","Trusted by families"].map((t,i)=>(
                <span
                  key={t}
                  className="rounded-lg px-3 py-1.5 text-[11px] font-black whitespace-nowrap"
                  style={{
                    background: i === 2 ? AMBER : "rgba(255,255,255,0.12)",
                    color: i === 2 ? NAVY : "white",
                    backdropFilter:"blur(8px)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════════ */}
      <section className="py-14 sm:py-16 bg-slate-50" style={{ borderBottom:"1px solid #f1f5f9" }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 mb-3 text-[10.5px] font-black uppercase tracking-[0.2em]" style={{ color:"#b45309" }}>
              <span className="w-6 h-px bg-amber-500" /> How It Works <span className="w-6 h-px bg-amber-500" />
            </div>
            <h2 className="font-black text-[#000435]" style={{ fontSize:"clamp(1.5rem,3vw,2.2rem)", letterSpacing:"-0.03em" }}>
              Four simple steps
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ n, title, desc, Icon }, i) => (
              <div
                key={n}
                className="relative rounded-2xl p-6 transition-all hover:-translate-y-1"
                style={{ background:"#fff", border:"1px solid #f1f5f9", boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}
              >
                {/* Step number */}
                <span
                  className="absolute top-4 right-4 font-black text-[2.5rem] leading-none select-none"
                  style={{ color:"#f1f5f9", letterSpacing:"-0.05em" }}
                >
                  {String(n).padStart(2,"0")}
                </span>
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background:NAVY }}
                >
                  <Icon size={22} color={AMBER} />
                </div>
                <h3 className="font-black text-[#000435] mb-1.5" style={{ fontSize:15 }}>{title}</h3>
                <p className="text-slate-500 text-[12.5px] leading-relaxed">{desc}</p>
                {i < STEPS.length-1 && (
                  <ArrowRight
                    size={16}
                    color={AMBER}
                    className="absolute top-1/2 -right-3 -translate-y-1/2 hidden lg:block"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ STUDENT CODE CTA ════════════════════════════════════ */}
      <section className="py-12 sm:py-14 mx-auto max-w-6xl px-4 sm:px-6">
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background:`linear-gradient(135deg,${NAVY} 0%,#0a1466 100%)`, border:`2px solid rgba(251,191,36,0.4)` }}
        >
          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-lg px-3 py-1.5"
                style={{ background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.28)" }}
              >
                <Sparkles size={13} color={AMBER} />
                <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color:AMBER }}>Student-first lookup</span>
              </div>
              <h2 className="font-black text-white mb-3" style={{ fontSize:"clamp(1.4rem,2.8vw,2rem)", letterSpacing:"-0.03em" }}>
                Order by Student Code
              </h2>
              <p className="text-white/60 text-[13.5px] leading-relaxed mb-4">
                Enter the student code and the system will automatically identify the student, school, class, and location to help you order the correct materials.
              </p>
              <p className="flex items-center gap-2 text-[13px] font-semibold" style={{ color:AMBER }}>
                <ShieldCheck size={16} className="shrink-0" />
                Fast lookup — continue to secure payment in one flow.
              </p>
            </div>
            <div
              className="rounded-2xl p-5 sm:p-6"
              style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)" }}
            >
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/45 mb-2">
                Student Code / SDM ID
              </label>
              <input
                value={studentCode}
                onChange={e => setStudentCode(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCheckout(); }}
                placeholder="e.g. 040080001"
                className="w-full rounded-xl px-4 py-3.5 text-[#000435] placeholder:text-slate-400 outline-none mb-4"
                style={{ border:`2px solid rgba(255,255,255,0.15)`, background:"#fff", minHeight:52, fontSize:14, fontFamily:MTN }}
              />
              <button
                type="button"
                onClick={handleCheckout}
                className="w-full rounded-xl py-3.5 font-black text-[14px] flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-amber-400/25"
                style={{ background:`linear-gradient(135deg,${AMBER},${AMBER_DK})`, color:NAVY, minHeight:52 }}
              >
                <CreditCard size={16} /> Look up & Continue
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CATEGORIES ══════════════════════════════════════════ */}
      <section className="pb-14 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex items-center gap-3">
          <span className="w-1 h-6 rounded-full" style={{ background:AMBER }} />
          <h2 className="font-black text-[#000435]" style={{ fontSize:"clamp(1.3rem,2.5vw,1.9rem)", letterSpacing:"-0.025em" }}>
            Browse by category
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCat("")}
            className="px-4 py-2 rounded-xl font-black text-[12px] transition-all"
            style={{
              background: !cat ? NAVY : "#f8fafc",
              color: !cat ? AMBER : "#64748b",
              border: !cat ? `1.5px solid ${NAVY}` : "1.5px solid #e2e8f0",
            }}
          >
            All
          </button>
          {CATEGORIES.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => { setCat(id === cat ? "" : id); scrollTo("products"); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-[12px] transition-all"
              style={{
                background: cat === id ? NAVY : "#f8fafc",
                color: cat === id ? AMBER : "#64748b",
                border: cat === id ? `1.5px solid ${NAVY}` : "1.5px solid #e2e8f0",
              }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </section>

      {/* ══ PRODUCTS ════════════════════════════════════════════ */}
      <section id="products" className="bg-slate-50/80 py-14 sm:py-16" style={{ borderTop:"1px solid #f1f5f9" }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Section header + filter toggle */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="w-1 h-6 rounded-full" style={{ background:AMBER }} />
                <h2 className="font-black text-[#000435]" style={{ fontSize:"clamp(1.3rem,2.5vw,1.9rem)", letterSpacing:"-0.025em" }}>
                  All Materials
                </h2>
              </div>
              <p className="text-[13px] text-slate-500 pl-4">
                {filtered.length} item{filtered.length !== 1 ? "s" : ""} available
              </p>
            </div>
            <button
              onClick={() => setFiltersOpen(f => !f)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] transition-all self-start sm:self-auto"
              style={{ background:"#fff", border:"1.5px solid #e2e8f0", color:"#000435" }}
            >
              <Filter size={14} /> Filters
              <ChevronDown
                size={14}
                style={{ transform: filtersOpen ? "rotate(180deg)" : "rotate(0)", transition:"transform 0.2s" }}
              />
            </button>
          </div>

          {/* Filter panel */}
          {filtersOpen && (
            <div
              className="mb-8 rounded-2xl p-5 sm:p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              style={{ background:"#fff", border:"1.5px solid #f1f5f9", boxShadow:"0 4px 20px rgba(0,0,0,0.06)" }}
            >
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name…"
                  className="w-full rounded-xl pl-10 pr-4 py-3 outline-none text-[13px]"
                  style={{ border:"1.5px solid #e2e8f0", fontFamily:MTN, minHeight:44, color:"#000435" }}
                />
              </div>
              {/* Class level */}
              <select
                value={classLevel}
                onChange={e => setClassLevel(e.target.value)}
                className="rounded-xl px-3 py-3 text-[13px] font-bold outline-none"
                style={{ border:"1.5px solid #e2e8f0", color:"#000435", fontFamily:MTN, minHeight:44 }}
              >
                <option value="">All class levels</option>
                {["Nursery","Primary","O-Level","Secondary","All levels"].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              {/* In stock */}
              <label
                className="flex items-center gap-2.5 rounded-xl px-4 cursor-pointer"
                style={{ border:"1.5px solid #e2e8f0", minHeight:44, background: availableOnly ? "rgba(251,191,36,0.06)" : "#fff" }}
              >
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={e => setAvailableOnly(e.target.checked)}
                  className="w-4 h-4"
                  style={{ accentColor: AMBER_DK }}
                />
                <span className="font-black text-[12.5px] text-[#000435]">In stock only</span>
              </label>
              {/* Price slider */}
              <div className="lg:col-span-2 flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-500">
                  <span>Max price</span>
                  <span style={{ color:"#b45309" }}>{fmt(priceMax)}</span>
                </div>
                <input
                  type="range" min={2000} max={100000} step={1000}
                  value={priceMax}
                  onChange={e => setPriceMax(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: AMBER_DK }}
                />
              </div>
              {/* Reset */}
              <div className="flex items-end lg:col-span-2">
                <button
                  onClick={() => { setSearch(""); setCat(""); setClassLevel(""); setPriceMax(100000); setAvailableOnly(false); }}
                  className="px-4 py-2.5 rounded-xl font-bold text-[12px] text-slate-500 hover:text-red-500 transition-colors"
                  style={{ border:"1.5px solid #e2e8f0" }}
                >
                  Reset filters
                </button>
              </div>
            </div>
          )}

          {/* Grid */}
          {filtered.length > 0 ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map(p => (
                <ProductCard
                  key={p.id}
                  p={p}
                  inCart={cartIds.has(p.id)}
                  onAdd={addToCart}
                  onQuick={setQuick}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-16 gap-3">
              <AlertCircle size={40} color="rgba(0,4,53,0.15)" />
              <p className="font-bold text-slate-400 text-[14px]">No items match your filters.</p>
              <button
                onClick={() => { setSearch(""); setCat(""); setClassLevel(""); setPriceMax(100000); setAvailableOnly(false); }}
                className="px-5 py-2.5 rounded-xl font-black text-[12px]"
                style={{ background:`linear-gradient(135deg,${AMBER},${AMBER_DK})`, color:NAVY }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ══ BUNDLES ═════════════════════════════════════════════ */}
      <section id="bundles" className="py-14 sm:py-16 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex items-center gap-3">
          <span className="w-1 h-6 rounded-full" style={{ background:AMBER }} />
          <h2 className="font-black text-[#000435]" style={{ fontSize:"clamp(1.3rem,2.5vw,1.9rem)", letterSpacing:"-0.025em" }}>
            Ready-made bundles
          </h2>
        </div>
        <p className="text-[13.5px] text-slate-500 mb-8 -mt-4">
          Curated packs for each stage — ideal for parents at the start of term.
        </p>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {BUNDLES.map(b => {
            const inCart = cartIds.has(b.id);
            return (
              <article
                key={b.id}
                className="flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                style={{
                  border: inCart ? `2px solid ${AMBER}` : "1px solid #f1f5f9",
                  background:"#fff",
                  boxShadow: inCart ? `0 8px 32px rgba(251,191,36,0.14)` : "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                {/* Header bar */}
                <div
                  className="px-5 py-4 flex items-center gap-3"
                  style={{ background:NAVY }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background:"rgba(251,191,36,0.15)" }}
                  >
                    <b.Icon size={20} color={AMBER} />
                  </div>
                  <h3 className="font-black text-white text-[14px] leading-tight">{b.name}</h3>
                </div>
                {/* Body */}
                <div className="flex flex-col flex-1 p-5">
                  <ul className="space-y-2 flex-1 mb-5">
                    {b.items.map(it => (
                      <li key={it} className="flex items-center gap-2.5 text-[13px] text-slate-600">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ background:"rgba(251,191,36,0.15)" }}
                        >
                          <Check size={11} color={AMBER_DK} />
                        </div>
                        {it}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-black text-amber-600 text-[20px]">{fmt(b.price)}</span>
                    {inCart && (
                      <span
                        className="px-2 py-1 rounded-full text-[9px] font-black uppercase"
                        style={{ background:"rgba(251,191,36,0.15)", color:"#b45309" }}
                      >
                        In cart
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => addToCart({ ...b, id:b.id, desc:`Bundle: ${b.items.join(", ")}`, stock:99, category:"bundle", classLevel:"All levels", tag:"Bundle" })}
                    className="w-full py-3 rounded-xl font-black text-[13px] flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: inCart ? "rgba(16,185,129,0.1)" : `linear-gradient(135deg,${AMBER},${AMBER_DK})`,
                      color: inCart ? "#059669" : NAVY,
                      border: inCart ? "1.5px solid rgba(16,185,129,0.3)" : "none",
                    }}
                  >
                    {inCart ? <><Check size={14} /> Added to cart</> : <><Plus size={14} /> Add bundle</>}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ══ DELIVERY ════════════════════════════════════════════ */}
      <section className="py-12 sm:py-14 bg-slate-50" style={{ borderTop:"1px solid #f1f5f9", borderBottom:"1px solid #f1f5f9" }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <h2 className="font-black text-[#000435]" style={{ fontSize:"clamp(1.3rem,2.5vw,1.9rem)", letterSpacing:"-0.025em" }}>
              Delivery options
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {[
              { Icon:School, title:"Delivered to School", desc:"Drop-off coordinated with the school — great when students board or parents prefer pickup at the gate." },
              { Icon:Home,   title:"Delivered at Home",   desc:"Convenient home delivery when you need materials outside school hours or prefer doorstep service." },
            ].map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-4 rounded-2xl p-6 transition-all hover:-translate-y-1"
                style={{ background:"#fff", border:"1px solid #f1f5f9", boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background:NAVY }}
                >
                  <Icon size={24} color={AMBER} />
                </div>
                <div>
                  <h3 className="font-black text-[#000435] mb-2" style={{ fontSize:16 }}>{title}</h3>
                  <p className="text-slate-500 text-[13px] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ════════════════════════════════════════ */}
      <section className="py-14 sm:py-16" style={{ background:NAVY }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="font-black text-white" style={{ fontSize:"clamp(1.4rem,2.8vw,2rem)", letterSpacing:"-0.025em" }}>
              What families say
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <blockquote
                key={i}
                className="rounded-2xl p-6"
                style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)" }}
              >
                <Quote size={20} color={AMBER} className="mb-3 opacity-80" />
                <p className="text-white/80 text-[13.5px] leading-relaxed mb-4">"{t.quote}"</p>
                <footer className="text-[11px] font-black uppercase tracking-wider" style={{ color:AMBER }}>
                  — {t.author}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ═══════════════════════════════════════════ */}
      <section className="py-16 sm:py-20 mx-auto max-w-6xl px-4 sm:px-6">
        <div
          className="rounded-3xl text-center px-6 py-12 sm:px-12 sm:py-14"
          style={{
            background:`linear-gradient(135deg,rgba(251,191,36,0.08) 0%,rgba(251,191,36,0.03) 100%)`,
            border:`2px solid rgba(251,191,36,0.3)`,
          }}
        >
          <h2
            className="font-black text-[#000435] mb-4"
            style={{ fontSize:"clamp(1.4rem,3vw,2.2rem)", letterSpacing:"-0.03em" }}
          >
            Ready to order school materials?
          </h2>
          <p className="text-slate-500 text-[14px] max-w-lg mx-auto mb-8 leading-relaxed">
            Browse stationery, identify your student, and complete your order in minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => scrollTo("products")}
              className="inline-flex items-center gap-2 rounded-2xl font-black text-[14px] px-6 py-3.5 transition-all hover:shadow-lg hover:shadow-amber-400/25"
              style={{ background:`linear-gradient(135deg,${AMBER},${AMBER_DK})`, color:NAVY, minHeight:52 }}
            >
              <ShoppingBag size={16} /> Browse Products
            </button>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl font-bold text-[14px] px-6 py-3.5 transition-all hover:bg-[#000435]/5"
              style={{ border:`2px solid ${NAVY}`, color:NAVY, minHeight:52 }}
            >
              <ShoppingCart size={16} /> View Cart{cartCount > 0 ? ` (${cartCount})` : ""}
            </button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════ */}
      <footer
        className="py-8 text-center text-[12px]"
        style={{ background:"#000120", borderTop:`2px solid rgba(251,191,36,0.15)` }}
      >
        <p className="font-black text-white mb-1">Shule Papeterie · Babyeyi</p>
        <p style={{ color:"rgba(255,255,255,0.35)" }}>Stationery & learning materials for Rwandan schools.</p>
        <Link
          to="/services"
          className="inline-block mt-3 font-bold hover:underline"
          style={{ color:AMBER }}
        >
          All services →
        </Link>
      </footer>

      {/* ══ FLOATING CART FAB (mobile) ═══════════════════════════ */}
      {cartCount > 0 && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 rounded-2xl font-black text-[13px] px-5 py-3.5 shadow-2xl transition-all hover:scale-105 active:scale-95 sm:hidden"
          style={{
            background:`linear-gradient(135deg,${AMBER},${AMBER_DK})`,
            color:NAVY,
            boxShadow:`0 8px 32px rgba(251,191,36,0.45)`,
          }}
        >
          <ShoppingCart size={17} />
          Cart · {fmt(cartTotal)}
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
            style={{ background:NAVY, color:AMBER }}
          >
            {cartCount}
          </span>
        </button>
      )}

      {/* ══ CART PANEL ══════════════════════════════════════════ */}
      {cartOpen && (
        <CartPanel
          cart={cart}
          onClose={() => setCartOpen(false)}
          onQty={changeQty}
          onRemove={removeFromCart}
          onClear={clearCart}
          onCheckout={handleCheckout}
        />
      )}

      {/* ══ QUICK VIEW ══════════════════════════════════════════ */}
      {quick && (
        <QuickView
          product={quick}
          onClose={() => setQuick(null)}
          onAdd={addToCart}
        />
      )}
    </div>
  );
}