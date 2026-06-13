import { Routes, Route, Navigate } from 'react-router-dom';
import MarksLayout from './components/Layout/DashboardLayout';

import MarksDashboard from './pages/Dashboard';
import TeacherInsights from './pages/TeacherInsights';
import RecordMarks from './pages/RecordMarks.jsx';
import MarksCenter from './pages/MarksCenter.jsx';
import Assessments from './pages/Assessments';
import GradeBook from './pages/GradeBook';
import QuestionBank from './pages/QuestionBank';
import StudentProfiles from './pages/StudentProfiles';
import AtRiskStudents from './pages/AtRiskStudents';
import StudentPerformance from './pages/StudentPerformance';
import RecordCompetencies from './pages/RecordCompetencies.jsx';
import Rankings from './pages/Rankings';
import AIPredictions from './pages/AIPredictions';
import LearningGaps from './pages/LearningGaps';
import MarksAttendance from './pages/Attendance';
import AttendanceAnalysis from './pages/AttendanceAnalysis';
import ParentCommunication from './pages/ParentCommunication';
import Notifications from './pages/Notifications';
import Meetings from './pages/Meetings';
import Reports from './pages/Reports';
import CBCReports from './pages/CBCReports';
import PerformanceReports from './pages/PerformanceReports';
import InterventionPlans from './pages/InterventionPlans';
import ClassPerformance from './pages/ClassPerformance';

export default function MarksRoutes() {
  return (
    <Routes>
      <Route element={<MarksLayout />}>
        <Route index element={<MarksDashboard />} />
        <Route path="insights" element={<TeacherInsights />} />
        <Route path="record-marks" element={<RecordMarks />} />
        <Route path="marks-center" element={<MarksCenter />} />
        <Route path="register-marks" element={<Navigate to="/marks/record-marks" replace />} />
        <Route path="assessments" element={<Assessments />} />
        <Route path="grade-book" element={<GradeBook />} />
        <Route path="question-bank" element={<QuestionBank />} />
        <Route path="student-profiles" element={<StudentProfiles />} />
        <Route path="at-risk" element={<AtRiskStudents />} />
        <Route path="student-performance" element={<StudentPerformance />} />
        <Route path="competencies" element={<RecordCompetencies />} />
        <Route path="rankings" element={<Rankings />} />
        <Route path="predictions" element={<AIPredictions />} />
        <Route path="learning-gaps" element={<LearningGaps />} />
        <Route path="class-performance" element={<ClassPerformance />} />
        <Route path="attendance" element={<MarksAttendance />} />
        <Route path="attendance-analytics" element={<AttendanceAnalysis />} />
        <Route path="parent-communication" element={<ParentCommunication />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="meetings" element={<Meetings />} />
        <Route path="reports" element={<Reports />} />
        <Route path="cbc-reports" element={<CBCReports />} />
        <Route path="performance-reports" element={<PerformanceReports />} />
        <Route path="interventions" element={<InterventionPlans />} />
        <Route path="*" element={<Navigate to="/marks" replace />} />
      </Route>
    </Routes>
  );
}
