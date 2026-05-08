// ─── Shared Theme ────────────────────────────────────────────────────────────
export const theme = {
    navy:      "#000435",
    navyLight: "#000c6e",
    amber:     "#F59E0B",
    amberDark: "#D97706",
    white:     "#FFFFFF",
    green:     "#10B981",
    red:       "#EF4444",
    blue:      "#3B82F6",
    orange:    "#F97316",
  };
  
  // ─── Shared Styles ────────────────────────────────────────────────────────────
  export const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Montserrat', sans-serif; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
    @keyframes spin       { to { transform: rotate(360deg); } }
    @keyframes scanLine   { 0%,100% { top: 8%; opacity:.7; } 50% { top: 86%; opacity:1; } }
    @keyframes fadeScale  { from { opacity:0; transform:scale(.94); } to { opacity:1; transform:scale(1); } }
    @keyframes slideUp    { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideRight { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
    @keyframes pulseDot   { 0%,100% { opacity:1; box-shadow:0 0 6px currentColor; } 50% { opacity:.4; box-shadow:none; } }
    @keyframes blink      { 0%,100% { opacity:1; } 50% { opacity:.3; } }
  `;
  
  // ─── Mock Student Database ────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  
  export const mockDatabase = {
    S001: { name: "Ishimwe Theo",     class: "S5 MPC", initials: "IT", gender: "M",
      permission: { id: "PERM-000123", type: "Medical",      subType: "Doctor appointment",   status: "Approved", timeOut: "10:30", returnTime: "14:00", approvedBy: "Discipline Master", date: today } },
    S002: { name: "Uwase Claire",     class: "S4 PCB", initials: "UC", gender: "F",
      permission: { id: "PERM-000124", type: "Leave School",  subType: "Family emergency",    status: "Out",      timeOut: "09:00", returnTime: "16:00", approvedBy: "Teacher",           date: today, actualOut: "09:03" } },
    S003: { name: "Nkurunziza Jean",  class: "S6 MEG", initials: "NJ", gender: "M",
      permission: null },
    S004: { name: "Mukamana Grace",   class: "S5 HEG", initials: "MG", gender: "F",
      permission: { id: "PERM-000126", type: "Leave Class",   subType: "Pharmacy run",        status: "Returned", timeOut: "08:30", returnTime: "09:00", approvedBy: "Teacher",           date: today, actualOut: "08:32", actualReturn: "08:58" } },
    S005: { name: "Habimana Eric",    class: "S4 MPC", initials: "HE", gender: "M",
      permission: { id: "PERM-000127", type: "Medical",       subType: "Sick – fever",        status: "Overdue",  timeOut: "07:45", returnTime: "10:00", approvedBy: "Discipline Master", date: today, actualOut: "07:47" } },
    S007: { name: "Kayitesi Ange",    class: "S5 PCB", initials: "KA", gender: "F",
      permission: { id: "PERM-000129", type: "Leave School",  subType: "Sports competition",  status: "Approved", timeOut: "13:00", returnTime: "17:00", approvedBy: "Head Teacher",      date: today } },
    S008: { name: "Bizimana Patrick", class: "S6 PCB", initials: "BP", gender: "M",
      permission: { id: "PERM-000130", type: "Discipline",    subType: "Counseling session",  status: "Denied",   timeOut: "11:00", returnTime: "12:00", approvedBy: "Head Teacher",      date: today } },
  };
  
  // ─── Mock Historical Logs ─────────────────────────────────────────────────────
  export const allMockLogs = [
    // Today
    { id: "LOG-001", date: today, time: "07:47", student: "Habimana Eric",    class: "S4 MPC", action: "EXIT",   status: "Allowed",            permId: "PERM-000127" },
    { id: "LOG-002", date: today, time: "08:32", student: "Mukamana Grace",   class: "S5 HEG", action: "EXIT",   status: "Allowed",            permId: "PERM-000126" },
    { id: "LOG-003", date: today, time: "08:55", student: "Nkurunziza Jean",  class: "S6 MEG", action: "SCAN",   status: "Denied – No Permission", permId: "—" },
    { id: "LOG-004", date: today, time: "08:58", student: "Mukamana Grace",   class: "S5 HEG", action: "RETURN", status: "Returned",           permId: "PERM-000126" },
    { id: "LOG-005", date: today, time: "09:03", student: "Uwase Claire",     class: "S4 PCB", action: "EXIT",   status: "Allowed",            permId: "PERM-000124" },
    { id: "LOG-006", date: today, time: "09:20", student: "Bizimana Patrick", class: "S6 PCB", action: "SCAN",   status: "Denied – Permission Denied", permId: "PERM-000130" },
    // Yesterday
    { id: "LOG-007", date: getPastDate(1), time: "08:10", student: "Ishimwe Theo",     class: "S5 MPC", action: "EXIT",   status: "Allowed",  permId: "PERM-000100" },
    { id: "LOG-008", date: getPastDate(1), time: "08:45", student: "Kayitesi Ange",    class: "S5 PCB", action: "EXIT",   status: "Allowed",  permId: "PERM-000101" },
    { id: "LOG-009", date: getPastDate(1), time: "09:15", student: "Uwase Claire",     class: "S4 PCB", action: "SCAN",   status: "Denied – No Permission", permId: "—" },
    { id: "LOG-010", date: getPastDate(1), time: "10:00", student: "Ishimwe Theo",     class: "S5 MPC", action: "RETURN", status: "Returned",  permId: "PERM-000100" },
    { id: "LOG-011", date: getPastDate(1), time: "14:30", student: "Kayitesi Ange",    class: "S5 PCB", action: "RETURN", status: "Returned",  permId: "PERM-000101" },
    // 2 days ago
    { id: "LOG-012", date: getPastDate(2), time: "07:55", student: "Habimana Eric",    class: "S4 MPC", action: "EXIT",   status: "Allowed",  permId: "PERM-000095" },
    { id: "LOG-013", date: getPastDate(2), time: "09:30", student: "Mukamana Grace",   class: "S5 HEG", action: "EXIT",   status: "Allowed",  permId: "PERM-000096" },
    { id: "LOG-014", date: getPastDate(2), time: "11:00", student: "Habimana Eric",    class: "S4 MPC", action: "RETURN", status: "Overdue",   permId: "PERM-000095" },
    { id: "LOG-015", date: getPastDate(2), time: "11:45", student: "Nkurunziza Jean",  class: "S6 MEG", action: "SCAN",   status: "Denied – No Permission", permId: "—" },
    { id: "LOG-016", date: getPastDate(2), time: "13:20", student: "Mukamana Grace",   class: "S5 HEG", action: "RETURN", status: "Returned",  permId: "PERM-000096" },
    // 3 days ago
    { id: "LOG-017", date: getPastDate(3), time: "08:00", student: "Bizimana Patrick", class: "S6 PCB", action: "EXIT",   status: "Allowed",  permId: "PERM-000088" },
    { id: "LOG-018", date: getPastDate(3), time: "08:20", student: "Kayitesi Ange",    class: "S5 PCB", action: "EXIT",   status: "Allowed",  permId: "PERM-000089" },
    { id: "LOG-019", date: getPastDate(3), time: "10:05", student: "Bizimana Patrick", class: "S6 PCB", action: "RETURN", status: "Returned",  permId: "PERM-000088" },
    { id: "LOG-020", date: getPastDate(3), time: "12:00", student: "Ishimwe Theo",     class: "S5 MPC", action: "SCAN",   status: "Denied – No Permission", permId: "—" },
    { id: "LOG-021", date: getPastDate(3), time: "15:30", student: "Kayitesi Ange",    class: "S5 PCB", action: "RETURN", status: "Returned",  permId: "PERM-000089" },
  ];
  
  function getPastDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split("T")[0];
  }
  
  // ─── Helpers ──────────────────────────────────────────────────────────────────
  export function playBeep(allowed) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (allowed) {
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } else {
        osc.frequency.value = 220;
        osc.type = "sawtooth";
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.7);
      }
    } catch (e) {}
  }
  
  export function logColor(log) {
    if (log.action === "RETURN") return theme.blue;
    if (log.status.includes("Denied") || log.status === "Overdue") return theme.red;
    return theme.green;
  }
  
  export function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }