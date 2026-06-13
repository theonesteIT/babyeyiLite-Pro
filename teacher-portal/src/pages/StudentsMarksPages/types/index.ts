export interface Student {
  id: string;
  name: string;
  class: string;
  attendance: number;
  average: number;
  position: number;
  photo?: string;
}

export interface Subject {
  name: string;
  score: number;
  grade: string;
  trend?: number[];
}

export interface Assessment {
  id: string;
  name: string;
  type: 'CAT' | 'Quiz' | 'Homework' | 'Project' | 'Practical' | 'Mid-Term Exam' | 'End-Term Exam';
  class: string;
  subject: string;
  date: string;
  maxMarks: number;
  weight: number;
  completed: number;
  missing: number;
  averageScore: number;
}

export interface MarkEntry {
  studentId: string;
  studentName: string;
  marks: number;
  grade: string;
  comment: string;
  position: number;
}

export interface AtRiskStudent {
  id: string;
  name: string;
  class: string;
  average: number;
  attendance: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  trend: 'declining' | 'stable' | 'improving';
  recommendation: string;
}

export interface CompetencyRating {
  studentId: string;
  studentName: string;
  criticalThinking: 'Excellent' | 'Very Good' | 'Good' | 'Needs Improvement';
  creativity: 'Excellent' | 'Very Good' | 'Good' | 'Needs Improvement';
  communication: 'Excellent' | 'Very Good' | 'Good' | 'Needs Improvement';
  collaboration: 'Excellent' | 'Very Good' | 'Good' | 'Needs Improvement';
  problemSolving: 'Excellent' | 'Very Good' | 'Good' | 'Needs Improvement';
  researchSkills: 'Excellent' | 'Very Good' | 'Good' | 'Needs Improvement';
  leadership: 'Excellent' | 'Very Good' | 'Good' | 'Needs Improvement';
}

export interface Notification {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  message: string;
  time: string;
}

export interface InterventionPlan {
  id: string;
  studentId: string;
  studentName: string;
  issue: string;
  action: string;
  status: 'pending' | 'in-progress' | 'completed';
  date: string;
}
