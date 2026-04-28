import React, { useState } from 'react';
import { 
  Mail, ArrowLeft, Key, CheckCircle, Loader, AlertCircle, Lock, Eye, EyeOff
} from 'lucide-react';
import axios from 'axios';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [ui, setUi] = useState({
    loading: false,
    error: null,
    success: null,
    showPassword: false,
    showConfirmPassword: false,
    otpSent: false,
    resetToken: null
  });

  const [countdown, setCountdown] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);

  // ============================================
  // HANDLERS
  // ============================================

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const showNotification = (message, type = 'error') => {
    if (type === 'error') {
      setUi(prev => ({ ...prev, error: message, success: null }));
    } else {
      setUi(prev => ({ ...prev, success: message, error: null }));
    }

    setTimeout(() => {
      setUi(prev => ({ ...prev, error: null, success: null }));
    }, 5000);
  };

  // Step 1: Request Password Reset
  const handleRequestReset = async (e) => {
    e.preventDefault();

    if (!formData.email) {
      showNotification('Please enter your email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showNotification('Please enter a valid email address');
      return;
    }

    setUi(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await axios.post('http://localhost:5000/api/auth/forgot-password', {
        email: formData.email
      });

      console.log('✅ Reset request response:', response.data);

      if (response.data.success) {
        showNotification('Password reset link sent! Check your email.', 'success');
        setStep(2);
        setUi(prev => ({ ...prev, otpSent: true }));
        startCountdown(600); // 10 minutes
      }

    } catch (error) {
      console.error('❌ Reset request error:', error);
      showNotification(error.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setUi(prev => ({ ...prev, loading: false }));
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!formData.otp) {
      showNotification('Please enter the verification code');
      return;
    }

    if (formData.otp.length !== 6) {
      showNotification('Verification code must be 6 digits');
      return;
    }

    setUi(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await axios.post('http://localhost:5000/api/auth/verify-otp', {
        email: formData.email,
        otp: formData.otp,
        purpose: 'Password Reset'
      });

      console.log('✅ OTP verification response:', response.data);

      if (response.data.success) {
        showNotification('Code verified! Set your new password.', 'success');
        setStep(3);
        setUi(prev => ({ ...prev, resetToken: response.data.otpId }));
      }

    } catch (error) {
      console.error('❌ OTP verification error:', error);
      const attempts = otpAttempts + 1;
      setOtpAttempts(attempts);

      if (attempts >= 3) {
        showNotification('Too many failed attempts. Please request a new code.');
        setStep(1);
        setOtpAttempts(0);
      } else {
        const remaining = 3 - attempts;
        showNotification(`Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
      }
    } finally {
      setUi(prev => ({ ...prev, loading: false }));
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    const { newPassword, confirmPassword } = formData;

    if (!newPassword || !confirmPassword) {
      showNotification('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 8) {
      showNotification('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('Passwords do not match');
      return;
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
      showNotification('Password must contain uppercase, lowercase, number, and special character');
      return;
    }

    setUi(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await axios.post('http://localhost:5000/api/auth/reset-password', {
        token: ui.resetToken,
        newPassword: newPassword
      });

      console.log('✅ Password reset response:', response.data);

      if (response.data.success) {
        showNotification('Password reset successful!', 'success');
        setStep(4);
      }

    } catch (error) {
      console.error('❌ Password reset error:', error);
      showNotification(error.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setUi(prev => ({ ...prev, loading: false }));
    }
  };

  // Countdown timer
  const startCountdown = (seconds) => {
    setCountdown(seconds);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resendOTP = async () => {
    setFormData(prev => ({ ...prev, otp: '' }));
    setOtpAttempts(0);
    await handleRequestReset({ preventDefault: () => {} });
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Login */}
        <a
          href="/login"
          className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-semibold mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Login</span>
        </a>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              step === 4 ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              {step === 4 ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <Key className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {step === 1 && 'Forgot Password?'}
              {step === 2 && 'Verify Code'}
              {step === 3 && 'Set New Password'}
              {step === 4 && 'Success!'}
            </h2>
            <p className="mt-2 text-gray-600">
              {step === 1 && 'Enter your email to receive a password reset link'}
              {step === 2 && 'Enter the 6-digit code sent to your email'}
              {step === 3 && 'Choose a strong password for your account'}
              {step === 4 && 'Your password has been reset successfully'}
            </p>
          </div>

          {/* Error/Success Messages */}
          {ui.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-600">{ui.error}</p>
            </div>
          )}

          {ui.success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-600">{ui.success}</p>
            </div>
          )}

          {/* Step 1: Email Input */}
          {step === 1 && (
            <form onSubmit={handleRequestReset} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your.email@example.com"
                    disabled={ui.loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={ui.loading}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition flex items-center justify-center space-x-2 ${
                  ui.loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {ui.loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  name="otp"
                  value={formData.otp}
                  onChange={handleInputChange}
                  maxLength="6"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="000000"
                  disabled={ui.loading}
                />
                <p className="text-xs text-gray-500 text-center mt-2">
                  Code sent to {formData.email}
                </p>
              </div>

              {countdown > 0 && (
                <div className="text-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    Code expires in <span className="font-bold">{formatTime(countdown)}</span>
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={ui.loading || formData.otp.length !== 6}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition flex items-center justify-center space-x-2 ${
                  ui.loading || formData.otp.length !== 6
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {ui.loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Verify Code</span>
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={resendOTP}
                  disabled={countdown > 0}
                  className={`text-sm font-semibold ${
                    countdown > 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  Didn't receive code? Resend
                </button>
              </div>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={ui.showPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className="w-full pl-11 pr-11 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter new password"
                    disabled={ui.loading}
                  />
                  <button
                    type="button"
                    onClick={() => setUi(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {ui.showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={ui.showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full pl-11 pr-11 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm new password"
                    disabled={ui.loading}
                  />
                  <button
                    type="button"
                    onClick={() => setUi(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {ui.showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs font-semibold text-gray-700 mb-2">Password must contain:</p>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li className={formData.newPassword.length >= 8 ? 'text-green-600' : ''}>
                    ✓ At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                    ✓ One uppercase letter
                  </li>
                  <li className={/[a-z]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                    ✓ One lowercase letter
                  </li>
                  <li className={/[0-9]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                    ✓ One number
                  </li>
                  <li className={/[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                    ✓ One special character
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={ui.loading}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition flex items-center justify-center space-x-2 ${
                  ui.loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {ui.loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>Reset Password</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="space-y-6 text-center">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <p className="text-gray-700">
                Your password has been reset successfully. You can now login with your new password.
              </p>
              <a
                href="/login"
                className="inline-block w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-lg hover:shadow-xl transition"
              >
                Go to Login
              </a>
            </div>
          )}
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>For security reasons, this link will expire in 10 minutes.</p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;