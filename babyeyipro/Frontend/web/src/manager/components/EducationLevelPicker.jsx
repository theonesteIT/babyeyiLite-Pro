import { EDUCATION_LEVEL_OPTIONS } from "../../utils/educationLevelClasses";

/**
 * Modern pill selector for education level (Babyeyi wizard, student register, import).
 */
export default function EducationLevelPicker({
  value,
  onChange,
  options = EDUCATION_LEVEL_OPTIONS,
  disabled = false,
  title = "Education level",
  hint = "Choose a level to show classes for that level.",
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 to-white p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#92400e]">{title}</p>
          {hint ? <p className="text-[11px] text-slate-500 mt-1 leading-relaxed max-w-xl">{hint}</p> : null}
        </div>
        {value ? (
          <span className="inline-flex self-start px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80">
            {options.find((o) => o.id === value)?.short || value}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={`text-left rounded-xl border px-3.5 py-3 transition-all ${
                active
                  ? "border-[#c87800] bg-gradient-to-br from-amber-50 to-white shadow-md shadow-amber-500/10 ring-2 ring-[#FEBF10]/25"
                  : "border-slate-200 bg-white hover:border-[#c87800]/35 hover:bg-amber-50/40"
              } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <p className={`text-sm font-bold tracking-tight ${active ? "text-[#000435]" : "text-slate-700"}`}>
                {opt.label}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">NESA: {opt.nesaLevel}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
