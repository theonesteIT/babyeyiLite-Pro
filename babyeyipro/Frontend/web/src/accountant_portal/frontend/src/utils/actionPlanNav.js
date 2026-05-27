import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Wallet,
  Target,
  BadgeCheck,
  FileText,
  CalendarDays,
  Bell,
} from 'lucide-react';

export const ACTION_PLAN_NAV = [
  {
    section: 'Action Plan Management',
    items: [
      { id: 'ap-dashboard', label: 'Dashboard', Icon: LayoutDashboard },
      { id: 'ap-create', label: 'Create Action Plan', Icon: PlusCircle },
      { id: 'ap-activities', label: 'Activities', Icon: ClipboardList },
      { id: 'ap-budget', label: 'Budget Tracking', Icon: Wallet },
      { id: 'ap-progress', label: 'Progress Tracking', Icon: Target },
      { id: 'ap-approvals', label: 'Approvals', Icon: BadgeCheck },
      { id: 'ap-reports', label: 'Reports', Icon: FileText },
      { id: 'ap-calendar', label: 'Calendar View', Icon: CalendarDays },
      { id: 'ap-notifications', label: 'Notifications', Icon: Bell },
    ],
  },
];

export function actionPlanPageLabel(pageId) {
  for (const section of ACTION_PLAN_NAV) {
    const item = section.items.find((i) => i.id === pageId);
    if (item) return item.label;
  }
  return 'Dashboard';
}
