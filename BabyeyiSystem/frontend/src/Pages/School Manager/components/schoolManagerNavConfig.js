import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  FileText,
  ScrollText,
  Briefcase,
  DoorOpen,
  UserCog,
  Globe,
  TrendingUp,
  FolderOpen,
  Receipt,
  Wallet,
  BarChart2,
  Settings,
} from 'lucide-react';

/**
 * Grouped School Manager navigation (Lite + Pro).
 * Icons match District DEO sidebar — thin outline, stroke 1.75 in Sidebar.
 * @param {{ includeSchoolTeam?: boolean }} opts
 */
export function getSchoolManagerNavGroups({ includeSchoolTeam = false } = {}) {
  const staffItems = [
    { id: 'hr_center', label: 'HR Center', icon: Briefcase },
    { id: 'gate_attendance', label: 'Gate Attendance', icon: DoorOpen },
  ];
  if (includeSchoolTeam) {
    staffItems.unshift({ id: 'school_team', label: 'School Team', icon: UserCog });
  }

  return [
    {
      id: 'students',
      label: 'Student Management',
      items: [
        { id: 'students', label: 'Students', icon: Users },
        { id: 'student_transfer', label: 'Student Transfer', icon: ArrowLeftRight },
      ],
    },
    {
      id: 'babyeyi',
      label: 'Babyeyi',
      items: [
        { id: 'babyeyi', label: 'Babyeyi Wizard', icon: ScrollText },
        { id: 'babyeyi_list', label: 'Babyeyi List', icon: FileText },
        { id: 'requests', label: 'Increase Requests', icon: TrendingUp },
        { id: 'documents', label: 'Documents', icon: FolderOpen },
      ],
    },
    {
      id: 'staff',
      label: 'Staff & HR',
      items: staffItems,
    },
    {
      id: 'communication',
      label: 'Communication',
      items: [{ id: 'school_mini_website', label: 'School Website', icon: Globe }],
    },
    {
      id: 'finance',
      label: 'Finance',
      items: [
        { id: 'invoices', label: 'Invoices', icon: Receipt },
        { id: 'shule_avance', label: 'Shule Avance', icon: Wallet },
      ],
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      items: [{ id: 'analytics', label: 'Analytics', icon: BarChart2 }],
    },
    {
      id: 'system',
      label: 'System',
      items: [{ id: 'settings', label: 'Settings', icon: Settings }],
    },
  ];
}

/** Flat list for tab labels / header. */
export function flattenSchoolManagerNav(groups) {
  return [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...groups.flatMap((g) => g.items),
  ];
}

/** Find which group contains the active tab. */
export function findNavGroupForTab(groups, tabId) {
  if (tabId === 'dashboard') return null;
  return groups.find((g) => g.items.some((i) => i.id === tabId))?.id ?? null;
}
