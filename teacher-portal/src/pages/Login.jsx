import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle, RefreshCw, ChevronRight, ArrowLeft } from 'lucide-react';

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

      const result = await login(identifier, password, { schoolCode: '', rememberMe });
      if (result.success) {
         navigate('/');
      } else {
         setError(result.message);
      }
      setLoading(false);
   };

   if (authLoading) {
      return (
         <div className="min-h-screen flex items-center justify-center bg-[#000435] md:bg-slate-100">
            <RefreshCw className="animate-spin w-8 h-8 text-white/85 md:text-[#000435]" />
         </div>
      );
   }

   return (
      <div className="flex min-h-screen min-h-[100svh] font-sans overflow-hidden relative text-[#000435] bg-[#000435] md:bg-slate-100">
         <div className="w-full flex items-center justify-center p-0 md:p-8 z-10">
            <div className="group bg-white flex flex-col md:flex-row shadow-2xl md:rounded-2xl w-full md:max-w-4xl overflow-hidden h-full md:max-h-[520px] border border-white/10">

               {/* ── Left: Image / Branding Panel ── */}
               <div className="flex w-full h-[clamp(11.75rem,48vw,16rem)] md:h-auto md:min-h-[280px] md:w-1/2 md:flex-1 relative overflow-hidden group/image shrink-0 bg-white">
                  <img
                     src="/teacher.png"
                     alt="Shule Teacher"
                     className="w-full h-full object-cover object-[center_22%] md:object-center transition-transform duration-[2000ms] md:group-hover/image:scale-110"
                  />
                  {/* Very light tint so the photo stays clearly visible */}
                  <div className="absolute inset-0 bg-gradient-to-b from-orange-950/10 via-transparent to-black/15 z-10 pointer-events-none"></div>

                  {/* Mobile only: Educators' label on image */}
                  <div className="absolute inset-0 z-20 flex md:hidden flex-col text-white p-4 pb-4 pointer-events-none">
                     <div className="flex flex-1 flex-col items-center justify-end">
                        <span className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-400 text-center">
                           Educators&apos; Workspace
                        </span>
                     </div>
                  </div>
               </div>

               {/* ── Right: Form Panel ── */}
               <div className="p-6 md:p-10 w-full md:w-1/2 flex flex-col justify-center">
                  {/* Header — Babyeyi logo (right column only; full photo visible on the left) */}
                  <div className="flex flex-col items-center mb-6 text-center">
                     <div
                        className="w-[88px] h-[88px] md:w-24 md:h-24 rounded-3xl flex items-center justify-center border-2 border-white/20 ring-2 ring-amber-400/35 ring-offset-2 ring-offset-white login-float shrink-0"
                        style={{
                           background: '#000435',
                           boxShadow: '0 12px 36px rgba(0, 4, 53, 0.45), 0 4px 12px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
                        }}
                     >
                        <img
                           src="/babyeyilogo.png"
                           alt="Babyeyi"
                           className="w-[62px] h-[62px] md:w-[70px] md:h-[70px] max-w-[calc(100%-12px)] object-contain select-none"
                           style={{ filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.35))' }}
                           draggable={false}
                        />
                     </div>
                     <h1 className="text-[28px] md:text-[32px] font-extrabold mt-5 tracking-tight leading-none" style={{ color: '#000435' }}>
                        ShuleTicha
                     </h1>
                     <p className="mt-2 text-[10px] font-black uppercase tracking-[0.38em] text-amber-500">
                        Educators&apos; Workspace
                     </p>
                  </div>

                  {/* Error */}
                  {error && (
                     <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2 mb-3 text-[11px] font-bold login-shake">
                        <AlertCircle size={14} className="shrink-0" /> {error}
                     </div>
                  )}

                  {/* Form */}
                  <div className="mb-5">
                     <h2 className="text-xl font-bold text-gray-900 tracking-tight">Welcome back</h2>
                     <p className="text-[15px] text-gray-400 mt-1">Sign in to your teacher account to continue</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                     {/* Email or Username — LoginFix-style field */}
                     <div>
                        <label className="block text-[12px] font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                           Email or Username
                        </label>
                        <div className="group flex items-center rounded-xl border-[1.5px] border-gray-200 bg-gray-50 overflow-hidden transition-all focus-within:border-amber-500 focus-within:bg-amber-50/60 focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]">
                           <span className="w-10 flex items-center justify-center shrink-0 text-gray-300 group-focus-within:text-amber-500 transition-colors">
                              <Mail className="w-[15px] h-[15px]" />
                           </span>
                           <input
                              type="text"
                              autoComplete="username"
                              value={identifier}
                              onChange={e => setIdentifier(e.target.value)}
                              placeholder="Enter your email..."
                              className="w-full py-3 pr-3 bg-transparent outline-none text-[13.5px] text-gray-900 placeholder:text-gray-300 font-normal"
                              required
                           />
                        </div>
                     </div>

                     {/* Password */}
                     <div>
                        <label className="block text-[12px] font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                           Password
                        </label>
                        <div className="group flex items-center rounded-xl border-[1.5px] border-gray-200 bg-gray-50 overflow-hidden transition-all focus-within:border-amber-500 focus-within:bg-amber-50/60 focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]">
                           <span className="w-10 flex items-center justify-center shrink-0 text-gray-300 group-focus-within:text-amber-500 transition-colors">
                              <Lock className="w-[15px] h-[15px]" />
                           </span>
                           <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              placeholder="Enter your password..."
                              className="w-full py-3 bg-transparent outline-none text-[13.5px] text-gray-900 placeholder:text-gray-300 font-normal"
                              required
                           />
                           <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="w-10 flex items-center justify-center shrink-0 text-gray-300 hover:text-amber-500 transition-colors"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                           >
                              {showPassword ? <EyeOff className="w-[15px] h-[15px]" /> : <Eye className="w-[15px] h-[15px]" />}
                           </button>
                        </div>
                     </div>

                     {/* Remember + forgot */}
                     <div className="flex items-center justify-between gap-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                           <input
                              type="checkbox"
                              checked={rememberMe}
                              onChange={e => setRememberMe(e.target.checked)}
                              className="rounded border-gray-300 w-[15px] h-[15px] accent-amber-500"
                           />
                           <span className="text-[12.5px] font-medium text-gray-500">Remember me</span>
                        </label>
                        <button type="button" className="text-[12.5px] font-semibold text-amber-500 hover:opacity-70 shrink-0 whitespace-nowrap">
                           Forgot Password?
                        </button>
                     </div>

                     {/* Submit — amber gradient */}
                     <button
                        type="submit"
                        disabled={loading}
                        className="w-full text-white py-3.5 rounded-xl font-bold text-[13px] uppercase tracking-[0.13em] transition-all disabled:opacity-55 disabled:cursor-not-allowed flex justify-center items-center gap-2 group/btn relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(245,158,11,0.4)] active:translate-y-0"
                        style={{
                           background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                           boxShadow: '0 4px 20px rgba(245,158,11,0.35), 0 1px 4px rgba(217,119,6,0.25)',
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

      `}</style>
      </div>
   );
};

export default Login;
