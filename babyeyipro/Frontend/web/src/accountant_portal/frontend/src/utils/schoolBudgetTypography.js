/** Typography tokens — aligned with accountant Dashboard (Montserrat, medium weights). */
export const SB_FONT_FAMILY = "'Montserrat', sans-serif";

export const sbPageTitleClass =
  'text-base sm:text-lg font-medium text-[#000435] tracking-tight';

export const sbPageSubtitleClass =
  'text-[10px] sm:text-[11px] font-medium text-slate-500 mt-1';

export const sbSectionTitleClass =
  'text-sm font-medium text-[#000435]';

export const sbBodyClass = 'text-[13px] font-normal text-slate-600';

export const sbCaptionClass = 'text-[11px] font-medium text-slate-500';

export const sbKpiValueClass = 'text-lg sm:text-xl font-semibold text-[#000435] tabular-nums tracking-tight';

export const sbKpiLabelClass =
  'text-[10px] font-medium text-slate-500 uppercase tracking-[0.12em]';

/** Inline style helpers for legacy style={{}} blocks */
export const sbPageTitle = {
  fontFamily: SB_FONT_FAMILY,
  fontSize: 16,
  fontWeight: 500,
  color: '#000435',
  letterSpacing: '-0.02em',
};

export const sbPageSubtitle = {
  fontFamily: SB_FONT_FAMILY,
  fontSize: 11,
  fontWeight: 500,
  color: '#94a3b8',
};

export const sbSectionTitle = {
  fontFamily: SB_FONT_FAMILY,
  fontSize: 14,
  fontWeight: 500,
  color: '#000435',
};

export const sbKpiValue = {
  fontFamily: SB_FONT_FAMILY,
  fontSize: 18,
  fontWeight: 600,
  color: '#000435',
};

export const sbKpiLabel = {
  fontFamily: SB_FONT_FAMILY,
  fontSize: 10,
  fontWeight: 500,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

export const sbBody = {
  fontFamily: SB_FONT_FAMILY,
  fontSize: 13,
  fontWeight: 400,
  color: '#4b5563',
};

export const sbLabel = {
  fontFamily: SB_FONT_FAMILY,
  fontSize: 11,
  fontWeight: 500,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

export const sbInput = {
  fontFamily: SB_FONT_FAMILY,
  fontSize: 13,
  fontWeight: 400,
};
