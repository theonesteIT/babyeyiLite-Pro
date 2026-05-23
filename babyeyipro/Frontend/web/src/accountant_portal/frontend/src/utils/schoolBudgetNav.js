import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  BarChart3,
  Building2,
  Receipt,
  Scale,
  BadgeCheck,
  FileText,
  TrendingUp,
  Landmark,
  Package,
  TrendingDown,
  Gem,
  ArrowLeftRight,
  ScrollText,
} from 'lucide-react';

export const SCHOOL_BUDGET_NAV = [
  {
    section: 'Budget Management',
    items: [
      { id: 'budget-dashboard', label: 'Dashboard', Icon: LayoutDashboard },
      { id: 'create-budget', label: 'Create Budget', Icon: PlusCircle },
      { id: 'budget-lines', label: 'Budget Lines', Icon: ClipboardList },
      { id: 'budget-usage-tracking', label: 'Usage Tracking', Icon: BarChart3 },
      { id: 'dept-budgets', label: 'Department Budgets', Icon: Building2 },
     
      { id: 'budget-vs-actual', label: 'Budget vs Actual', Icon: Scale },
      { id: 'approvals', label: 'Approvals', Icon: BadgeCheck },
     
      { id: 'analytics', label: 'Analytics', Icon: TrendingUp },
    ],
  },
  {
    section: 'Financial Statements',
    items: [
      { id: 'balance-sheet', label: 'Balance Sheet', Icon: Landmark },
     
      { id: 'audit-logs', label: 'Audit Logs', Icon: ScrollText },
    ],
  },
];

export function schoolBudgetPageLabel(activePage) {
  return SCHOOL_BUDGET_NAV.flatMap((s) => s.items).find((i) => i.id === activePage)?.label || 'Dashboard';
}
