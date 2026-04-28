import { useMemo, useState } from "react";
import StudentsPage from "../School Manager/components/StudentsPage";
import { useAuth } from "../../context/AuthContext";
import { IdCard } from "lucide-react";
import StudentIdentityRegistrationModal from "./components/StudentIdentityRegistrationModal";

export default function DosStudentsPage() {
  const auth = useAuth();
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  // StudentsPage only uses `session` for display + some modal titles.
  // API access is enforced by backend roles.
  const session = useMemo(
    () => ({
      schoolName: auth.school?.name || auth.school?.school_name || null,
      schoolId: auth.school?.id || auth.schoolId || null,
      userEmail: auth.user?.email || null,
    }),
    [auth.school?.name, auth.school?.id, auth.schoolId, auth.user?.email]
  );

  // Keep toast optional; StudentsPage checks toast?.()
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

