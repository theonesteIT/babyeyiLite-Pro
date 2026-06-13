import { Routes, Route, Navigate } from 'react-router-dom';
import MarksReportsLayout from './components/MarksReportsLayout';
import Dashboard from './pages/Dashboard';
import ClassPerformance from './pages/ClassPerformance';
import SubjectPerformance from './pages/SubjectPerformance';
import TeacherPerformance from './pages/TeacherPerformance';
import StudentRanking from './pages/StudentRanking';
import AtRiskStudents from './pages/AtRiskStudents';
import PerformanceTrends from './pages/PerformanceTrends';
import SubjectHeatmap from './pages/SubjectHeatmap';
import ExamReadiness from './pages/ExamReadiness';
import InsightsEngine from './pages/InsightsEngine';
import ReportExport from './pages/ReportExport';
import GenericSectionPage from './pages/GenericSectionPage';
import ReportsDashboardPage from './pages/reports/ReportsDashboardPage';
import MidTermReportsPage from './pages/reports/MidTermReportsPage';
import FinalReportsPage from './pages/reports/FinalReportsPage';
import GenerateReportsPage from './pages/reports/GenerateReportsPage';
import PublishReportsPage from './pages/reports/PublishReportsPage';
import DownloadCenterPage from './pages/reports/DownloadCenterPage';
import AllYearReportsPage from './pages/reports/AllYearReportsPage';
import ClassesPage from './pages/academic/ClassesPage';
import SubjectsPage from './pages/academic/SubjectsPage';
import AssessmentTypesPage from './pages/academic/AssessmentTypesPage';
import AcademicCalendarPage from './pages/academic/AcademicCalendarPage';
import CompetencyCategoriesPage from './pages/academic/CompetencyCategoriesPage';
import GradingSystemPage from './pages/academic/GradingSystemPage';

const RANKING_ROUTES = [
  'school-rankings', 'class-rankings', 'subject-rankings',
  'top-performers', 'most-improved', 'student-performance',
];

const STUDENT_REPORT_ROUTES = [
  'reports-dashboard', 'mid-term-reports', 'final-reports', 'all-year-reports',
  'generate-reports', 'publish-reports', 'download-center',
];

const REPORT_ROUTES = [
  'class-reports', 'subject-reports',
  'teacher-reports', 'examination-reports', 'competency-reports',
];

const EXAM_ROUTES = [
  'candidate-analysis', 'readiness-dashboard', 'prediction-reports', 'revision-tracking',
];

const INSIGHT_ROUTES = ['academic-insights', 'risk-alerts', 'recommendations'];

const GENERIC_ONLY = [
  'examination-setup',
  'marks-overview', 'marks-approval', 'missing-marks', 'marks-corrections', 'ranking-settings',
  'assessment-schedule', 'ongoing-assessments', 'assessment-completion', 'missing-assessments',
  'teacher-workload', 'marks-submission-status', 'lesson-coverage',
  'student-directory', 'academic-profiles', 'attendance-vs-performance', 'academic-history',
  'parent-notifications', 'teacher-notifications', 'academic-announcements',
  'promotion-rules', 'academic-targets', 'report-templates',
];

function pageElement(path) {
  if (path === 'dashboard') return <Dashboard />;
  if (path === 'classes') return <ClassesPage />;
  if (path === 'subjects') return <SubjectsPage />;
  if (path === 'assessment-types') return <AssessmentTypesPage />;
  if (path === 'competency-analysis') return <CompetencyCategoriesPage />;
  if (path === 'grading-system' || path === 'grade-configuration') return <GradingSystemPage />;
  if (path === 'academic-years' || path === 'terms') return <AcademicCalendarPage />;
  if (path === 'class-performance' || path === 'weak-classes') return <ClassPerformance />;
  if (path === 'subject-performance') return <SubjectPerformance />;
  if (path === 'weak-subjects') return <SubjectHeatmap />;
  if (path === 'teacher-performance' || path === 'performance-monitoring') return <TeacherPerformance />;
  if (path === 'at-risk-students') return <AtRiskStudents />;
  if (path === 'performance-trends' || path === 'school-performance') return <PerformanceTrends />;
  if (EXAM_ROUTES.includes(path)) return <ExamReadiness />;
  if (INSIGHT_ROUTES.includes(path)) return <InsightsEngine />;
  if (path === 'reports-dashboard') return <ReportsDashboardPage />;
  if (path === 'mid-term-reports') return <MidTermReportsPage />;
  if (path === 'final-reports') return <FinalReportsPage />;
  if (path === 'all-year-reports') return <AllYearReportsPage />;
  if (path === 'generate-reports') return <GenerateReportsPage />;
  if (path === 'publish-reports') return <PublishReportsPage />;
  if (path === 'download-center') return <DownloadCenterPage />;
  if (REPORT_ROUTES.includes(path)) return <ReportExport />;
  if (RANKING_ROUTES.includes(path)) return <StudentRanking />;
  if (GENERIC_ONLY.includes(path)) return <GenericSectionPage />;
  return <GenericSectionPage />;
}

const ALL_PATHS = [
  'dashboard', 'classes', 'subjects', 'assessment-types', 'competency-analysis', 'grading-system', 'grade-configuration', 'academic-years', 'terms',
  'class-performance', 'weak-classes', 'subject-performance', 'weak-subjects',
  'teacher-performance', 'performance-monitoring', 'at-risk-students',
  'performance-trends', 'school-performance',
  ...EXAM_ROUTES, ...INSIGHT_ROUTES,
  ...STUDENT_REPORT_ROUTES, ...REPORT_ROUTES, ...RANKING_ROUTES, ...GENERIC_ONLY,
];

export default function StudentMarksRoutes() {
  return (
    <Routes>
      <Route element={<MarksReportsLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        {ALL_PATHS.filter((p) => p !== 'dashboard').map((path) => (
          <Route key={path} path={path} element={pageElement(path)} />
        ))}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
}
