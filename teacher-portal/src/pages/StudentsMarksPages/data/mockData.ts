import type { Student, Assessment, AtRiskStudent, Notification, InterventionPlan } from '../types';

export const students: Student[] = [
  { id: 'S001', name: 'Jean Baptiste', class: 'Senior 3A', attendance: 92, average: 85, position: 1 },
  { id: 'S002', name: 'Eric Hakizimana', class: 'Senior 3A', attendance: 78, average: 45, position: 28 },
  { id: 'S003', name: 'Alice Uwimana', class: 'Senior 3A', attendance: 95, average: 72, position: 8 },
  { id: 'S004', name: 'David Niyonzima', class: 'Senior 3A', attendance: 60, average: 38, position: 35 },
  { id: 'S005', name: 'Grace Mugabo', class: 'Senior 3A', attendance: 88, average: 91, position: 2 },
  { id: 'S006', name: 'Patrick Habimana', class: 'Senior 3A', attendance: 85, average: 67, position: 12 },
  { id: 'S007', name: 'Diane Ishimwe', class: 'Senior 3B', attendance: 96, average: 78, position: 5 },
  { id: 'S008', name: 'Samuel Nkundiye', class: 'Senior 3B', attendance: 45, average: 35, position: 40 },
  { id: 'S009', name: 'Marie Claire', class: 'Senior 3B', attendance: 90, average: 82, position: 3 },
  { id: 'S010', name: 'John Mugisha', class: 'Senior 3B', attendance: 82, average: 55, position: 20 },
  { id: 'S011', name: 'Angelique Uwase', class: 'Senior 3B', attendance: 70, average: 42, position: 30 },
  { id: 'S012', name: 'Peter Kagame', class: 'Senior 3B', attendance: 91, average: 73, position: 7 },
];

export const assessments: Assessment[] = [
  { id: 'A001', name: 'Mathematics CAT 1', type: 'CAT', class: 'Senior 3A', subject: 'Mathematics', date: '2026-02-15', maxMarks: 20, weight: 20, completed: 28, missing: 5, averageScore: 68 },
  { id: 'A002', name: 'English Quiz 1', type: 'Quiz', class: 'Senior 3A', subject: 'English', date: '2026-02-20', maxMarks: 10, weight: 10, completed: 30, missing: 3, averageScore: 72 },
  { id: 'A003', name: 'Physics Practical', type: 'Practical', class: 'Senior 3B', subject: 'Physics', date: '2026-03-01', maxMarks: 25, weight: 15, completed: 25, missing: 7, averageScore: 65 },
  { id: 'A004', name: 'Chemistry Homework 1', type: 'Homework', class: 'Senior 3A', subject: 'Chemistry', date: '2026-03-05', maxMarks: 15, weight: 5, completed: 32, missing: 1, averageScore: 78 },
  { id: 'A005', name: 'Biology Project', type: 'Project', class: 'Senior 3B', subject: 'Biology', date: '2026-03-10', maxMarks: 30, weight: 25, completed: 26, missing: 6, averageScore: 71 },
];

export const atRiskStudents: AtRiskStudent[] = [
  { id: 'S002', name: 'Eric Hakizimana', class: 'Senior 3A', average: 45, attendance: 78, riskLevel: 'High', trend: 'declining', recommendation: 'Schedule parent meeting and provide extra tutoring in Mathematics' },
  { id: 'S004', name: 'David Niyonzima', class: 'Senior 3A', average: 38, attendance: 60, riskLevel: 'High', trend: 'declining', recommendation: 'Urgent intervention needed - counseling and attendance monitoring' },
  { id: 'S008', name: 'Samuel Nkundiye', class: 'Senior 3B', average: 35, attendance: 45, riskLevel: 'High', trend: 'declining', recommendation: 'Immediate intervention - chronic absenteeism and low performance' },
  { id: 'S011', name: 'Angelique Uwase', class: 'Senior 3B', average: 42, attendance: 70, riskLevel: 'Medium', trend: 'stable', recommendation: 'Extra tutoring and regular progress monitoring' },
  { id: 'S010', name: 'John Mugisha', class: 'Senior 3B', average: 55, attendance: 82, riskLevel: 'Low', trend: 'improving', recommendation: 'Continue current support, monitor progress monthly' },
];

export const classPerformance = {
  'Senior 3A': { average: 68, highest: 91, lowest: 38, passRate: 74, totalStudents: 33 },
  'Senior 3B': { average: 62, highest: 88, lowest: 35, passRate: 68, totalStudents: 32 },
};

export const subjectScores = {
  'Senior 3A': [
    { subject: 'Mathematics', score: 72 },
    { subject: 'English', score: 78 },
    { subject: 'Kinyarwanda', score: 85 },
    { subject: 'Physics', score: 65 },
    { subject: 'Chemistry', score: 70 },
    { subject: 'Biology', score: 68 },
    { subject: 'History', score: 76 },
    { subject: 'Geography', score: 74 },
    { subject: 'French', score: 55 },
  ],
  'Senior 3B': [
    { subject: 'Mathematics', score: 65 },
    { subject: 'English', score: 72 },
    { subject: 'Kinyarwanda', score: 80 },
    { subject: 'Physics', score: 60 },
    { subject: 'Chemistry', score: 68 },
    { subject: 'Biology', score: 64 },
    { subject: 'History', score: 70 },
    { subject: 'Geography', score: 71 },
    { subject: 'French', score: 50 },
  ],
};

export const gradeDistribution = {
  'A': 8,
  'B': 12,
  'C': 15,
  'D': 10,
  'F': 5,
};

export const monthlyProgress = [
  { month: 'Jan', average: 65 },
  { month: 'Feb', average: 68 },
  { month: 'Mar', average: 72 },
  { month: 'Apr', average: 70 },
  { month: 'May', average: 74 },
  { month: 'Jun', average: 78 },
];

export const passRateTrend = [
  { term: 'Term 1', rate: 72 },
  { term: 'Term 2', rate: 76 },
  { term: 'Term 3', rate: 81 },
];

export const attendanceVsPerformance = [
  { attendance: 95, performance: 85, student: 'Jean' },
  { attendance: 78, performance: 45, student: 'Eric' },
  { attendance: 60, performance: 38, student: 'David' },
  { attendance: 88, performance: 91, student: 'Grace' },
  { attendance: 96, performance: 78, student: 'Diane' },
  { attendance: 45, performance: 35, student: 'Samuel' },
  { attendance: 90, performance: 82, student: 'Marie' },
  { attendance: 82, performance: 55, student: 'John' },
  { attendance: 70, performance: 42, student: 'Angelique' },
  { attendance: 85, performance: 67, student: 'Patrick' },
];

export const alerts: Notification[] = [
  { id: 'N001', type: 'warning', message: '5 students missing assessments in Senior 3A', time: '2 hours ago' },
  { id: 'N002', type: 'warning', message: '3 students absent for more than 5 days', time: '1 day ago' },
  { id: 'N003', type: 'error', message: '7 students below 40% average', time: '2 days ago' },
  { id: 'N004', type: 'info', message: 'Term 2 reports due in 2 weeks', time: '3 days ago' },
];

export const interventionPlans: InterventionPlan[] = [
  { id: 'I001', studentId: 'S002', studentName: 'Eric Hakizimana', issue: 'Low Mathematics performance', action: 'Extra tutoring sessions twice a week', status: 'in-progress', date: '2026-03-01' },
  { id: 'I002', studentId: 'S004', studentName: 'David Niyonzima', issue: 'Chronic absenteeism', action: 'Parent meeting scheduled + counseling referral', status: 'pending', date: '2026-03-10' },
  { id: 'I003', studentId: 'S008', studentName: 'Samuel Nkundiye', issue: 'Multiple subject failures', action: 'Comprehensive intervention plan with weekly monitoring', status: 'pending', date: '2026-03-12' },
];

export type TeacherAssignedClass = {
  id: string;
  name: string;
  subject: string;
  level: string;
  studentCount: number;
  defaultAssessmentMarks: number;
  defaultExamMarks: number;
};

export const teacherAssignedClasses: TeacherAssignedClass[] = [
  { id: 'C1', name: 'Senior 3A', subject: 'Mathematics', level: 'S3', studentCount: 33, defaultAssessmentMarks: 20, defaultExamMarks: 100 },
  { id: 'C2', name: 'Senior 3B', subject: 'Mathematics', level: 'S3', studentCount: 32, defaultAssessmentMarks: 20, defaultExamMarks: 100 },
  { id: 'C3', name: 'Senior 2A', subject: 'Physics', level: 'S2', studentCount: 28, defaultAssessmentMarks: 25, defaultExamMarks: 100 },
  { id: 'C4', name: 'Senior 2B', subject: 'Physics', level: 'S2', studentCount: 30, defaultAssessmentMarks: 25, defaultExamMarks: 100 },
  { id: 'C5', name: 'Senior 1A', subject: 'Chemistry', level: 'S1', studentCount: 35, defaultAssessmentMarks: 15, defaultExamMarks: 80 },
];

export const mockClassStudents: Record<string, Student[]> = {
  'Senior 3A': students.filter((s) => s.class === 'Senior 3A'),
  'Senior 3B': students.filter((s) => s.class === 'Senior 3B'),
  'Senior 2A': [
    { id: 'S013', name: 'Emmanuel Nshimiyimana', class: 'Senior 2A', attendance: 88, average: 74, position: 4 },
    { id: 'S014', name: 'Chantal Umutoni', class: 'Senior 2A', attendance: 92, average: 81, position: 2 },
    { id: 'S015', name: 'Fabrice Habimana', class: 'Senior 2A', attendance: 76, average: 58, position: 15 },
    { id: 'S016', name: 'Josiane Mukamana', class: 'Senior 2A', attendance: 94, average: 86, position: 1 },
    { id: 'S017', name: 'Kevin Iradukunda', class: 'Senior 2A', attendance: 68, average: 49, position: 22 },
    { id: 'S018', name: 'Olivia Nyiramana', class: 'Senior 2A', attendance: 90, average: 77, position: 6 },
  ],
  'Senior 2B': [
    { id: 'S019', name: 'Bruce Niyonsaba', class: 'Senior 2B', attendance: 84, average: 71, position: 7 },
    { id: 'S020', name: 'Claudine Uwase', class: 'Senior 2B', attendance: 91, average: 83, position: 3 },
    { id: 'S021', name: 'Denis Mugisha', class: 'Senior 2B', attendance: 72, average: 52, position: 18 },
    { id: 'S022', name: 'Esther Ingabire', class: 'Senior 2B', attendance: 96, average: 88, position: 1 },
    { id: 'S023', name: 'Frank Habiyaremye', class: 'Senior 2B', attendance: 79, average: 64, position: 11 },
    { id: 'S024', name: 'Gloria Mutoni', class: 'Senior 2B', attendance: 87, average: 75, position: 5 },
  ],
  'Senior 1A': [
    { id: 'S025', name: 'Herve Niyitegeka', class: 'Senior 1A', attendance: 93, average: 79, position: 4 },
    { id: 'S026', name: 'Immaculee Uwimana', class: 'Senior 1A', attendance: 89, average: 84, position: 2 },
    { id: 'S027', name: 'James Nkurunziza', class: 'Senior 1A', attendance: 74, average: 56, position: 16 },
    { id: 'S028', name: 'Keza Mutesi', class: 'Senior 1A', attendance: 97, average: 90, position: 1 },
    { id: 'S029', name: 'Leon Mugabo', class: 'Senior 1A', attendance: 81, average: 68, position: 9 },
    { id: 'S030', name: 'Mireille Ishimwe', class: 'Senior 1A', attendance: 86, average: 72, position: 7 },
  ],
};
