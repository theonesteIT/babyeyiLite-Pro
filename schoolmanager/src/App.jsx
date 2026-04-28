import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { 
  Layout 
} from './components/layout';

import './index.css';

import Home from './pages/index';
import Staff from './pages/staff';
import StaffCreate from './pages/staff_create';
import OrganisationStructure from './pages/organisation_structure';
import Students from './pages/students';
import StudentCreate from './pages/student_create';
import StudentEnrollment from './pages/student_enrollment';
import StudentDashboard from './pages/student_dashboard';
import Parents from './pages/parents';
import ParentCreate from './pages/parent_create';
import AttendanceHub from './pages/attendance_hub';
import AttendanceStudents from './pages/attendance';
import AttendanceTeachers from './pages/attendance_teachers';
import AttendanceConfig from './pages/attendance_config';
import Timetable from './pages/timetable';
import SchoolDays from './pages/school_days';
import ChatCenter from './pages/chat_center';

const staffNavItems = [
  { label: 'HR Central', path: '/staff' },
  { label: 'Organisation Structure', path: '/staff/organisation-structure' },
  { label: 'Staff Reports', path: '/staff/reports' },
];

const studentNavItems = [
  { label: 'Dashboard', path: '/students/dashboard' },
  { label: 'All Students', path: '/students' },
  { label: 'Parent Portal', path: '/students/parents' },
  { label: 'Enrollment', path: '/students/enroll' },
];

const attendanceNavItems = [
  { label: 'Student Attendance', path: '/attendance/students' },
  { label: 'Teacher Attendance', path: '/attendance/teachers' },
  { label: 'Configurations', path: '/attendance/config' },
];

const academicNavItems = [
  { label: 'Weekly Timetable', path: '/academic/timetable' },
  { label: 'School Days Config', path: '/academic/school-days' },
];

const communicationNavItems = [
  { label: 'Chat Center', path: '/communication/chat' },
];

function AppContent() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isStaff = location.pathname.startsWith('/staff');
  const isStudents = location.pathname.startsWith('/students');
  const isAttendance = location.pathname.startsWith('/attendance');
  const isAcademic = location.pathname.startsWith('/academic');
  const isCommunication = location.pathname.startsWith('/communication');

  let navItems = [];
  if (isStaff) navItems = staffNavItems;
  else if (isStudents) navItems = studentNavItems;
  else if (isAttendance) navItems = attendanceNavItems;
  else if (isAcademic) navItems = academicNavItems;
  else if (isCommunication) navItems = communicationNavItems;
  else if (!isHome) navItems = [{ label: 'Dashboard', path: '/' }];

  const title = isStaff ? "HR Central" : isStudents ? "Students" : isAttendance ? "Attendance" : isAcademic ? "Timetable" : isCommunication ? "Communication" : "";

  return (
    <Layout 
      userName="Alex Johnson" 
      isHome={isHome} 
      navItems={navItems} 
      title={title}
    >
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/staff/new" element={<StaffCreate />} />
        <Route path="/staff/organisation-structure" element={<OrganisationStructure />} />
        <Route path="/students" element={<Students />} />
        <Route path="/students/dashboard" element={<StudentDashboard />} />
        <Route path="/students/new" element={<StudentCreate />} />
        <Route path="/students/enroll" element={<StudentEnrollment />} />
        <Route path="/students/parents" element={<Parents />} />
        <Route path="/students/parents/new" element={<ParentCreate />} />
        <Route path="/attendance" element={<AttendanceHub />} />
        <Route path="/attendance/students" element={<AttendanceStudents />} />
        <Route path="/attendance/teachers" element={<AttendanceTeachers />} />
        <Route path="/attendance/config" element={<AttendanceConfig />} />
        <Route path="/academic/timetable" element={<Timetable />} />
        <Route path="/academic/school-days" element={<SchoolDays />} />
        <Route path="/communication/chat" element={<ChatCenter />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
