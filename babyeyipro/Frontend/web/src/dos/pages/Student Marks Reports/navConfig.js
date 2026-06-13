import {
  LayoutDashboard, BookOpen, ClipboardList, ClipboardCheck, FileText, BarChart3, Trophy,
  HeartPulse, GraduationCap, Users, User, MessageSquare, Lightbulb, Sliders,
} from 'lucide-react';
import { smr } from './utils/paths';

export const NAV_GROUPS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    items: [{ name: 'School overview', path: smr('dashboard') }],
  },
  {
    id: 'academic',
    label: 'Academic Management',
    icon: BookOpen,
    items: [
      { name: 'Classes', path: smr('classes') },
      { name: 'Subjects', path: smr('subjects') },
      { name: 'Academic Years & Terms', path: smr('academic-years') },
      { name: 'Assessment Types', path: smr('assessment-types') },
      { name: 'Examination Setup', path: smr('examination-setup') },
      { name: 'Grade Configuration', path: smr('grade-configuration') },
    ],
  },

  {
    id: 'analytics',
    label: 'Performance Analytics',
    icon: BarChart3,
    items: [
      { name: 'School Performance', path: smr('school-performance') },
      { name: 'Class Performance', path: smr('class-performance') },
      { name: 'Subject Performance', path: smr('subject-performance') },
      { name: 'Student Performance', path: smr('student-performance') },
      { name: 'Teacher Performance', path: smr('teacher-performance') },
      { name: 'Competency Analysis', path: smr('competency-analysis') },
    ],
  },
  {
    id: 'intervention',
    label: 'Intervention Center',
    icon: HeartPulse,
    items: [
      { name: 'At-Risk Students', path: smr('at-risk-students') },
      { name: 'Weak Classes', path: smr('weak-classes') },
      { name: 'Weak Subjects', path: smr('weak-subjects') },
    ],
  },
  {
    id: 'rankings',
    label: 'Rankings',
    icon: Trophy,
    items: [
      { name: 'School Rankings', path: smr('school-rankings') },
      { name: 'Class Rankings', path: smr('class-rankings') },
      { name: 'Subject Rankings', path: smr('subject-rankings') },
      { name: 'Top Performers', path: smr('top-performers') },
      { name: 'Most Improved', path: smr('most-improved') },
    ],
  },
  {
    id: 'student-reports',
    label: 'Student Reports',
    icon: FileText,
    items: [
      { name: 'Reports dashboard', path: smr('reports-dashboard') },
      { name: 'Mid-term reports', path: smr('mid-term-reports') },
      { name: 'Final reports', path: smr('final-reports') },
      { name: 'All year reports', path: smr('all-year-reports') },
      { name: 'Generate reports', path: smr('generate-reports') },
      { name: 'Publish reports', path: smr('publish-reports') },
      { name: 'Download center', path: smr('download-center') },
    ],
  },

  {
    id: 'assessment',
    label: 'Assessment Monitoring',
    icon: ClipboardCheck,
    items: [
      { name: 'Assessment Schedule', path: smr('assessment-schedule') },
      { name: 'Ongoing Assessments', path: smr('ongoing-assessments') },
      { name: 'Assessment Completion', path: smr('assessment-completion') },
      { name: 'Missing Assessments', path: smr('missing-assessments') },
    ],
  },
  // {
  //   id: 'exam',
  //   label: 'National Exam Readiness',
  //   icon: GraduationCap,
  //   items: [
  //     { name: 'Candidate Analysis', path: smr('candidate-analysis') },
  //     { name: 'Readiness Dashboard', path: smr('readiness-dashboard') },
  //     { name: 'Prediction Reports', path: smr('prediction-reports') },
  //     { name: 'Revision Tracking', path: smr('revision-tracking') },
  //   ],
  // },
  // {
  //   id: 'teachers',
  //   label: 'Teachers',
  //   icon: Users,
  //   items: [
     
  //     { name: 'Performance Monitoring', path: smr('performance-monitoring') },
  //     { name: 'Marks Submission Status', path: smr('marks-submission-status') },
  //     { name: 'Lesson Coverage', path: smr('lesson-coverage') },
  //   ],
  // },


];

export const PAGE_TITLES = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((item) => {
    const key = item.path.split('/').pop();
    return [key, item.name];
  })),
);
