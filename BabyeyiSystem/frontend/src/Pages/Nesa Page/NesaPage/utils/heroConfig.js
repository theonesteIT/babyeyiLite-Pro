import {
  Shield,
  DollarSign,
  Activity,
  ShieldCheck,
  Building2,
  BarChart3,
  Bell,
  Settings,
  UserCog,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  School,
} from 'lucide-react';
import { fmt } from './helpers';

/**
 * Per-tab amber hero content (title, pills, KPI strip).
 * KPI values may be placeholders until child pages report metrics.
 */
export function buildHeroConfig(tab, ctx = {}) {
  const { stats, feeStats, nesaUser, dateLabel, tabMetrics = {} } = ctx;
  const welcome = nesaUser?.fullName || 'NESA Administrator';

  const base = {
    eyebrow: `National education · ${dateLabel}`,
    welcome: `Welcome, ${welcome}`,
  };

  switch (tab) {
    case 'dashboard':
      return {
        ...base,
        title: 'NESA Dashboard',
        icon: Shield,
        pills: [
          { icon: Building2, label: `${fmt(stats?.schools_count)} Schools`, variant: 'muted' },
          { icon: Clock, label: `${fmt(stats?.needs_action)} Need action`, variant: 'accent' },
          ...(Number(stats?.exceeds_count || 0) > 0
            ? [{ icon: AlertTriangle, label: `${fmt(stats.exceeds_count)} Violations`, variant: 'alert', pulse: true }]
            : []),
        ],
        kpis: [
          { key: 'total', icon: FileText, label: 'Total requests', value: fmt(stats?.total_requests) },
          { key: 'action', icon: Clock, label: 'Needs action', value: fmt(stats?.needs_action) },
          { key: 'approved', icon: CheckCircle, label: 'Approved', value: fmt(stats?.approved) },
          {
            key: 'rejected',
            icon: XCircle,
            label: 'Rejected',
            value: fmt(Number(stats?.rejected || 0) + Number(stats?.nesa_rejected || 0)),
          },
          { key: 'recommended', icon: Activity, label: 'Recommended', value: fmt(stats?.recommended) },
          { key: 'violations', icon: AlertTriangle, label: 'Violations', value: fmt(stats?.exceeds_count) },
        ],
      };

    case 'fees':
      return {
        ...base,
        title: 'Tuition Manager',
        subtitle: 'Set maximum allowed school fees · Full CRUD with audit trail',
        icon: DollarSign,
        pills: [
          { icon: School, label: `${fmt(feeStats?.total)} Total limits`, variant: 'muted' },
          { icon: FileText, label: 'National fee regulations', variant: 'accent' },
        ],
        kpis: [
          { key: 'public', icon: School, label: 'Public schools', value: fmt(feeStats?.public_count) },
          { key: 'private', icon: School, label: 'Private schools', value: fmt(feeStats?.private_count) },
          { key: 'boarding', icon: School, label: 'Boarding', value: fmt(feeStats?.boarding_count) },
          { key: 'tvet', icon: School, label: 'TVET', value: fmt(feeStats?.tvet_count) },
        ],
        kpiCols: 4,
      };

    case 'monitoring': {
      const m = tabMetrics.monitoring || {};
      return {
        ...base,
        title: 'Fee Monitoring',
        subtitle: 'Track schools exceeding national fee limits',
        icon: Activity,
        pills: [
          { icon: AlertTriangle, label: `${fmt(m.total ?? stats?.exceeds_count)} Violations`, variant: 'alert' },
        ],
        kpis: [
          { key: 'total', icon: AlertTriangle, label: 'Total violations', value: fmt(m.total) },
          { key: 'no_req', icon: FileText, label: 'No request filed', value: fmt(m.no_request) },
          { key: 'pending', icon: Clock, label: 'Pending requests', value: fmt(m.pending) },
          { key: 'approved', icon: CheckCircle, label: 'Approved', value: fmt(m.approved) },
        ],
        kpiCols: 4,
      };
    }

    case 'approvals': {
      const a = tabMetrics.approvals || {};
      return {
        ...base,
        title: 'Approvals',
        subtitle: 'All fee increase reports · filter by academic year & term from school Babyeyi',
        icon: ShieldCheck,
        pills: [
          { icon: Clock, label: `${fmt(a.pending ?? stats?.needs_action)} Need action`, variant: 'accent' },
          { icon: CheckCircle, label: `${fmt(a.approved ?? stats?.approved)} Approved`, variant: 'muted' },
        ],
        kpis: [
          { key: 'total', icon: FileText, label: 'In view', value: fmt(a.total ?? stats?.total_requests) },
          { key: 'action', icon: Clock, label: 'Needs action', value: fmt(a.pending ?? stats?.needs_action) },
          { key: 'approved', icon: CheckCircle, label: 'Approved', value: fmt(a.approved ?? stats?.approved) },
          { key: 'recommended', icon: Activity, label: 'DEO recommended', value: fmt(a.recommended ?? stats?.recommended) },
        ],
        kpiCols: 4,
      };
    }

    case 'schools': {
      const s = tabMetrics.schools || {};
      return {
        ...base,
        title: 'Schools',
        subtitle: 'National school registry and compliance overview',
        icon: Building2,
        pills: [
          { icon: Building2, label: `${fmt(s.total ?? stats?.schools_count)} Schools`, variant: 'muted' },
        ],
        kpis: [
          { key: 'schools', icon: Building2, label: 'Registered schools', value: fmt(s.total ?? stats?.schools_count) },
          { key: 'violations', icon: AlertTriangle, label: 'Violations', value: fmt(stats?.exceeds_count) },
          { key: 'pending', icon: Clock, label: 'Pending requests', value: fmt(stats?.needs_action) },
          { key: 'approved', icon: CheckCircle, label: 'Approved', value: fmt(stats?.approved) },
        ],
        kpiCols: 4,
      };
    }

    case 'analytics':
      return {
        ...base,
        title: 'Analytics',
        subtitle: 'National trends · submissions and compliance',
        icon: BarChart3,
        pills: [{ icon: BarChart3, label: 'All districts', variant: 'accent' }],
        kpis: [
          { key: 'total', icon: FileText, label: 'Total requests', value: fmt(stats?.total_requests) },
          { key: 'approved', icon: CheckCircle, label: 'Approved', value: fmt(stats?.approved) },
          { key: 'pending', icon: Clock, label: 'Needs action', value: fmt(stats?.needs_action) },
          { key: 'violations', icon: AlertTriangle, label: 'Violations', value: fmt(stats?.exceeds_count) },
        ],
        kpiCols: 4,
      };

    case 'notifications': {
      const n = tabMetrics.notifications || {};
      return {
        ...base,
        title: 'Notifications',
        subtitle: 'Alerts and updates for national oversight',
        icon: Bell,
        pills: [{ icon: Bell, label: `${fmt(n.unread ?? 0)} Unread`, variant: 'accent' }],
        kpis: [
          { key: 'unread', icon: Bell, label: 'Unread', value: fmt(n.unread) },
          { key: 'total', icon: FileText, label: 'All notifications', value: fmt(n.total) },
          { key: 'action', icon: Clock, label: 'Needs action', value: fmt(stats?.needs_action) },
          { key: 'schools', icon: Building2, label: 'Schools', value: fmt(stats?.schools_count) },
        ],
        kpiCols: 4,
      };
    }

    case 'deo':
      return {
        ...base,
        title: 'DEO Officers',
        subtitle: 'Create and manage district education officers',
        icon: UserCog,
        pills: [{ icon: UserCog, label: 'District assignments', variant: 'accent' }],
        kpis: [],
        kpiCols: 0,
      };

    case 'settings':
      return {
        ...base,
        title: 'Settings',
        subtitle: 'Account, password, profile photo & notification preferences',
        icon: Settings,
        pills: [{ icon: Bell, label: 'Web push & in-app alerts', variant: 'muted' }],
        kpis: [],
        kpiCols: 0,
      };

    default:
      return {
        ...base,
        title: 'NESA Portal',
        icon: Shield,
        pills: [],
        kpis: [],
      };
  }
}
