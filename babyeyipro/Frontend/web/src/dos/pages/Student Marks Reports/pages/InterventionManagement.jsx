import PageShell, { Panel } from '../components/PageShell';
import { interventions } from '../data/mockData';

export default function InterventionManagement() {
  return (
    <PageShell
      title="Intervention Management"
      subtitle="Assign remedial support, track improvement after intervention, and monitor progress."
    >
      <Panel title="Active interventions">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="text-left py-3 px-2">Student</th>
                <th className="text-left py-3 px-2">Class</th>
                <th className="text-left py-3 px-2">Action</th>
                <th className="text-left py-3 px-2">Status</th>
                <th className="text-left py-3 px-2">Progress</th>
                <th className="text-left py-3 px-2">Owner</th>
              </tr>
            </thead>
            <tbody>
              {interventions.map((i) => (
                <tr key={i.student} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-2 font-black text-[#000435]">{i.student}</td>
                  <td className="py-3 px-2">{i.class}</td>
                  <td className="py-3 px-2">{i.action}</td>
                  <td className="py-3 px-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${i.status === 'Improving' ? 'bg-green-100 text-green-800' : i.status === 'In progress' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                      {i.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 font-bold text-green-600">{i.change}</td>
                  <td className="py-3 px-2 text-slate-500">{i.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button type="button" className="p-4 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-bold text-[#000435] hover:border-amber-400 hover:bg-amber-50/50 transition-all">
          + Assign remedial class
        </button>
        <button type="button" className="p-4 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-bold text-[#000435] hover:border-amber-400 hover:bg-amber-50/50 transition-all">
          + Schedule parent meeting
        </button>
        <button type="button" className="p-4 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-bold text-[#000435] hover:border-amber-400 hover:bg-amber-50/50 transition-all">
          + Create support plan
        </button>
      </div>
    </PageShell>
  );
}
