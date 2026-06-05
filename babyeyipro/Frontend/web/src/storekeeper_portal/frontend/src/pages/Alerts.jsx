import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, AlertTriangle, Apple, Clock, CheckCircle, X, Trash2, ChevronDown,
  Loader2, RefreshCw, Settings2, PackageX, CalendarClock, Sparkles, Save,
} from 'lucide-react'
import StorekeeperPageShell from '../components/StorekeeperPageShell'
import StorekeeperToast from '../components/StorekeeperToast'
import {
  fetchFoodAlerts,
  updateFoodAlertSettings,
  DEFAULT_FOOD_ALERT_SETTINGS,
} from '../services/foodAlertService'

const DISMISSED_KEY = 'storekeeper_dismissed_food_alerts'
const READ_KEY = 'storekeeper_read_food_alerts'

function loadJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function saveJson(key, ids) {
  localStorage.setItem(key, JSON.stringify(ids))
}

const severityConfig = {
  high: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700', label: 'High' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700', label: 'Medium' },
  low: { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700', label: 'Low' },
}

const alertIcons = {
  'low-stock': { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
  'out-of-stock': { icon: PackageX, color: 'text-red-600', bg: 'bg-red-100' },
  expiring: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
  expired: { icon: CalendarClock, color: 'text-red-600', bg: 'bg-red-100' },
}

const FILTER_TABS = [
  { id: 'all', label: 'All', icon: Bell },
  { id: 'low-stock', label: 'Low stock', icon: AlertTriangle },
  { id: 'out-of-stock', label: 'Out of stock', icon: PackageX },
  { id: 'expiring', label: 'Expiring', icon: Clock },
  { id: 'expired', label: 'Expired', icon: CalendarClock },
]

const inputClass =
  'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#000435] focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all'

export default function Alerts() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [dismissed, setDismissed] = useState(() => loadJson(DISMISSED_KEY))
  const [readIds, setReadIds] = useState(() => loadJson(READ_KEY))
  const [alertsRaw, setAlertsRaw] = useState([])
  const [settings, setSettings] = useState(DEFAULT_FOOD_ALERT_SETTINGS)
  const [settingsDraft, setSettingsDraft] = useState(DEFAULT_FOOD_ALERT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showMenu, setShowMenu] = useState(null)
  const [toast, setToast] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { alerts, settings: s } = await fetchFoodAlerts()
      setAlertsRaw(alerts)
      setSettings(s)
      setSettingsDraft(s)
    } catch (e) {
      setToast({ message: e.message || 'Failed to load food alerts', type: 'error' })
      setAlertsRaw([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const alerts = useMemo(() => {
    return alertsRaw
      .filter((a) => !dismissed.includes(a.id))
      .map((a) => ({ ...a, read: readIds.includes(a.id) }))
  }, [alertsRaw, dismissed, readIds])

  const filtered = activeFilter === 'all' ? alerts : alerts.filter((a) => a.type === activeFilter)
  const unreadCount = alerts.filter((a) => !a.read).length

  const stats = useMemo(() => ({
    high: alerts.filter((a) => a.severity === 'high' && !a.read).length,
    low: alerts.filter((a) => a.type === 'low-stock' && !a.read).length,
    out: alerts.filter((a) => a.type === 'out-of-stock' && !a.read).length,
    expiry: alerts.filter((a) => (a.type === 'expiring' || a.type === 'expired') && !a.read).length,
  }), [alerts])

  const markRead = (id) => {
    const next = readIds.includes(id) ? readIds : [...readIds, id]
    setReadIds(next)
    saveJson(READ_KEY, next)
  }

  const markAllRead = () => {
    const next = alerts.map((a) => a.id)
    setReadIds(next)
    saveJson(READ_KEY, next)
  }

  const dismissAlert = (id) => {
    const next = [...dismissed, id]
    setDismissed(next)
    saveJson(DISMISSED_KEY, next)
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const saved = await updateFoodAlertSettings({
        low_stock_enabled: !!settingsDraft.low_stock_enabled,
        expiry_alerts_enabled: !!settingsDraft.expiry_alerts_enabled,
        expiry_alert_days: Math.max(1, Number(settingsDraft.expiry_alert_days) || 14),
      })
      setSettings(saved)
      setSettingsDraft(saved)
      setShowSettings(false)
      await loadData()
      setToast({ message: 'Alert settings saved', type: 'success' })
    } catch (e) {
      setToast({ message: e.message || 'Failed to save settings', type: 'error' })
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <StorekeeperPageShell
      titleLine="Food Alerts"
      subtitle={unreadCount > 0 ? `${unreadCount} unread food alerts` : 'Food stock & expiry monitoring'}
      icon={Bell}
      rightSlot={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/15 transition"
          >
            <Settings2 size={14} />
            Configure
          </button>
          <button
            type="button"
            onClick={markAllRead}
            disabled={!unreadCount}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/15 transition disabled:opacity-40"
          >
            <CheckCircle size={14} />
            Mark all read
          </button>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/15 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      }
    >
      <StorekeeperToast message={toast?.message} type={toast?.type} onDismiss={() => setToast(null)} />

      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#000435] via-[#0d1654] to-[#1a2876] p-5 text-white shadow-lg">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl" />
          <div className="relative flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/90 flex items-center gap-1">
                <Sparkles size={10} /> Storekeeper · Food alerts
              </p>
              <h2 className="text-lg font-bold mt-1">Quantity & expiry monitoring</h2>
              <p className="text-xs text-white/60 mt-1 max-w-xl">
                Low-stock alerts use <strong className="text-white/90">min level</strong> on each food batch (Stock In).
                Expiry alerts use the <strong className="text-white/90">expiry date</strong> and days-ahead setting below.
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10">
              <Apple size={18} className="text-emerald-300" />
              <span className="text-xs font-bold">{alerts.length} active</span>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-[#000435] flex items-center gap-2">
                    <Settings2 size={16} className="text-amber-500" />
                    Alert configuration
                  </h3>
                  <button type="button" onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                    <X size={16} className="text-gray-400" />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/50 cursor-pointer hover:border-amber-200 transition">
                    <input
                      type="checkbox"
                      checked={!!settingsDraft.low_stock_enabled}
                      onChange={(e) => setSettingsDraft((s) => ({ ...s, low_stock_enabled: e.target.checked }))}
                      className="mt-1 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                    />
                    <div>
                      <p className="text-sm font-bold text-[#000435]">Low stock alerts</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Notify when remaining quantity is below the batch min level (aggregated per item + unit).
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/50 cursor-pointer hover:border-amber-200 transition">
                    <input
                      type="checkbox"
                      checked={!!settingsDraft.expiry_alerts_enabled}
                      onChange={(e) => setSettingsDraft((s) => ({ ...s, expiry_alerts_enabled: e.target.checked }))}
                      className="mt-1 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                    />
                    <div>
                      <p className="text-sm font-bold text-[#000435]">Expiry alerts</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Warn before expiry and flag expired batches with stock remaining.
                      </p>
                    </div>
                  </label>
                </div>
                <div className="max-w-xs">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">
                    Days before expiry to alert
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={settingsDraft.expiry_alert_days}
                    onChange={(e) => setSettingsDraft((s) => ({ ...s, expiry_alert_days: e.target.value }))}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Currently: {settings.expiry_alert_days} days (live)</p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#000435] text-white text-xs font-bold uppercase disabled:opacity-50"
                >
                  {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save settings
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'High priority', value: stats.high, bg: 'from-red-50 to-white', accent: 'text-red-600' },
            { label: 'Low stock', value: stats.low, bg: 'from-amber-50 to-white', accent: 'text-amber-600' },
            { label: 'Out of stock', value: stats.out, bg: 'from-gray-50 to-white', accent: 'text-gray-600' },
            { label: 'Expiry', value: stats.expiry, bg: 'from-orange-50 to-white', accent: 'text-orange-600' },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border border-gray-100 p-4 bg-gradient-to-br ${s.bg}`}>
              <p className="text-[10px] font-bold uppercase text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold mt-2 ${s.accent}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex overflow-x-auto gap-1 pb-1">
          {FILTER_TABS.map((at) => (
            <button
              key={at.id}
              type="button"
              onClick={() => setActiveFilter(at.id)}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm rounded-xl transition ${
                activeFilter === at.id
                  ? 'bg-[#000435] text-white font-bold shadow-sm'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 border border-transparent'
              }`}
            >
              <at.icon size={15} />
              {at.label}
              {at.id === 'all' && unreadCount > 0 && (
                <span className="text-[10px] bg-amber-400 text-[#000435] px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center text-gray-400">
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
              <p className="text-[#000435] font-bold">No food alerts</p>
              <p className="text-xs text-gray-400 mt-1">
                {activeFilter === 'all'
                  ? 'Stock levels and expiry dates look good for your filters.'
                  : 'No alerts in this category.'}
              </p>
            </div>
          ) : (
            <div className="p-4 sm:p-5 space-y-3">
              {filtered.map((alert) => {
                const sev = severityConfig[alert.severity] || severityConfig.low
                const icon = alertIcons[alert.type] || alertIcons['low-stock']
                const Icon = icon.icon
                return (
                  <div key={alert.id} className={!alert.read ? 'ring-2 ring-amber-200/80 rounded-2xl' : ''}>
                    <div className={`rounded-2xl border ${sev.border} ${sev.bg} p-4 transition hover:shadow-md group`}>
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-xl ${icon.bg} shrink-0`}>
                          <Icon size={18} className={icon.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold text-[#000435]">{alert.title}</h3>
                                {!alert.read && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-white/80 text-gray-500">
                                  {alert.category || 'Food'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">{alert.desc}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${sev.badge}`}>
                                {sev.label}
                              </span>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setShowMenu(showMenu === alert.id ? null : alert.id)}
                                  className="p-1.5 hover:bg-black/5 rounded-lg opacity-0 group-hover:opacity-100 transition"
                                >
                                  <ChevronDown size={14} className="text-gray-400" />
                                </button>
                                {showMenu === alert.id && (
                                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-20 w-40">
                                    {!alert.read && (
                                      <button
                                        type="button"
                                        onClick={() => { markRead(alert.id); setShowMenu(null) }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                                      >
                                        <CheckCircle size={12} /> Mark read
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => { dismissAlert(alert.id); setShowMenu(null) }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 size={12} /> Dismiss
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] font-medium uppercase text-gray-400">
                            <span>{alert.time}</span>
                            {alert.unit && alert.current != null && (
                              <span>
                                On hand: <strong className="text-[#000435]">{alert.current} {alert.unit}</strong>
                              </span>
                            )}
                            {alert.min > 0 && (
                              <span>Min: <strong className="text-[#000435]">{alert.min} {alert.unit}</strong></span>
                            )}
                            {alert.store_location && (
                              <span>Location: <strong className="text-[#000435]">{alert.store_location}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </StorekeeperPageShell>
  )
}
