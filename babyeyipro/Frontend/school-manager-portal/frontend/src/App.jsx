import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ShuleAvance from './pages/ShuleAvance';
import TichaAI from './pages/TichaAI';
import EnglishClub from './pages/EnglishClub';
import Students from './pages/Students';
import FeaturePlaceholders from './pages/FeaturePlaceholders';
import AcademicPlanner from './pages/AcademicPlanner';
import RegistryOperations from './pages/RegistryOperations';
import Attendance from './pages/Attendance';
import RecordMarks from './pages/RecordMarks';
import ViewMarks from './pages/ViewMarks';
import Registry from './pages/Registry';
import FinanceCenter from './pages/FinanceCenter';
import FeePayments from './pages/FeePayments';
import BabyeyiWizard from './pages/BabyeyiWizard';
import HRCentral from './pages/HRCentral';
import AcademicReports from './pages/AcademicReports';
import ClassAcademicReport from './pages/ClassAcademicReport';
import StudentAttendanceReports from './pages/StudentAttendanceReports';
import StaffAttendanceReports from './pages/StaffAttendanceReports';
import DisciplineReports from './pages/DisciplineReports';
import SystemConfiguration from './pages/SystemConfiguration';
import PermissionsManager from './pages/PermissionsManager';
import './index.css';

// ── Loading screen ────────────────────────────────────────────
const LoadingScreen = () => (
  <div className="min-h-screen bg-re-bg flex flex-col items-center justify-center gap-4 font-sans">
    <div className="w-12 h-12 rounded-2xl animate-spin"
      style={{ background: 'linear-gradient(135deg,#1E3A5F,#FEBF10)' }} />
    <p className="text-re-text-muted text-sm font-bold uppercase tracking-widest animate-pulse">
      Loading Manager Portal...
    </p>
  </div>
);

// ── Protected Route ───────────────────────────────────────────
const ProtectedRoute = ({ children, title }) => {
  const { manager, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!manager) return <Navigate to="/login" />;
  return <Layout title={title}>{children}</Layout>;
};

// ── Routes ────────────────────────────────────────────────────
function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Core pages */}
      <Route path="/" element={<ProtectedRoute title="Dashboard">         <Dashboard />                                                    </ProtectedRoute>} />
      <Route path="/avance" element={<ProtectedRoute title="Infrastructure Avance">    <ShuleAvance />                                                  </ProtectedRoute>} />
      <Route path="/manager-ai" element={<ProtectedRoute title="ManagerAI">           <TichaAI />                                                      </ProtectedRoute>} />
      <Route path="/english-club" element={<ProtectedRoute title="English Club">      <EnglishClub />                                                  </ProtectedRoute>} />

      {/* New sidebar pages */}
      <Route path="/students" element={<ProtectedRoute title="Students">          <Students />                                                     </ProtectedRoute>} />
      <Route path="/timetable" element={<ProtectedRoute title="Academic Planner">  <AcademicPlanner />                                              </ProtectedRoute>} />
      <Route path="/operations" element={<ProtectedRoute title="School Operations"><RegistryOperations />                                           </ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute title="Attendance">        <Attendance />                                                   </ProtectedRoute>} />
      <Route path="/registry" element={<ProtectedRoute title="School Registry">   <Registry />                                                     </ProtectedRoute>} />
      <Route path="/marks/view" element={<ProtectedRoute title="View Student Marks"><ViewMarks /></ProtectedRoute>} />
      <Route path="/marks/record" element={<ProtectedRoute title="Record Marks">      <RecordMarks /></ProtectedRoute>} />
      <Route path="/finance" element={<ProtectedRoute title="Finance Center">      <FinanceCenter /></ProtectedRoute>} />
      <Route path="/hr" element={<ProtectedRoute title="HRCentral">          <HRCentral /></ProtectedRoute>} />
      <Route path="/finance/payments" element={<ProtectedRoute title="Student Fee Payments">  <FeePayments /></ProtectedRoute>} />
      <Route path="/finance/wizard" element={<ProtectedRoute title="Babyeyi Wizard">      <BabyeyiWizard /></ProtectedRoute>} />

      {/* Reports placeholders */}
      <Route path="/reports/academic" element={<ProtectedRoute title="Academic Reports">   <AcademicReports />   </ProtectedRoute>} />
      <Route path="/reports/academic/class/:className" element={<ProtectedRoute title="Class Academic Report"> <ClassAcademicReport /> </ProtectedRoute>} />
      <Route path="/reports/attendance/students" element={<ProtectedRoute title="Student Attendance Reports"> <StudentAttendanceReports /> </ProtectedRoute>} />
      <Route path="/reports/attendance/staff" element={<ProtectedRoute title="Staff Attendance Reports"> <StaffAttendanceReports /> </ProtectedRoute>} />
      <Route path="/reports/attendance" element={<Navigate to="/reports/attendance/students" />} />
      <Route path="/reports/discipline" element={<ProtectedRoute title="Student Discipline">  <DisciplineReports />  </ProtectedRoute>} />

      {/* Configuration */}
      <Route path="/settings" element={<ProtectedRoute title="System Configuration"><SystemConfiguration /></ProtectedRoute>} />
      <Route path="/settings/gradebook" element={<Navigate to="/operations?tab=gradebook" replace />} />
      <Route path="/permissions" element={<ProtectedRoute title="Student Permissions"><PermissionsManager /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
