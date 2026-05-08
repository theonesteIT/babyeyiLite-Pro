import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    Settings, ShieldCheck, ClipboardList, Save, 
    RefreshCw, Loader2, Award, Zap, BookOpen, AlertCircle, CheckCircle
} from 'lucide-react';

export default function DisciplineConfig() {
    const [activeTab, setActiveTab] = useState('conduct'); // 'conduct', 'permissions', 'registry'
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [settings, setSettings] = useState({
        total_marks: 100,
        starting_marks: 100,
        permissions_enabled: true,
        cases_book_status: 'ACTIVE'
    });

    const fetchSettings = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get('/discipline/settings');
            if (res.data.success) {
                setSettings({
                    ...res.data.data,
                    permissions_enabled: !!res.data.data.permissions_enabled
                });
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
            setError('Could not load discipline configurations');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await api.put('/discipline/settings', settings);
            if (res.data.success) {
                setSuccess('Configurations updated successfully');
                setTimeout(() => setSuccess(null), 3000);
            }
        } catch (err) {
            console.error('Failed to save settings:', err);
            setError(err.response?.data?.message || 'Failed to save configurations');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">
            
            {/* ── High-Fidelity Hero Section ── */}
            <div className="relative w-full min-h-[160px] overflow-hidden">
                

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-10 pt-10 pb-12 flex items-center gap-5 text-white">
                    <div className="hidden md:flex shrink-0 w-14 h-14 rounded-xl border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                        <Settings size={28} style={{ color: "#FEBF10" }} className="group-hover:rotate-90 transition-transform duration-700" />
                    </div>

                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-4 h-1 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></span>
                            <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: "#FEBF10" }}>System Control Panel</p>
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-white tracking-tighter leading-none uppercase">
                            Discipline <span style={{ color: "#FEBF10" }}>Configuration</span>
                        </h1>
                        <p className="text-[9px] md:text-[10px] font-bold text-white/50 max-w-lg leading-relaxed uppercase tracking-widest italic opacity-60">
                            Configure school-wide conduct parameters and permission protocols
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Main Interface ── */}
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-10 relative z-20 pb-16">
                <div className="bg-white rounded-t-3xl shadow-2xl border border-black/5 overflow-hidden flex flex-col md:flex-row min-h-[550px]">

                    {/* Left Sidebar Layout */}
                    <div className="w-full md:w-56 lg:w-64 bg-re-bg/30 border-r border-black/5 flex flex-col pt-5 shrink-0 relative">
                        <div className="px-5 mb-4">
                            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#000435]/50 flex items-center gap-1.5">
                                <Award size={12} /> Registry Sections
                            </h3>
                        </div>

                        <div className="flex flex-col space-y-0.5 px-3 mb-6 font-sans">
                            <button 
                                onClick={() => setActiveTab('conduct')}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                                    activeTab === 'conduct' ? 'bg-white shadow-sm text-[#000435] ring-1 ring-black/5' : 'text-re-text-muted hover:text-re-text hover:bg-re-bg'
                                }`}
                            >
                                <Zap size={14} className={activeTab === 'conduct' ? "text-[#FEBF10]" : ""} /> Conduct Scale
                            </button>
                            <button 
                                onClick={() => setActiveTab('permissions')}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                                    activeTab === 'permissions' ? 'bg-white shadow-sm text-[#000435] ring-1 ring-black/5' : 'text-re-text-muted hover:text-re-text hover:bg-re-bg'
                                }`}
                            >
                                <ShieldCheck size={14} className={activeTab === 'permissions' ? "text-[#FEBF10]" : ""} /> Permission Protocols
                            </button>
                            <button 
                                onClick={() => setActiveTab('registry')}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                                    activeTab === 'registry' ? 'bg-white shadow-sm text-[#000435] ring-1 ring-black/5' : 'text-re-text-muted hover:text-re-text hover:bg-re-bg'
                                }`}
                            >
                                <BookOpen size={14} className={activeTab === 'registry' ? "text-[#FEBF10]" : ""} /> Cases Book
                            </button>
                        </div>
                    </div>

                    {/* Right Content Area */}
                    <div className="flex-1 p-6 md:p-10">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                                <Loader2 size={32} className="text-[#FEBF10] animate-spin" />
                                <p className="text-[8px] font-black text-re-text-muted uppercase tracking-widest">Deciphering configurations...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSave} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 max-w-2xl">
                                
                                {error && (
                                    <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600">
                                        <AlertCircle size={16} />
                                        <p className="text-[10px] font-bold uppercase tracking-wide">{error}</p>
                                    </div>
                                )}

                                {success && (
                                    <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
                                        <CheckCircle size={16} />
                                        <p className="text-[10px] font-bold uppercase tracking-wide">{success}</p>
                                    </div>
                                )}
                                {activeTab === 'conduct' && (
                                    <div className="space-y-5">
                                        <div>
                                            <h2 className="text-lg font-black text-[#000435] uppercase tracking-tighter">Conduct Scale</h2>
                                            <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-widest mt-0.5">Manage disciplinary points and starting marks</p>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-5">
                                            {/* Max Scale Cap Input */}
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-[#000435]/60 uppercase tracking-widest ml-1">Maximum Scale Cap</label>
                                                <div className="flex items-center bg-white border border-black/5 rounded-xl overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-[#FEBF10]/30 transition-all">
                                                    <div className="w-1 h-12 bg-[#FEBF10] shrink-0" />
                                                    <div className="px-3 text-[#000435]/30">
                                                        <Award size={16} />
                                                    </div>
                                                    <input 
                                                        type="number" 
                                                        className="flex-1 h-12 bg-transparent outline-none text-xs font-black text-re-text py-1"
                                                        value={settings.total_marks}
                                                        onChange={e => setSettings({...settings, total_marks: e.target.value})}
                                                    />
                                                </div>
                                                <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-wider ml-1 opacity-60">Baseline total conduct points</p>
                                            </div>

                                            {/* Entry Starting Marks Input */}
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-[#000435]/60 uppercase tracking-widest ml-1">Entry Starting Marks</label>
                                                <div className="flex items-center bg-white border border-black/5 rounded-xl overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-[#FEBF10]/30 transition-all">
                                                    <div className="w-1 h-12 bg-[#3B82F6] shrink-0" />
                                                    <div className="px-3 text-[#000435]/30">
                                                        <Zap size={16} />
                                                    </div>
                                                    <input 
                                                        type="number" 
                                                        className="flex-1 h-12 bg-transparent outline-none text-xs font-black text-re-text py-1"
                                                        value={settings.starting_marks}
                                                        onChange={e => setSettings({...settings, starting_marks: e.target.value})}
                                                    />
                                                </div>
                                                <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-wider ml-1 opacity-60">Marks assigned at term commencement</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'permissions' && (
                                    <div className="space-y-5">
                                        <div>
                                            <h2 className="text-lg font-black text-[#000435] uppercase tracking-tighter">Student Permissions</h2>
                                            <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-widest mt-0.5">Manage out-pass and excusal protocols</p>
                                        </div>

                                        <div className="bg-re-bg/50 p-6 rounded-[2rem] border border-black/5 space-y-4">
                                            <div className="flex items-center justify-between group p-5 bg-white rounded-[1.5rem] shadow-sm border border-black/5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${settings.permissions_enabled ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-re-bg text-[#000435]/20'}`}>
                                                        <ShieldCheck size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-[10px] font-black text-[#000435] uppercase tracking-tight">Permissions &amp; Excusals</h3>
                                                        <p className="text-[8px] font-bold text-re-text-muted uppercase tracking-widest">Enable digital out-pass issuance</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => setSettings({...settings, permissions_enabled: !settings.permissions_enabled})}
                                                    className={`w-12 h-6 rounded-full transition-all relative ${settings.permissions_enabled ? 'bg-emerald-500 shadow-inner' : 'bg-white shadow-inner'}`}
                                                >
                                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-md ${settings.permissions_enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'registry' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h2 className="text-lg md:text-xl font-black text-[#000435] uppercase tracking-tighter">Incident Registry</h2>
                                            <p className="text-[10px] font-bold text-re-text-muted uppercase tracking-widest mt-1">Manage disciplinary logging and archival</p>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-[#000435]/60 uppercase tracking-widest ml-1">Registry Mode</label>
                                                <div className="flex items-center bg-white border border-black/5 rounded-xl overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-[#FEBF10]/30 transition-all">
                                                    <div className="w-1 h-12 bg-[#000435] shrink-0" />
                                                    <div className="px-3 text-[#000435]/30">
                                                        <BookOpen size={16} />
                                                    </div>
                                                    <select 
                                                        className="flex-1 h-12 bg-transparent outline-none text-[9px] font-black text-re-text uppercase tracking-widest cursor-pointer pr-4"
                                                        value={settings.cases_book_status}
                                                        onChange={e => setSettings({...settings, cases_book_status: e.target.value})}
                                                    >
                                                        <option value="ACTIVE">ACTIVE - Allow New Logs</option>
                                                        <option value="ARCHIVED">ARCHIVED - Read Only</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-8 border-t border-black/5 flex items-center justify-end">
                                    <button 
                                        type="submit"
                                        disabled={isSaving}
                                        className="h-12 px-8 rounded-xl text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 group overflow-hidden relative"
                                        style={{ background: "linear-gradient(135deg, #000435 0%, #0D2644 100%)" }}
                                    >
                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-[#FEBF10]/20 scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                                        {isSaving ? <Loader2 size={14} className="animate-spin text-[#FEBF10]" /> : <Save size={14} style={{ color: "#FEBF10" }} />}
                                        Save
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
