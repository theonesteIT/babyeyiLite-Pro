/** From `schools.ownership_type`: NESA scope + wizard locks. Government-Aided can publish for public or private fee streams. */
export function mapSchoolOwnershipToFeeScope(ownershipRaw) {
  const o = String(ownershipRaw || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (o === "private") {
    return { feeScope: "private", schoolKind: "private", category: "Private", lockCategory: true };
  }
  if (o === "government aided" || o === "government-aided" || o.includes("aided")) {
    return { feeScope: "aided", schoolKind: "government_aided", category: null, lockCategory: false };
  }
  if (o === "government" || o.startsWith("government")) {
    return { feeScope: "public", schoolKind: "government", category: "Public", lockCategory: true };
  }
  return { feeScope: "unknown", schoolKind: "unknown", category: null, lockCategory: false };
}

export function categoryOptionsForWizard(schoolKind, feeTargetStudents) {
  if (schoolKind === "private") return ["Private"];
  if (schoolKind === "government") return ["Public"];
  if (schoolKind === "government_aided" && feeTargetStudents === "public") return ["Public", "Boarding", "TVET"];
  if (schoolKind === "government_aided" && feeTargetStudents === "private") return ["Private"];
  return ["Public", "Private", "Boarding", "TVET"];
}
