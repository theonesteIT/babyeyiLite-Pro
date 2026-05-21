// ================================================================
// BabyeyiList.jsx â€” v10
//
// NEW IN v10:
// â€¢ Language switcher: English ðŸ‡¬ðŸ‡§ | Kinyarwanda ðŸ‡·ðŸ‡¼ | FranÃ§ais ðŸ‡«ðŸ‡·
// â€¢ All static UI labels translated via t() helper
// â€¢ All DB-fetched dynamic data (payment names, requirement items,
//   class notes, other infos, bank names, leader roles, parent message,
//   section headings) translated via Claude API before rendering/PDF
// â€¢ PDF downloads in the selected language
// â€¢ Language persisted in localStorage
// â€¢ Beautiful animated language switcher pill in OfficialDoc toolbar
// ================================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { CreateBabyeyiModal } from "./Babyeyi";

const ASSET_BASE = import.meta.env.VITE_API_URL || "https://babyeyi.rw";
const API_BASE   = `${ASSET_BASE}/api`;
const FRONTEND_ORIGIN = typeof window !== "undefined" ? window.location.origin : "http://localhost:5174";
const verifyUrl       = (docId) => docId ? `${FRONTEND_ORIGIN}/babyeyi/verify/${docId}` : "";

// â”€â”€â”€ TRANSLATION DICTIONARIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LANGS = {
  en: { flag: "ðŸ‡¬ðŸ‡§", name: "English",    code: "en" },
  rw: { flag: "ðŸ‡·ðŸ‡¼", name: "Kinyarwanda", code: "rw" },
  fr: { flag: "ðŸ‡«ðŸ‡·", name: "FranÃ§ais",   code: "fr" },
};

// Static UI label translations
const UI = {
  en: {
    title:              "Babyeyi Records",
    viewBtn:            "View",
    editBtn:            "Edit",
    deleteBtn:          "Delete",
    shareBtn:           "Share",
    pdfBtn:             "PDF",
    backBtn:            "Back",
    searchPlaceholder:  "Search class, term, year, doc IDâ€¦",
    filters:            "Filters",
    clearAll:           "Clear all",
    status:             "Status",
    level:              "Level",
    term:               "Term",
    year:               "Year",
    allOption:          "All",
    newestFirst:        "Newest first",
    oldestFirst:        "Oldest first",
    highestFee:         "Highest fee",
    lowestFee:          "Lowest fee",
    records:            "record",
    recordsPlural:      "records",
    filtered:           "(filtered)",
    loading:            "Loading recordsâ€¦",
    noRecords:          "No records found",
    total:              "Total",
    approved:           "Approved",
    pending:            "Pending",
    rejected:           "Rejected",
    locked:             "Locked",
    verify:             "Verify",
    regen:              "Regen",
    share:              "Share",
    // Document section headings
    secFee:             "Fee Payment Breakdown",
    secBanking:         "Banking Information",
    secRequirements:    "Student Requirements",
    secOtherInfo:       "Other Information",
    secLeadership:      "School Leadership Contacts",
    secClassNotes:      "Class Requirements & Notes",
    secAuth:            "Authorization & Signatures",
    // Table headers
    thNo:               "NÂ°",
    thPaymentItem:      "Payment Item",
    thAmount:           "Amount (RWF)",
    thTotalLabel:       "TOTAL",
    thBank:             "Bank Name",
    thAccount:          "Account Number",
    thAccountName:      "Account Name",
    thPrimary:          "Primary",
    thItem:             "Item",
    thDescription:      "Description",
    thQuantity:         "Quantity",
    thDetails:          "Details",
    thFullName:         "Full Name",
    thRole:             "Role / Title",
    thPhone:            "Phone",
    thEmail:            "Email",
    // Signature box
    sigHeadTeacher:     "Head Teacher",
    sigScanVerify:      "Scan to Verify",
    sigStamp:           "Official Stamp",
    sigCachet:          "Cachet Officiel",
    sigRequired:        "Signature Required",
    sigSigned:          "âœ“ Signed",
    // Doc footer
    docOfficial:        "Official Document â€” DO NOT FALSIFY",
    // Header
    republic:           "Republic of Rwanda Â· Ministry of Education â€” NESA",
    district:           "District",
    sector:             "Sector",
    academicYear:       "Academic Year",
    termLabel:          "Term",
    classLabel:         "Class",
    levelLabel:         "Level",
    // Delete modal
    deleteTitle:        "Delete Babyeyi",
    deleteWarning:      "This cannot be undone",
    cancelBtn:          "Cancel",
    confirmDelete:      "Delete",
    // Translate button
    translating:        "Translatingâ€¦",
    translateDoc:       "Translate Document",
    language:           "Language",
    // Share
    shareDoc:           "Share Document",
    capturing:          "Capturing documentâ€¦",
    whatsapp:           "WhatsApp",
    saveImage:          "Save Image",
  },
  rw: {
    title:              "Inyandiko za Babyeyi",
    viewBtn:            "Reba",
    editBtn:            "Hindura",
    deleteBtn:          "Siba",
    shareBtn:           "Sangira",
    pdfBtn:             "PDF",
    backBtn:            "Subira",
    searchPlaceholder:  "Shakisha ishuri, igihembwe, umwaka, IDâ€¦",
    filters:            "Shungura",
    clearAll:           "Siba byose",
    status:             "Imimerere",
    level:              "Urwego",
    term:               "Igihembwe",
    year:               "Umwaka",
    allOption:          "Byose",
    newestFirst:        "Bishya mbere",
    oldestFirst:        "Byakuze mbere",
    highestFee:         "Amafaranga menshi",
    lowestFee:          "Amafaranga make",
    records:            "inyandiko",
    recordsPlural:      "inyandiko",
    filtered:           "(shunguwe)",
    loading:            "Gutegereza inyandikoâ€¦",
    noRecords:          "Nta nyandiko ibonetse",
    total:              "Igiteranyo",
    approved:           "Yemewe",
    pending:            "Itegerezwa",
    rejected:           "Yananiwe",
    locked:             "Ifunze",
    verify:             "Genzura",
    regen:              "Ongera",
    share:              "Sangira",
    secFee:             "Urutonde rw'Amafaranga",
    secBanking:         "Amakuru y'Banki",
    secRequirements:    "Ibikenewe n'Umunyeshuri",
    secOtherInfo:       "Amakuru Yindi",
    secLeadership:      "Inzego z'Ishuri",
    secClassNotes:      "Amabwiriza y'Icyiciro",
    secAuth:            "Uburenganzira n'Umukono",
    thNo:               "NÂ°",
    thPaymentItem:      "Igice cy'Amafaranga",
    thAmount:           "Amafaranga (RWF)",
    thTotalLabel:       "IGITERANYO",
    thBank:             "Izina rya Banki",
    thAccount:          "Nimero y'Konti",
    thAccountName:      "Izina rya Konti",
    thPrimary:          "Nkuru",
    thItem:             "Igice",
    thDescription:      "Ibisobanuro",
    thQuantity:         "Umubare",
    thDetails:          "Amakuru",
    thFullName:         "Amazina Yose",
    thRole:             "Uruhare",
    thPhone:            "Telefone",
    thEmail:            "Imeli",
    sigHeadTeacher:     "Umuyobozi w'Ishuri",
    sigScanVerify:      "Scan kugenzura",
    sigStamp:           "Kashe y'Ishuri",
    sigCachet:          "Kashe Nyaburanga",
    sigRequired:        "Umukono Urabeho",
    sigSigned:          "âœ“ Urasinywe",
    docOfficial:        "Inyandiko Nyaburanga â€” NTI GUHINDURA",
    republic:           "Repubulika y'u Rwanda Â· Minisiteri y'Uburezi â€” NESA",
    district:           "Akarere",
    sector:             "Umurenge",
    academicYear:       "Umwaka w'Amashuri",
    termLabel:          "Igihembwe",
    classLabel:         "Ishuri",
    levelLabel:         "Urwego",
    deleteTitle:        "Siba Babyeyi",
    deleteWarning:      "Ibi ntishobora gusubirwaho",
    cancelBtn:          "Hagarara",
    confirmDelete:      "Siba",
    translating:        "Guhuza indimiâ€¦",
    translateDoc:       "Huza Indimi",
    language:           "Ururimi",
    shareDoc:           "Sangira Inyandiko",
    capturing:          "Gufata inyandikoâ€¦",
    whatsapp:           "WhatsApp",
    saveImage:          "Bika Ifoto",
  },
  fr: {
    title:              "Dossiers Babyeyi",
    viewBtn:            "Voir",
    editBtn:            "Modifier",
    deleteBtn:          "Supprimer",
    shareBtn:           "Partager",
    pdfBtn:             "PDF",
    backBtn:            "Retour",
    searchPlaceholder:  "Rechercher classe, trimestre, annÃ©e, IDâ€¦",
    filters:            "Filtres",
    clearAll:           "Tout effacer",
    status:             "Statut",
    level:              "Niveau",
    term:               "Trimestre",
    year:               "AnnÃ©e",
    allOption:          "Tous",
    newestFirst:        "Plus rÃ©cent d'abord",
    oldestFirst:        "Plus ancien d'abord",
    highestFee:         "Frais les plus Ã©levÃ©s",
    lowestFee:          "Frais les plus bas",
    records:            "dossier",
    recordsPlural:      "dossiers",
    filtered:           "(filtrÃ©)",
    loading:            "Chargement des dossiersâ€¦",
    noRecords:          "Aucun dossier trouvÃ©",
    total:              "Total",
    approved:           "ApprouvÃ©",
    pending:            "En attente",
    rejected:           "RejetÃ©",
    locked:             "VerrouillÃ©",
    verify:             "VÃ©rifier",
    regen:              "RÃ©gÃ©nÃ©rer",
    share:              "Partager",
    secFee:             "DÃ©tail des Frais de ScolaritÃ©",
    secBanking:         "Informations Bancaires",
    secRequirements:    "Fournitures de l'Ã‰lÃ¨ve",
    secOtherInfo:       "Autres Informations",
    secLeadership:      "Direction de l'Ã‰cole",
    secClassNotes:      "Notes et Exigences de la Classe",
    secAuth:            "Autorisation et Signatures",
    thNo:               "NÂ°",
    thPaymentItem:      "DÃ©signation",
    thAmount:           "Montant (RWF)",
    thTotalLabel:       "TOTAL",
    thBank:             "Nom de la Banque",
    thAccount:          "NumÃ©ro de Compte",
    thAccountName:      "Nom du Compte",
    thPrimary:          "Principal",
    thItem:             "Article",
    thDescription:      "Description",
    thQuantity:         "QuantitÃ©",
    thDetails:          "DÃ©tails",
    thFullName:         "Nom Complet",
    thRole:             "RÃ´le / Titre",
    thPhone:            "TÃ©lÃ©phone",
    thEmail:            "Email",
    sigHeadTeacher:     "Directeur",
    sigScanVerify:      "Scanner pour VÃ©rifier",
    sigStamp:           "Cachet Officiel",
    sigCachet:          "Cachet Officiel",
    sigRequired:        "Signature Requise",
    sigSigned:          "âœ“ SignÃ©",
    docOfficial:        "Document Officiel â€” NE PAS FALSIFIER",
    republic:           "RÃ©publique du Rwanda Â· MinistÃ¨re de l'Ã‰ducation â€” NESA",
    district:           "District",
    sector:             "Secteur",
    academicYear:       "AnnÃ©e AcadÃ©mique",
    termLabel:          "Trimestre",
    classLabel:         "Classe",
    levelLabel:         "Niveau",
    deleteTitle:        "Supprimer Babyeyi",
    deleteWarning:      "Cette action est irrÃ©versible",
    cancelBtn:          "Annuler",
    confirmDelete:      "Supprimer",
    translating:        "Traduction en coursâ€¦",
    translateDoc:       "Traduire le Document",
    language:           "Langue",
    shareDoc:           "Partager le Document",
    capturing:          "Capture du documentâ€¦",
    whatsapp:           "WhatsApp",
    saveImage:          "Enregistrer l'Image",
  },
};

// â”€â”€â”€ CLAUDE TRANSLATION ENGINE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Translates an array of text strings using Claude API
async function translateBatch(texts, targetLang) {
  if (targetLang === "en") return texts; // English is default, no translation needed
  const langName = targetLang === "rw" ? "Kinyarwanda" : "French";

  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const prompt = `Translate the following numbered items to ${langName}. 
These are Rwandan school fee document texts. 
Keep numbers, amounts (RWF), proper names, and school names unchanged.
Return ONLY the translated lines in the same numbered format, nothing else.

${numbered}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const raw  = data.content?.[0]?.text || "";
    // Parse "1. xxx\n2. xxx" back into array
    const lines = raw.trim().split("\n").filter(l => /^\d+\./.test(l.trim()));
    const result = lines.map(l => l.replace(/^\d+\.\s*/, "").trim());
    return result.length === texts.length ? result : texts;
  } catch {
    return texts;
  }
}

// Translate an entire document record's dynamic fields
async function translateRecord(rec, lang) {
  if (lang === "en") return rec;

  // Collect all translatable strings
  const toTranslate = [];
  const map = {}; // key â†’ index in toTranslate

  const add = (key, val) => {
    if (!val || typeof val !== "string" || !val.trim()) return;
    map[key] = toTranslate.length;
    toTranslate.push(val);
  };

  add("parentMessage", rec.parentMessage);
  (rec.payments || []).forEach((p, i) => add(`pay_name_${i}`, p.name));
  (rec.requirements || []).forEach((r, i) => {
    add(`req_item_${i}`, r.item);
    add(`req_desc_${i}`, r.description);
  });
  (rec.classNotes || []).forEach((n, i) => {
    add(`note_item_${i}`, n.item);
    add(`note_details_${i}`, n.details);
  });
  (rec.otherInfos || []).forEach((o, i) => {
    add(`other_item_${i}`, o.item);
    add(`other_details_${i}`, o.details);
  });
  (rec.leaders || []).forEach((l, i) => {
    add(`leader_role_${i}`, l.role);
    add(`leader_name_${i}`, l.name);
  });

  if (toTranslate.length === 0) return rec;

  const translated = await translateBatch(toTranslate, lang);

  const get = (key) => {
    const idx = map[key];
    return idx !== undefined ? (translated[idx] || toTranslate[idx]) : "";
  };

  return {
    ...rec,
    parentMessage: get("parentMessage") || rec.parentMessage,
    payments: (rec.payments || []).map((p, i) => ({ ...p, name: get(`pay_name_${i}`) || p.name })),
    requirements: (rec.requirements || []).map((r, i) => ({
      ...r,
      item:        get(`req_item_${i}`) || r.item,
      description: get(`req_desc_${i}`) || r.description,
    })),
    classNotes: (rec.classNotes || []).map((n, i) => ({
      ...n,
      item:    get(`note_item_${i}`) || n.item,
      details: get(`note_details_${i}`) || n.details,
    })),
    otherInfos: (rec.otherInfos || []).map((o, i) => ({
      ...o,
      item:    get(`other_item_${i}`) || o.item,
      details: get(`other_details_${i}`) || o.details,
    })),
    leaders: (rec.leaders || []).map((l, i) => ({
      ...l,
      role: get(`leader_role_${i}`) || l.role,
      name: get(`leader_name_${i}`) || l.name,
    })),
  };
}

// â”€â”€â”€ LANGUAGE SWITCHER COMPONENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LangSwitcher({ lang, setLang, translating, compact = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const current = LANGS[lang];

  if (compact) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          disabled={translating}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all border"
          style={{
            background: open ? "#1F2937" : "rgba(255,255,255,0.12)",
            color: open ? "#FBBF24" : "white",
            borderColor: open ? "#FBBF24" : "rgba(255,255,255,0.2)",
          }}
        >
          {translating
            ? <span className="w-3 h-3 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
            : <span>{current.flag}</span>
          }
          <span className="hidden sm:inline">{translating ? "â€¦" : current.name}</span>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-1.5 rounded-2xl shadow-2xl overflow-hidden z-50 min-w-[140px]"
            style={{ background: "#1F2937", border: "1px solid rgba(251,191,36,0.25)" }}
          >
            {Object.values(LANGS).map(l => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold transition-all text-left"
                style={{
                  background: lang === l.code ? "rgba(251,191,36,0.15)" : "transparent",
                  color: lang === l.code ? "#FBBF24" : "rgba(255,255,255,0.75)",
                }}
              >
                <span className="text-base">{l.flag}</span>
                <span>{l.name}</span>
                {lang === l.code && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" className="ml-auto">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full pill version
  return (
    <div
      className="flex items-center rounded-xl overflow-hidden border"
      style={{ border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)" }}
    >
      {Object.values(LANGS).map(l => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          disabled={translating}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black transition-all"
          style={{
            background: lang === l.code ? "#FBBF24" : "transparent",
            color: lang === l.code ? "#1F2937" : "rgba(255,255,255,0.6)",
          }}
          title={l.name}
        >
          <span>{l.flag}</span>
          <span className="hidden sm:inline">{l.code.toUpperCase()}</span>
        </button>
      ))}
      {translating && (
        <div className="px-2 flex items-center">
          <span className="w-3 h-3 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const toAssetUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${ASSET_BASE}${path.replace(/\\/g, "/").replace(/^\/?/, "/")}`;
};

async function toBase64(url) {
  if (!url) return null;
  try {
    const abs = url.startsWith("http") ? url : `${ASSET_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
    const res = await fetch(abs, { credentials: "include" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise(r => { const fr = new FileReader(); fr.onloadend = () => r(fr.result); fr.readAsDataURL(blob); });
  } catch { return null; }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script"); s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

function parseBanks(rec) {
  if (rec.banksJson) {
    try {
      const raw = typeof rec.banksJson === "string" ? JSON.parse(rec.banksJson) : rec.banksJson;
      if (Array.isArray(raw) && raw.length > 0) return raw;
    } catch {}
  }
  if (rec.bankName) {
    return [{ bankName: rec.bankName, accountNumber: rec.bankAccountNo || "", accountName: rec.bankAccountName || "", isPrimary: true }];
  }
  return [];
}

// â”€â”€â”€ STYLE CONSTANTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DOC = {
  heading: { fontSize: "14px", fontWeight: 700, color: "#1e3a5f", textTransform: "uppercase", letterSpacing: "0.05em" },
  body:    { fontSize: "12px", color: "#1e293b", lineHeight: "1.7" },
  label:   { fontSize: "12px", color: "#64748b", fontWeight: 600 },
  th:      { padding: "8px 12px", fontSize: "12px", fontWeight: 700, color: "#1e3a5f", borderBottom: "2px solid #1e3a5f", textAlign: "left", background: "transparent" },
  td:      { padding: "7px 12px", fontSize: "12px", color: "#1e293b", borderBottom: "1px solid #e2e8f0", background: "transparent" },
  section: { marginBottom: "22px" },
};

const STATUS = {
  approved:    { label: "Approved",    hex: { bg: "#d1fae5", text: "#047857", dot: "#10b981", border: "#6ee7b7" } },
  pending:     { label: "Pending",     hex: { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b", border: "#fcd34d" } },
  recommended: { label: "Recommended", hex: { bg: "#eff6ff", text: "#1e40af", dot: "#bfdbfe", border: "#bfdbfe" } },
  rejected:    { label: "Rejected",    hex: { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444", border: "#fca5a5" } },
  draft:       { label: "Draft",       hex: { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b", border: "#fcd34d" } },
  submitted:   { label: "Submitted",   hex: { bg: "#eff6ff", text: "#1e40af", dot: "#bfdbfe", border: "#bfdbfe" } },
};

const BLOCKED_STATUSES = new Set(["pending", "draft", "submitted"]);
const isBlocked = (status) => BLOCKED_STATUSES.has(status);

const LEVEL_TW = {
  Nursery:    "bg-pink-100 text-pink-700 border-pink-200",
  Primary:    "bg-blue-100 text-blue-700 border-blue-200",
  Secondary:  "bg-violet-100 text-violet-700 border-violet-200",
  University: "bg-orange-100 text-orange-700 border-orange-200",
};

const PATHS = {
  eye:      "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  edit:     "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:    "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  search:   "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z",
  filter:   "M22 3H2l8 9.46V19l4 2V12.46L22 3z",
  x:        "M18 6L6 18M6 6l12 12",
  chevL:    "M15 18l-6-6 6-6",
  chevD:    "M6 9l6 6 6-6",
  pdf:      "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h3",
  copy:     "M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.09 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  check:    "M20 6L9 17l-5-5",
  qr:       "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM17 17h2v2h-2zM19 19h2v2h-2z",
  refresh:  "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  lock:     "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
  users:    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  phone:    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  mail:     "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  globe:    "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
};

const Ic = ({ n, s = 15, c = "currentColor", sw = 2 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n] || PATHS.eye} />
  </svg>
);

// â”€â”€â”€ QR HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function ensureQRCode(rec) {
  if (!rec?.id) return null;
  try {
    const res  = await fetch(`${API_BASE}/babyeyi/${rec.id}/qrcode`, { credentials: "include" });
    const json = await res.json();
    if (json.success && json.data?.qr_code_url) return { qrUrl: json.data.qr_code_url, vUrl: json.data.qr_view_url || verifyUrl(rec.docId) };
  } catch {}
  try {
    const res  = await fetch(`${API_BASE}/babyeyi/${rec.id}/regenerate-docs`, { method: "POST", credentials: "include" });
    const json = await res.json();
    if (json.success) {
      const qrRes  = await fetch(`${API_BASE}/babyeyi/${rec.id}/qrcode`, { credentials: "include" });
      const qrJson = await qrRes.json();
      if (qrJson.success && qrJson.data?.qr_code_url) return { qrUrl: qrJson.data.qr_code_url, vUrl: qrJson.data.qr_view_url || verifyUrl(rec.docId) };
    }
  } catch {}
  return null;
}

// â”€â”€â”€ BUILD HTML DOC (language-aware) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildWordDocHTML({ rec, totalFee, today, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl, lang = "en" }) {
  const T       = UI[lang] || UI.en;
  const payments   = Array.isArray(rec.payments)     ? rec.payments     : [];
  const classNotes = Array.isArray(rec.classNotes)   ? rec.classNotes   : [];
  const reqs       = Array.isArray(rec.requirements) ? rec.requirements : [];
  const otherInfos = Array.isArray(rec.otherInfos)   ? rec.otherInfos   : [];
  const leaders    = Array.isArray(rec.leaders)      ? rec.leaders      : [];
  const banks      = parseBanks(rec);

  const classesArr = Array.isArray(rec.classes) && rec.classes.length ? rec.classes : [rec.class];
  const classLabel = classesArr.filter(Boolean).join(", ");
  const levelLabel = rec.level || rec.education_level || "";

  const tableStyle = `width:100%;border-collapse:collapse;margin-top:8px`;
  const thStyle    = `padding:8px 12px;font-size:12px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #1e3a5f;text-align:left;background:transparent`;
  const tdStyle    = `padding:7px 12px;font-size:12px;color:#1e293b;border-bottom:1px solid #e2e8f0;background:transparent`;
  const headingStyle = `font-size:14px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.05em`;
  const ruleDiv    = (title) => `<div style="padding-bottom:5px;margin-bottom:12px;margin-top:20px"><span style="${headingStyle}">${title}</span></div>`;

  const parentSection = rec.parentMessage ? `
    <div style="margin-bottom:22px">
      ${ruleDiv("")}
      <div style="padding-left:16px;margin-top:4px">
        <p style="font-size:12px;color:#1e293b;line-height:1.7;white-space:pre-line;margin:0">${rec.parentMessage}</p>
      </div>
    </div>` : "";

  const payRows = payments.map((p, i) => `
    <tr>
      <td style="${tdStyle};text-align:center;color:#64748b;width:42px">${i + 1}</td>
      <td style="${tdStyle}">${p.name || ""}</td>
      <td style="${tdStyle};text-align:right;font-family:monospace;font-weight:600">${Number(p.amount || 0).toLocaleString()}</td>
    </tr>`).join("");

  const paySection = payments.length > 0 ? `
    <div style="margin-bottom:22px">
      ${ruleDiv(T.secFee)}
      <table style="${tableStyle}">
        <thead><tr>
          <th style="${thStyle};width:42px;text-align:center">${T.thNo}</th>
          <th style="${thStyle}">${T.thPaymentItem}</th>
          <th style="${thStyle};text-align:right">${T.thAmount}</th>
        </tr></thead>
        <tbody>${payRows}</tbody>
        <tfoot><tr>
          <td colspan="2" style="padding:9px 12px;font-size:14px;font-weight:700;color:#1e3a5f;border-top:2px solid #1e3a5f">${T.thTotalLabel}</td>
          <td style="padding:9px 12px;font-size:14px;font-weight:700;color:#1e3a5f;border-top:2px solid #1e3a5f;text-align:right;font-family:monospace">RWF ${totalFee.toLocaleString()}</td>
        </tr></tfoot>
      </table>
    </div>` : "";

  const bankRows = banks.map((bk, i) => `
    <tr>
      <td style="${tdStyle};text-align:center;color:#64748b;width:40px">${i + 1}</td>
      <td style="${tdStyle};font-weight:600">${bk.bankName || bk.bank_name || "â€”"}</td>
      <td style="${tdStyle};font-family:monospace">${bk.accountNumber || bk.bank_account_no || "â€”"}</td>
      <td style="${tdStyle}">${bk.accountName || bk.bank_account_name || "â€”"}</td>
      <td style="${tdStyle};text-align:center;color:#059669;font-weight:700">${bk.isPrimary || i === 0 ? "âœ“" : ""}</td>
    </tr>`).join("");

  const banksSection = banks.length > 0 ? `
    <div style="margin-bottom:22px">
      ${ruleDiv(T.secBanking)}
      <table style="${tableStyle}">
        <thead><tr>
          <th style="${thStyle};width:40px;text-align:center">#</th>
          <th style="${thStyle}">${T.thBank}</th>
          <th style="${thStyle}">${T.thAccount}</th>
          <th style="${thStyle}">${T.thAccountName}</th>
          <th style="${thStyle};text-align:center;width:70px">${T.thPrimary}</th>
        </tr></thead>
        <tbody>${bankRows}</tbody>
      </table>
    </div>` : "";

  const reqRows = reqs.map((r, i) => `
    <tr>
      <td style="${tdStyle};text-align:center;color:#64748b;width:42px">${i + 1}</td>
      <td style="${tdStyle}">${(r && r.item) || r || ""}</td>
      <td style="${tdStyle}">${(r && r.description) || ""}</td>
      <td style="${tdStyle};text-align:center">${(r && r.quantity) || ""}</td>
    </tr>`).join("");

  const reqSection = reqs.length > 0 ? `
    <div style="margin-bottom:22px">
      ${ruleDiv(T.secRequirements)}
      <table style="${tableStyle}">
        <thead><tr>
          <th style="${thStyle};width:42px;text-align:center">${T.thNo}</th>
          <th style="${thStyle}">${T.thItem}</th>
          <th style="${thStyle}">${T.thDescription}</th>
          <th style="${thStyle};text-align:center;width:80px">${T.thQuantity}</th>
        </tr></thead>
        <tbody>${reqRows}</tbody>
      </table>
    </div>` : "";

  const otherRows = otherInfos.map((n, i) => `
    <tr>
      <td style="${tdStyle};text-align:center;color:#64748b;width:42px">${i + 1}</td>
      <td style="${tdStyle};font-weight:600">${n.item || ""}</td>
      <td style="${tdStyle}">${n.details || ""}</td>
    </tr>`).join("");

  const otherSection = otherInfos.length > 0 ? `
    <div style="margin-bottom:22px">
      ${ruleDiv(T.secOtherInfo)}
      <table style="${tableStyle}">
        <thead><tr>
          <th style="${thStyle};width:42px;text-align:center">${T.thNo}</th>
          <th style="${thStyle}">${T.thItem}</th>
          <th style="${thStyle}">${T.thDetails}</th>
        </tr></thead>
        <tbody>${otherRows}</tbody>
      </table>
    </div>` : "";

  const leaderRows = leaders.map((l, i) => {
    const phone = l.phone ? `+250 ${l.phone}` : "â€”";
    return `<tr>
      <td style="${tdStyle};text-align:center;color:#64748b;width:36px;font-size:11px">${i + 1}</td>
      <td style="${tdStyle};font-weight:700;color:#1e3a5f">${l.name || "â€”"}</td>
      <td style="${tdStyle};color:#475569">${l.role || "â€”"}</td>
      <td style="${tdStyle};font-family:monospace;font-size:11px">${phone}</td>
      <td style="${tdStyle};font-size:11px;color:#2563eb">${l.email || "â€”"}</td>
    </tr>`;
  }).join("");

  const leadersSection = leaders.length > 0 ? `
    <div style="margin-bottom:22px">
      ${ruleDiv(T.secLeadership)}
      <table style="${tableStyle}">
        <thead><tr>
          <th style="${thStyle};width:36px;text-align:center">${T.thNo}</th>
          <th style="${thStyle}">${T.thFullName}</th>
          <th style="${thStyle}">${T.thRole}</th>
          <th style="${thStyle}">${T.thPhone}</th>
          <th style="${thStyle}">${T.thEmail}</th>
        </tr></thead>
        <tbody>${leaderRows}</tbody>
      </table>
    </div>` : "";

  const noteRows = classNotes.map((n, i) => `
    <tr>
      <td style="${tdStyle};text-align:center;color:#64748b;width:42px">${i + 1}</td>
      <td style="${tdStyle};font-weight:600">${n.item || ""}</td>
      <td style="${tdStyle}">${n.details || "â€”"}</td>
    </tr>`).join("");

  const notesSection = classNotes.length > 0 ? `
    <div style="margin-bottom:22px">
      ${ruleDiv(T.secClassNotes)}
      <table style="${tableStyle}">
        <thead><tr>
          <th style="${thStyle};width:42px;text-align:center">${T.thNo}</th>
          <th style="${thStyle}">${T.thItem}</th>
          <th style="${thStyle}">${T.thDetails}</th>
        </tr></thead>
        <tbody>${noteRows}</tbody>
      </table>
    </div>` : "";

  const qrBlock = qrB64 ? `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="background:white;border:1px solid #e2e8f0;padding:6px;border-radius:6px">
        <img src="${qrB64}" style="width:80px;height:80px;object-fit:contain;display:block"/>
      </div>
      <p style="font-size:10px;color:#1e3a5f;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin:0;text-align:center">${T.sigScanVerify}</p>
      ${rec.docId ? `<p style="font-size:10px;color:#64748b;font-family:monospace;margin:0">ID: ${rec.docId}</p>` : ""}
      ${vUrl ? `<p style="font-size:9px;color:#4f46e5;margin:0;text-align:center;max-width:110px;word-break:break-all">${vUrl}</p>` : ""}
    </div>` : `<div style="width:80px;height:80px;border:1px dashed #e2e8f0;display:flex;align-items:center;justify-content:center"><span style="font-size:20px;opacity:.1">â–£</span></div>`;

  const schoolLogoHtml = schoolLogoB64
    ? `<img src="${schoolLogoB64}" style="width:92px;height:92px;object-fit:contain;display:block"/>`
    : `<div style="width:92px;height:92px;display:flex;align-items:center;justify-content:center;border:1px dashed #e2e8f0"><span style="font-size:8px;color:#64748b;text-align:center;font-weight:700">SCHOOL LOGO</span></div>`;

  const otherLogoHtml = otherLogoB64
    ? `<img src="${otherLogoB64}" style="width:70px;height:70px;object-fit:contain;display:block"/>`
    : "";

  return `
<div style="width:794px;background:#fff;font-family:Georgia,'Times New Roman',serif;color:#1e293b">
  <div style="height:3px;background:#1e3a5f"></div>
  <div style="padding:20px 40px 16px;border-bottom:2px solid #1e3a5f">
    <div style="display:flex;align-items:center;gap:20px">
      <div style="flex-shrink:0;width:110px;height:110px;display:flex;align-items:center;justify-content:center">${schoolLogoHtml}</div>
      <div style="flex:1;text-align:center">
        <p style="font-size:10px;color:#64748b;margin:0 0 2px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600">${T.republic}</p>
        <p style="font-size:9px;color:#64748b;margin:0 0 2px">${T.district}: ${rec.district || "â€”"}</p>
        <p style="font-size:9px;color:#64748b;margin:0 0 6px">${T.sector}: ${rec.sector || "â€”"}</p>
        <h1 style="font-size:17px;font-weight:700;color:#1e3a5f;margin:0 0 6px;text-transform:uppercase;letter-spacing:.03em">${rec.schoolName || ""}</h1>
        <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:center">
          ${[[T.academicYear, rec.academicYear], [T.termLabel, rec.term], [T.levelLabel, levelLabel], [T.classLabel, classLabel]].map(([l, v]) => `<span style="font-size:12px;color:#1e293b"><strong style="color:#1e3a5f">${l}:</strong> ${v || "â€”"}</span>`).join("")}
          ${rec.docId ? `<span style="font-size:11px;font-family:monospace;font-weight:700;color:#3730a3;padding:1px 8px">${rec.docId}</span>` : ""}
        </div>
      </div>
      <div style="flex-shrink:0;width:80px;height:80px;display:flex;align-items:center;justify-content:center;overflow:hidden">${otherLogoHtml}</div>
    </div>
  </div>
  <div style="padding:20px 40px 28px">
    ${parentSection}
    ${paySection}
    ${banksSection}
    ${reqSection}
    ${otherSection}
    ${leadersSection}
    ${notesSection}
    <div style="margin-bottom:22px">
      <div style="border-bottom:1.5px solid #1e3a5f;padding-bottom:5px;margin-bottom:12px;margin-top:20px">
        <span style="font-size:14px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.05em">${T.secAuth}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:12px">
        <div style="border:1px solid #e2e8f0;padding:14px;text-align:center">
          <p style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;margin:0 0 8px">${T.sigHeadTeacher}</p>
          <div style="height:52px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">
            ${sigB64 ? `<img src="${sigB64}" style="max-height:48px;max-width:140px;object-fit:contain"/>` : `<div style="width:100%;height:1px;border-bottom:1px solid #cbd5e1"></div>`}
          </div>
          <p style="font-size:11px;color:#94a3b8;margin:4px 0 0">${sigB64 ? T.sigSigned : T.sigRequired}</p>
        </div>
        <div style="border:1px solid #e2e8f0;padding:14px;display:flex;flex-direction:column;align-items:center;justify-content:center">
          ${qrBlock}
        </div>
        <div style="border:1px solid #e2e8f0;padding:14px;text-align:center">
          <p style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;margin:0 0 8px">${T.sigStamp}</p>
          <div style="width:80px;height:80px;border:1px dashed #e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;margin:0 auto 6px">
            ${stampB64 ? `<img src="${stampB64}" style="width:76px;height:76px;object-fit:contain;border-radius:50%"/>` : `<span style="font-size:22px;opacity:.08">ðŸ”</span>`}
          </div>
          <p style="font-size:11px;color:#94a3b8;margin:0">${T.sigCachet}</p>
        </div>
      </div>
    </div>
  </div>
  <div style="border-top:1px solid #1e3a5f;padding:8px 40px;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:11px;color:#64748b">${rec.schoolName || ""} Â· ${rec.district || ""}</span>
    <span style="font-size:11px;color:#1e3a5f;font-weight:700;text-transform:uppercase">${T.docOfficial}</span>
    <span style="font-size:11px;color:#64748b">Doc: ${rec.docId || "â€”"} Â· ${today}</span>
  </div>
  <div style="height:3px;background:#1e3a5f"></div>
</div>`;
}

// â”€â”€â”€ CAPTURE DOC AS IMAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function captureDocAsImage({ rec, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl, lang = "en" }) {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
  const payments = Array.isArray(rec.payments) ? rec.payments : [];
  const totalFee = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const today    = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const html     = buildWordDocHTML({ rec, totalFee, today, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl, lang });

  const style = document.createElement("style");
  style.textContent = `#__by_c__ * { box-sizing:border-box; color-scheme:light only; } #__by_c__ { all:initial;display:block;background:#fff; }`;
  document.head.appendChild(style);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-9999;";
  const root = document.createElement("div");
  root.id = "__by_c__";
  root.innerHTML = html;
  host.appendChild(root);
  document.body.appendChild(host);
  try {
    await new Promise(r => setTimeout(r, 500));
    const canvas = await window.html2canvas(root, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: "#fff", logging: false });
    return canvas.toDataURL("image/jpeg", 0.95);
  } finally {
    document.body.removeChild(host);
    document.head.removeChild(style);
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// QR CODE PANEL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function QRCodePanel({ rec }) {
  const [qrB64,   setQrB64]   = useState(null);
  const [vUrl,    setVUrl]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    if (!rec?.id) { setLoading(false); return; }
    setLoading(true);
    ensureQRCode(rec).then(async result => {
      if (result) { const b64 = await toBase64(toAssetUrl(result.qrUrl)); setQrB64(b64); setVUrl(result.vUrl); }
    }).finally(() => setLoading(false));
  }, [rec?.id, rec?.docId]);

  if (loading) return (
    <div className="flex flex-col items-center p-4 border border-slate-200 rounded-xl min-w-[130px]">
      <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2" />
      <p className="text-[10px] text-slate-400 font-bold">Loading QRâ€¦</p>
    </div>
  );
  if (!qrB64) return (
    <div className="flex flex-col items-center p-4 border border-dashed border-slate-200 rounded-xl min-w-[130px]">
      <div className="text-3xl opacity-20 mb-2">â–£</div>
      <p className="text-[10px] text-slate-400 font-bold">QR not ready</p>
    </div>
  );
  return (
    <div className="flex flex-col items-center border border-indigo-200 rounded-xl p-3">
      <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-1">
        <Ic n="qr" s={9} c="#6366f1" /> Scan to Verify
      </p>
      <div className="bg-white rounded-lg p-2 border border-indigo-100 shadow-sm mb-2">
        <img src={qrB64} alt="QR Code" className="w-28 h-28 object-contain" />
      </div>
      {rec.docId && <p className="text-[8px] font-mono font-black text-indigo-700 mb-0.5">ID: {rec.docId}</p>}
      {vUrl && <p className="text-[7px] text-indigo-400 text-center mb-2 break-all px-1 max-w-[160px]">{vUrl}</p>}
      <div className="flex gap-1.5">
        <button onClick={() => { navigator.clipboard.writeText(vUrl || "").then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-bold hover:bg-indigo-700">
          <Ic n={copied ? "check" : "copy"} s={9} c="white" />{copied ? "Copied!" : "Copy Link"}
        </button>
        <a href={qrB64} download={`qr-${rec.docId || rec.id}.png`}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-[9px] font-bold hover:bg-indigo-50">
          <Ic n="download" s={9} c="#4f46e5" /> Save
        </a>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// OFFICIAL DOC MODAL â€” with language switcher
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function OfficialDoc({ rec: originalRec, onClose, globalLang }) {
  const [lang, setLang]           = useState(globalLang || "en");
  const [translating, setTranslating] = useState(false);
  const [rec, setRec]             = useState(originalRec);
  const [downloading, setDownloading]   = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [schoolLogoB64, setSchoolLogoB64] = useState(null);
  const [otherLogoB64, setOtherLogoB64]   = useState(null);
  const [sigB64, setSigB64]               = useState(null);
  const [stampB64, setStampB64]           = useState(null);
  const [qrB64, setQrB64]                 = useState(null);
  const [vUrl, setVUrl]                   = useState(null);
  const [showShare, setShowShare]         = useState(false);
  const [qrLoading, setQrLoading]         = useState(true);

  const T        = UI[lang] || UI.en;
  const payments = Array.isArray(rec.payments)     ? rec.payments     : [];
  const totalFee = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const classNotes = Array.isArray(rec.classNotes)   ? rec.classNotes   : [];
  const reqs       = Array.isArray(rec.requirements) ? rec.requirements : [];
  const otherInfos = Array.isArray(rec.otherInfos)   ? rec.otherInfos   : [];
  const leaders    = Array.isArray(rec.leaders)      ? rec.leaders      : [];
  const today      = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const st         = STATUS[rec.status] || STATUS.approved;
  const blocked    = isBlocked(rec.status);
  const banks      = parseBanks(rec);
  const classesArr = Array.isArray(rec.classes) && rec.classes.length ? rec.classes : [rec.class];
  const classLabel = classesArr.filter(Boolean).join(", ");
  const levelLabel = rec.level || rec.education_level || "";

  // Load assets once
  useEffect(() => {
    Promise.all([
      toBase64(toAssetUrl(originalRec.schoolLogoPath)),
      toBase64(toAssetUrl(originalRec.otherLogoPath)),
      toBase64(toAssetUrl(originalRec.signaturePath)),
      toBase64(toAssetUrl(originalRec.stampPath)),
    ]).then(([logo, otherLogo, sig, stamp]) => {
      setSchoolLogoB64(logo); setOtherLogoB64(otherLogo); setSigB64(sig); setStampB64(stamp);
    });
    setQrLoading(true);
    ensureQRCode(originalRec).then(async result => {
      if (result) { const b64 = await toBase64(toAssetUrl(result.qrUrl)); setQrB64(b64); setVUrl(result.vUrl); }
    }).finally(() => setQrLoading(false));
  }, [originalRec.id]);

  // Re-translate when language changes
  useEffect(() => {
    if (lang === "en") { setRec(originalRec); return; }
    setTranslating(true);
    translateRecord(originalRec, lang)
      .then(translated => setRec(translated))
      .finally(() => setTranslating(false));
  }, [lang]);

  // Change language handler (saves to localStorage)
  const handleLangChange = (newLang) => {
    setLang(newLang);
    try { localStorage.setItem("babyeyi_lang", newLang); } catch {}
  };

  const handlePDF = async () => {
    if (blocked) return;
    setDownloading(true);
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      const html  = buildWordDocHTML({ rec, totalFee, today, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl, lang });
      const style = document.createElement("style");
      style.textContent = `#__by_p__ * { box-sizing:border-box; color-scheme:light only; } #__by_p__ { all:initial;display:block;background:#fff; }`;
      document.head.appendChild(style);
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-9999;";
      const root = document.createElement("div");
      root.id = "__by_p__";
      root.innerHTML = html;
      host.appendChild(root);
      document.body.appendChild(host);
      try {
        await new Promise(r => setTimeout(r, 500));
        const canvas = await window.html2canvas(root, { scale: 2, useCORS: true, backgroundColor: "#fff", logging: false, windowWidth: 794 });
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pW = 210, pH = 297;
        const imgH = (canvas.height / canvas.width) * pW;
        if (imgH <= pH) {
          pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pW, imgH);
        } else {
          let yPos = 0, page = 0;
          while (yPos < imgH) {
            if (page > 0) pdf.addPage();
            const srcYPx   = Math.floor((yPos / imgH) * canvas.height);
            const sliceHPx = Math.min(Math.ceil((pH / imgH) * canvas.height), canvas.height - srcYPx);
            if (sliceHPx <= 0) break;
            const sl = document.createElement("canvas");
            sl.width  = canvas.width; sl.height = sliceHPx;
            sl.getContext("2d").drawImage(canvas, 0, srcYPx, canvas.width, sliceHPx, 0, 0, canvas.width, sliceHPx);
            const sliceH = (sliceHPx / canvas.height) * imgH;
            pdf.addImage(sl.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pW, sliceH);
            yPos += pH; page++;
          }
        }
        const langSuffix = lang !== "en" ? `-${lang.toUpperCase()}` : "";
        pdf.save(`Babyeyi-${rec.docId || rec.class}-${rec.term}${langSuffix}.pdf`);
      } finally {
        document.body.removeChild(host); document.head.removeChild(style);
      }
    } catch (e) { alert("PDF error: " + e.message); }
    finally { setDownloading(false); }
  };

  const handleRegen = async () => {
    setRegenerating(true);
    try {
      const res  = await fetch(`${API_BASE}/babyeyi/${originalRec.id}/regenerate-docs`, { method: "POST", credentials: "include" });
      const json = await res.json();
      if (json.success) {
        const result = await ensureQRCode(originalRec);
        if (result) { const b64 = await toBase64(toAssetUrl(result.qrUrl)); setQrB64(b64); setVUrl(result.vUrl); }
      }
    } catch (e) { alert("Error: " + e.message); }
    finally { setRegenerating(false); }
  };

  const tblStyle = { width: "100%", borderCollapse: "collapse", marginTop: "8px" };
  const Th = ({ children, center, w }) => (
    <th style={{ ...DOC.th, textAlign: center ? "center" : "left", width: w || "auto" }}>{children}</th>
  );
  const Td = ({ children, center, mono, bold, color, italic }) => (
    <td style={{ ...DOC.td, textAlign: center ? "center" : "left", fontFamily: mono ? "monospace" : "inherit", fontWeight: bold ? 700 : 400, color: color || DOC.td.color, fontStyle: italic ? "italic" : "normal" }}>{children}</td>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl my-4">
        {/* Toolbar */}
        <div className="bg-slate-900 rounded-t-2xl px-3 sm:px-4 py-3 flex items-center gap-2 flex-wrap">
          <button onClick={onClose} className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex-shrink-0">
            <Ic n="chevL" s={12} c="white" /> {T.backBtn}
          </button>
          <div className="flex-1 min-w-0 hidden sm:block">
            <p className="text-white font-black text-sm truncate">
              {rec.schoolName} â€” {levelLabel} Â· {classLabel} Â· {rec.term} Â· {rec.academicYear}
              {rec.docId && <span className="ml-2 px-2 py-0.5 bg-indigo-600/40 text-indigo-200 rounded text-[8px] font-mono">{rec.docId}</span>}
            </p>
          </div>

          {/* â”€â”€ LANGUAGE SWITCHER â”€â”€ */}
          <LangSwitcher lang={lang} setLang={handleLangChange} translating={translating} compact />

          <span style={{ background: st.hex.bg, color: st.hex.text, border: `1px solid ${st.hex.border}` }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black flex-shrink-0">
            <span style={{ background: st.hex.dot }} className="w-1.5 h-1.5 rounded-full inline-block" />
            {st.label}
          </span>

          {rec.docId && (
            <a href={verifyUrl(rec.docId)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/20 border border-emerald-600/30 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-[10px] font-bold flex-shrink-0">
              <Ic n="shield" s={11} c="currentColor" /> {T.verify}
            </a>
          )}
          <button onClick={handleRegen} disabled={regenerating}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-600/20 border border-violet-600/30 hover:bg-violet-600/30 text-violet-300 rounded-xl text-[10px] font-bold disabled:opacity-50 flex-shrink-0">
            {regenerating ? <span className="w-3 h-3 border-2 border-violet-300/30 border-t-violet-300 rounded-full animate-spin" /> : <Ic n="refresh" s={11} c="currentColor" />}
            {T.regen}
          </button>

          {blocked ? (
            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-700 text-slate-400 rounded-xl text-[10px] font-bold cursor-not-allowed flex-shrink-0">
              <Ic n="lock" s={11} c="currentColor" /> {T.locked}
            </div>
          ) : (
            <button onClick={() => setShowShare(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#25D366,#128C7E)", color: "white" }}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {T.share}
            </button>
          )}

          {blocked ? (
            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-700 text-slate-400 rounded-xl text-[10px] font-bold cursor-not-allowed flex-shrink-0">
              <Ic n="lock" s={11} c="currentColor" /> {T.pdfBtn}
            </div>
          ) : (
            <button onClick={handlePDF} disabled={downloading || translating}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white rounded-xl text-[10px] font-bold flex-shrink-0">
              {downloading ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Ic n="pdf" s={11} c="white" />}
              {T.pdfBtn} {lang !== "en" ? `(${LANGS[lang]?.flag})` : ""}
            </button>
          )}
        </div>

        {/* Translation indicator banner */}
        {translating && (
          <div className="px-4 py-2 flex items-center gap-2 text-[10px] font-bold"
            style={{ background: "rgba(251,191,36,0.12)", borderBottom: "1px solid rgba(251,191,36,0.2)", color: "#92620a" }}>
            <span className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            {T.translating} ({LANGS[lang]?.name})
          </div>
        )}

        {blocked && (
          <div className="bg-amber-900/30 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2">
            <Ic n="lock" s={12} c="#f59e0b" />
            <p className="text-amber-300 text-[10px] font-bold">
              PDF and WhatsApp are <strong>locked</strong> until status is <strong>Approved</strong>.
            </p>
          </div>
        )}

        {/* â”€â”€ DOCUMENT BODY â”€â”€ */}
        <div className="bg-white shadow-2xl rounded-b-2xl overflow-hidden" style={{ fontFamily: "Georgia,'Times New Roman',serif", opacity: translating ? 0.6 : 1, transition: "opacity 0.3s" }}>
          <div style={{ height: "3px", background: "#1e3a5f" }} />

          {/* HEADER */}
          <div style={{ padding: "20px 40px 16px", borderBottom: "2px solid #1e3a5f" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ flexShrink: 0, width: "110px", height: "110px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {schoolLogoB64
                  ? <img src={schoolLogoB64} style={{ width: "110px", height: "110px", objectFit: "contain" }} alt="School Logo" />
                  : <span style={{ fontSize: "8px", color: "#64748b", textAlign: "center", fontWeight: 700, padding: "4px", lineHeight: "1.4" }}>SCHOOL LOGO</span>}
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <p style={{ fontSize: "10px", color: "#64748b", margin: "0", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, lineHeight: "1.8" }}>{T.republic}</p>
                <p style={{ fontSize: "10px", color: "#64748b", margin: "0", lineHeight: "1.8" }}>{T.district}: <strong style={{ color: "#1e3a5f" }}>{rec.district || "â€”"}</strong></p>
                <p style={{ fontSize: "10px", color: "#64748b", margin: "0 0 6px", lineHeight: "1.8" }}>{T.sector}: <strong style={{ color: "#1e3a5f" }}>{rec.sector || "â€”"}</strong></p>
                <h1 style={{ fontSize: "17px", fontWeight: 700, color: "#1e3a5f", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: ".03em" }}>{rec.schoolName}</h1>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
                  {[[T.academicYear, rec.academicYear], [T.termLabel, rec.term], [T.levelLabel, levelLabel], [T.classLabel, classLabel]].map(([l, v], i) => (
                    <span key={i} style={DOC.body}><strong style={{ color: "#1e3a5f" }}>{l}:</strong> {v || "â€”"}</span>
                  ))}
                  {rec.docId && (
                    <span style={{ ...DOC.body, fontFamily: "monospace", fontWeight: 700, color: "#3730a3", border: "1px solid #c7d2fe", padding: "1px 8px" }}>{rec.docId}</span>
                  )}
                </div>
              </div>
              <div style={{ flexShrink: 0, width: "84px", height: "84px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {otherLogoB64 && <img src={otherLogoB64} style={{ width: "80px", height: "80px", objectFit: "contain" }} alt="Other Logo" />}
              </div>
            </div>
          </div>

          {/* BODY CONTENT */}
          <div style={{ padding: "20px 40px 28px" }}>
            {rec.parentMessage && (
              <div style={DOC.section}>
                <div style={{ paddingLeft: "16px", marginTop: "4px" }}>
                  <p style={{ ...DOC.body, whiteSpace: "pre-line", margin: 0 }}>{rec.parentMessage}</p>
                </div>
              </div>
            )}

            {payments.length > 0 && (
              <div style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secFee}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="42px" center>{T.thNo}</Th><Th>{T.thPaymentItem}</Th><Th>{T.thAmount}</Th></tr></thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={i}>
                        <Td center color="#64748b">{i + 1}</Td>
                        <Td>{p.name}</Td>
                        <td style={{ ...DOC.td, textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>{Number(p.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} style={{ padding: "9px 12px", fontSize: "14px", fontWeight: 700, color: "#1e3a5f", borderTop: "2px solid #1e3a5f" }}>{T.thTotalLabel}</td>
                      <td style={{ padding: "9px 12px", fontSize: "14px", fontWeight: 700, color: "#1e3a5f", borderTop: "2px solid #1e3a5f", textAlign: "right", fontFamily: "monospace" }}>RWF {totalFee.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {banks.length > 0 && (
              <div style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secBanking}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="40px" center>#</Th><Th>{T.thBank}</Th><Th>{T.thAccount}</Th><Th>{T.thAccountName}</Th><Th w="80px" center>{T.thPrimary}</Th></tr></thead>
                  <tbody>
                    {banks.map((bk, i) => (
                      <tr key={i}>
                        <Td center color="#64748b">{i + 1}</Td>
                        <Td bold>{bk.bankName || bk.bank_name || "â€”"}</Td>
                        <Td mono>{bk.accountNumber || bk.bank_account_no || "â€”"}</Td>
                        <Td>{bk.accountName || bk.bank_account_name || "â€”"}</Td>
                        <Td center color="#059669" bold>{bk.isPrimary || i === 0 ? "âœ“" : ""}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reqs.length > 0 && (
              <div style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secRequirements}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="42px" center>{T.thNo}</Th><Th>{T.thItem}</Th><Th>{T.thDescription}</Th><Th w="80px" center>{T.thQuantity}</Th></tr></thead>
                  <tbody>
                    {reqs.map((r, i) => (
                      <tr key={i}>
                        <Td center color="#64748b">{i + 1}</Td>
                        <Td>{(r && r.item) || r}</Td>
                        <Td>{r && r.description}</Td>
                        <Td center>{r && r.quantity}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {otherInfos.length > 0 && (
              <div style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secOtherInfo}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="42px" center>{T.thNo}</Th><Th>{T.thItem}</Th><Th>{T.thDetails}</Th></tr></thead>
                  <tbody>
                    {otherInfos.map((n, i) => (
                      <tr key={i}><Td center color="#64748b">{i + 1}</Td><Td bold>{n.item || ""}</Td><Td>{n.details || ""}</Td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {leaders.length > 0 && (
              <div style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secLeadership}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="36px" center>#</Th><Th>{T.thFullName}</Th><Th>{T.thRole}</Th><Th>{T.thPhone}</Th><Th>{T.thEmail}</Th></tr></thead>
                  <tbody>
                    {leaders.map((l, i) => (
                      <tr key={l.id || i}>
                        <Td center color="#64748b">{i + 1}</Td>
                        <Td bold color="#1e3a5f">{l.name || "â€”"}</Td>
                        <Td italic color="#475569">{l.role || "â€”"}</Td>
                        <td style={{ ...DOC.td, fontFamily: "monospace", fontSize: "11px" }}>{l.phone ? `+250 ${l.phone}` : "â€”"}</td>
                        <td style={{ ...DOC.td, fontSize: "11px", color: "#2563eb" }}>{l.email || "â€”"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {classNotes.length > 0 && (
              <div style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secClassNotes}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="42px" center>{T.thNo}</Th><Th>{T.thItem}</Th><Th>{T.thDetails}</Th></tr></thead>
                  <tbody>
                    {classNotes.map((n, i) => (
                      <tr key={i}><Td center color="#64748b">{i + 1}</Td><Td bold>{n.item || ""}</Td><Td>{n.details || "â€”"}</Td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Authorization & Signatures */}
            <div style={DOC.section}>
              <div style={{ borderBottom: "1.5px solid #1e3a5f", paddingBottom: "5px", marginBottom: "12px" }}>
                <span style={DOC.heading}>{T.secAuth}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginTop: "12px" }}>
                <div style={{ border: "1px solid #e2e8f0", padding: "14px", textAlign: "center" }}>
                  <p style={{ ...DOC.label, textTransform: "uppercase", fontSize: "11px", margin: "0 0 8px" }}>{T.sigHeadTeacher}</p>
                  <div style={{ height: "52px", borderBottom: "1px solid #cbd5e1", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "4px", marginBottom: "6px" }}>
                    {sigB64 && <img src={sigB64} style={{ maxHeight: "48px", maxWidth: "140px", objectFit: "contain" }} alt="Sig" />}
                  </div>
                  <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>{sigB64 ? T.sigSigned : T.sigRequired}</p>
                </div>
                <div style={{ border: "1px solid #e2e8f0", padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  {qrB64 ? (
                    <>
                      <div style={{ background: "white", border: "1px solid #e2e8f0", padding: "4px", borderRadius: "4px" }}>
                        <img src={qrB64} style={{ width: "80px", height: "80px", objectFit: "contain", display: "block" }} alt="QR" />
                      </div>
                      <p style={{ fontSize: "10px", color: "#1e3a5f", fontWeight: 700, margin: "6px 0 0", textTransform: "uppercase", letterSpacing: ".05em" }}>{T.sigScanVerify}</p>
                      {rec.docId && <p style={{ fontSize: "10px", color: "#64748b", margin: "2px 0 0", fontFamily: "monospace" }}>ID: {rec.docId}</p>}
                      {vUrl && <p style={{ fontSize: "9px", color: "#4f46e5", margin: "2px 0 0", textAlign: "center", maxWidth: "110px", wordBreak: "break-all" }}>{vUrl}</p>}
                    </>
                  ) : qrLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #e0e7ff", borderTopColor: "#4f46e5", animation: "spin .8s linear infinite" }} />
                      <span style={{ fontSize: "10px", color: "#4f46e5", fontWeight: 700 }}>Generatingâ€¦</span>
                    </div>
                  ) : (
                    <div style={{ width: 80, height: 80, border: "1px dashed #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "22px", opacity: .1 }}>â–£</span>
                    </div>
                  )}
                </div>
                <div style={{ border: "1px solid #e2e8f0", padding: "14px", textAlign: "center" }}>
                  <p style={{ ...DOC.label, textTransform: "uppercase", fontSize: "11px", margin: "0 0 8px" }}>{T.sigStamp}</p>
                  <div style={{ width: "80px", height: "80px", border: "1px dashed #e2e8f0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", margin: "0 auto 6px" }}>
                    {stampB64 ? <img src={stampB64} style={{ width: "76px", height: "76px", objectFit: "contain", borderRadius: "50%" }} alt="Stamp" /> : <span style={{ fontSize: "22px", opacity: .08 }}>ðŸ”</span>}
                  </div>
                  <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>{T.sigCachet}</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: "3px", background: "#1e3a5f" }} />
        </div>
      </div>

      {showShare && !blocked && (
        <ShareModal rec={rec} onClose={() => setShowShare(false)} schoolLogoB64={schoolLogoB64} otherLogoB64={otherLogoB64} sigB64={sigB64} stampB64={stampB64} qrB64={qrB64} vUrl={vUrl} lang={lang} T={T} />
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SHARE MODAL (language-aware)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function ShareModal({ rec, onClose, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl, lang = "en", T }) {
  const labels = T || UI[lang] || UI.en;
  const [step,   setStep]   = useState("capturing");
  const [imgUrl, setImgUrl] = useState(null);
  const [errMsg, setErrMsg] = useState(null);
  const shareVerifyUrl = vUrl || verifyUrl(rec.docId);

  useEffect(() => {
    captureDocAsImage({ rec, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl: shareVerifyUrl, lang })
      .then(url => { setImgUrl(url); setStep("ready"); })
      .catch(e  => { setErrMsg(e.message); setStep("error"); });
  }, []);

  const downloadImage = () => {
    if (!imgUrl) return;
    const a = document.createElement("a");
    a.href = imgUrl;
    const langSuffix = lang !== "en" ? `-${lang.toUpperCase()}` : "";
    a.download = `Babyeyi-${rec.docId || rec.class}-${rec.term}${langSuffix}.jpg`;
    a.click();
  };

  const shareWhatsApp = async () => {
    if (!imgUrl || step !== "ready") return;
    const res  = await fetch(imgUrl);
    const blob = await res.blob();
    const file = new File([blob], `Babyeyi-${rec.docId || rec.id}.jpg`, { type: "image/jpeg" });
    const caption = `Verify: ${shareVerifyUrl}`;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Babyeyi Document", text: caption }); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    downloadImage();
    setTimeout(() => { window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, "_blank"); }, 700);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(10px)" }}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl bg-white"
        style={{ maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "linear-gradient(135deg,#1e3a5f,#1d4ed8)", padding: "18px 20px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>ðŸ“¤</div>
              <div>
                <p style={{ color: "white", fontWeight: 900, fontSize: 14, margin: 0 }}>{labels.shareDoc}</p>
                <p style={{ color: "rgba(255,255,255,.6)", fontSize: 11, margin: 0 }}>{rec.class} Â· {rec.docId || rec.id} Â· {LANGS[lang]?.flag} {LANGS[lang]?.name}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 15, background: "rgba(255,255,255,.15)", border: "none", cursor: "pointer", color: "white", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>âœ•</button>
          </div>
        </div>
        <div style={{ padding: "16px 18px", flex: 1, overflowY: "auto" }}>
          <div style={{ marginBottom: 12, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0", minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
            {step === "capturing" && (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{ width: 32, height: 32, borderRadius: 16, border: "3px solid #e2e8f0", borderTopColor: "#1e3a5f", animation: "spin .8s linear infinite", margin: "0 auto 8px" }} />
                <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>{labels.capturing}</p>
              </div>
            )}
            {step === "error" && <p style={{ color: "#ef4444", fontSize: 12, textAlign: "center", padding: 16 }}>âŒ {errMsg}</p>}
            {step === "ready" && imgUrl && (
              <img src={imgUrl} style={{ width: "100%", display: "block", maxHeight: 280, objectFit: "cover", objectPosition: "top" }} alt="Document preview" />
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={shareWhatsApp} disabled={step !== "ready"}
              style={{ padding: "13px 10px", background: step === "ready" ? "linear-gradient(135deg,#25D366,#128C7E)" : "#e5e7eb", border: "none", borderRadius: 14, color: "white", fontSize: 13, fontWeight: 800, cursor: step === "ready" ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {labels.whatsapp}
            </button>
            <button onClick={downloadImage} disabled={step !== "ready"}
              style={{ padding: "13px 10px", background: step === "ready" ? "linear-gradient(135deg,#0ea5e9,#06b6d4)" : "#e5e7eb", border: "none", borderRadius: 14, color: "white", fontSize: 13, fontWeight: 800, cursor: step === "ready" ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Ic n="download" s={16} c="white" /> {labels.saveImage}
            </button>
          </div>
        </div>
        <div style={{ padding: "12px 18px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <button onClick={onClose} style={{ width: "100%", padding: "11px", background: "white", border: "2px solid #e2e8f0", borderRadius: 12, fontWeight: 700, fontSize: 13, color: "#64748b", cursor: "pointer" }}>{labels.cancelBtn}</button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EDIT WIZARD MODAL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function EditWizardModal({ rec, session, onClose, onSaved }) {
  return (
    <CreateBabyeyiModal
      key={rec.id}
      session={session}
      isOpen
      editRecord={rec}
      onClose={onClose}
      onSuccess={() => { if (onSaved) onSaved(rec); onClose(); }}
    />
  );
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// BABYEYI CARD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function BabyeyiCard({ rec, onView, onEdit, onDelete, onShare, T }) {
  const st      = STATUS[rec.status] || STATUS.pending;
  const lv      = LEVEL_TW[rec.level] || LEVEL_TW.Primary;
  const classes = Array.isArray(rec.classes) && rec.classes.length ? rec.classes : [rec.class];
  const payments = Array.isArray(rec.payments) ? rec.payments : [];
  const fee     = rec.totalFee ?? payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const over    = rec.exceedsLimit ? fee - (rec.nesaLimit || 0) : 0;
  const blocked = isBlocked(rec.status);
  const lCount  = rec.leadersCount || 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 overflow-hidden">
      <div className={`h-1 w-full ${rec.status === "approved" ? "bg-gradient-to-r from-emerald-400 to-teal-400" : rec.status === "rejected" ? "bg-gradient-to-r from-red-400 to-rose-400" : "bg-gradient-to-r from-amber-400 to-orange-400"}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 bg-amber-800 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
              <span className="text-white font-black text-[11px] text-center leading-tight">{classes.join(", ")}</span>
            </div>
            <div className="min-w-0">
              <p className="font-black text-slate-800 text-sm truncate">{rec.term} Â· {rec.academicYear}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black border ${lv}`}>{rec.level}</span>
                {rec.docId && <span className="inline-flex px-1.5 py-0.5 rounded font-mono text-[7.5px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">{rec.docId}</span>}
                {blocked && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-amber-50 text-amber-700 border border-amber-200"><Ic n="lock" s={8} c="#b45309" /> {T.locked}</span>}
                {lCount > 0 && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-slate-50 text-slate-600 border border-slate-200"><Ic n="users" s={8} c="#475569" /> {lCount}</span>}
              </div>
            </div>
          </div>
          <span style={{ background: st.hex.bg, color: st.hex.text, border: `1px solid ${st.hex.border}` }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black shrink-0">
            <span style={{ background: st.hex.dot }} className="w-1.5 h-1.5 rounded-full inline-block" />
            {st.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className={`rounded-xl px-3 py-2 border ${rec.exceedsLimit ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{T.total}</p>
            <p className={`text-sm font-black font-mono ${rec.exceedsLimit ? "text-red-700" : "text-emerald-700"}`}>{fee.toLocaleString()} RWF</p>
            {rec.exceedsLimit && <p className="text-[8px] text-red-600 font-semibold">+{over.toLocaleString()} over NESA</p>}
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Bank</p>
            <p className="text-[10px] font-bold text-slate-700 truncate">{rec.bankName || "â€”"}</p>
            {rec.bankAccountNo && <p className="text-[8px] text-slate-400 font-mono truncate">{rec.bankAccountNo}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <button onClick={() => onView(rec)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-all active:scale-95">
            <Ic n="eye" s={13} c="white" /> {T.viewBtn}
          </button>
          <button onClick={() => onEdit(rec)} className="flex items-center justify-center w-9 h-9 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-all border border-amber-200" title={T.editBtn}>
            <Ic n="edit" s={14} c="#b45309" />
          </button>
          {blocked ? (
            <div title={T.locked} className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed">
              <Ic n="lock" s={13} />
            </div>
          ) : (
            <button onClick={() => onShare(rec)} className="flex items-center justify-center w-9 h-9 rounded-xl transition-all" style={{ background: "#dcfce7", color: "#16a34a" }}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="#16a34a"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </button>
          )}
          {blocked ? (
            <div title={T.locked} className="flex items-center justify-center w-9 h-9 bg-slate-100 text-slate-400 rounded-xl cursor-not-allowed">
              <Ic n="lock" s={13} />
            </div>
          ) : (
            <button onClick={() => onView(rec)} className="flex items-center justify-center w-9 h-9 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-xl transition-all">
              <Ic n="pdf" s={14} />
            </button>
          )}
          <button onClick={() => onDelete(rec)} className="flex items-center justify-center w-9 h-9 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all">
            <Ic n="trash" s={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ DATA HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const mapRow = (row) => {
  let paymentsArr = [];
  try {
    const raw = row.payments;
    if (Array.isArray(raw)) paymentsArr = raw;
    else if (typeof raw === "string" && raw.startsWith("[")) paymentsArr = JSON.parse(raw);
  } catch {}
  const totalFee = row.total_fee ?? row.total_amount ?? paymentsArr.reduce((s, p) => s + Number(p.amount || 0), 0);
  let classes = [];
  try {
    if (row.classes_json) {
      const raw = typeof row.classes_json === "string" ? JSON.parse(row.classes_json) : row.classes_json;
      if (Array.isArray(raw)) classes = raw;
    }
  } catch {}
  return {
    id:              row.id,
    class:           row.class_name || row.class || (classes[0] || ""),
    classes,
    level:           row.education_level || row.level || "Primary",
    term:            row.term || "",
    academicYear:    row.academic_year || "",
    status:          row.status || "draft",
    totalFee:        Number(totalFee || 0),
    nesaLimit:       row.nesa_limit != null ? Number(row.nesa_limit) : null,
    exceedsLimit:    !!row.exceeds_limit,
    schoolName:      row.school_name || "",
    district:        row.school_district || row.district || "",
    sector:          row.school_sector || row.sector || "",
    createdAt:       row.created_at || "",
    bankName:        row.bank_name || "",
    bankAccountNo:   row.bank_account_no || "",
    bankAccountName: row.bank_account_name || "",
    banksJson:       row.banks_json || null,
    parentMessage:   row.parent_message || "",
    docId:           row.doc_id || null,
    schoolLogoPath:  row.school_logo_url || null,
    otherLogoPath:   row.other_logo_url || null,
    qrCodeUrl:       row.qr_code_url || row.qr_code_path || null,
    qrViewUrl:       row.qr_view_url || null,
    pdfPath:         row.pdf_url || row.pdf_path || null,
    signaturePath:   null,
    stampPath:       null,
    payments:        paymentsArr,
    requirements:    [],
    classNotes:      [],
    otherInfos:      [],
    leaders:         Array.isArray(row.leaders) ? row.leaders : [],
    leadersCount:    Array.isArray(row.leaders) ? row.leaders.length : 0,
    increaseRequest: null,
  };
};

async function loadFullRecord(sumRec) {
  const res  = await fetch(`${API_BASE}/babyeyi/${sumRec.id}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Failed");
  const d = json.data, sig = d.signatures || {};

  let payments = (d.payments || []).map(p => ({ name: p.name, amount: Number(p.amount || 0) }));
  if (!payments.length && d.payments_json) { try { payments = JSON.parse(d.payments_json); } catch {} }
  const norm = (p) => p ? p.replace(/\\/g, "/") : null;
  const allClassReqs = (d.class_requirements || []).map(r => ({ item: r.item || r.information || "", details: r.details || "" }));
  const classNotes = allClassReqs.filter(r => r.details && r.details.trim());
  const otherInfos = allClassReqs.filter(r => !r.details || !r.details.trim());

  let leaders = [];
  if (Array.isArray(d.leaders) && d.leaders.length > 0) leaders = d.leaders;
  else {
    try {
      const lRes  = await fetch(`${API_BASE}/babyeyi/${sumRec.id}/leaders`, { credentials: "include" });
      const lJson = await lRes.json();
      if (lJson.success && Array.isArray(lJson.data)) leaders = lJson.data;
    } catch {}
  }

  return {
    ...sumRec, payments,
    requirements: (d.student_requirements || []).map(r => ({
      item: r.item,
      description: r.description || "",
      quantity: r.quantity || "",
      pay_channel: String(r.pay_channel || r.payChannel || "").toLowerCase() === "school" ? "school" : "babyeyi",
      cost: r.cost != null && r.cost !== "" ? String(r.cost) : "",
    })),
    classNotes, otherInfos, leaders, leadersCount: leaders.length,
    increaseRequest: d.increase_request ? { requestTitle: d.increase_request.request_title || d.increase_request.reason, nesaStatus: d.increase_request.nesa_status } : null,
    signaturePath:  norm(sig.director_sig_path) || null,
    stampPath:      norm(sig.stamp_path) || null,
    schoolLogoPath: norm(sig.school_logo_path) || norm(sumRec.schoolLogoPath) || null,
    otherLogoPath:  norm(sig.other_logo_path)  || norm(sumRec.otherLogoPath)  || null,
    qrCodeUrl:      norm(sig.qr_code_path) || norm(d.qr_code_path) || norm(d.qr_code_url) || null,
    qrViewUrl:      sig.qr_view_url || d.qr_view_url || null,
    pdfPath:        norm(d.pdf_path) || norm(d.pdf_url) || null,
    docId:          d.doc_id || sumRec.docId || null,
    totalFee:       Number(d.total_fee || d.total_amount || payments.reduce((s, p) => s + Number(p.amount || 0), 0) || 0),
    parentMessage:  d.parent_message || sumRec.parentMessage || "",
    banksJson:      d.banks_json || sumRec.banksJson || null,
  };
}

function DeleteModal({ rec, onConfirm, onCancel, T }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-5 py-4">
          <p className="font-black text-white text-sm">{T.deleteTitle}</p>
          <p className="text-white/70 text-[10px]">{T.deleteWarning}</p>
        </div>
        <div className="p-5">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 my-3">
            <p className="font-black text-slate-800">{rec.class} Â· {rec.term} Â· {rec.academicYear}</p>
            {rec.docId && <p className="text-[9px] font-mono text-indigo-600 mt-1">{rec.docId}</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 px-4 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50">{T.cancelBtn}</button>
            <button onClick={() => onConfirm(rec.id)} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:opacity-90">{T.confirmDelete}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export default function BabyeyiList({ session }) {
  const schoolId = session?.schoolId ?? null;

  // Language â€” persisted in localStorage
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("babyeyi_lang") || "en"; } catch { return "en"; }
  });
  const T = UI[lang] || UI.en;

  const handleLangChange = (newLang) => {
    setLang(newLang);
    try { localStorage.setItem("babyeyi_lang", newLang); } catch {}
  };

  const [records,     setRecords]     = useState([]);
  const [viewing,     setViewing]     = useState(null);
  const [editing,     setEditing]     = useState(null);
  const [deleting,    setDeleting]    = useState(null);
  const [sharing,     setSharing]     = useState(null);
  const [toast,       setToast]       = useState(null);
  const [search,      setSearch]      = useState("");
  const [filters,     setFilters]     = useState({ status: "", level: "", term: "", year: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy,      setSortBy]      = useState("date_desc");
  const [loading,     setLoading]     = useState(true);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let url = `${API_BASE}/babyeyi?limit=200`;
        if (schoolId) url += `&school_id=${schoolId}`;
        const res  = await fetch(url, { credentials: "include" });
        const json = await res.json();
        setRecords((json.data || []).map(mapRow));
      } catch { showToast("Failed to load records", "error"); }
      finally { setLoading(false); }
    })();
  }, [schoolId]);

  const handleDelete = async (id) => {
    try {
      const res  = await fetch(`${API_BASE}/babyeyi/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || "Failed");
      setRecords(r => r.filter(x => x.id !== id));
      setDeleting(null);
      showToast("Babyeyi deleted");
    } catch (e) { showToast(e.message || "Failed", "error"); }
  };

  const handleView = async (sumRec) => {
    try { setViewing(await loadFullRecord(sumRec)); }
    catch (e) { showToast(e.message || "Failed to open", "error"); }
  };

  const handleEdit = async (sumRec) => {
    showToast("Loading recordâ€¦", "info");
    try {
      const full = await loadFullRecord(sumRec);
      setToast(null);
      setEditing(full);
    } catch (e) { showToast(e.message || "Failed to load for edit", "error"); }
  };

  const handleSaved = (updatedRec) => {
    setRecords(r => r.map(x => x.id === updatedRec.id ? { ...x, ...updatedRec } : x));
    showToast("Babyeyi updated successfully!");
  };

  const handleShare = async (sumRec) => {
    if (isBlocked(sumRec.status)) { showToast("Sharing locked until approved.", "error"); return; }
    showToast("Loading documentâ€¦", "info");
    try {
      const full = await loadFullRecord(sumRec);
      setToast(null);
      setSharing(full);
    } catch (e) { showToast(e.message || "Failed to load", "error"); }
  };

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    if (q && !r.class.toLowerCase().includes(q) && !r.term.toLowerCase().includes(q)
      && !r.academicYear.includes(q) && !(r.docId || "").toLowerCase().includes(q)) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.level  && r.level  !== filters.level)  return false;
    if (filters.term   && r.term   !== filters.term)   return false;
    if (filters.year   && r.academicYear !== filters.year) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "date_desc") return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === "date_asc")  return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === "fee_desc")  return b.totalFee - a.totalFee;
    if (sortBy === "fee_asc")   return a.totalFee - b.totalFee;
    return 0;
  });

  const stats = {
    total:    records.length,
    approved: records.filter(r => r.status === "approved").length,
    pending:  records.filter(r => ["pending", "draft", "submitted"].includes(r.status)).length,
    rejected: records.filter(r => r.status === "rejected").length,
  };
  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100">
      {viewing && <OfficialDoc rec={viewing} onClose={() => setViewing(null)} globalLang={lang} />}
      {editing && <EditWizardModal rec={editing} session={session} onClose={() => setEditing(null)} onSaved={(u) => { handleSaved(u); setEditing(null); }} />}
      {deleting && <DeleteModal rec={deleting} onConfirm={handleDelete} onCancel={() => setDeleting(null)} T={T} />}
      {sharing && !isBlocked(sharing.status) && (
        <ShareModal rec={sharing} onClose={() => setSharing(null)} schoolLogoB64={null} otherLogoB64={null} sigB64={null} stampB64={null} qrB64={null} vUrl={sharing.qrViewUrl || verifyUrl(sharing.docId)} lang={lang} T={T} />
      )}

      {!schoolId && (
        <div className="bg-red-600 text-white text-center text-xs font-bold py-2 px-4">
          School session not found. Please log out and log back in.
        </div>
      )}

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 max-w-xs ${toast.type === "success" ? "bg-emerald-600 text-white" : toast.type === "info" ? "bg-indigo-600 text-white" : "bg-red-600 text-white"}`}
          style={{ animation: "slideIn .3s ease-out" }}>
          {toast.type === "success" ? "âœ…" : toast.type === "info" ? "â„¹ï¸" : "âŒ"} {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes slideIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .card-enter{animation:fadeUp .3s ease-out both}
      `}</style>

      {/* â”€â”€ HEADER â”€â”€ */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 sm:px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center">
                <span className="text-xl">ðŸ“‹</span>
              </div>
              <div>
                <h1 className="font-black text-white text-lg sm:text-xl">{T.title}</h1>
                <p className="text-indigo-300 text-xs">{session?.schoolName || "School"}</p>
              </div>
            </div>

            {/* â”€â”€ GLOBAL LANGUAGE SWITCHER â”€â”€ */}
            <div className="flex flex-col items-end gap-1">
              <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">{T.language}</p>
              <LangSwitcher lang={lang} setLang={handleLangChange} translating={false} compact />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { l: T.total,    v: stats.total,    c: "text-white"       },
              { l: T.approved, v: stats.approved, c: "text-emerald-400" },
              { l: T.pending,  v: stats.pending,  c: "text-amber-400"   },
              { l: T.rejected, v: stats.rejected, c: "text-red-400"     },
            ].map(s => (
              <div key={s.l} className="bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/10 text-center">
                <p className={`text-2xl font-black ${s.c}`}>{s.v}</p>
                <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* â”€â”€ SEARCH / FILTER â”€â”€ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><Ic n="search" s={15} c="#94a3b8" /></span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={T.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-300" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><Ic n="x" s={13} /></button>}
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-sm border-2 ${showFilters || activeFilters > 0 ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
            <Ic n="filter" s={14} c={showFilters || activeFilters > 0 ? "white" : "currentColor"} /> {T.filters}
            {activeFilters > 0 && <span className="w-5 h-5 bg-white text-indigo-700 rounded-full text-[9px] font-black flex items-center justify-center">{activeFilters}</span>}
          </button>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 font-semibold outline-none focus:border-indigo-400 cursor-pointer">
            <option value="date_desc">{T.newestFirst}</option>
            <option value="date_asc">{T.oldestFirst}</option>
            <option value="fee_desc">{T.highestFee}</option>
            <option value="fee_asc">{T.lowestFee}</option>
          </select>
        </div>

        {showFilters && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{T.filters}</p>
              {activeFilters > 0 && (
                <button onClick={() => setFilters({ status: "", level: "", term: "", year: "" })} className="text-xs text-red-500 font-bold flex items-center gap-1">
                  <Ic n="x" s={11} c="#ef4444" /> {T.clearAll}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: "status", label: T.status, opts: ["", "approved", "pending", "recommended", "rejected", "draft"], labels: [T.allOption, T.approved, T.pending, "Recommended", T.rejected, "Draft"] },
                { key: "level",  label: T.level,  opts: ["", "Nursery", "Primary", "Secondary", "University"],           labels: [T.allOption, "Nursery", "Primary", "Secondary", "University"] },
                { key: "term",   label: T.term,   opts: ["", "Term 1", "Term 2", "Term 3"],                              labels: [T.allOption, "Term 1", "Term 2", "Term 3"] },
                { key: "year",   label: T.year,   opts: ["", "2025", "2026", "2024"],                                    labels: [T.allOption, "2025", "2026", "2024"] },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{f.label}</label>
                  <select value={filters[f.key]} onChange={e => setFilters(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold outline-none focus:border-indigo-400">
                    {f.opts.map((o, i) => <option key={o} value={o}>{f.labels[i]}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-slate-500">
            {filtered.length} {filtered.length !== 1 ? T.recordsPlural : T.records}
            {(search || activeFilters > 0) && <span className="text-indigo-600"> {T.filtered}</span>}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 font-semibold">{T.loading}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <div className="text-5xl mb-4 opacity-30">ðŸ“‹</div>
            <p className="font-black text-slate-400 text-lg">{T.noRecords}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((rec, i) => (
              <div key={rec.id} className="card-enter" style={{ animationDelay: `${i * 55}ms` }}>
                <BabyeyiCard rec={rec} onView={handleView} onEdit={handleEdit} onDelete={setDeleting} onShare={handleShare} T={T} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
