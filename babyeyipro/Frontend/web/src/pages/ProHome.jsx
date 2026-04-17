import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMasterAuth } from '../context/MasterAuthContext'
import { NotSubscribedToPro } from '../components/ProGate'

function Loading() {
  return (
    <div className="min-h-screen bg-re-bg flex items-center justify-center font-sans">
      <div className="w-12 h-12 rounded-2xl border-4 border-amber-200 border-t-re-orange animate-spin" />
    </div>
  )
}

export default function ProHome() {
  const { user, loading, proAccessEffective } = useMasterAuth()
  const location = useLocation()
  const loginPage = import.meta.env.VITE_BABYEYI_LOGIN_URL || 'http://localhost:5173/login'

  if (loading) return <Loading />

  if (!user) {
    const next = `${window.location.origin}${location.pathname}${location.search || ''}`
    const sep = loginPage.includes('?') ? '&' : '?'
    window.location.replace(`${loginPage}${sep}next=${encodeURIComponent(next)}`)
    return <Loading />
  }

  if (!proAccessEffective) {
    return <NotSubscribedToPro />
  }

  const cards = [
    { to: '/dos', label: 'DOS (Directorate of Studies)', desc: 'Academic oversight, timetables, marks' },
    { to: '/manager', label: 'School Manager', desc: 'Registry, finance, HR, reports' },
    { to: '/accountant', label: 'Accountant', desc: 'Fees, invoices, expenses, requisitions, payroll' },
    { to: '/storekeeper', label: 'Storekeeper', desc: 'Inventory, suppliers, stock movements, requisitions' },
    { to: '/librarian', label: 'Librarian', desc: 'Books, members, borrowing, returns, reports' },
    { to: '/discipline-staff', label: 'Discipline Staff', desc: 'Conduct, discipline reports, student permissions' },
    { to: '/teacher', label: 'Teacher', desc: 'Classes, attendance, gradebook' },
    { to: '/discipline', label: 'Discipline / Conduct', desc: 'Behaviour and conduct overview' },
  ]

  return (
    <div className="min-h-screen bg-re-bg flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-re-text tracking-tight">Babyeyi Pro</h1>
          <p className="text-sm text-re-text-muted font-semibold">Signed in with your Babyeyi account — choose a workspace</p>
        </div>
        <nav className="grid gap-3">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="block rounded-2xl border border-black/5 bg-white p-4 shadow-sm hover:shadow-md hover:border-re-orange/30 transition-all"
            >
              <p className="font-black text-re-text text-sm">{c.label}</p>
              <p className="text-[11px] text-re-text-muted mt-1">{c.desc}</p>
            </Link>
          ))}
        </nav>
        <p className="text-[10px] text-center text-re-text-muted/70">
          API: {import.meta.env.VITE_API_URL || 'http://localhost:5100'}
        </p>
      </div>
    </div>
  )
}
