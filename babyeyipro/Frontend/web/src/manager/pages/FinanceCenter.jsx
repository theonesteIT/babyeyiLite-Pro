import React, { useState } from 'react';
import { 
  CircleDollarSign, TrendingUp, Wallet, Banknote, 
  CreditCard, PieChart, BarChart3, Plus, 
  X, ShieldCheck, AlertCircle, CheckCircle2,
  Building2, Save, Download, ArrowUpRight,
  TrendingDown, ArrowRight, Activity
} from 'lucide-react';

const FinanceCenter = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [saving, setSaving] = useState(false);
    const [fees, setFees] = useState([
        { id: 1, name: 'Tuition Fee', amount: 45000 },
        { id: 2, name: 'Insurance & Medical', amount: 5000 },
        { id: 3, name: 'Material & Books', amount: 15000 },
    ]);
    const [banks, setBanks] = useState([
        { id: 1, bankName: 'Bank of Kigali (BK)', accountNumber: '000160114800300', accountName: 'ROYAL ACADEMY REVENUE', primary: true },
        { id: 2, bankName: 'BPR Bank Rwanda', accountNumber: '400892211002390', accountName: 'ROYAL ACADEMY OPERATIONS', primary: false },
    ]);

    const nesaLimit = 75000;
    const totalFees = fees.reduce((acc, curr) => acc + curr.amount, 0);
    const exceedsLimit = totalFees > nesaLimit;

    const handleSave = () => {
        setSaving(true);
        setTimeout(() => setSaving(false), 1500);
    };

    const addFeeRow = () => {
        setFees([...fees, { id: Date.now(), name: '', amount: 0 }]);
    };

    const removeFeeRow = (id) => {
        setFees(fees.filter(f => f.id !== id));
    };

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">
            
            {/* ── HERO SECTION (Teacher Portal Pattern) ────────────────────────── */}
            <section className="relative p-7 md:p-12 text-white overflow-hidden min-h-[260px] flex items-center">
                <div className="absolute inset-0 z-0">
                    <img src="/teacher.jpg" className="w-full h-full object-cover shadow-2xl brightness-[0.4]" alt="School building" />
                    <div className="absolute inset-0 bg-re-navy/60 backdrop-blur-[2px]"></div>
                </div>

                <div className="relative z-10 max-w-4xl space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-re-gold/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-re-gold/30">
                            <Wallet className="text-re-gold" size={24} />
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black tracking-tight">
                           Financial Command Center
                        </h1>
                    </div>
                    <p className="text-sm md:text-lg font-bold opacity-80 max-w-2xl leading-relaxed">
                        Manage your school's revenue, set compliant fee structures, and monitor settlement accounts in one unified administrative OS.
                    </p>
                </div>

                {/* Decorative Pattern */}
                <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-re-gold/10 rounded-full blur-3xl" />
            </section>

            {/* ── MAIN CONTENT (Teacher Portal Pattern: -mt-10) ────────────────── */}
            <div className="max-w-[1400px] mx-auto px-5 md:px-10 -mt-10 relative z-20 pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left & Middle: Main Management Modules */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* UNIFIED STATS GRID (Teacher Portal Pattern) */}
                        <div className="bg-white rounded-[32px] shadow-2xl border border-black/5 overflow-hidden grid grid-cols-2 md:grid-cols-4">
                            <DashboardStat label="Total Collected" value="42.5M" icon={TrendingUp} color="emerald" border="r" />
                            <DashboardStat label="Outstanding" value="8.1M" icon={TrendingDown} color="orange" border="md:r" />
                            <DashboardStat label="Current Fees" value={`${(totalFees/1000).toFixed(1)}k`} icon={ShieldCheck} color={exceedsLimit ? "orange" : "gold"} border="r" />
                            <DashboardStat label="Compliance" value={exceedsLimit ? "78%" : "100%"} icon={CheckCircle2} color={exceedsLimit ? "orange" : "emerald"} />
                        </div>

                        {/* TABS NAVIGATION */}
                        <div className="flex gap-2 p-1.5 bg-white/60 backdrop-blur-md rounded-2xl border border-black/5 w-fit shadow-sm">
                            {[
                                { id: 'overview', name: 'Revenue', icon: PieChart },
                                { id: 'fees', name: 'Fee Setup', icon: Banknote },
                                { id: 'banks', name: 'Banks', icon: CreditCard },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
                                        activeTab === tab.id 
                                        ? 'bg-re-grad-navy text-white shadow-re-premium-navy' 
                                        : 'text-re-text-muted hover:bg-white hover:text-re-navy'
                                    }`}
                                >
                                    <tab.icon size={14} />
                                    {tab.name}
                                </button>
                            ))}
                        </div>

                        {/* DYNAMIC CONTENT VIEWS */}
                        <div className="space-y-6">
                            {activeTab === 'overview' && (
                                <div className="bg-white p-8 rounded-[32px] shadow-2xl border border-black/5 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="flex items-center justify-between">
                                        <SectionTitle title="Weekly Inflow Analysis" />
                                        <div className="flex gap-2">
                                            <button className="p-2 bg-re-bg rounded-xl text-re-navy hover:bg-re-navy/10 transition-all">
                                                <BarChart3 size={16} />
                                            </button>
                                            <button className="p-2 bg-re-bg rounded-xl text-re-navy hover:bg-re-navy/10 transition-all">
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="h-64 flex items-end justify-between gap-3 px-2">
                                        {[65, 80, 45, 90, 70, 85, 95].map((h, i) => (
                                            <div key={i} className="flex-1 space-y-4 flex flex-col items-center group">
                                                <div className="w-full bg-re-bg rounded-2xl relative overflow-hidden h-48 ring-1 ring-black/5">
                                                    <div 
                                                        className={`absolute bottom-0 w-full rounded-t-2xl transition-all duration-1000 group-hover:opacity-90 ${i === 6 ? 'bg-re-grad-gold' : 'bg-re-grad-navy'}`}
                                                        style={{ height: `${h}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] font-black text-re-text-muted uppercase tracking-tighter opacity-40">Wk {i+1}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'fees' && (
                                <div className="bg-white p-8 rounded-[32px] shadow-2xl border border-black/5 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="flex items-center justify-between border-b border-black/5 pb-6">
                                        <SectionTitle title="School Fee Structure" />
                                        <button 
                                            onClick={addFeeRow}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-re-navy text-white rounded-2xl text-[11px] font-black hover:opacity-90 transition-all shadow-re-premium-navy"
                                        >
                                            <Plus size={16} /> New Fee Line
                                        </button>
                                    </div>
                                    
                                    <div className={`p-5 rounded-[24px] border-2 flex items-center gap-5 transition-all ${exceedsLimit ? 'bg-re-orange/5 border-re-orange/20 animate-pulse' : 'bg-re-emerald/5 border-re-emerald/10'}`}>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${exceedsLimit ? 'bg-re-orange text-white' : 'bg-re-emerald text-white shadow-re-premium'}`}>
                                            <ShieldCheck size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-black ${exceedsLimit ? 'text-re-orange' : 'text-re-emerald'}`}>
                                                {exceedsLimit ? 'NESA Compliance Warning' : 'Compliance Verified'}
                                            </p>
                                            <p className="text-xs font-bold text-re-text-muted opacity-80 mt-0.5">
                                                {exceedsLimit 
                                                    ? `Threshold exceeded by RWF ${(totalFees - nesaLimit).toLocaleString()}. NESA approval required for this structure.` 
                                                    : `Current structure is RWF ${(nesaLimit - totalFees).toLocaleString()} within national limits.`}
                                            </p>
                                        </div>
                                        {exceedsLimit && <ArrowRight className="text-re-orange" />}
                                    </div>

                                    <div className="space-y-5">
                                        {fees.map((fee, idx) => (
                                            <div key={fee.id} className="flex gap-4 items-end group">
                                                <div className="flex-1 space-y-2">
                                                    <p className="text-[10px] font-black uppercase text-re-navy opacity-30 tracking-[0.2em] ml-1">Fee Description</p>
                                                    <input 
                                                        type="text" 
                                                        value={fee.name}
                                                        onChange={(e) => {
                                                            const next = [...fees];
                                                            next[idx].name = e.target.value;
                                                            setFees(next);
                                                        }}
                                                        className="w-full bg-re-bg border border-black/5 rounded-2xl py-4 px-5 text-sm font-bold text-re-text outline-none focus:ring-2 ring-re-navy/10 transition-all shadow-inner"
                                                        placeholder="e.g. Tuition Fee"
                                                    />
                                                </div>
                                                <div className="w-48 md:w-64 space-y-2">
                                                    <p className="text-[10px] font-black uppercase text-re-navy opacity-30 tracking-[0.2em] ml-1">Amount (RWF)</p>
                                                    <div className="relative group/input">
                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-5 text-re-navy/30 font-black text-xs">Frw</span>
                                                        <input 
                                                            type="number" 
                                                            value={fee.amount}
                                                            onChange={(e) => {
                                                                const next = [...fees];
                                                                next[idx].amount = parseInt(e.target.value) || 0;
                                                                setFees(next);
                                                            }}
                                                            className="w-full bg-re-bg border border-black/5 rounded-2xl py-4 pl-14 pr-5 text-sm font-black text-re-navy outline-none focus:ring-2 ring-re-navy/10 transition-all shadow-inner"
                                                        />
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => removeFeeRow(fee.id)}
                                                    className="p-4 text-re-orange hover:bg-re-orange/10 rounded-2xl transition-all"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-8 border-t border-dashed border-black/10 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-8 bg-re-gold rounded-full" />
                                            <p className="text-sm font-black text-re-navy uppercase tracking-widest opacity-60">Aggregate Amount</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-3xl font-black text-re-navy tracking-tighter">RWF {totalFees.toLocaleString()}</p>
                                            <p className="text-[10px] font-bold text-re-emerald uppercase tracking-widest mt-1">Per Student / Term</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'banks' && (
                                <div className="bg-white p-8 rounded-[32px] shadow-2xl border border-black/5 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                     <div className="flex items-center justify-between border-b border-black/5 pb-6">
                                        <SectionTitle title="Revenue Handlers" />
                                        <button className="flex items-center gap-2 px-5 py-2.5 bg-re-grad-gold text-re-navy rounded-2xl text-[11px] font-black shadow-re-premium transition-all hover:scale-105 active:scale-95">
                                            <Plus size={16} /> Link New Bank
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {banks.map(bank => (
                                            <div key={bank.id} className={`group relative p-6 rounded-[32px] overflow-hidden transition-all hover:translate-y-[-4px] border-2 ${bank.primary ? 'bg-re-grad-navy text-white shadow-re-premium-navy border-transparent' : 'bg-re-bg border-black/5 text-re-navy'}`}>
                                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 blur-3xl rounded-full" />
                                                
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${bank.primary ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-re-navy/5'}`}>
                                                        <Building2 size={20} />
                                                    </div>
                                                    {bank.primary && (
                                                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 rounded-full backdrop-blur-md">
                                                            <div className="w-1.5 h-1.5 bg-re-gold rounded-full animate-pulse" />
                                                            <span className="text-[9px] font-black uppercase tracking-widest">Primary</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <p className={`text-[8px] font-black uppercase tracking-[0.2em] opacity-50 mb-1 ${bank.primary ? 'text-white' : 'text-re-navy'}`}>Banking Partner</p>
                                                        <p className="text-lg font-black tracking-tight leading-none">{bank.bankName}</p>
                                                    </div>
                                                    <div>
                                                        <p className={`text-[8px] font-black uppercase tracking-[0.2em] opacity-50 mb-0.5 ${bank.primary ? 'text-white' : 'text-re-navy'}`}>Settlement ID</p>
                                                        <p className="text-xl font-mono font-bold tracking-[0.2em]">{bank.accountNumber}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-6 pt-5 border-t border-white/10 flex justify-between items-center">
                                                    <div>
                                                        <p className={`text-[8px] font-black uppercase tracking-wider opacity-50 ${bank.primary ? 'text-white' : 'text-re-navy'}`}>Authorized Name</p>
                                                        <p className="text-[10px] font-black truncate max-w-[150px]">{bank.accountName}</p>
                                                    </div>
                                                    {!bank.primary && (
                                                        <button className="text-[9px] font-black text-re-navy hover:underline flex items-center gap-1">
                                                            Set Primary <ArrowRight size={10} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── RIGHT SIDEBAR (Teacher Portal Pattern) ─────────────────────── */}
                    <div className="space-y-6 h-fit lg:sticky lg:top-8">
                        
                        {/* PAYOUT CARD (Teacher Pattern Support Card) */}
                        <div className="relative rounded-[32px] p-8 text-white shadow-re-premium-navy overflow-hidden group cursor-pointer active:scale-95 transition-all
                          bg-re-grad-navy min-h-[280px] flex flex-col justify-between">
                            
                            <div className="absolute inset-0 opacity-10 mix-blend-overlay">
                                <img src="/teacher.jpg" alt="" className="w-full h-full object-cover grayscale" />
                            </div>

                            <div className="relative z-10 space-y-6">
                                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner border border-white/10">
                                    <ArrowUpRight size={28} className="text-re-gold" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-black text-sm tracking-widest uppercase opacity-60">Scheduled Payout</h4>
                                    <p className="text-3xl font-black tracking-tighter leading-none">Friday, 12th April</p>
                                    <p className="text-xs font-bold text-re-gold mt-2">
                                        Estimated Total: RWF 4,250,300
                                    </p>
                                </div>
                            </div>

                            <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest group-hover:gap-4 transition-all">
                                    View Statement <ArrowRight size={14} />
                                </div>
                                <p className="text-[9px] font-black opacity-40 uppercase">Net Settled</p>
                            </div>

                            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-re-gold/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                        </div>

                        {/* SYSTEM HEALTH (Teacher Pattern Info Card) */}
                        <div className="bg-white rounded-[32px] shadow-2xl border border-black/5 p-6 space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Activity size={18} className="text-re-navy opacity-40" />
                                <h3 className="text-[10px] font-black text-re-navy uppercase tracking-widest opacity-60">Financial Integrity</h3>
                            </div>
                            
                            <div className="space-y-4">
                                <StatusRow name="Momo Collection" status="online" />
                                <StatusRow name="Bank Settlement" status="ready" />
                                <StatusRow name="NESA Sync" status="synced" />
                            </div>
                        </div>

                        {/* QUICK CONFIG ACTIONS */}
                        <div className="bg-white/40 backdrop-blur-md rounded-[32px] border border-black/5 p-5">
                            <p className="text-[10px] font-black text-re-navy/40 uppercase tracking-widest mb-4 ml-1">Configuration Tools</p>
                            <div className="grid grid-cols-2 gap-3">
                                <QuickAction label="Invoices" icon={Download} />
                                <QuickAction label="Fee Review" icon={ShieldCheck} />
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

const SectionTitle = ({ title }) => (
    <h3 className="text-2xl font-black text-re-navy tracking-tight">{title}</h3>
);

const DashboardStat = ({ label, value, icon: Icon, color, border }) => {
    const colorClass = {
        emerald: 'text-re-emerald',
        orange: 'text-re-orange',
        gold: 'text-re-gold',
        navy: 'text-re-navy'
    }[color];

    const borderClass = {
        r: 'border-r border-black/5',
        'md:r': 'md:border-r border-black/5',
        none: ''
    }[border] || '';

    return (
        <div className={`p-6 flex flex-col items-center justify-center text-center ${borderClass} hover:bg-re-bg/50 transition-all group`}>
            <div className={`w-8 h-8 rounded-xl bg-re-bg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ${colorClass}`}>
                <Icon size={16} />
            </div>
            <span className="text-2xl font-black text-re-navy tracking-tight">{value}</span>
            <p className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                {label}
            </p>
        </div>
    );
};

const StatusRow = ({ name, status }) => {
    const isGood = status === 'online' || status === 'ready' || status === 'synced';
    return (
        <div className="flex items-center justify-between p-4 bg-re-bg rounded-[20px] transition-all hover:ring-2 ring-re-navy/5">
            <div>
                <p className="text-[11px] font-black text-re-navy leading-none">{name}</p>
                <p className={`text-[8px] font-black uppercase tracking-widest mt-1.5 ${isGood ? 'text-re-emerald' : 'text-re-orange'}`}>{status}</p>
            </div>
            <div className={`w-2 h-2 rounded-full ${isGood ? 'bg-re-emerald animate-pulse shadow-[0_0_10px_rgba(5,150,105,0.5)]' : 'bg-re-orange'}`} />
        </div>
    );
};

const QuickAction = ({ label, icon: Icon }) => (
    <button className="flex flex-col items-center gap-3 p-5 bg-white border border-black/5 rounded-[24px] shadow-sm hover:shadow-re-premium hover:border-re-gold transition-all group active:scale-95">
        <div className="w-10 h-10 rounded-xl bg-re-bg group-hover:bg-re-gold/10 flex items-center justify-center transition-colors">
            <Icon size={20} className="text-re-navy group-hover:text-re-gold transition-all" />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-re-navy/60 group-hover:text-re-navy">{label}</span>
    </button>
);

export default FinanceCenter;
