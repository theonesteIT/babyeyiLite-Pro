/** SVG charts for accountant dashboard — Babyeyi gold palette, no extra deps */

import { useId } from "react";

const GOLD = "#FEBF10";
const DARK = "#1A1200";
const TRACK = "#FDEAA0";

function formatShortDate(iso) {
  if (!iso || typeof iso !== "string") return "";
  const [, m, d] = iso.split("-");
  if (!m || !d) return iso;
  return `${m}/${d}`;
}

export function StudentsByClassBarChart({ rows, className = "" }) {
  const data = Array.isArray(rows) ? rows.filter((r) => r && (r.student_count > 0 || r.class_name)) : [];
  const max = Math.max(1, ...data.map((r) => Number(r.student_count || 0)));
  const w = 360;
  const h = 200;
  const padL = 28;
  const padR = 8;
  const padT = 12;
  const padB = 52;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const barGap = 4;
  const n = Math.min(data.length, 10);
  const slice = data.slice(0, n);
  const barW = n ? (innerW - barGap * (n - 1)) / n : 0;

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto max-h-[220px]" role="img" aria-label="Students per class">
        <text x={padL} y={14} className="fill-[#7A5C00] text-[9px] font-bold" style={{ fontFamily: "Montserrat, sans-serif" }}>
          Students by class
        </text>
        {slice.map((r, i) => {
          const count = Number(r.student_count || 0);
          const bh = (count / max) * innerH;
          const x = padL + i * (barW + barGap);
          const y = padT + innerH - bh;
          const label = String(r.class_name || "—").slice(0, 8);
          return (
            <g key={`${r.class_name}-${i}`}>
              <rect x={x} y={padT} width={barW} height={innerH} rx={4} fill={TRACK} opacity={0.35} />
              <rect x={x} y={y} width={barW} height={Math.max(bh, 2)} rx={4} fill={GOLD} style={{ filter: "drop-shadow(0 2px 4px rgba(26,18,0,0.12))" }} />
              <text
                x={x + barW / 2}
                y={padT + innerH + 12}
                textAnchor="middle"
                className="fill-[#3D2C00] text-[7px] font-semibold"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                {label}
              </text>
            </g>
          );
        })}
        {slice.length === 0 && (
          <text x={w / 2} y={h / 2} textAnchor="middle" className="fill-slate-400 text-[11px]">
            No class data yet
          </text>
        )}
      </svg>
    </div>
  );
}

export function CollectionsTrendChart({ days }) {
  const gradId = useId().replace(/:/g, "");
  const pts = Array.isArray(days) ? days : [];
  const max = Math.max(1, ...pts.map((p) => Number(p.total_paid || 0)));
  const w = 400;
  const h = 200;
  const padL = 36;
  const padR = 12;
  const padT = 20;
  const padB = 36;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const n = pts.length || 1;
  const step = n > 1 ? innerW / (n - 1) : 0;

  const coordinates = pts.map((p, i) => {
    const v = Number(p.total_paid || 0);
    const x = padL + (n > 1 ? i * step : innerW / 2);
    const y = padT + innerH - (v / max) * innerH;
    return { x, y, v, date: p.date };
  });

  const lineD =
    coordinates.length > 0
      ? coordinates.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ")
      : "";

  const areaD =
    coordinates.length > 1
      ? `M ${coordinates[0].x} ${padT + innerH} ${coordinates.map((c) => `L ${c.x} ${c.y}`).join(" ")} L ${coordinates[coordinates.length - 1].x} ${padT + innerH} Z`
      : coordinates.length === 1
        ? `M ${coordinates[0].x} ${padT + innerH} L ${coordinates[0].x} ${coordinates[0].y} L ${coordinates[0].x} ${padT + innerH} Z`
        : "";

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto max-h-[220px]" role="img" aria-label="Collections last 14 days">
        <text x={padL} y={14} className="fill-[#7A5C00] text-[9px] font-bold" style={{ fontFamily: "Montserrat, sans-serif" }}>
          Fee collections (14 days)
        </text>
        <rect x={padL} y={padT} width={innerW} height={innerH} rx={8} fill={TRACK} opacity={0.25} />
        {areaD && <path d={areaD} fill={`url(#${gradId})`} opacity={0.45} />}
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.5" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {lineD && (
          <path
            d={lineD}
            fill="none"
            stroke={DARK}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {coordinates.map((c, i) => (
          <circle key={c.date || i} cx={c.x} cy={c.y} r={3.5} fill={GOLD} stroke={DARK} strokeWidth={1.2} />
        ))}
        {[...new Set([0, Math.floor((n - 1) / 2), n - 1])]
          .filter((i) => i >= 0 && i < n)
          .map((i) => {
            const c = coordinates[i];
            if (!c) return null;
            return (
              <text
                key={c.date}
                x={c.x}
                y={h - 10}
                textAnchor="middle"
                className="fill-[#7A5C00] text-[7px] font-semibold"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                {formatShortDate(c.date)}
              </text>
            );
          })}
        {pts.length === 0 && (
          <text x={w / 2} y={h / 2} textAnchor="middle" className="fill-slate-400 text-[11px]">
            No collection history yet
          </text>
        )}
      </svg>
    </div>
  );
}
