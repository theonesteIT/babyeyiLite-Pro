import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle, RefreshCw, Shield } from 'lucide-react';
import { PORTAL } from '../config/portal';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login, staff, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (!authLoading && staff) navigate('/', { replace: true }); }, [staff, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(null); setLoading(true);
    const result = await login(email, password);
    if (result.success) navigate('/'); else setError(result.message);
    setLoading(false);
  };

  if (authLoading) return <div className="min-h-screen bg-re-bg flex items-center justify-center"><RefreshCw className="animate-spin text-re-orange w-8 h-8" /></div>;

  return (
    <div className="flex min-h-screen bg-re-bg font-sans overflow-hidden relative">
      <div className="absolute top-0 right-0 w-96 h-96 bg-re-orange/10 blur-3xl -mr-48 -mt-48 rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-re-orange/10 blur-3xl -ml-48 -mb-48 rounded-full pointer-events-none" />
      <div className="w-full flex items-center justify-center p-0 md:p-8 z-10">
        <div className="group bg-white flex flex-col md:flex-row shadow-2xl w-full md:max-w-4xl overflow-hidden h-full md:max-h-[520px]">
          {/* Left hero */}
          <div className="flex w-full h-52 md:h-auto md:w-1/2 relative overflow-hidden group/image shrink-0">
            <img src={PORTAL.heroImage} alt={PORTAL.loginFormTitle} className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover/image:scale-110" />
            <div className="absolute inset-0 bg-orange-950/50 backdrop-blur-[1.5px]" />
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/20 to-black/60 z-10 pointer-events-none" />
            <div className="absolute inset-0 p-6 md:p-12 flex flex-col justify-between text-white z-20">
              <div className="space-y-1 md:space-y-2">
                <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-[0.3em] md:tracking-[0.4em] text-orange-300 underline decoration-orange-400 underline-offset-8">{PORTAL.loginEyebrow}</span>
                <h1 className="text-3xl md:text-6xl font-semibold tracking-tight">{PORTAL.loginTitle}</h1>
              </div>
              <div className="hidden md:flex flex-col space-y-6">
                <p className="text-xl font-light leading-relaxed text-white/90 max-w-xs">
                  {PORTAL.loginHeroLine}{' '}
                  <span className="font-semibold text-orange-300 italic">{PORTAL.loginHeroHighlight}</span>
                </p>
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl self-start">
                  <div className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-pulse" style={{ boxShadow: '0 0 10px rgba(251,146,60,0.6)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-white/90">{PORTAL.loginBadge}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Right form */}
          <div className="p-6 md:p-10 w-full md:w-1/2 flex flex-col justify-center">
            <div className="flex flex-col items-center mb-5">
              <div className="bg-orange-100 p-2.5 rounded-full login-float">
                <Shield className="w-7 h-7" style={{ color: '#FF8C00' }} />
              </div>
              <h1 className="text-xl font-semibold mt-2 text-re-text tracking-tight uppercase">{PORTAL.loginFormTitle}</h1>
              <p className="text-[11px] text-center font-bold text-re-text-muted opacity-60">{PORTAL.loginFormSubtitle}</p>
            </div>
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2 mb-3 text-[11px] font-bold">
                <AlertCircle size={14} className="shrink-0" /><span>{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted/40" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder={PORTAL.emailPlaceholder}
                  className="w-full pl-9 pr-4 py-2.5 bg-re-bg border border-black/5 rounded-xl text-[11px] font-bold outline-none focus:ring-2 transition-all" style={{ '--tw-ring-color': 'rgba(254,191,16,0.3)' }} />
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted/40" />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Password"
                  className="w-full pl-9 pr-10 py-2.5 bg-re-bg border border-black/5 rounded-xl text-[11px] font-bold outline-none focus:ring-2 transition-all" style={{ '--tw-ring-color': 'rgba(254,191,16,0.3)' }} />
                <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-re-text-muted/40 hover:text-re-navy">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl text-white font-semibold text-[11px] uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}>
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Shield size={14} />}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
