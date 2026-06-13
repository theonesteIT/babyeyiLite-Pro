'use strict';

const FEE_TYPE_PATTERNS = [
  { cat: 'Uniform fees', re: /uniform|sport\s*wear|sweater|tracksuit|shoes|footwear/i },
  { cat: 'Transport fees', re: /transport|bus|travel/i },
  { cat: 'Boarding fees', re: /boarding|hostel|dormitory|accommodation/i },
  { cat: 'Activity fees', re: /activity|sport|club|games|extracurricular/i },
  { cat: 'Registration fees', re: /registration|enrollment|admission|enrolment/i },
  { cat: 'Exam fees', re: /exam|examination|test fee|assessment fee/i },
  { cat: 'ICT fees', re: /\bict\b|computer|laptop|tablet/i },
  { cat: 'Library fees', re: /library|book fee|textbook/i },
  { cat: 'Lunch fees', re: /lunch|meal|feeding|food/i },
  { cat: 'School fees', re: /tuition|school fee|tuition fee|academic fee/i },
];

/**
 * Classify a Babyeyi payment line for accountant reporting and invoices.
 * @param {string} name
 * @param {string} [paySource] requirement_paid_at_school | payment_paid_at_school
 */
function inferFeeCategory(name, paySource) {
  const n = String(name || '').trim();
  let base = 'School fees';
  for (const { cat, re } of FEE_TYPE_PATTERNS) {
    if (re.test(n)) {
      base = cat;
      break;
    }
  }
  if (paySource === 'requirement_paid_at_school') return 'Requirements (school counter)';
  if (paySource === 'payment_paid_at_school') return `${base.replace(/ fees$/, '')} (school counter)`;
  return base;
}

module.exports = { inferFeeCategory, FEE_TYPE_PATTERNS };
