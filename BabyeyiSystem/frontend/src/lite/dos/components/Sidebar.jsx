import { useAuth } from '../context/AuthContext';
import useChatUnread from '../../../shared/hooks/useChatUnread';
import { PORTAL } from '../config/portal';
import { h } from '../utils/href';
import LitePortalSidebar from '../../shared/components/LitePortalSidebar';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  ClipboardCheck,
  ClipboardList,
  Eye,
  PenLine,
  LineChart,
  FileBarChart,
  FileText,
  ShieldCheck,
  CalendarDays,
  DollarSign,
  Sparkles,
  Wallet,
  ShoppingBag,
  MessageSquare,
  BookOpen,
  UserCog,
  BookMarked,
  Clock,
  CalendarClock,
  IdCard,
} from 'lucide-react';

function buildSections(proAccessEffective, unreadCount) {
  return [
    {
      label: 'Main',
      items: [{ icon: LayoutDashboard, name: 'Dashboard', path: '/', exact: true }],
    },
    {
      label: 'Academic oversight',
      items: [
        {
          icon: GraduationCap,
          name: 'Staff & Academics',
          subItems: [
            { name: 'Staff Management', path: '/timetable?tab=teachers', icon: UserCog },
            { name: 'Courses & Subjects', path: '/timetable?tab=courses', icon: BookMarked },
            { name: 'Time Settings', path: '/timetable?tab=schedule', icon: Clock },
            { name: 'Assignments', path: '/timetable?tab=assignments', icon: ClipboardCheck },
            { name: 'Timetable Generator', path: '/timetable?tab=generator', icon: Sparkles },
            { name: 'View Timetable', path: '/timetable?tab=timetable', icon: CalendarClock },
          ],
        },
        {
          icon: Users,
          name: 'Students',
          subItems: [{ name: 'Student Records', path: '/student-records', icon: IdCard }],
        },
        {
          icon: ClipboardCheck,
          name: 'Attendance',
          subItems: [
            { name: 'General Attendance', path: '/attendance', icon: ClipboardCheck },
            { name: 'Teacher Period Attendance', path: '/teacher-period-attendance', icon: Clock },
          ],
        },
        {
          icon: ClipboardList,
          name: 'Marks',
          subItems: [
            { name: 'View marks', path: '/marks/view', icon: Eye },
            { name: 'Record marks', path: '/marks/record', icon: PenLine },
            ...(proAccessEffective
              ? [{ name: 'Academic progress', path: '/progress', icon: LineChart }]
              : []),
          ],
        },
        {
          icon: FileBarChart,
          name: 'Teachers reports',
          subItems: [
            { name: 'Teacher requisitions', path: '/teacher-requisitions', icon: ClipboardList },
            { name: 'Student permissions', path: '/teacher-permissions', icon: ShieldCheck },
            { name: 'Staff permissions', path: '/staff-permissions', icon: ShieldCheck },
            { name: 'Lesson plan reports', path: '/lesson-plan-reports', icon: FileText },
          ],
        },
        { icon: CalendarDays, name: 'School Calendar', path: '/school-calendar' },
      ],
    },
    {
      label: 'Professional resources',
      items: [
        { icon: DollarSign, name: 'My Payroll', path: '/my-payroll' },
        {
          icon: Sparkles,
          name: 'School Tools',
          subItems: [
            { name: 'Shule Avance', path: '/shule-avance', icon: Wallet },
            { name: 'Ticha Deals', path: '/ticha-deals', icon: ShoppingBag },
            { name: 'Ticha AI', path: '/ticha-ai', icon: MessageSquare },
            { name: 'English Club', path: '/english-club', icon: BookOpen },
          ],
        },
        { icon: MessageSquare, name: 'Chat Center', path: '/chat', badgeCount: unreadCount },
      ],
    },
  ];
}

export default function Sidebar({ onClose }) {
  const { proAccessEffective } = useAuth();
  const unreadCount = useChatUnread();

  return (
    <LitePortalSidebar
      portalLabel="DOS PORTAL"
      href={h}
      sections={buildSections(proAccessEffective, unreadCount)}
      onClose={onClose}
      chatPath="/chat"
      supportMessage="Reach academics ops from chat or your school administrator."
      navAriaLabel="DOS navigation"
    />
  );
}
