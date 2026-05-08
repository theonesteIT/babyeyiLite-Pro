import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useMasterAuth } from '../context/MasterAuthContext'

const LOGIN_FALLBACK = 'http://localhost:5173/login'

/** Roles allowed per Pro portal — keep in sync with BabyeyiSystem `proAppEntry.js` */
export const PORTAL_ROLES = {
  dos: ['DOS'],
  manager: ['SCHOOL_ADMIN', 'SCHOOL_MANAGER'],
  accountant: ['ACCOUNTANT'],
  storekeeper: ['STOREKEEPER', 'STORE_MANAGER'],
  librarian: ['LIBRARIAN'],
  gatekeeper: ['GATE_KEEPER', 'GATE_OFFICER'],
  'discipline-staff': ['DISCIPLINE_STAFF'],
  teacher: ['TEACHER'],
  discipline: ['TEACHER', 'HOD', 'DISCIPLINE', 'DISCIPLINE_STAFF'],
}

const ROLE_HOME_PORTAL = {
  DOS: 'dos',
  SCHOOL_ADMIN: 'manager',
  SCHOOL_MANAGER: 'manager',
  ACCOUNTANT: 'accountant',
  STOREKEEPER: 'storekeeper',
  STORE_MANAGER: 'storekeeper',
  LIBRARIAN: 'librarian',
  GATE_KEEPER: 'gatekeeper',
  GATE_OFFICER: 'gatekeeper',
  DISCIPLINE_STAFF: 'discipline',
  DISCIPLINE: 'discipline',
  TEACHER: 'teacher',
  HOD: 'discipline',
}

export function NotSubscribedToPro() {
  return (
    <div className="min-h-screen bg-re-bg flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md rounded-2xl border border-amber-200 bg-white p-8 shadow-lg text-center space-y-3">
        <h1 className="text-lg font-black text-re-text">School is not subscribed to Babyeyi Pro</h1>
        <p className="text-sm text-re-text-muted font-semibold leading-relaxed">
          Your account is signed in, but this school does not have an active Pro plan. Contact your platform administrator if you believe this is a mistake.
        </p>
        <a
          href={import.meta.env.VITE_BABYEYI_LOGIN_URL || LOGIN_FALLBACK}
          className="inline-block mt-4 text-sm font-black text-re-orange hover:underline"
        >
          Back to Babyeyi
        </a>
      </div>
    </div>
  )
}

export function PortalWrongRole({ portal }) {
  return (
    <div className="min-h-screen bg-re-bg flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg text-center space-y-3">
        <h1 className="text-lg font-black text-re-text">Portal not available for your role</h1>
        <p className="text-sm text-re-text-muted font-semibold">
          You cannot open the <strong>{portal}</strong> workspace with this account. Use the home menu to open the portal that matches your role.
        </p>
        <a href="/" className="inline-block mt-4 text-sm font-black text-re-navy hover:underline">
          Pro home
        </a>
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div className="min-h-screen bg-re-bg flex items-center justify-center font-sans">
      <div className="w-12 h-12 rounded-2xl border-4 border-amber-200 border-t-re-orange animate-spin" />
    </div>
  )
}

/**
 * Requires Babyeyi master API session + Pro school + role match.
 * Unauthenticated users are sent to Babyeyi Lite login (same credentials + school code).
 */
export default function ProGate({ portal, children }) {
  const { user, loading, proAccessEffective, roleCode } = useMasterAuth()
  const location = useLocation()

  if (loading) return <Loading />

  if (!user) {
    const next = `${window.location.origin}${location.pathname}${location.search || ''}`
    const loginPage = import.meta.env.VITE_BABYEYI_LOGIN_URL || LOGIN_FALLBACK
    const sep = loginPage.includes('?') ? '&' : '?'
    window.location.replace(`${loginPage}${sep}next=${encodeURIComponent(next)}`)
    return <Loading />
  }

  if (!proAccessEffective) {
    return <NotSubscribedToPro />
  }

  const allowed = PORTAL_ROLES[portal] || []
  if (!allowed.includes(roleCode)) {
    const homePortal = ROLE_HOME_PORTAL[roleCode]
    if (homePortal && homePortal !== portal) {
      return <Navigate to={`/${homePortal}`} replace />
    }
    return <PortalWrongRole portal={portal} />
  }

  return children
}
