import { useEffect, useMemo, useState } from "react";
import { Save, BookOpen, Users, DollarSign, AlertTriangle, Check, Award, Loader2 } from "lucide-react";
import { useStudentPromotionData } from "../context/StudentPromotionDataContext";
import PromotionPageHero, { PromotionPageBody } from "../components/PromotionPageHero";

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`w-12 h-6 rounded-full transition-colors relative ${checked ? "bg-amber-500" : "bg-gray-200"}`}
  >
    <span
      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? "left-7" : "left-1"}`}
    />
  </button>
);

export default function PromotionSettings() {
  const { promotionSettings, updatePromotionSettings, loading, refresh } =
    useStudentPromotionData();
  const [minMarks, setMinMarks] = useState(50);
  const [minAttendance, setMinAttendance] = useState(75);
  const [autoSuggest, setAutoSuggest] = useState(true);
  const [feesRequired, setFeesRequired] = useState(false);
  const [disciplineBlock, setDisciplineBlock] = useState(true);
  const [parentNotify, setParentNotify] = useState(true);
  const [lockAfterConfirm, setLockAfterConfirm] = useState(true);
  const [autoStream, setAutoStream] = useState(false);
  const [certHeadline, setCertHeadline] = useState("Certificate of Graduation");
  const [certSubtitle, setCertSubtitle] = useState("");
  const [certSignatory, setCertSignatory] = useState("Head Teacher");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!promotionSettings) return;
    setMinMarks(Number(promotionSettings.min_avg_marks) || 50);
    setMinAttendance(Number(promotionSettings.min_attendance) || 75);
    setAutoSuggest(!!promotionSettings.auto_suggest_repeaters);
    setFeesRequired(!!promotionSettings.fees_required);
    setDisciplineBlock(!!promotionSettings.discipline_block);
    setParentNotify(!!promotionSettings.parent_notify);
    setLockAfterConfirm(!!promotionSettings.lock_after_confirm);
    setAutoStream(!!promotionSettings.auto_stream);
    setCertHeadline(promotionSettings.certificate_headline || "Certificate of Graduation");
    setCertSubtitle(promotionSettings.certificate_subtitle || "");
    setCertSignatory(promotionSettings.certificate_signatory || "Head Teacher");
  }, [promotionSettings]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updatePromotionSettings({
        min_avg_marks: Number(minMarks),
        min_attendance: Number(minAttendance),
        auto_suggest_repeaters: autoSuggest,
        fees_required: feesRequired,
        discipline_block: disciplineBlock,
        parent_notify: parentNotify,
        lock_after_confirm: lockAfterConfirm,
        auto_stream: autoStream,
        certificate_headline: certHeadline.trim(),
        certificate_subtitle: certSubtitle.trim(),
        certificate_signatory: certSignatory.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
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
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );

  const heroStats = useMemo(
    () => [
      { label: "Min marks", value: `${minMarks}%` },
      { label: "Min attendance", value: `${minAttendance}%` },
      { label: "Auto-flag", value: autoSuggest ? "On" : "Off" },
      { label: "Fees gate", value: feesRequired ? "On" : "Off" },
    ],
    [minMarks, minAttendance, autoSuggest, feesRequired]
  );

  if (loading && !promotionSettings) {
    return (
      <div className="min-h-full bg-white flex items-center justify-center p-12 text-gray-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white animate-in fade-in duration-500">
      <PromotionPageHero
        title="Promotion Settings"
        subtitle="Academic thresholds, discipline rules, and graduation certificate wording."
        heroStats={heroStats}
        onRefresh={refresh}
        refreshing={loading}
      />
      <PromotionPageBody maxWidth="max-w-3xl" className="space-y-5">
      <Section icon={BookOpen} title="Academic Rules">
        <Row label="Minimum Average Marks" sub="Students below this threshold are auto-flagged">
          <div className="flex items-center gap-3 flex-shrink-0">
            <input
              type="range"
              min={30}
              max={80}
              value={minMarks}
              onChange={(e) => setMinMarks(e.target.value)}
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
          <div className="flex items-center gap-3 flex-shrink-0">
            <input
              type="range"
              min={50}
              max={95}
              value={minAttendance}
              onChange={(e) => setMinAttendance(e.target.value)}
              className="w-28 accent-amber-500"
            />
            <span className="w-10 text-sm font-bold text-amber-600 text-right">{minAttendance}%</span>
          </div>
        </Row>
      </Section>

      <Section icon={AlertTriangle} title="Discipline Rules">
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

      <Section icon={Award} title="Graduation Certificate Template">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Headline</label>
            <input
              type="text"
              value={certHeadline}
              onChange={(e) => setCertHeadline(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subtitle</label>
            <textarea
              rows={3}
              value={certSubtitle}
              onChange={(e) => setCertSubtitle(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Head teacher title (signature block)
            </label>
            <input
              type="text"
              value={certSignatory}
              onChange={(e) => setCertSignatory(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>
          <p className="text-xs text-gray-400">
            Student names come from the registry. Head teacher signature is loaded from School
            Registry profile.
          </p>
        </div>
      </Section>

      {error ? <p className="text-sm text-red-600 text-right">{error}</p> : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60 ${
            saved ? "bg-green-500 text-white" : "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200"
          }`}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Saving…
            </>
          ) : saved ? (
            <>
              <Check size={16} /> Settings Saved
            </>
          ) : (
            <>
              <Save size={16} /> Save Settings
            </>
          )}
        </button>
      </div>
      </PromotionPageBody>
    </div>
  );
}
