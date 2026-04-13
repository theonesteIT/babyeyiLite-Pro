import React, { useState } from 'react';
import {
  Shield, User, Mail, Phone, Lock, Eye, EyeOff,
  CheckCircle, AlertCircle, Loader, ArrowLeft, Key,
  Camera, Upload,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5100';
const VERIFICATION_CODE = 'SMARTEDU2026';

// ================================================================
// ⚠️  IMPORTANT: InputField and PwField are defined OUTSIDE the
//    main component. If they were inside, React would recreate
//    the component on every keystroke → input loses focus → typing breaks.
// ================================================================

const InputField = ({ label, name, type = 'text', placeholder, icon: Icon,
  required, autoComplete, maxLength, value, onChange, error }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        className={`w-full ${Icon ? 'pl-10' : 'px-4'} pr-4 py-3 border rounded-xl text-sm
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
      />
    </div>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const PwField = ({ label, name, placeholder, value, onChange, error, show, onToggle }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label}<span className="text-red-500 ml-0.5">*</span>
    </label>
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type={show ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="new-password"
        className={`w-full pl-10 pr-11 py-3 border rounded-xl text-sm
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
      />
      <button type="button" onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

// ================================================================
// MAIN COMPONENT
// ================================================================
const SuperAdminSignup = () => {
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    verificationCode: '',
    first_name:  '',
    last_name:   '',
    email:       '',
    phone:       '',
    nationalID:  '',
    gender:      '',
    password:        '',
    confirmPassword: '',
    agreeTerms:      false,
    photo:        null,
    photoPreview: null,
  });

  const [ui, setUi] = useState({
    loading: false, error: null, success: null,
    showPassword: false, showConfirmPassword: false,
    passwordStrength: 0,
  });

  const [errors, setErrors] = useState({});

  // ── Helpers ────────────────────────────────────────────────
  const notify = (msg, type = 'error') => {
    setUi(p => type === 'error'
      ? { ...p, error: msg, success: null }
      : { ...p, success: msg, error: null });
    setTimeout(() => setUi(p => ({ ...p, error: null, success: null })), 6000);
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    // Clear field error on change
    if (errors[name]) setErrors(p => { const n = { ...p }; delete n[name]; return n; });
    if (name === 'password') calcStrength(value);
  };

  const handlePhotoUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { notify('Photo must be under 2 MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setFormData(p => ({ ...p, photo: file, photoPreview: reader.result }));
    reader.readAsDataURL(file);
  };

  const calcStrength = pw => {
    let s = 0;
    if (pw.length >= 8)          s += 20;
    if (pw.length >= 12)         s += 10;
    if (/[a-z]/.test(pw))        s += 20;
    if (/[A-Z]/.test(pw))        s += 20;
    if (/[0-9]/.test(pw))        s += 15;
    if (/[^a-zA-Z0-9]/.test(pw)) s += 15;
    setUi(p => ({ ...p, passwordStrength: s }));
  };

  const strengthInfo = () => {
    const s = ui.passwordStrength;
    if (s < 30) return { label: 'Weak',   color: 'bg-red-500' };
    if (s < 60) return { label: 'Fair',   color: 'bg-orange-500' };
    if (s < 80) return { label: 'Good',   color: 'bg-yellow-500' };
    return              { label: 'Strong', color: 'bg-green-500' };
  };

  // ── Validation ─────────────────────────────────────────────
  const validate = stepNum => {
    const e = {};

    if (stepNum === 1) {
      if (!formData.verificationCode.trim())
        e.verificationCode = 'Verification code is required';
      else if (formData.verificationCode.trim() !== VERIFICATION_CODE)
        e.verificationCode = 'Invalid verification code';
    }

    if (stepNum === 2) {
      if (!formData.first_name.trim()) e.first_name = 'First name is required';
      if (!formData.last_name.trim())  e.last_name  = 'Last name is required';
      if (!formData.email.trim())      e.email      = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
        e.email = 'Invalid email format';
      const ph = formData.phone.replace(/\s/g, '');
      if (!ph)
        e.phone = 'Phone number is required';
      else if (!/^(\+?250|0)?[7][0-9]{8}$/.test(ph))
        e.phone = 'Invalid phone (e.g. +250788123456 or 0788123456)';
      if (!formData.gender) e.gender = 'Please select a gender';
      if (formData.nationalID && !/^\d{16}$/.test(formData.nationalID))
        e.nationalID = 'National ID must be exactly 16 digits';
    }

    if (stepNum === 3) {
      const pw = formData.password;
      if (!pw)                           e.password = 'Password is required';
      else if (pw.length < 8)            e.password = 'Minimum 8 characters';
      else if (!/[A-Z]/.test(pw))        e.password = 'Must include an uppercase letter';
      else if (!/[a-z]/.test(pw))        e.password = 'Must include a lowercase letter';
      else if (!/[0-9]/.test(pw))        e.password = 'Must include a number';
      else if (!/[^a-zA-Z0-9]/.test(pw)) e.password = 'Must include a special character (!@#$…)';

      if (!formData.confirmPassword)
        e.confirmPassword = 'Please confirm your password';
      else if (formData.password !== formData.confirmPassword)
        e.confirmPassword = 'Passwords do not match';

      if (!formData.agreeTerms)
        e.agreeTerms = 'You must agree to the terms and conditions';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    setUi(p => ({ ...p, loading: true, error: null }));
    try {
      const payload = {
        email:      formData.email.trim().toLowerCase(),
        password:   formData.password,
        first_name: formData.first_name.trim(),
        last_name:  formData.last_name.trim(),
        phone:      formData.phone.trim() || undefined,
      };

      const res = await fetch(`${API}/api/auth/signup-super-admin`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || `Server error ${res.status}`);

      notify('Account created successfully!', 'success');
      setStep(4);
    } catch (err) {
      console.error('❌ Signup error:', err);
      notify(err.message || 'Failed to create account — please try again.');
    } finally {
      setUi(p => ({ ...p, loading: false }));
    }
  };

  // ── Navigation ──────────────────────────────────────────────
  const handleNext = () => {
    if (!validate(step)) return;
    if (step < 3) { setStep(s => s + 1); window.scrollTo(0, 0); return; }
    handleSubmit();
  };

  const handleBack = () => {
    setStep(s => s - 1);
    setErrors({});
    window.scrollTo(0, 0);
  };

  const STEPS = [
    { num: 1, label: 'Verify',   Icon: Key  },
    { num: 2, label: 'Personal', Icon: User },
    { num: 3, label: 'Security', Icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl
            flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Registration</h1>
          <p className="text-gray-500 mt-1 text-sm">Create the system administrator account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* Stepper */}
          {step < 4 && (
            <div className="flex items-center justify-between mb-8">
              {STEPS.map(({ num, label, Icon }, i) => (
                <React.Fragment key={num}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all
                      ${step > num  ? 'bg-green-500 text-white' :
                        step === num ? 'bg-blue-600 text-white scale-110 shadow-md shadow-blue-200' :
                        'bg-gray-100 text-gray-400'}`}>
                      {step > num ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs font-semibold
                      ${step === num ? 'text-blue-600' : step > num ? 'text-green-600' : 'text-gray-400'}`}>
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-3 mb-4 rounded transition-all
                      ${step > num ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Alerts */}
          {ui.error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{ui.error}</p>
            </div>
          )}
          {ui.success && (
            <div className="mb-5 p-3.5 bg-green-50 border border-green-200 rounded-xl flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <p className="text-sm text-green-700">{ui.success}</p>
            </div>
          )}

          {/* ═══════════════ STEP 1 — Verification ═══════════════ */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">System Verification</h2>
                <p className="text-gray-500 text-sm mt-1">Enter the code provided by your organisation</p>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">One-time setup</p>
                  <p className="text-sm text-amber-800 mt-0.5">
                    Only one Super Admin account can exist. This account will have full system access.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Verification Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="verificationCode"
                  value={formData.verificationCode}
                  onChange={handleChange}
                  placeholder="ENTER-CODE-HERE"
                  className={`w-full px-4 py-3 border rounded-xl text-center font-mono tracking-widest
                    text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase transition
                    ${errors.verificationCode ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                />
                {errors.verificationCode && (
                  <p className="text-xs text-red-500 mt-1">{errors.verificationCode}</p>
                )}
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-xs text-gray-500 mb-1.5">Testing code:</p>
                <code className="text-sm bg-gray-800 text-green-400 px-3 py-1.5 rounded select-all">
                  SMARTEDU2026
                </code>
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 2 — Personal Info ══════════════ */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
                <p className="text-gray-500 text-sm mt-1">Tell us about the administrator</p>
              </div>

              {/* Photo upload */}
              <div className="flex items-center gap-5 p-5 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="relative shrink-0">
                  {formData.photoPreview ? (
                    <img src={formData.photoPreview} alt="Profile"
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md" />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full
                      flex items-center justify-center border-4 border-white shadow-md">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full
                    flex items-center justify-center cursor-pointer hover:bg-blue-700 shadow">
                    <Upload className="w-3.5 h-3.5 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Profile Photo</p>
                  <p className="text-xs text-gray-500 mt-0.5">Optional · JPG or PNG · Max 2 MB</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField label="First Name" name="first_name" placeholder="John" required
                  value={formData.first_name} onChange={handleChange} error={errors.first_name} />
                <InputField label="Last Name" name="last_name" placeholder="Doe" required
                  value={formData.last_name} onChange={handleChange} error={errors.last_name} />
              </div>

              <InputField label="Email Address" name="email" type="email"
                placeholder="admin@school.rw" icon={Mail} required autoComplete="email"
                value={formData.email} onChange={handleChange} error={errors.email} />

              <InputField label="Phone Number" name="phone" type="tel"
                placeholder="+250 788 123 456" icon={Phone} required
                value={formData.phone} onChange={handleChange} error={errors.phone} />

              <div className="grid grid-cols-2 gap-4">
                <InputField label="National ID (optional)" name="nationalID"
                  placeholder="1200180012345678" maxLength={16}
                  value={formData.nationalID} onChange={handleChange} error={errors.nationalID} />

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select name="gender" value={formData.gender} onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-xl text-sm
                      focus:ring-2 focus:ring-blue-500 focus:outline-none transition bg-white
                      ${errors.gender ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
                    <option value="">Select…</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  {errors.gender && <p className="text-xs text-red-500 mt-1">{errors.gender}</p>}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 3 — Security ═══════════════════ */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">Security Settings</h2>
                <p className="text-gray-500 text-sm mt-1">Create a strong password</p>
              </div>

              <PwField label="Password" name="password" placeholder="Create a strong password"
                value={formData.password} onChange={handleChange} error={errors.password}
                show={ui.showPassword}
                onToggle={() => setUi(p => ({ ...p, showPassword: !p.showPassword }))} />

              {formData.password && (
                <div className="space-y-1.5 p-3 bg-gray-50 rounded-xl">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Strength</span>
                    <span className={`font-bold
                      ${ui.passwordStrength < 30 ? 'text-red-500' :
                        ui.passwordStrength < 60 ? 'text-orange-500' :
                        ui.passwordStrength < 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {strengthInfo().label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${strengthInfo().color}`}
                      style={{ width: `${ui.passwordStrength}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-xs">
                    {[
                      ['8+ characters',    formData.password.length >= 8],
                      ['Uppercase letter', /[A-Z]/.test(formData.password)],
                      ['Lowercase letter', /[a-z]/.test(formData.password)],
                      ['Number',           /[0-9]/.test(formData.password)],
                      ['Special char',     /[^a-zA-Z0-9]/.test(formData.password)],
                      ['Passwords match',  formData.password === formData.confirmPassword && !!formData.confirmPassword],
                    ].map(([lbl, ok]) => (
                      <span key={lbl} className={`flex items-center gap-1 ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                        {ok ? '✓' : '○'} {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <PwField label="Confirm Password" name="confirmPassword" placeholder="Repeat your password"
                value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword}
                show={ui.showConfirmPassword}
                onToggle={() => setUi(p => ({ ...p, showConfirmPassword: !p.showConfirmPassword }))} />

              <div className="pt-1">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms}
                    onChange={handleChange}
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 accent-blue-600" />
                  <span className="text-sm text-gray-600 leading-relaxed">
                    I agree to the{' '}
                    <a href="/terms" className="text-blue-600 hover:underline font-medium">Terms and Conditions</a>
                    {' '}and{' '}
                    <a href="/privacy" className="text-blue-600 hover:underline font-medium">Privacy Policy</a>.
                    As Super Admin I accept full responsibility for the system's proper use.
                  </span>
                </label>
                {errors.agreeTerms && (
                  <p className="text-xs text-red-500 mt-1 ml-7">{errors.agreeTerms}</p>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 4 — Success ════════════════════ */}
          {step === 4 && (
            <div className="text-center py-8 space-y-5">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Account Created!</h2>
                <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
                  Your Super Admin account is ready. You can now log in and manage the system.
                </p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl inline-block text-left min-w-64 space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Account details</p>
                <p className="font-bold text-gray-900">{formData.first_name} {formData.last_name}</p>
                <p className="text-sm text-blue-700">{formData.email}</p>
              </div>
              <div>
                <a href="/login"
                  className="inline-block px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold
                    hover:bg-blue-700 transition shadow-lg shadow-blue-200">
                  Go to Login →
                </a>
              </div>
            </div>
          )}

          {/* Navigation */}
          {step < 4 && (
            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
              {step > 1 && (
                <button onClick={handleBack}
                  className="flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-700
                    rounded-xl font-semibold hover:bg-gray-200 transition">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}
              <button onClick={handleNext} disabled={ui.loading}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                  font-semibold transition
                  ${ui.loading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 shadow-lg shadow-blue-200'}`}>
                {ui.loading ? (
                  <><Loader className="w-4 h-4 animate-spin" /> Creating account…</>
                ) : step === 3 ? (
                  <><CheckCircle className="w-4 h-4" /> Create Account</>
                ) : (
                  <>Next Step <ArrowLeft className="w-4 h-4 rotate-180" /></>
                )}
              </button>
            </div>
          )}
        </div>

        {step < 4 && (
          <div className="text-center mt-5">
            <a href="/login"
              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700
                text-sm font-semibold transition">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminSignup;