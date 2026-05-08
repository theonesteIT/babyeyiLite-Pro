export const GRAD = {
  blue:    "from-blue-600 to-blue-500",
  emerald: "from-emerald-500 to-emerald-400",
  amber:   "from-amber-500 to-orange-400",
  red:     "from-red-500 to-red-400",
  violet:  "from-violet-500 to-blue-500",
  cyan:    "from-cyan-500 to-blue-400",
  teal:    "from-teal-500 to-emerald-400",
  indigo:  "from-indigo-600 to-violet-500",
  rose:    "from-rose-500 to-pink-500",
  sky:     "from-sky-500 to-cyan-400",
};

export const inp = `w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm
  focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
  placeholder-slate-400 transition-all`;

export const NESA_LIMITS = {
  "Public-Nursery":   15000,
  "Public-Primary":   30000,
  "Public-Secondary": 75000,
  "Private-Nursery":  80000,
  "Private-Primary":  120000,
  "Private-Secondary":250000,
  "Boarding-Secondary":400000,
  "TVET-Secondary":   200000,
};

export const TRANSLATIONS = {
  en: {
    dashboard: "Dashboard", babyeyi: "Babyeyi", requests: "Increase Requests",
    documents: "Documents", analytics: "Analytics", notifications: "Notifications",
    settings: "School Settings", audit: "Audit Logs",
    totalBabyeyi: "Total Babyeyi", approved: "Approved", pending: "Pending",
    rejected: "Rejected", alerts: "NESA Alerts", createNew: "Create New Babyeyi",
    schoolName: "School Name", academicYear: "Academic Year", term: "Term",
    className: "Class", totalFee: "Total Fee", status: "Status", actions: "Actions",
    compliance: "Compliance", nesaLimit: "NESA Limit", exceeds: "Exceeds Limit",
    within: "Within Limit", submit: "Submit", save: "Save", cancel: "Cancel",
    download: "Download PDF", print: "Print", share: "Share",
  },
  rw: {
    dashboard: "Ikibaho", babyeyi: "Babyeyi", requests: "Gusaba Kwiyongera",
    documents: "Inyandiko", analytics: "Imibare", notifications: "Menyeshwa",
    settings: "Igenamiterere", audit: "Inyandiko z'Ikurikirana",
    totalBabyeyi: "Babyeyi Zose", approved: "Yemewe", pending: "Irategerezwa",
    rejected: "Yanzwe", alerts: "Impuruza za NESA", createNew: "Kora Babyeyi Nshya",
    schoolName: "Izina ry'Ishuri", academicYear: "Umwaka w'Ishuri", term: "Igihembwe",
    className: "Umubare w'Inshuti", totalFee: "Amafaranga Yose", status: "Imiterere",
    actions: "Ibikorwa", compliance: "Kwubahiriza", nesaLimit: "Umubare wa NESA",
    exceeds: "Hirya y'Umubare", within: "Mu Mubare", submit: "Ohereza", save: "Bika",
    cancel: "Hagarika", download: "Pakurura PDF", print: "Chapisha", share: "Sangira",
  },
  fr: {
    dashboard: "Tableau de Bord", babyeyi: "Babyeyi", requests: "Demandes d'Augmentation",
    documents: "Documents", analytics: "Analytiques", notifications: "Notifications",
    settings: "Paramètres École", audit: "Journaux d'Audit",
    totalBabyeyi: "Total Babyeyi", approved: "Approuvé", pending: "En Attente",
    rejected: "Rejeté", alerts: "Alertes NESA", createNew: "Créer Nouveau Babyeyi",
    schoolName: "Nom de l'École", academicYear: "Année Académique", term: "Trimestre",
    className: "Classe", totalFee: "Frais Total", status: "Statut", actions: "Actions",
    compliance: "Conformité", nesaLimit: "Limite NESA", exceeds: "Dépasse la Limite",
    within: "Dans la Limite", submit: "Soumettre", save: "Enregistrer", cancel: "Annuler",
    download: "Télécharger PDF", print: "Imprimer", share: "Partager",
  },
};

export const SAMPLE_BABYEYI = [
  {id:1,year:"2024-2025",term:"Term 1",class:"P6",totalFee:28000,status:"approved",nesaLimit:30000,category:"Public",level:"Primary",createdAt:"2024-09-01",createdBy:"Jean Bosco",payments:[{name:"Tuition",amount:18000},{name:"Materials",amount:6000},{name:"Sports",amount:4000}]},
  {id:2,year:"2024-2025",term:"Term 1",class:"S4",totalFee:260000,status:"pending",nesaLimit:250000,category:"Private",level:"Secondary",createdAt:"2024-09-05",createdBy:"Marie Claire",payments:[{name:"Tuition",amount:200000},{name:"Laboratory",amount:30000},{name:"Library",amount:30000}]},
  {id:3,year:"2024-2025",term:"Term 1",class:"S6",totalFee:240000,status:"approved",nesaLimit:250000,category:"Private",level:"Secondary",createdAt:"2024-09-10",createdBy:"Jean Bosco",payments:[{name:"Tuition",amount:190000},{name:"ICT",amount:30000},{name:"Activities",amount:20000}]},
  {id:4,year:"2024-2025",term:"Term 2",class:"P3",totalFee:25000,status:"approved",nesaLimit:30000,category:"Public",level:"Primary",createdAt:"2024-11-15",createdBy:"Marie Claire",payments:[{name:"Tuition",amount:20000},{name:"Books",amount:5000}]},
  {id:5,year:"2024-2025",term:"Term 2",class:"S1",totalFee:85000,status:"rejected",nesaLimit:75000,category:"Public",level:"Secondary",createdAt:"2024-11-18",createdBy:"Jean Bosco",payments:[{name:"Tuition",amount:65000},{name:"Sports",amount:20000}]},
  {id:6,year:"2023-2024",term:"Term 3",class:"S3",totalFee:245000,status:"approved",nesaLimit:250000,category:"Private",level:"Secondary",createdAt:"2024-01-10",createdBy:"Amina",payments:[{name:"Tuition",amount:195000},{name:"Labs",amount:50000}]},
];

export const SAMPLE_REQUESTS = [
  {id:1,babyeyiId:2,class:"S4",term:"Term 1",year:"2024-2025",currentLimit:250000,requested:280000,diff:30000,diffPct:12,reason:"infrastructure",description:"New computer laboratory construction and maintenance fees for 120 new computers installed in 2024.",status:"pending",districtComment:"",nesaDecision:"",submittedAt:"2024-09-05",schoolDirectorSigned:true,parentRepSigned:true,districtRecLetter:false},
  {id:2,babyeyiId:5,class:"S1",term:"Term 2",year:"2024-2025",currentLimit:75000,requested:90000,diff:15000,diffPct:20,reason:"materials",description:"Increased cost of science materials and books due to import price increases.",status:"district_review",districtComment:"Partially justified. Recommend approval of RWF 82,000.",nesaDecision:"",submittedAt:"2024-11-18",schoolDirectorSigned:true,parentRepSigned:true,districtRecLetter:true},
];

export const SAMPLE_NOTIFICATIONS = [
  {id:1,type:"violation",title:"🚨 NESA Limit Exceeded",body:"S4 Babyeyi (Term 1) exceeds NESA limit by RWF 10,000. Review required.",read:false,time:"5 min ago"},
  {id:2,type:"approved",title:"✅ Babyeyi Approved",body:"P6 Term 1 Babyeyi has been approved by District Education Office.",read:false,time:"2 hrs ago"},
  {id:3,type:"request",title:"📋 Request Under Review",body:"Your fee increase request for S1 Term 2 is now under district review.",read:false,time:"1 day ago"},
  {id:4,type:"system",title:"📊 Term Report Ready",body:"Term 1 2024-2025 financial report is ready for download.",read:true,time:"2 days ago"},
  {id:5,type:"regulation",title:"📄 New NESA Regulation",body:"Updated fee guidelines for Secondary schools effective January 2025.",read:true,time:"3 days ago"},
];

export const AUDIT_LOGS = [
  {id:1,action:"Created Babyeyi",user:"Jean Bosco",detail:"Created S4 Term 1 2024-2025 Babyeyi (RWF 260,000)",timestamp:"2024-09-05 09:14:22",type:"create"},
  {id:2,action:"Edited Amount",user:"Marie Claire",detail:"Changed P6 fee from RWF 25,000 to RWF 28,000",timestamp:"2024-09-08 14:30:05",type:"edit"},
  {id:3,action:"Submitted Request",user:"Jean Bosco",detail:"Submitted fee increase request for S4 (RWF 280,000)",timestamp:"2024-09-05 10:00:00",type:"submit"},
  {id:4,action:"Downloaded PDF",user:"Amina",detail:"Downloaded S3 Term 3 2023-2024 Babyeyi PDF",timestamp:"2024-09-10 16:45:12",type:"download"},
  {id:5,action:"Login",user:"Jean Bosco",detail:"User logged in from IP 41.186.42.100",timestamp:"2024-09-11 08:00:01",type:"auth"},
  {id:6,action:"Changed Language",user:"Marie Claire",detail:"Interface language changed to Kinyarwanda",timestamp:"2024-09-11 08:30:00",type:"system"},
];