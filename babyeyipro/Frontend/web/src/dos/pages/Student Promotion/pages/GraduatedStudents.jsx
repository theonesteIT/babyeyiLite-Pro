import { useEffect, useMemo, useState } from "react";
import { Download, CheckSquare, Square, Loader2 } from "lucide-react";
import { useStudentPromotionData } from "../context/StudentPromotionDataContext";
import PromotionPageHero, { PromotionPageBody } from "../components/PromotionPageHero";
import { prepareCertificateImageAssets } from "../utils/certificateAssetLoader";
import {
  downloadGraduationCertificate,
  downloadGraduationCertificatesBatch,
} from "../utils/promotionCertificatePdf";

export default function GraduatedStudents() {
  const {
    graduated,
    schoolName,
    academicYear,
    promotionSettings,
    certificateBranding,
    loading,
    refresh,
  } = useStudentPromotionData();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [certBusy, setCertBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [certAssets, setCertAssets] = useState(null);

  const branding = useMemo(
    () =>
      certificateBranding || {
        school_name: schoolName,
        head_teacher_name: "",
        stamp_url: null,
        head_signature_url: null,
      },
    [certificateBranding, schoolName]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const assets = await prepareCertificateImageAssets(branding);
      if (!cancelled) setCertAssets(assets);
    })();
    return () => {
      cancelled = true;
    };
  }, [branding]);

  const certTemplate = useMemo(
    () => ({
      subtitle:
        promotionSettings?.certificate_subtitle ||
        "This certifies successful completion of the academic programme and is proudly presented to",
      headTeacherTitle: promotionSettings?.certificate_signatory || "Head Teacher",
    }),
    [promotionSettings]
  );

  const hasSignature = Boolean(branding?.head_signature_url);

  const selectedStudents = useMemo(
    () => graduated.filter((s) => selectedIds.has(s.id)),
    [graduated, selectedIds]
  );

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === graduated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(graduated.map((s) => s.id)));
    }
  };

  const downloadOne = async (student) => {
    setNotice("");
    setCertBusy(true);
    try {
      await downloadGraduationCertificate({
        schoolName: branding.school_name || schoolName,
        academicYear: student.academic_year || academicYear,
        studentName: student.name,
        className: student.class_name || `${student.class || ""} ${student.stream || ""}`.trim(),
        branding,
        imageAssets: certAssets,
        ...certTemplate,
      });
      setNotice(`Certificate downloaded for ${student.name}.`);
    } catch (e) {
      setNotice(e?.message || "Could not generate certificate.");
    } finally {
      setCertBusy(false);
    }
  };

  const downloadSelected = async () => {
    if (!selectedStudents.length) {
      setNotice("Select at least one graduate.");
      return;
    }
    setCertBusy(true);
    setNotice("");
    try {
      await downloadGraduationCertificatesBatch({
        schoolName: branding.school_name || schoolName,
        academicYear,
        students: selectedStudents,
        branding,
        imageAssets: certAssets,
        settings: {
          certificate_subtitle: certTemplate.subtitle,
          certificate_signatory: certTemplate.headTeacherTitle,
        },
      });
      setNotice(
        selectedStudents.length === 1
          ? `Certificate downloaded for ${selectedStudents[0].name}.`
          : `Downloaded ${selectedStudents.length} certificates in one PDF.`
      );
    } catch (e) {
      setNotice(e?.message || "Could not generate certificates.");
    } finally {
      setCertBusy(false);
    }
  };

  const allSelected = graduated.length > 0 && selectedIds.size === graduated.length;

  const heroStats = useMemo(
    () => [
      { label: "Total graduates", value: String(graduated.length) },
      { label: "Female", value: String(graduated.filter((s) => s.gender === "F").length) },
      { label: "Male", value: String(graduated.filter((s) => s.gender === "M").length) },
      { label: "Selected", value: String(selectedIds.size) },
    ],
    [graduated, selectedIds.size]
  );

  return (
    <div className="min-h-full bg-white animate-in fade-in duration-500">
      <PromotionPageHero
        title="Graduated Students"
        subtitle={`${academicYear || "Current year"} — certificates use each learner's exact name and head teacher signature from registry.`}
        heroStats={heroStats}
        onRefresh={refresh}
        refreshing={loading}
      >
        <button
          type="button"
          onClick={downloadSelected}
          disabled={certBusy || !selectedStudents.length}
          className="inline-flex items-center gap-2 rounded-xl bg-[#000435] px-4 py-2.5 text-sm font-bold text-amber-400 shadow-lg transition hover:bg-[#0a0a52] disabled:opacity-60"
        >
          {certBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {selectedStudents.length
            ? `Download ${selectedStudents.length} certificate${selectedStudents.length > 1 ? "s" : ""}`
            : "Select students below"}
        </button>
        <button
          type="button"
          onClick={toggleAll}
          disabled={!graduated.length}
          className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25 disabled:opacity-60"
        >
          {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
          {allSelected ? "Clear selection" : "Select all"}
        </button>
      </PromotionPageHero>

      <PromotionPageBody maxWidth="max-w-6xl" className="space-y-5">
      {notice ? (
        <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
          {notice}
        </p>
      ) : null}
      {!hasSignature ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          Head teacher signature not set in School Registry → profile. Certificates will show the
          signature line only.
        </p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {graduated.length === 0 && !loading && (
          <p className="col-span-full text-center text-sm text-gray-400 py-8">
            No final-year students found. Learners in your top class level appear here.
          </p>
        )}
        {loading && graduated.length === 0 && (
          <p className="col-span-full text-center text-sm text-gray-400 py-8">Loading graduates…</p>
        )}
        {graduated.map((s) => {
          const checked = selectedIds.has(s.id);
          return (
            <div
              key={s.id}
              className={`bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition-shadow ${
                checked ? "border-amber-400 ring-2 ring-amber-100" : "border-gray-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleOne(s.id)}
                  className="mt-1 text-amber-600 flex-shrink-0"
                  aria-label={checked ? "Deselect" : "Select"}
                >
                  {checked ? <CheckSquare size={18} /> : <Square size={18} className="text-gray-300" />}
                </button>
                <span
                  className="w-10 flex-shrink-0 text-xl font-bold leading-none text-[#000435]"
                  aria-hidden
                >
                  {(s.name || "?")[0]?.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-800 truncate">{s.name}</h4>
                  <p className="text-xs text-gray-400">
                    {s.code} · {s.class_name || `${s.class} ${s.stream}`.trim()}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg">
                      {s.academic_year || academicYear || "—"}
                    </span>
                    <span className="text-xs font-bold text-amber-600">
                      {typeof s.avgMarks === "number" ? `${s.avgMarks}%` : "—"}
                    </span>
                  </div>
                </div>
                <span className="text-amber-500 text-xs font-bold shrink-0">GRAD</span>
              </div>
              <div className="flex gap-2 mt-4 pl-9">
                <button
                  type="button"
                  onClick={() => downloadOne(s)}
                  className="flex-1 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 py-2 rounded-xl transition"
                >
                  Certificate PDF
                </button>
              </div>
            </div>
          );
        })}
      </div>
      </PromotionPageBody>
    </div>
  );
}
