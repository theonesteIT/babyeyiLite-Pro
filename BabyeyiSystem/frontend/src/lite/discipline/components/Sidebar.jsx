import { useAuth } from '../context/AuthContext';
import useChatUnread from '../hooks/useChatUnread';
import { PORTAL } from '../config/portal';
import { h } from '../utils/href';
import LitePortalSidebar from '../../shared/components/LitePortalSidebar';
import {
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  Users,
  ClipboardCheck,
  DollarSign,
  Wallet,
  ShoppingBag,
  FileSpreadsheet,
  MessageSquare,
} from 'lucide-react';

const SECTIONS = [
  {
    label: 'Main',
    items: [{ icon: LayoutDashboard, name: 'Dashboard', path: '/', exact: true }],
  },
  {
    label: 'Discipline',
    items: [
      { icon: ClipboardList, name: 'Set Marks', path: '/discipline/set-marks' },
      { icon: ShieldCheck, name: 'Conduct Hub', path: '/conduct' },
    ],
  },
  {
    label: 'Academic',
    items: [
      { icon: Users, name: 'Students', path: '/students' },
      { icon: ClipboardCheck, name: 'Attendance', path: '/attendance' },
    ],
  },
  {
    label: 'Management',
    items: [
      { icon: ShieldCheck, name: 'Permissions', path: '/permission' },
      { icon: DollarSign, name: 'My Payroll', path: '/payroll' },
      { icon: Wallet, name: 'Shule Avance', path: '/shule-avance' },
      { icon: ShoppingBag, name: 'Ticha Deals', path: '/ticha-deals' },
      { icon: FileSpreadsheet, name: 'Requisitions', path: '/requisitions' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { icon: MessageSquare, name: 'TichaAI', path: '/ticha-ai' },
      { icon: MessageSquare, name: 'Chat Center', path: '/chat', badgeCount: 0 },
    ],
  },
];

export default function Sidebar({ onClose }) {
  const unreadCount = useChatUnread();
  const sections = SECTIONS.map((sec) => ({
    ...sec,
    items: sec.items.map((item) =>
      item.path === '/chat' ? { ...item, badgeCount: unreadCount } : item,
    ),
  }));

  return (
    <LitePortalSidebar
      portalLabel={`${PORTAL.roleLabel.toUpperCase()} PORTAL`}
      href={h}
      sections={sections}
      onClose={onClose}
      chatPath="/chat"
      supportMessage="Reach your school admin or open chat for conduct and learner support."
      navAriaLabel="Head of Discipline navigation"
    />
  );
}
