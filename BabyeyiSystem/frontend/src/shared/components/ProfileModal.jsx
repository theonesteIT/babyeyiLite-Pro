import { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, User, Upload } from 'lucide-react';
import { resolveUserPhotoUrl } from '../utils/userPhotoUrl';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5100') + '/api';

const ProfileModal = ({
    open,
    onClose,
    user,
    onUserUpdate,
    variant = 'modal',
    /** When true (modal only), show profile photo upload above email/password card */
    includePhotoSection = false,
    /** Called after a successful photo upload (e.g. refresh session) */
    onAfterPhotoUpload,
}) => {
    const isInline = variant === 'inline';
    const [tab, setTab] = useState('email');
    const [email, setEmail] = useState(user?.email || '');

    useEffect(() => {
        setEmail(user?.email || '');
    }, [user?.email]);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const photoInputRef = useRef(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoSaving, setPhotoSaving] = useState(false);
    const [photoMsg, setPhotoMsg] = useState(null);

    useEffect(() => {
        if (isInline) return;
        if (!open) {
            setPhotoFile(null);
            setPhotoMsg(null);
            setPhotoPreview((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
            });
            if (photoInputRef.current) photoInputRef.current.value = '';
            return;
        }
        setTab('email');
        setMessage(null);
        setPhotoFile(null);
        setPhotoMsg(null);
        setPhotoPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
        if (photoInputRef.current) photoInputRef.current.value = '';
    }, [open, isInline]);

    if (!isInline && !open) return null;

    const initials = user
        ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase()
        : '?';
    const photoUrl = user?.photo ? resolveUserPhotoUrl(user.photo) : null;

    const resetForm = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setMessage(null);
    };

    const handleTabChange = (t) => {
        setTab(t);
        setMessage(null);
    };

    const handleEmailUpdate = async (e) => {
        e.preventDefault();
        if (!email.trim()) return setMessage({ type: 'error', text: 'Email is required.' });
        if (email === user?.email) return setMessage({ type: 'error', text: 'Please enter a different email.' });

        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch(`${API}/session/update-profile`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && (json.success !== false)) {
                setMessage({ type: 'success', text: 'Email updated successfully!' });
                onUserUpdate?.({ email: email.trim() });
            } else {
                setMessage({ type: 'error', text: json.message || 'Failed to update email.' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (!currentPassword) return setMessage({ type: 'error', text: 'Current password is required.' });
        if (!newPassword) return setMessage({ type: 'error', text: 'New password is required.' });
        if (newPassword.length < 8) return setMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
        if (newPassword !== confirmPassword) return setMessage({ type: 'error', text: 'Passwords do not match.' });

        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch(`${API}/auth/change-password`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && (json.success !== false)) {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                resetForm();
            } else {
                setMessage({ type: 'error', text: json.message || 'Failed to change password.' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const photoSection =
        includePhotoSection && !isInline ? (
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-lg animate-in fade-in zoom-in-95 duration-200">
                <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-700">
                    <User size={14} className="text-[#000435]" strokeWidth={2} />
                    Profile photo
                </h3>
                <div className="flex flex-wrap items-center gap-6">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-[#FEBF10]/90 bg-slate-100 shadow-inner">
                        {photoPreview || photoUrl ? (
                            <img src={photoPreview || photoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#000435] to-[#1E3A5F] text-lg font-bold text-[#FEBF10]">
                                {initials}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target?.files?.[0];
                                if (file) {
                                    setPhotoFile(file);
                                    setPhotoPreview((prev) => {
                                        if (prev) URL.revokeObjectURL(prev);
                                        return URL.createObjectURL(file);
                                    });
                                    setPhotoMsg(null);
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => photoInputRef.current?.click()}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 transition-colors hover:border-[#FEBF10]/50 hover:bg-white"
                        >
                            <Upload size={14} strokeWidth={2} />
                            Choose image
                        </button>
                        {photoFile && (
                            <button
                                type="button"
                                disabled={photoSaving}
                                onClick={async () => {
                                    setPhotoSaving(true);
                                    setPhotoMsg(null);
                                    try {
                                        const fd = new FormData();
                                        fd.append('photo', photoFile);
                                        const res = await fetch(`${API}/auth/profile/photo`, {
                                            method: 'POST',
                                            credentials: 'include',
                                            body: fd,
                                        });
                                        const json = await res.json().catch(() => ({}));
                                        if (res.ok && json.success && json.data?.photo) {
                                            setPhotoFile(null);
                                            if (photoPreview) URL.revokeObjectURL(photoPreview);
                                            setPhotoPreview(null);
                                            if (photoInputRef.current) photoInputRef.current.value = '';
                                            onUserUpdate?.({ photo: json.data.photo });
                                            await onAfterPhotoUpload?.();
                                            setPhotoMsg({ type: 'ok', text: 'Profile photo updated.' });
                                        } else {
                                            setPhotoMsg({ type: 'err', text: json.message || 'Upload failed.' });
                                        }
                                    } catch {
                                        setPhotoMsg({ type: 'err', text: 'Network error. Try again.' });
                                    } finally {
                                        setPhotoSaving(false);
                                    }
                                }}
                                className="ml-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#000435] to-[#1E3A5F] px-4 py-2.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                            >
                                {photoSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                                {photoSaving ? 'Uploading…' : 'Upload'}
                            </button>
                        )}
                        <p className="mt-2 text-[11px] text-slate-500">
                            JPEG, PNG or WebP. This photo appears in the header for all manager pages.
                        </p>
                        {photoMsg && (
                            <p
                                className={`mt-2 text-xs font-semibold ${photoMsg.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}
                            >
                                {photoMsg.text}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        ) : null;

    const card = (
            <div className={`relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ${isInline ? 'border border-slate-200 shadow-sm' : 'animate-in fade-in zoom-in-95 duration-200'}`}>
                {/* Header */}
                <div className="relative bg-gradient-to-r from-[#000435] to-[#1E3A5F] px-6 py-5">
                    {!isInline && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                        <X size={18} />
                    </button>
                    )}
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FEBF10] to-[#D9A400] flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-white/20 overflow-hidden shrink-0">
                            {photoPreview || photoUrl ? (
                                <img src={photoPreview || photoUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                                initials
                            )}
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-base tracking-tight">
                                {user?.first_name} {user?.last_name}
                            </h2>
                            <p className="text-white/60 text-xs mt-0.5">{user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => handleTabChange('email')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-all ${
                            tab === 'email'
                                ? 'text-[#000435] border-b-2 border-[#FEBF10] bg-amber-50/40'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <Mail size={14} />
                        Change Email
                    </button>
                    <button
                        onClick={() => handleTabChange('password')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-all ${
                            tab === 'password'
                                ? 'text-[#000435] border-b-2 border-[#FEBF10] bg-amber-50/40'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <Lock size={14} />
                        Change Password
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5">
                    {message && (
                        <div className={`flex items-start gap-2 p-3 rounded-xl text-xs font-medium mb-4 ${
                            message.type === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                            {message.type === 'success' ? <CheckCircle size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
                            {message.text}
                        </div>
                    )}

                    {tab === 'email' ? (
                        <form onSubmit={handleEmailUpdate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Email Address</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                        <Mail size={15} />
                                    </span>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#FEBF10] focus:ring-2 focus:ring-[#FEBF10]/20 transition-all"
                                        placeholder="Enter new email"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#000435] to-[#1E3A5F] text-white font-semibold text-xs py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                            >
                                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                                {loading ? 'Updating...' : 'Update Email'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handlePasswordUpdate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Current Password</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                        <Lock size={15} />
                                    </span>
                                    <input
                                        type={showCurrentPw ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-sm outline-none focus:border-[#FEBF10] focus:ring-2 focus:ring-[#FEBF10]/20 transition-all"
                                        placeholder="Enter current password"
                                    />
                                    <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                                        {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                        <Lock size={15} />
                                    </span>
                                    <input
                                        type={showNewPw ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-sm outline-none focus:border-[#FEBF10] focus:ring-2 focus:ring-[#FEBF10]/20 transition-all"
                                        placeholder="Enter new password"
                                    />
                                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                                        {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                        <Lock size={15} />
                                    </span>
                                    <input
                                        type={showConfirmPw ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-sm outline-none focus:border-[#FEBF10] focus:ring-2 focus:ring-[#FEBF10]/20 transition-all"
                                        placeholder="Re-enter new password"
                                    />
                                    <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                                        {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#000435] to-[#1E3A5F] text-white font-semibold text-xs py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                            >
                                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                                {loading ? 'Changing...' : 'Change Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
    );

    if (isInline) {
        return card;
    }

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center overflow-y-auto p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 my-auto flex w-full max-w-md flex-col gap-4">
                {photoSection}
                {card}
            </div>
        </div>
    );
};

export default ProfileModal;
