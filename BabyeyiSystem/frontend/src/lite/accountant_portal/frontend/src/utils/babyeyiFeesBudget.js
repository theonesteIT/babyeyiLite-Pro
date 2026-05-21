import api from '../services/api';

export function asMoney(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

/** Normalize term for comparison (Term 1, TERM 1, term 1 → t1). */
export function termKeyLabel(s) {
  const t = String(s || '').trim().toLowerCase();
  if (!t) return '';
  if (/annual|full\s*academic|all\s*year/.test(t)) return 'annual';
  const m = t.match(/(\d+)/);
  return m ? `t${Number(m[1])}` : t;
}

export function termMatchesRow(rowTerm, inputTerm) {
  const a = String(rowTerm || '').trim();
  const b = String(inputTerm || '').trim();
  if (!b) return true;
  if (!a) return false;
  if (a.toLowerCase() === b.toLowerCase()) return true;
  return termKeyLabel(a) === termKeyLabel(b);
}

/** Budget term / type means aggregate all terms for the academic year. */
export function shouldAggregateAllTerms(term, budgetType) {
  const t = String(term || '').trim().toLowerCase();
  const bt = String(budgetType || '').trim().toLowerCase();
  if (bt.includes('annual')) return true;
  if (!t) return false;
  return (
    t.includes('full academic') ||
    t.includes('annual') ||
    t.includes('all year') ||
    t === 'full year'
  );
}

export function periodLabel(academicYear, term, budgetType, aggregateAll) {
  const year = String(academicYear || '').trim() || '—';
  if (aggregateAll) return `Full academic year · ${year}`;
  const termLbl = String(term || '').trim() || '—';
  return `${termLbl} · ${year}`;
}

function mapSummaryFromApi(raw) {
  if (!raw) return emptySummary();
  return {
    cardCount: Number(raw.card_count ?? raw.cardCount ?? 0),
    totalStudents: Number(raw.total_students ?? raw.totalStudents ?? 0),
    tuitionTotal: asMoney(raw.tuition_total ?? raw.tuitionTotal),
    paidAtSchoolTotal: asMoney(raw.paid_at_school_total ?? raw.paidAtSchoolTotal),
    totalDue: asMoney(raw.total_due ?? raw.totalDue),
    projectedTuitionTotal: asMoney(raw.projected_tuition_total ?? raw.projectedTuitionTotal),
    projectedPaidAtSchoolTotal: asMoney(raw.projected_paid_at_school_total ?? raw.projectedPaidAtSchoolTotal),
    projectedTotalDue: asMoney(raw.projected_total_due ?? raw.projectedTotalDue),
    byTerm: (raw.by_term || raw.byTerm || []).map((t) => ({
      term: t.term,
      cardCount: Number(t.card_count ?? t.cardCount ?? 0),
      studentCount: Number(t.student_count ?? t.studentCount ?? 0),
      projectedTotalDue: asMoney(t.projected_total_due ?? t.projectedTotalDue),
    })),
  };
}

function mapCardFromApi(c) {
  const tuitionPer = asMoney(c.tuition_per_student ?? c.tuition_total);
  const paidPer = asMoney(c.paid_at_school_per_student ?? c.paid_at_school_total);
  const perStudent = asMoney(c.per_student_due ?? c.total_due ?? tuitionPer + paidPer);
  return {
    ...c,
    tuition_total: tuitionPer,
    paid_at_school_total: paidPer,
    total_due: perStudent,
    perStudentDue: perStudent,
    studentCount: Number(c.student_count ?? c.studentCount ?? 0),
    projectedTuitionTotal: asMoney(c.projected_tuition_total ?? c.projectedTuitionTotal),
    projectedPaidAtSchoolTotal: asMoney(c.projected_paid_at_school_total ?? c.projectedPaidAtSchoolTotal),
    projectedTotalDue: asMoney(c.projected_total_due ?? c.projectedTotalDue),
    classNames: Array.isArray(c.class_names) ? c.class_names : [],
  };
}

/**
 * Fetch Babyeyi fee cards with student counts and projected totals for budget tuition income.
 */
export async function fetchBabyeyiFeeCardsForBudget({ academicYear, term, budgetType }) {
  const year = String(academicYear || '').trim();
  if (!year) {
    return { cards: [], summary: emptySummary(), aggregateAll: false };
  }

  const res = await api.get('/accountant/babyeyi-fees/budget-analysis', {
    params: {
      academic_year: year,
      term: term || undefined,
      budget_type: budgetType || undefined,
    },
  });

  if (!res.data?.success) {
    throw new Error(res.data?.message || 'Failed to load Babyeyi fee cards');
  }

  const payload = res.data.data || {};
  const cards = (Array.isArray(payload.cards) ? payload.cards : []).map(mapCardFromApi);
  const aggregateAll = Boolean(payload.aggregate_all_terms ?? shouldAggregateAllTerms(term, budgetType));

  return {
    cards,
    summary: mapSummaryFromApi(payload.summary),
    aggregateAll,
  };
}

function emptySummary() {
  return {
    cardCount: 0,
    totalStudents: 0,
    tuitionTotal: 0,
    paidAtSchoolTotal: 0,
    totalDue: 0,
    projectedTuitionTotal: 0,
    projectedPaidAtSchoolTotal: 0,
    projectedTotalDue: 0,
    byTerm: [],
  };
}

/** @deprecated use API summary from fetchBabyeyiFeeCardsForBudget */
export function summarizeFeeCards(cards) {
  if (!cards?.length) return emptySummary();

  const tuitionTotal = cards.reduce((s, c) => s + asMoney(c.tuition_total), 0);
  const paidAtSchoolTotal = cards.reduce((s, c) => s + asMoney(c.paid_at_school_total), 0);
  const totalDue = cards.reduce((s, c) => s + asMoney(c.perStudentDue ?? c.total_due), 0);
  const projectedTuitionTotal = cards.reduce((s, c) => s + asMoney(c.projectedTuitionTotal), 0);
  const projectedPaidAtSchoolTotal = cards.reduce((s, c) => s + asMoney(c.projectedPaidAtSchoolTotal), 0);
  const projectedTotalDue = cards.reduce((s, c) => s + asMoney(c.projectedTotalDue), 0);
  const totalStudents = cards.reduce((s, c) => s + Number(c.studentCount || 0), 0);

  const termMap = new Map();
  for (const c of cards) {
    const key = String(c.term || '—').trim() || '—';
    const prev = termMap.get(key) || {
      term: key,
      cardCount: 0,
      studentCount: 0,
      projectedTotalDue: 0,
    };
    prev.cardCount += 1;
    prev.studentCount += Number(c.studentCount || 0);
    prev.projectedTotalDue += asMoney(c.projectedTotalDue);
    termMap.set(key, prev);
  }

  return {
    cardCount: cards.length,
    totalStudents,
    tuitionTotal,
    paidAtSchoolTotal,
    totalDue,
    projectedTuitionTotal,
    projectedPaidAtSchoolTotal,
    projectedTotalDue,
    byTerm: [...termMap.values()].sort((a, b) => a.term.localeCompare(b.term)),
  };
}
