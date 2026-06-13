export const NAVY = '#000435';
export const AMBER = '#f59e0b';

export const schoolKpis = {
  passRate: 78,
  schoolAverage: 69,
  totalStudents: 1200,
  atRiskStudents: 85,
  topPerformingClasses: 3,
  weakSubjects: 2,
  termLabel: 'Term 2, 2026',
};

export const classPerformance = [
  { name: 'S3A', average: 82, passRate: 88, trend: +4.2, rank: 1, status: 'top' },
  { name: 'S3B', average: 74, passRate: 79, trend: +1.8, rank: 2, status: 'good' },
  { name: 'S3C', average: 61, passRate: 58, trend: -3.5, rank: 8, status: 'attention' },
  { name: 'S2A', average: 71, passRate: 76, trend: +2.1, rank: 4, status: 'good' },
  { name: 'S2B', average: 68, passRate: 72, trend: -0.5, rank: 5, status: 'stable' },
  { name: 'S1A', average: 65, passRate: 70, trend: +3.0, rank: 6, status: 'improving' },
  { name: 'S1B', average: 63, passRate: 67, trend: +1.2, rank: 7, status: 'stable' },
  { name: 'S6 Science', average: 76, passRate: 81, trend: +5.0, rank: 3, status: 'top' },
];

export const subjectPerformance = [
  { subject: 'Mathematics', average: 58, target: 65, trend: -2, level: 'critical' },
  { subject: 'Physics', average: 63, target: 65, trend: +1, level: 'medium' },
  { subject: 'English', average: 75, target: 70, trend: +3, level: 'good' },
  { subject: 'Biology', average: 80, target: 70, trend: +4, level: 'good' },
  { subject: 'Chemistry', average: 66, target: 65, trend: 0, level: 'medium' },
  { subject: 'Kinyarwanda', average: 84, target: 75, trend: +2, level: 'good' },
  { subject: 'History', average: 72, target: 70, trend: +1, level: 'good' },
  { subject: 'Geography', average: 70, target: 70, trend: -1, level: 'medium' },
];

export const teacherPerformance = [
  { name: 'Teacher A — M. Uwimana', subject: 'Mathematics', classes: 'S3A, S3B', average: 78, trend: +3, rank: 2 },
  { name: 'Teacher B — J. Habimana', subject: 'Physics', classes: 'S3C, S2A', average: 65, trend: -2, rank: 8 },
  { name: 'Teacher C — A. Mukamana', subject: 'Biology', classes: 'S3A, S6 Sci', average: 82, trend: +5, rank: 1 },
  { name: 'Teacher D — P. Niyonzima', subject: 'English', classes: 'S2B, S1A', average: 75, trend: +2, rank: 3 },
  { name: 'Teacher E — G. Ishimwe', subject: 'Chemistry', classes: 'S3B, S3C', average: 68, trend: +1, rank: 5 },
];

export const schoolRankings = [
  { rank: 1, name: 'Jean Baptiste', class: 'S3A', average: 91, trend: 'up' },
  { rank: 2, name: 'Aline Uwase', class: 'S3A', average: 89, trend: 'up' },
  { rank: 3, name: 'Eric Hakizimana', class: 'S3B', average: 87, trend: 'stable' },
  { rank: 4, name: 'Grace Mugabo', class: 'S6 Science', average: 86, trend: 'up' },
  { rank: 5, name: 'Diane Ishimwe', class: 'S2A', average: 85, trend: 'down' },
  { rank: 6, name: 'Samuel Nkundiye', class: 'S3C', average: 84, trend: 'up' },
  { rank: 7, name: 'Marie Claire', class: 'S3B', average: 83, trend: 'stable' },
  { rank: 8, name: 'Patrick Habimana', class: 'S1A', average: 82, trend: 'up' },
];

export const atRiskStudents = [
  { name: 'Jean N.', class: 'S3C', average: 42, risk: 'High', reason: 'Below 50%', trend: 'declining', missing: 2 },
  { name: 'Eric M.', class: 'S3C', average: 38, risk: 'Critical', reason: 'Continuous decline', trend: 'declining', missing: 4 },
  { name: 'Diane K.', class: 'S2B', average: 45, risk: 'High', reason: 'Declining performance', trend: 'declining', missing: 1 },
  { name: 'David N.', class: 'S3A', average: 48, risk: 'Medium', reason: 'Missing assessments', trend: 'stable', missing: 3 },
  { name: 'Angelique U.', class: 'S3B', average: 44, risk: 'High', reason: 'Below 50%', trend: 'declining', missing: 0 },
];

export const termTrend = [
  { term: 'Term 1', average: 60, passRate: 65 },
  { term: 'Term 2', average: 67, passRate: 72 },
  { term: 'Term 3', average: 75, passRate: 78 },
];

export const comparativeTerms = [
  { subject: 'Mathematics', change: +5, direction: 'up' },
  { subject: 'English', change: +3, direction: 'up' },
  { subject: 'Physics', change: -2, direction: 'down' },
  { subject: 'Biology', change: +4, direction: 'up' },
  { subject: 'Chemistry', change: +1, direction: 'up' },
];

export const examReadiness = [
  { class: 'S6 Science', readiness: 72, status: 'Ready', label: 'On track' },
  { class: 'S6 Arts', readiness: 65, status: 'Risk', label: 'Needs revision plan' },
  { class: 'S3A', readiness: 81, status: 'Ready', label: 'Strong foundation' },
  { class: 'S3C', readiness: 54, status: 'Critical', label: 'Urgent support needed' },
];

export const interventions = [
  { student: 'Eric M.', class: 'S3C', action: 'Extra Math lessons', status: 'Improving', change: '+10%', owner: 'Teacher A' },
  { student: 'Jean N.', class: 'S3C', action: 'Parent meeting scheduled', status: 'In progress', change: '+2%', owner: 'DOS' },
  { student: 'Diane K.', class: 'S2B', action: 'Remedial Physics', status: 'Pending', change: '—', owner: 'Teacher B' },
];

export const smartInsights = [
  { type: 'warning', text: '30% of students failing Mathematics', action: 'Review S3C & S3B' },
  { type: 'warning', text: 'Attendance drop linked to low performance in S3C', action: 'View attendance analytics' },
  { type: 'success', text: 'Biology improving steadily (+4% this term)', action: 'View subject report' },
  { type: 'error', text: '15 students need urgent support', action: 'Open at-risk list' },
];

export const liveAlerts = [
  { time: '2 min ago', message: 'S3C Mathematics dropped by 12%', severity: 'critical' },
  { time: '1 hr ago', message: 'Marks submitted for S3A Biology CAT', severity: 'info' },
  { time: '3 hr ago', message: '5 students below 40% in S3C', severity: 'warning' },
  { time: 'Today', message: 'Teacher B — Physics marks pending approval', severity: 'warning' },
];

export const heatmapLevels = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: '🔴' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', dot: '🟡' },
  good: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: '🟢' },
};

export const decisionActions = [
  { label: 'Assign remedial teachers', count: 3, urgent: true },
  { label: 'Recommend syllabus revision', count: 1, urgent: false },
  { label: 'Approve interventions', count: 5, urgent: true },
  { label: 'Flag subjects for review', count: 2, urgent: false },
];
