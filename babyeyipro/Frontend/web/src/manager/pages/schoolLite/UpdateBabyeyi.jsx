/**
 * Legacy entry — create/edit/duplicate all use Babyeyi.jsx wizard UI.
 * Kept for existing imports (WizardContent, CreateBabyeyiModal, default page).
 */
import { useState } from "react";
import BabyeyiList from "./BabyeyiList";
import { CreateBabyeyiModal, BabyeyiWizard } from "./Babyeyi";

export { CreateBabyeyiModal, BabyeyiWizard } from "./Babyeyi";

/** @deprecated Prefer CreateBabyeyiModal or BabyeyiWizard with layout="modal". */
export function WizardContent({ session, onClose, onSuccess, editRecord = null, duplicateFrom = null }) {
  return (
    <BabyeyiWizard
      session={session}
      editRecord={editRecord}
      duplicateFrom={duplicateFrom}
      onClose={onClose}
      onSuccess={onSuccess}
      layout="modal"
    />
  );
}

export default function UpdateBabyeyi({ session }) {
  const schoolId = session?.schoolId ?? null;
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!schoolId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <div className="bg-white rounded-2xl border-2 border-red-200 p-8 max-w-md text-center shadow-lg">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="font-semibold text-lg mb-2 text-red-600">Session Error</h2>
          <p className="text-slate-600 text-sm">School ID not found in session. Please log out and log back in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#FFFBE8", fontFamily: "'Montserrat', sans-serif" }}>
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl font-semibold text-sm shadow-sm transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg, #FEBF10, #B88A00)",
            color: "#000435",
            boxShadow: "0 8px 30px rgba(254,191,16,0.5)",
          }}
        >
          Create Babyeyi
        </button>
      </div>

      <BabyeyiList key={refreshKey} session={session} onCreateNew={() => setModalOpen(true)} />

      <CreateBabyeyiModal
        session={session}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}
