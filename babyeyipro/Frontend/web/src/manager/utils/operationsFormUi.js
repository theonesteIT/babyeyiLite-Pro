/**
 * Inset-shadow fields for School Operations (aligned with teacher portal gradebook / wizard pattern).
 */

const SELECT_CHEVRON =
  "cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_0.75rem_center]";

/** Modal / tall row — selects */
export const operationsInnerSelectCls = `${SELECT_CHEVRON} w-full min-h-[2.75rem] h-11 rounded-xl pl-4 pr-10 outline-none transition-all border border-black/[0.07] bg-re-bg text-[#1E3A5F] font-black uppercase tracking-wide text-[10px] shadow-[inset_0_2px_8px_rgba(15,23,42,0.11),inset_0_-1px_0_rgba(255,255,255,0.55)] focus:border-[#1E3A5F]/30 focus:bg-white focus:ring-2 focus:ring-[#1E3A5F]/12`;

/** Modal — text, number, date, time */
export const operationsInnerInputCls =
  'w-full min-h-[2.75rem] h-11 rounded-xl px-4 outline-none transition-all border border-black/[0.07] bg-re-bg text-[#1E3A5F] font-black uppercase text-[11px] shadow-[inset_0_2px_8px_rgba(15,23,42,0.11),inset_0_-1px_0_rgba(255,255,255,0.55)] focus:border-[#1E3A5F]/30 focus:bg-white focus:ring-2 focus:ring-[#1E3A5F]/12';

/** Monospace / code-style (slug, codes) */
export const operationsInnerInputMonoCls = `${operationsInnerInputCls} font-mono text-xs normal-case font-bold`;

/** Gradebook “add column” and similar compact blocks */
export const operationsInnerFieldCls =
  'w-full h-10 rounded-xl px-3 outline-none transition-all border border-black/[0.07] bg-re-bg text-re-text font-bold text-sm shadow-[inset_0_2px_8px_rgba(15,23,42,0.11),inset_0_-1px_0_rgba(255,255,255,0.55)] focus:border-[#1E3A5F]/30 focus:bg-white focus:ring-2 focus:ring-[#1E3A5F]/12';

export const operationsInnerFieldMonoCls = `${operationsInnerFieldCls} font-mono text-xs`;

/** Table inline editors */
export const operationsInnerTableInputCls =
  'w-full min-w-[100px] h-9 rounded-lg px-2 outline-none transition-all border border-black/[0.07] bg-re-bg text-re-text font-bold text-xs shadow-[inset_0_2px_8px_rgba(15,23,42,0.09),inset_0_-1px_0_rgba(255,255,255,0.5)] focus:border-[#1E3A5F]/28 focus:bg-white focus:ring-1 focus:ring-[#1E3A5F]/12';

/** Time inputs (narrower padding) */
export const operationsInnerTimeCls = `${operationsInnerInputCls} !px-2 !normal-case text-[10px] font-black tabular-nums`;
