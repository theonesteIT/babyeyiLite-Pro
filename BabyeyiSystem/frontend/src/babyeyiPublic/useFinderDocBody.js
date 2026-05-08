import { useEffect, useState } from "react";
import { getParentMessageForDisplay } from "../i18n/index.js";
import { isCoreBabyeyiLang, normalizeBabyeyiLang } from "./babyeyiTranslateLangs.js";
import { translateLongText, translateWithLingvaCached } from "./lingvaTranslate.js";

function normalizeRec(rec) {
  if (!rec) return rec;
  return {
    ...rec,
    parentMessage: rec.parentMessage ?? rec.parent_message ?? "",
  };
}

function parseBanks(rec) {
  if (rec.banks_json) {
    try {
      const raw = typeof rec.banks_json === "string" ? JSON.parse(rec.banks_json) : rec.banks_json;
      if (Array.isArray(raw) && raw.length > 0) return raw;
    } catch {}
  }
  if (rec.bank_name) {
    return [{ bankName: rec.bank_name, accountNumber: rec.bank_account_no || "", accountName: rec.bank_account_name || "", isPrimary: true }];
  }
  return [];
}

/**
 * Public finder: core en/rw/fr use API payload as-is (rw = manager-approved server merge).
 * Other languages: machine-translate dynamic fields from English (`?lang=en` fetch).
 */
export function useFinderDocBody(lang, rec, T) {
  const r0 = normalizeRec(rec);
  const pmBase = getParentMessageForDisplay(r0, lang, T);
  const [state, setState] = useState(() => ({
    parentMsg: pmBase,
    merged: r0,
    banks: parseBanks(r0),
    busy: false,
  }));

  useEffect(() => {
    const r = normalizeRec(rec);
    const pm0 = getParentMessageForDisplay(r, lang, T);
    const lc = normalizeBabyeyiLang(lang);
    if (isCoreBabyeyiLang(lc)) {
      setState({ parentMsg: pm0, merged: r, banks: parseBanks(r), busy: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, busy: true }));
    (async () => {
      try {
        const parentMsg = pm0.trim() ? await translateLongText(pm0, "en", lc) : "";
        const payments = await Promise.all(
          (r.payments || []).map(async (p) => ({
            ...p,
            name: p.name ? await translateWithLingvaCached(String(p.name), "en", lc) : p.name,
          }))
        );
        const requirements = await Promise.all(
          (r.requirements || []).map(async (x) => ({
            ...x,
            item: x.item ? await translateWithLingvaCached(String(x.item), "en", lc) : x.item,
            description: x.description ? await translateWithLingvaCached(String(x.description), "en", lc) : x.description,
          }))
        );
        const otherInfos = await Promise.all(
          (r.otherInfos || []).map(async (n) => ({
            ...n,
            item: n.item ? await translateWithLingvaCached(String(n.item), "en", lc) : n.item,
            details: n.details ? await translateWithLingvaCached(String(n.details), "en", lc) : n.details,
          }))
        );
        const classNotes = await Promise.all(
          (r.classNotes || []).map(async (n) => ({
            ...n,
            item: n.item ? await translateWithLingvaCached(String(n.item), "en", lc) : n.item,
            details: n.details ? await translateWithLingvaCached(String(n.details), "en", lc) : n.details,
          }))
        );
        const leaders = await Promise.all(
          (r.leaders || []).map(async (l) => ({
            ...l,
            name: l.name ? await translateWithLingvaCached(String(l.name), "en", lc) : l.name,
            role: l.role ? await translateWithLingvaCached(String(l.role), "en", lc) : l.role,
          }))
        );
        const br = parseBanks(r);
        const banks = await Promise.all(
          br.map(async (bk) => ({
            ...bk,
            bankName:
              bk.bankName && String(bk.bankName).trim() && bk.bankName !== "—"
                ? await translateWithLingvaCached(String(bk.bankName), "en", lc)
                : bk.bankName,
            accountName:
              bk.accountName && String(bk.accountName).trim() && bk.accountName !== "—"
                ? await translateWithLingvaCached(String(bk.accountName), "en", lc)
                : bk.accountName,
          }))
        );
        const merged = {
          ...r,
          payments,
          requirements,
          otherInfos,
          classNotes,
          leaders,
          banksJson: JSON.stringify(banks),
        };
        if (!cancelled) setState({ parentMsg, merged, banks, busy: false });
      } catch {
        if (!cancelled) setState({ parentMsg: pm0, merged: r, banks: parseBanks(r), busy: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang, rec, T]);

  return state;
}
