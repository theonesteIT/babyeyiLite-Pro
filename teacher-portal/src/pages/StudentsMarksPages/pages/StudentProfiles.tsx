import { useState } from 'react';
import { Search, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { students } from '../data/mockData';

export default function StudentProfiles() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(students[0]);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Student Profiles</h1>
        <p className="text-gray-500 text-sm mt-1">View detailed student information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search students..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none"
                />
              </div>
            </div>
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {filtered.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${selected.id === s.id ? 'bg-amber/5 border-l-2 border-amber' : 'hover:bg-gray-50'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center text-sm font-bold">
                    {s.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.class}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-navy text-white flex items-center justify-center text-xl font-bold">
                {selected.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className="font-bold text-navy text-lg">{selected.name}</h3>
                <p className="text-sm text-gray-500">{selected.class}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail size={16} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm">{selected.name.toLowerCase().replace(' ', '.')}@school.rw</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone size={16} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm">+250 7XX XXX XXX</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar size={16} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Date of Birth</p>
                  <p className="text-sm">January 15, 2008</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPin size={16} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="text-sm">Kigali, Rwanda</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-500">Attendance</p>
                <p className="text-xl font-bold text-blue-600">{selected.attendance}%</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-500">Average</p>
                <p className="text-xl font-bold text-green-600">{selected.average}%</p>
              </div>
              <div className="text-center p-4 bg-amber/10 rounded-lg">
                <p className="text-xs text-gray-500">Position</p>
                <p className="text-xl font-bold text-amber">#{selected.position}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
