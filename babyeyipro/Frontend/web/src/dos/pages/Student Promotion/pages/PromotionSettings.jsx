import { useState } from "react";
import { Save, Settings, Shield, BookOpen, Users, DollarSign, AlertTriangle, Check } from "lucide-react";

const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-12 h-6 rounded-full transition-colors relative ${checked ? "bg-amber-500" : "bg-gray-200"}`}
  >
    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? "left-7" : "left-1"}`} />
  </button>
);

export default function PromotionSettings() {
  const [minMarks, setMinMarks] = useState(50);
  const [minAttendance, setMinAttendance] = useState(75);
  const [autoSuggest, setAutoSuggest] = useState(true);
  const [feesRequired, setFeesRequired] = useState(false);
  const [disciplineBlock, setDisciplineBlock] = useState(true);
  const [parentNotify, setParentNotify] = useState(true);
  const [lockAfterConfirm, setLockAfterConfirm] = useState(true);
  const [autoStream, setAutoStream] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Section = ({ icon: Icon, title, children }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-50">
        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
          <Icon size={18} className="text-amber-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );

  const Row = ({ label, sub, children }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <Section icon={BookOpen} title="Academic Rules">
        <Row label="Minimum Average Marks" sub="Students below this threshold are auto-flagged">
          <div className="flex items-center gap-3">
            <input
              type="range" min={30} max={80} value={minMarks}
              onChange={e => setMinMarks(e.target.value)}
              className="w-28 accent-amber-500"
            />
            <span className="w-10 text-sm font-bold text-amber-600 text-right">{minMarks}%</span>
          </div>
        </Row>
        <Row label="Auto-Suggest Repeaters" sub="System automatically flags at-risk students">
          <Toggle checked={autoSuggest} onChange={setAutoSuggest} />
        </Row>
        <Row label="Auto Stream Allocation" sub="Assign streams based on marks after S3">
          <Toggle checked={autoStream} onChange={setAutoStream} />
        </Row>
      </Section>

      <Section icon={Users} title="Attendance Rules">
        <Row label="Minimum Attendance %" sub="Required to be eligible for promotion">
          <div className="flex items-center gap-3">
            <input
              type="range" min={50} max={95} value={minAttendance}
              onChange={e => setMinAttendance(e.target.value)}
              className="w-28 accent-amber-500"
            />
            <span className="w-10 text-sm font-bold text-amber-600 text-right">{minAttendance}%</span>
          </div>
        </Row>
      </Section>

      <Section icon={Shield} title="Discipline Rules">
        <Row label="Block Promotion for Serious Cases" sub="Students with critical discipline records">
          <Toggle checked={disciplineBlock} onChange={setDisciplineBlock} />
        </Row>
      </Section>

      <Section icon={DollarSign} title="Financial Rules">
        <Row label="Require Fees Clearance" sub="Block promotion for students with pending fees">
          <Toggle checked={feesRequired} onChange={setFeesRequired} />
        </Row>
      </Section>

      <Section icon={AlertTriangle} title="Safety & Notifications">
        <Row label="Notify Parents via SMS/Email" sub="Send automatic notifications after promotion">
          <Toggle checked={parentNotify} onChange={setParentNotify} />
        </Row>
        <Row label="Lock Promotion After Confirmation" sub="Prevent accidental edits after final approval">
          <Toggle checked={lockAfterConfirm} onChange={setLockAfterConfirm} />
        </Row>
      </Section>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${saved ? "bg-green-500 text-white" : "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200"}`}
        >
          {saved ? (
            <><Check size={16} /> Settings Saved</>
          ) : (
            <><Save size={16} /> Save Settings</>
          )}
        </button>
      </div>
    </div>
  );
}
