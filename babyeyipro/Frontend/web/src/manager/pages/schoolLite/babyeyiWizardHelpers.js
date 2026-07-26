/** Sentinel value for bank `<select>` when the user enters a custom bank name. */
export const BANK_OTHERS_VALUE = "__others__";

/** Parse leading numeric quantity from strings like "2" or "2 per term". */
export function parseRequirementQuantity(qty) {
  const s = String(qty ?? "").trim();
  const m = s.match(/^(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 1;
}

/** Line total = quantity × unit price (rounded to 2 decimals). */
export function computeRequirementLineTotal(quantity, unitPrice) {
  const q = parseRequirementQuantity(quantity);
  const u = Number(unitPrice) || 0;
  if (u <= 0) return 0;
  return Math.round(q * u * 100) / 100;
}

/** Derive unit price from stored line total when unit_price is missing. */
export function deriveRequirementUnitPrice(quantity, cost) {
  const total = Number(cost) || 0;
  if (total <= 0) return "";
  const q = parseRequirementQuantity(quantity);
  if (q <= 0) return String(total);
  return String(Math.round((total / q) * 100) / 100);
}

export function blankRequirement(overrides = {}) {
  return {
    item: "",
    description: "",
    quantity: "",
    pay_channel: "babyeyi",
    unit_price: "",
    cost: "",
    enabled: true,
    ...overrides,
  };
}

/** Normalize requirement before API save — computes `cost` from qty × unit_price for school lines. */
export function normalizeRequirementForSave(r) {
  const paySchool = String(r?.pay_channel || "").toLowerCase() === "school";
  if (!paySchool) {
    return { ...r, pay_channel: "babyeyi", unit_price: "", cost: "" };
  }
  const unitPrice = Number(r.unit_price) || 0;
  const lineTotal = computeRequirementLineTotal(r.quantity, unitPrice) || Number(r.cost) || 0;
  return {
    ...r,
    pay_channel: "school",
    unit_price: unitPrice > 0 ? unitPrice : "",
    cost: lineTotal > 0 ? String(lineTotal) : "",
  };
}

export function resolveBankNameForSave(bankName, customBankName) {
  const name = String(bankName || "").trim();
  if (name === BANK_OTHERS_VALUE) return String(customBankName || "").trim();
  return name;
}

export function bankSelectValue(bankName, banksList) {
  const name = String(bankName || "").trim();
  if (!name) return "";
  if (banksList.includes(name)) return name;
  return BANK_OTHERS_VALUE;
}

export function bankCustomName(bankName, banksList) {
  const name = String(bankName || "").trim();
  if (!name || name === BANK_OTHERS_VALUE || banksList.includes(name)) return "";
  return name;
}

/** Parse stored school_description (JSON array or legacy newline text). */
export function parseSchoolDescriptionLines(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((l) => (typeof l === "string" ? l : String(l?.text ?? l?.item ?? "")).trim())
      .filter(Boolean);
  }
  const s = String(raw ?? "").trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) {
        return arr.map((l) => String(l ?? "").trim()).filter(Boolean);
      }
    } catch { /* legacy text */ }
  }
  return s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

export function blankSchoolDescriptionLine(text = "") {
  return { text };
}

/** Form rows → JSON string for API / DB. */
export function serializeSchoolDescriptionLines(lines) {
  return JSON.stringify(parseSchoolDescriptionLines(lines));
}

const BABYEYI_DESC_LINE_STYLE =
  'font-family:"Montserrat",sans-serif;font-size:11px;color:#64748b;margin:0 0 2px;line-height:1.35;letter-spacing:0.01em;font-weight:500';

export function isPaidAtSchoolChannel(payChannel) {
  return String(payChannel || "").toLowerCase() === "school";
}

/** Fee + requirement lines marked pay at school (for parent total summary). */
export function collectPaidAtSchoolPaymentLines(payments = [], requirements = []) {
  const lines = [];
  for (const p of payments) {
    if (!isPaidAtSchoolChannel(p?.pay_channel)) continue;
    const amt = Number(p.amount) || 0;
    if (amt > 0) lines.push({ kind: "fee", name: p.name || "—", amount: amt });
  }
  for (const r of requirements) {
    if (!isPaidAtSchoolChannel(r?.pay_channel)) continue;
    const unitPrice = Number(r?.unit_price) || Number(deriveRequirementUnitPrice(r?.quantity, r?.cost)) || 0;
    const lineTotal = Number(r?.cost) || computeRequirementLineTotal(r?.quantity, unitPrice);
    if (lineTotal > 0) {
      lines.push({
        kind: "requirement",
        name: r.item || "—",
        qty: r.quantity,
        amount: lineTotal,
      });
    }
  }
  return lines;
}

export function sumPaidAtSchoolLines(lines) {
  return (lines || []).reduce((s, l) => s + (Number(l.amount) || 0), 0);
}

export function sumPaidAtSchoolTotal(payments = [], requirements = []) {
  return sumPaidAtSchoolLines(collectPaidAtSchoolPaymentLines(payments, requirements));
}

export function formatSchoolDescriptionHtml(linesOrText) {
  const lines = parseSchoolDescriptionLines(linesOrText);
  if (!lines.length) return "";
  return lines
    .map((line) => {
      const esc = String(line).replace(/</g, "&lt;");
      return `<p style="${BABYEYI_DESC_LINE_STYLE}">${esc}</p>`;
    })
    .join("");
}
