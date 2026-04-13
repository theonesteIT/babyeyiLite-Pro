/**
 * Full school-manager toolkit from Lite (BabyeyiSystem), embedded in the Pro manager portal.
 * Same APIs and session as the rest of Pro — professional tab shell over legacy-accurate modules.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { h } from '../utils/href';
import { SCHOOL_CONSOLE_TAB_IDS } from '../config/schoolConsoleNav';

import DashboardPage from './schoolLite/Dashboard';
import BabyeyiApp from './schoolLite/Babyeyi';
import BabyeyiList from './schoolLite/BabyeyiList';
import StudentsPage from './schoolLite/StudentsPage';
import StudentTransferPage from './schoolLite/StudentTransferPage';
import SchoolWorkersPage from './schoolLite/SchoolWorkersPage';
import SchoolMiniWebsitePage from './schoolLite/SchoolMiniWebsitePage';
import {
  RequestsPage,
  DocumentsPage,
  AnalyticsPage,
  NotificationsPage,
  SettingsPage,
  AuditPage,
} from './schoolLite/OtherPages';
import { TRANSLATIONS, SAMPLE_NOTIFICATIONS } from './schoolLite/utils/constants';
import { Toast } from './schoolLite/UI';

const DEFAULT_PROFILE = {
  name: 'School Name',
  headTeacher: '',
  district: '',
  sector: '',
  category: '',
  level: '',
  email: '',
  phone: '',
  defaultLang: 'en',
  defaultYear: '2024-2025',
  logo: null,
  directorSig: null,
  accountantSig: null,
  stamp: null,
};

export default function SchoolLiteSuite() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const auth = useAuth();
  const manager = auth.manager || auth.user;

  const [tab, setTab] = useState(() => {
    try {
      const q =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('tab')
          : null;
      return q && SCHOOL_CONSOLE_TAB_IDS.has(q) ? q : 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [toasts, setToasts] = useState([]);
  const [notifCount, setNotifCount] = useState(
    SAMPLE_NOTIFICATIONS.filter((n) => !n.read).length
  );
  const [schoolProfile, setSchoolProfile] = useState(DEFAULT_PROFILE);
  const [lang] = useState('en');

  const toast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  }, []);

  const removeToast = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  const session = {
    userId: manager?.id ?? null,
    userName: manager ? `${manager.first_name || ''} ${manager.last_name || ''}`.trim() : null,
    userEmail: manager?.email ?? null,
    userPhoto: manager?.photo ?? null,
    userRole: manager?.role?.code ?? manager?.role_code ?? null,
    schoolId: manager?.school?.id ?? manager?.school_id ?? null,
    schoolName: manager?.school?.name ?? manager?.school_name ?? null,
    schoolCode: manager?.school?.code ?? manager?.school_code ?? null,
    schoolDistrict: manager?.school?.district ?? manager?.district ?? null,
    schoolProvince: manager?.school?.province ?? manager?.province ?? null,
  };

  useEffect(() => {
    if (!manager) return;
    setSchoolProfile((prev) => ({
      ...prev,
      name: session.schoolName || prev.name,
      district: session.schoolDistrict || prev.district,
      email: session.userEmail || prev.email,
    }));
  }, [manager, session.schoolName, session.schoolDistrict, session.userEmail]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (!t || !SCHOOL_CONSOLE_TAB_IDS.has(t)) {
      setSearchParams({ tab: 'dashboard' }, { replace: true });
      setTab('dashboard');
      return;
    }
    setTab((prev) => (prev === t ? prev : t));
  }, [searchParams, setSearchParams]);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const onSelectTab = useCallback(
    (id) => {
      if (id === 'invoices') {
        navigate(h('/finance'));
        return;
      }
      setTab(id);
      setSearchParams({ tab: id }, { replace: true });
    },
    [navigate, setSearchParams]
  );

  const commonProps = { toast, t, setTab: onSelectTab, session };

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-[24px] border border-black/5 bg-white shadow-re-soft p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-re-text-muted/50 mb-1">
              School administration
            </p>
            <h1 className="text-xl md:text-2xl font-black text-re-navy tracking-tight">
              Full console
            </h1>
            <p className="text-xs text-re-text-muted font-bold mt-1 max-w-xl">
              Same tools as Babyeyi Lite school manager — fee documents, students, transfers, website,
              and compliance — inside your Pro workspace.
            </p>
          </div>
          {session.schoolCode && (
            <div className="text-right">
              <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">School code</p>
              <p className="text-lg font-black text-re-orange tabular-nums">{session.schoolCode}</p>
            </div>
          )}
        </div>
      </div>

      {!session.schoolId && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 font-bold">
          No school is linked to this session. Sign in again from the main Babyeyi login with your school code.
        </div>
      )}

      <div className="rounded-[24px] border border-black/5 bg-white/90 shadow-sm p-4 md:p-6 min-h-[50vh]">
        {tab === 'dashboard' && <DashboardPage {...commonProps} />}
        {tab === 'babyeyi' && <BabyeyiApp {...commonProps} />}
        {tab === 'babyeyi_list' && <BabyeyiList {...commonProps} />}
        {tab === 'students' && <StudentsPage session={session} toast={toast} />}
        {tab === 'student_transfer' && <StudentTransferPage {...commonProps} />}
        {tab === 'school_team' && <SchoolWorkersPage session={session} toast={toast} />}
        {tab === 'school_mini_website' && <SchoolMiniWebsitePage session={session} toast={toast} />}
        {tab === 'requests' && <RequestsPage {...commonProps} />}
        {tab === 'documents' && <DocumentsPage {...commonProps} />}
        {tab === 'analytics' && <AnalyticsPage {...commonProps} />}
        {tab === 'notifications' && (
          <NotificationsPage {...commonProps} setNotifCount={setNotifCount} />
        )}
        {tab === 'settings' && (
          <SettingsPage {...commonProps} schoolProfile={schoolProfile} setSchoolProfile={setSchoolProfile} />
        )}
        {tab === 'audit' && <AuditPage {...commonProps} />}
      </div>

      <Toast toasts={toasts} remove={removeToast} />
    </div>
  );
}
