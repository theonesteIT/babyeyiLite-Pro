export default function StatCard({ label, value, change, color }) {
  const isPositive = change?.startsWith('+')
  const isNegative = change?.startsWith('-')
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-sm text-re-text-muted font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-re-text tracking-tight">{value}</p>
      {change && change !== '-' && (
        <p className={`text-xs mt-1 font-medium ${isPositive ? 'text-emerald-600' : isNegative ? 'text-red-500' : 'text-gray-400'}`}>
          {change} from last month
        </p>
      )}
    </div>
  )
}
