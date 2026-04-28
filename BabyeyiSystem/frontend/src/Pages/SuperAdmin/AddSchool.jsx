// ================================================================
// AddSchool.jsx — 5-Step School Registration Form
// ✅ Sends FormData (required by multer on backend)
// ✅ Field names match school-add.js req.body destructuring exactly
// ✅ Postal address is OPTIONAL
// ✅ headPhone / headEmail are optional (backend no longer requires them)
// ================================================================
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  School, MapPin, Phone, Shield, Eye, EyeOff,
  Key, Upload, Check, ChevronRight, ChevronLeft, AlertCircle,
  CheckCircle, Loader2, X, ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDistrictCode } from '../../utils/rwandaDistrictCodes';

const API   = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api`;
const axCfg = { withCredentials: true };

// ── Rwanda administrative data ────────────────────────────────────
const PROVINCES = {
  'Kigali City': {
    districts: {
      Gasabo:     { sectors: ['Bumbogo','Gatsata','Gikomero','Gisozi','Jabana','Jali','Kacyiru','Kimihurura','Kimironko','Kinyinya','Ndera','Nduba','Remera','Rusororo','Rutunga'] },
      Kicukiro:   { sectors: ['Gahanga','Gatenga','Gikondo','Kagarama','Kanombe','Kicukiro','Kigarama','Masaka','Niboye','Nyarugunga'] },
      Nyarugenge: { sectors: ['Gitega','Kanyinya','Kigali','Kimisagara','Mageragere','Muhima','Nyakabanda','Nyamirambo','Nyarugenge','Rwezamenyo'] },
    },
  },
  'Eastern Province': {
    districts: {
      Bugesera:  { sectors: ['Gashora','Juru','Kamabuye','Mareba','Mayange','Musenyi','Mwogo','Ngeruka','Ntarama','Nyamata','Nyarugenge','Rilima','Ruhuha','Rweru','Shyara'] },
      Gatsibo:   { sectors: ['Gasange','Gatsibo','Gitoki','Kabarore','Kageyo','Kiramuruzi','Kiziguro','Muhura','Murambi','Ngarama','Nyagihanga','Remera','Rugarama','Rwimbogo'] },
      Kayonza:   { sectors: ['Gahini','Kabare','Kabarondo','Mukarange','Murama','Murundi','Mwiri','Ndego','Nyamirama','Rukara','Ruramira','Rwinkwavu'] },
      Kirehe:    { sectors: ['Gahara','Gatore','Kigarama','Kigina','Kirehe','Mahama','Mpanga','Musaza','Mushikiri','Nasho','Nyamugari','Nyarubuye'] },
      Ngoma:     { sectors: ['Gashanda','Jarama','Karembo','Kazo','Kibungo','Mugesera','Murama','Mutenderi','Remera','Rukira','Rukumberi','Rurenge','Sake','Zaza'] },
      Nyagatare: { sectors: ['Gatunda','Karama','Karangazi','Katabagemu','Katobo','Matimba','Mimuli','Mukama','Musheli','Nyagatare','Rukomo','Rwempasha','Rwimiyaga','Tabagwe'] },
      Rwamagana: { sectors: ['Fumbwe','Gahengeri','Gishari','Karenge','Kigabiro','Muhazi','Munyaga','Munyiginya','Musha','Muyumbu','Mwulire','Nyakariro','Nzige','Rubona'] },
    },
  },
  'Northern Province': {
    districts: {
      Burera:  { sectors: ['Bungwe','Butaro','Cyanika','Cyeru','Gahunga','Gatebe','Gitovu','Kagogo','Kinoni','Kinyababa','Kivuye','Nemba','Rugarama','Rugendabari','Ruhunde','Rusarabuye','Rwerere'] },
      Gakenke: { sectors: ['Busengo','Coko','Cyabingo','Gakenke','Gashenyi','Janja','Kamubuga','Karambo','Kivuruga','Mataba','Minini','Muhondo','Muyongwe','Muzo','Nemba','Ruli','Rusasa','Rushashi'] },
      Gicumbi: { sectors: ['Bukure','Bwisige','Byumba','Cyumba','Giti','Kageyo','Kaniga','Manyagiro','Miyove','Mukoto','Muko','Mutete','Nyamiyaga','Nyankenke','Rubaya','Rugarara','Ruvune','Rwamiko','Shinya'] },
      Musanze: { sectors: ['Busogo','Cyuve','Gacaca','Gashaki','Gataraga','Kimonyi','Kinigi','Muhoza','Muko','Musanze','Nkotsi','Nyange','Remera','Rwaza','Shingiro'] },
      Rulindo: { sectors: ['Base','Burega','Bushoki','Buyoga','Cyinzuzi','Cyungo','Kinihira','Kisaro','Masoro','Mbogo','Murambi','Ngoma','Ntarabana','Rukozo','Rusiga','Shyorongi','Tumba'] },
    },
  },
  'Southern Province': {
    districts: {
      Gisagara:  { sectors: ['Gikonko','Gishubi','Kansi','Kibirizi','Kigembe','Mamba','Muganza','Mugombwa','Mukindo','Musha','Ndora','Nyanza','Save'] },
      Huye:      { sectors: ['Gishamvu','Karama','Kigoma','Kinazi','Maraba','Mbazi','Mukura','Ngoma','Ruhashya','Rusatira','Rwaniro','Simbi','Tumba'] },
      Kamonyi:   { sectors: ['Gacurabwenge','Karama','Kayenzi','Kayumbu','Mugina','Musambira','Ngamba','Nyamiyaga','Nyarubaka','Rugarika','Rukoma','Runda'] },
      Muhanga:   { sectors: ['Cyeza','Kabacuzi','Kibangu','Kiyumba','Muhanga','Mushishiro','Nyabindu','Nyamabuye','Nyarutovu','Rongi','Rugendabari'] },
      Nyamagabe: { sectors: ['Buruhukiro','Cyanika','Gasaka','Gatare','Kaduha','Kamegeri','Kibirizi','Kibumbwe','Kitabi','Mbazi','Mugano','Musange','Nkomane','Tare','Uwinkingi'] },
      Nyanza:    { sectors: ['Busasamana','Cyabakamyi','Kibugabuga','Kigoma','Mukingo','Muyira','Ntyazo','Nyagisozi','Rwabicuma'] },
      Nyaruguru: { sectors: ['Cyahinda','Kibeho','Kivu','Mata','Mugombwa','Munini','Ngera','Ngoma','Nyabimata','Nyagisozi','Ruheru','Ruramba','Rusenge'] },
      Ruhango:   { sectors: ['Byimana','Kabagari','Kinazi','Kinihira','Mbuye','Mwendo','Ntongwe','Ruhango'] },
    },
  },
  'Western Province': {
    districts: {
      Karongi:    { sectors: ['Bwishyura','Gashari','Gishyita','Gitesi','Mubuga','Murambi','Murundi','Mutuntu','Rubengera','Rugabano','Ruganda','Rwankuba','Twumba'] },
      Ngororero:  { sectors: ['Bwira','Gatumba','Hindiro','Kabaya','Kageyo','Kavumu','Matyazo','Muhanda','Muhororo','Ndaro','Ngororero','Nyange','Sovu'] },
      Nyabihu:    { sectors: ['Bigogwe','Jenda','Jomba','Kabatwa','Karago','Kintobo','Mukamira','Muringa','Rambura','Rugera','Rurembo','Shyira'] },
      Nyamasheke: { sectors: ['Bushekeri','Bushenge','Cyato','Gihombo','Kagano','Kanjongo','Karambi','Karengera','Kirimbi','Macuba','Mahembe','Nyabitekeri','Rangiro','Ruharambuga','Shangi'] },
      Rubavu:     { sectors: ['Bugeshi','Busasamana','Cyanzarwe','Gisenyi','Kanama','Kanzenze','Mudende','Nyakiliba','Nyamyumba','Nyundo','Rubavu','Rugerero'] },
      Rusizi:     { sectors: ['Bugarama','Butare','Bweyeye','Gashonga','Giheke','Gihundwe','Gikundamvura','Gitambi','Kamembe','Muganza','Mururu','Nkungu','Nyakabuye','Nyakarenzo','Nzahaha','Rwimbogo'] },
      Rutsiro:    { sectors: ['Boneza','Gihango','Kigeyo','Kivumu','Manihira','Mukura','Murunda','Musasa','Mushonyi','Mushubati','Nyabirasi','Ruhango','Rusebeya'] },
    },
  },
};

const EDUCATION_LEVELS = [
  { value: 'nursery', label: 'Nursery / Pre-Primary' },
  { value: 'primary', label: 'Primary (P1–P6)' },
  { value: 'o_level', label: 'O-Level (S1–S3)' },
  { value: 'a_level', label: 'A-Level (S4–S6)' },
  { value: 'tvet',    label: 'TVET' },
];

const SCHOOL_CATEGORIES = ['Day', 'Boarding', 'Day & Boarding'];
const SCHOOL_OWNERSHIPS  = ['Government', 'Government-Aided', 'Private'];

// Match district Babyeyi gold theme
const inp = `w-full bg-[#FFFDF3]/80 border border-[#FFE58A] text-[#1F2937] rounded-xl px-4 py-3 text-sm
  focus:outline-none focus:border-[#F5B800] focus:ring-2 focus:ring-[#FFF6CC]
  placeholder-[#D1A400] transition-all`;

const genPassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const FieldUI = ({ label, error, children, required, hint }) => (
  <div>
    <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1">
      {label} {required && <span className="text-red-500">*</span>}
      {!required && <span className="text-amber-300 font-normal normal-case ml-1">(optional)</span>}
    </label>
    {children}
    {hint && !error && <p className="text-amber-600 text-[11px] mt-1">{hint}</p>}
    {error && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3 shrink-0"/>{error}</p>}
  </div>
);

const FileUpload = ({ label, accept, preview, onFileSelect, error, required, hint }) => {
  const ref = useRef();
  return (
    <div>
      <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1">
        {label} {required && <span className="text-red-500">*</span>}
        {!required && <span className="text-amber-300 font-normal normal-case ml-1">(optional)</span>}
      </label>
      <div
        onClick={() => ref.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
          ${error ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-amber-50/40 hover:border-amber-400 hover:bg-amber-50'}`}
      >
        {preview ? (
          <div className="flex items-center justify-center gap-3">
            <img src={preview} alt="" className="w-16 h-16 object-contain rounded-lg border border-amber-100"/>
            <div className="text-left">
              <p className="text-xs font-semibold text-amber-800">File selected ✓</p>
              <p className="text-[10px] text-amber-500">Click to change</p>
            </div>
          </div>
        ) : (
          <div>
            <Upload className="w-6 h-6 text-amber-400 mx-auto mb-1"/>
            <p className="text-xs text-amber-600">Click to upload</p>
            <p className="text-[10px] text-amber-400 mt-0.5">{accept?.replace(/,/g, ', ')}</p>
          </div>
        )}
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={e => onFileSelect(e.target.files[0])}/>
      </div>
      {hint && !error && <p className="text-amber-600 text-[11px] mt-1">{hint}</p>}
      {error && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{error}</p>}
    </div>
  );
};

const STEPS = [
  { label: 'Identity',   icon: School  },
  { label: 'Location',   icon: MapPin  },
  { label: 'Contact',    icon: Phone   },
  { label: 'Leadership', icon: Shield  },
  { label: 'Access',     icon: Shield  },
];

const StepIndicator = ({ current }) => (
  <div className="flex items-center justify-between mb-8 relative">
    <div className="absolute top-4 left-0 right-0 h-0.5 bg-amber-100 z-0"/>
    {STEPS.map((s, i) => {
      const done   = i < current;
      const active = i === current;
      return (
        <div key={i} className="relative z-10 flex flex-col items-center gap-1.5">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
            ${done ? 'bg-amber-500 border-amber-500' : active ? 'bg-white border-amber-400 shadow-lg shadow-amber-200' : 'bg-white border-amber-200'}`}>
            {done
              ? <Check className="w-4 h-4 text-white"/>
              : <s.icon className={`w-3.5 h-3.5 ${active ? 'text-amber-600' : 'text-amber-300'}`}/>
            }
          </div>
          <span className={`text-[10px] font-bold hidden sm:block ${active ? 'text-amber-800' : done ? 'text-amber-600' : 'text-amber-300'}`}>
            {s.label}
          </span>
        </div>
      );
    })}
  </div>
);

export default function AddSchool() {
  const navigate = useNavigate();
  const auth     = useAuth();
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});
  const [toast,   setToast]   = useState(null);

  // Step 1
  const [schoolName,   setSchoolName]   = useState('');
  const [levels,       setLevels]       = useState([]);
  const [category,     setCategory]     = useState('');
  const [ownership,    setOwnership]    = useState('');
  const [foundedYear,  setFoundedYear]  = useState('');
  const [logoFile,     setLogoFile]     = useState(null);
  const [logoPreview,  setLogoPreview]  = useState('');

  // Step 2
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [sector,   setSector]   = useState('');
  const [cell,     setCell]     = useState('');
  const [village,  setVillage]  = useState('');

  // Step 3
  const [phone,      setPhone]      = useState('');
  const [email,      setEmail]      = useState('');
  const [postalAddr, setPostalAddr] = useState('');
  const [website,    setWebsite]    = useState('');

  // Step 4
  const [headTeacher,      setHeadTeacher]      = useState('');
  const [headPhone,        setHeadPhone]        = useState('');
  const [headEmail,        setHeadEmail]        = useState('');
  const [deputyTeacher,    setDeputyTeacher]    = useState('');
  const [signatureFile,    setSignatureFile]    = useState(null);
  const [signaturePreview, setSignaturePreview] = useState('');
  const [stampFile,        setStampFile]        = useState(null);
  const [stampPreview,     setStampPreview]     = useState('');

  // Step 5
  const [managerEmail, setManagerEmail] = useState('');
  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState(genPassword());
  const [showPw,       setShowPw]       = useState(false);

  const provinceData = PROVINCES[province] || {};
  const districtData = provinceData.districts?.[district] || {};
  const sectorList   = districtData.sectors || [];
  const districtCodeDisplay = district ? getDistrictCode(district) : null;

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const handleFileSelect = (file, setFile, setPreview) => {
    if (!file) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const validateStep = () => {
    const e = {};
    if (step === 0) {
      if (!schoolName.trim()) e.schoolName = 'School name is required';
      if (!levels.length)     e.levels     = 'Select at least one education level';
      if (!category)          e.category   = 'Select a school category';
      if (!ownership)         e.ownership  = 'Select school ownership type';
    }
    if (step === 1) {
      if (!province) e.province = 'Province is required';
      if (!district) e.district = 'District is required';
      if (!sector)   e.sector   = 'Sector is required';
    }
    if (step === 2) {
      if (!phone.trim()) e.phone = 'Phone number is required';
      if (!email.trim()) e.email = 'School email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email address';
    }
    if (step === 3) {
      if (!headTeacher.trim()) e.headTeacher = 'Head teacher name is required';
    }
    if (step === 4) {
      if (!managerEmail.trim()) e.managerEmail = 'Manager email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail)) e.managerEmail = 'Invalid email';
      if (!username.trim())     e.username = 'Username is required';
      if (!password.trim())     e.password = 'Password is required';
      else if (password.length < 8) e.password = 'Password must be at least 8 characters';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => { if (validateStep()) setStep(s => s + 1); };
  const prev = () => setStep(s => s - 1);

  // ── Submit using FormData — required by multer ────────────────
  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    try {
      const fd = new FormData();

      // ── Step 1: exact field names from school-add.js destructuring ──
      fd.append('schoolName',    schoolName.trim());
      fd.append('schoolCode', 'AUTO');
      fd.append('levels',        JSON.stringify(levels));  // backend: JSON.parse(levelsRaw)
      fd.append('category',      category);
      fd.append('ownership',     ownership);
      if (foundedYear) fd.append('yearEstablished', foundedYear);
      if (logoFile)    fd.append('logo', logoFile);        // multer field: 'logo'

      // ── Step 2 ───────────────────────────────────────────────
      fd.append('province',    province);
      fd.append('district',    district);
      fd.append('sector',      sector);
      fd.append('cell',        cell    || sector);
      fd.append('village',     village || sector);
      fd.append('fullAddress', `${sector}, ${district}, ${province}`);

      // ── Step 3 ───────────────────────────────────────────────
      fd.append('phone', phone.trim());
      fd.append('email', email.trim());
      if (postalAddr.trim()) fd.append('postal',  postalAddr.trim());
      if (website.trim())    fd.append('website', website.trim());

      // ── Step 4 ───────────────────────────────────────────────
      fd.append('headName', headTeacher.trim());
      if (headPhone.trim())     fd.append('headPhone',  headPhone.trim());
      if (headEmail.trim())     fd.append('headEmail',  headEmail.trim());
      if (deputyTeacher.trim()) fd.append('deputyName', deputyTeacher.trim());
      if (signatureFile) fd.append('headSignature', signatureFile); // multer field: 'headSignature'
      if (stampFile)     fd.append('stamp',         stampFile);     // multer field: 'stamp'

      // ── Step 5 ───────────────────────────────────────────────
      fd.append('managerEmail', managerEmail.trim());
      fd.append('username',     username.trim());
      fd.append('password',     password);

      // Do NOT set Content-Type — axios sets multipart/form-data + boundary automatically
      const res = await axios.post(`${API}/schools`, fd, axCfg);

      if (res.data.success) {
        // If a logged-in Super Admin is creating the school, keep existing redirect.
        // Otherwise (public registration), show a pending-approval message and send to login.
        const isSuperAdmin = ['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'].includes(auth?.role);
        const message = isSuperAdmin
          ? 'School registered successfully! 🎉'
          : 'Your school registration has been submitted and is pending Super Admin approval.';
        showToast(message, 'success');

        const nextPath = isSuperAdmin ? '/superadmin/dashboard' : '/login';

        setTimeout(() => navigate(nextPath), 1800);
      } else {
        throw new Error(res.data.message || 'Registration failed');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Something went wrong';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleLevel = (val) => {
    setLevels(prev => prev.includes(val) ? prev.filter(l => l !== val) : [...prev, val]);
    setErrors(e => ({ ...e, levels: null }));
  };

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg,#FFFDF3 0%,#FFF6CC 40%,#FFE58A 100%)' }}>
      <style>{`
        option { background: white; color: #1F2937; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #FFE58A; border-radius: 99px; }
      `}</style>

      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-amber-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-all">
          <ArrowLeft className="w-5 h-5"/>
        </button>
        <div>
          <h1 className="text-sm font-black text-[#8A6500]">Register New School</h1>
          <p className="text-[10px] text-amber-600">Step {step + 1} of {STEPS.length} · {STEPS[step].label}</p>
        </div>
        <div className="ml-auto">
          <div className="h-1.5 w-32 bg-amber-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#F5B800] rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}/>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center p-4 pt-8">
        <div className="w-full max-w-2xl">
          <StepIndicator current={step}/>

          <div className="bg-white rounded-3xl shadow-xl border border-amber-100 p-6 sm:p-8">

            {/* STEP 1: Identity */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-black text-[#8A6500]">🏫 School Identity</h2>
                  <p className="text-xs text-amber-700 mt-0.5">Basic information about the school</p>
                </div>
                <FieldUI label="School Name" required error={errors.schoolName}>
                  <input className={inp} value={schoolName}
                    onChange={e => { setSchoolName(e.target.value); setErrors(v => ({...v, schoolName: null})); }}
                    placeholder="e.g. Kigali Secondary School"/>
                </FieldUI>
                <div>
                  <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1">
                    Education Levels <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EDUCATION_LEVELS.map(l => (
                      <button key={l.value} type="button" onClick={() => toggleLevel(l.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                          ${levels.includes(l.value) ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400'}`}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                  {errors.levels && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.levels}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FieldUI label="Category" required error={errors.category}>
                    <select className={inp} value={category} onChange={e => { setCategory(e.target.value); setErrors(v => ({...v, category: null})); }}>
                      <option value="">Select…</option>
                      {SCHOOL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </FieldUI>
                  <FieldUI label="Ownership" required error={errors.ownership}>
                    <select className={inp} value={ownership} onChange={e => { setOwnership(e.target.value); setErrors(v => ({...v, ownership: null})); }}>
                      <option value="">Select…</option>
                      {SCHOOL_OWNERSHIPS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </FieldUI>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FieldUI label="Year Founded">
                    <input className={inp} type="number" min="1800" max={new Date().getFullYear()}
                      value={foundedYear} onChange={e => setFoundedYear(e.target.value)} placeholder="e.g. 1985"/>
                  </FieldUI>
                  <FileUpload label="School Logo" accept="image/png,image/jpeg,image/jpg"
                    preview={logoPreview} onFileSelect={f => handleFileSelect(f, setLogoFile, setLogoPreview)}
                    hint="PNG or JPEG recommended"/>
                </div>
              </div>
            )}

            {/* STEP 2: Location */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-black text-[#8A6500]">📍 School Location</h2>
                  <p className="text-xs text-amber-700 mt-0.5">Where is the school situated?</p>
                </div>
                <FieldUI label="Province" required error={errors.province}>
                  <select className={inp} value={province}
                    onChange={e => { setProvince(e.target.value); setDistrict(''); setSector(''); setCell(''); setVillage(''); setErrors(v => ({...v, province: null})); }}>
                    <option value="">Select Province…</option>
                    {Object.keys(PROVINCES).map(p => <option key={p}>{p}</option>)}
                  </select>
                </FieldUI>
                <FieldUI label="District" required error={errors.district}>
                  <select className={inp} value={district} disabled={!province}
                    onChange={e => { setDistrict(e.target.value); setSector(''); setCell(''); setVillage(''); setErrors(v => ({...v, district: null})); }}>
                    <option value="">Select District…</option>
                    {Object.keys(provinceData.districts || {}).map(d => <option key={d}>{d}</option>)}
                  </select>
                </FieldUI>
                {district && districtCodeDisplay && (
                  <p className="text-[11px] text-amber-800 font-semibold">
                    District code (official, for student IDs):{' '}
                    <span className="font-mono text-amber-900">{districtCodeDisplay}</span>
                  </p>
                )}
                <FieldUI label="Sector" required error={errors.sector}>
                  <select className={inp} value={sector} disabled={!district}
                    onChange={e => { setSector(e.target.value); setCell(''); setVillage(''); setErrors(v => ({...v, sector: null})); }}>
                    <option value="">Select Sector…</option>
                    {sectorList.map(s => <option key={s}>{s}</option>)}
                  </select>
                </FieldUI>
                <div className="grid grid-cols-2 gap-3">
                  <FieldUI label="Cell">
                    <input className={inp} value={cell} onChange={e => setCell(e.target.value)} placeholder="Cell name" disabled={!sector}/>
                  </FieldUI>
                  <FieldUI label="Village">
                    <input className={inp} value={village} onChange={e => setVillage(e.target.value)} placeholder="Village name" disabled={!sector}/>
                  </FieldUI>
                </div>
                {district && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-600 shrink-0"/>
                    <p className="text-xs text-amber-800">
                      <strong>{district}</strong>
                      {districtCodeDisplay && (
                        <span className="font-mono font-bold text-amber-900"> · code {districtCodeDisplay}</span>
                      )}
                      , {province}{sector && <span> · {sector}</span>}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Contact */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-black text-[#8A6500]">📞 Contact Information</h2>
                  <p className="text-xs text-amber-700 mt-0.5">How can the school be reached?</p>
                </div>
                <FieldUI label="Phone Number" required error={errors.phone}>
                  <input className={inp} value={phone}
                    onChange={e => { setPhone(e.target.value); setErrors(v => ({...v, phone: null})); }}
                    placeholder="+250 788 000 000"/>
                </FieldUI>
                <FieldUI label="School Email" required error={errors.email}>
                  <input className={inp} type="email" value={email}
                    onChange={e => { setEmail(e.target.value); setErrors(v => ({...v, email: null})); }}
                    placeholder="school@example.rw"/>
                </FieldUI>
                <FieldUI label="Postal Address" hint="P.O. Box or physical postal address">
                  <input className={inp} value={postalAddr} onChange={e => setPostalAddr(e.target.value)}
                    placeholder="e.g. P.O. Box 1234, Kigali"/>
                </FieldUI>
                <FieldUI label="Website" hint="Include https://">
                  <input className={inp} type="url" value={website} onChange={e => setWebsite(e.target.value)}
                    placeholder="https://school.rw"/>
                </FieldUI>
              </div>
            )}

            {/* STEP 4: Leadership */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-black text-[#8A6500]">👤 School Leadership</h2>
                  <p className="text-xs text-amber-700 mt-0.5">Head teacher details and official documents</p>
                </div>
                <FieldUI label="Head Teacher Full Name" required error={errors.headTeacher}>
                  <input className={inp} value={headTeacher}
                    onChange={e => { setHeadTeacher(e.target.value); setErrors(v => ({...v, headTeacher: null})); }}
                    placeholder="e.g. Jean-Pierre Habimana"/>
                </FieldUI>
                <div className="grid grid-cols-2 gap-3">
                  <FieldUI label="Head Teacher Phone">
                    <input className={inp} value={headPhone} onChange={e => setHeadPhone(e.target.value)}
                      placeholder="+250 788 000 000"/>
                  </FieldUI>
                  <FieldUI label="Head Teacher Email">
                    <input className={inp} type="email" value={headEmail} onChange={e => setHeadEmail(e.target.value)}
                      placeholder="head@school.rw"/>
                  </FieldUI>
                </div>
                <FieldUI label="Deputy Head Teacher">
                  <input className={inp} value={deputyTeacher} onChange={e => setDeputyTeacher(e.target.value)}
                    placeholder="e.g. Marie Uwimana"/>
                </FieldUI>
                <div className="grid grid-cols-2 gap-3">
                  <FileUpload label="Head Teacher Signature" accept="image/png,image/jpeg,image/jpg"
                    preview={signaturePreview} onFileSelect={f => handleFileSelect(f, setSignatureFile, setSignaturePreview)}
                    hint="PNG transparent background preferred"/>
                  <FileUpload label="School Stamp / Seal" accept="image/png,image/jpeg,image/jpg"
                    preview={stampPreview} onFileSelect={f => handleFileSelect(f, setStampFile, setStampPreview)}
                    hint="PNG transparent background preferred"/>
                </div>
              </div>
            )}

            {/* STEP 5: Access */}
            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-black text-[#8A6500]">🔐 System Access</h2>
                  <p className="text-xs text-amber-700 mt-0.5">Create the school manager account</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                  <Shield className="w-4 h-4 shrink-0 mt-0.5 text-amber-600"/>
                  <span>This account will be the primary administrator for the school portal. Share credentials securely with the head teacher.</span>
                </div>
                <FieldUI label="Manager Email" required error={errors.managerEmail}>
                  <input className={inp} type="email" value={managerEmail}
                    onChange={e => { setManagerEmail(e.target.value); setErrors(v => ({...v, managerEmail: null})); }}
                    placeholder="manager@school.rw"/>
                </FieldUI>
                <FieldUI label="Username" required error={errors.username} hint="Lowercase letters, numbers and underscores only">
                  <input className={inp} value={username}
                    onChange={e => { setUsername(e.target.value.toLowerCase().replace(/\s/g, '')); setErrors(v => ({...v, username: null})); }}
                    placeholder="schoolmanager"/>
                </FieldUI>
                <FieldUI label="Password" required error={errors.password}>
                  <div className="relative">
                    <input className={`${inp} pr-24`} type={showPw ? 'text' : 'password'}
                      value={password} onChange={e => { setPassword(e.target.value); setErrors(v => ({...v, password: null})); }}
                      placeholder="Min 8 characters"/>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-500">
                        {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                      </button>
                      <button type="button" onClick={() => setPassword(genPassword())}
                        className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-600" title="Generate strong password">
                        <Key className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>
                </FieldUI>

                {managerEmail && username && password && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wider mb-3">📋 Credentials to Share</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { label: 'Email',    value: managerEmail },
                        { label: 'Username', value: username },
                        { label: 'Password', value: password, mono: true },
                      ].map(({ label, value, mono }) => (
                        <div key={label} className="bg-white rounded-lg p-2.5 border border-emerald-100">
                          <p className="text-[9px] text-emerald-500 font-bold uppercase">{label}</p>
                          <p className={`font-bold text-emerald-800 text-sm break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-[#1F2937] rounded-2xl p-4 text-white">
                  <p className="text-[11px] font-black uppercase tracking-wider mb-3 text-amber-300">📋 Registration Summary</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-amber-200">School:</span>    <span className="font-semibold text-white">{schoolName || '—'}</span></div>
                    <div><span className="text-amber-200">School code:</span> <span className="font-semibold text-white/90">Assigned automatically (001, 002…)</span></div>
                    <div><span className="text-amber-200">Location:</span>  <span className="font-semibold text-white">{district || '—'}, {province || '—'}</span></div>
                    <div><span className="text-amber-200">District code:</span> <span className="font-mono font-semibold text-white">{districtCodeDisplay || '—'}</span></div>
                    <div><span className="text-amber-200">Category:</span>  <span className="font-semibold text-white">{category || '—'}</span></div>
                    <div><span className="text-amber-200">Ownership:</span> <span className="font-semibold text-white">{ownership || '—'}</span></div>
                    <div><span className="text-amber-200">Head:</span>      <span className="font-semibold text-white">{headTeacher || '—'}</span></div>
                    <div><span className="text-amber-200">Levels:</span>    <span className="font-semibold text-white">{levels.join(', ') || '—'}</span></div>
                    <div><span className="text-amber-200">Postal:</span>    <span className="font-semibold text-white">{postalAddr || 'Not provided'}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-amber-100">
              <button onClick={step === 0 ? () => navigate(-1) : prev}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-amber-200 text-amber-700 font-semibold text-sm hover:bg-amber-50 transition-all">
                <ChevronLeft className="w-4 h-4"/>
                {step === 0 ? 'Cancel' : 'Back'}
              </button>
              {step < STEPS.length - 1 ? (
                <button onClick={next}
                  className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-200/60 transition-all active:scale-95">
                  Continue <ChevronRight className="w-4 h-4"/>
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#F5B800] to-amber-500 hover:opacity-90 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-200/60 transition-all active:scale-95 disabled:opacity-60">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
                  {loading ? 'Registering…' : 'Register School'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-start gap-3 px-4 py-3 rounded-2xl shadow-2xl border w-80
          ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
          : toast.type === 'error'   ? 'bg-red-50 border-red-300 text-red-800'
          :                            'bg-amber-50 border-amber-300 text-amber-800'}`}>
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"/>
            : <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0"/>}
          <p className="flex-1 text-xs font-medium leading-snug">{toast.msg}</p>
          <button onClick={() => setToast(null)} className="opacity-40 hover:opacity-100">
            <X className="w-3.5 h-3.5"/>
          </button>
        </div>
      )}
    </div>
  );
}