import { useMemo, useState } from 'react';
import { IdCard } from 'lucide-react';
import StudentsPage from '../../manager/pages/schoolLite/StudentsPage';
import StudentIdentityRegistrationModal from '../components/StudentIdentityRegistrationModal';
import { useAuth } from '../context/AuthContext';

/**
 * Lite DOS “Students” toolkit: full school student registry + optional identity registration.
 * Shown only when the school has Pro (see PortalRoutes + ProDosGate).
 */
export default function DosStudentRecordsPage() {
  const { teacher } = useAuth();
  const [identityModalOpen, setIdentityModalOpen] = useState(false);

  const session = useMemo(
    () => ({
      schoolName: teacher?.school?.name || teacher?.school?.school_name || null,
      schoolId: teacher?.school?.id || null,
      userEmail: teacher?.email || null,
    }),
    [teacher?.school?.name, teacher?.school?.school_name, teacher?.school?.id, teacher?.email]
  );

  const toast = () => {};

  return (
    <>
      <StudentsPage
        session={session}
        toast={toast}
        rightHeaderAction={
          <button
            type="button"
            onClick={() => setIdentityModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 min-h-[48px] sm:min-h-0 w-full sm:w-auto px-4 sm:px-4 py-3 sm:py-2 rounded-2xl bg-gradient-to-r from-[#1A1200] to-[#3D2C00] text-sm sm:text-xs font-black text-[#FEBF10] shadow-sm shadow-[#FDEAA0]/30 hover:from-[#2A1B00] hover:to-[#4B3200] transition-all touch-manipulation active:scale-[0.99]"
            aria-label="Register student credentials"
            title="Register Student Identity"
          >
            <IdCard className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Register Student Identity</span>
            <span className="sm:hidden">Student Identity</span>
          </button>
        }
      />

      <StudentIdentityRegistrationModal
        open={identityModalOpen}
        onClose={() => setIdentityModalOpen(false)}
        session={session}
        toast={toast}
        onSaved={() => setIdentityModalOpen(false)}
      />
    </>
  );
}
