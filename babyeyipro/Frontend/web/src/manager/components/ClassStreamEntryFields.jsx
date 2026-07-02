import { useId } from "react";
import { normalizeEducationLevel } from "../../utils/educationLevelClasses";

const defaultInputCls =
  "w-full min-h-[44px] sm:min-h-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none";

/**
 * Class + stream entry aligned with Babyeyi wizard levels.
 * - TSS: manual class & stream (many combinations)
 * - Nursery / Primary: class from catalog, stream typed manually
 * - Secondary: class from catalog, stream typed or picked from suggestions (datalist)
 */
export default function ClassStreamEntryFields({
  educationLevel,
  classGrade,
  onClassGradeChange,
  stream,
  onStreamChange,
  filteredGroups = [],
  streamSuggestions = [],
  classLabel = "Class / grade",
  streamLabel = "Stream",
  classRequired = true,
  inputCls = defaultInputCls,
  selectCls = defaultInputCls,
}) {
  const datalistId = useId();
  const level = normalizeEducationLevel(educationLevel);
  const isTss = level === "TSS";
  const isSecondary = level === "Secondary";
  const showStreamDatalist = isSecondary && streamSuggestions.length > 0;

  return (
    <>
      <div>
        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          {classLabel}
          {classRequired ? <span className="text-red-500"> *</span> : null}
        </label>
        {isTss ? (
          <input
            type="text"
            value={classGrade}
            onChange={(e) => onClassGradeChange(e.target.value)}
            placeholder="e.g. L3 SOD"
            className={inputCls}
          />
        ) : (
          <select
            value={classGrade}
            onChange={(e) => onClassGradeChange(e.target.value)}
            className={selectCls}
          >
            <option value="">{filteredGroups.length ? "Select…" : "No classes on this level"}</option>
            {filteredGroups.map((c) => (
              <option key={c.id ?? c.group_name} value={c.group_name}>
                {c.group_name}
              </option>
            ))}
          </select>
        )}
        {isTss ? (
          <p className="mt-1.5 text-[10px] text-slate-500 leading-snug">
            TSS has many trades — type the full class label your school uses.
          </p>
        ) : null}
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          {streamLabel}{" "}
          <span className="text-slate-400 font-semibold normal-case">(optional)</span>
        </label>
        <input
          type="text"
          value={stream}
          onChange={(e) => onStreamChange(e.target.value)}
          list={showStreamDatalist ? datalistId : undefined}
          placeholder={
            isTss
              ? "e.g. A"
              : isSecondary
                ? "Type or pick — e.g. A, Science, Arts"
                : "e.g. A, B, Science"
          }
          disabled={!isTss && !String(classGrade || "").trim()}
          className={`${inputCls} disabled:opacity-50`}
        />
        {showStreamDatalist ? (
          <datalist id={datalistId}>
            {streamSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        ) : null}
        {!isTss ? (
          <p className="mt-1.5 text-[10px] text-slate-500 leading-snug">
            {isSecondary
              ? "Enter any stream or choose a suggestion from the list."
              : "Enter any stream label for this class."}
          </p>
        ) : null}
      </div>
    </>
  );
}
