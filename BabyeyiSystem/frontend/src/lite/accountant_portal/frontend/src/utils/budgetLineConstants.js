export const BUDGET_LINE_NAMES = [
  "School Feeding", "Transport", "Fuel", "Cleaning Materials", "Printing & Stationery",
  "Medical Expenses", "Security", "Internet & ICT", "Electricity", "Water", "Insurance", "Emergency Fund",
  "Teacher Salaries", "Staff Salaries", "Library", "Laboratory", "Examinations", "Sports",
  "Training & Workshops", "Academic Materials", "Construction", "Furniture", "Maintenance",
  "School Renovation", "ICT Equipment", "Vehicle Maintenance", "Other",
];

export const BUDGET_CATEGORIES = [
  "Operations", "Academic", "Infrastructure", "Utilities", "Transport", "ICT",
  "Emergency", "Administration", "Projects", "Maintenance",
];

export const DEPARTMENTS = [
  "Administration", "Finance", "Academics", "ICT", "Kitchen", "Transport", "Sports",
  "Library", "Security", "Maintenance", "Procurement", "Boarding",
];

export const PRIORITY_LEVELS = ["Low", "Medium", "High", "Critical"];

export const APPROVAL_STATUSES = ["Pending", "Approved", "Rejected", "Draft"];

export const EXPENSE_CATEGORIES = [
  "Food Purchase", "Fuel", "Transport", "Maintenance", "Utilities", "Salaries",
  "ICT Equipment", "Medical", "Emergency", "Other",
];

export const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Mobile Money", "Cheque", "Credit"];

export const COLORS = {
  navy: "#000435",
  amber: "#F59E0B",
  amberLight: "#FDE68A",
  amberDark: "#B45309",
  white: "#FFFFFF",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray600: "#4B5563",
  gray800: "#1F2937",
  green: "#10B981",
  red: "#EF4444",
  blue: "#3B82F6",
};

export function lineUsageStatus(used, planned) {
  if (!planned || planned <= 0) return { key: "active", label: "Active" };
  const pct = (used / planned) * 100;
  if (pct >= 100) return { key: "exhausted", label: "Exhausted" };
  if (pct >= 90) return { key: "critical", label: "Critical" };
  if (pct >= 80) return { key: "warning", label: "Warning" };
  return { key: "active", label: "Active" };
}

export function statusStyle(key) {
  if (key === "exhausted") return { bg: "#FEE2E2", color: "#991B1B" };
  if (key === "critical") return { bg: "#FEE2E2", color: "#B91C1C" };
  if (key === "warning") return { bg: "#FEF3C7", color: "#92400E" };
  return { bg: "#D1FAE5", color: "#065F46" };
}
