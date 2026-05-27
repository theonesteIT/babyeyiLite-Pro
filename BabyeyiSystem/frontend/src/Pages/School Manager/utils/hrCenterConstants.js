/** HR Center — roles, departments, wizard steps */

export const WIZARD_STEPS = [
  { id: 1, key: "personal", label: "Personal", short: "Personal" },
  { id: 2, key: "professional", label: "Professional", short: "Job" },
  { id: 3, key: "salary", label: "Salary", short: "Payroll" },
  { id: 4, key: "documents", label: "Documents", short: "Docs", optional: true },
  { id: 5, key: "account", label: "Account", short: "Login" },
  { id: 6, key: "review", label: "Review", short: "Review" },
];

export const DEPARTMENTS = [
  "Administration",
  "Academic",
  "Finance",
  "Human Resources",
  "Discipline",
  "Library",
  "Store / Inventory",
  "ICT",
  "Security",
  "Health",
  "Kitchen / Catering",
  "Maintenance",
  "Transport",
];

export const CONTRACT_TYPES = ["Permanent", "Temporary", "Internship", "Volunteer"];

export const WORKING_STATUSES = ["Active", "Pending", "Suspended", "On Leave"];

export const GENDERS = ["Male", "Female", "Other"];

export const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed"];

export const PAYMENT_FREQUENCIES = ["Monthly", "Weekly", "Daily"];

export const PAYMENT_METHODS = ["Bank Transfer", "Mobile Money", "Cash", "Cheque"];

export const MOMO_PROVIDERS = ["MTN MoMo", "Airtel Money"];

export const CURRENCIES = ["RWF", "USD"];

export const HR_ROLE_OPTIONS = [
  { label: "Teacher", code: "TEACHER" },
  { label: "DOS (Head of Study)", code: "DOS" },
  { label: "DOD (Head of Discipline)", code: "DISCIPLINE" },
  { label: "Accountant", code: "ACCOUNTANT" },
  { label: "Librarian", code: "LIBRARIAN" },
  { label: "Storekeeper", code: "STORE_MANAGER" },
  { label: "Security Guard", code: "GATE_OFFICER" },
  { label: "Secretary", code: "SECRETARY" },
  { label: "HR Manager", code: "HR" },
  { label: "School Manager", code: "SCHOOL_MANAGER" },
  { label: "Gate Officer", code: "GATE_OFFICER" },
  { label: "OTHER", code: "CUSTOM", isOther: true },
];

export const PRESET_CUSTOM_ROLES = [
  "Nurse",
  "ICT Manager",
  "Driver",
  "Cleaner",
  "Cook",
  "Lab Technician",
  "Matron",
  "Patron",
  "Deputy Headmaster",
  "Headmaster",
];

export const DOCUMENT_SLOTS = [
  { key: "national_id", label: "National ID Copy", required: false },
  { key: "cv", label: "CV / Resume", required: false },
  { key: "certificates", label: "Certificates", required: false },
  { key: "contract", label: "Contract File", required: false },
  { key: "recommendation", label: "Recommendation Letter", required: false },
  { key: "passport_photo", label: "Passport Photo", required: false },
  { key: "police_clearance", label: "Police Clearance", required: false },
];

export function createEmptyStaffForm() {
  return {
    personal: {
      first_name: "",
      last_name: "",
      gender: "",
      date_of_birth: "",
      national_id: "",
      phone: "",
      email: "",
      address: "",
      marital_status: "",
      nationality: "Rwandan",
      profile_photo: null,
      profile_preview: null,
    },
    professional: {
      employee_id: "",
      joining_date: new Date().toISOString().slice(0, 10),
      contract_type: "Permanent",
      department: "",
      qualification: "",
      experience_years: "",
      working_status: "Active",
      role_code: "TEACHER",
      role_label: "Teacher",
      custom_role_name: "",
      custom_roles: [...PRESET_CUSTOM_ROLES],
    },
    salary: {
      basic_salary: "",
      currency: "RWF",
      payment_frequency: "Monthly",
      apply_tax: false,
      tax_percent: "",
      rssb: "",
      paye: "",
      housing_deduction: "",
      transport_deduction: "",
      allowances: [],
      deductions: [],
      payment_method: "Bank Transfer",
      bank_name: "",
      account_number: "",
      account_holder: "",
      momo_provider: "MTN MoMo",
      momo_phone: "",
      allow_advance: false,
    },
    documents: {
      national_id: [],
      cv: [],
      certificates: [],
      contract: [],
      recommendation: [],
      passport_photo: [],
      police_clearance: [],
    },
    account: {
      username: "",
      email: "",
      rfid_uid: "",
      password: "",
      confirm_password: "",
      account_status: "Active",
      no_email: false,
      send_credentials_email: true,
      auto_generate_password: true,
      set_password_manually: false,
    },
  };
}

export const DRAFT_STORAGE_KEY = (schoolId) => `babyeyi_hr_staff_draft_${schoolId || "default"}`;
