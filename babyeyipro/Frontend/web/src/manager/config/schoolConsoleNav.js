import {
  Home,
  FileText,
  ClipboardList,
  Users,
  ArrowLeftRight,
  Globe,
  BarChart3,
} from 'lucide-react'

/**
 * Babyeyi school admin submenu — streamlined for Pro manager portal.
 */
export const SCHOOL_CONSOLE_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, pathSuffix: '?tab=dashboard' },
  { id: 'babyeyi', label: 'Babyeyi Wizard', icon: FileText, pathSuffix: '?tab=babyeyi' },
  { id: 'babyeyi_list', label: 'Babyeyi List', icon: ClipboardList, pathSuffix: '?tab=babyeyi_list' },
  { id: 'students', label: 'Students', icon: Users, pathSuffix: '?tab=students' },
  { id: 'student_transfer', label: 'Student Transfer', icon: ArrowLeftRight, pathSuffix: '?tab=student_transfer' },
  { id: 'school_mini_website', label: 'School Website', icon: Globe, pathSuffix: '?tab=school_mini_website' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, pathSuffix: '?tab=analytics' },
]

/** Tab ids rendered inside SchoolLiteSuite. */
export const SCHOOL_CONSOLE_TAB_IDS = new Set(SCHOOL_CONSOLE_NAV.map((n) => n.id))
