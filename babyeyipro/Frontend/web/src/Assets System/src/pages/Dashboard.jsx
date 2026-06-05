import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { PlusCircle, Activity, Loader2 } from 'lucide-react'
import StatCard from '../components/StatCard'
import AddAssetWizard from '../components/AddAssetWizard'
import assetsApi from '../../../assets_portal/services/assetsApi'

export default function Dashboard() {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dash, setDash] = useState(null)

  const loadDashboard = () => {
    setLoading(true)
    assetsApi.getDashboard()
      .then(setDash)
      .catch(() => setDash(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const stats = dash?.stats
  const pieData = dash?.by_category?.length ? dash.by_category : [{ name: 'No data', value: 1, color: '#E5E7EB' }]
  const recent = dash?.recent || []

  const statCards = [
    { label: 'Total Assets', value: stats?.total_assets ?? '—', change: '' },
    { label: 'Total Value (RWF)', value: stats?.total_value != null ? Number(stats.total_value).toLocaleString() : '—', change: '' },
    { label: 'Active', value: stats?.active_count ?? '—', change: '' },
    { label: 'Under Maintenance', value: stats?.maintenance_count ?? '—', change: '' },
  ]

  return (
    <div className="space-y-6">
      <AddAssetWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onSuccess={loadDashboard} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-re-text tracking-tight">Dashboard</h2>
          <p className="text-re-text-muted text-sm mt-1 font-medium">Real-time overview of your school asset register</p>
        </div>
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#FEBF10] px-4 py-2.5 text-sm font-semibold text-[#0B1530] shadow-sm hover:bg-[#FFD24D] transition-all"
        >
          <PlusCircle size={18} /> Add New Asset
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-re-text-muted">
          <Loader2 className="animate-spin text-[#FEBF10]" size={22} />
          <span className="text-sm font-medium">Loading dashboard…</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((stat, i) => (
              <StatCard key={i} {...stat} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-re-text mb-4">Assets by category</h3>
              <ResponsiveContainer width="100%" height={280} minWidth={0}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    label={({ name, percent }) => (percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : '')}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color || '#FEBF10'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-re-text">Recently registered</h3>
                <Activity size={20} className="text-re-text-muted" />
              </div>
              <div className="space-y-3">
                {recent.length === 0 ? (
                  <p className="text-sm text-re-text-muted py-6 text-center">No assets registered yet.</p>
                ) : (
                  recent.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-re-bg transition-all">
                      <div className="w-2 h-2 rounded-full bg-[#FEBF10]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-re-text truncate">
                          {item.name || item.asset_name}
                          <span className="text-re-text-muted font-normal"> · {item.code || item.asset_code}</span>
                        </p>
                        <p className="text-xs text-re-text-muted">{item.category || 'Uncategorized'} · {item.status}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
