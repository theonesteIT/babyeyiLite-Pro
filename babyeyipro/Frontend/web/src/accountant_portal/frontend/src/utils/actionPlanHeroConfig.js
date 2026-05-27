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

/** Amber hero copy per Action Plan nav page — matches accountant Dashboard (#c87800). */
export const ACTION_PLAN_HERO = {
  'ap-dashboard': {
    eyebrow: 'School Action Plan',
    title: 'Action Plan Dashboard',
    subtitle: 'Plan, monitor, and track school activities',
    icon: LayoutDashboard,
  },
  'ap-create': {
    eyebrow: 'School Action Plan',
    title: 'Create Action Plan',
    subtitle: 'Define term activities, budgets, and ownership',
    icon: PlusCircle,
  },
  'ap-activities': {
    eyebrow: 'School Action Plan',
    title: 'Activity Planning',
    subtitle: 'Schedule activities, categories, and responsible staff',
    icon: ClipboardList,
  },
  'ap-budget': {
    eyebrow: 'School Action Plan',
    title: 'Budget Tracking',
    subtitle: 'Link activities to budget lines and record spend',
    icon: Wallet,
  },
  'ap-progress': {
    eyebrow: 'School Action Plan',
    title: 'Progress Tracking',
    subtitle: 'Update completion status and activity milestones',
    icon: Target,
  },
  'ap-approvals': {
    eyebrow: 'School Action Plan',
    title: 'Approvals',
    subtitle: 'Submit plans for manager review and track decisions',
    icon: BadgeCheck,
  },
  'ap-reports': {
    eyebrow: 'School Action Plan',
    title: 'Reports & Analytics',
    subtitle: 'Completion, budget usage, and department performance',
    icon: FileText,
  },
  'ap-calendar': {
    eyebrow: 'School Action Plan',
    title: 'Calendar View',
    subtitle: 'Month, week, and Gantt timelines for planned activities',
    icon: CalendarDays,
  },
  'ap-notifications': {
    eyebrow: 'School Action Plan',
    title: 'Notifications',
    subtitle: 'Deadline reminders and approval alerts',
    icon: Bell,
  },
};

export function getActionPlanHeroConfig(pageId) {
  return ACTION_PLAN_HERO[pageId] || null;
}
