import { useState } from 'react'
import { Settings as SettingsIcon, Building2, QrCode, DollarSign, Bell, Mail, Smartphone, Save } from 'lucide-react'

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('company')

  const sections = [
    { id: 'company', label: 'Company Information', icon: Building2 },
    { id: 'asset', label: 'Asset Settings', icon: QrCode },
    { id: 'financial', label: 'Financial Settings', icon: DollarSign },
    { id: 'notification', label: 'Notification Settings', icon: Bell },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy">Settings</h2>
        <p className="text-gray-500 text-sm mt-1">Configure system preferences and company details</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="card p-2 space-y-1">
            {sections.map((s) => {
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeSection === s.id ? 'bg-amber-500 text-navy' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={18} /> {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {activeSection === 'company' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-navy mb-4">Company Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center text-2xl font-bold text-amber-600">A</div>
                    <button className="btn-outline text-sm">Upload Logo</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input type="text" className="input-field" defaultValue="AssetPro Management" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input type="text" className="input-field" defaultValue="123 Business Avenue, Suite 100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="text" className="input-field" defaultValue="+1 (555) 123-4567" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" className="input-field" defaultValue="info@assetpro.com" />
                  </div>
                </div>
              </div>
              <button className="btn-primary mt-6 flex items-center gap-2"><Save size={16} /> Save Changes</button>
            </div>
          )}

          {activeSection === 'asset' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-navy mb-4">Asset Settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asset Code Prefix</label>
                  <input type="text" className="input-field" defaultValue="AST" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">QR Format</label>
                  <select className="select-field"><option>QR Code v4</option><option>QR Code v8</option><option>QR Code v12</option></select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode Format</label>
                  <select className="select-field"><option>Code 128</option><option>Code 39</option><option>EAN-13</option></select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Depreciation Method</label>
                  <select className="select-field"><option>Straight Line</option><option>Declining Balance</option><option>Double Declining</option></select>
                </div>
              </div>
              <button className="btn-primary mt-6 flex items-center gap-2"><Save size={16} /> Save Changes</button>
            </div>
          )}

          {activeSection === 'financial' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-navy mb-4">Financial Settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select className="select-field"><option>USD ($)</option><option>EUR (€)</option><option>GBP (£)</option></select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Depreciation Rules</label>
                  <select className="select-field"><option>Straight Line (Default)</option><option>Declining Balance</option><option>Double Declining</option></select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Useful Life (Years)</label>
                  <input type="number" className="input-field" defaultValue={5} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salvage Value (%)</label>
                  <input type="number" className="input-field" defaultValue={10} />
                </div>
              </div>
              <button className="btn-primary mt-6 flex items-center gap-2"><Save size={16} /> Save Changes</button>
            </div>
          )}

          {activeSection === 'notification' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-navy mb-4">Notification Settings</h3>
              <div className="space-y-4">
                {[
                  { icon: Mail, label: 'Email', desc: 'Send email notifications for alerts', checked: true },
                  { icon: Smartphone, label: 'SMS', desc: 'Send text message alerts', checked: false },
                  { icon: Bell, label: 'Push Notifications', desc: 'In-app browser notifications', checked: true },
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon size={20} className="text-amber-500" />
                        <div>
                          <p className="font-medium text-sm text-navy">{item.label}</p>
                          <p className="text-xs text-gray-500">{item.desc}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={item.checked} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>
                  )
                })}
              </div>
              <button className="btn-primary mt-6 flex items-center gap-2"><Save size={16} /> Save Changes</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
