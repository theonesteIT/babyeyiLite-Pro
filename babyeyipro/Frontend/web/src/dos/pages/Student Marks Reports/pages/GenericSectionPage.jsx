import { useLocation } from 'react-router-dom';
import PageShell, { Panel } from '../components/PageShell';
import { PAGE_TITLES } from '../navConfig';
import { marksReportsPageKey } from '../utils/paths';

const MOCK_ROWS = {
  classes: [
    { name: 'S3A', students: 33, teacher: 'M. Uwimana', level: 'S3' },
    { name: 'S3B', students: 32, teacher: 'J. Habimana', level: 'S3' },
    { name: 'S3C', students: 30, teacher: 'A. Mukamana', level: 'S3' },
  ],
  subjects: [
    { name: 'Mathematics', teachers: 4, classes: 12 },
    { name: 'Physics', teachers: 3, classes: 8 },
    { name: 'English', teachers: 5, classes: 15 },
  ],
  default: [
    { item: 'Sample record A', status: 'Active', updated: '2026-03-01' },
    { item: 'Sample record B', status: 'Pending', updated: '2026-02-28' },
    { item: 'Sample record C', status: 'Complete', updated: '2026-02-25' },
  ],
};

const SUBTITLES = {
  classes: 'Manage school classes and class-teacher assignments.',
  subjects: 'Subjects offered across all levels.',
  'marks-overview': 'Overview of marks submission and completion status.',
  'marks-approval': 'Review and approve teacher-submitted marks.',
  'missing-marks': 'Track assessments with incomplete mark entry.',
  'assessment-schedule': 'Upcoming and scheduled assessments.',
  'teacher-workload': 'Teaching load and class assignments per teacher.',
  'student-directory': 'Searchable student directory with academic links.',
};

export default function GenericSectionPage() {
  const key = marksReportsPageKey(useLocation().pathname);
  const title = PAGE_TITLES[key] || 'Section';
  const rows = MOCK_ROWS[key] || MOCK_ROWS.default;
  const subtitle = SUBTITLES[key] || 'Module connected to school marks system — mock data for preview.';

  const columns = key === 'classes'
    ? ['name', 'students', 'teacher', 'level']
    : key === 'subjects'
      ? ['name', 'teachers', 'classes']
      : ['item', 'status', 'updated'];

  return (
    <PageShell title={title} subtitle={subtitle}>
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                {columns.map((col) => (
                  <th key={col} className="text-left py-3 px-2 capitalize">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  {columns.map((col) => (
                    <td key={col} className="py-3 px-2 font-medium text-[#000435]">{row[col]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate-400 mt-4">Preview mode — connect backend API for live data.</p>
      </Panel>
    </PageShell>
  );
}
