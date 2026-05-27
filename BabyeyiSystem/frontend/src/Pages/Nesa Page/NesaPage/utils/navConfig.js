import {
  Home,
  DollarSign,
  Activity,
  ShieldCheck,
  Building2,
  BarChart3,
  Bell,
  Settings,
  UserCog,
} from 'lucide-react';

export const NAV = [
  { id: 'dashboard', icon: Home, label: 'Dashboard' },
  { id: 'fees', icon: DollarSign, label: 'Tuition Manager' },
  { id: 'monitoring', icon: Activity, label: 'Monitoring' },
  { id: 'approvals', icon: ShieldCheck, label: 'Approvals' },
  { id: 'schools', icon: Building2, label: 'Schools' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'deo', icon: UserCog, label: 'DEO Officers' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];
