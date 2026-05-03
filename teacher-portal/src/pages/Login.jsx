import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle, RefreshCw, ChevronRight, ArrowLeft, Building } from 'lucide-react';

const STAFF_LOGIN_PREFS_KEY = 'babyeyi_staff_login_prefs';

function loadStaffLoginPrefs() {
   try {
      const raw = localStorage.getItem(STAFF_LOGIN_PREFS_KEY);
      if (!raw) return { remember: false, identifier: '', schoolCode: '' };
      const p = JSON.parse(raw);
      return {
         remember: !!p.remember,
         identifier: typeof p.identifier === 'string' ? p.identifier : '',
         schoolCode: typeof p.schoolCode === 'string' ? p.schoolCode : '',
      };
   } catch {
      return { remember: false, identifier: '', schoolCode: '' };
   }
}

const Login = () => {
   const [prefs] = useState(() => loadStaffLoginPrefs());
   const [identifier, setIdentifier] = useState(prefs.identifier);
   const [schoolCode, setSchoolCode] = useState(prefs.schoolCode);
   const [password, setPassword] = useState('');
   const [rememberMe, setRememberMe] = useState(!!prefs.remember);
   const [showPassword, setShowPassword] = useState(false);
   const [error, setError] = useState(null);
   const [loading, setLoading] = useState(false);
   const { login, teacher, loading: authLoading } = useAuth();
   const navigate = useNavigate();

   // ── Auto-redirect if already logged in (e.g. via SSO) ────────────
   useEffect(() => {
      if (!authLoading && teacher) {
         navigate('/', { replace: true });
      }
   }, [teacher, authLoading, navigate]);

   const handleSubmit = async (e) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      const result = await login(identifier, password, { schoolCode, rememberMe });
      if (result.success) {
         navigate('/');
      } else {
         setError(result.message);
      }
      setLoading(false);
   };

   if (authLoading) {
      return (
         <div className="min-h-screen bg-re-bg flex items-center justify-center">
            <RefreshCw className="animate-spin text-re-orange w-8 h-8" />
         </div>
      );
   }

   return (
      <div className="flex min-h-screen bg-re-bg font-sans overflow-hidden relative">
         {/* Background glows */}
         <div className="absolute top-0 right-0 w-96 h-96 bg-re-orange/10 blur-3xl -mr-48 -mt-48 rounded-full pointer-events-none"></div>
         <div className="absolute bottom-0 left-0 w-96 h-96 bg-re-orange/10 blur-3xl -ml-48 -mb-48 rounded-full pointer-events-none"></div>

         <div className="w-full flex items-center justify-center p-0 md:p-8 z-10">
            <div className="group bg-white flex flex-col md:flex-row shadow-2xl md:rounded-0 w-full md:max-w-4xl overflow-hidden h-full md:max-h-[520px]">

               {/* ── Left: Image / Branding Panel ── */}
               <div className="flex w-full h-40 md:h-auto md:w-1/2 relative overflow-hidden group/image shrink-0">
                  <img
                     src="/teacher.png"
                     alt="Shule Teacher"
                     className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover/image:scale-110"
                  />
                  {/* Overlays */}
                  <div className="absolute inset-0 bg-orange-950/50 backdrop-blur-[1.5px]"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/20 to-black/60 z-10 pointer-events-none"></div>

                  {/* Branding text */}
                  <div className="absolute inset-0 p-6 md:p-12 flex flex-col justify-between text-white z-20">
                     <div className="space-y-1 md:space-y-2 login-fade-pulse">
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-orange-300 underline decoration-orange-400 underline-offset-8">
                           Educators' Workspace
                        </span>
                        <h1 className="text-3xl md:text-6xl font-black tracking-tight">Babyeyi</h1>
                     </div>

                     <div className="hidden md:flex flex-col space-y-6 login-fade-pulse">
                        <p className="text-xl font-light leading-relaxed text-white/90 max-w-xs">
                           Empowering <span className="font-black text-orange-300 italic">Teachers</span> with smarter classroom tools.
                        </p>
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl self-start">
                           <div className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-pulse" style={{ boxShadow: '0 0 10px rgba(251,146,60,0.6)' }}></div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Shule Teacher | Secure</span>
                        </div>
                     </div>
                  </div>
               </div>

               {/* ── Right: Form Panel ── */}
               <div className="p-6 md:p-10 w-full md:w-1/2 flex flex-col justify-center">
                  {/* Header */}
                  <div className="flex flex-col items-center mb-5">
                     <div className="bg-white p-2.5 rounded-full login-float border border-orange-100 shadow-inner">
                        <img src="/logo.png" alt="Babyeyi" className="w-7 h-7 object-contain" />
                     </div>
                     <h1 className="text-xl font-black mt-2 text-re-text tracking-tight uppercase">Shule Teacher</h1>
                     <p className="text-[11px] text-center font-bold text-re-text-muted opacity-60">The Babyeyi Educational Hub — Authorize your session</p>
                  </div>

                  {/* Error */}
                  {error && (
                     <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2 mb-3 text-[11px] font-bold login-shake">
                        <AlertCircle size={14} className="shrink-0" /> {error}
                     </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-3">
                     {/* Identifier — same as main Babyeyi login */}
                     <div>
                        <label className="text-[11px] font-black text-re-text-muted uppercase tracking-widest ml-1 opacity-70">
                           Email or username
                        </label>
                        <div className="flex items-center bg-re-bg border border-black/5 rounded-xl overflow-hidden mt-1 shadow-inner focus-within:ring-2 transition-all" style={{ '--tw-ring-color': 'rgba(255,140,0,0.35)' }}>
                           <Mail className="text-re-text-muted/40 w-4 h-4 ml-3 mr-2 shrink-0" />
                           <input
                              type="text"
                              autoComplete="username"
                              value={identifier}
                              onChange={e => setIdentifier(e.target.value)}
                              placeholder="teacher@school.rw"
                              className="w-full p-2.5 bg-transparent outline-none text-xs font-bold text-re-text"
                              required
                           />
                        </div>
                     </div>

                     {/* School code — same payload as BabyeyiSystem/frontend */}
                     <div>
                        <label className="text-[11px] font-black text-re-text-muted uppercase tracking-widest ml-1 opacity-70">
                           School code
                        </label>
                        <div className="flex items-center bg-re-bg border border-black/5 rounded-xl overflow-hidden mt-1 shadow-inner focus-within:ring-2 transition-all" style={{ '--tw-ring-color': 'rgba(255,140,0,0.35)' }}>
                           <Building className="text-re-text-muted/40 w-4 h-4 ml-3 mr-2 shrink-0" />
                           <input
                              type="text"
                              value={schoolCode}
                              onChange={e => setSchoolCode(e.target.value)}
                              placeholder="e.g. 04001 (directory code)"
                              className="w-full p-2.5 bg-transparent outline-none text-xs font-bold text-re-text uppercase"
                           />
                        </div>
                        <p className="text-[9px] font-bold text-re-text-muted/70 mt-1 ml-1">
                           Enter your school&apos;s code if you have one — it helps match your account to the right school.
                        </p>
                     </div>

                     {/* Password */}
                     <div>
                        <label className="text-[11px] font-black text-re-text-muted uppercase tracking-widest ml-1 opacity-70">
                           Password
                        </label>
                        <div className="flex items-center bg-re-bg border border-black/5 rounded-xl overflow-hidden mt-1 shadow-inner focus-within:ring-2 transition-all" style={{ '--tw-ring-color': 'rgba(255,140,0,0.35)' }}>
                           <Lock className="text-re-text-muted/40 w-4 h-4 ml-3 mr-2 shrink-0" />
                           <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full p-2.5 bg-transparent outline-none text-xs font-bold text-re-text"
                              required
                           />
                           <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-re-text-muted/40 hover:text-re-orange mr-3 transition-colors"
                           >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                           </button>
                        </div>
                     </div>

                     {/* Remember + forgot */}
                     <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                           <input
                              type="checkbox"
                              checked={rememberMe}
                              onChange={e => setRememberMe(e.target.checked)}
                              className="rounded border-black/20 text-re-orange focus:ring-re-orange"
                           />
                           <span className="text-[10px] font-black text-re-text-muted uppercase tracking-wider">Remember me</span>
                        </label>
                        <button type="button" className="text-[10px] font-black hover:underline uppercase tracking-wider shrink-0" style={{ color: '#FF8C00' }}>
                           Forgot Password?
                        </button>
                     </div>

                     {/* Submit — explicit inline style so it's always visible regardless of Tailwind resolution */}
                     <button
                        type="submit"
                        disabled={loading}
                        className="w-full text-white py-3 text-xs rounded-2xl font-black transition-all disabled:opacity-60 flex justify-center items-center gap-2 group/btn uppercase tracking-widest"
                        style={{
                           background: 'linear-gradient(135deg, #FF8C00 0%, #FF5E00 100%)',
                           boxShadow: '0 4px 15px rgba(255,140,0,0.35)',
                        }}
                     >
                        {loading ? (
                           <RefreshCw className="animate-spin w-4 h-4" />
                        ) : (
                           <>
                              Sign In
                              <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                           </>
                        )}
                     </button>
                  </form>

                  {/* Footer */}
                  <div className="mt-5 pt-4 border-t border-black/5 text-center flex flex-col gap-3">
                     <p className="text-[11px] text-re-text-muted opacity-50 font-bold">
                        Trouble signing in?{' '}
                        <button className="font-black hover:underline" style={{ color: '#FF8C00' }}>Contact Administrator</button>
                     </p>
                     
                     <div className="pt-2">
                        <a 
                           href={`${import.meta.env.VITE_MAIN_PLATFORM_URL || 'http://localhost:5174'}/login`}
                           className="inline-flex items-center gap-2 text-[10px] font-black text-re-orange hover:underline uppercase tracking-widest"
                        >
                           <ArrowLeft size={12} />
                           Back to Main Babyeyi Login
                        </a>
                     </div>
                  </div>

                  <p className="text-center text-[9px] text-re-text-muted mt-4 uppercase tracking-widest font-black opacity-30">
                     © 2026 Babyeyi Systems • Rwandan National Education Portal
                  </p>
               </div>
            </div>
         </div>

         <style>{`
        @keyframes loginFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        .login-float { animation: loginFloat 4s ease-in-out infinite; }

        @keyframes loginShake {
          0%, 100% { transform: translateX(0); }
          25%       { transform: translateX(-5px); }
          75%       { transform: translateX(5px); }
        }
        .login-shake { animation: loginShake 0.4s ease-in-out; }

        @keyframes loginFadePulse {
          0%, 100% { opacity: 0.5; transform: translateY(2px); }
          50%       { opacity: 1;   transform: translateY(0px); }
        }
        .login-fade-pulse { animation: loginFadePulse 4s ease-in-out infinite; }
      `}</style>
      </div>
   );
};

export default Login;
