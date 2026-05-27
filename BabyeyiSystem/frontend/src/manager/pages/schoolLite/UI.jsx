import { Loader2, Building2, CheckCircle, XCircle, AlertCircle, Info, X, TrendingUp } from "lucide-react";
import { GRAD } from "./utils/constants";

export const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="relative">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-100 animate-spin border-t-indigo-600"/>
      <Loader2 className="w-5 h-5 text-indigo-600 absolute inset-0 m-auto"/>
    </div>
  </div>
);

export const Empty = ({ msg = "No data found", icon: Icon = Building2 }) => (
  <div className="text-center py-20">
    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
      <Icon className="w-8 h-8 text-slate-300"/>
    </div>
    <p className="text-sm font-medium text-slate-400">{msg}</p>
  </div>
);

export const Toast = ({ toasts, remove }) => (
  <div className="fixed bottom-4 right-4 z-[200] space-y-2 pointer-events-none max-w-[calc(100vw-2rem)]">
    {toasts.map(t => (
      <div key={t.id} className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl shadow-sm border w-80
        ${t.type==="success"?"bg-emerald-50 border-emerald-200 text-emerald-800":
          t.type==="error"?"bg-red-50 border-red-200 text-red-800":
          t.type==="warning"?"bg-amber-50 border-amber-200 text-amber-800":
          "bg-blue-50 border-blue-200 text-blue-800"}`}>
        <div className="mt-0.5 shrink-0">
          {t.type==="success"?<CheckCircle className="w-4 h-4 text-emerald-500"/>:
           t.type==="error"?<XCircle className="w-4 h-4 text-red-500"/>:
           t.type==="warning"?<AlertCircle className="w-4 h-4 text-amber-500"/>:
           <Info className="w-4 h-4 text-blue-500"/>}
        </div>
        <p className="flex-1 text-xs font-medium leading-snug">{t.message}</p>
        <button onClick={()=>remove(t.id)} className="opacity-40 hover:opacity-100"><X className="w-3.5 h-3.5"/></button>
      </div>
    ))}
  </div>
);

export const StatCard = ({ icon: Icon, label, value, sub, color="blue", alert, onClick, trend, badge }) => (
  <div onClick={onClick}
    className={`bg-gradient-to-br ${GRAD[color]} rounded-2xl p-4 shadow-lg active:scale-[0.99] transition-all ${onClick?"cursor-pointer":""} relative overflow-hidden select-none`}>
    <div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle at 80% 20%,white 0%,transparent 60%)"}}/>
    <div className="relative">
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 rounded-xl bg-white/20"><Icon className="w-5 h-5 text-white"/></div>
        {alert && <span className="text-[10px] font-medium bg-white/30 text-white px-1.5 py-0.5 rounded-full animate-pulse">!</span>}
        {trend && <span className="text-[10px] font-semibold text-white/80 flex items-center gap-0.5"><TrendingUp className="w-3 h-3"/>{trend}</span>}
      </div>
      <div className="text-2xl font-medium text-white mb-0.5 tabular-nums">{value??'—'}</div>
      <div className="text-xs font-medium text-white/85">{label}</div>
      {sub && <div className="text-[10px] text-white/60 mt-0.5">{sub}</div>}
      {badge && <div className="mt-1.5"><span className="text-[10px] bg-white/25 text-white px-2 py-0.5 rounded-full font-semibold">{badge}</span></div>}
    </div>
  </div>
);

export const Badge = ({ status }) => {
  const map = {
    approved:"bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected:"bg-red-100 text-red-700 border-red-200",
    pending:"bg-amber-100 text-amber-700 border-amber-200",
    revision:"bg-orange-100 text-orange-700 border-orange-200",
    district_review:"bg-blue-100 text-blue-700 border-blue-200",
    exceeded:"bg-red-100 text-red-800 border-red-300",
    compliant:"bg-emerald-100 text-emerald-700 border-emerald-200",
    within:"bg-emerald-100 text-emerald-700 border-emerald-200",
    public:"bg-blue-100 text-blue-700 border-blue-200",
    private:"bg-violet-100 text-violet-700 border-violet-200",
    primary:"bg-cyan-100 text-cyan-700 border-cyan-200",
    secondary:"bg-indigo-100 text-indigo-700 border-indigo-200",
    nursery:"bg-pink-100 text-pink-700 border-pink-200",
    tvet:"bg-teal-100 text-teal-700 border-teal-200",
    boarding:"bg-purple-100 text-purple-700 border-purple-200",
  };
  const cls = map[status?.toLowerCase()?.replace(/ /g,"_")] || "bg-slate-100 text-slate-600 border-slate-200";
  const label = status?.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()) || "—";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium border ${cls}`}>{label}</span>;
};

export const Modal = ({ title, onClose, children, size="max-w-2xl" }) => (
  <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div className={`bg-white rounded-t-3xl sm:rounded-3xl shadow-sm w-full ${size} max-h-[94vh] flex flex-col border border-slate-100`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-gradient-to-r from-slate-50 to-white rounded-t-3xl">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-all"><X className="w-4 h-4"/></button>
      </div>
      <div className="overflow-y-auto flex-1 p-6">{children}</div>
    </div>
  </div>
);

export const THead = ({ cols }) => (
  <thead>
    <tr className="border-b border-slate-100 bg-slate-50">
      {cols.map(h=>(
        <th key={h} className="text-left py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
      ))}
    </tr>
  </thead>
);

// SVG Charts
export const LineAreaChart = ({ data=[], labelKey="label", valueKey="value", color="#6366f1", height=140, showGrid=true }) => {
  if (!data.length) return <div className="flex items-center justify-center text-slate-300 text-xs" style={{height}}>No data</div>;
  const W=500, H=height, PAD={top:16,bottom:28,left:36,right:12};
  const vals = data.map(d=>Number(d[valueKey])||0);
  const max = Math.max(...vals,1);
  const xStep = (W-PAD.left-PAD.right)/(data.length-1||1);
  const toY = v => PAD.top + (1-(v/max))*(H-PAD.top-PAD.bottom);
  const toX = i => PAD.left + i*xStep;
  const pts = data.map((d,i)=>({x:toX(i),y:toY(Number(d[valueKey])||0)}));
  const linePath = pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = linePath + ` L${pts[pts.length-1].x.toFixed(1)},${(H-PAD.bottom).toFixed(1)} L${PAD.left},${(H-PAD.bottom).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height}}>
      <defs>
        <linearGradient id={`ag${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      {showGrid && [0.25,0.5,0.75,1].map(f=>{
        const y=PAD.top+(1-f)*(H-PAD.top-PAD.bottom);
        return <g key={f}><line x1={PAD.left} y1={y} x2={W-PAD.right} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,3"/><text x={PAD.left-4} y={y+4} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">{Math.round(max*f)}</text></g>;
      })}
      <path d={areaPath} fill={`url(#ag${color.replace("#","")})`}/>
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p,i)=>(
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2.5"/>
          <circle cx={p.x} cy={p.y} r="2" fill={color}/>
          <text x={p.x} y={H-PAD.bottom+12} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">{data[i][labelKey]}</text>
          <text x={p.x} y={p.y-9} textAnchor="middle" fontSize="9" fill={color} fontWeight="800">{vals[i]}</text>
        </g>
      ))}
    </svg>
  );
};

export const ModernBarChart = ({ data=[], labelKey="label", valueKey="value", color="#6366f1", height=160, secondaryKey, secondaryColor="#10b981" }) => {
  if (!data.length) return <div style={{height}}/>;
  const W=500, H=height, PAD={top:20,bottom:30,left:8,right:8};
  const allVals = data.flatMap(d=>[Number(d[valueKey])||0, secondaryKey?Number(d[secondaryKey])||0:0]);
  const max = Math.max(...allVals,1);
  const barW = (W-PAD.left-PAD.right)/(data.length*(secondaryKey?2.8:1.8));
  const gap = (W-PAD.left-PAD.right-barW*(secondaryKey?2:1)*data.length)/(data.length+1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height}}>
      <defs>
        {data.map((_,i)=><linearGradient key={i} id={`bg${i}p`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color}/><stop offset="100%" stopColor={color} stopOpacity="0.5"/></linearGradient>)}
        {secondaryKey&&data.map((_,i)=><linearGradient key={`s${i}`} id={`bg${i}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={secondaryColor}/><stop offset="100%" stopColor={secondaryColor} stopOpacity="0.5"/></linearGradient>)}
      </defs>
      {[0.25,0.5,0.75,1].map(f=><line key={f} x1={PAD.left} y1={PAD.top+(1-f)*(H-PAD.top-PAD.bottom)} x2={W-PAD.right} y2={PAD.top+(1-f)*(H-PAD.top-PAD.bottom)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,2"/>)}
      {data.map((d,i)=>{
        const v1=Number(d[valueKey])||0, v2=secondaryKey?Number(d[secondaryKey])||0:0;
        const bh1=Math.max((v1/max)*(H-PAD.top-PAD.bottom),3), bh2=Math.max((v2/max)*(H-PAD.top-PAD.bottom),3);
        const gW=secondaryKey?barW*2+4:barW;
        const x0=PAD.left+gap+i*(gW+gap);
        return (
          <g key={i}>
            <rect x={x0} y={H-PAD.bottom-bh1} width={barW} height={bh1} rx="4" fill={`url(#bg${i}p)`}/>
            <text x={x0+barW/2} y={H-PAD.bottom-bh1-5} textAnchor="middle" fontSize="9" fill={color} fontWeight="800">{v1}</text>
            {secondaryKey&&<><rect x={x0+barW+4} y={H-PAD.bottom-bh2} width={barW} height={bh2} rx="4" fill={`url(#bg${i}s)`}/><text x={x0+barW+4+barW/2} y={H-PAD.bottom-bh2-5} textAnchor="middle" fontSize="9" fill={secondaryColor} fontWeight="800">{v2}</text></>}
            <text x={x0+(gW)/2} y={H-PAD.bottom+12} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">{(d[labelKey]||"").slice(0,6)}</text>
          </g>
        );
      })}
    </svg>
  );
};

export const DonutChart = ({ data=[], size=140 }) => {
  if (!data.length) return null;
  const total=data.reduce((s,d)=>s+d.value,0);
  const cx=size/2, cy=size/2, R=size/2-8, r=R*0.58;
  let angle=-Math.PI/2;
  const slices=data.map(d=>{
    const a=(d.value/total)*2*Math.PI;
    const x1=cx+R*Math.cos(angle), y1=cy+R*Math.sin(angle);
    angle+=a;
    const x2=cx+R*Math.cos(angle), y2=cy+R*Math.sin(angle);
    const xi1=cx+r*Math.cos(angle-a), yi1=cy+r*Math.sin(angle-a);
    const xi2=cx+r*Math.cos(angle), yi2=cy+r*Math.sin(angle);
    const large=a>Math.PI?1:0;
    return {...d,path:`M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${r},${r} 0 ${large},0 ${xi1},${yi1} Z`};
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s,i)=><path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2"/>)}
      <circle cx={cx} cy={cy} r={r-4} fill="white"/>
      <text x={cx} y={cy-4} textAnchor="middle" fontSize="13" fontWeight="900" fill="#1e293b">{total}</text>
      <text x={cx} y={cy+10} textAnchor="middle" fontSize="7" fontWeight="600" fill="#94a3b8">TOTAL</text>
    </svg>
  );
};

export const HBarChart = ({ data=[], valueKey="value", labelKey="label" }) => {
  const max=Math.max(...data.map(d=>Number(d[valueKey])||0),1);
  const colors=["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
  return (
    <div className="space-y-3">
      {data.map((d,i)=>{
        const pct=Math.round((Number(d[valueKey])||0)/max*100);
        const c=d.color||colors[i%colors.length];
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-semibold text-white shrink-0" style={{background:c}}>{i+1}</div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-800 truncate">{d[labelKey]}</span>
                <span className="text-xs font-semibold ml-2 shrink-0" style={{color:c}}>{d[valueKey]}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,background:`linear-gradient(90deg,${c},${c}88)`}}/>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};