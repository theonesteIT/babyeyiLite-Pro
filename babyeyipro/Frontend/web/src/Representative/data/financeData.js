/** Demo / seed data for representative finance pages */

export const SCHOOLS = [
  { id: 1, name: 'Kicukiro Academy', fees_collected: 42_000_000, fees_expected: 70_000_000 },
  { id: 2, name: 'Nyarugenge Mixed School', fees_collected: 58_000_000, fees_expected: 62_000_000 },
  { id: 3, name: 'Gasabo Secondary', fees_collected: 51_000_000, fees_expected: 55_000_000 },
  { id: 4, name: 'Kigali Primary School A', fees_collected: 48_000_000, fees_expected: 50_000_000 },
];

export const STUDENTS = [
  { id: 1, name: 'Jean Baptiste N.', school: 'Kicukiro Academy', parent: 'Marie N.', expected: 450_000, paid: 450_000, remaining: 0, status: 'paid', method: 'MoMo' },
  { id: 2, name: 'Alice Uwase', school: 'Nyarugenge Mixed School', parent: 'Peter U.', expected: 380_000, paid: 200_000, remaining: 180_000, status: 'partial', method: 'Bank' },
  { id: 3, name: 'Eric Mugisha', school: 'Gasabo Secondary', parent: 'Grace M.', expected: 520_000, paid: 0, remaining: 520_000, status: 'unpaid', method: 'MoMo' },
  { id: 4, name: 'Divine Ishimwe', school: 'Kigali Primary School A', expected: 290_000, paid: 290_000, remaining: 0, status: 'paid', method: 'Cash' },
  { id: 5, name: 'Patrick Habimana', school: 'Kicukiro Academy', expected: 410_000, paid: 150_000, remaining: 260_000, status: 'partial', method: 'MoMo' },
  { id: 6, name: 'Claire Mukamana', school: 'Nyarugenge Mixed School', expected: 360_000, paid: 360_000, remaining: 0, status: 'paid', method: 'Bank' },
];

const days = ['Mon 1', 'Tue 2', 'Wed 3', 'Thu 4', 'Fri 5', 'Sat 6', 'Sun 7', 'Mon 8', 'Tue 9', 'Wed 10', 'Thu 11', 'Fri 12', 'Sat 13', 'Sun 14'];
export const DAILY_COLLECTIONS = days.map((day, i) => ({
  day,
  amount: 1_200_000 + i * 85_000 + (i % 3) * 40_000,
}));

export const FEE_CATEGORIES = [
  { name: 'Tuition', collected: 182_000_000, expected: 210_000_000, color: '#000435' },
  { name: 'Boarding', collected: 48_000_000, expected: 62_000_000, color: '#f59e0b' },
  { name: 'Transport', collected: 22_000_000, expected: 28_000_000, color: '#10b981' },
  { name: 'Exam fees', collected: 9_500_000, expected: 12_000_000, color: '#6366f1' },
];

export const TRANSACTIONS = [
  { id: 1, student: 'Jean Baptiste N.', school: 'Kicukiro Academy', method: 'MoMo', time: '09:12', amount: 125_000, status: 'success' },
  { id: 2, student: 'Alice Uwase', school: 'Nyarugenge Mixed School', method: 'Bank', time: '09:45', amount: 80_000, status: 'pending' },
  { id: 3, student: 'Eric Mugisha', school: 'Gasabo Secondary', method: 'MoMo', time: '10:03', amount: 220_000, status: 'success' },
  { id: 4, student: 'Divine Ishimwe', school: 'Kigali Primary School A', method: 'Cash', time: '10:28', amount: 95_000, status: 'success' },
  { id: 5, student: 'Patrick Habimana', school: 'Kicukiro Academy', method: 'MoMo', time: '11:01', amount: 50_000, status: 'failed' },
];

export const STAFF = [
  { id: 1, avatar: 'JN', name: 'Jean Nkurikiye', school: 'Kicukiro Academy', department: 'Administration', position: 'Principal', gross: 980_000, deductions: 142_000, bonus: 80_000, net: 918_000, paid: 918_000, remaining: 0, status: 'paid', payDate: '2026-05-02', method: 'Bank' },
  { id: 2, avatar: 'AW', name: 'Anne Walker', school: 'Nyarugenge Mixed School', department: 'Sciences', position: 'Teacher', gross: 520_000, deductions: 78_000, bonus: 20_000, net: 462_000, paid: 300_000, remaining: 162_000, status: 'partial', payDate: '2026-05-04', method: 'MoMo' },
  { id: 3, avatar: 'PK', name: 'Paul Kayonga', school: 'Gasabo Secondary', department: 'Languages', position: 'Teacher', gross: 480_000, deductions: 71_000, bonus: 0, net: 409_000, paid: 0, remaining: 409_000, status: 'pending', payDate: null, method: 'Bank' },
  { id: 4, avatar: 'MK', name: 'Mary Kamali', school: 'Kigali Primary School A', department: 'Humanities', position: 'HoD', gross: 610_000, deductions: 91_000, bonus: 45_000, net: 564_000, paid: 564_000, remaining: 0, status: 'paid', payDate: '2026-05-01', method: 'Bank' },
  { id: 5, avatar: 'DN', name: 'David Niyonzima', school: 'Kicukiro Academy', department: 'Technology', position: 'Lab tech', gross: 390_000, deductions: 58_000, bonus: 10_000, net: 342_000, paid: 342_000, remaining: 0, status: 'paid', payDate: '2026-05-03', method: 'MoMo' },
];

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHLY_COLLECTIONS = months.map((month, i) => {
  const base = 38_000_000 + i * 900_000;
  return {
    month,
    fees: base + 5_000_000,
    payroll: base * 0.42 + 2_000_000,
  };
});
