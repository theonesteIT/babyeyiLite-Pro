import useChatUnread from '../../../../../shared/hooks/useChatUnread';
import { PORTAL } from '../config/portal';
import { h } from '../utils/href';
import LitePortalSidebar from '../../../../shared/components/LitePortalSidebar';
import {
  LayoutDashboard,
  Receipt,
  FileSpreadsheet,
  GraduationCap,
  FileText,
  Banknote,
  PieChart,
  Target,
  Wallet,
  ClipboardCheck,
  Settings,
  History,
  CalendarDays,
  DollarSign,
  Sparkles,
  ShoppingBag,
  MessageSquare,
} from 'lucide-react';

function buildSections(unreadCount) {
  return [
    {
      label: 'Main',
      items: [{ icon: LayoutDashboard, name: 'Dashboard', path: '/', exact: true }],
    },
    {
      label: 'Finance center',
      items: [
        { icon: Receipt, name: 'Student Fees', path: '/fees' },
        { icon: FileSpreadsheet, name: 'Babyeyi Fee Cards', path: '/fees/babyeyi-fees' },
        { icon: GraduationCap, name: 'Examination list', path: '/examination-list' },
        { icon: FileText, name: 'Invoice Registry', path: '/invoices' },
        { icon: Banknote, name: 'Expenses', path: '/expenses' },
        { icon: FileSpreadsheet, name: 'Requisitions', path: '/requisitions' },
        { icon: PieChart, name: 'School Budget', path: '/school-budget' },
        { icon: Target, name: 'Action Plan', path: '/action-plan' },
        { icon: Wallet, name: 'Avance approvals', path: '/shule-avance' },
        {
          icon: ClipboardCheck,
          name: 'Payroll',
          subItems: [
            { name: 'Payroll History', path: '/payroll/history', icon: History },
            { name: 'Configure Payroll', path: '/payroll/config', icon: Settings },
          ],
        },
        { icon: CalendarDays, name: 'School Calendar', path: '/school-calendar' },
      ],
    },
    {
      label: 'Services',
      items: [
        { icon: DollarSign, name: 'My Payroll', path: '/my-payroll' },
        {
          icon: Sparkles,
          name: 'Tools',
          subItems: [
            { name: 'Ticha Deals', path: '/ticha-deals', icon: ShoppingBag },
            { name: 'My Shule Avance', path: '/my-shule-avance', icon: Wallet },
          ],
        },
        { icon: MessageSquare, name: 'Chat Center', path: '/chat', badgeCount: unreadCount },
      ],
    },
  ];
}

export default function Sidebar({ onClose }) {
  const unreadCount = useChatUnread();

  return (
    <LitePortalSidebar
      portalLabel="ACCOUNTANT PORTAL"
      href={h}
      sections={buildSections(unreadCount)}
      onClose={onClose}
      chatPath="/chat"
      supportMessage="Reach finance ops from chat or contact your school administrator."
      navAriaLabel="Accountant navigation"
    />
  );
}
