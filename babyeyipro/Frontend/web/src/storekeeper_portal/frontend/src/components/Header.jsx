import { useState, useRef, useEffect } from 'react'
import { Menu, Bell, Search, ChevronDown, LogOut, Settings, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMasterAuth } from '../../../../context/MasterAuthContext'
import { PORTAL } from '../config/portal'
import ProfileModal from '../../../../shared/components/ProfileModal'
import { resolveUserPhotoUrl } from '../../../../shared/utils/userPhotoUrl'

export default function Header({ setMobileOpen, title = 'Storekeeper' }) {
  const navigate = useNavigate()
  const { patchUser } = useMasterAuth()
  const { staff, logout, patchStaff } = useAuth()
  const [userOpen, setUserOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const userRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = staff
    ? `${(staff.first_name || '')[0] || ''}${(staff.last_name || '')[0] || ''}`.toUpperCase()
    : '?'
  const avatarPhoto = staff?.photo ? resolveUserPhotoUrl(staff.photo) : null

  return (
    <>
      <header
        className="h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-black/5 flex items-center justify-between px-3 sm:px-4 lg:px-6 shrink-0 z-20"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 hover:bg-re-bg rounded-xl transition shrink-0"
            aria-label="Open menu"
          >
            <Menu size={20} className="text-re-text" />
          </button>
          <p className="text-sm sm:text-base font-medium text-re-text truncate lg:hidden">{title}</p>
          <div className="hidden sm:flex items-center gap-2 bg-re-bg border border-black/5 rounded-xl px-3 py-2 w-full max-w-xs lg:max-w-sm">
            <Search size={16} className="text-re-text-muted shrink-0" />
            <input
              type="search"
              placeholder={PORTAL.searchPlaceholder}
              className="bg-transparent border-none outline-none text-[12px] w-full text-re-text placeholder:text-re-text-muted font-medium min-w-0"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            className="relative p-2 hover:bg-re-bg rounded-xl transition"
            aria-label="Notifications"
          >
            <Bell size={20} className="text-re-text-muted" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FEBF10] rounded-full" />
          </button>

          <div className="h-6 w-px bg-black/5 hidden sm:block" />

          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => setUserOpen(!userOpen)}
              className="flex items-center gap-2 pl-2 sm:pl-3 hover:bg-re-bg rounded-xl py-1.5 pr-1 transition"
            >
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FEBF10]/25 border border-[#FEBF10]/40 flex items-center justify-center text-re-text font-medium text-xs sm:text-sm overflow-hidden shrink-0"
                style={avatarPhoto ? undefined : { background: 'linear-gradient(135deg,#000435,#3D5A80)', color: '#fff', border: 'none' }}
              >
                {avatarPhoto ? (
                  <img src={avatarPhoto} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="hidden md:block min-w-0 text-left">
                <p className="text-sm font-medium text-re-text truncate capitalize">
                  {staff?.first_name || PORTAL.profileFallback}
                </p>
                <p className="text-[11px] text-re-text-muted truncate">
                  {staff?.email || staff?.school?.name || PORTAL.roleLabel}
                </p>
              </div>
              <ChevronDown
                size={14}
                className={`text-re-text-muted hidden md:block transition-transform ${userOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {userOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-2xl shadow-md border border-black/10 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-black/5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-medium text-sm shadow-sm shrink-0 overflow-hidden"
                      style={{ background: 'linear-gradient(135deg,#000435,#3D5A80)' }}
                    >
                      {avatarPhoto ? (
                        <img src={avatarPhoto} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-re-text capitalize tracking-tight truncate">
                        {staff?.first_name} {staff?.last_name}
                      </p>
                      <p className="text-[10px] text-re-text-muted truncate max-w-[140px]">
                        {staff?.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => { setProfileOpen(true); setUserOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-re-text-muted hover:bg-re-bg hover:text-re-text transition-all"
                  >
                    <User size={13} /> My Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => { navigate('settings'); setUserOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-re-text-muted hover:bg-re-bg hover:text-re-text transition-all"
                  >
                    <Settings size={13} /> Settings
                  </button>
                </div>

                <div className="border-t border-black/5 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setUserOpen(false)
                      void logout()
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-all"
                  >
                    <LogOut size={13} /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={staff}
        onUserUpdate={(updates) => {
          patchStaff(updates)
          patchUser(updates)
        }}
      />
    </>
  )
}
