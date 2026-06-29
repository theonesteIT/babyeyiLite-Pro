import { useState, useEffect } from 'react'
import { Save, Bell, Shield, User, Barcode, Settings as SettingsIcon } from 'lucide-react'
import StorekeeperPageShell from '../components/StorekeeperPageShell'
import { fetchStoreAcademicSettings } from '../services/academicSettingsService'

const SETTINGS_KEY = 'storekeeper_settings'

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') } catch { return {} }
}

const defaults = {
  schoolName: 'Example Secondary School',
  academicYear: '2026',
  currentTerm: 'Term I',
  currency: 'RWF (Rwandan Franc)',
  lowStockAlerts: true,
  outOfStockAlerts: true,
  expiringFoodAlerts: true,
  pendingApprovalAlerts: true,
  storeKeeperEnabled: true,
  accountantEnabled: true,
  managerEnabled: true,
  barcodeEnabled: false,
}

export default function Settings() {
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState({ ...defaults, ...loadSettings() })

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchStoreAcademicSettings()
        if (res.academicYear) update('academicYear', res.academicYear)
        if (res.currentTerm) update('currentTerm', res.currentTerm)
      } catch (_) { /* empty */ }
    })()
  }, [])

  return (
    <StorekeeperPageShell
      titleLine="Settings"
      subtitle="Configure system preferences and permissions"
      icon={SettingsIcon}
    >
      <div className="store-panel-sheet p-4 sm:p-6 space-y-6 max-w-3xl mx-auto w-full">
      <div className="space-y-6">
        <div className="store-section-card">
          <div className="store-section-head">
            <div className="store-section-icon"><User size={18} /></div>
            <h3 className="font-bold text-[#000435]">School Information</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="store-label">School Name</label>
              <input value={settings.schoolName} onChange={e => update('schoolName', e.target.value)}
                className="store-input" />
            </div>
            <div>
              <label className="store-label">Academic Year</label>
              <select value={settings.academicYear} onChange={e => update('academicYear', e.target.value)}
                className="store-input bg-white">
                <option>2025</option><option>2026</option><option>2027</option>
              </select>
            </div>
            <div>
              <label className="store-label">Current Term</label>
              <select value={settings.currentTerm} onChange={e => update('currentTerm', e.target.value)}
                className="store-input bg-white">
                <option>Term I</option><option>Term II</option><option>Term III</option>
              </select>
            </div>
            <div>
              <label className="store-label">Currency</label>
              <select value={settings.currency} onChange={e => update('currency', e.target.value)}
                className="store-input bg-white">
                <option>RWF (Rwandan Franc)</option>
                <option>KES (Kenyan Shilling)</option>
                <option>UGX (Ugandan Shilling)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="store-section-card">
          <div className="store-section-head">
            <div className="store-section-icon"><Bell size={18} /></div>
            <h3 className="font-bold text-[#000435]">Notifications & Alerts</h3>
          </div>
          <div className="space-y-3">
            {[
              { key: 'lowStockAlerts', label: 'Low Stock Alerts', desc: 'Notify when stock falls below minimum level' },
              { key: 'outOfStockAlerts', label: 'Out of Stock Alerts', desc: 'Notify when items are completely out of stock' },
              { key: 'expiringFoodAlerts', label: 'Expiring Food Alerts', desc: 'Notify when food items are near expiration' },
              { key: 'pendingApprovalAlerts', label: 'Pending Approval', desc: 'Notify when items need your approval' },
            ].map(n => (
              <div key={n.key} className="flex items-center justify-between py-2">
                <div><p className="text-sm text-[#000435]">{n.label}</p><p className="text-xs text-gray-400">{n.desc}</p></div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={settings[n.key]} onChange={e => update(n.key, e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-400" />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="store-section-card">
          <div className="store-section-head">
            <div className="store-section-icon"><Shield size={18} /></div>
            <h3 className="font-bold text-[#000435]">Approval Workflow</h3>
          </div>
          <div className="space-y-3">
            {[
              { key: 'storeKeeperEnabled', role: 'Store Keeper', color: 'bg-amber-400' },
              { key: 'accountantEnabled', role: 'Accountant', color: 'bg-blue-500' },
              { key: 'managerEnabled', role: 'School Manager', color: 'bg-[#000435]' },
            ].map(r => (
              <div key={r.key} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full ${r.color} flex items-center justify-center text-white text-xs font-bold`}>{r.role[0]}</div>
                <div className="flex-1"><p className="text-sm text-[#000435]">{r.role}</p><p className="text-xs text-gray-400">Full access to approve requests</p></div>
                <select value={settings[r.key] ? 'Enabled' : 'Disabled'} onChange={e => update(r.key, e.target.value === 'Enabled')}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-amber-300 outline-none transition">
                  <option>Enabled</option><option>Disabled</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="store-section-card">
          <div className="store-section-head">
            <div className="store-section-icon"><Barcode size={18} /></div>
            <h3 className="font-bold text-[#000435]">Barcode / QR Code</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#000435]">Enable Barcode Scanning</p>
              <p className="text-xs text-gray-400">Scan barcodes for quick stock in/out</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={settings.barcodeEnabled} onChange={e => update('barcodeEnabled', e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-400" />
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} className="inline-flex items-center gap-2 bg-[#FEBF10] text-[#000435] px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-amber-300 transition shadow-lg shadow-amber-400/20">
          <Save size={16} /> {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
      </div>
    </StorekeeperPageShell>
  )
}
