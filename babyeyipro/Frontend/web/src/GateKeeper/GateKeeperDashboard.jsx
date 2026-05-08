import React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Camera, ClipboardList, ShieldAlert, Undo2, UserRoundX } from 'lucide-react'
import { fetchGateScanLogs } from './gateApi'

const StatCard = ({ label, value, icon: Icon, iconClass = 'text-re-text-muted' }) => (
  <div className="p-5 flex flex-col items-center justify-center text-center border-gray-100 border-r odd:border-r even:border-r-0">
    {Icon && <Icon size={16} className={`mb-1 ${iconClass}`} />}
    <span className="text-xl md:text-2xl font-black text-re-text">{value}</span>
    <p className="text-[9px] font-black text-re-text-muted uppercase tracking-widest mt-1 opacity-60">{label}</p>
  </div>
)

export default function GateKeeperDashboard() {
  const [todayLogs, setTodayLogs] = useState([])
  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          const json = await fetchGateScanLogs(300)
          const rows = Array.isArray(json?.data) ? json.data : []
          const mapped = rows
            .filter((row) => {
              const dt = row.created_at ? new Date(row.created_at) : null
              return dt ? dt.toISOString().slice(0, 10) === todayStr : false
            })
            .map((row) => ({
              id: row.id,
              student: row.student_name || 'Unknown Student',
              class: row.class_name || '—',
              action: String(row.result_code || '').startsWith('RETURN_')
                ? 'RETURN'
                : (row.result_code === 'EXIT_ALLOWED' ? 'EXIT' : 'SCAN'),
              status: row.result_code === 'EXIT_ALLOWED'
                ? 'Allowed'
                : row.result_code === 'RETURN_ON_TIME'
                  ? 'Returned'
                  : `Denied - ${row.result_code || 'UNKNOWN'}`,
            }))
          if (mounted) setTodayLogs(mapped)
        } catch (_err) {
          if (mounted) setTodayLogs([])
        }
      })()
    return () => { mounted = false }
  }, [todayStr])

  const exits = useMemo(() => todayLogs.filter((log) => log.action === 'EXIT').length, [todayLogs])
  const returns = useMemo(() => todayLogs.filter((log) => log.action === 'RETURN').length, [todayLogs])
  const denied = useMemo(() => todayLogs.filter((log) => String(log.status || '').includes('Denied')).length, [todayLogs])
  const outsideNow = Math.max(0, exits - returns)
  const recentStudents = todayLogs.slice(0, 8)

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">
      <div className="relative w-full min-h-[200px] sm:min-h-[220px] overflow-hidden bg-[#c87800]">
        <div className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none" aria-hidden />
        <div className="absolute -top-14 -right-14 w-[15rem] h-[15rem] rounded-full border border-white/[0.06] pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" aria-hidden />

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-10 sm:pt-12 pb-20 sm:pb-24 flex items-center justify-between">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-1 rounded-full bg-[#FEBF10]" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FEBF10]">Gate Portal</p>
            </div>
            <h1 className="text-xl md:text-3xl font-semibold text-white tracking-tight leading-none mb-1 mt-1 uppercase">
              Welcome, Gate Team
            </h1>
            <p className="text-[10px] sm:text-[11px] font-medium text-white/60 tracking-wider">
              Gate operations summary and live status
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-5 md:px-8 -mt-12 sm:-mt-16 relative z-20 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-[24px] shadow-2xl border border-black/5 overflow-hidden grid grid-cols-2">
              <StatCard label="Total Exits" value={exits} icon={ArrowRight} iconClass="text-emerald-600" />
              <StatCard label="Returned" value={returns} icon={Undo2} iconClass="text-blue-600" />
              <StatCard label="Denied" value={denied} icon={ShieldAlert} iconClass="text-red-600" />
              <StatCard label="Outside Now" value={outsideNow} icon={UserRoundX} iconClass="text-amber-600" />
            </div>

            <div className="bg-white rounded-[24px] shadow-sm border border-black/5 p-5 space-y-4">
              <h3 className="text-sm font-black text-re-text uppercase opacity-80">Quick access</h3>
              <div className="grid grid-cols-1 divide-y-2 divide-gray-200 md:divide-y-0 md:grid-cols-2 gap-3">
                <Link to="scanner" className="p-2.5 md:rounded-lg hover:bg-re-bg transition-all group">
                  <h4 className="text-sm font-black text-re-text inline-flex items-center gap-2">
                    <Camera size={14} className="text-[#000435]" />
                    Open Scanner
                  </h4>
                  <p className="text-[10px] text-re-text-muted font-bold opacity-60 leading-snug pr-2">
                    Scan student code and process entry/exit quickly.
                  </p>
                </Link>
                <Link to="logs" className="p-2.5 md:rounded-lg hover:bg-re-bg transition-all group">
                  <h4 className="text-sm font-black text-re-text inline-flex items-center gap-2">
                    <ClipboardList size={14} className="text-[#000435]" />
                    View Date Logs
                  </h4>
                  <p className="text-[10px] text-re-text-muted font-bold opacity-60 leading-snug pr-2">
                    {todayLogs.length} logs captured today.
                  </p>
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-5 lg:sticky lg:top-20 h-fit">
            <div className="bg-white rounded-[24px] shadow-2xl border border-black/5 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-0.5 h-3 bg-re-purple rounded-full" />
                <h3 className="text-xs font-black text-re-text uppercase tracking-widest opacity-70">Students outside</h3>
              </div>
              <div className="space-y-2">
                {recentStudents.length === 0 && (
                  <p className="text-xs font-bold text-re-text-muted opacity-60">No gate activity yet today.</p>
                )}
                {recentStudents.map((student) => (
                  <div key={student.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-re-bg">
                    <span className="text-[8px] font-black min-w-[32px] pt-0.5 text-re-text-muted opacity-40">LOG</span>
                    <div>
                      <p className="font-black text-re-text text-xs leading-none tracking-tight">{student.student}</p>
                      <p className="text-[8px] text-re-text-muted font-bold uppercase tracking-widest opacity-40 mt-1">
                        {student.class} · {student.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}