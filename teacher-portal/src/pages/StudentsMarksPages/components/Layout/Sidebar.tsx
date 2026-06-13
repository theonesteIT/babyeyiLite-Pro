import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users, ClipboardCheck,
  Award, CalendarCheck, MessageSquare, FileText,
  Lightbulb, ChevronDown, ChevronRight, GraduationCap, Brain,
  ChevronLeft, Menu, NotebookPen, UserCheck,
  BookMarked, ScrollText, MessagesSquare, Bell, FileBarChart,
  TrendingUp, ListChecks, PieChart, Siren, Radio,
  UserCog, Contact, Network, Blocks, Target, BarChart3
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Brain, label: 'AI Insights', path: '/insights' },
  {
    icon: BookOpen, label: 'Academics', children: [
      { icon: ClipboardCheck, label: 'Register Marks', path: '/register-marks' },
      { icon: NotebookPen, label: 'Assessments', path: '/assessments' },
      { icon: BookMarked, label: 'Grade Book', path: '/grade-book' },
      { icon: Blocks, label: 'Question Bank', path: '/question-bank' },
    ],
  },
  {
    icon: Users, label: 'Students', children: [
      { icon: UserCog, label: 'Student Profiles', path: '/students' },
      { icon: Siren, label: 'At Risk Students', path: '/at-risk' },
      { icon: TrendingUp, label: 'Performance Analytics', path: '/student-performance' },
      { icon: Award, label: 'CBC Competencies', path: '/competencies' },
      { icon: ListChecks, label: 'Rankings', path: '/rankings' },
    ],
  },
  {
    icon: Brain, label: 'Intelligence', children: [
      { icon: Radio, label: 'AI Assistant', path: '/ai-assistant' },
      { icon: Target, label: 'Predictions', path: '/predictions' },
      { icon: Network, label: 'Learning Gaps', path: '/learning-gaps' },
    ],
  },
  {
    icon: CalendarCheck, label: 'Attendance', children: [
      { icon: UserCheck, label: 'Take Attendance', path: '/attendance' },
      { icon: BarChart3, label: 'Attendance Analytics', path: '/attendance-analytics' },
    ],
  },
  {
    icon: MessageSquare, label: 'Communication', children: [
      { icon: MessagesSquare, label: 'Parent Messages', path: '/parent-communication' },
      { icon: Bell, label: 'Notifications', path: '/notifications' },
      { icon: Contact, label: 'Meetings', path: '/meetings' },
    ],
  },
  {
    icon: FileText, label: 'Reports', children: [
      { icon: FileBarChart, label: 'Academic Reports', path: '/reports' },
      { icon: ScrollText, label: 'CBC Reports', path: '/cbc-reports' },
      { icon: PieChart, label: 'Performance Reports', path: '/performance-reports' },
    ],
  },
  {
    icon: Lightbulb, label: 'Insights', children: [
      { icon: TrendingUp, label: 'Academic Insights', path: '/teacher-insights' },
      { icon: Target, label: 'Intervention Plans', path: '/interventions' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const [expanded, setExpanded] = useState<string[]>(['Academics', 'Students']);

  const toggleExpand = (label: string) => {
    setExpanded(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
  };

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-navy text-white flex flex-col transition-all duration-300 z-50 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <GraduationCap className="text-amber" size={28} />
            <span className="font-bold text-lg">TOS</span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto sidebar-scroll p-2 space-y-0.5">
        {navItems.map(item => {
          if (!item.children) {
            return (
              <NavLink
                key={item.label}
                to={item.path!}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${isActive ? 'bg-amber text-navy font-semibold' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
                }
              >
                <item.icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          }

          const isExpanded = expanded.includes(item.label);
          return (
            <div key={item.label}>
              <button
                onClick={() => toggleExpand(item.label)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm text-white/70 hover:bg-white/10 hover:text-white`}
              >
                <item.icon size={18} />
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                {!collapsed && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
              </button>
              {isExpanded && !collapsed && (
                <div className="ml-4 space-y-0.5 mt-0.5">
                  {item.children.map(child => (
                    <NavLink
                      key={child.label}
                      to={child.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-xs ${isActive ? 'bg-amber/20 text-amber font-medium' : 'text-white/60 hover:bg-white/10 hover:text-white'}`
                      }
                    >
                      <child.icon size={14} />
                      <span>{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber flex items-center justify-center text-navy font-bold text-sm">T</div>
          {!collapsed && (
            <div>
              <p className="text-sm font-medium">Teacher</p>
              <p className="text-xs text-white/50">Admin</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
