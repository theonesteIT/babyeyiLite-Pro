import {
  Home,
  FileText,
  Send,
  FolderOpen,
  BarChart3,
  Bell,
  Globe,
  Users,
  UserCog,
  Receipt,
  Settings,
  Shield,
} from 'lucide-react'

/**
 * Same order/labels as BabyeyiSystem School Manager (SchoolBabyeyi.jsx) + Settings/Audit from Pro suite.
 * `invoices` opens Pro Finance Center instead of a tab.
 */
export const SCHOOL_CONSOLE_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, pathSuffix: '?tab=dashboard' },
  { id: 'babyeyi', label: 'Babyeyi Wizard', icon: FileText, pathSuffix: '?tab=babyeyi' },
  { id: 'babyeyi_list', label: 'Babyeyi List', icon: FolderOpen, pathSuffix: '?tab=babyeyi_list' },
  { id: 'students', label: 'Students', icon: Users, pathSuffix: '?tab=students' },
  { id: 'student_transfer', label: 'Student Transfer', icon: Users, pathSuffix: '?tab=student_transfer' },
  { id: 'school_team', label: 'School team', icon: UserCog, pathSuffix: '?tab=school_team' },
  { id: 'school_mini_website', label: 'School Website', icon: Globe, pathSuffix: '?tab=school_mini_website' },
  { id: 'requests', label: 'Increase Requests', icon: Send, pathSuffix: '?tab=requests' },
  { id: 'documents', label: 'Documents', icon: FolderOpen, pathSuffix: '?tab=documents' },
  { id: 'invoices', label: 'Invoices', icon: Receipt, path: '/finance', external: true },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, pathSuffix: '?tab=analytics' },
  { id: 'notifications', label: 'Notifications', icon: Bell, pathSuffix: '?tab=notifications' },
  { id: 'settings', label: 'Settings', icon: Settings, pathSuffix: '?tab=settings' },
  { id: 'audit', label: 'Audit', icon: Shield, pathSuffix: '?tab=audit' },
]

/** Tab ids rendered inside SchoolLiteSuite (excludes invoices — redirects to /finance). */
export const SCHOOL_CONSOLE_TAB_IDS = new Set(
  SCHOOL_CONSOLE_NAV.filter((n) => !n.external).map((n) => n.id)
)
