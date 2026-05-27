import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Loader } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { font } from '../utils/theme';
import { getPostLogoutLoginPath } from '../../../../utils/postLogoutLoginPath';

export default function LogoutButton({ compact = false, style: extStyle = {} }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    setShowConfirm(false);
    try {
      await logout();
    } finally {
      setLoading(false);
      navigate(getPostLogoutLoginPath(), { replace: true });
    }
  };

  return (
    <>
      {showConfirm && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,4,53,0.45)', backdropFilter: 'blur(4px)', fontFamily: font }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#fde68a] bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
              <LogOut className="h-6 w-6 text-[#000435]" />
            </div>
            <h3 className="m-0 mb-1.5 text-lg font-bold text-[#000435]">Sign out?</h3>
            <p className="m-0 mb-5 text-sm text-amber-700">You will be redirected to the login page.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 cursor-pointer rounded-xl border border-[#fde68a] bg-white py-3 text-sm font-semibold text-[#000435]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-[#000435] py-3 text-sm font-semibold text-amber-400 disabled:opacity-60"
              >
                {loading ? <Loader className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {compact ? (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          title="Sign out"
          className="flex cursor-pointer items-center justify-center rounded-xl border-none bg-transparent p-2 text-[#000435] disabled:opacity-50"
          style={extStyle}
        >
          {loading ? <Loader className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-[13px] font-semibold text-white/70 transition-all hover:border-white/10 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
          style={{ fontFamily: font, ...extStyle }}
        >
          {loading ? (
            <Loader className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 shrink-0" />
          )}
          <span>{loading ? 'Signing out…' : 'Sign out'}</span>
        </button>
      )}
    </>
  );
}
