import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { h } from '../utils/href';
import { Mail, Lock, Eye, EyeOff, AlertCircle, RefreshCw, ChevronRight, ArrowLeft } from 'lucide-react';

const STAFF_LOGIN_PREFS_KEY = 'babyeyi_staff_login_prefs';

function loadStaffLoginPrefs() {
   try {
      const raw = localStorage.getItem(STAFF_LOGIN_PREFS_KEY);
      if (!raw) return { remember: false, identifier: '' };
      const p = JSON.parse(raw);
      return {
         remember: !!p.remember,
         identifier: typeof p.identifier === 'string' ? p.identifier : '',
      };
   } catch {
      return { remember: false, identifier: '' };
   }
}

const Login = () => {
   const [prefs] = useState(() => loadStaffLoginPrefs());
   const [identifier, setIdentifier] = useState(prefs.identifier);
   const [password, setPassword] = useState('');
   const [rememberMe, setRememberMe] = useState(!!prefs.remember);
   const [showPassword, setShowPassword] = useState(false);
   const [error, setError] = useState(null);
   const [loading, setLoading] = useState(false);
   const { login, teacher, loading: authLoading } = useAuth();
   const navigate = useNavigate();

   useEffect(() => {
      if (!authLoading && teacher) {
         navigate(h('/'), { replace: true });
      }
   }, [teacher, authLoading, navigate]);

   const handleSubmit = async (e) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      const result = await login(identifier, password, { rememberMe });
      if (result.success) {
         navigate(h('/'));
      } else {
         setError(result.message);
      }
      setLoading(false);
   };

   if (authLoading) {
      return (
         <div className="min-h-screen flex items-center justify-center bg-slate-100">
            <RefreshCw className="animate-spin w-8 h-8 text-[#000435]" />
         </div>
      );
   }

   return (
      <div className="flex min-h-screen min-h-[100svh] font-sans overflow-hidden relative text-[#000435] bg-slate-100">
         <div className="w-full flex items-center justify-center p-0 md:p-8 z-10">
            <div className="group bg-white flex flex-col shadow-2xl md:rounded-2xl w-full md:max-w-4xl overflow-hidden md:h-auto md:max-h-[min(92vh,780px)] border border-white/10">

               {/* ── Full-width brand bar (desktop + mobile) ── */}
               <header className="flex w-full shrink-0 items-center gap-3 bg-[#000435] px-4 py-3 md:px-6 md:py-3.5 border-b border-white/10">
                  <img
                     src="/babyeyiLogo.png"
                     alt="Babyeyi"
                     className="h-8 w-auto max-w-[140px] md:h-9 md:max-w-[160px] object-contain object-left select-none"
                     draggable={false}
                  />
               </header>

               {/* ── Row: image | form ── */}
               <div className="flex min-h-0 flex-1 flex-col md:flex-row md:items-stretch">

               {/* ── Left: Image ── */}
               <div className="group/image relative z-0 flex h-[clamp(10rem,36vw,13.5rem)] w-full shrink-0 overflow-hidden bg-white md:h-auto md:min-h-[220px] md:w-1/2 md:flex-1">
                  <img
                     src="/teacher.png"
                     alt="Shule Teacher"
                     className="h-full w-full object-cover object-[center_22%] transition-transform duration-[2000ms] [transform:translateZ(0)] md:object-center md:group-hover/image:scale-110"
                  />
                  <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-orange-950/10 via-transparent to-black/15"></div>
               </div>

               {/* ── Right: Form ── */}
               <div
                  className="
                  flex min-h-0 w-full flex-col md:w-1/2 md:flex-1
                  overflow-y-auto overscroll-contain max-h-[calc(100svh-1rem)] md:overflow-visible md:max-h-none
                  px-6 pt-5 pb-5 md:px-8 md:pt-6 md:pb-5
               "
               >

                  {/* Title row — Babyeyi is in top bar */}
                  <div className="mb-3 shrink-0 text-center flex flex-col items-center">
                     <h1 className="m-0 mt-0 flex justify-center">
                        <img
                           src="/ShuleTichaLogo.png"
                           alt="ShuleTicha"
                           className="h-10 w-auto max-w-[min(100%,300px)] md:h-12 object-contain object-center select-none"
                           draggable={false}
                        />
                     </h1>
                     <p className="mt-1.5 text-[9.5px] font-black uppercase tracking-[0.38em] text-[#FF8C00]">
                        Educators&apos; Workspace
                     </p>
                  </div>

                  {/* Error */}
                  {error && (
                     <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2 mb-3 text-[11px] font-bold login-shake shrink-0">
                        <AlertCircle size={14} className="shrink-0" /> {error}
                     </div>
                  )}

                  {/* Welcome copy */}
                  <div className="mb-4 shrink-0">
                     <h2 className="text-[18px] md:text-[19px] font-bold text-gray-900 tracking-tight">Welcome back</h2>
                     <p className="text-[13.5px] text-gray-400 mt-0.5">Sign in to your teacher account to continue</p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-3.5 shrink-0">
                     {/* Email or staff code (same account password) */}
                     <div>
                        <label className="block text-[11.5px] font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                           Email or staff code
                        </label>
                        <div className="group flex items-center rounded-xl border-[1.5px] border-gray-200 bg-gray-50 overflow-hidden transition-all focus-within:border-[#FF8C00] focus-within:bg-orange-50/60 focus-within:shadow-[0_0_0_3px_rgba(255,140,0,0.15)]">
                           <span className="w-10 flex items-center justify-center shrink-0 text-gray-300 group-focus-within:text-[#FF8C00] transition-colors">
                              <Mail className="w-[15px] h-[15px]" />
                           </span>
                           <input
                              type="text"
                              autoComplete="username"
                              value={identifier}
                              onChange={e => setIdentifier(e.target.value)}
                              placeholder="School email or HR staff code"
                              className="w-full py-2.5 pr-3 bg-transparent outline-none text-[13.5px] text-gray-900 placeholder:text-gray-300 font-normal"
                              required
                           />
                        </div>
                       
                     </div>

                     {/* Password */}
                     <div>
                        <label className="block text-[11.5px] font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                           Password
                        </label>
                        <div className="group flex items-center rounded-xl border-[1.5px] border-gray-200 bg-gray-50 overflow-hidden transition-all focus-within:border-[#FF8C00] focus-within:bg-orange-50/60 focus-within:shadow-[0_0_0_3px_rgba(255,140,0,0.15)]">
                           <span className="w-10 flex items-center justify-center shrink-0 text-gray-300 group-focus-within:text-[#FF8C00] transition-colors">
                              <Lock className="w-[15px] h-[15px]" />
                           </span>
                           <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              placeholder="Enter your password..."
                              className="w-full py-2.5 bg-transparent outline-none text-[13.5px] text-gray-900 placeholder:text-gray-300 font-normal"
                              required
                           />
                           <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="w-10 flex items-center justify-center shrink-0 text-gray-300 hover:text-[#FF8C00] transition-colors"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                           >
                              {showPassword ? <EyeOff className="w-[15px] h-[15px]" /> : <Eye className="w-[15px] h-[15px]" />}
                           </button>
                        </div>
                     </div>

                     {/* Remember + forgot */}
                     <div className="flex items-center justify-between gap-2 pt-0.5">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                           <input
                              type="checkbox"
                              checked={rememberMe}
                              onChange={e => setRememberMe(e.target.checked)}
                              className="rounded border-gray-300 w-[15px] h-[15px] accent-[#FF8C00]"
                           />
                           <span className="text-[12px] font-medium text-gray-500">Remember me</span>
                        </label>
                        <button type="button" className="text-[12px] font-semibold text-[#FF8C00] hover:opacity-70 shrink-0 whitespace-nowrap">
                           Forgot Password?
                        </button>
                     </div>

                     {/* Submit */}
                     <button
                        type="submit"
                        disabled={loading}
                        className="w-full text-white py-3 rounded-xl font-bold text-[13px] uppercase tracking-[0.13em] transition-all disabled:opacity-55 disabled:cursor-not-allowed flex justify-center items-center gap-2 group/btn relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(255,140,0,0.45)] active:translate-y-0"
                        style={{
                           background: 'linear-gradient(135deg, #FF8C00 0%, #E67300 100%)',
                           boxShadow: '0 4px 20px rgba(255,140,0,0.4), 0 1px 4px rgba(230,115,0,0.3)',
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
                  <div className="mt-4 pt-3.5 border-t border-black/5 text-center flex flex-col gap-2 shrink-0">
                     <p className="text-[11px] text-re-text-muted opacity-50 font-bold">
                        Trouble signing in?{' '}
                        <button className="font-black hover:underline" style={{ color: '#FF8C00' }}>Contact Administrator</button>
                     </p>
                     <div className="pt-1">
                        <a
                           href={`${import.meta.env.VITE_MAIN_PLATFORM_URL || 'http://localhost:5174'}/login`}
                           className="inline-flex items-center gap-2 text-[10px] font-black text-re-orange hover:underline uppercase tracking-widest"
                        >
                           <ArrowLeft size={12} />
                           Back to Main Babyeyi Login
                        </a>
                     </div>
                  </div>

                  <p className="text-center text-[9px] text-re-text-muted mt-3 uppercase tracking-widest font-black opacity-30 shrink-0">
                     © 2026 Babyeyi Systems • Rwandan National Education Portal
                  </p>
               </div>
               </div>
            </div>
         </div>

         <style>{`
            @keyframes loginShake {
               0%, 100% { transform: translateX(0); }
               25%       { transform: translateX(-5px); }
               75%       { transform: translateX(5px); }
            }
            .login-shake { animation: loginShake 0.4s ease-in-out; }
         `}</style>
      </div>
   );
};

export default Login;