import React, { useState } from 'react';
import { LogOut, Loader, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPostLogoutLoginPath } from '../../utils/postLogoutLoginPath';

const LogoutButton = ({ 
  variant = 'sidebar', // 'sidebar', 'default', 'icon', 'text', 'dropdown'
  size = 'md',
  className = '',
  onLogoutSuccess = null,
  onLogoutError = null
}) => {
  const { logout } = useAuth();
  const [loading, setLoading]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [notification, setNotification] = useState(null);

  const clearSession = () => {
    const keys = [
      'user','accessToken','refreshToken',
      'userId','userName','userEmail','userRole',
      'schoolId','schoolName','schoolCode','currentSchool',
      'rememberedUser','rememberedSchool',
      'teacher_db_id','student_session','student_uid','studentName',
      'deoDistrict','deoProvince','deoName','deoUsername',
      'nesaName','nesaUsername',
    ];
    keys.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
  };

  const showNotif = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogout = async () => {
    setLoading(true);
    setShowConfirm(false);
    try {
      clearSession();
      if (logout) {
        await logout();
      }
      showNotif('Logged out successfully', 'success');
      if (onLogoutSuccess) onLogoutSuccess();
    } catch (err) {
      console.error('Logout error:', err);
      showNotif('Session ended', 'error');
      if (onLogoutError) onLogoutError(err);
    } finally {
      setTimeout(() => { window.location.href = getPostLogoutLoginPath(); }, 800);
      setLoading(false);
    }
  };

  // ── Sidebar variant — designed to match the nav items ──
  if (variant === 'sidebar') {
    return (
      <>
        {/* Notification toast */}
        {notification && (
          <div className={`fixed top-4 right-4 z-[300] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-semibold
            ${notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-red-50 border-red-300 text-red-800'}`}>
            {notification.type === 'success'
              ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0"/>
              : <AlertCircle className="w-4 h-4 text-red-500 shrink-0"/>}
            {notification.message}
          </div>
        )}

        {/* Confirm modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-[200] bg-blue-900/25 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-blue-100 w-full max-w-sm p-6">
              {/* Icon */}
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-7 h-7 text-red-500"/>
              </div>
              <h3 className="text-lg font-black text-blue-900 text-center mb-1">Sign Out?</h3>
              <p className="text-sm text-blue-500 text-center mb-6">
                You'll be redirected to the login page. Any unsaved changes will be lost.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 border-2 border-blue-200 text-blue-600 text-sm font-bold rounded-2xl hover:bg-blue-50 active:scale-95 transition-all">
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-red-300/40 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading
                    ? <><Loader className="w-4 h-4 animate-spin"/> Signing out…</>
                    : <><LogOut className="w-4 h-4"/> Sign Out</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar trigger button */}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
            text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200
            disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
          {loading
            ? <Loader className="w-4 h-4 animate-spin shrink-0"/>
            : <LogOut className="w-4 h-4 shrink-0"/>}
          <span>{loading ? 'Signing out…' : 'Sign Out'}</span>
        </button>
      </>
    );
  }

  // ── Default / other variants ──
  const sizeMap = { sm:'px-3 py-1.5 text-sm', md:'px-4 py-2 text-base', lg:'px-6 py-3 text-lg' };
  const variantMap = {
    default:  'bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg transition-all',
    icon:     'p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-all',
    text:     'text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all',
    dropdown: 'w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-all',
  };

  return (
    <>
      {notification && (
        <div className={`fixed top-4 right-4 z-[300] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold
          ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {notification.type === 'success' ? <CheckCircle className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
          {notification.message}
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-blue-100 w-full max-w-sm p-6">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-7 h-7 text-red-500"/>
            </div>
            <h3 className="text-lg font-black text-blue-900 text-center mb-1">Sign Out?</h3>
            <p className="text-sm text-blue-500 text-center mb-6">You'll need to sign in again to access your account.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 border-2 border-blue-200 text-blue-600 text-sm font-bold rounded-2xl hover:bg-blue-50 active:scale-95 transition-all">
                Cancel
              </button>
              <button onClick={handleLogout} disabled={loading}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-red-300/40 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><Loader className="w-4 h-4 animate-spin"/> Signing out…</> : <><LogOut className="w-4 h-4"/> Sign Out</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className={`flex items-center justify-center font-semibold gap-2 disabled:opacity-50 disabled:cursor-not-allowed
          ${variantMap[variant] || variantMap.default} ${sizeMap[size]} ${className}`}>
        {loading ? <Loader className="w-4 h-4 animate-spin"/> : <LogOut className="w-4 h-4"/>}
        {variant !== 'icon' && <span>{loading ? 'Signing out…' : 'Logout'}</span>}
      </button>
    </>
  );
};

export default LogoutButton;