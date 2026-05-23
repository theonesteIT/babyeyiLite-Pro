// ================================================================
// Shop.jsx — Parent school shop (placeholder catalog)
// ================================================================

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";

const CATEGORIES = ["All", "Stationery", "Writing tools", "Mathematics", "Science", "Arts"];

const PRODUCTS = [
  { id: 1, cat: "Stationery", name: "Exercise books — 96 pages", price: 500, stock: 150, img: "📓" },
  { id: 2, cat: "Writing tools", name: "Ballpoint pens (pack of 5)", price: 800, stock: 80, img: "✏️" },
  { id: 3, cat: "Mathematics", name: "Geometry set", price: 3500, stock: 40, img: "📐" },
  { id: 4, cat: "Stationery", name: "A4 refill paper (rim)", price: 12000, stock: 25, img: "📄" },
  { id: 5, cat: "Science", name: "Lab safety goggles", price: 4500, stock: 12, img: "🥽" },
  { id: 6, cat: "Arts", name: "Watercolour paint set", price: 6000, stock: 18, img: "🎨" },
];

export default function Shop() {
  const [cat, setCat] = useState("All");

  const list = useMemo(() => {
    if (cat === "All") return PRODUCTS;
    return PRODUCTS.filter((p) => p.cat === cat);
  }, [cat]);

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900">School shop</h1>
        <p className="text-slate-500 text-sm mt-1">Stationery and supplies — demo catalogue</p>
      </div>

      <div className="flex gap-2 overflow-x-auto  pb-3 -mx-1 px-1 [scrollbar-width:thin]">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={[
              "shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all border",
              cat === c
                ? "bg-slate-600 text-white border-slate-600 shadow-md shadow-slate-500/25"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300",
            ].join(" ")}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500">
        <span className="font-semibold text-slate-700">{list.length}</span> products found
      </p>

      <ul className="space-y-4">
        {list.map((p) => (
          <li
            key={p.id}
            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col sm:flex-row gap-4"
          >
            <div className="w-full sm:w-24 h-24 rounded-xl bg-slate-100 flex items-center justify-center text-4xl shrink-0">
              {p.img}
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <h2 className="font-bold text-slate-900 text-lg leading-snug mt-0.5">{p.name}</h2>
              <p className="text-lg font-extrabold text-slate-700 mt-1">RWF {p.price.toLocaleString()}</p>
              <button
                type="button"
                className="mt-3 sm:mt-auto sm:self-start inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 text-white font-bold text-sm px-4 py-2.5 hover:bg-slate-600 transition-colors w-full sm:w-auto"
              >
                <Plus size={18} strokeWidth={2.5} />
                Add to cart
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
