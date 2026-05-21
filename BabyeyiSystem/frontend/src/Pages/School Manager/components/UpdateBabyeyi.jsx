/**
 * UpdateBabyeyi — list page + create/edit modals.
 * Wizard UI is shared with Babyeyi.jsx (single source of truth).
 */
import { useState } from "react";
import BabyeyiList from "./BabyeyiList";
import { WizardContent, CreateBabyeyiModal } from "./Babyeyi";

export { WizardContent, CreateBabyeyiModal };

const C = {
  goldBg: "#FFFBEB",
  gold: "#FEBF10",
  goldDark: "#D97706",
  dark: "#1A2744",
  red: "#DC2626",
};

export default function UpdateBabyeyi({ session }) {
  const schoolId = session?.schoolId ?? null;
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!schoolId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <div className="bg-white rounded-2xl border-2 border-red-200 p-8 max-w-md text-center shadow-lg">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="font-black text-lg mb-2" style={{ color: C.red }}>Session Error</h2>
          <p className="text-slate-600 text-sm">School ID not found in session. Please log out and log back in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: C.goldBg, fontFamily: "'Montserrat', sans-serif" }}>
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl font-black text-sm shadow-2xl transition-all hover:scale-105 active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
            color: C.dark,
            boxShadow: "0 8px 30px rgba(254,191,16,0.5)",
          }}>
          + Create Babyeyi
        </button>
      </div>

      <BabyeyiList key={refreshKey} session={session} onCreateNew={() => setModalOpen(true)} />

      <CreateBabyeyiModal
        session={session}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
