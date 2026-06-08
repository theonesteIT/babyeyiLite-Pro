import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  Tags,
  Calendar,
  Building2,
  FolderOpen,
  GraduationCap,
  Network,
} from 'lucide-react'

/** HR Center sidebar submenu — maps to routes under /hr */
export const HR_CENTER_NAV = [
  { id: 'dashboard', label: 'HR Dashboard', icon: LayoutDashboard, path: '/hr' },
  { id: 'directory', label: 'Employee Directory', icon: Users, path: '/hr/directory' },
  { id: 'registration', label: 'Employee Registration', icon: UserPlus, path: '/hr/registration' },
  { id: 'contracts', label: 'Employment Contracts', icon: FileText, path: '/hr/contracts' },
  { id: 'categories', label: 'Employment Categories', icon: Tags, path: '/hr/categories' },
  { id: 'leave', label: 'Leave Management', icon: Calendar, path: '/hr/leave' },
  { id: 'departments', label: 'Departments', icon: Building2, path: '/hr/departments' },
  { id: 'hierarchy', label: 'Organization Structure', icon: Network, path: '/hr/organization' },
  { id: 'documents', label: 'Staff Documents', icon: FolderOpen, path: '/hr/documents' },
  { id: 'qualifications', label: 'Qualifications', icon: GraduationCap, path: '/hr/qualifications' },
]
