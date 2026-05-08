import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Fingerprint, GraduationCap, Loader2, ArrowRight } from 'lucide-react';
import SmartAccessSchoolToolbar from './SmartAccessSchoolToolbar';
import { api } from './smartAccessApi';
import { BABYEYI_NAVY } from '../../../theme/babyeyiDashboardTheme';

function BtnTab({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider border-2 transition-all ${
        active
          ? 'border-amber-400 bg-amber-50 text-[#000435]'
          : 'border-amber-100 bg-white text-amber-800 hover:border-amber-200'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

export default function SuperAdminDashboardSchoolPeek({ navigate }) {
  const [school, setSchool] = useState(null);
  const [tab, setTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);

  const sid = school?.id;

  const load = useCallback(async () => {
    if (!sid) {
      setStudents([]);
      setStaff([]);
      return;
    }
    setLoading(true);
    try {
      if (tab === 'students') {
        const { data } = await api.get('/students', { params: { school_id: sid, limit: 80, page: 1 } });
        setStudents(data.success ? data.data || [] : []);
      } else {
        const { data } = await api.get('/school/staff', { params: { school_id: sid } });
        const rows = data.success ? data.data || [] : [];
        setStaff(rows.slice(0, 120));
      }
    } catch {
      if (tab === 'students') setStudents([]);
      else setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [sid, tab]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-white border-2 border-amber-100 rounded-2xl shadow-lg p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-gray-900 text-sm flex items-center gap-2 uppercase tracking-wide">
            <Building2 className="w-5 h-5" style={{ color: BABYEYI_NAVY }} />
            School explorer
          </h3>
          <p className="text-xs text-amber-800 font-semibold mt-1 max-w-xl">
            Pick any school by location, preview learners and staff, then open Smart Access with that school loaded.
          </p>
        </div>
      </div>

      <SmartAccessSchoolToolbar selectedSchoolId={sid} onSchoolChange={setSchool} activeSchool={school} />

      {!sid && (
        <p className="text-xs font-semibold text-amber-700 border border-dashed border-amber-200 rounded-xl px-4 py-6 text-center">
          Select a school above to browse its directory.
        </p>
      )}

      {sid && (
        <>
          <div className="flex flex-wrap gap-2">
            <BtnTab
              active={tab === 'students'}
              icon={GraduationCap}
              label="Students"
              onClick={() => setTab('students')}
            />
            <BtnTab
              active={tab === 'staff'}
              icon={Fingerprint}
              label="Staff"
              onClick={() => setTab('staff')}
            />
            <button
              type="button"
              onClick={() => navigate(`/superadmin/smart-access/students?school_id=${sid}`)}
              className="ml-auto inline-flex items-center gap-1 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-md hover:opacity-95"
              style={{ background: `linear-gradient(135deg, ${BABYEYI_NAVY}, #111827)` }}
            >
              Student Smart Access <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => navigate(`/superadmin/smart-access/staff?school_id=${sid}`)}
              className="inline-flex items-center gap-1 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wide border-2 border-amber-300 text-[#000435] bg-amber-50 hover:bg-amber-100"
            >
              Staff Smart Access <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="rounded-xl border border-amber-100 overflow-hidden max-h-[340px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-14 text-amber-800 font-semibold gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading…
              </div>
            ) : tab === 'students' ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-amber-50/90 sticky top-0 text-[10px] font-black uppercase text-amber-800">
                  <tr>
                    <th className="py-3 px-3">Learner</th>
                    <th className="py-3 px-3 hidden sm:table-cell">Code</th>
                    <th className="py-3 px-3 hidden md:table-cell">Class</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr><td colSpan={3} className="py-10 text-center text-amber-700 font-semibold">No rows (or restricted).</td></tr>
                  ) : (
                    students.map((r) => (
                      <tr key={r.id} className="border-t border-amber-50 hover:bg-amber-50/40">
                        <td className="py-2.5 px-3 font-bold text-gray-900">
                          {`${r.first_name || ''} ${r.last_name || ''}`.trim() || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-gray-600 hidden sm:table-cell">
                          {r.student_uid || r.student_code || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-600 hidden md:table-cell">{r.class_name || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-amber-50/90 sticky top-0 text-[10px] font-black uppercase text-amber-800">
                  <tr>
                    <th className="py-3 px-3">Name</th>
                    <th className="py-3 px-3 hidden sm:table-cell">Role</th>
                    <th className="py-3 px-3 hidden md:table-cell">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.length === 0 ? (
                    <tr><td colSpan={3} className="py-10 text-center text-amber-700 font-semibold">No staff found.</td></tr>
                  ) : (
                    staff.map((r) => (
                      <tr key={r.id} className="border-t border-amber-50 hover:bg-amber-50/40">
                        <td className="py-2.5 px-3 font-bold text-gray-900">
                          {`${r.first_name || ''} ${r.last_name || ''}`.trim() || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-xs font-black uppercase text-amber-900 hidden sm:table-cell">
                          {r.role_code || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-xs font-mono text-gray-600 hidden md:table-cell">{r.email || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
