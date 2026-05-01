import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings2,
  ArrowLeft,
  Building2,
  User,
  Banknote,
  Phone,
  FileText,
  CheckCircle2,
  Save,
  ShieldCheck,
  MapPin,
  Globe,
  Mail,
  RefreshCw,
  Info,
  Calendar,
  ChevronRight,
  Printer
} from 'lucide-react';

const STORAGE_KEY = 'acct:invoices:config';

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export default function InvoiceSettings() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(() => loadJSON(STORAGE_KEY, {
    schoolName: 'Babyeyi School',
    contactLine: 'Finance Office',
    bankAccount: 'ACC-__________',
    momoNumber: '07__ ___ ___',
    defaultTerms: 'Payment due within 7 days. Late fees may apply.',
    footerNote: 'Thank you for supporting the school.',
    address: '',
    email: '',
    website: ''
  }));

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const handleSave = () => {
    setIsSaving(true);
    saveJSON(STORAGE_KEY, config);
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date().toLocaleTimeString());
    }, 600);
  };

  // Auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      saveJSON(STORAGE_KEY, config);
    }, 1000);
    return () => clearTimeout(timer);
  }, [config]);

  const InputField = ({ label, value, onChange, placeholder, icon: Icon, type = "text" }) => (
    <div className="group space-y-2">
      <div className="flex items-center gap-2 ml-1">
        <Icon size={11} className="text-re-gold opacity-50 group-focus-within:opacity-100 transition-opacity" />
        <label className="text-[9px] font-black text-[#000435] uppercase tracking-widest">{label}</label>
      </div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full h-11 rounded-xl bg-white px-4 outline-none border border-transparent focus:border-[#000435]/10 focus:bg-white focus:ring-4 focus:ring-[#000435]/5 transition-all text-[#000435] text-[10px] font-black tracking-tight shadow-inner"
      />
    </div>
  );

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-20" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Institutional Hero Section */}
      <div className="relative w-full min-h-[320px] overflow-hidden">
        

        <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-12 pb-16">
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-2 text-white/40 hover:text-re-gold transition-all mb-6 group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em]">Back to Registry</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="hidden md:flex shrink-0 w-20 h-20 rounded-[28px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FEBF10]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <Settings2 size={32} style={{ color: "#FEBF10" }} className="group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-1 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></span>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: "#FEBF10" }}>System Setup</p>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tighter leading-none mb-1 mt-1 uppercase">
                  Configure <span style={{ color: "#FEBF10" }}>Invoices</span>
                </h1>
                <p className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-white/40 max-w-lg leading-relaxed uppercase tracking-widest italic opacity-60">
                  Manage digital branding, bank accounts, and legal terms
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="h-10 px-6 rounded-xl text-[#000435] bg-[#FEBF10] font-black text-[9px] uppercase tracking-widest shadow-xl shadow-[#FEBF10]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {isSaving ? 'Syncing...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Layout Content */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-24 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main Configuration Card (3/4 width) */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-[24px] shadow-2xl border border-black/5 overflow-hidden">
              
              {/* Top Stats Ribbon */}
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-black/5 border-b border-black/5 bg-white/50">
                {[
                  { label: 'Branding Status', value: 'Active', icon: <Building2 size={12} className="text-emerald-500" /> },
                  { label: 'Payment Channels', value: 'Enabled', icon: <Banknote size={12} className="text-blue-500" /> },
                  { label: 'Institutional Health', value: 'Optimal', icon: <ShieldCheck size={12} className="text-amber-500" /> },
                  { label: 'Last Update', value: lastSaved || 'Now', icon: <Calendar size={12} className="text-[#000435]" /> },
                ].map((stat, i) => (
                  <div key={i} className="p-3 flex flex-col items-center justify-center text-center group hover:bg-white transition-all cursor-default py-4">
                    <div className="mb-1 opacity-40 shrink-0">{stat.icon}</div>
                    <span className="text-[12px] font-black text-[#000435] tracking-tight">{stat.value}</span>
                    <p className="text-[6px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 opacity-60">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="p-6 md:p-8">
                {/* Configuration Sections */}
                <div className="space-y-8">
                  
                  {/* Section 1: Institutional Core */}
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-xl bg-white border border-black/5 flex items-center justify-center text-[#000435]">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <h2 className="text-[10px] font-black text-[#000435] uppercase tracking-widest">Brand Identity</h2>
                        <p className="text-[7px] font-bold text-[#000435] uppercase tracking-tight opacity-60 mt-0.5">Primary information for PDF headers</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InputField label="Institution Name" value={config.schoolName} onChange={(e) => setConfig({...config, schoolName: e.target.value})} icon={Building2} placeholder="School name" />
                      <InputField label="Financial Contact" value={config.contactLine} onChange={(e) => setConfig({...config, contactLine: e.target.value})} icon={User} placeholder="Finance Office" />
                      <InputField label="Official Email" value={config.email} onChange={(e) => setConfig({...config, email: e.target.value})} icon={Mail} placeholder="finance@school.com" />
                      <InputField label="Official Website" value={config.website} onChange={(e) => setConfig({...config, website: e.target.value})} icon={Globe} placeholder="www.school.com" />
                      <div className="md:col-span-2">
                        <InputField label="Institutional Address" value={config.address} onChange={(e) => setConfig({...config, address: e.target.value})} icon={MapPin} placeholder="Full address..." />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Payment Pathways */}
                  <div className="pt-8 border-t border-black/5">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-xl bg-white border border-black/5 flex items-center justify-center text-[#000435]">
                        <Banknote size={16} />
                      </div>
                      <div>
                        <h2 className="text-[10px] font-black text-[#000435] uppercase tracking-widest">Financial Channels</h2>
                        <p className="text-[7px] font-bold text-[#000435] uppercase tracking-tight opacity-60 mt-0.5">Designate account numbers for parents</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InputField label="Bank Account" value={config.bankAccount} onChange={(e) => setConfig({...config, bankAccount: e.target.value})} icon={Banknote} placeholder="ACC NO..." />
                      <InputField label="Mobile Money" value={config.momoNumber} onChange={(e) => setConfig({...config, momoNumber: e.target.value})} icon={Phone} placeholder="07XX XXX XXX" />
                    </div>
                  </div>

                  {/* Section 3: Legal Disclosures */}
                  <div className="pt-8 border-t border-black/5">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-xl bg-white border border-black/5 flex items-center justify-center text-[#000435]">
                        <ShieldCheck size={16} />
                      </div>
                      <div>
                        <h2 className="text-[10px] font-black text-[#000435] uppercase tracking-widest">Disclosures & Terms</h2>
                        <p className="text-[7px] font-bold text-[#000435] uppercase tracking-tight opacity-60 mt-0.5">Add legal context to your invoices</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                      <div className="group space-y-2">
                        <div className="flex items-center gap-2 ml-1">
                          <FileText size={11} className="text-re-gold" />
                          <label className="text-[9px] font-black text-[#000435] uppercase tracking-widest opacity-60 italic">Terms & Conditions</label>
                        </div>
                        <textarea
                          value={config.defaultTerms}
                          onChange={(e) => setConfig({...config, defaultTerms: e.target.value})}
                          className="w-full h-24 rounded-xl bg-white p-4 outline-none border border-transparent focus:border-[#000435]/10 focus:bg-white transition-all text-[#000435] text-[10px] font-black leading-relaxed shadow-inner custom-scrollbar"
                          placeholder="Standard billing terms..."
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Status Footer Ribbon */}
              <div className="px-8 py-5 bg-white border-t border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-re-gold animate-pulse" />
                  <p className="text-[8px] font-black text-[#000435] uppercase tracking-widest italic opacity-60">
                    Configuration Engine v1.0 · Integrated Billing
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[8px] font-black uppercase tracking-widest text-[#000435] opacity-40">
                  <span>SSL SECURE</span>
                  <span>ENCRYPTED REPOSITORY</span>
                </div>
              </div>

            </div>
          </div>
          {/* Context Sidebar (1/4 width) */}
          <div className="space-y-6">
            
            {/* Live Preview Insights */}
            <div className="bg-[#000435] rounded-[24px] p-6 text-white shadow-2xl shadow-[#000435]/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700"></div>
              <div className="flex items-center gap-3 mb-5 relative z-10">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <Printer size={16} className="text-re-gold" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest leading-tight">Print Layout<br/><span className="text-re-gold">Insights</span></h3>
              </div>
              <p className="text-[9px] font-bold text-white/50 leading-relaxed italic mb-6 relative z-10">
                "These details are automatically injected into the professional PDF invoice template. Ensure the Institution name reflects your legal registration."
              </p>
              <div className="space-y-2 relative z-10">
                {[
                  { text: 'Optimized for A4 Printing', active: true },
                  { text: 'Dynamic Header Injection', active: true },
                  { text: 'Automated Token Sync', active: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <span className="text-[8px] font-black uppercase tracking-tight text-white/70">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Support Card */}
            <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xl relative overflow-hidden group">
              <div className="absolute bottom-0 right-0 w-20 h-20 bg-re-gold/5 rounded-full -mr-10 -mb-10 group-hover:scale-110 transition-transform duration-700"></div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-re-bg flex items-center justify-center text-re-gold">
                  <Info size={16} />
                </div>
                <h3 className="text-[10px] font-black text-[#000435] uppercase tracking-widest leading-tight">Need Help?</h3>
              </div>
              <p className="text-[8px] font-bold text-[#000435] uppercase tracking-tight leading-relaxed mb-4">
                Consult the Finance Admin guide for help with international bank standards or MoMo integration.
              </p>
              <button className="w-full h-10 rounded-xl bg-white border border-black/5 text-[#000435] font-black text-[8px] uppercase tracking-widest hover:bg-[#000435] hover:text-white transition-all flex items-center justify-center gap-2 group">
                Open Guide
                <ChevronRight size={12} className="opacity-40 group-hover:translate-x-1" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#FEBF10] rounded-[24px] p-6 text-[#000435] shadow-xl shadow-[#FEBF10]/10 border border-white/20">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4">Registry Quick-Link</h3>
               <button 
                onClick={() => navigate('/invoices')}
                className="w-full h-10 rounded-xl bg-[#000435] text-white font-black text-[8px] uppercase tracking-[0.2em] shadow-lg hover:scale-[1.02] active:scale-95 transition-all mb-2"
               >
                View Registry
               </button>
               <p className="text-[7px] font-bold text-[#000435]/60 text-center uppercase tracking-widest">Return to Invoice management</p>
            </div>


          </div>

        </div>
      </div>
    </div>
  );
}
