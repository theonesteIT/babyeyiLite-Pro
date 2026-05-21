import { Routes, Route, Navigate } from 'react-router-dom';
import StudentPromotionLayout from './components/StudentPromotionLayout';
import PromotionDashboard from './pages/Dashboard';
import PromoteByClass from './pages/PromoteByClass';
import PromoteByStudent from './pages/PromoteByStudent';
import PromotionSimulation from './pages/PromotionSimulation';
import PromotionHistory from './pages/PromotionHistory';
import GraduatedStudents from './pages/GraduatedStudents';
import RepeatersManagement from './pages/RepeatersManagement';
import PromotionReports from './pages/PromotionReports';
import PromotionSettings from './pages/PromotionSettings';

export default function StudentPromotionRoutes() {
  return (
    <Routes>
      <Route element={<StudentPromotionLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PromotionDashboard />} />
        <Route path="promote-class" element={<PromoteByClass />} />
        <Route path="promote-student" element={<PromoteByStudent />} />
        <Route path="simulation" element={<PromotionSimulation />} />
        <Route path="history" element={<PromotionHistory />} />
        <Route path="graduated" element={<GraduatedStudents />} />
        <Route path="repeaters" element={<RepeatersManagement />} />
        <Route path="reports" element={<PromotionReports />} />
        <Route path="settings" element={<PromotionSettings />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
}
