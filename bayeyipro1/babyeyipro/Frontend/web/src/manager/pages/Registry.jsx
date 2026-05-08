import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Building2, MapPin, GraduationCap, Upload,
    CheckCircle2, Save, Globe, ShieldCheck,
    Smartphone, Mail, School, HardDrive, FileText,
    CheckCircle, BookOpen, Loader2, Home, X, Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import schoolService from '../services/schoolService';

// ── Rwanda Location Data ─────────────────────────────────────────
const RW_LOCATIONS = {
    "Kigali City": {
        Gasabo: {
            Kimironko: ["Bibare"],
            Remera: ["Nyarutarama", "Rukiri 1", "Rukiri 2"],
            Gisozi: ["Bumbogo", "Musezero", "Akamatamu"],
        },
        Nyarugenge: {
            Nyamirambo: ["Cyivugiza", "Rwezamenyo"],
            Gitega: ["Akabahizi", "Akabeza", "Gacyamo"],
        },
    },
    "Southern Province": {
        Ruhango: {
            Byimana: ["Kabgaga"],
            Ruhango: ["Kabuye"],
        },
    },
    "Eastern Province": {
        Kayonza: { Mukarange: ["Mukarange"] },
    },
};

const ACADEMIC_CONSTANTS = {
    CATEGORIES: [
        { id: 'Nursery', label: 'Nursery', levels: ['Baby Class', 'Middle Class', 'Top Class'], icon: BookOpen },
        { id: 'Pre-Primary', label: 'Pre-Primary', levels: ['P1', 'P2', 'P3'], icon: CheckCircle },
        { id: 'Upper Primary', label: 'Upper Primary', levels: ['P4', 'P5', 'P6'], icon: GraduationCap },
        { id: 'O-Level', label: 'O-Level (Secondary)', levels: ['S1', 'S2', 'S3'], icon: ShieldCheck },
        { id: 'A-Level', label: 'A-Level (Secondary)', levels: ['S4', 'S5', 'S6'], icon: Globe }
    ],
    COMBINATIONS: ['PCM', 'PCB', 'MCB', 'MPC', 'MPG', 'MEG', 'HEG', 'HEL', 'LEG', 'LFK', 'LKK', 'TTC']
};

const Registry = () => {
    const { manager, setManager } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    // ── MODAL STATES ──
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const logoInputRef = useRef(null);
    const [isModalSubmitting, setIsModalSubmitting] = useState(false);
    const [newClassData, setNewClassData] = useState({
        category: '',
        group_name: '',
        combination: '',
        stream_name: 'A'
    });

    const [profile, setProfile] = useState({
        school_name: "",
        school_code: "",
        ownership_type: "",
        school_category: "", // Comma-separated
        school_category_arr: [],
        boarding_type: "Day School", // Default
        offered_combinations: "", // Comma-separated
        offered_combinations_arr: [],
        province: "",
        district: "",
        sector: "",
        cell: "",
        email: "",
        phone: "",
        website: "",
        vision: "",
        year_established: ""
    });

    const [groups, setGroups] = useState([]); // Array of { group_name, stream_name, category, combination }

    // ── Mapping Layer ────────────────────────────────────────────────
    const DB_TO_UI = {
        'nursery': 'Nursery',
        'pre_primary': 'Pre-Primary',
        'primary': 'Upper Primary', // Map basic 'primary' to Upper Primary by default
        'o_level': 'O-Level',
        'a_level': 'A-Level'
    };
    const UI_TO_DB = {
        'Nursery': 'nursery',
        'Pre-Primary': 'pre_primary',
        'Upper Primary': 'primary',
        'O-Level': 'o_level',
        'A-Level': 'a_level'
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!manager?.school_id) return;
            try {
                const [profRes, groupsRes] = await Promise.all([
                    schoolService.getProfile(manager.school_id),
                    schoolService.getGroups(manager.school_id)
                ]);

                if (profRes.success) {
                    const d = profRes.data;

                    // 1. Handle Categories (From both school_category and education_levels)
                    let catArr = [];
                    const rawCats = d.school_category ? d.school_category.split(',').map(s => s.trim()) : [];
                    const legacyCats = Array.isArray(d.education_levels) ? d.education_levels : [];

                    // Merge and Map to UI IDs
                    const merged = new Set([...rawCats, ...legacyCats.map(lc => DB_TO_UI[lc] || lc)]);
                    catArr = Array.from(merged).filter(Boolean);

                    // 2. Handle Combinations
                    let comboArr = [];
                    let comboRaw = d.a_level_combinations || d.offered_combinations;

                    // NEW: Explicitly handle JSON string from DB
                    if (typeof comboRaw === 'string' && comboRaw.trim().startsWith('[')) {
                        try { comboRaw = JSON.parse(comboRaw); } catch (_) { }
                    }

                    if (Array.isArray(comboRaw)) comboArr = comboRaw;
                    else if (typeof comboRaw === 'string' && comboRaw) comboArr = comboRaw.split(',').map(s => s.trim());

                    setProfile({
                        ...d,
                        school_category: catArr.join(','),
                        school_category_arr: catArr,
                        ownership_type: d.ownership_type || d.ownership || "",
                        boarding_type: d.boarding_type || "Day School",
                        offered_combinations_arr: comboArr,
                        offered_combinations: comboArr.join(','),
                        vision: d.vision || ""
                    });
                }
                if (groupsRes.success) {
                    // Normalize group rooms for UI matching
                    const normalizedGroups = (groupsRes.data || []).map(g => {
                        let finalCombo = g.combination;
                        // Handle potential JSON string from DB
                        if (typeof finalCombo === 'string' && finalCombo.trim().startsWith('[')) {
                            try { finalCombo = JSON.parse(finalCombo); } catch (_) { }
                        }

                        return {
                            ...g,
                            category: DB_TO_UI[g.category] || g.category,
                            combination: finalCombo
                        };
                    });
                    setGroups(normalizedGroups);
                }
            } catch (err) {
                console.error("Failed to fetch registry data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [manager]);

    const toggleCategory = (catId) => {
        setProfile(prev => {
            const has = prev.school_category_arr.includes(catId);
            const nextArr = has
                ? prev.school_category_arr.filter(c => c !== catId)
                : [...prev.school_category_arr, catId];

            if (!has) {
                // Removed auto-initialization of generic levels
                // Users now add classes manually via the modal for precision control
            }
            return { ...prev, school_category_arr: nextArr, school_category: nextArr.join(',') };
        });
    };

    const toggleCombination = (comb) => {
        setProfile(prev => {
            const has = prev.offered_combinations_arr.includes(comb);
            const nextArr = has ? prev.offered_combinations_arr.filter(c => c !== comb) : [...prev.offered_combinations_arr, comb];
            return { ...prev, offered_combinations_arr: nextArr, offered_combinations: nextArr.join(',') };
        });
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingLogo(true);
        try {
            const result = await schoolService.uploadMedia(manager.school_id, 'logo', file);
            if (result.success) {
                setProfile(prev => ({ ...prev, logo_url: result.logo_url }));
                // Update AuthContext so Sidebar/Header reflect the new logo immediately
                if (manager?.school) {
                    setManager({
                        ...manager,
                        school: { ...manager.school, logo_url: result.logo_url }
                    });
                }
            }
        } catch (error) {
            console.error('Logo upload failed:', error);
            alert("Failed to upload logo. Please try again.");
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSave = async (specificGroups = null) => {
        if (!manager?.school_id) return;
        setSaving(true);
        try {
            // Hardened check: Ensure targetGroups is always the groups array
            // even if a React Event object is passed as the first argument
            const targetGroups = Array.isArray(specificGroups) ? specificGroups : groups;

            // Prepare data for save
            const saveProfile = {
                ...profile,
                education_levels: profile.school_category_arr.map(id => UI_TO_DB[id] || id)
            };

            const saveGroups = targetGroups.map(g => ({
                ...g,
                category: UI_TO_DB[g.category] || g.category
            }));

            await Promise.all([
                schoolService.updateProfile(manager.school_id, saveProfile),
                schoolService.updateGroups(manager.school_id, saveGroups)
            ]);
            return true;
        } catch (err) {
            console.error("Failed to update registry:", err);
            return false;
        } finally {
            setTimeout(() => setSaving(false), 800);
        }
    };

    const addClass = () => {
        if (!newClass.name || !newClass.category) return;
        const streams = newClass.streams.split(',').map(s => s.trim()).filter(Boolean);
        const newGroups = streams.length > 0
            ? streams.map(s => ({
                group_name: newClass.name,
                stream_name: s,
                category: newClass.category,
                combination: newClass.combination || null
            }))
            : [{
                group_name: newClass.name,
                stream_name: 'GEN',
                category: newClass.category,
                combination: newClass.combination || null
            }];

        setGroups([...groups, ...newGroups]);
        setNewClass({ name: '', streams: '', category: '', combination: '' });
    };

    const removeGroup = async (idx) => {
        const updatedGroups = groups.filter((_, i) => i !== idx);
        // Instant sync on removal
        const success = await handleSave(updatedGroups);
        if (success) {
            setGroups(updatedGroups);
        }
    };

    const navItems = [
        { id: 'profile', label: 'Basic Profile', icon: Building2 },
        { id: 'location', label: 'Location Info', icon: MapPin },
        { id: 'governance', label: 'Governance', icon: ShieldCheck },
        { id: 'academic', label: 'Academic Config', icon: GraduationCap },
        { id: 'assets', label: 'Admin Assets', icon: FileText },
    ];

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">

            {/* ── Hero Section ── */}
            <div className="relative w-full min-h-[220px] overflow-hidden bg-[#c87800]">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-12 pb-16 flex items-center gap-6">
                    <div className="hidden md:flex shrink-0 w-20 h-20 rounded-3xl border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FEBF10]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <School size={40} style={{ color: "#FEBF10" }} className="group-hover:scale-110 transition-transform duration-500" />
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="w-5 h-1 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></span>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "#FEBF10" }}>App Configuration</p>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight leading-none mb-1.5 uppercase" style={{ fontFamily: "'Montserrat', sans-serif" }}>School Profile</h1>
                        <p className="text-[10px] md:text-xs font-medium text-white/60 max-w-lg leading-relaxed uppercase tracking-widest italic">Configure institutional identity, location and academic structure</p>
                    </div>
                </div>
            </div>

            {/* ── Main Console ── */}
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-16 relative z-20 pb-16">
                {loading ? (
                    <div className="bg-white rounded-3xl shadow-2xl border border-black/5 flex items-center justify-center min-h-[500px]">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin text-[#FEBF10]" size={40} />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1E3A5F]">Synchronizing Registry...</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-t-3xl shadow-2xl border border-black/5 overflow-hidden flex flex-col md:flex-row min-h-[500px]">

                        {/* Left Sidebar Nav */}
                        <div className="w-full md:w-56 lg:w-64 bg-re-bg/30 border-r border-black/5 flex flex-col pt-5 shrink-0 relative">
                            <div className="px-5 mb-4">
                                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1E3A5F]/50 flex items-center gap-1.5">
                                    <HardDrive size={12} /> Profile Menu
                                </h3>
                            </div>

                            <div className="flex flex-col space-y-0.5 px-3 mb-6">
                                {navItems.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id
                                                ? 'bg-white shadow-sm text-[#1E3A5F] ring-1 ring-black/5'
                                                : 'text-re-text-muted hover:text-re-text hover:bg-re-bg'
                                            }`}
                                    >
                                        <item.icon size={14} className={activeTab === item.id ? "text-[#FEBF10]" : ""} />
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            {/* Status Card */}
                            <div className="px-5 mt-auto pb-6 hidden md:block">
                                <div className="bg-[#1E3A5F] p-4 rounded-2xl text-white relative overflow-hidden shadow-2xl">
                                    <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-[#FEBF10]/20 rounded-full blur-2xl"></div>
                                    <div className="relative z-10">
                                        <ShieldCheck size={18} style={{ color: "#FEBF10" }} className="mb-2" />
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Registry Status</p>
                                        <p className="text-[11px] font-black uppercase tracking-tight mt-1 text-emerald-400">Verified ✓</p>
                                        <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest mt-0.5">NESA Certified 2024</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Content Panel */}
                        <div className="flex-1 p-5 md:p-8 animate-in fade-in zoom-in-95 duration-300 overflow-y-auto">

                            {/* ── TAB: BASIC PROFILE ── */}
                            {activeTab === 'profile' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg md:text-xl font-black text-[#1E3A5F] uppercase tracking-tighter">Identity & Contact</h2>
                                            <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-widest mt-1">Core institutional information</p>
                                        </div>
                                        <button
                                            onClick={handleSave}
                                            className="h-9 px-4 rounded-xl flex items-center justify-center gap-1.5 text-white font-black text-[9px] uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all"
                                            style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                                        >
                                            {saving ? <CheckCircle size={14} style={{ color: "#FEBF10" }} /> : <Save size={14} style={{ color: "#FEBF10" }} />}
                                            {saving ? 'Saved!' : 'Save Profile'}
                                        </button>
                                    </div>

                                    {/* Logo Upload + School Name Banner */}
                                    <div className="flex items-center gap-5 p-5 bg-re-bg/30 rounded-2xl border border-black/5">
                                        <div
                                            onClick={() => logoInputRef.current?.click()}
                                            className="w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-[#1E3A5F]/20 flex flex-col items-center justify-center relative group cursor-pointer overflow-hidden shrink-0 shadow-inner"
                                        >
                                            <input
                                                type="file"
                                                ref={logoInputRef}
                                                onChange={handleLogoUpload}
                                                hidden
                                                accept="image/*"
                                            />
                                            {profile.logo_url ? (
                                                <img src={(import.meta.env.VITE_API_URL || 'http://localhost:5100') + profile.logo_url} className="w-full h-full object-cover" alt="Logo" />
                                            ) : (
                                                <School className="text-[#1E3A5F]/20 group-hover:scale-110 transition-transform duration-500" size={24} />
                                            )}
                                            <div className={`absolute inset-0 bg-[#1E3A5F]/40 flex items-center justify-center transition-opacity ${uploadingLogo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                {uploadingLogo ? <Loader2 className="text-white animate-spin" size={16} /> : <Upload className="text-white" size={16} />}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-[#1E3A5F] tracking-tight uppercase">{profile.school_name}</h3>
                                            <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-widest mt-0.5">Code: {profile.school_code}</p>
                                            <p className="text-[8px] text-re-text-muted uppercase tracking-widest mt-1 opacity-50">Click logo to update</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField label="Official School Name" name="school_name" value={profile.school_name} onChange={handleChange} icon={Building2} />
                                        <FormField label="National School Code" name="school_code" value={profile.school_code} onChange={handleChange} icon={ShieldCheck} />
                                        <FormField label="Phone Contact" name="phone" value={profile.phone} onChange={handleChange} icon={Smartphone} />
                                        <FormField label="Official Email" name="email" value={profile.email} onChange={handleChange} icon={Mail} />
                                        <FormField label="Website" name="website" value={profile.website} onChange={handleChange} icon={Globe} className="md:col-span-2" />
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black uppercase text-[#1E3A5F]/50 tracking-widest">Vision / Mission Message</p>
                                        <textarea
                                            name="vision"
                                            className="w-full p-4 bg-re-bg border border-transparent rounded-2xl text-sm font-bold text-re-text outline-none focus:bg-white focus:border-[#1E3A5F]/20 transition-all shadow-inner h-24"
                                            value={profile.vision || ""}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ── TAB: LOCATION ── */}
                            {activeTab === 'location' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                    <div>
                                        <h2 className="text-lg md:text-xl font-black text-[#1E3A5F] uppercase tracking-tighter">Geographic Coordinates</h2>
                                        <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-widest mt-1">Official administrative address</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <SelectFormField label="Province" name="province" options={Object.keys(RW_LOCATIONS)} value={profile.province} onChange={handleChange} />
                                        <SelectFormField label="District" name="district" options={Object.keys(RW_LOCATIONS[profile.province] || {})} value={profile.district} onChange={handleChange} />
                                        <SelectFormField label="Sector" name="sector" options={Object.keys(RW_LOCATIONS[profile.province]?.[profile.district] || {})} value={profile.sector} onChange={handleChange} />
                                        <SelectFormField label="Cell" name="cell" options={RW_LOCATIONS[profile.province]?.[profile.district]?.[profile.sector] || []} value={profile.cell} onChange={handleChange} />
                                    </div>
                                    <div className="flex justify-end">
                                        <button onClick={handleSave} className="h-10 px-6 rounded-xl flex items-center justify-center gap-2 text-white font-black text-[9px] uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all" style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}>
                                            <Save size={14} /> Save Location
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── TAB: GOVERNANCE (Compact & Professional) ── */}
                            {activeTab === 'governance' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-12">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <h2 className="text-base md:text-lg font-black text-[#1E3A5F] uppercase tracking-tighter">Institutional Framework</h2>
                                            <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-widest opacity-60">Legal status and operational format</p>
                                        </div>
                                        <button
                                            onClick={handleSave}
                                            className="h-9 px-5 rounded-xl flex items-center justify-center gap-2 text-white font-black text-[8px] uppercase tracking-widest shadow-lg hover:bg-[#FEBF10] hover:text-[#1E3A5F] transition-all"
                                            style={{ background: !saving ? "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" : "#FEBF10" }}
                                        >
                                            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                            {saving ? 'Saving...' : 'Save Configuration'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Column 1: Ownership & Format */}
                                        <div className="space-y-6">
                                            <div className="space-y-3">
                                                <p className="text-[9px] font-black uppercase text-[#1E3A5F] tracking-widest flex items-center gap-2">
                                                    <ShieldCheck size={12} className="text-[#FEBF10]" /> School Ownership
                                                </p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {["Public", "Government-Aided", "Private", "Faith-Based"].map(type => (
                                                        <button
                                                            key={type}
                                                            onClick={() => setProfile(p => ({ ...p, ownership_type: type }))}
                                                            className={`p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all text-center ${profile.ownership_type === type
                                                                    ? 'bg-[#1E3A5F] text-[#FEBF10] border-transparent shadow-md'
                                                                    : 'bg-white text-re-text-muted border-black/[0.05] hover:border-[#1E3A5F]/20'
                                                                }`}
                                                        >
                                                            {type}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <p className="text-[9px] font-black uppercase text-[#1E3A5F] tracking-widest flex items-center gap-2">
                                                    <Home size={12} className="text-[#FEBF10]" /> Educational Format
                                                </p>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {["Day School", "Boarding School", "Mixed"].map(format => (
                                                        <button
                                                            key={format}
                                                            onClick={() => setProfile(p => ({ ...p, boarding_type: format }))}
                                                            className={`p-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all text-center ${profile.boarding_type === format
                                                                    ? 'bg-[#1E3A5F] text-[#FEBF10] border-transparent shadow-md'
                                                                    : 'bg-white text-re-text-muted border-black/[0.05] hover:border-[#1E3A5F]/20'
                                                                }`}
                                                        >
                                                            {format}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Column 2: Educational Category */}
                                        <div className="space-y-3">
                                            <p className="text-[9px] font-black uppercase text-[#1E3A5F] tracking-widest flex items-center gap-2">
                                                <GraduationCap size={12} className="text-[#FEBF10]" /> Educational Departments
                                            </p>
                                            <div className="grid grid-cols-1 gap-1.5">
                                                {ACADEMIC_CONSTANTS.CATEGORIES.map((card) => {
                                                    const isSelected = profile.school_category_arr.includes(card.id);
                                                    return (
                                                        <button
                                                            key={card.id}
                                                            onClick={() => toggleCategory(card.id)}
                                                            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${isSelected
                                                                    ? 'bg-[#1E3A5F]/5 border-[#FEBF10] text-[#1E3A5F]'
                                                                    : 'bg-white border-black/[0.05] text-re-text-muted opacity-60'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? 'bg-[#FEBF10] text-[#1E3A5F]' : 'bg-re-bg text-re-text-muted opacity-40'}`}>
                                                                    <card.icon size={14} />
                                                                </div>
                                                                <div className="text-left">
                                                                    <p className="text-[9px] font-black uppercase tracking-widest">{card.label}</p>
                                                                    <p className="text-[7px] font-bold opacity-50 uppercase tracking-tighter">
                                                                        {card.id === 'A-Level' ? 'S4-S6' : card.id === 'O-Level' ? 'S1-S3' : 'GEN'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {isSelected && <CheckCircle size={12} className="text-[#FEBF10]" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section: Combinations */}
                                    {profile.school_category_arr.includes('A-Level') && (
                                        <div className="bg-re-bg/20 rounded-3xl p-6 border border-black/[0.03] space-y-4 animate-in zoom-in-95 duration-500">
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-black uppercase text-[#1E3A5F] tracking-widest flex items-center gap-2">
                                                    <BookOpen size={12} className="text-[#FEBF10]" /> Offered Combinations
                                                </p>
                                                <p className="text-[8px] font-bold text-re-text-muted uppercase tracking-widest opacity-60">Select advanced level programs</p>
                                            </div>

                                            <div className="flex flex-wrap gap-1.5">
                                                {ACADEMIC_CONSTANTS.COMBINATIONS.map(comb => {
                                                    const isSelected = profile.offered_combinations_arr.includes(comb);
                                                    return (
                                                        <button
                                                            key={comb}
                                                            onClick={() => toggleCombination(comb)}
                                                            className={`px-3 py-2 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${isSelected
                                                                    ? 'bg-[#FEBF10] text-[#1E3A5F] border-transparent shadow-sm'
                                                                    : 'bg-white text-re-text-muted border-black/5 hover:border-[#1E3A5F]/20'
                                                                }`}
                                                        >
                                                            {comb}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── TAB: ACADEMIC CONFIG (Simplified & Linked) ── */}
                            {activeTab === 'academic' && (
                                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h2 className="text-lg md:text-xl font-black text-[#1E3A5F] uppercase tracking-tighter">Academic Architecture</h2>
                                            <p className="text-[10px] font-bold text-re-text-muted uppercase tracking-widest opacity-60">Manage classes and room assignments</p>
                                        </div>
                                        <button
                                            onClick={handleSave}
                                            className="h-10 px-6 rounded-xl flex items-center justify-center gap-2 text-white font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-[#FEBF10] hover:text-[#1E3A5F] transition-all"
                                            style={{ background: !saving ? "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" : "#FEBF10" }}
                                        >
                                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                            {saving ? 'Saving...' : 'Save Architecture'}
                                        </button>
                                    </div>

                                    {/* ── GLOBAL ACTION BAR ── */}
                                    <div className="flex items-center justify-between p-6 bg-white border-b border-black/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-[#1E3A5F] flex items-center justify-center text-[#FEBF10] shadow-lg shadow-[#1E3A5F]/10">
                                                <GraduationCap size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black text-[#1E3A5F] uppercase tracking-widest leading-none">Academic Architect</h3>
                                                <p className="text-[7px] font-bold text-re-text-muted uppercase tracking-widest mt-1.5 opacity-60">Deploy new classes across all departments</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setNewClassData({ category: '', group_name: '', combination: '', stream_name: 'A' });
                                                setIsAddModalOpen(true);
                                            }}
                                            className="h-11 px-8 bg-re-bg border border-black/5 text-[#1E3A5F] rounded-xl font-black text-[9px] uppercase tracking-[0.2em] shadow-sm hover:bg-[#FEBF10] hover:border-transparent transition-all flex items-center gap-2 group"
                                        >
                                            <Plus size={14} className="group-hover:rotate-90 transition-transform" /> Add New Class
                                        </button>
                                    </div>
                                    {isAddModalOpen && createPortal(
                                        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                                            <div className="absolute inset-0 bg-[#1E3A5F]/60 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => setIsAddModalOpen(false)} />
                                            <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-[0_32px_128px_-15px_rgba(30,58,95,0.4)] border border-white/20 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-500">
                                                {/* Header */}
                                                <div className="bg-[#1E3A5F] px-6 py-5 flex items-center justify-between text-white shrink-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 text-[#FEBF10]">
                                                            <School size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-[#FEBF10] leading-none">Class Configuration</p>
                                                            <p className="text-[7px] font-bold opacity-40 uppercase tracking-tight mt-1">{newClassData.category || 'All'} Department</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-[#FEBF10]">
                                                        <X size={16} />
                                                    </button>
                                                </div>

                                                {/* Body */}
                                                <div className="p-8 space-y-6">
                                                    <div className="space-y-4">
                                                        {!newClassData.category && (
                                                            <div className="space-y-1.5">
                                                                <p className="text-[8px] font-black uppercase text-[#1E3A5F]/30 tracking-widest ml-1">Department</p>
                                                                <select
                                                                    value={newClassData.category}
                                                                    onChange={(e) => setNewClassData({ ...newClassData, category: e.target.value, group_name: '' })}
                                                                    className="w-full h-11 bg-re-bg/50 border border-black/5 rounded-xl px-4 text-[11px] font-black uppercase outline-none focus:ring-1 ring-[#1E3A5F]/10 transition-all"
                                                                >
                                                                    <option value="">Select Department...</option>
                                                                    {profile.school_category_arr.map(c => <option key={c} value={c}>{c}</option>)}
                                                                </select>
                                                            </div>
                                                        )}

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-1.5">
                                                                <p className="text-[8px] font-black uppercase text-[#1E3A5F]/30 tracking-widest ml-1">Class Name</p>
                                                                <select
                                                                    value={newClassData.group_name}
                                                                    onChange={(e) => setNewClassData({ ...newClassData, group_name: e.target.value })}
                                                                    className="w-full h-11 bg-re-bg/50 border border-black/5 rounded-xl px-4 text-[11px] font-black uppercase outline-none focus:ring-1 ring-[#1E3A5F]/10 transition-all"
                                                                >
                                                                    <option value="">SELECT...</option>
                                                                    {ACADEMIC_CONSTANTS.CATEGORIES.find(c => c.id === newClassData.category)?.levels.map(lvl => (
                                                                        <option key={lvl} value={lvl}>{lvl}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <p className="text-[8px] font-black uppercase text-[#1E3A5F]/30 tracking-widest ml-1">Room Name</p>
                                                                <input
                                                                    type="text"
                                                                    placeholder="e.g. A"
                                                                    value={newClassData.stream_name}
                                                                    onChange={(e) => setNewClassData({ ...newClassData, stream_name: e.target.value })}
                                                                    className="w-full h-11 bg-re-bg/50 border border-black/5 rounded-xl px-4 text-[11px] font-bold text-[#1E3A5F] outline-none focus:ring-1 ring-[#1E3A5F]/10 transition-all uppercase"
                                                                />
                                                            </div>
                                                        </div>

                                                        {newClassData.category === 'A-Level' && (
                                                            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                                                                <p className="text-[8px] font-black uppercase text-[#1E3A5F]/30 tracking-widest ml-1">Academic Specialty</p>
                                                                <select
                                                                    value={newClassData.combination}
                                                                    onChange={(e) => setNewClassData({ ...newClassData, combination: e.target.value })}
                                                                    className="w-full h-11 bg-re-bg/50 border border-black/5 rounded-xl px-4 text-[11px] font-black uppercase outline-none focus:ring-1 ring-[#1E3A5F]/10 transition-all appearance-none"
                                                                >
                                                                    <option value="">SELECT SPECIALTY...</option>
                                                                    <option value="GENERAL">GENERAL / COMMON</option>
                                                                    {profile.offered_combinations_arr?.map(combo => (
                                                                        <option key={combo} value={combo}>{combo}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={async () => {
                                                            if (!newClassData.group_name || !newClassData.category || !newClassData.stream_name) return;

                                                            setIsModalSubmitting(true);
                                                            const updatedGroups = [...groups, {
                                                                group_name: newClassData.group_name.toUpperCase(),
                                                                stream_name: newClassData.stream_name.toUpperCase(),
                                                                category: newClassData.category,
                                                                combination: newClassData.combination ? newClassData.combination.toUpperCase() : null
                                                            }];

                                                            const success = await handleSave(updatedGroups);
                                                            if (success) {
                                                                setGroups(updatedGroups);
                                                                setIsAddModalOpen(false);
                                                            }
                                                            setIsModalSubmitting(false);
                                                        }}
                                                        disabled={isModalSubmitting}
                                                        className="w-full h-12 bg-[#1E3A5F] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#1E3A5F]/10 hover:bg-[#FEBF10] hover:text-[#1E3A5F] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        {isModalSubmitting ? (
                                                            <Loader2 className="animate-spin" size={16} />
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 size={16} /> Finalize Configuration
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>,
                                        document.body
                                    )}

                                    {/* Grouped List */}
                                    <div className="space-y-10">
                                        {profile.school_category_arr.map(cat => {
                                            const catGroups = groups.filter(g => g.category === cat);

                                            // For O-Level/Primary, unique key is just group_name
                                            // For A-Level, unique key is group_name + combo to create distinct cards
                                            const getGroupKey = (g) => cat === 'A-Level' ? `${g.group_name}|${g.combination || ''}` : g.group_name;

                                            const uniqueGroupKeys = [...new Set(catGroups.map(getGroupKey))];

                                            return (
                                                <div key={cat} className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1 h-3.5 bg-[#FEBF10] rounded-full"></div>
                                                            <h3 className="text-[10px] font-black text-[#1E3A5F] uppercase tracking-widest">{cat} Department</h3>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setNewClassData({ category: cat, group_name: '', combination: '' });
                                                                setIsAddModalOpen(true);
                                                            }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E3A5F] text-white hover:bg-[#FEBF10] hover:text-[#1E3A5F] transition-all shadow-sm group"
                                                        >
                                                            <School size={10} className="group-hover:rotate-12 transition-transform" />
                                                            <span className="text-[8px] font-black uppercase tracking-tighter">
                                                                Add Class
                                                            </span>
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {uniqueGroupKeys.map(key => {
                                                            const keyParts = key.split('|');
                                                            const gName = keyParts[0];
                                                            const gCombo = keyParts[1] || null;

                                                            const classRooms = catGroups.filter(g =>
                                                                g.group_name === gName && (cat === 'A-Level' ? (g.combination || '') === (gCombo || '') : true)
                                                            );

                                                            const displayTitle = cat === 'A-Level' ? `${gName} ${gCombo || ''}` : gName;

                                                            return (
                                                                <div key={key} className="bg-white rounded-2xl border border-black/[0.05] p-3 flex flex-col gap-3 hover:border-[#FEBF10]/30 transition-all shadow-sm">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-tighter">{displayTitle}</p>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[7px] font-black text-re-text-muted bg-re-bg px-2 py-0.5 rounded-full uppercase">{classRooms.length} ROOMS</span>
                                                                            <button
                                                                                onClick={async () => {
                                                                                    const sName = prompt(`New room for ${displayTitle}:`, "");
                                                                                    if (sName) {
                                                                                        const updatedGroups = [...groups, {
                                                                                            group_name: gName,
                                                                                            stream_name: sName.toUpperCase(),
                                                                                            category: cat,
                                                                                            combination: gCombo
                                                                                        }];

                                                                                        // Real-time Save for Room Addition
                                                                                        const success = await handleSave(updatedGroups);
                                                                                        if (success) {
                                                                                            setGroups(updatedGroups);
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="w-5 h-5 rounded-md bg-re-bg flex items-center justify-center text-[#1E3A5F] hover:bg-[#FEBF10] transition-colors"
                                                                            >
                                                                                <Upload size={10} className="rotate-180" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {classRooms.map((r, rIdx) => (
                                                                            <div key={rIdx} className="group/room relative">
                                                                                <span className="inline-flex min-w-[2.2rem] h-8 items-center justify-center bg-re-bg/50 rounded-lg border border-transparent px-2">
                                                                                    <p className="text-[8px] font-black text-[#1E3A5F]">{r.stream_name}</p>
                                                                                </span>
                                                                                <button
                                                                                    onClick={() => removeGroup(groups.indexOf(r))}
                                                                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/room:opacity-100 transition-all border-2 border-white"
                                                                                >
                                                                                    <CheckCircle size={8} className="rotate-45" />
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── TAB: ADMIN ASSETS ── */}
                            {activeTab === 'assets' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                    <div>
                                        <h2 className="text-lg md:text-xl font-black text-[#1E3A5F] uppercase tracking-tighter">Administrative Assets</h2>
                                        <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-widest mt-1">Upload official stamps, signatures and documents</p>
                                    </div>

                                    <div className="space-y-3">
                                        {[
                                            { name: "Official Digital Stamp", status: "Uploaded", desc: "Used on official communications and reports", key: 'school_stamp_url' },
                                            { name: "Director's Signature", status: profile.head_signature_url ? "Uploaded" : "Not Set", desc: "Added to certificates and NESA submissions", key: 'head_signature_url' },
                                            { name: "School Logo (High Res)", status: profile.logo_url ? "Uploaded" : "Not Set", desc: "PNG format, minimum 512x512 px", key: 'logo_url' },
                                        ].map((asset, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-white border border-black/5 shadow-sm rounded-2xl group hover:border-[#1E3A5F]/20 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${asset.status === 'Uploaded' ? 'bg-emerald-50 text-emerald-600' : 'bg-re-bg text-re-text-muted'}`}>
                                                        {asset.status === 'Uploaded' ? <CheckCircle size={18} /> : <Upload size={18} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-[#1E3A5F] uppercase tracking-tight">{asset.name}</p>
                                                        <p className="text-[8px] font-bold text-re-text-muted uppercase tracking-widest mt-0.5">{asset.desc}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${asset.status === 'Uploaded' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-amber-600 bg-amber-50 border border-amber-100'}`}>
                                                        {asset.status}
                                                    </span>
                                                    <button className="h-8 px-4 rounded-lg border border-black/5 text-[#1E3A5F] font-black text-[9px] uppercase tracking-widest hover:bg-[#1E3A5F] hover:text-[#FEBF10] hover:border-transparent transition-colors shadow-sm bg-re-bg">
                                                        {asset.status === 'Uploaded' ? 'Replace' : 'Upload'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Sub-components ────────────────────────────────────────────────
const FormField = ({ label, name, value, onChange, icon: Icon, className = "" }) => (
    <div className={`space-y-2 ${className}`}>
        <p className="text-[9px] font-black uppercase text-[#1E3A5F]/50 tracking-[0.2em] pl-1">{label}</p>
        <div className="relative group">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#1E3A5F]/30 group-focus-within:text-[#FEBF10] transition-colors pointer-events-none">
                <Icon size={13} />
            </span>
            <input
                type="text"
                name={name}
                value={value || ""}
                onChange={onChange}
                className="w-full h-11 bg-re-bg/50 border border-transparent rounded-lg pl-9 pr-4 font-black text-xs uppercase tracking-widest text-[#1E3A5F] placeholder:text-[#1E3A5F]/30 focus:border-[#1E3A5F]/30 focus:bg-white outline-none transition-all shadow-inner focus:shadow-none focus:ring-2 focus:ring-[#1E3A5F]/5"
            />
        </div>
    </div>
);

const SelectFormField = ({ label, name, options, value, onChange }) => (
    <div className="space-y-2">
        <p className="text-[9px] font-black uppercase text-[#1E3A5F]/50 tracking-[0.2em] pl-1">{label}</p>
        <div className="relative">
            <select
                name={name}
                value={value || ""}
                onChange={onChange}
                className="w-full h-11 bg-re-bg/50 border border-transparent rounded-lg px-4 font-black text-xs uppercase tracking-widest text-[#1E3A5F] focus:border-[#1E3A5F]/30 focus:bg-white outline-none appearance-none transition-all cursor-pointer shadow-inner focus:shadow-none"
            >
                <option value="" disabled>Select {label}</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1L5 5L9 1" stroke="#1E3A5F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </div>
    </div>
);

export default Registry;
