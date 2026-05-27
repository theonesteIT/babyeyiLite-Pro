export const mockStudents = [
  { id: 1, code: "STU001", name: "Amina Uwimana", gender: "F", avgMarks: 87, attendance: 95, discipline: "Good", fees: "Cleared", status: "Eligible", stream: "MPC", class: "S4" },
  { id: 2, code: "STU002", name: "Jean Paul Nkurunziza", gender: "M", avgMarks: 43, attendance: 61, discipline: "Warning", fees: "Pending", status: "Repeat Recommended", stream: "MCB", class: "S4" },
  { id: 3, code: "STU003", name: "Clarisse Muhoza", gender: "F", avgMarks: 78, attendance: 89, discipline: "Good", fees: "Cleared", status: "Eligible", stream: "MPC", class: "S4" },
  { id: 4, code: "STU004", name: "Eric Habimana", gender: "M", avgMarks: 55, attendance: 72, discipline: "Good", fees: "Cleared", status: "Risky", stream: "HEG", class: "S4" },
  { id: 5, code: "STU005", name: "Diane Ingabire", gender: "F", avgMarks: 92, attendance: 98, discipline: "Excellent", fees: "Cleared", status: "Eligible", stream: "MPC", class: "S4" },
  { id: 6, code: "STU006", name: "Patrick Bizimana", gender: "M", avgMarks: 38, attendance: 55, discipline: "Poor", fees: "Pending", status: "Repeat Recommended", stream: "MCB", class: "S4" },
  { id: 7, code: "STU007", name: "Solange Murekatete", gender: "F", avgMarks: 71, attendance: 84, discipline: "Good", fees: "Cleared", status: "Eligible", stream: "HEG", class: "S4" },
  { id: 8, code: "STU008", name: "Alexis Ndayisaba", gender: "M", avgMarks: 66, attendance: 79, discipline: "Good", fees: "Cleared", status: "Eligible", stream: "MEG", class: "S4" },
  { id: 9, code: "STU009", name: "Grace Nyiraneza", gender: "F", avgMarks: 48, attendance: 68, discipline: "Good", fees: "Cleared", status: "Risky", stream: "MPC", class: "S4" },
  { id: 10, code: "STU010", name: "Claude Nshimiyimana", gender: "M", avgMarks: 83, attendance: 91, discipline: "Good", fees: "Cleared", status: "Eligible", stream: "MCB", class: "S4" },
  { id: 11, code: "STU011", name: "Vestine Kayitesi", gender: "F", avgMarks: 95, attendance: 99, discipline: "Excellent", fees: "Cleared", status: "Eligible", stream: "MPC", class: "S4" },
  { id: 12, code: "STU012", name: "David Hakizimana", gender: "M", avgMarks: 41, attendance: 58, discipline: "Warning", fees: "Pending", status: "Repeat Recommended", stream: "HEG", class: "S4" },
];

export const graduatedStudents = [
  { id: 101, code: "STU101", name: "Alice Mutesi", gender: "F", avgMarks: 88, class: "S6", stream: "MPC", year: "2023-2024", status: "Graduated" },
  { id: 102, code: "STU102", name: "Bob Ntwari", gender: "M", avgMarks: 76, class: "S6", stream: "MCB", year: "2023-2024", status: "Graduated" },
  { id: 103, code: "STU103", name: "Celine Uwitonze", gender: "F", avgMarks: 91, class: "S6", stream: "HEG", year: "2023-2024", status: "Graduated" },
  { id: 104, code: "STU104", name: "Denis Niyomugabo", gender: "M", avgMarks: 82, class: "S6", stream: "MPC", year: "2023-2024", status: "Graduated" },
  { id: 105, code: "STU105", name: "Elise Uwase", gender: "F", avgMarks: 79, class: "S6", stream: "MCB", year: "2023-2024", status: "Graduated" },
];

export const promotionHistory = [
  { id: 1, student: "Amina Uwimana", fromClass: "S3", toClass: "S4", stream: "MPC", year: "2023-2024", status: "Promoted", doneBy: "DOS Uwimana", date: "2024-07-15" },
  { id: 2, student: "Jean Paul N.", fromClass: "S3", toClass: "S3", stream: "MCB", year: "2023-2024", status: "Repeated", doneBy: "DOS Uwimana", date: "2024-07-15" },
  { id: 3, student: "Clarisse Muhoza", fromClass: "S3", toClass: "S4", stream: "MPC", year: "2023-2024", status: "Promoted", doneBy: "DOS Uwimana", date: "2024-07-15" },
  { id: 4, student: "Eric Habimana", fromClass: "S2", toClass: "S3", stream: "HEG", year: "2022-2023", status: "Promoted", doneBy: "DOS Kamanzi", date: "2023-07-20" },
  { id: 5, student: "Diane Ingabire", fromClass: "S2", toClass: "S3", stream: "MPC", year: "2022-2023", status: "Promoted", doneBy: "DOS Kamanzi", date: "2023-07-20" },
  { id: 6, student: "Patrick Bizimana", fromClass: "S3", toClass: "S3", stream: "MCB", year: "2023-2024", status: "Repeated", doneBy: "DOS Uwimana", date: "2024-07-15" },
];

export const streams = ["MPC", "MCB", "HEG", "MEG", "PCB", "PCM"];
export const classes = ["S1", "S2", "S3", "S4", "S5", "S6"];
export const academicYears = ["2024-2025", "2023-2024", "2022-2023"];
export const terms = ["Term 1", "Term 2", "Term 3"];
