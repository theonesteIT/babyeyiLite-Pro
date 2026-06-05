import { useState } from 'react'
import { Users as UsersIcon, Plus, Shield, UserCog, Calculator, ClipboardCheck, Wrench, Building2, Search } from 'lucide-react'
import { users } from '../data/mockData'

const roles = [
  { name: 'Super Admin', icon: Shield, desc: 'Full system access', users: 1 },
  { name: 'Asset Manager', icon: UserCog, desc: 'Manage all assets', users: 3 },
  { name: 'Accountant', icon: Calculator, desc: 'Financial reports', users: 2 },
  { name: 'Auditor', icon: ClipboardCheck, desc: 'Asset verification', users: 2 },
  { name: 'Technician', icon: Wrench, desc: 'Maintenance tasks', users: 4 },
  { name: 'Department Head', icon: Building2, desc: 'Department assets', users: 5 },
]

const permissions = ['View', 'Create', 'Edit', 'Delete', 'Approve', 'Audit']

export default function UsersPage() {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy">User & Role Management</h2>
          <p className="text-gray-500 text-sm mt-1">Manage users, roles, and permissions</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add User
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-navy mb-4">Add New User</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input type="text" className="input-field" placeholder="Enter name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" className="input-field" placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select className="select-field">
                {roles.map(r => <option key={r.name}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-primary">Save User</button>
            <button onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
          </div>
        </div>
      )}

      {/* Roles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role, i) => {
          const Icon = role.icon
          return (
            <div key={i} className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Icon size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-navy">{role.name}</h3>
                  <p className="text-xs text-gray-500">{role.desc}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{role.users} user(s)</p>
            </div>
          )
        })}
      </div>

      {/* Permissions Matrix */}
      <div className="card">
        <h3 className="text-lg font-semibold text-navy mb-4">Permissions Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Role</th>
                {permissions.map(p => <th key={p} className="table-header text-center">{p}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roles.map((role, i) => {
                const Icon = role.icon
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="table-cell font-medium text-navy flex items-center gap-2">
                      <Icon size={16} className="text-amber-500" /> {role.name}
                    </td>
                    {permissions.map((p, j) => (
                      <td key={j} className="table-cell text-center">
                        <input type="checkbox" defaultChecked={i === 0 || (i === 1 && j < 4) || (i === 4 && j < 3)} className="rounded text-amber-500 focus:ring-amber-500" />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative w-full sm:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search users..." className="input-field pl-10" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><th className="table-header">Name</th><th className="table-header">Email</th><th className="table-header">Role</th><th className="table-header">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium text-navy">{u.name}</td>
                  <td className="table-cell">{u.email}</td>
                  <td className="table-cell">{u.role}</td>
                  <td className="table-cell"><span className="badge-active">{u.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
