/**
 * Clean stat card — white background, navy text, no icons, no heavy bold.
 */
export default function SmStatCard({
  label,
  value,
  sub,
  hint,
  className = "",
  onClick,
}) {
  const subtext = sub ?? hint;
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={[
        "rounded-2xl border border-[#000435]/10 bg-white p-4 sm:p-5 text-left w-full min-w-0",
        onClick ? "cursor-pointer hover:border-[#000435]/20 transition-colors" : "",
        className,
      ].join(" ")}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#000435]/45">{label}</p>
      <p className="mt-2 text-xl sm:text-2xl font-normal text-[#000435] tabular-nums leading-snug">
        {value ?? "—"}
      </p>
      {subtext ? (
        <p className="mt-1.5 text-[11px] font-normal text-[#000435]/40 truncate">{subtext}</p>
      ) : null}
    </Tag>
  );
}
