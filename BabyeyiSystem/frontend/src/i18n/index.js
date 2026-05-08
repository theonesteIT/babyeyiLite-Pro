/**
 * Babyeyi document + list UI strings (en / rw / fr).
 * Missing keys in rw/fr fall back to English.
 */
import en from "./en.json";
import rw from "./rw.json";
import fr from "./fr.json";
import { normalizeBabyeyiLang } from "../babyeyiPublic/babyeyiTranslateLangs.js";

const locales = { en, rw, fr };

function getNested(obj, path) {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

/**
 * @param {string} locale - "en" | "rw" | "fr"
 * @returns {(key: string) => string}
 */
/** Stored parent message, or official Kinyarwanda template when empty in RW view. */
export function getParentMessageForDisplay(rec, lang, T) {
  const fromRec = rec?.parentMessage ?? rec?.parent_message;
  const raw = String(fromRec ?? "").trim();
  if (raw) return String(fromRec);
  if (lang === "rw" && T.officialParentMessageRw) return T.officialParentMessageRw;
  return "";
}

export function createTranslator(locale) {
  const code = ["en", "rw", "fr"].includes(locale) ? locale : "en";
  const primary = locales[code];
  const fallback = locales.en;

  function t(key) {
    const v = getNested(primary, key);
    if (v != null && v !== "") return v;
    const fb = getNested(fallback, key);
    return fb != null ? fb : key;
  }

  return t;
}

/**
 * Flat object compatible with BabyeyiList legacy `T` usage (same property names as before).
 * @param {string} lang
 */
export function getLegacyBabyeyiUI(lang) {
  const t = createTranslator(normalizeBabyeyiLang(lang));
  return {
    title: t("list.title"),
    viewBtn: t("list.viewBtn"),
    editBtn: t("list.editBtn"),
    deleteBtn: t("list.deleteBtn"),
    shareBtn: t("list.shareBtn"),
    pdfBtn: t("list.pdfBtn"),
    backBtn: t("list.backBtn"),
    searchPlaceholder: t("list.searchPlaceholder"),
    filters: t("list.filters"),
    clearAll: t("list.clearAll"),
    status: t("list.status"),
    level: t("list.level"),
    term: t("list.term"),
    year: t("list.year"),
    allOption: t("list.allOption"),
    newestFirst: t("list.newestFirst"),
    oldestFirst: t("list.oldestFirst"),
    highestFee: t("list.highestFee"),
    lowestFee: t("list.lowestFee"),
    records: t("list.records"),
    recordsPlural: t("list.recordsPlural"),
    filtered: t("list.filtered"),
    loading: t("list.loading"),
    noRecords: t("list.noRecords"),
    total: t("list.total"),
    approved: t("list.approved"),
    pending: t("list.pending"),
    rejected: t("list.rejected"),
    locked: t("list.locked"),
    verify: t("list.verify"),
    regen: t("list.regen"),
    share: t("list.share"),
    translating: t("list.translating"),
    translateDoc: t("list.translateDoc"),
    language: t("list.language"),
    shareDoc: t("list.shareDoc"),
    capturing: t("list.capturing"),
    whatsapp: t("list.whatsapp"),
    saveImage: t("list.saveImage"),
    loadingQr: t("list.loadingQr"),
    qrNotReady: t("list.qrNotReady"),
    copyLink: t("list.copyLink"),
    copied: t("list.copied"),
    save: t("list.save"),
    schoolLogoPlaceholder: t("list.schoolLogoPlaceholder"),
    lockedPdfWhatsapp: t("list.lockedPdfWhatsapp"),
    otherLogoGov: t("list.otherLogoGov"),
    qrPending: t("list.qrPending"),
    totalFeeLabel: t("list.totalFeeLabel"),
    generatingQr: t("list.generatingQr"),
    bankShort: t("list.bankShort"),
    secFee: t("doc.secFee"),
    secBanking: t("doc.secBanking"),
    secRequirements: t("doc.secRequirements"),
    secOtherInfo: t("doc.secOtherInfo"),
    secLeadership: t("doc.secLeadership"),
    secClassNotes: t("doc.secClassNotes"),
    secAuth: t("doc.secAuth"),
    thNo: t("doc.thNo"),
    thHash: t("doc.thHash"),
    thPaymentItem: t("doc.thPaymentItem"),
    thAmount: t("doc.thAmount"),
    thTotalLabel: t("doc.thTotalLabel"),
    thBank: t("doc.thBank"),
    thAccount: t("doc.thAccount"),
    thAccountName: t("doc.thAccountName"),
    thPrimary: t("doc.thPrimary"),
    thItem: t("doc.thItem"),
    thDescription: t("doc.thDescription"),
    thQuantity: t("doc.thQuantity"),
    thDetails: t("doc.thDetails"),
    thFullName: t("doc.thFullName"),
    thRole: t("doc.thRole"),
    thPhone: t("doc.thPhone"),
    thEmail: t("doc.thEmail"),
    sigHeadTeacher: t("doc.sigHeadTeacher"),
    sigScanVerify: t("doc.sigScanVerify"),
    sigScanVerifyPdf: t("doc.sigScanVerifyPdf"),
    sigStamp: t("doc.sigStamp"),
    sigCachet: t("doc.sigCachet"),
    sigRequired: t("doc.sigRequired"),
    sigSigned: t("doc.sigSigned"),
    sigSignAndStamp: t("doc.sigSignAndStamp"),
    docOfficial: t("doc.docOfficial"),
    republic: t("doc.republic"),
    district: t("doc.district"),
    sector: t("doc.sector"),
    academicYear: t("doc.academicYear"),
    termLabel: t("doc.termLabel"),
    classLabel: t("doc.classLabel"),
    levelLabel: t("doc.levelLabel"),
    deleteTitle: t("doc.deleteTitle"),
    deleteWarning: t("doc.deleteWarning"),
    cancelBtn: t("doc.cancelBtn"),
    confirmDelete: t("doc.confirmDelete"),
    parentMessageHeading: t("doc.parentMessageHeading"),
    headerRepublicShort: t("doc.headerRepublicShort"),
    headerMinistryLine: t("doc.headerMinistryLine"),
    badgeCategory: t("doc.badgeCategory"),
    officialParentMessageRw: t("doc.officialParentMessageRw"),
    docFooterLeft: t("doc.docFooterLeft"),
    finderEyebrow: t("finder.eyebrow"),
    finderHeroTitle: t("finder.heroTitle"),
    finderHeroSubtitle: t("finder.heroSubtitle"),
    finderCardTitle: t("finder.cardTitle"),
    finderCardSubtitle: t("finder.cardSubtitle"),
    finderSearchBtn: t("finder.searchBtn"),
    finderSearching: t("finder.searching"),
    finderFound: t("finder.found"),
    finderDocOne: t("finder.docOne"),
    finderDocMany: t("finder.docMany"),
    finderNoDocsTitle: t("finder.noDocsTitle"),
    finderNoDocsBody: t("finder.noDocsBody"),
    finderOpening: t("finder.opening"),
    finderInfoTitle: t("finder.infoTitle"),
    finderInfoBody: t("finder.infoBody"),
    finderAllYears: t("finder.allYears"),
    finderAllTerms: t("finder.allTerms"),
    finderAllClasses: t("finder.allClasses"),
    finderModalEyebrow: t("finder.modalEyebrow"),
    finderModalTitle: t("finder.modalTitle"),
    finderModalSubtitle: t("finder.modalSubtitle"),
    finderStudentCodePlaceholder: t("finder.studentCodePlaceholder"),
    finderConfirmLookupBtn: t("finder.confirmLookupBtn"),
    finderOpenDownloadBtn: t("finder.openDownloadBtn"),
    finderViewPayBtn: t("finder.viewPayBtn"),
    finderFilterError: t("finder.filterError"),
    finderSchoolMissingError: t("finder.schoolMissingError"),
    finderFetchError: t("finder.fetchError"),
    finderStudentCodeRequired: t("finder.studentCodeRequired"),
    finderStudentNotFound: t("finder.studentNotFound"),
    finderWrongSchoolError: t("finder.wrongSchoolError"),
    finderStudentLookupFailed: t("finder.studentLookupFailed"),
    finderNoResultsModal: t("finder.noResultsModal"),
    finderTotalFeeShort: t("finder.totalFeeShort"),
    finderBankLabel: t("finder.bankLabel"),
    finderViewDownloadBtn: t("finder.viewDownloadBtn"),
    finderClassPrefix: t("finder.classPrefix"),
    finderAriaClose: t("finder.ariaClose"),
    finderOpenDocFailed: t("finder.openDocFailed"),
    finderLoadLangError: t("finder.loadLangError"),
    finderSearchLangPlaceholder: t("finder.searchLangPlaceholder"),
    finderNoLangMatch: t("finder.noLangMatch"),
  };
}

/** @param {string} lang */
export function getStatusLabelSafe(lang, statusKey) {
  const t = createTranslator(lang);
  const k = String(statusKey || "").toLowerCase();
  const key = `statusUi.${k}`;
  const v = t(key);
  if (v !== key && v !== "") return v;
  return statusKey || "";
}

export { locales };
