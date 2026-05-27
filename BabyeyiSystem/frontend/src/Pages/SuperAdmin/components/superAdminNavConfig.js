import {
  Home,
  School,
  PlusCircle,
  Layers,
  ShoppingBag,
  Shirt,
  Package,
  DollarSign,
  FileText,
  Users,
  UserCheck,
  Flag,
  MapPin,
  Radio,
  ShieldCheck,
  Sparkles,
  Percent,
  Receipt,
  GraduationCap,
  Fingerprint,
  IdCard,
  LayoutTemplate,
  Settings,
  Shield,
  Building2,
} from 'lucide-react';

export const SUPER_ADMIN_DASHBOARD_PATH = '/superadmin/dashboard';

/** Sidebar widths (px) — accountant-style expanded nav */
export const SA_SIDEBAR_WIDTH_EXPANDED = 260;
export const SA_SIDEBAR_WIDTH_COLLAPSED = 80;

/** Map route paths to sidebar page ids for external SuperAdmin routes */
export const SUPER_ADMIN_PATH_TO_PAGE = {
  '/superadmin/dashboard': 'dashboard',
  '/add-school': 'add-school',
  '/add-all-schools': 'add-all-schools',
  '/superadmin/voucher-services': 'voucher-services',
  '/superadmin/shoes-vouchers': 'shoes-vouchers',
  '/superadmin/uniform-vouchers': 'uniform-vouchers',
  '/superadmin/shop-products': 'shop-products',
  '/superadmin/standard-kit-requests': 'standard-kit-requests',
  '/superadmin/standard-shule-kits': 'standard-shule-kits',
  '/manage-requirements-prices': 'requirements-prices',
  '/requirement-prices-list': 'prices-list',
  '/invoices': 'invoices',
  '/superadmin/register-agents': 'register-agents',
  '/superadmin/representatives': 'representatives',
  '/superadmin/shule-avance-organizations': 'shule-avance-orgs',
  '/superadmin/shule-avance-teacher': 'shule-avance-teacher',
  '/superadmin/teacher-deal-products': 'teacher-deal-products',
  '/superadmin/ticha-deal-requests': 'ticha-deal-requests',
  '/superadmin/smart-access/students': 'smart-access-students',
  '/superadmin/smart-access/staff': 'smart-access-staff',
  '/superadmin/school-students-card': 'school-students-card',
  '/superadmin/student-card-template-2': 'student-card-template-2',
  '/superadmin/school-staff-card-template': 'school-staff-card-template',
  '/superadmin/audit': 'audit',
  '/superadmin/school-monitor': 'school-monitor',
};

export function pathnameToSuperAdminPage(pathname = '') {
  if (SUPER_ADMIN_PATH_TO_PAGE[pathname]) return SUPER_ADMIN_PATH_TO_PAGE[pathname];
  if (pathname.startsWith('/superadmin/smart-access/students')) return 'smart-access-students';
  if (pathname.startsWith('/superadmin/smart-access/staff')) return 'smart-access-staff';
  return 'dashboard';
}

/** Single source of truth for which nav item is active */
export function getActiveSuperAdminPage(pathname = '', search = '') {
  const onDashboard =
    pathname === SUPER_ADMIN_DASHBOARD_PATH || pathname.endsWith(SUPER_ADMIN_DASHBOARD_PATH);
  if (onDashboard) {
    const tab = new URLSearchParams(search).get('page');
    return tab && tab !== 'dashboard' ? tab : 'dashboard';
  }
  return pathnameToSuperAdminPage(pathname);
}

export function isSuperAdminDashboardPath(pathname = '') {
  return pathname === SUPER_ADMIN_DASHBOARD_PATH || pathname.endsWith(SUPER_ADMIN_DASHBOARD_PATH);
}

export function findSuperAdminNavLabel(pageId, groups = getSuperAdminNavGroups()) {
  if (pageId === 'dashboard') return 'Dashboard';
  for (const g of groups) {
    const item = g.items.find((i) => i.id === pageId);
    if (item) return item.label;
  }
  return 'Super Admin';
}

/**
 * Grouped Super Admin navigation (School Manager style).
 * Items may use `path` for external routes instead of in-app `setPage`.
 */
export function getSuperAdminNavGroups() {
  return [
    {
      id: 'schools',
      label: 'Schools & Setup',
      icon: School,
      items: [
        { id: 'schools', label: 'Schools', icon: School },
        { id: 'add-school', label: 'Add New School', icon: PlusCircle, highlight: true, path: '/add-school' },
        { id: 'add-all-schools', label: 'Quick Add School', icon: Layers, path: '/add-all-schools' },
        { id: 'admins', label: 'School Admins', icon: Users },
      ],
    },
    {
      id: 'pricing',
      label: 'Requirement Pricing',
      icon: DollarSign,
      items: [
        { id: 'requirements-prices', label: 'Set Prices', icon: DollarSign, path: '/manage-requirements-prices' },
        { id: 'prices-list', label: 'View Prices List', icon: FileText, path: '/requirement-prices-list' },
        { id: 'invoices', label: 'Invoices', icon: FileText, path: '/invoices' },
      ],
    },
    {
      id: 'student_services',
      label: 'Student Services',
      icon: ShoppingBag,
      items: [
        { id: 'voucher-services', label: 'Voucher Services', icon: ShoppingBag, path: '/superadmin/voucher-services' },
        { id: 'shoes-vouchers', label: 'Shoes Voucher Mgmt', icon: ShoppingBag, path: '/superadmin/shoes-vouchers' },
        { id: 'uniform-vouchers', label: 'Uniform Voucher Mgmt', icon: Shirt, path: '/superadmin/uniform-vouchers' },
        { id: 'shop-products', label: 'Shop Products', icon: ShoppingBag, path: '/superadmin/shop-products' },
        { id: 'standard-kit-requests', label: 'Standard Kit Requests', icon: Package, path: '/superadmin/standard-kit-requests' },
        { id: 'standard-shule-kits', label: 'Standard ShuleKit', icon: Package, path: '/superadmin/standard-shule-kits' },
      ],
    },
    {
      id: 'parents',
      label: 'Parents Control',
      icon: UserCheck,
      items: [
        { id: 'parents-control-accounts', label: 'Parents Account', icon: UserCheck },
        { id: 'parents-control-payments', label: 'Payments', icon: DollarSign },
      ],
    },
    {
      id: 'governance',
      label: 'Governance & Field',
      icon: Flag,
      items: [
        { id: 'nesa', label: 'NESA Admins', icon: Flag },
        { id: 'deo', label: 'DEO Officers', icon: MapPin },
        { id: 'register-agents', label: 'Field Agents', icon: Radio, path: '/superadmin/register-agents' },
        { id: 'representatives', label: 'School Representatives', icon: ShieldCheck, path: '/superadmin/representatives' },
      ],
    },
    {
      id: 'partners',
      label: 'Shule Avance & Deals',
      icon: Sparkles,
      items: [
        { id: 'shule-avance-orgs', label: 'ShuleAvance Orgs', icon: Sparkles, path: '/superadmin/shule-avance-organizations' },
        { id: 'shule-avance-teacher', label: 'ShuleAvance Teacher', icon: Percent, path: '/superadmin/shule-avance-teacher' },
        { id: 'teacher-deal-products', label: 'Teacher Deal Products', icon: Package, path: '/superadmin/teacher-deal-products' },
        { id: 'ticha-deal-requests', label: 'Ticha Deal Requests', icon: Receipt, path: '/superadmin/ticha-deal-requests' },
      ],
    },
    {
      id: 'smart_access',
      label: 'Smart Access & IDs',
      icon: IdCard,
      items: [
        { id: 'smart-access-students', label: 'Student Smart Access', icon: GraduationCap, path: '/superadmin/smart-access/students' },
        { id: 'smart-access-staff', label: 'Staff Smart Access', icon: Fingerprint, path: '/superadmin/smart-access/staff' },
        { id: 'school-students-card', label: 'School Students Card', icon: IdCard, path: '/superadmin/school-students-card' },
        { id: 'student-card-template-2', label: 'Student Card Template 2', icon: LayoutTemplate, path: '/superadmin/student-card-template-2' },
        { id: 'school-staff-card-template', label: 'Staff Card Template', icon: IdCard, path: '/superadmin/school-staff-card-template' },
      ],
    },
    {
      id: 'system',
      label: 'System',
      icon: Settings,
      items: [
        { id: 'audit', label: 'Audit Center', icon: Shield, path: '/superadmin/audit' },
        { id: 'school-monitor', label: 'School Monitoring', icon: Building2, path: '/superadmin/school-monitor' },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];
}

export function findNavGroupForPage(groups, pageId) {
  return groups.find((g) => g.items.some((i) => i.id === pageId))?.id ?? null;
}

/** Navigate: dashboard route, external path, or in-dashboard tab via ?page= */
export function resolveSuperAdminNavAction(item, { navigate, pathname, setSearchParams }) {
  if (item.id === 'dashboard') {
    navigate(SUPER_ADMIN_DASHBOARD_PATH, { replace: pathname === SUPER_ADMIN_DASHBOARD_PATH });
    return;
  }
  if (item.path) {
    navigate(item.path);
    return;
  }
  if (isSuperAdminDashboardPath(pathname) && setSearchParams) {
    setSearchParams({ page: item.id }, { replace: true });
    return;
  }
  navigate(`${SUPER_ADMIN_DASHBOARD_PATH}?page=${encodeURIComponent(item.id)}`);
}
