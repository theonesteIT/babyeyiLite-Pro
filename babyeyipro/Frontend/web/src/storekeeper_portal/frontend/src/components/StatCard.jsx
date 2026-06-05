export default function StatCard({ title, value, icon: Icon, trend, color = 'amber' }) {
  const colors = {
    amber: 'bg-[#FEBF10]/10 text-[#c87800] border-[#FEBF10]/30',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  }
  return (
    <div className="store-panel-sheet p-4 sm:p-5 hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0">
          <p className="text-[10px] font-medium text-re-text-muted uppercase tracking-wider">{title}</p>
          <p className="text-xl sm:text-2xl font-medium text-re-text tabular-nums">{value}</p>
          {trend && (
            <p className={`text-xs font-medium ${trend.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl border shrink-0 ${colors[color]}`}>
          <Icon size={22} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  )
}
