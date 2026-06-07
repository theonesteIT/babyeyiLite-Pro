const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function chunkToWords(n) {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`.trim();
  if (n < 1000) {
    return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${chunkToWords(n % 100)}` : ''}`.trim();
  }
  return '';
}

function numberToWords(n) {
  const num = Math.floor(Math.abs(Number(n) || 0));
  if (num === 0) return 'Zero';
  const billions = Math.floor(num / 1_000_000_000);
  const millions = Math.floor((num % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((num % 1_000_000) / 1000);
  const remainder = num % 1000;
  const parts = [];
  if (billions) parts.push(`${chunkToWords(billions)} Billion`);
  if (millions) parts.push(`${chunkToWords(millions)} Million`);
  if (thousands) parts.push(`${chunkToWords(thousands)} Thousand`);
  if (remainder) parts.push(chunkToWords(remainder));
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function amountInWordsRWF(amount) {
  const n = Math.round(Number(amount) || 0);
  return `${numberToWords(n)} Rwandan Francs Only`;
}

export function formatMoneyRWF(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n);
}

export function fmtNum(n) {
  return Math.round(Number(n) || 0).toLocaleString();
}
